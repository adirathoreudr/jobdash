import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-paper)_85%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[var(--wide-max)] items-center justify-between px-5">
        <Link href="/" className="group inline-flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]"
            aria-hidden
          />
          <span className="text-[15px] font-semibold tracking-tight">
            JobDash
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="transitionable rounded-[var(--radius-sm)] px-3 py-1.5 text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)] hover:text-[var(--color-ink)]"
          >
            New
          </Link>
          <Link
            href="/history"
            className="transitionable rounded-[var(--radius-sm)] px-3 py-1.5 text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)] hover:text-[var(--color-ink)]"
          >
            History
          </Link>
        </nav>
      </div>
    </header>
  );
}
