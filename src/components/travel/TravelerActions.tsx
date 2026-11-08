"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cancelBookingAction, incidentAction, rescheduleAction, reviewAction } from "@/lib/actions/traveler";
import { useFormAction } from "@/components/ui/useFormAction";
import { Alert, Button, Card, Field, Input, inputClass } from "@/components/ui/form";
import { compressImage } from "@/lib/image";
import { addDays, isoWeekday, parisNow, timeOptions } from "@/lib/paris-time";
import type { FormState, OpeningSlot } from "@/lib/types";

type Access = { reference: string; token: string };

function Hidden({ reference, token }: Access) {
  return (
    <>
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="token" value={token} />
    </>
  );
}

function useRefreshOnOk(state: FormState) {
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
}

/** Annuler (gratuit avant le dépôt) ou modifier les horaires. */
export function ManageBooking({
  access,
  hours,
  dropoffDate,
  dropoffTime,
  pickupDate,
  pickupTime,
}: {
  access: Access;
  hours: OpeningSlot[];
  dropoffDate: string;
  dropoffTime: string;
  pickupDate: string;
  pickupTime: string;
}) {
  const t = useTranslations("Manage");
  const te = useTranslations("Errors");
  const [cancelState, cancel, cancelling] = useFormAction<FormState>(cancelBookingAction, {});
  const [moveState, move, moving] = useFormAction<FormState>(rescheduleAction, {});
  useRefreshOnOk(cancelState);
  useRefreshOnOk(moveState);
  const [open, setOpen] = useState(false);

  const [now] = useState(() => parisNow());
  const [dDate, setDDate] = useState(dropoffDate);
  const [dTime, setDTime] = useState(dropoffTime);
  const [pDate, setPDate] = useState(pickupDate);
  const [pTime, setPTime] = useState(pickupTime);
  const dTimes = timeOptions(hours, isoWeekday(dDate), dDate === now.date ? now.time : undefined);
  const pTimes = timeOptions(hours, isoWeekday(pDate)).filter((x) => !(pDate === dDate && x <= dTime));

  return (
    <Card>
      <h2 className="font-semibold">{t("title")}</h2>
      {(cancelState.error || moveState.error) && (
        <div className="mt-2">
          <Alert>{te((cancelState.error ?? moveState.error)!)}</Alert>
        </div>
      )}
      {moveState.ok && (
        <div className="mt-2">
          <Alert kind="success">{t("moved")}</Alert>
        </div>
      )}

      {open ? (
        <form onSubmit={move} className="mt-3 grid grid-cols-2 gap-3">
          <Hidden {...access} />
          <Field label={t("dropoffDate")} htmlFor="dropoffDate">
            <Input id="dropoffDate" name="dropoffDate" type="date" min={now.date} value={dDate} onChange={(e) => setDDate(e.target.value || dDate)} />
          </Field>
          <Field label={t("time")} htmlFor="dropoffTime">
            <select id="dropoffTime" name="dropoffTime" className={inputClass} value={dTimes.includes(dTime) ? dTime : (dTimes[0] ?? "")} onChange={(e) => setDTime(e.target.value)}>
              {dTimes.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label={t("pickupDate")} htmlFor="pickupDate">
            <Input id="pickupDate" name="pickupDate" type="date" min={dDate} max={addDays(dDate, 30)} value={pDate} onChange={(e) => setPDate(e.target.value || pDate)} />
          </Field>
          <Field label={t("time")} htmlFor="pickupTime">
            <select id="pickupTime" name="pickupTime" className={inputClass} value={pTimes.includes(pTime) ? pTime : (pTimes[pTimes.length - 1] ?? "")} onChange={(e) => setPTime(e.target.value)}>
              {pTimes.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <p className="col-span-2 text-xs text-muted">{t("samePrice")}</p>
          <Button type="submit" disabled={moving || !dTimes.length || !pTimes.length} className="col-span-2">
            {t("save")}
          </Button>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            {t("change")}
          </Button>
          <form
            onSubmit={(e) => {
              if (!confirm(t("cancelConfirm"))) return e.preventDefault();
              cancel(e);
            }}
          >
            <Hidden {...access} />
            <Button type="submit" variant="danger" disabled={cancelling}>
              {cancelling ? "…" : t("cancel")}
            </Button>
          </form>
        </div>
      )}
      <p className="mt-2 text-xs text-muted">{t("freeCancel")}</p>
    </Card>
  );
}

/** Signaler un problème (perte, dommage, commerce fermé…). */
export function IncidentForm({ access, canSayClosed }: { access: Access; canSayClosed: boolean }) {
  const t = useTranslations("Manage");
  const te = useTranslations("Errors");
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [state, submit, pending] = useFormAction<FormState>(async (prev, fd) => {
    fd.delete("photos");
    for (const f of files) fd.append("photos", f);
    return incidentAction(prev, fd);
  }, {});
  useRefreshOnOk(state);

  if (state.ok) return <Alert kind="success">{t("incidentSent")}</Alert>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-sm text-muted underline">
        {t("incidentOpen")}
      </button>
    );

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Hidden {...access} />
        <h2 className="font-semibold">{t("incidentTitle")}</h2>
        {state.error && <Alert>{te(state.error)}</Alert>}
        <Field label={t("incidentType")} htmlFor="type">
          <select id="type" name="type" className={inputClass} defaultValue={canSayClosed ? "closed" : "damaged"}>
            {canSayClosed && <option value="closed">{t("type_closed")}</option>}
            <option value="damaged">{t("type_damaged")}</option>
            <option value="lost">{t("type_lost")}</option>
            <option value="other">{t("type_other")}</option>
          </select>
        </Field>
        <Field label={t("incidentDescription")} htmlFor="description" error={state.fieldErrors?.description && te(state.fieldErrors.description)}>
          <textarea id="description" name="description" rows={4} maxLength={3000} className={`${inputClass} h-auto py-2`} required />
        </Field>
        <Field label={t("incidentPhotos")} htmlFor="photos">
          <input
            id="photos"
            type="file"
            accept="image/*"
            multiple
            onChange={async (e) => {
              const picked = Array.from(e.target.files ?? []).slice(0, 3);
              const out: File[] = [];
              for (const f of picked) out.push(new File([await compressImage(f)], `${crypto.randomUUID()}.jpg`, { type: "image/jpeg" }));
              setFiles(out);
            }}
            className="text-sm"
          />
        </Field>
        <p className="text-xs text-muted">{t("incidentHint")}</p>
        <Button type="submit" disabled={pending}>
          {pending ? "…" : t("incidentSend")}
        </Button>
      </form>
    </Card>
  );
}

/** Avis après le retrait. */
export function ReviewForm({ access }: { access: Access }) {
  const t = useTranslations("Manage");
  const te = useTranslations("Errors");
  const [rating, setRating] = useState(0);
  const [state, submit, pending] = useFormAction<FormState>(reviewAction, {});
  useRefreshOnOk(state);
  if (state.ok) return <Alert kind="success">{t("reviewThanks")}</Alert>;

  return (
    <Card>
      <form id="avis" onSubmit={submit} className="flex flex-col gap-3">
        <Hidden {...access} />
        <input type="hidden" name="rating" value={rating} />
        <h2 className="font-semibold">{t("reviewTitle")}</h2>
        {state.error && <Alert>{te(state.error)}</Alert>}
        <div className="flex gap-1" role="radiogroup" aria-label={t("reviewTitle")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n}/5`}
              onClick={() => setRating(n)}
              className={`text-4xl leading-none ${n <= rating ? "text-amber-500" : "text-stone-300"}`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea name="comment" rows={3} maxLength={1000} placeholder={t("reviewComment")} className={`${inputClass} h-auto py-2`} />
        <Button type="submit" disabled={pending || rating === 0}>
          {t("reviewSend")}
        </Button>
      </form>
    </Card>
  );
}
