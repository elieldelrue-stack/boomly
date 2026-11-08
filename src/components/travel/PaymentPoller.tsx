"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/** Après le paiement, recharge la page jusqu'à ce que Stripe ait confirmé (webhook). */
export function PaymentPoller() {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      router.refresh();
      if (n >= 20) clearInterval(id);
    }, 2000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
