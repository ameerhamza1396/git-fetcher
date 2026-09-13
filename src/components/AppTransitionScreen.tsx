const AppTransitionScreen = () => {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden bg-background text-foreground transition-colors duration-300">
      <div className="relative flex items-center justify-center">
        <img
          src="/assets/brand/medmacs-logo.png"
          alt="Medmacs"
          className="h-24 w-24 object-contain animate-pulse"
          onError={(event) => { event.currentTarget.src = "/icon.svg"; }}
        />
      </div>
    </div>
  );
};

export default AppTransitionScreen;
