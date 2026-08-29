type BrandedLoaderProps = {
  fullscreen?: boolean;
};

const BrandedLoader = ({ fullscreen = true }: BrandedLoaderProps) => {
  return (
    <div
      className={[
        fullscreen ? 'fixed inset-0 z-[999]' : 'relative min-h-[16rem] w-full',
        'flex items-center justify-center overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-300',
      ].join(' ')}
    >
      <div className="relative flex items-center justify-center w-[140px] h-[140px] bg-white dark:bg-slate-900 rounded-full shadow-lg border border-slate-100 dark:border-white/5 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
        <img src="/icon.svg" alt="Loading" className="h-[100px] w-[100px] object-contain" />
      </div>
    </div>
  );
};

export default BrandedLoader;
