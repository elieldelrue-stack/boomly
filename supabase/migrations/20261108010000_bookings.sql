-- =============================================================================
-- Boomly — Étape 3 : réservations, calcul du prix, horaires et capacité
-- À exécuter une seule fois dans Supabase > SQL Editor (après l'étape 2).
-- =============================================================================

create type public.booking_status as enum (
  'pending_payment', -- créée, en attente de paiement (bloque la place 30 min)
  'paid',            -- payée (confirmée par Stripe)
  'dropped_off',     -- bagages déposés (QR scanné)
  'picked_up',       -- bagages récupérés (QR scanné)
  'cancelled',
  'refunded',
  'expired'          -- jamais payée
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,          -- code court lisible (ex. BMY-7K3P9Q)
  access_token text not null unique,       -- secret du lien envoyé au voyageur
  location_id uuid not null references public.locations (id) on delete restrict,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_email text not null check (char_length(customer_email) between 3 and 200),
  customer_phone text check (char_length(customer_phone) <= 30),
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  bags_small integer not null default 0 check (bags_small between 0 and 20),
  bags_medium integer not null default 0 check (bags_medium between 0 and 20),
  bags_large integer not null default 0 check (bags_large between 0 and 20),
  bag_count integer generated always as (bags_small + bags_medium + bags_large) stored,
  dropoff_at timestamptz not null,
  pickup_at timestamptz not null,
  days integer not null check (days >= 1),
  -- Prix figés au moment de la réservation (en centimes)
  price_small_cents integer not null,
  price_medium_cents integer not null,
  price_large_cents integer not null,
  partner_share_percent numeric(5, 2) not null,
  total_cents integer not null check (total_cents > 0),
  partner_share_cents integer not null check (partner_share_cents >= 0),
  commission_cents integer not null,
  currency text not null default 'eur',
  status public.booking_status not null default 'pending_payment',
  expires_at timestamptz,                  -- fin de la réservation provisoire si non payée
  terms_accepted_at timestamptz not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  dropped_off_at timestamptz,
  picked_up_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pickup_at > dropoff_at),
  check (bags_small + bags_medium + bags_large >= 1),
  check (commission_cents = total_cents - partner_share_cents)
);

create index bookings_location_dates_idx on public.bookings (location_id, dropoff_at, pickup_at);
create index bookings_status_idx on public.bookings (status);
create index bookings_email_idx on public.bookings (lower(customer_email));

alter table public.bookings enable row level security;

-- Le commerçant voit les réservations de son commerce, l'admin voit tout.
-- Les voyageurs n'ont pas de compte : le serveur leur montre leur réservation
-- uniquement sur présentation du lien secret (access_token).
create policy "bookings: lecture" on public.bookings
  for select to authenticated
  using (public.owns_location(location_id) or public.is_admin());

