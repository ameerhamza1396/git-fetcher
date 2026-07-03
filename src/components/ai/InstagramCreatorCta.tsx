import { Instagram } from 'lucide-react';

export const creatorInstagramUrl = 'https://instagram.com/ameerhamza.exe';

export const shouldShowCreatorInstagramCta = (text = '') =>
  /(instagram\.com\/ameerhamza\.exe|@?ameerhamza\.exe)/i.test(text);

export const openCreatorInstagram = () => {
  if (typeof window === 'undefined') return;

  const webUrl = creatorInstagramUrl;
  const appUrl = 'instagram://user?username=ameerhamza.exe';
  const startedAt = Date.now();

  window.location.href = appUrl;
  window.setTimeout(() => {
    if (Date.now() - startedAt < 1800) {
      window.location.href = webUrl;
    }
  }, 900);
};

export const InstagramCreatorCta = ({ className = '' }: { className?: string }) => (
  <button
    type="button"
    onClick={openCreatorInstagram}
    className={`mt-3 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-pink-500/20 active:scale-95 ${className}`}
  >
    <Instagram className="h-4 w-4" />
    Open Instagram
  </button>
);
