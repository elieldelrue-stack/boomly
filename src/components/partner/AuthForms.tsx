"use client";

import { useLocale, useTranslations } from "next-intl";
import { forgotPasswordAction, signInAction, signUpAction, updatePasswordAction } from "@/lib/actions/auth";
import { useFormAction } from "@/components/ui/useFormAction";
import { Link } from "@/i18n/navigation";
import { Alert, Button, Field, Input } from "@/components/ui/form";
import type { FormState } from "@/lib/types";

export function LoginForm({ callbackError }: { callbackError?: boolean }) {
  const t = useTranslations("Auth");
  const te = useTranslations("Errors");
  const locale = useLocale();
  const [state, action, pending] = useFormAction<FormState>(signInAction, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form onSubmit={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {callbackError && !state.error && <Alert>{t("callbackError")}</Alert>}
      {state.error && <Alert>{te(state.error)}</Alert>}
      <Field label={t("email")} htmlFor="email" error={fe.email && te(fe.email)}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} />
      </Field>
      <Field label={t("password")} htmlFor="password" error={fe.password && te(fe.password)}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!fe.password} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : t("login")}
      </Button>
    </form>
  );
}

export function SignupForm() {
  const t = useTranslations("Auth");
  const te = useTranslations("Errors");
  const locale = useLocale();
  const [state, action, pending] = useFormAction<FormState & { checkEmail?: boolean }>(signUpAction, {});
  const fe = state.fieldErrors ?? {};

  if (state.checkEmail) {
    return (
      <Alert kind="success">
        <p className="font-semibold">{t("checkEmailTitle")}</p>
        <p className="mt-1">{t("checkEmailText")}</p>
      </Alert>
    );
  }

  return (
    <form onSubmit={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {state.error && <Alert>{te(state.error)}</Alert>}
      <Field label={t("fullName")} htmlFor="fullName" error={fe.fullName && te(fe.fullName)}>
        <Input id="fullName" name="fullName" autoComplete="name" required aria-invalid={!!fe.fullName} />
      </Field>
      <Field label={t("email")} htmlFor="email" error={fe.email && te(fe.email)}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} />
      </Field>
      <Field label={t("phone")} htmlFor="phone" error={fe.phone && te(fe.phone)}>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" required aria-invalid={!!fe.phone} />
      </Field>
      <Field label={t("password")} htmlFor="password" hint={t("passwordHint")} error={fe.password && te(fe.password)}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required aria-invalid={!!fe.password} />
      </Field>
      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="terms" className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600" aria-invalid={!!fe.terms} />
          <span>
            {t.rich("partnerTerms", {
              terms: (chunks) => (
                <Link href="/infos/conditions-partenaires" target="_blank" className="font-semibold underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/infos/confidentialite" target="_blank" className="font-semibold underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        {fe.terms && <p className="mt-1 text-sm text-red-600">{te("terms")}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : t("signup")}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const te = useTranslations("Errors");
  const locale = useLocale();
  const [state, action, pending] = useFormAction<FormState>(forgotPasswordAction, {});
  const fe = state.fieldErrors ?? {};
  if (state.ok) return <Alert kind="success">{t("forgotSent")}</Alert>;
  return (
    <form onSubmit={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {state.error && <Alert>{te(state.error)}</Alert>}
      <Field label={t("email")} htmlFor="email" error={fe.email && te(fe.email)}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : t("forgotSubmit")}
      </Button>
    </form>
  );
}

export function NewPasswordForm() {
  const t = useTranslations("Auth");
  const te = useTranslations("Errors");
  const locale = useLocale();
  const [state, action, pending] = useFormAction<FormState>(updatePasswordAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form onSubmit={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {state.error && <Alert>{te(state.error)}</Alert>}
      <Field label={t("newPassword")} htmlFor="password" hint={t("passwordHint")} error={fe.password && te(fe.password)}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required aria-invalid={!!fe.password} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : t("newPasswordSubmit")}
      </Button>
    </form>
  );
}
