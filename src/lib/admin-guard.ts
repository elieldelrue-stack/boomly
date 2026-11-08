import "server-only";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "./auth";
import type { Profile } from "./types";

/** À appeler en haut de chaque page admin : redirige ou masque la page si l'on n'est pas admin. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    const locale = await getLocale();
    return redirect({ href: "/partenaire/connexion", locale });
  }
  if (profile.role !== "admin") notFound();
  return profile;
}
