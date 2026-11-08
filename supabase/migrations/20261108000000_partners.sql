-- =============================================================================
-- Boomly — Étape 2 : commerçants, points de dépôt, horaires, réglages
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('partner', 'admin');
create type public.location_status as enum ('pending', 'active', 'suspended', 'refused');
create type public.business_type as enum ('restaurant', 'bar', 'tabac', 'shop', 'hotel', 'other');

-- ---------------------------------------------------------------------------
-- Profils (commerçants et admin), créés automatiquement à l'inscription
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'partner',
  full_name text check (char_length(full_name) <= 120),
  email text not null,
  phone text check (char_length(phone) <= 30),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    left(new.raw_user_meta_data ->> 'full_name', 120),
    left(new.raw_user_meta_data ->> 'phone', 30)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Vrai si l'utilisateur connecté est admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Un utilisateur connecté ne peut pas changer son propre rôle ni son e-mail.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
    new.id := old.id;
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------------
-- Points de dépôt (un par commerçant pour le MVP)
-- ---------------------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  business_type public.business_type not null,
  description text check (char_length(description) <= 1000),
  address text not null check (char_length(address) between 3 and 200),
  postal_code text check (char_length(postal_code) <= 10),
  city text not null check (char_length(city) between 1 and 100),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  phone text check (char_length(phone) <= 30),
  siret text not null check (siret ~ '^[0-9]{14}$'),
  photos text[] not null default '{}' check (cardinality(photos) <= 6),
  capacity_per_day integer not null check (capacity_per_day between 1 and 500),
  status public.location_status not null default 'pending',
  status_reason text check (char_length(status_reason) <= 500),
  stripe_account_id text,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index locations_status_idx on public.locations (status);

-- Un commerçant ne peut pas se valider lui-même ni toucher aux champs gérés par Boomly.
create or replace function public.protect_location_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.partner_id := (select auth.uid());
      new.status := 'pending';
      new.status_reason := null;
      new.stripe_account_id := null;
      new.validated_at := null;
    else
      new.id := old.id;
      new.partner_id := old.partner_id;
      new.status := old.status;
      new.status_reason := old.status_reason;
      new.stripe_account_id := old.stripe_account_id;
      new.validated_at := old.validated_at;
      new.created_at := old.created_at;
    end if;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if new.status = 'active' and old.status is distinct from 'active' then
      new.validated_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_location_fields
  before insert or update on public.locations
  for each row execute function public.protect_location_fields();

-- Vrai si l'utilisateur connecté possède ce point de dépôt.
create or replace function public.owns_location(p_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.locations
    where id = p_location_id and partner_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Horaires réguliers (jour 1 = lundi … 7 = dimanche)
-- ---------------------------------------------------------------------------
create table public.opening_hours (
  id bigint generated always as identity primary key,
  location_id uuid not null references public.locations (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  opens_at time not null,
  closes_at time not null,
  check (closes_at > opens_at),
  unique (location_id, weekday, opens_at)
);

create index opening_hours_location_idx on public.opening_hours (location_id);

-- Remplace tous les horaires d'un point en une seule opération.
-- p_hours : [{"weekday":1,"opens_at":"09:00","closes_at":"19:00"}, …]
create or replace function public.set_opening_hours(p_location_id uuid, p_hours jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (public.owns_location(p_location_id) or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from public.opening_hours where location_id = p_location_id;

  insert into public.opening_hours (location_id, weekday, opens_at, closes_at)
  select p_location_id,
         (h ->> 'weekday')::smallint,
         (h ->> 'opens_at')::time,
         (h ->> 'closes_at')::time
  from jsonb_array_elements(p_hours) as h;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fermetures exceptionnelles et pauses
-- ---------------------------------------------------------------------------
create table public.closures (
  id bigint generated always as identity primary key,
  location_id uuid not null references public.locations (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index closures_location_idx on public.closures (location_id, starts_at);

-- ---------------------------------------------------------------------------
-- Réglages (une seule ligne), modifiables depuis l'admin
-- ---------------------------------------------------------------------------
create table public.settings (
  id boolean primary key default true check (id),
  price_small_cents integer not null check (price_small_cents > 0),
  price_medium_cents integer not null check (price_medium_cents > 0),
  price_large_cents integer not null check (price_large_cents > 0),
  partner_share_percent numeric(5, 2) not null check (partner_share_percent between 0 and 100),
  currency text not null default 'eur',
  updated_at timestamptz not null default now()
);

insert into public.settings (price_small_cents, price_medium_cents, price_large_cents, partner_share_percent)
values (445, 545, 645, 50);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.opening_hours enable row level security;
alter table public.closures enable row level security;
alter table public.settings enable row level security;

-- profiles : chacun voit et modifie son profil ; l'admin voit tout.
create policy "profiles: lecture" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles: modification" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- locations : le commerçant gère le sien ; l'admin gère tout.
-- (La carte publique de l'étape 3 passera par le serveur, qui n'expose que les champs publics.)
create policy "locations: lecture" on public.locations
  for select to authenticated
  using (partner_id = (select auth.uid()) or public.is_admin());

create policy "locations: création" on public.locations
  for insert to authenticated
  with check (partner_id = (select auth.uid()));

create policy "locations: modification" on public.locations
  for update to authenticated
  using (partner_id = (select auth.uid()) or public.is_admin())
  with check (partner_id = (select auth.uid()) or public.is_admin());

create policy "locations: suppression (admin)" on public.locations
  for delete to authenticated
  using (public.is_admin());

-- opening_hours et closures : propriétaire du point ou admin.
create policy "opening_hours: tout" on public.opening_hours
  for all to authenticated
  using (public.owns_location(location_id) or public.is_admin())
  with check (public.owns_location(location_id) or public.is_admin());

create policy "closures: tout" on public.closures
  for all to authenticated
  using (public.owns_location(location_id) or public.is_admin())
  with check (public.owns_location(location_id) or public.is_admin());

-- settings : lecture publique (prix affichés), modification par l'admin.
create policy "settings: lecture" on public.settings
  for select to anon, authenticated
  using (true);

create policy "settings: modification (admin)" on public.settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Photos des commerces (Supabase Storage)
-- Chaque commerçant dépose ses photos dans un dossier à son identifiant.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('location-photos', 'location-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos: lecture de son dossier" on storage.objects
  for select to authenticated
  using (bucket_id = 'location-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: ajout dans son dossier" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'location-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos: suppression dans son dossier" on storage.objects
  for delete to authenticated
  using (bucket_id = 'location-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
