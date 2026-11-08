"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { updateSettingsAction } from "@/lib/actions/admin";
import { useFormAction } from "@/components/ui/useFormAction";
import { Alert, Button, Field, Input } from "@/components/ui/form";
import { BAG_SIZES, formatEuros, partnerShareCents } from "@/lib/pricing";
import type { FormState, Settings } from "@/lib/types";

const toInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const toCents = (v: string) => Math.round(Number(v.replace(",", ".")) * 100);

export function SettingsForm({ settings }: { settings: Settings }) {
  const t = useTranslations("Admin");
  const ts = useTranslations("Sizes");
  const te = useTranslations("Errors");
  const locale = useLocale();
  const [state, action, pending] = useFormAction<FormState>(updateSettingsAction, {});
  const fe = state.fieldErrors ?? {};

  const [values, setValues] = useState({
    small: toInput(settings.price_small_cents),
    medium: toInput(settings.price_medium_cents),
    large: toInput(settings.price_large_cents),
    share: String(settings.partner_share_percent).replace(".", ","),
  });
  const share = Number(values.share.replace(",", "."));

  return (
    <form onSubmit={action} className="flex flex-col gap-5">
      {state.error && <Alert>{te(state.error)}</Alert>}
      {state.ok && <Alert kind="success">{t("saved")}</Alert>}
      <div className="grid gap-4 sm:grid-cols-3">
        {BAG_SIZES.map((size) => (
          <Field key={size} label={`${ts(size)} (€)`} htmlFor={`price_${size}`} hint={ts(`${size}Hint`)} error={fe[`price_${size}`] && te(fe[`price_${size}`])}>
            <Input
              id={`price_${size}`}
              name={`price_${size}`}
              inputMode="decimal"
              value={values[size]}
              onChange={(e) => setValues((v) => ({ ...v, [size]: e.target.value }))}
              aria-invalid={!!fe[`price_${size}`]}
            />
          </Field>
        ))}
      </div>
      <Field label={t("partnerShare")} htmlFor="partner_share_percent" error={fe.partner_share_percent && te(fe.partner_share_percent)}>
        <Input
          id="partner_share_percent"
          name="partner_share_percent"
          inputMode="decimal"
          className="max-w-32"
          value={values.share}
          onChange={(e) => setValues((v) => ({ ...v, share: e.target.value }))}
          aria-invalid={!!fe.partner_share_percent}
        />
      </Field>

      <div className="rounded-xl bg-stone-50 p-4 text-sm">
        <p className="font-medium">{t("example")}</p>
        <ul className="mt-2 flex flex-col gap-1 text-muted">
          {BAG_SIZES.map((size) => {
            const total = toCents(values[size]);
            if (!Number.isFinite(total) || !Number.isFinite(share)) return null;
            const partner = partnerShareCents(total, share);
            return (
              <li key={size}>
                {t("exampleLine", {
                  size: ts(size),
                  total: formatEuros(total, locale),
                  partner: formatEuros(partner, locale),
                  boomly: formatEuros(total - partner, locale),
                })}
              </li>
            );
          })}
        </ul>
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {t("save")}
      </Button>
    </form>
  );
}
