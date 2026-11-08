"use client";

import { useEffect } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { addClosureAction, deleteClosureAction, pauseTodayAction } from "@/lib/actions/handover";
import { useFormAction } from "@/components/ui/useFormAction";
import { Alert, Button, Card, Field, Input } from "@/components/ui/form";
import type { FormState } from "@/lib/types";

type Closure = { id: number; starts_at: string; ends_at: string; reason: string | null };

export function AvailabilityCard({ closures, pausedNow }: { closures: Closure[]; pausedNow: boolean }) {
  const t = useTranslations("Partner");
  const te = useTranslations("Errors");
  const format = useFormatter();
  const router = useRouter();
  const [pauseState, pause, pausing] = useFormAction<FormState>(async () => pauseTodayAction(), {});
  const [closeState, addClosure, adding] = useFormAction<FormState>(addClosureAction, {});

  useEffect(() => {
    if (pauseState.ok || closeState.ok) router.refresh();
  }, [pauseState, closeState, router]);

  const fmt = (iso: string) => format.dateTime(new Date(iso), { timeZone: "Europe/Paris", day: "numeric", month: "short" });

  return (
    <Card>
      <h2 className="text-lg font-semibold">{t("availabilityTitle")}</h2>
      {(pauseState.error || closeState.error) && (
        <div className="mt-2">
          <Alert>{te((pauseState.error ?? closeState.error)!)}</Alert>
        </div>
      )}

      {pausedNow ? (
        <p className="mt-2 font-medium text-amber-700">{t("pausedNow")}</p>
      ) : (
        <form onSubmit={pause} className="mt-3">
          <Button type="submit" variant="secondary" disabled={pausing}>
            {t("pauseToday")}
          </Button>
          <p className="mt-1 text-xs text-muted">{t("pauseHint")}</p>
        </form>
      )}

      {closures.length > 0 && (
        <ul className="mt-4 divide-y divide-stone-100 text-sm">
          {closures.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                {fmt(c.starts_at) === fmt(c.ends_at) ? fmt(c.starts_at) : `${fmt(c.starts_at)} → ${fmt(c.ends_at)}`}
                {c.reason && c.reason !== "pause" && <span className="text-muted"> · {c.reason}</span>}
                {c.reason === "pause" && <span className="text-muted"> · {t("pauseLabel")}</span>}
              </span>
              <form
                action={async (fd) => {
                  await deleteClosureAction(fd);
                  router.refresh();
                }}
              >
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="text-muted underline">
                  {t("remove")}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addClosure} className="mt-4 grid grid-cols-2 gap-3 border-t border-stone-100 pt-4">
        <p className="col-span-2 font-medium">{t("closureTitle")}</p>
        <Field label={t("from")} htmlFor="start">
          <Input id="start" name="start" type="date" required />
        </Field>
        <Field label={t("to")} htmlFor="end">
          <Input id="end" name="end" type="date" required />
        </Field>
        <div className="col-span-2">
          <Field label={t("closureReason")} htmlFor="reason">
            <Input id="reason" name="reason" maxLength={200} />
          </Field>
        </div>
        <Button type="submit" variant="secondary" disabled={adding} className="col-span-2 sm:col-span-1">
          {t("closureAdd")}
        </Button>
      </form>
    </Card>
  );
}
