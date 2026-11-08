import "server-only";
import { connection } from "next/server";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** Utilisateur connecté (vérifié auprès de Supabase) et son profil, ou null. */
export async function getCurrentProfile(): Promise<Profile | null> {
  await connection(); // toujours évalué à la demande, jamais figé à la compilation
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, phone")
    .eq("id", data.user.id)
    .single();
  return profile ?? null;
}
