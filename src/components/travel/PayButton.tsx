"use client";

import { useLocale, useTranslations } from "next-intl";
import { startCheckoutAction } from "@/lib/actions/checkout";
import { useFormAction } from "@/components/ui/useFormAction";
import { Alert, Button } from "@/components/ui/form";
import type { FormState } from "@/lib/types";

export function PayButton({ reference, token, total }: { reference: string; token: string; total: string }) {
  const t = useTranslations("Reservation");
  const te = useTranslations("Errors");
  const locale = useLocale();
  const [state, submit, pending] = useFormAction<FormState>(startCheckoutAction, {});
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="token" value={token} />
      {state.error && <Alert>{te(state.error)}</Alert>}
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending ? t("redirecting") : t("pay", { total })}
      </Button>
      <p className="text-center text-sm text-muted">{t("payInfo")}</p>
    </form>
  );
}
