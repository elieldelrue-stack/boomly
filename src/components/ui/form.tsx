import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "block h-12 w-full rounded-2xl border-0 bg-white px-4 text-base text-ink ring-1 ring-ink/10 outline-none transition placeholder:text-ink/40 focus:ring-2 focus:ring-brand-400 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-500";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink/80">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-brand-500 text-white shadow-[0_8px_20px_-8px_rgb(255_95_26/0.7)] hover:bg-brand-600",
    secondary: "bg-white text-ink ring-1 ring-ink/12 hover:ring-ink/25",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex h-12 items-center justify-center rounded-full px-6 font-semibold transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 ${styles} ${className}`}
    />
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "bg-red-50 text-red-800 ring-1 ring-red-200",
    success: "bg-forest-50 text-forest-800 ring-1 ring-forest-100",
    info: "bg-brand-50 text-brand-800 ring-1 ring-brand-100",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[28px] bg-white p-5 shadow-soft sm:p-7 ${className}`}>{children}</div>;
}

export function PageShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={`mx-auto w-full px-4 py-8 sm:py-12 ${wide ? "max-w-6xl" : "max-w-2xl"}`}>{children}</div>;
}