create policy "bookings: modification (admin)" on public.bookings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Devis : vérifie toutes les règles et calcule le prix.
-- Les heures sont données en heure de Paris (timestamp sans fuseau).
-- Renvoie {"ok":true, ...} ou {"ok":false,"error":"<code>"}.
-- ---------------------------------------------------------------------------
create or replace function public.booking_quote(
  p_location_id uuid,
  p_dropoff_local timestamp,
  p_pickup_local timestamp,
  p_small integer,
  p_medium integer,
  p_large integer
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
  v_remaining integer;
  v_min_remaining integer;
  v_days integer;
  v_total integer;
  v_partner integer;
begin
  select id, capacity_per_day, status into v_loc
  from public.locations where id = p_location_id;
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

  -- Dépôt et retrait pendant les horaires d'ouverture
  if not exists (
    select 1 from public.opening_hours h
    where h.location_id = p_location_id
      and h.weekday = extract(isodow from p_dropoff_local)
      and p_dropoff_local::time >= h.opens_at and p_dropoff_local::time < h.closes_at
  ) then
    return jsonb_build_object('ok', false, 'error', 'dropoffClosed');
  end if;

  if not exists (
    select 1 from public.opening_hours h
    where h.location_id = p_location_id
      and h.weekday = extract(isodow from p_pickup_local)
      and p_pickup_local::time >= h.opens_at and p_pickup_local::time < h.closes_at
  ) then
    return jsonb_build_object('ok', false, 'error', 'pickupClosed');
  end if;

  -- Fermetures exceptionnelles
  if exists (
    select 1 from public.closures c
    where c.location_id = p_location_id
      and (v_dropoff between c.starts_at and c.ends_at or v_pickup between c.starts_at and c.ends_at)
  ) then
    return jsonb_build_object('ok', false, 'error', 'closure');
  end if;

  -- Capacité : pour chaque jour couvert, bagages déjà présents + nouveaux <= capacité
  v_min_remaining := v_loc.capacity_per_day;
  for v_day in
    select generate_series(p_dropoff_local::date, p_pickup_local::date, interval '1 day')::date
  loop
    select coalesce(sum(b.bag_count), 0) into v_used
    from public.bookings b
    where b.location_id = p_location_id
      and (b.status in ('paid', 'dropped_off')
           or (b.status = 'pending_payment' and b.expires_at > now()))
      and (b.dropoff_at at time zone 'Europe/Paris')::date <= v_day
      and (b.pickup_at at time zone 'Europe/Paris')::date >= v_day;
    v_remaining := v_loc.capacity_per_day - v_used;
    v_min_remaining := least(v_min_remaining, v_remaining);
  end loop;

  if v_min_remaining < v_bags then
    return jsonb_build_object('ok', false, 'error', 'full', 'remaining', greatest(v_min_remaining, 0));
  end if;

  -- Prix : par bagage et par tranche de 24 h entamée
  select * into v_settings from public.settings where id;
  v_days := greatest(1, ceil(extract(epoch from (v_pickup - v_dropoff)) / 86400.0)::integer);
  v_total := v_days * (
    coalesce(p_small, 0) * v_settings.price_small_cents
    + coalesce(p_medium, 0) * v_settings.price_medium_cents
    + coalesce(p_large, 0) * v_settings.price_large_cents
  );
  v_partner := floor(v_total * v_settings.partner_share_percent / 100.0)::integer;

  return jsonb_build_object(
    'ok', true,
    'days', v_days,
    'bags', v_bags,
    'remaining', v_min_remaining,
    'price_small_cents', v_settings.price_small_cents,
    'price_medium_cents', v_settings.price_medium_cents,
    'price_large_cents', v_settings.price_large_cents,
    'partner_share_percent', v_settings.partner_share_percent,
    'total_cents', v_total,
    'partner_share_cents', v_partner,
    'commission_cents', v_total - v_partner,
    'currency', v_settings.currency
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Création d'une réservation (en attente de paiement).
-- Verrouille le commerce pour éviter que deux réservations simultanées
-- dépassent la capacité.
-- ---------------------------------------------------------------------------
create or replace function public.create_booking(
  p_location_id uuid,
  p_dropoff_local timestamp,
  p_pickup_local timestamp,
  p_small integer,
  p_medium integer,
  p_large integer,
  p_name text,
  p_email text,
  p_phone text,
  p_locale text
)
returns table (id uuid, reference text, access_token text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_quote jsonb;
  v_reference text;
  v_token text;
  v_id uuid;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
begin
  perform 1 from public.locations l where l.id = p_location_id for update;

  v_quote := public.booking_quote(p_location_id, p_dropoff_local, p_pickup_local, p_small, p_medium, p_large);
  if not (v_quote ->> 'ok')::boolean then
    raise exception '%', v_quote ->> 'error' using errcode = 'P0001';
  end if;

  loop
    v_reference := 'BMY-';
    for i in 1..6 loop
      v_reference := v_reference || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.bookings b where b.reference = v_reference);
  end loop;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.bookings (
    reference, access_token, location_id, customer_name, customer_email, customer_phone, locale,
    bags_small, bags_medium, bags_large, dropoff_at, pickup_at, days,
    price_small_cents, price_medium_cents, price_large_cents, partner_share_percent,
    total_cents, partner_share_cents, commission_cents, currency,
    status, expires_at, terms_accepted_at
  ) values (
    v_reference, v_token, p_location_id, p_name, lower(p_email), nullif(p_phone, ''), p_locale,
    p_small, p_medium, p_large,
    p_dropoff_local at time zone 'Europe/Paris', p_pickup_local at time zone 'Europe/Paris',
    (v_quote ->> 'days')::integer,
    (v_quote ->> 'price_small_cents')::integer, (v_quote ->> 'price_medium_cents')::integer,
    (v_quote ->> 'price_large_cents')::integer, (v_quote ->> 'partner_share_percent')::numeric,
    (v_quote ->> 'total_cents')::integer, (v_quote ->> 'partner_share_cents')::integer,
    (v_quote ->> 'commission_cents')::integer, v_quote ->> 'currency',
    'pending_payment', now() + interval '30 minutes', now()
  )
  returning bookings.id into v_id;

  return query select v_id, v_reference, v_token;
end;
$$;

-- Ces deux fonctions ne sont appelables que par le serveur Boomly (clé service_role).
revoke execute on function public.booking_quote(uuid, timestamp, timestamp, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.create_booking(uuid, timestamp, timestamp, integer, integer, integer, text, text, text, text) from public, anon, authenticated;
grant execute on function public.booking_quote(uuid, timestamp, timestamp, integer, integer, integer) to service_role;
grant execute on function public.create_booking(uuid, timestamp, timestamp, integer, integer, integer, text, text, text, text) to service_role;
