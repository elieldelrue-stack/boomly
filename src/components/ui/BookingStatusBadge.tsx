import { useTranslations } from "next-intl";

const styles: Record<string, string> = {
  pending_payment: "bg-stone-200 text-stone-700",
  paid: "bg-blue-100 text-blue-800",
  dropped_off: "bg-amber-100 text-amber-800",
  picked_up: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-red-100 text-red-800",
  expired: "bg-stone-200 text-stone-700",
};

export function BookingStatusBadge({ status }: { status: string }) {
  const t = useTranslations("BookingStatus");
  return (
    <span className={`inline-block shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] ?? styles.expired}`}>
      {t(status)}
    </span>
  );
}
