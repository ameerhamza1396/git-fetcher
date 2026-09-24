import React, { useEffect, useRef } from 'react';

interface LottiePlayerProps {
  animationData: any;
  loop?: boolean;
  autoplay?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

declare global {
  interface Window {
    lottie?: any;
  }
}

export const LottiePlayer: React.FC<LottiePlayerProps> = ({
  animationData,
  loop = true,
  autoplay = true,
  style,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let anim: any = null;
    let isMounted = true;

    const initLottie = () => {
      if (!containerRef.current || !isMounted || !window.lottie) return;
      try {
        anim = window.lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop,
          autoplay,
          animationData,
        });
      } catch (err) {
        console.error("Failed to initialize Lottie animation:", err);
      }
    };

    if (window.lottie) {
      initLottie();
    } else {
      let script = document.getElementById('lottie-cdn-script') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'lottie-cdn-script';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
        script.async = true;
        document.head.appendChild(script);
      }

      const handleLoad = () => {
        if (isMounted) initLottie();
      };

      script.addEventListener('load', handleLoad);
      // In case script loaded before event listener was attached
      if (window.lottie) {
        initLottie();
      }
    }

    return () => {
      isMounted = false;
      if (anim) {
        anim.destroy();
      }
    };
  }, [animationData, loop, autoplay]);

  return <div ref={containerRef} style={style} className={className} />;
};

export default LottiePlayer;
