"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { dropoffAction, lateFeeCheckoutAction, pickupAction } from "@/lib/actions/handover";
import { useFormAction } from "@/components/ui/useFormAction";
import { Alert, Button } from "@/components/ui/form";
import type { FormState } from "@/lib/types";

type Props = {
  bookingId: string;
  locationId: string;
  status: string;
  bagCount: number;
  lateFee: { days: number; cents: number; label: string } | null;
  lateFeePaid: boolean;
};

export function HandoverPanel(props: Props) {
  if (props.status === "paid") return <DropoffForm {...props} />;
  if (props.status === "dropped_off") return <PickupForm {...props} />;
  return null;
}

/** Dépôt : photo(s) obligatoire(s), puis confirmation. */
function DropoffForm({ bookingId, locationId, bagCount }: Props) {
  const t = useTranslations("Handover");
  const te = useTranslations("Errors");
  const router = useRouter();
  const [photos, setPhotos] = useState<{ path: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [checked, setChecked] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [state, submit, pending] = useFormAction<FormState>(dropoffAction, {});

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(false);
    const supabase = createClient();
    const added: { path: string; preview: string }[] = [];
    for (const file of Array.from(files).slice(0, 10 - photos.length)) {
      const blob = await compressImage(file);
      const path = `${locationId}/${bookingId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from("dropoff-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) {
        setUploadError(true);
        continue;
      }
      added.push({ path, preview: URL.createObjectURL(blob) });
    }
    setPhotos((p) => [...p, ...added]);
    setUploading(false);
    if (input.current) input.current.value = "";
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      {photos.map((p) => (
        <input key={p.path} type="hidden" name="photos" value={p.path} />
      ))}
      <h2 className="text-lg font-bold">{t("dropoffTitle")}</h2>
      {state.error && <Alert>{te(state.error)}</Alert>}

      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-brand-600" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>{t("checkCount", { count: bagCount })}</span>
      </label>

      <div>
        <p className="font-medium">{t("photosTitle")}</p>
        <p className="text-sm text-muted">{t("photosHint")}</p>
        {uploadError && (
          <div className="mt-2">
            <Alert>{t("uploadError")}</Alert>
          </div>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.path} src={p.preview} alt="" className="aspect-square w-full rounded-xl object-cover" />
          ))}
          <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-brand-500 bg-brand-50 p-2 text-center text-sm font-semibold text-brand-700">
            <span>{uploading ? t("uploading") : `📷 ${t("takePhoto")}`}</span>
            <input
              ref={input}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
        </div>
      </div>

      <Button type="submit" disabled={pending || uploading || photos.length === 0 || !checked} className="h-12 w-full">
        {pending ? "…" : t("confirmDropoff")}
      </Button>
      {photos.length === 0 && <p className="-mt-2 text-center text-sm text-muted">{t("photoRequired")}</p>}
    </form>
  );
}

/** Retrait : supplément de retard éventuel, puis confirmation. */
function PickupForm({ bookingId, lateFee, lateFeePaid }: Props) {
  const t = useTranslations("Handover");
  const te = useTranslations("Errors");
  const locale = useLocale();
  const router = useRouter();
  const [state, submit, pending] = useFormAction<FormState>(pickupAction, {});
  const [feeState, askFee, feePending] = useFormAction<FormState & { url?: string }>(lateFeeCheckoutAction, {});
  const [qr, setQr] = useState<string | null>(null);
  const feeDue = !!lateFee && lateFee.cents > 0 && !lateFeePaid;

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  // Affiche le QR du lien de paiement et attend la confirmation de Stripe.
  useEffect(() => {
    if (!feeState.url) return;
    QRCode.toDataURL(feeState.url, { width: 320, margin: 1 }).then(setQr);
    const timer = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(timer);
  }, [feeState.url, router]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">{t("pickupTitle")}</h2>
      {(state.error || feeState.error) && <Alert>{te((state.error ?? feeState.error)!)}</Alert>}

      {feeDue && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">{t("lateTitle", { days: lateFee.days })}</p>
          <p className="mt-1 text-sm text-amber-900">{t("lateText", { amount: lateFee.label })}</p>
          {qr ? (
            <div className="mt-3 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={t("lateQrAlt")} className="mx-auto w-56 rounded-xl bg-white p-2" />
              <p className="mt-2 text-sm">{t("lateScan")}</p>
              <a href={feeState.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-700 underline">
                {t("lateOpenHere")}
              </a>
            </div>
          ) : (
            <form onSubmit={askFee} className="mt-3">
              <input type="hidden" name="bookingId" value={bookingId} />
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" disabled={feePending} className="w-full">
                {feePending ? "…" : t("lateCharge", { amount: lateFee.label })}
              </Button>
            </form>
          )}
        </div>
      )}

      {lateFeePaid && <Alert kind="success">{t("latePaid")}</Alert>}

      <form
        onSubmit={(e) => {
          const waive = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "1";
          if (waive && !confirm(t("waiveConfirm"))) return e.preventDefault();
          if (!waive && !confirm(t("pickupConfirm"))) return e.preventDefault();
          submit(e);
        }}
        className="flex flex-col gap-2"
      >
        <input type="hidden" name="bookingId" value={bookingId} />
        <Button type="submit" disabled={pending || feeDue} className="h-12 w-full">
          {pending ? "…" : t("confirmPickup")}
        </Button>
        {feeDue && (
          <Button type="submit" name="waive" value="1" variant="secondary" disabled={pending} className="w-full">
            {t("waive")}
          </Button>
        )}
      </form>
    </div>
  );
}
