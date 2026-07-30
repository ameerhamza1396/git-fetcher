import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Crown,
  Instagram,
  Sparkles,
  UserRound,
  Users,
  Zap,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Seo from '@/components/Seo';
import { supabase } from '@/integrations/supabase/client';

type TeamMember = {
  id?: string;
  name?: string | null;
  role?: string | null;
  category?: string | null;
  image_url?: string | null;
  order_index?: number | null;
  instagram_url?: string | null;
  instagram?: string | null;
  icon?: string | null;
  category_icon?: string | null;
  react_icon?: string | null;
};

type TeamCategory = string;

type TeamCategoryMeta = {
  id: TeamCategory;
  label: string;
  title: string;
  description: string;
  icon: typeof Crown;
};

const defaultCategories: TeamCategoryMeta[] = [
  {
    id: 'core',
    label: 'Core',
    title: 'Core Team',
    description: 'The people responsible for product, platform, and direction.',
    icon: Crown,
  },
  {
    id: 'extended',
    label: 'Extended',
    title: 'Extended Team',
    description: 'Campus, content, and community collaborators expanding Medmacs.',
    icon: Users,
  },
  {
    id: 'campus_representatives',
    label: 'Campus',
    title: 'Campus Representatives',
    description: 'Student representatives helping Medmacs stay connected across medical campuses.',
    icon: Users,
  },
  {
    id: 'contributor',
    label: 'Contributors',
    title: 'Contributors',
    description: 'People helping through feedback, content, testing, and ideas.',
    icon: Sparkles,
  },
  {
    id: 'special_thanks',
    label: 'Thanks',
    title: 'Special Thanks',
    description: 'People we are grateful to have had beside the project.',
    icon: Zap,
  },
];

const iconMap: Record<string, typeof Crown> = {
  bookopen: BookOpen,
  book: BookOpen,
  core: Crown,
  crown: Crown,
  extended: Users,
  campus: Users,
  campusrepresentatives: Users,
  campus_representatives: Users,
  users: Users,
  contributor: Sparkles,
  contributors: Sparkles,
  sparkles: Sparkles,
  special_thanks: Zap,
  thanks: Zap,
  zap: Zap,
};

const titleizeCategory = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeIconKey = (value?: string | null) =>
  String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

const formatCount = (value: number) =>
  new Intl.NumberFormat('en-US', { notation: value >= 10000 ? 'compact' : 'standard' }).format(value);

const useCountUp = (value: number, duration = 700) => {
  const [displayValue, setDisplayValue] = useState(value);
  const displayValueRef = useRef(value);

  useEffect(() => {
    let frameId = 0;
    const startValue = displayValueRef.current;
    const difference = value - startValue;
    const startedAt = performance.now();

    if (!difference) {
      displayValueRef.current = value;
      setDisplayValue(value);
      return undefined;
    }

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + difference * eased);
      displayValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [duration, value]);

  return displayValue;
};

const StatValue = ({ value, isLoading }: { value: number; isLoading: boolean }) => {
  const animatedValue = useCountUp(value);

  if (isLoading) {
    return <span className="block h-6 w-16 animate-pulse rounded-full bg-primary/20" />;
  }

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.55, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      {formatCount(animatedValue)}
    </motion.span>
  );
};

