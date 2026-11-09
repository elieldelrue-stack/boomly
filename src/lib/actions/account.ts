"use server";

import { updateTag } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeLocale } from "@/lib/locale";
import { LOCATIONS_TAG } from "@/lib/public-locations";
import { sendAdminAlert } from "@/lib/email";
import type { FormState } from "@/lib/types";

/**
 * Suppression du compte commerçant (exigée par Apple et le RGPD).
 * Les données personnelles sont effacées et la connexion devient impossible.
 * Les données de facturation (SIRET, réservations, versements) sont conservées
 * le temps des obligations légales (comptabilité, déclaration DAC7).
 */
export async function deleteAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = safeLocale(formData.get("locale"));
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "SUPPRIMER" && String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { fieldErrors: { confirm: "confirmWord" } };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "notAuthenticated" };
  const userId = auth.user.id;
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).single();
  if (profile?.role === "admin") return { error: "account.adminCannotDelete" };

  const { data: location } = await admin.from("locations").select("id, name").eq("partner_id", userId).maybeSingle();
  if (location) {
    const { count } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("location_id", location.id)
      .in("status", ["paid", "dropped_off"]);
    if ((count ?? 0) > 0) return { error: "account.openBookings" };

    await admin
      .from("locations")
      .update({ status: "suspended", status_reason: "Compte supprimé par le commerçant", phone: null, description: null })
      .eq("id", location.id);
  }

  const anonymousEmail = `supprime-${userId.slice(0, 8)}@boomly.invalid`;
  await admin.from("profiles").update({ full_name: null, phone: null, email: anonymousEmail }).eq("id", userId);
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email: anonymousEmail,
    email_confirm: true,
    user_metadata: {},
    ban_duration: "876000h", // connexion bloquée définitivement
  });
  if (error) {
    console.error("Suppression de compte :", error.message);
    return { error: "generic" };
  }

  await supabase.auth.signOut();
  updateTag(LOCATIONS_TAG);
  await sendAdminAlert("Compte commerçant supprimé", `${location?.name ?? "Commerçant sans commerce"} a supprimé son compte.`);
  redirect({ href: "/?compte=supprime", locale });
  return {};
}
