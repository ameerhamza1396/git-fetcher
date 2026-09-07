import { useRef, useState } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { BookOpen, Brain, ChevronLeft, ChevronRight, FileText, Stethoscope, X } from 'lucide-react';
import type { CaseOfDay } from '../types';

type CaseOfDayCardProps = {
  caseOfDay: CaseOfDay;
  onClose: () => void;
  isPremium: boolean;
  onNavigateToChat: (text: string) => void;
  onNavigateToPricing: () => void;
};

const sections = [
  { label: 'Case', Icon: FileText, accent: 'blue', chip: 'bg-sky-400/18 text-sky-100 border-sky-200/20' },
  { label: 'Answer', Icon: Brain, accent: 'amber', chip: 'bg-amber-300/18 text-amber-100 border-amber-200/25' },
  { label: 'Learn', Icon: BookOpen, accent: 'violet', chip: 'bg-violet-300/18 text-violet-100 border-violet-200/25' },
] as const;

const variants = {
  enter: (direction: number) => ({ x: direction > 0 ? 400 : -400, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 400 : -400, opacity: 0 }),
};

function highlightWords(text: string, accent: string) {
  const accentStyles: Record<string, { text: string; bg: string }> = {
    blue: { text: 'text-sky-50', bg: 'bg-sky-300/20 border border-sky-200/25' },
    amber: { text: 'text-amber-50', bg: 'bg-amber-300/20 border border-amber-200/25' },
    violet: { text: 'text-violet-50', bg: 'bg-violet-300/20 border border-violet-200/25' },
  };
  const style = accentStyles[accent] || accentStyles.blue;
  return text.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
    if (!part.startsWith('**') || !part.endsWith('**')) return part;
    return (
      <span
        key={`${part}-${index}`}
        className={`${style.text} ${style.bg} font-extrabold px-1.5 py-0.5 rounded-lg underline decoration-2 underline-offset-2`}
      >
        {part.slice(2, -2)}
      </span>
    );
  });
}

export function CaseOfDayCard({
  caseOfDay,
  onClose,
  isPremium,
  onNavigateToChat,
  onNavigateToPricing,
}: CaseOfDayCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentSection = sections[currentIndex];
  const CurrentIcon = currentSection.Icon;

  const handleLearnMore = () => {
    if (!isPremium) {
      onNavigateToPricing();
      return;
    }
    onNavigateToChat(`I have a question about this case:\n\n${caseOfDay.details}\n\nAnswer: ${caseOfDay.answer}`);
    onClose();
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldMoveNext = info.offset.x < -80 || info.velocity.x < -800;
    const shouldMovePrevious = info.offset.x > 80 || info.velocity.x > 800;
    if (shouldMoveNext && currentIndex < sections.length - 1) {
      setDirection(1);
      setCurrentIndex((index) => index + 1);
    } else if (shouldMovePrevious && currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((index) => index - 1);
    }
  };

  const content = currentIndex === 2 ? (
    <div className="space-y-4">
      <p className="text-white/82 text-[15px] leading-7 tracking-wide whitespace-pre-wrap">
        {highlightWords(caseOfDay.explanation, 'violet')}
      </p>
      <button type="button" onClick={handleLearnMore} className="w-full rounded-2xl bg-white text-slate-950 font-black py-3.5 px-4 shadow-xl shadow-black/20 active:scale-[0.98]">
        Learn more about this topic
        <span className="block text-xs font-semibold opacity-60">By Dr Ahroid</span>
      </button>
    </div>
  ) : highlightWords(currentIndex === 0 ? caseOfDay.details : caseOfDay.answer, currentSection.accent);

  return (
    <div className="relative overflow-hidden rounded-t-[2rem] border border-white/15 bg-slate-950/82 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] text-white shadow-2xl shadow-blue-950/40 backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(56,189,248,0.24),transparent_32%),radial-gradient(circle_at_88%_20%,rgba(168,85,247,0.20),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(15,23,42,0.76))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-200/20 bg-sky-300/15 backdrop-blur-xl">
            <Stethoscope className="h-5 w-5 text-sky-100" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-100/70">Case of the Day</p>
            <h3 className="text-lg font-black leading-tight text-white">{caseOfDay.headline || caseOfDay.case_name}</h3>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close case of the day" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={containerRef} className="relative z-10">
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${currentSection.chip}`}>
            <CurrentIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Section</p>
            <h3 className="text-lg font-black text-white">{currentSection.label}</h3>
          </div>
          <div className="ml-auto flex items-center gap-1.5" aria-hidden="true">
            {sections.map((section, index) => (
              <div key={section.label} className={`h-2 rounded-full transition-all duration-500 ${index === currentIndex ? 'w-6 bg-white' : index < currentIndex ? 'w-2 bg-white/50' : 'w-2 bg-white/25'}`} />
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            drag={currentIndex < sections.length - 1 ? 'x' : false}
            dragConstraints={containerRef}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
            className={`p-6 ${currentIndex === sections.length - 1 ? 'h-auto min-h-[280px]' : 'h-[280px]'} cursor-grab active:cursor-grabbing`}
            style={{ touchAction: 'pan-y' }}
          >
            <div className="h-full overflow-y-auto pr-2 scrollbar-thin">
              <div className="text-white/82 text-[15px] leading-7 tracking-wide">{content}</div>
            </div>
          </motion.div>
        </div>

        <div className="flex justify-center items-center gap-2 mt-4 pb-6" aria-hidden="true">
          {currentIndex > 0 && <div className="flex items-center gap-1 text-white/45"><ChevronLeft className="w-5 h-5" /><span className="text-xs">Previous</span></div>}
          {currentIndex > 0 && currentIndex < sections.length - 1 && <div className="w-px h-4 bg-white/20" />}
          {currentIndex < sections.length - 1 && <div className="flex items-center gap-1 text-white/45"><span className="text-xs">Next</span><ChevronRight className="w-5 h-5" /></div>}
        </div>
      </div>
    </div>
  );
}