const GlimpseCard = ({
  value,
  label,
  isCompact,
  isPrimary = false,
  children,
}: {
  value?: string;
  label: string;
  isCompact: boolean;
  isPrimary?: boolean;
  children?: React.ReactNode;
}) => (
  <motion.div
    layout
    animate={{
      scale: isCompact ? 0.96 : 1,
      y: isCompact ? -2 : 0,
    }}
    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
    className={`overflow-hidden border backdrop-blur-xl transition-colors ${
      isCompact ? 'rounded-full px-3 py-2' : 'rounded-2xl p-3'
    } ${
      isPrimary
        ? 'border-primary/15 bg-primary/10 text-primary'
        : 'border-border/60 bg-muted/70 text-foreground'
    }`}
  >
    <div className={`flex ${isCompact ? 'items-center gap-2' : 'flex-col'}`}>
      <span className={`shrink-0 rounded-full ${isCompact ? 'h-2 w-2' : 'mb-2 h-1.5 w-6'} ${isPrimary ? 'bg-primary' : 'bg-muted-foreground/45'}`} />
      <p className={`font-black leading-none ${isCompact ? 'text-sm' : 'text-lg'}`}>
        {children || value}
      </p>
    </div>
    <motion.p
      animate={{
        opacity: isCompact ? 0 : 1,
        height: isCompact ? 0 : 'auto',
        marginTop: isCompact ? 0 : 4,
      }}
      transition={{ duration: 0.18 }}
      className={`overflow-hidden text-[10px] font-bold uppercase ${
        isPrimary ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      {label}
    </motion.p>
  </motion.div>
);

const fallbackMembers: TeamMember[] = [
  {
    name: 'Dr. Muhammad Ameer Hamza',
    role: 'Founder',
    category: 'core',
    image_url: '/team/founders/hamza.png',
    instagram_url: 'https://instagram.com/ameerhamza.exe',
  },
  {
    name: 'Dua Ahmed',
    role: 'Campus Ambassador - DMC',
    category: 'campus_representatives',
  },
  {
    name: 'Faiqa Ahmed',
    role: 'Campus Ambassador - JSMU',
    category: 'campus_representatives',
  },
];

const medmacsLogo = '/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png';

const getProfileImage = (member: TeamMember) => {
  if (member.image_url) return member.image_url;
  return member.name ? '/teampage/user.png' : medmacsLogo;
};

const getInstagramUrl = (member: TeamMember) => {
  const raw = member.instagram_url || member.instagram;
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  return `https://instagram.com/${raw.replace('@', '')}`;
};

const cardEasing = [0.22, 1, 0.36, 1] as const;

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: Math.min(index * 0.045, 0.28),
      duration: 0.36,
      ease: cardEasing,
    },
  }),
};

