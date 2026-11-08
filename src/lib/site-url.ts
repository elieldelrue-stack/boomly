// Adresse publique du site. Si NEXT_PUBLIC_SITE_URL n'est pas renseignée,
// on utilise l'adresse fournie automatiquement par Vercel, sinon localhost.
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
