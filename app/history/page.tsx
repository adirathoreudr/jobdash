import { SiteHeader } from "@/components/SiteHeader";
import { HistoryView } from "@/components/HistoryView";

export const metadata = {
  title: "History — JobDash",
};

export default function HistoryPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[var(--wide-max)] px-5 pt-16 pb-32">
        <div className="mb-8">
          <p className="eyebrow mb-3">Your applications</p>
          <h1 className="display text-[clamp(2rem,5vw,3rem)]">History</h1>
          <p className="mt-3 max-w-[46ch] text-[15px] text-[var(--color-ink-soft)]">
            Every job you&apos;ve applied to through JobDash — track each one
            from applied to offer.
          </p>
        </div>
        <HistoryView />
      </main>
    </>
  );
}
