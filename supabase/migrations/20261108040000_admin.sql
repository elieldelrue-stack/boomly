-- =============================================================================
-- Boomly — Étape 6 : annulation, modification, incidents, avis, remboursements
-- À exécuter une seule fois dans Supabase > SQL Editor (après l'étape 5).
-- =============================================================================

alter table public.bookings
  add column refunded_cents integer not null default 0 check (refunded_cents >= 0),
  add column partner_reversed_cents integer not null default 0 check (partner_reversed_cents >= 0),
  add column review_email_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- Avis (un par réservation récupérée), publiés immédiatement, supprimables par l'admin
-- ---------------------------------------------------------------------------
create table public.reviews (
  id bigint generated always as identity primary key,
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  customer_first_name text check (char_length(customer_first_name) <= 60),
  created_at timestamptz not null default now()
);
create index reviews_location_idx on public.reviews (location_id, created_at desc);
alter table public.reviews enable row level security;

create policy "reviews: lecture" on public.reviews
  for select to authenticated
  using (public.owns_location(location_id) or public.is_admin());
create policy "reviews: suppression (admin)" on public.reviews
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Incidents déclarés par les voyageurs, traités par l'admin
-- ---------------------------------------------------------------------------
create type public.incident_type as enum ('lost', 'damaged', 'closed', 'other');
create type public.incident_status as enum ('open', 'resolved', 'rejected');

create table public.incidents (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  type public.incident_type not null,
  description text not null check (char_length(description) between 5 and 3000),
  photos text[] not null default '{}' check (cardinality(photos) <= 5),
  status public.incident_status not null default 'open',
  decision text check (char_length(decision) <= 3000),
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id)
);
create index incidents_status_idx on public.incidents (status, created_at desc);
alter table public.incidents enable row level security;

-- Le commerçant voit les incidents de son commerce ; seul l'admin les traite.
create policy "incidents: lecture" on public.incidents
  for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.bookings b where b.id = booking_id and public.owns_location(b.location_id)
  ));
create policy "incidents: traitement (admin)" on public.incidents
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Photos jointes aux incidents : espace privé, écrit uniquement par le serveur.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('incident-photos', 'incident-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos incident: lecture admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'incident-photos' and public.is_admin());

-- L'admin peut aussi voir les photos de dépôt de tous les commerces (déjà prévu à l'étape 5).

-- ---------------------------------------------------------------------------
-- Devis : possibilité d'ignorer une réservation (pour la modifier sans se compter soi-même)
-- ---------------------------------------------------------------------------
drop function public.booking_quote(uuid, timestamp, timestamp, integer, integer, integer);

