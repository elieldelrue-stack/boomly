/** Forme organique qui ondule très lentement (immobile si l'utilisateur limite les animations). */
export function Blob({ className = "", animated = true }: { className?: string; animated?: boolean }) {
  return (
    <div
      aria-hidden
      className={`rounded-[58%_42%_46%_54%/52%_44%_56%_48%] ${animated ? "motion-safe:animate-blob" : ""} ${className}`}
    />
  );
}
