import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Immediate scroll
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    document.body.scrollTo(0, 0);

    // Some pages might load content asynchronously or have layout shifts.
    // Using requestAnimationFrame ensures we scroll after the browser has finished its next paint.
    const scrollRaf = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.body.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });

    // Fallback for slower-loading single page app content
    const timeoutId = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);

    return () => {
      cancelAnimationFrame(scrollRaf);
      clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}
