"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { saveLocationAction } from "@/lib/actions/location";
import { createClient } from "@/lib/supabase/client";
import { useFormAction } from "@/components/ui/useFormAction";
import { Alert, Button, Card, Field, Input, inputClass } from "@/components/ui/form";
import { BUSINESS_TYPES, type FormState, type Location, type OpeningSlot } from "@/lib/types";

type Address = {
  label: string;
  address: string;
  postal_code: string;
  city: string;
  latitude: number;
  longitude: number;
};

type DaySlots = { open: boolean; slots: { opens_at: string; closes_at: string }[] };

const DEFAULT_DAY: DaySlots = { open: true, slots: [{ opens_at: "09:00", closes_at: "19:00" }] };

function toDays(hours: OpeningSlot[]): DaySlots[] {
  if (hours.length === 0) {
    return Array.from({ length: 7 }, (_, i) => (i === 6 ? { open: false, slots: [] } : structuredClone(DEFAULT_DAY)));
  }
  return Array.from({ length: 7 }, (_, i) => {
    const slots = hours
      .filter((h) => h.weekday === i + 1)
      .sort((a, b) => a.opens_at.localeCompare(b.opens_at))
      .map((h) => ({ opens_at: h.opens_at, closes_at: h.closes_at }));
    return { open: slots.length > 0, slots };
  });
}

function toSlots(days: DaySlots[]): OpeningSlot[] {
  return days.flatMap((d, i) => (d.open ? d.slots.map((s) => ({ weekday: i + 1, ...s })) : []));
}

