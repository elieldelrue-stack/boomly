-- Tests de l'étape 5 : dépôt (photo obligatoire), retrait, retard, droits.
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.fr');
insert into public.locations (id, partner_id, name, business_type, address, city, latitude, longitude, siret, capacity_per_day, status)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Chez Alice', 'bar', '1 rue A', 'Paris', 48.85, 2.35, '73282932000074', 10, 'active'),
       ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'Chez Bob', 'bar', '2 rue B', 'Paris', 48.86, 2.36, '73282932000074', 10, 'active');
-- Réservation payée chez Alice : 1 petit + 1 grand, retrait prévu il y a 2 jours (retard)
insert into public.bookings (id, reference, access_token, location_id, customer_name, customer_email, bags_small, bags_large,
  dropoff_at, pickup_at, days, price_small_cents, price_medium_cents, price_large_cents, partner_share_percent,
  total_cents, partner_share_cents, commission_cents, status, terms_accepted_at)
values ('20000000-0000-0000-0000-000000000001', 'BMY-AAAAAA', repeat('a', 64), '10000000-0000-0000-0000-000000000001', 'Jean', 'j@t.fr', 1, 1,
  now() - interval '3 days', now() - interval '2 days', 1, 445, 545, 645, 50, 1090, 545, 545, 'paid', now()),
       ('20000000-0000-0000-0000-000000000002', 'BMY-BBBBBB', repeat('b', 64), '10000000-0000-0000-0000-000000000001', 'Léa', 'l@t.fr', 0, 1,
  now(), now() + interval '2 hours', 1, 445, 545, 645, 50, 645, 322, 323, 'pending_payment', now());

create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'ÉCHEC : %', label; end if;
  raise notice 'ok : %', label;
end $$;
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, false);
  execute 'set role authenticated';
end $$;
create or replace function pg_temp.err(sql text) returns text language plpgsql as $$
begin execute sql; return 'aucune erreur'; exception when others then return sqlerrm; end $$;

-- Bob ne peut rien faire sur la réservation d'Alice
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check(pg_temp.err($$select public.record_dropoff('20000000-0000-0000-0000-000000000001', array['10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/p.jpg'])$$) = 'not_found', 'Bob ne peut pas enregistrer un dépôt chez Alice');
select pg_temp.check((public.booking_late_fee('20000000-0000-0000-0000-000000000001') ->> 'fee_cents')::int = 0, 'Bob ne voit pas le supplément d''Alice');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check(pg_temp.err($$select public.record_dropoff('20000000-0000-0000-0000-000000000001', array[]::text[])$$) = 'photos_required', 'dépôt refusé sans photo');
select pg_temp.check(pg_temp.err($$select public.record_dropoff('20000000-0000-0000-0000-000000000001', array['autre/chemin.jpg'])$$) = 'photos_invalid', 'photo hors du dossier de la réservation refusée');
select pg_temp.check(pg_temp.err($$select public.record_dropoff('20000000-0000-0000-0000-000000000002', array['10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000002/p.jpg'])$$) = 'wrong_status', 'dépôt refusé si la réservation n''est pas payée');
select pg_temp.check(pg_temp.err($$select public.record_pickup('20000000-0000-0000-0000-000000000001')$$) = 'wrong_status', 'retrait refusé avant le dépôt');
select public.record_dropoff('20000000-0000-0000-0000-000000000001', array['10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/p.jpg']);
select pg_temp.check((select status from public.bookings where reference = 'BMY-AAAAAA') = 'dropped_off', 'dépôt enregistré avec photo');
select pg_temp.check((select dropped_off_by from public.bookings where reference = 'BMY-AAAAAA') = '00000000-0000-0000-0000-00000000000a', 'dépôt horodaté et attribué');
select pg_temp.check(pg_temp.err($$select public.record_dropoff('20000000-0000-0000-0000-000000000001', array['10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/p.jpg'])$$) = 'wrong_status', 'pas de double dépôt');
select pg_temp.check((public.booking_late_fee('20000000-0000-0000-0000-000000000001') ->> 'late_days')::int = 2, '2 jours de retard');
select pg_temp.check((public.booking_late_fee('20000000-0000-0000-0000-000000000001') ->> 'fee_cents')::int = 2180, 'supplément = 2 × (4,45 + 6,45) = 21,80 €');
select pg_temp.check(pg_temp.err($$select public.record_pickup('20000000-0000-0000-0000-000000000001')$$) = 'late_fee_due', 'retrait bloqué tant que le supplément n''est pas réglé');
update public.bookings set status = 'refunded';
select pg_temp.check((select status from public.bookings where reference = 'BMY-AAAAAA') = 'dropped_off', 'le commerçant ne peut pas modifier le statut directement');
select public.record_pickup('20000000-0000-0000-0000-000000000001', true);
select pg_temp.check((select status = 'picked_up' and late_fee_waived and late_days = 2 from public.bookings where reference = 'BMY-AAAAAA'), 'retrait avec supplément offert par le commerçant');
select pg_temp.check(pg_temp.err($$select public.record_pickup('20000000-0000-0000-0000-000000000001')$$) = 'wrong_status', 'QR inutilisable après le retrait');
reset role;

-- Photos privées : Bob ne peut pas déposer dans le dossier d'Alice
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check(pg_temp.err($$insert into storage.objects (bucket_id, name) values ('dropoff-photos', '10000000-0000-0000-0000-000000000001/x/p.jpg')$$) like '%row-level security%', 'Bob ne peut pas ajouter de photo chez Alice');
select pg_temp.check(pg_temp.err($$insert into storage.objects (bucket_id, name) values ('dropoff-photos', 'pas-un-uuid/p.jpg')$$) like '%row-level security%', 'chemin invalide refusé');
reset role;
set role anon;
select pg_temp.check(pg_temp.err($$select public.record_pickup('20000000-0000-0000-0000-000000000001')$$) like '%permission denied%', 'un visiteur anonyme ne peut rien appeler');
reset role;
