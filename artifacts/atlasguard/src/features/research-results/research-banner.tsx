import { FlaskConical } from "lucide-react";

type ResearchBannerProps = {
  reviewedAssumptions?: boolean;
};

export function ResearchBanner({
  reviewedAssumptions = false,
}: ResearchBannerProps) {
  return (
    <aside
      aria-label="Research preview limitation"
      className="border-b border-amber-200 bg-amber-50 text-amber-950"
    >
      <div className="mx-auto flex max-w-6xl gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <FlaskConical aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">
            Research preview · not a recommendation
          </p>
          <p className="mt-0.5 text-xs leading-5 text-amber-900 sm:text-sm">
            {reviewedAssumptions
              ? "One verified commute benchmark is evaluated with the assumptions you just reviewed. The result is incomplete and cannot answer whether you should move."
              : "One verified commute benchmark and illustrative financial assumptions are shown to test the results experience. They are not your data and cannot answer whether you should move."}
          </p>
        </div>
      </div>
    </aside>
  );
}
