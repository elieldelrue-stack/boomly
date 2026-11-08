"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import jsQR from "jsqr";
import { useRouter } from "@/i18n/navigation";
import { Button, Input } from "@/components/ui/form";

/** Extrait une référence BMY-XXXXXX d'un QR Boomly ou d'une saisie manuelle. */
function extractReference(text: string): string | null {
  const m = text.toUpperCase().match(/BMY-[A-Z0-9]{6}/);
  return m ? m[0] : null;
}

export function QrScanner() {
  const t = useTranslations("Scanner");
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState(false);
  const [manual, setManual] = useState("");
  const [found, setFound] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!video.current || stopped) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = () => {
          const v = video.current;
          if (stopped || !v || !ctx) return;
          if (v.readyState === v.HAVE_ENOUGH_DATA) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            const ref = code ? extractReference(code.data) : null;
            if (ref) {
              stopped = true;
              setFound(ref);
              navigator.vibrate?.(100);
              router.push(`/partenaire/reservations/${ref}`);
              return;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setCameraError(true);
      }
    }
    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [router]);

  const manualRef = extractReference(manual) ?? (/^[A-Z0-9]{6}$/i.test(manual.trim()) ? `BMY-${manual.trim().toUpperCase()}` : null);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
        {cameraError ? (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-white">{t("cameraError")}</p>
        ) : (
          <>
            <video ref={video} playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-[15%] rounded-2xl border-4 border-white/80" />
            {found && <p className="absolute inset-x-0 bottom-4 text-center font-mono text-lg font-bold text-white">{found}</p>}
          </>
        )}
      </div>
      <p className="-mt-3 text-center text-sm text-muted">{t("hint")}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manualRef) router.push(`/partenaire/reservations/${manualRef}`);
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="manual" className="font-medium">
          {t("manualLabel")}
        </label>
        <div className="flex gap-2">
          <Input
            id="manual"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="BMY-7K3P9Q"
            autoCapitalize="characters"
            autoComplete="off"
            className="font-mono uppercase"
          />
          <Button type="submit" disabled={!manualRef}>
            {t("open")}
          </Button>
        </div>
      </form>
    </div>
  );
}
