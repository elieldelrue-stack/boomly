import { useTranslations } from "next-intl";
import type { LocationStatus } from "@/lib/types";

const styles: Record<LocationStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-stone-200 text-stone-700",
  refused: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: LocationStatus }) {
  const t = useTranslations("Status");
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {t(status)}
    </span>
  );
}
