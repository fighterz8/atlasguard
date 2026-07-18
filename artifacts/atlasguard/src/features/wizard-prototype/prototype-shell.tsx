import { FlaskConical, ShieldCheck } from "lucide-react";

type PrototypeShellProps = {
  children: React.ReactNode;
};

export function PrototypeShell({ children }: PrototypeShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f8f4] text-slate-950">
      <a className="skip-link" href="#wizard-content">
        Skip to Wizard content
      </a>

      <aside
        aria-label="Interaction prototype limitation"
        className="border-b border-estimate/20 bg-estimate-surface text-estimate"
      >
        <div className="mx-auto flex max-w-6xl gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <FlaskConical
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <div>
            <p className="text-sm font-semibold">
              Interaction prototype · no evaluation is submitted
            </p>
            <p className="mt-0.5 text-xs leading-5 sm:text-sm">
              This gated flow tests clarity, validation, and assumption review.
              It does not save data or produce a relocation result.
            </p>
          </div>
        </div>
      </aside>

      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a
            href={import.meta.env.BASE_URL}
            className="text-lg font-semibold tracking-[-0.03em] text-slate-950"
          >
            Move<span className="text-teal-700">Wise</span>
          </a>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-teal-700" />
            Private by default
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