const TeamMemberCard = ({ member, index }: { member: TeamMember; index: number }) => {
  const instagramUrl = getInstagramUrl(member);
  const isVacant = !member.name;

  return (
    <motion.article
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      whileTap={{ scale: 0.985 }}
      className="overflow-hidden rounded-3xl border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-xl transition-colors active:bg-muted/70"
    >
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-muted">
          <img
            src={getProfileImage(member)}
            alt={member.name || member.role || 'Open team position'}
            className={`${isVacant ? 'object-contain p-2' : 'object-cover'} h-full w-full`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-black leading-tight text-foreground">
            {member.name || 'Open Position'}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-primary">
            {member.role || 'Medmacs Collaborator'}
          </p>
        </div>

        {instagramUrl ? (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${member.name || 'team member'} on Instagram`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors active:bg-primary active:text-primary-foreground"
          >
            <Instagram className="h-5 w-5" />
          </a>
        ) : isVacant ? (
          <a
            href="https://medmacs.app/collaborate"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Apply for this team position"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors active:bg-primary active:text-primary-foreground"
          >
            <ArrowRight className="h-5 w-5" />
          </a>
        ) : null}
      </div>
    </motion.article>
  );
};

const TeamSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, index) => (
      <div
        key={index}
        className="flex animate-pulse items-center gap-4 rounded-3xl border border-border/70 bg-card/80 p-4"
      >
        <div className="h-16 w-16 rounded-2xl bg-muted" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-3/5 rounded-full bg-muted" />
          <div className="h-3 w-2/5 rounded-full bg-muted" />
        </div>
        <div className="h-11 w-11 rounded-2xl bg-muted" />
      </div>
    ))}
  </div>
);

const Teams = () => {
  const [activeCategory, setActiveCategory] = useState<TeamCategory>('core');
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [drAhroidMessageCount, setDrAhroidMessageCount] = useState(0);
  const { data: teamMembers = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['team_members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: totalStudents = 0, isLoading: isStudentsLoading } = useQuery({
    queryKey: ['team-total-students'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      if (error) {
        console.warn('Unable to load total student count', error);
        return 0;
      }
      return count || 0;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  const { data: totalDrAhroidMessages = 0, isLoading: isDrAhroidMessagesLoading } = useQuery({
    queryKey: ['team-total-dr-ahroid-messages'],
    queryFn: async () => {
      const { count, error } = await (supabase
        .from('ai_usage_events') as any)
        .select('id', { count: 'exact', head: true });
      if (error) {
        console.warn('Unable to load Dr Ahroid message count', error);
        return 0;
      }
      return count || 0;
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  const members = teamMembers.length ? teamMembers : fallbackMembers;
  const categories = useMemo<TeamCategoryMeta[]>(() => {
    const knownCategories = new Map(defaultCategories.map((category) => [category.id, category]));

    members.forEach((member) => {
      const rawCategory = (member.category || 'core') as TeamCategory;
      const iconKey = normalizeIconKey(member.category_icon || member.react_icon || member.icon || rawCategory);
      const Icon = iconMap[iconKey] || iconMap[normalizeIconKey(rawCategory)] || Sparkles;

      if (!knownCategories.has(rawCategory)) {
        knownCategories.set(rawCategory, {
          id: rawCategory,
          label: titleizeCategory(rawCategory).split(' ')[0] || 'Team',
          title: titleizeCategory(rawCategory),
          description: 'A growing Medmacs team section.',
          icon: Icon,
        });
        return;
      }

      const existing = knownCategories.get(rawCategory);
      if (existing && (member.category_icon || member.react_icon || member.icon)) {
        knownCategories.set(rawCategory, { ...existing, icon: Icon });
      }
    });

    return Array.from(knownCategories.values()).filter((category) =>
      members.some((member) => (member.category || 'core') === category.id)
    );
  }, [members]);

  const groupedMembers = useMemo(() => {
    return categories.reduce<Record<string, TeamMember[]>>((acc, category) => {
      acc[category.id] = members.filter((member) => (member.category || 'core') === category.id);
      return acc;
    }, {});
  }, [categories, members]);

  useEffect(() => {
    if (categories.length && !categories.some((category) => category.id === activeCategory)) {
      setActiveCategory(categories[0].id);
    }
  }, [activeCategory, categories]);

  useEffect(() => {
    setStudentCount(totalStudents);
  }, [totalStudents]);

  useEffect(() => {
    setDrAhroidMessageCount(totalDrAhroidMessages);
  }, [totalDrAhroidMessages]);

  const activeMeta = categories.find((category) => category.id === activeCategory) || categories[0] || defaultCategories[0];
  const ActiveIcon = activeMeta.icon;
  const activeMembers = groupedMembers[activeMeta.id] || [];
  const handlePageScroll = (event: React.UIEvent<HTMLElement>) => {
    const nextIsCompact = event.currentTarget.scrollTop > 42;
    setIsHeaderCompact((current) => (current === nextIsCompact ? current : nextIsCompact));
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-background text-foreground">
      <Seo
        title="Our Team - Medmacs"
        description="Meet the people building and supporting Medmacs App."
        canonical="https://www.medmacs.app/teams"
      />

      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-90" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-primary/10 to-transparent dark:from-primary/15" />

      <motion.header
        animate={{
          paddingTop: isHeaderCompact ? 'calc(env(safe-area-inset-top,0px) + 8px)' : 'calc(env(safe-area-inset-top,0px) + 10px)',
        }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className={`absolute inset-x-0 top-0 z-30 px-4 pb-3 backdrop-blur-2xl transition-colors duration-300 ${
          isHeaderCompact
            ? 'border-b border-transparent bg-transparent'
            : 'border-b border-border/60 bg-background/88'
        }`}
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className={`mx-auto flex items-center justify-between gap-3 ${
            isHeaderCompact
              ? 'w-fit rounded-full border border-border/70 bg-background/78 px-2 py-1 shadow-lg shadow-black/5 backdrop-blur-2xl dark:bg-white/10'
              : 'max-w-xl'
          }`}
        >
          <Link
            to="/dashboard"
            aria-label="Back to dashboard"
            className={`flex shrink-0 items-center justify-center bg-muted text-foreground transition active:scale-95 active:bg-primary active:text-primary-foreground ${
              isHeaderCompact ? 'h-9 w-9 rounded-full' : 'h-11 w-11 rounded-2xl'
            }`}
          >
            <ArrowLeft className={isHeaderCompact ? 'h-4 w-4' : 'h-5 w-5'} />
          </Link>

          <motion.div layout className="min-w-0 text-center">
            {isHeaderCompact ? (
              <div className="flex items-center gap-1.5 px-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="h-2 w-2 rounded-full bg-primary/55" />
                <span className="h-2 w-2 rounded-full bg-primary/25" />
              </div>
            ) : (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Medmacs</p>
                <h1 className="truncate text-lg font-black tracking-tight">Our Team</h1>
              </>
            )}
          </motion.div>

          <div
            className={`flex shrink-0 items-center justify-center bg-primary/10 text-primary transition-all ${
              isHeaderCompact ? 'h-9 w-9 rounded-full' : 'h-11 w-11 rounded-2xl'
            }`}
          >
            <UserRound className={isHeaderCompact ? 'h-4 w-4' : 'h-5 w-5'} />
          </div>
        </motion.div>
      </motion.header>

      <main
        onScroll={handlePageScroll}
        className="relative z-10 h-full overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+28px)] pt-[calc(env(safe-area-inset-top,0px)+84px)]"
      >
        <div className="mx-auto max-w-xl">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[2rem] border border-border/70 bg-card/82 p-5 shadow-sm backdrop-blur-xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-primary/10">
                <img src={medmacsLogo} alt="Medmacs" className="h-12 w-12 object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">People behind the platform</p>
                <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight">
                  Built by medical minds and student collaborators.
                </h2>
              </div>
            </div>

            <motion.div
              layout
              className={`mt-5 grid gap-2 transition-all duration-300 ${
                isHeaderCompact ? 'grid-cols-4' : 'grid-cols-2'
              }`}
            >
              <GlimpseCard value="June 2025" label="Founded" isCompact={isHeaderCompact} />
              <GlimpseCard value="#1" label="MBBS Platform PK" isCompact={isHeaderCompact} />
              <GlimpseCard label="Total Students" isCompact={isHeaderCompact} isPrimary>
                <StatValue value={studentCount} isLoading={isStudentsLoading} />
              </GlimpseCard>
              <GlimpseCard label="Dr Ahroid Messages" isCompact={isHeaderCompact} isPrimary>
                <StatValue value={drAhroidMessageCount} isLoading={isDrAhroidMessagesLoading} />
              </GlimpseCard>
            </motion.div>
          </motion.section>

          <div className="sticky top-0 z-20 -mx-4 mt-4 border-y border-border/60 bg-background/88 px-4 py-3 backdrop-blur-2xl">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {categories.map((category) => {
                const isActive = category.id === activeCategory;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className={`relative flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-black uppercase tracking-wide backdrop-blur-xl transition active:scale-95 ${
                      isActive
                        ? 'border-primary/30 bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
                        : 'border-border/70 bg-background/55 text-muted-foreground shadow-sm dark:bg-white/10'
                    }`}
                  >
                    {category.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] backdrop-blur ${isActive ? 'bg-white/20' : 'bg-muted/80 dark:bg-black/20'}`}>
                      {groupedMembers[category.id].length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <motion.section
            key={activeCategory}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ActiveIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">{activeMeta.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{activeMeta.description}</p>
              </div>
            </div>

            {isLoading ? (
              <TeamSkeleton />
            ) : activeMembers.length ? (
              <div className="space-y-3">
                {activeMembers.map((member, index) => (
                  <TeamMemberCard
                    key={member.id || `${activeCategory}-${member.name || member.role}-${index}`}
                    member={member}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-dashed border-border bg-card/70 p-6 text-center"
              >
                <Sparkles className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-3 font-black">No members listed yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">This team section is being updated.</p>
              </motion.div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: -42 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.65 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="mt-[18vh] rounded-[2rem] border border-primary/20 bg-primary/8 p-5"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Collaborate</p>
            <h2 className="mt-2 text-xl font-black tracking-tight">Want to build with Medmacs?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Apply for campus collaborations, content support, open roles, or student-led initiatives.
            </p>
            <a
              href="https://medmacs.app/collaborate"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              Apply Now
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.section>

          <p className="pb-2 pt-8 text-center text-[10px] text-muted-foreground">
            © 2026 Hmacs Studios. All rights reserved
          </p>
        </div>
      </main>
    </div>
  );
};

export default Teams;
