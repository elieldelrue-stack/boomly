-- Tests de l'étape 6 : modification des horaires, avis et incidents (droits).
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.fr'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.fr');
update public.profiles set role = 'admin' where email = 'admin@test.fr';
insert into public.locations (id, partner_id, name, business_type, address, city, latitude, longitude, siret, capacity_per_day, status)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Chez Alice', 'bar', '1 rue A', 'Paris', 48.85, 2.35, '73282932000074', 3, 'active');
insert into public.opening_hours (location_id, weekday, opens_at, closes_at)
select '10000000-0000-0000-0000-000000000001', d, '08:00', '20:00' from generate_series(1, 7) d;

create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'ÉCHEC : %', label; end if;
  raise notice 'ok : %', label;
end $$;
create or replace function pg_temp.err(sql text) returns text language plpgsql as $$
begin execute sql; return 'aucune erreur'; exception when others then return sqlerrm; end $$;
create temp table d as select ((now() at time zone 'Europe/Paris')::date + 2) as d1;

-- Réservation de 3 bagages (capacité 3) : la modifier ne doit pas se compter elle-même
select public.create_booking('10000000-0000-0000-0000-000000000001', d1 + time '10:00', d1 + time '18:00', 1, 1, 1, 'Jean', 'j@t.fr', '', 'fr') from d;
update public.bookings set status = 'paid';
select pg_temp.check(pg_temp.err(format($f$select public.reschedule_booking((select id from public.bookings limit 1), %L, %L)$f$, (select d1 + time '11:00' from d), (select d1 + time '19:00' from d))) = 'aucune erreur', 'modification des horaires même jour acceptée (sans se compter soi-même)');
select pg_temp.check((select (dropoff_at at time zone 'Europe/Paris')::time = '11:00' from public.bookings limit 1), 'nouvel horaire enregistré');
select pg_temp.check(pg_temp.err(format($f$select public.reschedule_booking((select id from public.bookings limit 1), %L, %L)$f$, (select d1 + time '11:00' from d), (select d1 + 2 + time '19:00' from d))) = 'price_changed', 'modification qui change le prix refusée');
select pg_temp.check(pg_temp.err(format($f$select public.reschedule_booking((select id from public.bookings limit 1), %L, %L)$f$, (select d1 + time '06:00' from d), (select d1 + time '19:00' from d))) = 'dropoffClosed', 'modification hors horaires refusée');
update public.bookings set dropoff_at = now() - interval '1 hour';
select pg_temp.check(pg_temp.err(format($f$select public.reschedule_booking((select id from public.bookings limit 1), %L, %L)$f$, (select d1 + time '11:00' from d), (select d1 + time '19:00' from d))) = 'too_late', 'modification refusée après l''heure de dépôt');

-- Avis et incidents : lecture limitée
insert into public.reviews (booking_id, location_id, rating, comment) select id, location_id, 5, 'Top' from public.bookings limit 1;
insert into public.incidents (booking_id, type, description) select id, 'damaged', 'Valise rayée' from public.bookings limit 1;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
set role authenticated;
select pg_temp.check((select count(*) from public.reviews) = 0 and (select count(*) from public.incidents) = 0, 'Bob ne voit ni avis ni incidents d''Alice');
delete from public.reviews;
reset role;
select pg_temp.check((select count(*) from public.reviews) = 1, 'Bob ne peut pas supprimer un avis');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
set role authenticated;
select pg_temp.check((select count(*) from public.incidents) = 1, 'Alice voit l''incident de son commerce');
update public.incidents set status = 'rejected';
delete from public.reviews;
reset role;
select pg_temp.check((select status from public.incidents limit 1) = 'open', 'Alice ne peut pas clore un incident');
select pg_temp.check((select count(*) from public.reviews) = 1, 'Alice ne peut pas supprimer un avis');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad"}', false);
set role authenticated;
update public.incidents set status = 'resolved', decision = 'Remboursé';
delete from public.reviews;
reset role;
select pg_temp.check((select status from public.incidents limit 1) = 'resolved' and (select count(*) from public.reviews) = 0, 'l''admin traite l''incident et supprime l''avis');
set role anon;
select pg_temp.check(pg_temp.err($$select public.reschedule_booking(gen_random_uuid(), now()::timestamp, now()::timestamp)$$) like '%permission denied%', 'visiteur anonyme : aucun accès direct');
reset role;
