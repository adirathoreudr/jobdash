import type { ReactNode } from "react";
import { Card } from "@/components/ui";

/** A titled panel for one generated artifact, with a right-aligned action slot. */
export function ArtifactCard({
  index,
  title,
  subtitle,
  actions,
  children,
}: {
  index?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="fade-up overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {index && (
              <span className="font-mono text-xs text-[var(--color-faint)]">
                {index}
              </span>
            )}
            <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </Card>
  );
}
