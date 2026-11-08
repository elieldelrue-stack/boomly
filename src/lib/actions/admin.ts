"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { SETTINGS_TAG } from "@/lib/settings";
import type { FormState } from "@/lib/types";

async function assertAdmin(): Promise<FormState | null> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "notAuthenticated" };
  if (profile.role !== "admin") return { error: "forbidden" };
  return null;
}

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["active", "refused", "suspended"]),
  reason: z
    .string()
    .trim()
    .max(500, "tooLong")
    .transform((v) => (v === "" ? null : v)),
});

export async function setLocationStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await assertAdmin();
  if (denied) return denied;

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "generic" };
  const { id, status, reason } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("locations")
    .update({ status, status_reason: status === "active" ? null : reason })
    .eq("id", id);
  if (error) {
    console.error("Changement de statut :", error.message);
    return { error: "generic" };
  }
  return { ok: true };
}

/** "4,45" ou "4.45" -> 445 centimes */
const euros = z
  .string()
  .trim()
  .regex(/^\d{1,4}([.,]\d{1,2})?$/, "price")
  .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
  .refine((c) => c > 0 && c <= 100000, "price");

const settingsSchema = z.object({
  price_small: euros,
  price_medium: euros,
  price_large: euros,
  partner_share_percent: z
    .string()
    .trim()
    .transform((v) => Number(v.replace(",", ".")))
    .refine((n) => Number.isFinite(n) && n >= 0 && n <= 100, "percent"),
});

export async function updateSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await assertAdmin();
  if (denied) return denied;

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      price_small_cents: parsed.data.price_small,
      price_medium_cents: parsed.data.price_medium,
      price_large_cents: parsed.data.price_large,
      partner_share_percent: parsed.data.partner_share_percent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) {
    console.error("Réglages :", error.message);
    return { error: "generic" };
  }

  updateTag(SETTINGS_TAG); // la page d'accueil affiche aussitôt les nouveaux prix
  return { ok: true };
}
