"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createBookingAction, quoteAction, type Quote } from "@/lib/actions/booking";
import { useFormAction } from "@/components/ui/useFormAction";
import { Alert, Button, Field, Input, inputClass } from "@/components/ui/form";
import { addDays, isoWeekday, parisNow, timeOptions } from "@/lib/paris-time";
import { BAG_SIZES, formatEuros, type BagSize } from "@/lib/pricing";
import type { FormState, OpeningSlot, Settings } from "@/lib/types";

type Counts = Record<BagSize, number>;

/** Premier jour (à partir de `from`) où le point est ouvert, avec un créneau disponible. */
function firstOpenDay(hours: OpeningSlot[], from: string, nowTime: string, today: string): string {
  for (let i = 0; i < 14; i++) {
    const d = addDays(from, i);
    if (timeOptions(hours, isoWeekday(d), d === today ? nowTime : undefined).length) return d;
  }
  return from;
}

function Stepper({
  label,
  hint,
  price,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  price: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="font-medium">
          {label} <span className="text-sm font-normal text-muted">· {price}</span>
        </p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={`${label} −`}
          className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-ink/15 text-lg disabled:opacity-40"
          disabled={value === 0}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <span className="w-6 text-center font-semibold" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label={`${label} +`}
          className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-ink/15 text-lg disabled:opacity-40"
          disabled={value >= 20}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function BookingForm({
  locationId,
  hours,
  settings,
}: {
  locationId: string;
  hours: OpeningSlot[];
  settings: Settings;
}) {
  const t = useTranslations("Booking");
  const ts = useTranslations("Sizes");
  const te = useTranslations("Errors");
  const locale = useLocale();

  // "Maintenant" à Paris, calculé dans le navigateur (évite un décalage de fuseau).
  const [now] = useState(() => parisNow());
  const nowPlus15 = useMemo(() => {
    const [h, m] = now.time.split(":").map(Number);
    const total = Math.min(h * 60 + m + 15, 23 * 60 + 59);
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }, [now]);

  const initialDay = firstOpenDay(hours, now.date, nowPlus15, now.date);
  const [dropoffDate, setDropoffDate] = useState(initialDay);
  const dropoffTimes = timeOptions(hours, isoWeekday(dropoffDate), dropoffDate === now.date ? nowPlus15 : undefined);
  const [dropoffTime, setDropoffTime] = useState(dropoffTimes[0] ?? "");

  const [pickupDate, setPickupDate] = useState(initialDay);
  const pickupTimes = timeOptions(
    hours,
    isoWeekday(pickupDate),
    pickupDate === dropoffDate && dropoffTime ? dropoffTime : undefined,
  ).filter((tm) => !(pickupDate === dropoffDate && tm <= dropoffTime));
  const [pickupTime, setPickupTime] = useState(pickupTimes[pickupTimes.length - 1] ?? "");

  // Garde des heures valides quand la date change
  const effDropoffTime = dropoffTimes.includes(dropoffTime) ? dropoffTime : (dropoffTimes[0] ?? "");
  const effPickupTime = pickupTimes.includes(pickupTime) ? pickupTime : (pickupTimes[pickupTimes.length - 1] ?? "");

  const [counts, setCounts] = useState<Counts>({ small: 0, medium: 1, large: 0 });
  const totalBags = counts.small + counts.medium + counts.large;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, startQuote] = useTransition();

  useEffect(() => {
    if (!effDropoffTime || !effPickupTime || totalBags === 0) return;
    const timer = setTimeout(() => {
      startQuote(async () => {
        setQuote(
          await quoteAction({
            locationId,
            dropoffDate,
            dropoffTime: effDropoffTime,
            pickupDate,
            pickupTime: effPickupTime,
            ...counts,
          }),
        );
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [locationId, dropoffDate, effDropoffTime, pickupDate, effPickupTime, counts, totalBags]);

  const [state, submit, pending] = useFormAction<FormState>(createBookingAction, {});
  const fe = state.fieldErrors ?? {};

  const prices: Record<BagSize, number> = {
    small: settings.price_small_cents,
    medium: settings.price_medium_cents,
    large: settings.price_large_cents,
  };

  const noTimes = !effDropoffTime;
  const quoteError = totalBags === 0 ? "bags" : quote && !quote.ok ? quote.error : null;
  const canSubmit = !!quote?.ok && !quoting && !pending && totalBags > 0 && !noTimes && !!effPickupTime;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="dropoffTime" value={effDropoffTime} />
      <input type="hidden" name="pickupTime" value={effPickupTime} />
      {BAG_SIZES.map((s) => (
        <input key={s} type="hidden" name={s} value={counts[s]} />
      ))}

      {state.error && <Alert>{te(state.error)}</Alert>}

      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-2 font-semibold">{t("dropoff")}</legend>
        <Field label={t("date")} htmlFor="dropoffDate">
          <Input
            id="dropoffDate"
            name="dropoffDate"
            type="date"
            min={now.date}
            max={addDays(now.date, 90)}
            value={dropoffDate}
            onChange={(e) => {
              const d = e.target.value || now.date;
              setDropoffDate(d);
              if (pickupDate < d) setPickupDate(d);
            }}
          />
        </Field>
        <Field label={t("time")} htmlFor="dropoffTimeSel">
          <select
            id="dropoffTimeSel"
            className={inputClass}
            value={effDropoffTime}
            onChange={(e) => setDropoffTime(e.target.value)}
            disabled={noTimes}
          >
            {noTimes && <option value="">{t("closedThatDay")}</option>}
            {dropoffTimes.map((tm) => (
              <option key={tm} value={tm}>
                {tm}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-2 font-semibold">{t("pickup")}</legend>
        <Field label={t("date")} htmlFor="pickupDate">
          <Input
            id="pickupDate"
            name="pickupDate"
            type="date"
            min={dropoffDate}
            max={addDays(dropoffDate, 30)}
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value || dropoffDate)}
          />
        </Field>
        <Field label={t("time")} htmlFor="pickupTimeSel">
          <select
            id="pickupTimeSel"
            className={inputClass}
            value={effPickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            disabled={!pickupTimes.length}
          >
            {!pickupTimes.length && <option value="">{t("closedThatDay")}</option>}
            {pickupTimes.map((tm) => (
              <option key={tm} value={tm}>
                {tm}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset>
        <legend className="mb-1 font-semibold">{t("bags")}</legend>
        <div className="divide-y divide-ink/5">
          {BAG_SIZES.map((s) => (
            <Stepper
              key={s}
              label={ts(s)}
              hint={ts(`${s}Hint`)}
              price={`${formatEuros(prices[s], locale)} ${ts("perDay")}`}
              value={counts[s]}
              onChange={(n) => setCounts((c) => ({ ...c, [s]: n }))}
            />
          ))}
        </div>
      </fieldset>

      <div className="rounded-2xl bg-cream-100 p-4" aria-live="polite">
        {quoteError ? (
          <p className="text-sm text-red-700">
            {te(`booking.${quoteError}`, { remaining: quote && !quote.ok ? (quote.remaining ?? 0) : 0 })}
          </p>
        ) : quote?.ok ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{t("total")}</span>
              <span className={`text-2xl font-bold ${quoting ? "opacity-50" : ""}`}>
                {formatEuros(quote.total_cents, locale)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {t("summary", { bags: quote.bags, days: quote.days })}
            </p>
            {quote.remaining - quote.bags <= 3 && (
              <p className="mt-1 text-sm font-medium text-amber-700">
                {t("fewLeft", { count: Math.max(quote.remaining - quote.bags, 0) })}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">{t("calculating")}</p>
        )}
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-semibold">{t("yourDetails")}</legend>
        <Field label={t("name")} htmlFor="name" error={fe.name && te(fe.name)}>
          <Input id="name" name="name" autoComplete="name" required aria-invalid={!!fe.name} />
        </Field>
        <Field label={t("email")} htmlFor="email" hint={t("emailHint")} error={fe.email && te(fe.email)}>
          <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} />
        </Field>
        <Field label={t("phone")} htmlFor="phone" error={fe.phone && te(fe.phone)}>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
      </fieldset>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="terms" className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600" aria-invalid={!!fe.terms} />
          <span>{t("terms")}</span>
        </label>
        <p className="mt-2 text-xs text-muted">{t("forbidden")}</p>
        {fe.terms && <p className="mt-1 text-sm text-red-600">{te("terms")}</p>}
      </div>

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {pending
          ? t("booking")
          : quote?.ok
            ? t("continue", { total: formatEuros(quote.total_cents, locale) })
            : t("continueNoPrice")}
      </Button>
      <p className="-mt-2 text-center text-xs text-muted">{t("freeCancel")}</p>
    </form>
  );
}