create or replace function public.booking_quote(
  p_location_id uuid,
  p_dropoff_local timestamp,
  p_pickup_local timestamp,
  p_small integer,
  p_medium integer,
  p_large integer,
  p_exclude_booking uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_loc record;
  v_settings record;
  v_dropoff timestamptz := p_dropoff_local at time zone 'Europe/Paris';
  v_pickup timestamptz := p_pickup_local at time zone 'Europe/Paris';
  v_bags integer := coalesce(p_small, 0) + coalesce(p_medium, 0) + coalesce(p_large, 0);
  v_day date;
  v_used integer;
  v_min_remaining integer;
  v_days integer;
  v_total integer;
  v_partner integer;
begin
  select id, capacity_per_day, status into v_loc from public.locations where id = p_location_id;
  if not found or v_loc.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;
  if p_small < 0 or p_medium < 0 or p_large < 0 or p_small > 20 or p_medium > 20 or p_large > 20 or v_bags < 1 then
    return jsonb_build_object('ok', false, 'error', 'bags');
  end if;
  if v_dropoff < now() - interval '5 minutes' then
    return jsonb_build_object('ok', false, 'error', 'past');
  end if;
  if v_pickup <= v_dropoff then
    return jsonb_build_object('ok', false, 'error', 'order');
  end if;
  if v_pickup - v_dropoff > interval '30 days' then
    return jsonb_build_object('ok', false, 'error', 'tooLong');
  end if;
  if not exists (
    select 1 from public.opening_hours h
    where h.location_id = p_location_id and h.weekday = extract(isodow from p_dropoff_local)
      and p_dropoff_local::time >= h.opens_at and p_dropoff_local::time < h.closes_at
  ) then
    return jsonb_build_object('ok', false, 'error', 'dropoffClosed');
  end if;
  if not exists (
    select 1 from public.opening_hours h
    where h.location_id = p_location_id and h.weekday = extract(isodow from p_pickup_local)
      and p_pickup_local::time >= h.opens_at and p_pickup_local::time < h.closes_at
  ) then
    return jsonb_build_object('ok', false, 'error', 'pickupClosed');
  end if;
  if exists (
    select 1 from public.closures c
    where c.location_id = p_location_id
      and (v_dropoff between c.starts_at and c.ends_at or v_pickup between c.starts_at and c.ends_at)
  ) then
    return jsonb_build_object('ok', false, 'error', 'closure');
  end if;

  v_min_remaining := v_loc.capacity_per_day;
  for v_day in select generate_series(p_dropoff_local::date, p_pickup_local::date, interval '1 day')::date loop
    select coalesce(sum(b.bag_count), 0) into v_used
    from public.bookings b
    where b.location_id = p_location_id
      and b.id is distinct from p_exclude_booking
      and (b.status in ('paid', 'dropped_off') or (b.status = 'pending_payment' and b.expires_at > now()))
      and (b.dropoff_at at time zone 'Europe/Paris')::date <= v_day
      and (b.pickup_at at time zone 'Europe/Paris')::date >= v_day;
    v_min_remaining := least(v_min_remaining, v_loc.capacity_per_day - v_used);
  end loop;
  if v_min_remaining < v_bags then
    return jsonb_build_object('ok', false, 'error', 'full', 'remaining', greatest(v_min_remaining, 0));
  end if;

  select * into v_settings from public.settings where id;
  v_days := greatest(1, ceil(extract(epoch from (v_pickup - v_dropoff)) / 86400.0)::integer);
  v_total := v_days * (
    coalesce(p_small, 0) * v_settings.price_small_cents
    + coalesce(p_medium, 0) * v_settings.price_medium_cents
    + coalesce(p_large, 0) * v_settings.price_large_cents
  );
  v_partner := floor(v_total * v_settings.partner_share_percent / 100.0)::integer;

  return jsonb_build_object(
    'ok', true, 'days', v_days, 'bags', v_bags, 'remaining', v_min_remaining,
    'price_small_cents', v_settings.price_small_cents,
    'price_medium_cents', v_settings.price_medium_cents,
    'price_large_cents', v_settings.price_large_cents,
    'partner_share_percent', v_settings.partner_share_percent,
    'total_cents', v_total, 'partner_share_cents', v_partner,
    'commission_cents', v_total - v_partner, 'currency', v_settings.currency
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Modification des horaires par le voyageur : avant l'heure de dépôt,
-- place disponible, et même nombre de jours (donc même prix).
-- ---------------------------------------------------------------------------
create or replace function public.reschedule_booking(
  p_booking_id uuid,
  p_dropoff_local timestamp,
  p_pickup_local timestamp
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  b record;
  v_quote jsonb;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  perform 1 from public.locations l where l.id = b.location_id for update;
  select * into b from public.bookings where id = p_booking_id for update;

  if b.status <> 'paid' or now() >= b.dropoff_at then
    raise exception 'too_late' using errcode = 'P0001';
  end if;

  v_quote := public.booking_quote(b.location_id, p_dropoff_local, p_pickup_local,
                                  b.bags_small, b.bags_medium, b.bags_large, b.id);
  if not (v_quote ->> 'ok')::boolean then
    raise exception '%', v_quote ->> 'error' using errcode = 'P0001';
  end if;
  if (v_quote ->> 'days')::integer <> b.days then
    raise exception 'price_changed' using errcode = 'P0001';
  end if;

  update public.bookings
  set dropoff_at = p_dropoff_local at time zone 'Europe/Paris',
      pickup_at = p_pickup_local at time zone 'Europe/Paris',
      updated_at = now()
  where id = p_booking_id;
end;
$$;

revoke execute on function public.booking_quote(uuid, timestamp, timestamp, integer, integer, integer, uuid) from public, anon, authenticated;
revoke execute on function public.reschedule_booking(uuid, timestamp, timestamp) from public, anon, authenticated;
grant execute on function public.booking_quote(uuid, timestamp, timestamp, integer, integer, integer, uuid) to service_role;
grant execute on function public.reschedule_booking(uuid, timestamp, timestamp) to service_role;
