import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui";

// Phase 1 scaffold landing. The interactive onboarding → generation flow is
// wired up in later phases (State 0–3).
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[var(--page-max)] px-5 pt-24 pb-32">
        <div className="fade-up">
          <p className="eyebrow mb-5">AI job application studio</p>
          <h1 className="display text-[clamp(2.4rem,7vw,3.75rem)]">
            Apply once.
            <br />
            Tailored{" "}
            <span className="text-[var(--color-accent)]">everywhere</span>.
          </h1>
          <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-[var(--color-ink-soft)]">
            Upload your resume a single time. Paste any job. JobDash drafts a
            tailored resume, a cover letter, a founder-ready follow-up email,
            interview prep, and a pitch — then tracks the application for you.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Badge tone="accent">Nemotron</Badge>
            <Badge>Resume tailoring</Badge>
            <Badge>Cover letter</Badge>
            <Badge>Interview prep</Badge>
            <Badge>Notion sync</Badge>
          </div>

          <hr className="rule my-12" />

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              ["01", "Onboard", "Drop your baseline resume — the anchor for every draft."],
              ["02", "Point at a job", "Paste a URL or the description. We read the role."],
              ["03", "Ship it", "Review, export, apply, and log it to your tracker."],
            ].map(([n, t, d]) => (
              <div key={n}>
                <div className="font-mono text-xs text-[var(--color-faint)]">
                  {n}
                </div>
                <div className="mt-2 text-[15px] font-medium">{t}</div>
                <div className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                  {d}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
