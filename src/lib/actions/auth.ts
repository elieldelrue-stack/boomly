"use server";

import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeLocale } from "@/lib/locale";
import { siteUrl } from "@/lib/site-url";
import type { FormState } from "@/lib/types";

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "required").max(120, "tooLong"),
  email: z.string().trim().toLowerCase().pipe(z.email("email")),
  phone: z.string().trim().min(6, "required").max(30, "tooLong"),
  password: z.string().min(8, "passwordShort").max(72, "tooLong"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("email")),
  password: z.string().min(1, "required"),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    out[key] ??= issue.message;
  }
  return out;
}

function mapAuthError(code: string | undefined, message: string): string {
  if (code === "user_already_exists" || /already registered/i.test(message)) return "alreadyRegistered";
  if (code === "invalid_credentials" || /invalid login/i.test(message)) return "invalidCredentials";
  if (code === "email_not_confirmed") return "emailNotConfirmed";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") return "rateLimited";
  if (code === "weak_password") return "passwordShort";
  return "generic";
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState & { checkEmail?: boolean }> {
  const locale = safeLocale(formData.get("locale"));
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { fullName, email, phone, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/${locale}/partenaire/commerce`,
    },
  });

  if (error) return { error: mapAuthError(error.code, error.message) };

  // Supabase renvoie un utilisateur sans "identities" si l'e-mail existe déjà.
  if (data.user && data.user.identities?.length === 0) return { error: "alreadyRegistered" };

  if (!data.session) return { checkEmail: true };

  redirect({ href: "/partenaire/commerce", locale });
  return {};
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = safeLocale(formData.get("locale"));
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: mapAuthError(error.code, error.message) };

  redirect({ href: "/partenaire", locale });
  return {};
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get("locale"));
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/", locale });
}

const emailOnly = z.object({ email: z.string().trim().toLowerCase().pipe(z.email("email")) });

/** Envoie le lien de réinitialisation. Répond toujours pareil (ne révèle pas si le compte existe). */
export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = safeLocale(formData.get("locale"));
  const parsed = emailOnly.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/${locale}/partenaire/nouveau-mot-de-passe`,
  });
  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") return { error: "rateLimited" };
  if (error) console.error("Mot de passe oublié :", error.message);
  return { ok: true };
}

const newPassword = z.object({ password: z.string().min(8, "passwordShort").max(72, "tooLong") });

export async function updatePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = safeLocale(formData.get("locale"));
  const parsed = newPassword.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "notAuthenticated" };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: mapAuthError(error.code, error.message) };
  redirect({ href: "/partenaire?saved=1", locale });
  return {};
}
