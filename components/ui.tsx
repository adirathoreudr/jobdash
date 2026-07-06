import * as React from "react";

type Cx = (string | false | null | undefined)[];
export function cx(...parts: Cx) {
  return parts.filter(Boolean).join(" ");
}

/* ----------------------------------------------------------------- Button */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "accent" | "outline";
  size?: "sm" | "md" | "lg";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const base =
      "transitionable inline-flex items-center justify-center gap-2 font-medium select-none disabled:opacity-40 disabled:pointer-events-none rounded-[var(--radius-sm)]";
    const sizes = {
      sm: "h-8 px-3 text-[13px]",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-[15px]",
    }[size];
    const variants = {
      primary:
        "bg-[var(--color-ink)] text-[var(--color-paper)] hover:opacity-90 active:scale-[0.99]",
      accent:
        "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-ink)] active:scale-[0.99]",
      outline:
        "border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink)]",
      ghost:
        "text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)] hover:text-[var(--color-ink)]",
    }[variant];
    return (
      <button ref={ref} className={cx(base, sizes, variants, className)} {...props} />
    );
  }
);
Button.displayName = "Button";

/* ------------------------------------------------------------------- Card */

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ Badge */

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: "neutral" | "accent" | "ok" | "warn";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "border-[var(--color-line)] text-[var(--color-muted)]",
    accent:
      "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-wash)]",
    ok: "border-[color-mix(in_srgb,var(--color-ok)_35%,transparent)] text-[var(--color-ok)]",
    warn: "border-[color-mix(in_srgb,var(--color-warn)_35%,transparent)] text-[var(--color-warn)]",
  }[tone];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        tones,
        className
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- Spinner */

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx("animate-spin", className)}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
