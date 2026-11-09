// Informations légales affichées dans les mentions légales, CGU et politique de confidentialité.
// ⚠️ À compléter avant le lancement (les champs entre crochets apparaissent tels quels sur le site),
// puis à faire relire par un avocat avec l'ensemble des textes.

export const LEGAL = {
  companyName: "[NOM DE LA SOCIÉTÉ]",
  legalForm: "SASU",
  capital: "[CAPITAL] €",
  address: "[ADRESSE DU SIÈGE]",
  siren: "[SIREN]",
  rcs: "[VILLE DU RCS]",
  vat: "[N° DE TVA INTRACOMMUNAUTAIRE]",
  publicationDirector: "[NOM DU RESPONSABLE DE LA PUBLICATION]",
  contactEmail: "contact@boomly.fr",
  privacyEmail: "contact@boomly.fr",
  phone: "[TÉLÉPHONE]",

  /** Indemnisation maximale par bagage en cas de perte ou de dommage (selon votre assurance). */
  indemnityCapPerBag: "[PLAFOND] €",
  /** Médiateur de la consommation (adhésion obligatoire avant de vendre à des particuliers). */
  mediatorName: "[NOM DU MÉDIATEUR DE LA CONSOMMATION]",
  mediatorUrl: "[SITE DU MÉDIATEUR]",
  /** Délai pour signaler un incident après le retrait. */
  claimDelayDays: 7,
  /** Conservation des données des voyageurs (doit correspondre à DATA_RETENTION_YEARS). */
  travelerDataYears: 3,

  lastUpdated: "9 novembre 2026",
};

export const PROVIDERS = {
  host: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com",
  database: "Supabase Inc. — données hébergées dans l'Union européenne (Francfort, Allemagne) — supabase.com",
  payments: "Stripe Payments Europe Ltd., 1 Grand Canal Street Lower, Dublin 2, Irlande — stripe.com",
  emails: "Resend (Plus Five Five, Inc.), San Francisco, États-Unis — resend.com",
  domain: "OVH SAS, 2 rue Kellermann, 59100 Roubaix, France — ovhcloud.com",
};
