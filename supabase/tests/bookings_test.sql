-- Tests de l'étape 3 : devis, horaires, capacité, prix, droits d'accès.
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.fr');

insert into public.locations (id, partner_id, name, business_type, address, city, latitude, longitude, siret, capacity_per_day, status)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Chez Alice', 'bar', '1 rue A', 'Paris', 48.85, 2.35, '73282932000074', 5, 'active'),
       ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'Chez Bob', 'bar', '2 rue B', 'Paris', 48.86, 2.36, '73282932000074', 5, 'pending');
-- Ouvert tous les jours 09:00-12:00 et 14:00-19:00
insert into public.opening_hours (location_id, weekday, opens_at, closes_at)
select '10000000-0000-0000-0000-000000000001', d, t.o, t.c
from generate_series(1, 7) d, (values ('09:00'::time, '12:00'::time), ('14:00', '19:00')) t(o, c);

create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'ÉCHEC : %', label; end if;
  raise notice 'ok : %', label;
end $$;

-- Dates de test : demain et après-demain (heure de Paris)
create temp table d as select ((now() at time zone 'Europe/Paris')::date + 1) as d1, ((now() at time zone 'Europe/Paris')::date + 2) as d2;
create or replace function pg_temp.ts(day date, t text) returns timestamp language sql as $$ select (day + t::time) $$;
create or replace function pg_temp.q(a timestamp, b timestamp, s int, m int, l int, loc uuid default '10000000-0000-0000-0000-000000000001') returns jsonb
  language sql as $$ select public.booking_quote(loc, a, b, s, m, l) $$;

-- Prix
select pg_temp.check((pg_temp.q(pg_temp.ts(d1,'10:00'), pg_temp.ts(d1,'18:00'), 1,0,0)->>'total_cents')::int = 445, '1 petit bagage, même jour = 4,45 €') from d;
select pg_temp.check((pg_temp.q(pg_temp.ts(d1,'10:00'), pg_temp.ts(d1,'18:00'), 1,1,1)->>'total_cents')::int = 1635, '1 petit + 1 moyen + 1 grand = 16,35 €') from d;
select pg_temp.check((pg_temp.q(pg_temp.ts(d1,'10:00'), pg_temp.ts(d2,'10:00'), 0,1,0)->>'days')::int = 1, '24 h pile = 1 jour') from d;
select pg_temp.check((pg_temp.q(pg_temp.ts(d1,'10:00'), pg_temp.ts(d2,'11:00'), 0,1,0)->>'days')::int = 2, '25 h = 2 jours') from d;
select pg_temp.check((pg_temp.q(pg_temp.ts(d1,'10:00'), pg_temp.ts(d2,'11:00'), 0,1,0)->>'total_cents')::int = 1090, '1 moyen, 2 jours = 10,90 €') from d;
select pg_temp.check((pg_temp.q(pg_temp.ts(d1,'10:00'), pg_temp.ts(d1,'18:00'), 1,0,0)->>'partner_share_cents')::int = 222, 'part commerçant 2,22 €') from d;

-- Règles
select pg_temp.check(pg_temp.q(pg_temp.ts(d1,'08:00'), pg_temp.ts(d1,'18:00'), 1,0,0)->>'error' = 'dropoffClosed', 'dépôt avant l''ouverture refusé') from d;
select pg_temp.check(pg_temp.q(pg_temp.ts(d1,'10:00'), pg_temp.ts(d1,'13:00'), 1,0,0)->>'error' = 'pickupClosed', 'retrait pendant la pause midi refusé') from d;
select pg_temp.check(pg_temp.q(pg_temp.ts(d1,'10:00'), pg_temp.ts(d1,'19:00'), 1,0,0)->>'error' = 'pickupClosed', 'retrait à l''heure de fermeture refusé') from d;
select pg_temp.check(pg_temp.q(pg_temp.ts(d1,'18:00'), pg_temp.ts(d1,'10:00'), 1,0,0)->>'error' = 'order', 'retrait avant dépôt refusé') from d;
select pg_temp.check(pg_temp.q(pg_temp.ts(d1 - 3,'10:00'), pg_temp.ts(d1,'10:00'), 1,0,0)->>'error' = 'past', 'date passée refusée') from d;
select pg_temp.check(pg_temp.q(pg_temp.ts(d1,'10:00'), pg_temp.ts(d1,'18:00'), 0,0,0)->>'error' = 'bags', 'zéro bagage refusé') from d;
select pg_temp.check(pg_temp.q(pg_temp.ts(d1,'10:00'), pg_temp.ts(d1,'18:00'), 1,0,0, '10000000-0000-0000-0000-000000000002')->>'error' = 'unavailable', 'commerce non validé : réservation impossible') from d;
insert into public.closures (location_id, starts_at, ends_at)
  select '10000000-0000-0000-0000-000000000001', (d2 + time '00:00') at time zone 'Europe/Paris', (d2 + time '23:59') at time zone 'Europe/Paris' from d;
