"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { setLocationStatusAction } from "@/lib/actions/admin";
import { useFormAction } from "@/components/ui/useFormAction";
import { Alert, Button, Field, inputClass } from "@/components/ui/form";
import type { FormState, LocationStatus } from "@/lib/types";

export function StatusActions({ id, status }: { id: string; status: LocationStatus }) {
  const t = useTranslations("Admin");
  const te = useTranslations("Errors");
  const router = useRouter();
  const [state, action, pending] = useFormAction<FormState>(setLocationStatusAction, {});

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <form onSubmit={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      {state.error && <Alert>{te(state.error)}</Alert>}
      {state.ok && <Alert kind="success">{t("done")}</Alert>}
      <Field label={t("reason")} htmlFor="reason">
        <textarea id="reason" name="reason" rows={2} maxLength={500} className={`${inputClass} h-auto py-2`} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {status !== "active" && (
          <Button type="submit" name="status" value="active" disabled={pending}>
            {status === "pending" || status === "refused" ? t("approve") : t("reactivate")}
          </Button>
        )}
        {status === "pending" && (
          <Button type="submit" name="status" value="refused" variant="danger" disabled={pending}>
            {t("refuse")}
          </Button>
        )}
        {status === "active" && (
          <Button type="submit" name="status" value="suspended" variant="danger" disabled={pending}>
            {t("suspend")}
          </Button>
        )}
      </div>
    </form>
  );
}
