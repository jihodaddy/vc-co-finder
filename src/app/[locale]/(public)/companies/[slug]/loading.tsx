/**
 * SSR skeleton for the company profile. Matches the section rhythm of
 * page.tsx so layout shift is minimized. Neutral gray blocks only —
 * no shimmer animation (UI-SPEC: no custom keyframes in Phase 2).
 */
export default function CompanyLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
        {/* Hero skeleton */}
        <section className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="h-[72px] w-[72px] rounded-md bg-muted" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-9 w-48 rounded bg-muted" />
              <div className="h-6 w-32 rounded bg-muted" />
            </div>
          </div>
          <div className="h-px w-full bg-border" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
        </section>

        {/* Aliases skeleton */}
        <section className="flex flex-col gap-4">
          <div className="h-6 w-24 rounded bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-4 w-36 rounded bg-muted" />
        </section>

        {/* Funding rounds skeleton */}
        <section className="flex flex-col gap-4">
          <div className="h-6 w-32 rounded bg-muted" />
          <div className="h-20 w-full rounded bg-muted" />
          <div className="h-20 w-full rounded bg-muted" />
        </section>

        {/* Identifiers skeleton */}
        <section className="flex flex-col gap-4">
          <div className="h-6 w-20 rounded bg-muted" />
          <div className="h-4 w-56 rounded bg-muted" />
        </section>
      </div>
    </main>
  );
}
