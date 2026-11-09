import type { ReactNode } from "react";
import type { LEGAL, PROVIDERS } from "@/lib/legal-config";

export const LEGAL_SLUGS = ["mentions-legales", "cgu", "conditions-partenaires", "confidentialite", "cookies", "fonctionnement", "support"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export type LegalContext = {
  legal: typeof LEGAL;
  providers: typeof PROVIDERS;
  share: number;
  prices: { small: string; medium: string; large: string };
};

export type LegalDoc = { title: string; sections: { h: string; body: ReactNode }[] };
export type LegalDocs = Record<LegalSlug, LegalDoc>;
