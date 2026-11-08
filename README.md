# Boomly

Consigne à bagages chez des commerçants partenaires. Next.js (App Router) + TypeScript + Tailwind,
Supabase, Stripe Connect, next-intl (FR/EN), Resend, Vercel.

## Lancer le projet sur son ordinateur

1. Installer [Node.js](https://nodejs.org) (version 22 ou plus).
2. Copier `.env.example` en `.env.local` et remplir les valeurs.
3. Dans un terminal, depuis ce dossier :

```bash
npm install
npm run dev
```

4. Ouvrir http://localhost:3000

## Organisation

- `messages/fr.json`, `messages/en.json` : tous les textes du site.
- `src/app/[locale]/` : les pages (`/fr/...`, `/en/...`).
- `src/app/api/` : le code serveur (paiement, webhooks…). `/api/health` vérifie la connexion à Supabase.
- `src/lib/supabase/` : connexion à la base de données.
- `supabase/migrations/` : structure de la base et règles de sécurité, à exécuter dans l'ordre dans Supabase > SQL Editor.
- `supabase/tests/` : tests des règles de sécurité sur un PostgreSQL local (voir ci-dessous).

## Tester les règles de sécurité (développeurs)

```bash
psql -d base_de_test -f supabase/tests/supabase_stub.sql
psql -d base_de_test -f supabase/migrations/20261108000000_partners.sql
psql -d base_de_test -f supabase/migrations/20261108010000_bookings.sql
psql -d base_de_test -f supabase/migrations/20261108020000_payments.sql
psql -d base_de_test -f supabase/migrations/20261108030000_handover.sql
psql -d base_de_test -f supabase/tests/rls_partners_test.sql   # sur une base neuve
psql -d base_de_test -f supabase/tests/bookings_test.sql       # sur une autre base neuve
psql -d base_de_test -f supabase/tests/handover_test.sql       # sur une autre base neuve
```

## Devenir admin

Après avoir créé son compte sur `/fr/partenaire/inscription`, exécuter dans Supabase > SQL Editor :

```sql
update public.profiles set role = 'admin' where email = 'votre@email.fr';
```

## Règles

- Montants calculés uniquement côté serveur ; paiements confirmés par webhook Stripe.
- Accès aux données protégé par la Row Level Security de Supabase.
- Aucune clé secrète dans le code : uniquement des variables d'environnement.
- Stripe en mode test jusqu'à nouvel ordre.
