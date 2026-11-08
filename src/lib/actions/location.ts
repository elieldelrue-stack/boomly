"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeLocale } from "@/lib/locale";
import { isValidSiret, normalizeSiret } from "@/lib/siret";
import { validateHours } from "@/lib/hours";
import { LOCATIONS_TAG } from "@/lib/public-locations";
import { BUSINESS_TYPES, type FormState, type OpeningSlot } from "@/lib/types";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .transform((v) => (v === "" ? null : v));

const schema = z.object({
  name: z.string().trim().min(2, "required").max(120, "tooLong"),
  business_type: z.enum(BUSINESS_TYPES, "required"),
  description: optionalText(1000),
  phone: optionalText(30),
  siret: z.string().transform(normalizeSiret).refine(isValidSiret, "siret"),
  address: z.string().trim().min(3, "address").max(200, "address"),
  postal_code: optionalText(10),
  city: z.string().trim().min(1, "address").max(100, "address"),
  latitude: z.coerce.number("address").min(41, "address").max(52, "address"),
  longitude: z.coerce.number("address").min(-6, "address").max(10, "address"),
  capacity_per_day: z.coerce.number("capacity").int("capacity").min(1, "capacity").max(500, "capacity"),
});

export async function saveLocationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = safeLocale(formData.get("locale"));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "notAuthenticated" };
  const userId = auth.user.id;

  const fieldErrors: Record<string, string> = {};
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  }

  // Horaires (envoyés en JSON par le formulaire)
  let hours: OpeningSlot[] = [];
  try {
    const raw = JSON.parse(String(formData.get("hours") ?? "[]"));
    hours = z
      .array(z.object({ weekday: z.number(), opens_at: z.string(), closes_at: z.string() }))
      .parse(raw);
  } catch {
    fieldErrors.hours = "hours";
  }
  const hoursError = fieldErrors.hours ? null : validateHours(hours);
  if (hoursError) fieldErrors.hours = hoursError;

  // Photos : uniquement des fichiers déposés dans le dossier de ce commerçant.
  const photoPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/location-photos/${userId}/`;
  const photos = formData.getAll("photos").map(String);
  if (photos.length === 0 || photos.length > 6 || photos.some((p) => !p.startsWith(photoPrefix) || p.includes(".."))) {
    fieldErrors.photos = "photos";
  }

  if (!parsed.success || Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const values = { ...parsed.data, photos };

  const { data: existing } = await supabase.from("locations").select("id").eq("partner_id", userId).maybeSingle();

  let locationId: string;
  if (existing) {
    const { error } = await supabase.from("locations").update(values).eq("id", existing.id);
    if (error) {
      console.error("Mise à jour du commerce :", error.message);
      return { error: "generic" };
    }
    locationId = existing.id;
  } else {
    const { data, error } = await supabase
      .from("locations")
      .insert({ ...values, partner_id: userId })
      .select("id")
      .single();
    if (error || !data) {
      console.error("Création du commerce :", error?.message);
      return { error: "generic" };
    }
    locationId = data.id;
  }

  const { error: hoursErr } = await supabase.rpc("set_opening_hours", {
    p_location_id: locationId,
    p_hours: hours,
  });
  if (hoursErr) {
    console.error("Horaires :", hoursErr.message);
    return { error: "generic" };
  }

  updateTag(LOCATIONS_TAG); // la carte publique reflète aussitôt les changements
  redirect({ href: "/partenaire?saved=1", locale });
  return {};
}
