-- =============================================================================
-- Boomly — Étape 5 : dépôt et retrait (QR, photos, étiquettes, retard, reversement)
-- À exécuter une seule fois dans Supabase > SQL Editor (après l'étape 4).
-- =============================================================================

alter table public.bookings
  add column dropoff_photos text[] not null default '{}',
  add column dropped_off_by uuid references public.profiles (id),
  add column picked_up_by uuid references public.profiles (id),
  add column late_days integer not null default 0 check (late_days >= 0),
  add column late_fee_cents integer not null default 0 check (late_fee_cents >= 0),
  add column late_fee_partner_cents integer not null default 0 check (late_fee_partner_cents >= 0),
  add column late_fee_checkout_session_id text unique,
  add column late_fee_payment_intent_id text unique,
  add column late_fee_paid_at timestamptz,
  add column late_fee_waived boolean not null default false,
  add column late_fee_transfer_id text unique;

-- ---------------------------------------------------------------------------
-- Photos des bagages au dépôt : espace PRIVÉ (jamais public).
-- Chemin : <id du commerce>/<id de la réservation>/<photo>.jpg
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dropoff-photos', 'dropoff-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.can_access_dropoff_folder(p_folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return public.is_admin() or public.owns_location(p_folder::uuid);
exception when invalid_text_representation then
  return false;
end;
$$;

create policy "photos dépôt: lecture" on storage.objects
  for select to authenticated
  using (bucket_id = 'dropoff-photos' and public.can_access_dropoff_folder((storage.foldername(name))[1]));

create policy "photos dépôt: ajout" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dropoff-photos' and public.can_access_dropoff_folder((storage.foldername(name))[1]));

-- ---------------------------------------------------------------------------
-- Supplément de retard : un jour par jour calendaire après le jour de retrait prévu
-- (le bagage est resté une ou plusieurs nuits de plus), aux prix de la réservation.
-- ---------------------------------------------------------------------------
create or replace function public.booking_late_fee(p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  b record;
  v_days integer;
  v_fee integer;
begin
  select * into b from public.bookings where id = p_booking_id;
  -- Un utilisateur connecté ne voit que les réservations de son commerce (le serveur voit tout).
  if not found or ((select auth.uid()) is not null and not (public.owns_location(b.location_id) or public.is_admin())) then
    return jsonb_build_object('late_days', 0, 'fee_cents', 0, 'partner_cents', 0);
  end if;
  v_days := greatest(0, (now() at time zone 'Europe/Paris')::date - (b.pickup_at at time zone 'Europe/Paris')::date);
  v_fee := v_days * (b.bags_small * b.price_small_cents + b.bags_medium * b.price_medium_cents + b.bags_large * b.price_large_cents);
  return jsonb_build_object(
    'late_days', v_days,
    'fee_cents', v_fee,
    'partner_cents', floor(v_fee * b.partner_share_percent / 100.0)::integer
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Dépôt : réservation payée, du bon commerce, avec au moins une photo.
-- ---------------------------------------------------------------------------
create or replace function public.record_dropoff(p_booking_id uuid, p_photos text[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  b record;
  v_photo text;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or not (public.owns_location(b.location_id) or public.is_admin()) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if b.status <> 'paid' then
    raise exception 'wrong_status' using errcode = 'P0001';
  end if;
  if coalesce(cardinality(p_photos), 0) < 1 or cardinality(p_photos) > 10 then
    raise exception 'photos_required' using errcode = 'P0001';
  end if;
  foreach v_photo in array p_photos loop
    if v_photo not like b.location_id::text || '/' || b.id::text || '/%' or v_photo like '%..%' then
      raise exception 'photos_invalid' using errcode = 'P0001';
    end if;
  end loop;

  update public.bookings
  set status = 'dropped_off',
      dropped_off_at = now(),
      dropped_off_by = (select auth.uid()),
      dropoff_photos = p_photos,
      updated_at = now()
  where id = p_booking_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Retrait : bagages déposés, supplément de retard réglé (ou offert par le commerçant).
-- Après le retrait, le code QR n'est plus utilisable.
-- ---------------------------------------------------------------------------
create or replace function public.record_pickup(p_booking_id uuid, p_waive_late_fee boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  b record;
  v_late jsonb;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or not (public.owns_location(b.location_id) or public.is_admin()) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if b.status <> 'dropped_off' then
    raise exception 'wrong_status' using errcode = 'P0001';
  end if;

  v_late := public.booking_late_fee(p_booking_id);
  if (v_late ->> 'fee_cents')::integer > 0 and b.late_fee_paid_at is null and not p_waive_late_fee then
    raise exception 'late_fee_due' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = 'picked_up',
      picked_up_at = now(),
      picked_up_by = (select auth.uid()),
      late_days = (v_late ->> 'late_days')::integer,
      late_fee_waived = (late_fee_paid_at is null and (v_late ->> 'fee_cents')::integer > 0),
      updated_at = now()
  where id = p_booking_id;

  return jsonb_build_object('late_days', (v_late ->> 'late_days')::integer);
end;
$$;

revoke execute on function public.booking_late_fee(uuid) from public, anon;
revoke execute on function public.record_dropoff(uuid, text[]) from public, anon;
revoke execute on function public.record_pickup(uuid, boolean) from public, anon;
grant execute on function public.booking_late_fee(uuid) to authenticated, service_role;
grant execute on function public.record_dropoff(uuid, text[]) to authenticated, service_role;
grant execute on function public.record_pickup(uuid, boolean) to authenticated, service_role;
