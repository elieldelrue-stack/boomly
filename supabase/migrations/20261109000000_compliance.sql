-- =============================================================================
-- Boomly — Étape 7a : limitation des tentatives, effacement des données (RGPD)
-- À exécuter une seule fois dans Supabase > SQL Editor (après l'étape 6).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Limitation du nombre de tentatives (connexion, inscription, réservation…)
-- Une ligne par clé (ex. "login:1.2.3.4") et par fenêtre de temps.
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
-- Aucune politique : seule la clé serveur (service_role) y accède.

-- Renvoie true si la requête est autorisée, false si la limite est atteinte.
create or replace function public.hit_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start, hits)
  values (left(p_key, 200), v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Effacement automatique des données des voyageurs après la durée de conservation.
-- Les montants et dates sont conservés (obligations comptables), mais plus rien
-- ne permet d'identifier le voyageur. Renvoie les chemins des photos à supprimer.
-- ---------------------------------------------------------------------------
create or replace function public.anonymize_old_bookings(p_older_than interval)
returns table (photo_path text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return query
  with old as (
    select b.id, b.dropoff_photos
    from public.bookings b
    where b.created_at < now() - p_older_than
      and b.customer_email <> 'anonyme@boomly.invalid'
      and b.status not in ('paid', 'dropped_off')
  ),
  upd as (
    update public.bookings b
    set customer_name = 'Voyageur',
        customer_email = 'anonyme@boomly.invalid',
        customer_phone = null,
        dropoff_photos = '{}',
        updated_at = now()
    from old
    where b.id = old.id
    returning old.dropoff_photos
  )
  select unnest(upd.dropoff_photos) from upd;

  -- Les avis restent publiés, sans le prénom.
  update public.reviews r set customer_first_name = null
  where r.created_at < now() - p_older_than and r.customer_first_name is not null;

  -- Les incidents clos perdent leur description détaillée.
  update public.incidents i set description = '(anonymisé)', photos = '{}'
  where i.created_at < now() - p_older_than and i.status <> 'open' and i.description <> '(anonymisé)';

  -- Nettoyage des compteurs de tentatives de plus d'un jour.
  delete from public.rate_limits where window_start < now() - interval '1 day';
end;
$$;

revoke execute on function public.anonymize_old_bookings(interval) from public, anon, authenticated;
grant execute on function public.anonymize_old_bookings(interval) to service_role;
