type PrototypeShellProps = {
  children: React.ReactNode;
};

export function PrototypeShell({ children }: PrototypeShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f8f4] text-slate-950">
      <a className="skip-link" href="#wizard-content">
        Skip to Wizard content
      </a>

      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-2 sm:px-6 lg:px-8">
          <a
            href={import.meta.env.BASE_URL}
            className="inline-flex min-h-11 items-center text-lg font-semibold tracking-[-0.03em] text-slate-950"
          >
            Move<span className="text-teal-700">Wise</span>
          </a>
        </div>
      </header>

      {children}
    </div>
  );
}
