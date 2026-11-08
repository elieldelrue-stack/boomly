"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { refundAction, resolveIncidentAction, retryTransferAction } from "@/lib/actions/admin";
import { useFormAction } from "@/components/ui/useFormAction";
import { Alert, Button, Field, Input, inputClass } from "@/components/ui/form";
import type { FormState } from "@/lib/types";

function useRefresh(state: FormState) {
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
}

function WhoPays({ transferred }: { transferred: boolean }) {
  const t = useTranslations("AdminOps");
  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend className="mb-1 font-medium">{t("whoPays")}</legend>
      <label className="flex items-start gap-2">
        <input type="radio" name="reclaim" value="partner" defaultChecked className="mt-0.5 accent-brand-600" />
        <span>{transferred ? t("reclaimTransferred") : t("reclaimNotYet")}</span>
      </label>
      <label className="flex items-start gap-2">
        <input type="radio" name="reclaim" value="boomly" className="mt-0.5 accent-brand-600" />
        <span>{t("boomlyPays")}</span>
      </label>
    </fieldset>
  );
}

export function RefundForm({ bookingId, maxLabel, transferred }: { bookingId: string; maxLabel: string; transferred: boolean }) {
  const t = useTranslations("AdminOps");
  const te = useTranslations("Errors");
  const [state, submit, pending] = useFormAction<FormState>(refundAction, {});
  useRefresh(state);
  return (
    <form
      onSubmit={(e) => {
        if (!confirm(t("refundConfirm"))) return e.preventDefault();
        submit(e);
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      {state.error && <Alert>{te(state.error)}</Alert>}
      {state.ok && <Alert kind="success">{t("refundDone")}</Alert>}
      <Field label={t("amount", { max: maxLabel })} htmlFor="amount" error={state.fieldErrors?.amount && te(state.fieldErrors.amount)}>
        <Input id="amount" name="amount" inputMode="decimal" placeholder="0,00" className="max-w-40" />
      </Field>
      <WhoPays transferred={transferred} />
      <Button type="submit" variant="danger" disabled={pending} className="self-start">
        {t("refund")}
      </Button>
    </form>
  );
}

export function ResolveIncidentForm({ incidentId, transferred }: { incidentId: number; transferred: boolean }) {
  const t = useTranslations("AdminOps");
  const te = useTranslations("Errors");
  const [state, submit, pending] = useFormAction<FormState>(resolveIncidentAction, {});
  useRefresh(state);
  const fe = state.fieldErrors ?? {};
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input type="hidden" name="incidentId" value={incidentId} />
      {state.error && <Alert>{te(state.error)}</Alert>}
      <Field label={t("decision")} htmlFor="decision" hint={t("decisionHint")} error={fe.decision && te(fe.decision)}>
        <textarea id="decision" name="decision" rows={3} className={`${inputClass} h-auto py-2`} />
      </Field>
      <Field label={t("refundOptional")} htmlFor="amount" error={fe.amount && te(fe.amount)}>
        <Input id="amount" name="amount" inputMode="decimal" placeholder="0,00" className="max-w-40" />
      </Field>
      <WhoPays transferred={transferred} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="status" value="resolved" disabled={pending}>
          {t("resolve")}
        </Button>
        <Button type="submit" name="status" value="rejected" variant="secondary" disabled={pending}>
          {t("reject")}
        </Button>
      </div>
    </form>
  );
}

export function RetryTransferButton({ bookingId }: { bookingId: string }) {
  const t = useTranslations("AdminOps");
  const [state, submit, pending] = useFormAction<FormState>(retryTransferAction, {});
  useRefresh(state);
  return (
    <form onSubmit={submit}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {t("retryTransfer")}
      </Button>
    </form>
  );
}
