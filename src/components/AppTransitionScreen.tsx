const AppTransitionScreen = () => {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,#d9fbf7_0%,transparent_36%),linear-gradient(180deg,#ffffff,#f0fdfa)]">
      <div className="flex h-32 w-32 animate-pulse items-center justify-center rounded-[2.25rem] border border-white bg-white/80 shadow-[0_20px_60px_rgba(14,165,233,.16)]">
        <img src="/assets/brand/medmacs-logo.png" alt="Medmacs" className="h-24 w-24 object-contain" onError={(event) => { event.currentTarget.src = "/icon.svg"; }} />
      </div>
      <p className="mt-6 font-['Syne'] text-sm font-extrabold uppercase tracking-[.28em] text-slate-400">Loading Medmacs</p>
    </div>
  );
};

export default AppTransitionScreen;
