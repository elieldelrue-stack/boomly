"use client";

import { useLocale, useTranslations } from "next-intl";
import { startStripeOnboardingAction, openStripeDashboardAction } from "@/lib/actions/stripe-connect";
import { useFormAction } from "@/components/ui/useFormAction";
import { Alert, Button, Card } from "@/components/ui/form";
import type { FormState } from "@/lib/types";

export function StripeCard({
  hasAccount,
  detailsSubmitted,
  payoutsEnabled,
}: {
  hasAccount: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
}) {
  const t = useTranslations("Partner");
  const te = useTranslations("Errors");
  const locale = useLocale();
  const [state, start, pending] = useFormAction<FormState>(startStripeOnboardingAction, {});
  const [dashState, openDash, dashPending] = useFormAction<FormState>(async () => openStripeDashboardAction(), {});
  const error = state.error ?? dashState.error;

  return (
    <Card>
      <p className="text-sm font-medium text-muted">{t("paymentsTitle")}</p>
      {error && (
        <div className="mt-2">
          <Alert>{te(error)}</Alert>
        </div>
      )}
      {payoutsEnabled ? (
        <>
          <p className="mt-2 font-semibold text-green-700">✓ {t("paymentsReady")}</p>
          <p className="mt-1 text-sm text-muted">{t("paymentsReadyText")}</p>
          <form onSubmit={openDash} className="mt-4">
            <Button type="submit" variant="secondary" disabled={dashPending}>
              {t("paymentsDashboard")}
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-2">{hasAccount && detailsSubmitted ? t("paymentsPending") : t("paymentsTodo")}</p>
          <form onSubmit={start} className="mt-4">
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" disabled={pending}>
              {pending ? "…" : hasAccount ? t("paymentsContinue") : t("paymentsStart")}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted">{t("paymentsHint")}</p>
        </>
      )}
    </Card>
  );
}
