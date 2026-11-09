-- Tests de l'étape 7a : limitation des tentatives, effacement des anciennes données.
\set ON_ERROR_STOP 1
create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'ÉCHEC : %', label; end if;
  raise notice 'ok : %', label;
end $$;
create or replace function pg_temp.err(sql text) returns text language plpgsql as $$
begin execute sql; return 'aucune erreur'; exception when others then return sqlerrm; end $$;

-- Limitation : 3 essais autorisés par fenêtre
select pg_temp.check(public.hit_rate_limit('login:1.2.3.4', 600, 3), 'essai 1 autorisé');
select pg_temp.check(public.hit_rate_limit('login:1.2.3.4', 600, 3), 'essai 2 autorisé');
select pg_temp.check(public.hit_rate_limit('login:1.2.3.4', 600, 3), 'essai 3 autorisé');
select pg_temp.check(not public.hit_rate_limit('login:1.2.3.4', 600, 3), 'essai 4 refusé');
select pg_temp.check(public.hit_rate_limit('login:5.6.7.8', 600, 3), 'autre adresse IP non bloquée');
set role anon;
select pg_temp.check(pg_temp.err($$select public.hit_rate_limit('x', 60, 1)$$) like '%permission denied%', 'visiteur anonyme : pas d''accès direct');
select pg_temp.check(pg_temp.err($$select * from public.rate_limits$$) like '%permission denied%' or (select count(*) from public.rate_limits) = 0, 'table des tentatives illisible');
reset role;

-- Effacement : une vieille réservation récupérée est anonymisée, une récente non
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'alice@test.fr');
insert into public.locations (id, partner_id, name, business_type, address, city, latitude, longitude, siret, capacity_per_day, status)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Chez Alice', 'bar', '1 rue A', 'Paris', 48.85, 2.35, '73282932000074', 10, 'active');
insert into public.bookings (id, reference, access_token, location_id, customer_name, customer_email, customer_phone, bags_medium,
  dropoff_at, pickup_at, days, price_small_cents, price_medium_cents, price_large_cents, partner_share_percent,
  total_cents, partner_share_cents, commission_cents, status, terms_accepted_at, dropoff_photos, created_at)
values
 ('20000000-0000-0000-0000-000000000001', 'BMY-OLDOLD', repeat('a', 64), '10000000-0000-0000-0000-000000000001', 'Jean Ancien', 'jean@t.fr', '0600', 1,
  now() - interval '4 years', now() - interval '4 years' + interval '5 hours', 1, 445, 545, 645, 50, 545, 272, 273, 'picked_up', now(), array['loc/b/p1.jpg','loc/b/p2.jpg'], now() - interval '4 years'),
 ('20000000-0000-0000-0000-000000000002', 'BMY-NEWNEW', repeat('b', 64), '10000000-0000-0000-0000-000000000001', 'Léa Récente', 'lea@t.fr', null, 1,
  now() - interval '1 month', now() - interval '1 month' + interval '5 hours', 1, 445, 545, 645, 50, 545, 272, 273, 'picked_up', now(), '{}', now() - interval '1 month');
insert into public.reviews (booking_id, location_id, rating, comment, customer_first_name, created_at)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 5, 'Super', 'Jean', now() - interval '4 years');

create temp table photos as select * from public.anonymize_old_bookings(interval '3 years');
select pg_temp.check((select count(*) from photos) = 2, 'les 2 photos de l''ancienne réservation sont à supprimer');
select pg_temp.check((select customer_email = 'anonyme@boomly.invalid' and customer_name = 'Voyageur' and customer_phone is null and total_cents = 545 from public.bookings where reference = 'BMY-OLDOLD'), 'ancienne réservation anonymisée, montant conservé');
select pg_temp.check((select customer_email = 'lea@t.fr' from public.bookings where reference = 'BMY-NEWNEW'), 'réservation récente intacte');
select pg_temp.check((select customer_first_name is null and comment = 'Super' from public.reviews limit 1), 'avis conservé sans prénom');
select pg_temp.check((select count(*) from public.anonymize_old_bookings(interval '3 years')) = 0, 'deuxième passage : rien à refaire');
