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
          <p className="text-sm font-semibold">Research preview</p>
          <p className="mt-0.5 text-xs leading-5 text-amber-900 sm:text-sm">
            {reviewedAssumptions
              ? "This is a preview of the move picture you just checked. Use it to spot budget pressure, must-have needs, and the next facts to verify."
              : "This preview shows how MoveWise will read a move once the family facts and destination estimates are in place."}
          </p>
        </div>
      </div>
    </aside>
  );
}
