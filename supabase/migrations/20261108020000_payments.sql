-- =============================================================================
-- Boomly — Étape 4 : paiements Stripe et comptes Stripe des commerçants
-- À exécuter une seule fois dans Supabase > SQL Editor (après l'étape 3).
-- =============================================================================

-- État du compte Stripe du commerçant (mis à jour par le serveur, jamais par le commerçant)
alter table public.locations
  add column stripe_details_submitted boolean not null default false,
  add column stripe_payouts_enabled boolean not null default false;

-- Suivi des e-mails et du reversement au commerçant
alter table public.bookings
  add column confirmation_email_sent_at timestamptz,
  add column partner_email_sent_at timestamptz,
  add column stripe_transfer_id text unique,
  add column transferred_at timestamptz;

-- Le commerçant ne peut toujours pas modifier les champs gérés par Boomly
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
      new.stripe_details_submitted := false;
      new.stripe_payouts_enabled := false;
      new.validated_at := null;
    else
      new.id := old.id;
      new.partner_id := old.partner_id;
      new.status := old.status;
      new.status_reason := old.status_reason;
      new.stripe_account_id := old.stripe_account_id;
      new.stripe_details_submitted := old.stripe_details_submitted;
      new.stripe_payouts_enabled := old.stripe_payouts_enabled;
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