/** Réduit une photo (max 1600 px, JPEG) avant l'envoi : plus rapide sur mobile. */
async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function LocationForm({
  userId,
  location,
  hours,
}: {
  userId: string;
  location: Location | null;
  hours: OpeningSlot[];
}) {
  const t = useTranslations("LocationForm");
  const te = useTranslations("Errors");
  const tTypes = useTranslations("BusinessTypes");
  const tDays = useTranslations("Weekdays");
  const locale = useLocale();
  const [state, action, pending] = useFormAction<FormState>(saveLocationAction, {});
  const fe = state.fieldErrors ?? {};
  const err = (k: string) => (fe[k] ? te(fe[k]) : undefined);

  // --- Adresse ---
  const [address, setAddress] = useState<Address | null>(
    location
      ? {
          label: `${location.address}, ${location.postal_code ?? ""} ${location.city}`.replace(/\s+/g, " "),
          address: location.address,
          postal_code: location.postal_code ?? "",
          city: location.city,
          latitude: location.latitude,
          longitude: location.longitude,
        }
      : null,
  );
  const [query, setQuery] = useState(address?.label ?? "");
  const [suggestions, setSuggestions] = useState<Address[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (address && query === address.label) return;
    if (query.trim().length < 4) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        // Base Adresse Nationale (service public gratuit, sans clé)
        const res = await fetch(
          `https://data.geopf.fr/geocodage/search?index=address&autocomplete=1&limit=5&q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const json = await res.json();
        setSuggestions(
          (json.features ?? []).map(
            (f: { properties: Record<string, string>; geometry: { coordinates: [number, number] } }) => ({
              label: f.properties.label,
              address: f.properties.name,
              postal_code: f.properties.postcode ?? "",
              city: f.properties.city,
              longitude: f.geometry.coordinates[0],
              latitude: f.geometry.coordinates[1],
            }),
          ),
        );
        setSearched(true);
      } catch {
        // requête annulée ou service indisponible
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, address]);

  // --- Horaires ---
  const [days, setDays] = useState<DaySlots[]>(() => toDays(hours));
  const updateDay = (i: number, fn: (d: DaySlots) => DaySlots) =>
    setDays((prev) => prev.map((d, j) => (j === i ? fn(structuredClone(d)) : d)));

  // --- Photos ---
  const [photos, setPhotos] = useState<string[]>(location?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(false);
    const supabase = createClient();
    const room = 6 - photos.length;
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      const blob = await compressImage(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("location-photos")
        .upload(path, blob, { contentType: blob.type || "image/jpeg" });
      if (error) {
        setUploadError(true);
        continue;
      }
      added.push(supabase.storage.from("location-photos").getPublicUrl(path).data.publicUrl);
    }
    setPhotos((p) => [...p, ...added]);
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  const isNew = !location;

  return (
    <form onSubmit={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {state.error && <Alert>{te(state.error)}</Alert>}
      {Object.keys(fe).length > 0 && <Alert>{te("checkFields")}</Alert>}

      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t("sectionBusiness")}</h2>
        <div className="flex flex-col gap-4">
          <Field label={t("name")} htmlFor="name" error={err("name")}>
            <Input id="name" name="name" defaultValue={location?.name} required maxLength={120} aria-invalid={!!fe.name} />
          </Field>
          <Field label={t("type")} htmlFor="business_type" error={err("business_type")}>
            <select
              id="business_type"
              name="business_type"
              defaultValue={location?.business_type ?? ""}
              className={inputClass}
              aria-invalid={!!fe.business_type}
            >
              <option value="" disabled>
                {t("choose")}
              </option>
              {BUSINESS_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {tTypes(bt)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("siret")} htmlFor="siret" hint={t("siretHint")} error={err("siret")}>
            <Input id="siret" name="siret" inputMode="numeric" defaultValue={location?.siret} aria-invalid={!!fe.siret} />
          </Field>
          <Field label={t("phone")} htmlFor="phone" error={err("phone")}>
            <Input id="phone" name="phone" type="tel" defaultValue={location?.phone ?? ""} />
          </Field>
          <Field label={t("description")} htmlFor="description" hint={t("descriptionHint")} error={err("description")}>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={1000}
              defaultValue={location?.description ?? ""}
              className={`${inputClass} h-auto py-2`}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t("sectionAddress")}</h2>
        <Field label={t("address")} htmlFor="address-search" error={err("address") ?? err("latitude") ?? err("city")}>
          <div className="relative">
            <Input
              id="address-search"
              autoComplete="off"
              placeholder={t("addressPlaceholder")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setAddress(null);
                if (e.target.value.trim().length < 4) {
                  setSuggestions([]);
                  setSearched(false);
                }
              }}
              aria-invalid={!!(fe.address || fe.latitude)}
            />
            {!address && (suggestions.length > 0 || searching || searched) && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
                {searching && <li className="px-3 py-2 text-sm text-muted">{t("addressSearching")}</li>}
                {!searching && searched && suggestions.length === 0 && (
                  <li className="px-3 py-2 text-sm text-muted">{t("addressNone")}</li>
                )}
                {suggestions.map((s) => (
                  <li key={s.label}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                      onClick={() => {
                        setAddress(s);
                        setQuery(s.label);
                        setSuggestions([]);
                      }}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Field>
        {address && (
          <p className="mt-2 text-sm text-green-700">✓ {t("addressSelected", { label: address.label })}</p>
        )}
        <input type="hidden" name="address" value={address?.address ?? ""} />
        <input type="hidden" name="postal_code" value={address?.postal_code ?? ""} />
        <input type="hidden" name="city" value={address?.city ?? ""} />
        <input type="hidden" name="latitude" value={address?.latitude ?? ""} />
        <input type="hidden" name="longitude" value={address?.longitude ?? ""} />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t("sectionCapacity")}</h2>
        <Field label={t("capacity")} htmlFor="capacity_per_day" error={err("capacity_per_day")}>
          <Input
            id="capacity_per_day"
            name="capacity_per_day"
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            defaultValue={location?.capacity_per_day ?? 10}
            className="max-w-32"
            aria-invalid={!!fe.capacity_per_day}
          />
        </Field>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">{t("sectionHours")}</h2>
        <p className="mt-1 mb-4 text-sm text-muted">{t("hoursHint")}</p>
        {fe.hours && (
          <div className="mb-4">
            <Alert>{te(fe.hours)}</Alert>
          </div>
        )}
        <input type="hidden" name="hours" value={JSON.stringify(toSlots(days))} />
        <ul className="flex flex-col divide-y divide-stone-100">
          {days.map((day, i) => (
            <li key={i} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
              <label className="flex w-36 shrink-0 items-center gap-2 pt-2.5 font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-600"
                  checked={day.open}
                  onChange={(e) =>
                    updateDay(i, (d) => ({
                      open: e.target.checked,
                      slots: e.target.checked && d.slots.length === 0 ? structuredClone(DEFAULT_DAY.slots) : d.slots,
                    }))
                  }
                />
                {tDays(String(i + 1))}
              </label>
              {day.open ? (
                <div className="flex flex-1 flex-col gap-2">
                  {day.slots.map((slot, k) => (
                    <div key={k} className="flex items-center gap-2">
                      <input
                        type="time"
                        aria-label={`${tDays(String(i + 1))} ${t("open")}`}
                        className={`${inputClass} w-32`}
                        value={slot.opens_at}
                        onChange={(e) => updateDay(i, (d) => ((d.slots[k].opens_at = e.target.value), d))}
                      />
                      <span aria-hidden>–</span>
                      <input
                        type="time"
                        aria-label={`${tDays(String(i + 1))} ${t("closed")}`}
                        className={`${inputClass} w-32`}
                        value={slot.closes_at}
                        onChange={(e) => updateDay(i, (d) => ((d.slots[k].closes_at = e.target.value), d))}
                      />
                      {k > 0 && (
                        <button
                          type="button"
                          className="text-sm text-muted underline"
                          onClick={() => updateDay(i, (d) => (d.slots.splice(k, 1), d))}
                        >
                          {t("removeSlot")}
                        </button>
                      )}
                    </div>
                  ))}
                  {day.slots.length < 3 && (
                    <button
                      type="button"
                      className="self-start text-sm font-medium text-brand-700 hover:underline"
                      onClick={() =>
                        updateDay(i, (d) => (d.slots.push({ opens_at: "14:00", closes_at: "19:00" }), d))
                      }
                    >
                      {t("addSlot")}
                    </button>
                  )}
                </div>
              ) : (
                <span className="pt-2.5 text-muted">{t("closed")}</span>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-3 text-sm font-medium text-brand-700 hover:underline"
          onClick={() => setDays((prev) => prev.map(() => structuredClone(prev[0])))}
        >
          {t("copyToAll")}
        </button>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">{t("sectionPhotos")}</h2>
        <p className="mt-1 mb-4 text-sm text-muted">{t("photosHint")}</p>
        {fe.photos && (
          <div className="mb-4">
            <Alert>{te(fe.photos)}</Alert>
          </div>
        )}
        {uploadError && (
          <div className="mb-4">
            <Alert>{t("uploadError")}</Alert>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((url) => (
            <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-100">
              <input type="hidden" name="photos" value={url} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={t("removePhoto")}
                className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"
                onClick={() => setPhotos((p) => p.filter((x) => x !== url))}
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <label className="grid aspect-[4/3] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-stone-300 text-center text-sm font-medium text-muted hover:border-brand-500 hover:text-brand-700">
              <span>{uploading ? t("uploading") : `+ ${t("addPhotos")}`}</span>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={uploading}
                onChange={(e) => onFiles(e.target.files)}
              />
            </label>
          )}
        </div>
      </Card>

      {isNew && <p className="text-sm text-muted">{t("pendingNotice")}</p>}
      <Button type="submit" disabled={pending || uploading} className="self-start">
        {pending ? t("saving") : isNew ? t("submitNew") : t("submitEdit")}
      </Button>
    </form>
  );
}