select pg_temp.check(pg_temp.q(pg_temp.ts(d1,'10:00'), pg_temp.ts(d2,'10:00'), 1,0,0)->>'error' = 'closure', 'fermeture exceptionnelle respectée') from d;
delete from public.closures;

-- Capacité (5 bagages/jour)
select public.create_booking('10000000-0000-0000-0000-000000000001', pg_temp.ts(d1,'10:00'), pg_temp.ts(d2,'10:00'), 2,1,0, 'Jean', 'Jean@Test.fr', '', 'fr') from d;
select pg_temp.check((select count(*) from public.bookings where status = 'pending_payment' and customer_email = 'jean@test.fr' and reference like 'BMY-______') = 1, 'réservation créée (référence BMY-xxxxxx, e-mail en minuscules)');
select pg_temp.check((pg_temp.q(pg_temp.ts(d1,'15:00'), pg_temp.ts(d1,'18:00'), 1,0,0)->>'remaining')::int = 2, 'il reste 2 places le jour 1') from d;
select pg_temp.check(pg_temp.q(pg_temp.ts(d2,'15:00'), pg_temp.ts(d2,'18:00'), 0,0,3)->>'error' = 'full', 'jour 2 complet pour 3 bagages') from d;
do $$ begin
  perform public.create_booking('10000000-0000-0000-0000-000000000001', (select d1 from d) + time '15:00', (select d1 from d) + time '18:00', 3,0,0, 'Trop', 'trop@test.fr', '', 'fr');
  raise exception 'dépassement de capacité accepté';
exception when raise_exception then
  if sqlerrm <> 'full' then raise; end if;
end $$;
select pg_temp.check(true, 'create_booking refuse un dépassement de capacité');
update public.bookings set expires_at = now() - interval '1 minute';
select pg_temp.check((pg_temp.q(pg_temp.ts(d1,'15:00'), pg_temp.ts(d1,'18:00'), 1,0,0)->>'remaining')::int = 5, 'une réservation non payée expirée libère la place') from d;

-- Droits d'accès
set role anon;
do $$ begin
  perform public.booking_quote('10000000-0000-0000-0000-000000000001', now()::timestamp, now()::timestamp, 1, 0, 0);
  raise exception 'anon peut appeler booking_quote';
exception when insufficient_privilege then null; end $$;
select pg_temp.check((select count(*) from public.bookings) = 0, 'visiteur anonyme ne voit aucune réservation');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
set role authenticated;
select pg_temp.check((select count(*) from public.bookings) = 0, 'Bob ne voit pas les réservations d''Alice');
do $$ begin
  perform public.create_booking('10000000-0000-0000-0000-000000000001', now()::timestamp, now()::timestamp, 1, 0, 0, 'x', 'x@x.fr', '', 'fr');
  raise exception 'un utilisateur connecté peut appeler create_booking';
exception when insufficient_privilege then null; end $$;
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
set role authenticated;
select pg_temp.check((select count(*) from public.bookings) = 1, 'Alice voit la réservation de son commerce');
update public.bookings set status = 'picked_up';
reset role;
select pg_temp.check((select status from public.bookings limit 1) = 'pending_payment', 'Alice ne peut pas changer le statut elle-même');
