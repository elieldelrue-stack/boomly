-- Tests des règles de sécurité de l'étape 2 (PostgreSQL local + supabase_stub.sql).
\set ON_ERROR_STOP 1
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.fr', '{"full_name":"Alice","phone":"0600000000"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.fr', '{"full_name":"Bob"}'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.fr', '{}');
update public.profiles set role = 'admin' where email = 'admin@test.fr';

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, false);
  execute 'set role authenticated';
end $$;
create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if not cond then raise exception 'ÉCHEC : %', label; end if;
  raise notice 'ok : %', label;
end $$;

-- Alice crée son commerce en essayant de se mettre "active" : le statut reste "pending".
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.locations (partner_id, name, business_type, address, city, latitude, longitude, siret, capacity_per_day, status, stripe_account_id)
values ('00000000-0000-0000-0000-00000000000a', 'Chez Alice', 'bar', '1 rue A', 'Paris', 48.85, 2.35, '73282932000074', 20, 'active', 'acct_pirate');
select pg_temp.check((select status from public.locations where name = 'Chez Alice') = 'pending', 'création forcée en attente');
select pg_temp.check((select stripe_account_id from public.locations where name = 'Chez Alice') is null, 'compte Stripe non modifiable');
select public.set_opening_hours((select id from public.locations where name = 'Chez Alice'),
  '[{"weekday":1,"opens_at":"09:00","closes_at":"19:00"},{"weekday":2,"opens_at":"09:00","closes_at":"12:00"},{"weekday":2,"opens_at":"14:00","closes_at":"19:00"}]');
select pg_temp.check((select count(*) from public.opening_hours) = 3, 'horaires enregistrés');
update public.locations set status = 'active' where name = 'Chez Alice';
select pg_temp.check((select status from public.locations where name = 'Chez Alice') = 'pending', 'auto-validation impossible');
update public.profiles set role = 'admin' where id = auth.uid();
select pg_temp.check((select role from public.profiles where id = auth.uid()) = 'partner', 'auto-promotion admin impossible');
select pg_temp.check((select count(*) from public.profiles) = 1, 'ne voit que son profil');
reset role;

-- Bob ne voit pas et ne peut pas modifier le commerce d'Alice.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from public.locations) = 0, 'Bob ne voit pas le commerce d''Alice');
select pg_temp.check((select count(*) from public.opening_hours) = 0, 'Bob ne voit pas les horaires d''Alice');
update public.locations set name = 'Piraté';
do $$ begin
  perform public.set_opening_hours((select id from public.locations limit 1), '[]');
exception when others then null; end $$;
insert into public.locations (partner_id, name, business_type, address, city, latitude, longitude, siret, capacity_per_day)
values ('00000000-0000-0000-0000-00000000000a', 'Faux', 'bar', '2 rue B', 'Paris', 48.8, 2.3, '73282932000074', 5);
select pg_temp.check((select partner_id from public.locations where name = 'Faux') = '00000000-0000-0000-0000-00000000000b', 'un commerce créé au nom d''Alice est rattaché à Bob');
do $$ begin
  update public.settings set price_small_cents = 1;
end $$;
reset role;
delete from public.locations where name = 'Faux';
select pg_temp.check((select name from public.locations where partner_id = '00000000-0000-0000-0000-00000000000a') = 'Chez Alice', 'nom inchangé après tentative de Bob');
select pg_temp.check((select price_small_cents from public.settings) = 445, 'Bob ne peut pas changer les prix');

-- Visiteur anonyme : voit les prix, rien d'autre.
set role anon;
select pg_temp.check((select price_medium_cents from public.settings) = 545, 'prix lisibles par tous');
select pg_temp.check((select count(*) from public.locations) = 0, 'anonyme ne voit aucun commerce');
reset role;

-- L'admin voit tout, valide le commerce et change les prix.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select pg_temp.check((select count(*) from public.locations) = 1, 'admin voit le commerce');
update public.locations set status = 'active' where name = 'Chez Alice';
select pg_temp.check((select validated_at from public.locations where name = 'Chez Alice') is not null, 'admin valide (date enregistrée)');
update public.settings set price_large_cents = 700;
select pg_temp.check((select price_large_cents from public.settings) = 700, 'admin change les prix');
reset role;

-- Photos : chacun dans son dossier.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into storage.objects (bucket_id, name) values ('location-photos', '00000000-0000-0000-0000-00000000000a/photo1.jpg');
do $$ begin
  insert into storage.objects (bucket_id, name) values ('location-photos', '00000000-0000-0000-0000-00000000000b/pirate.jpg');
  raise exception 'Alice a pu écrire dans le dossier de Bob';
exception when insufficient_privilege then null; end $$;
reset role;
select pg_temp.check(true, 'photos limitées à son dossier');
