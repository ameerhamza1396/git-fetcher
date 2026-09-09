const AppTransitionScreen = () => {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden bg-background text-foreground transition-colors duration-300">
      <div className="flex h-32 w-32 animate-pulse items-center justify-center rounded-[2.25rem] border border-border bg-card/80 dark:bg-card/90 shadow-[0_20px_60px_rgba(14,165,233,.16)]">
        <img src="/assets/brand/medmacs-logo.png" alt="Medmacs" className="h-24 w-24 object-contain" onError={(event) => { event.currentTarget.src = "/icon.svg"; }} />
      </div>
      <p className="mt-6 font-['Syne'] text-sm font-extrabold uppercase tracking-[.28em] text-muted-foreground">Loading Medmacs</p>
    </div>
  );
};

export default AppTransitionScreen;
