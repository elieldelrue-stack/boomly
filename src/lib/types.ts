export type UserRole = "partner" | "admin";
export type LocationStatus = "pending" | "active" | "suspended" | "refused";
export const BUSINESS_TYPES = ["restaurant", "bar", "tabac", "shop", "hotel", "other"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string;
  phone: string | null;
};

export type Location = {
  id: string;
  partner_id: string;
  name: string;
  business_type: BusinessType;
  description: string | null;
  address: string;
  postal_code: string | null;
  city: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  siret: string;
  photos: string[];
  capacity_per_day: number;
  status: LocationStatus;
  status_reason: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
  stripe_account_id: string | null;
  stripe_details_submitted: boolean;
  stripe_payouts_enabled: boolean;
};

export type OpeningSlot = {
  weekday: number; // 1 = lundi … 7 = dimanche
  opens_at: string; // "HH:MM"
  closes_at: string; // "HH:MM"
};

export type Settings = {
  price_small_cents: number;
  price_medium_cents: number;
  price_large_cents: number;
  partner_share_percent: number;
  currency: string;
};

/** Résultat renvoyé par les formulaires (Server Actions). */
export type FormState = {
  error?: string; // clé de traduction dans "Errors"
  fieldErrors?: Record<string, string>; // champ -> clé de traduction
  ok?: boolean;
};
