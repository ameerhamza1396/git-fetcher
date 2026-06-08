import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Crown,
  Instagram,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import Seo from '@/components/Seo';
import { useQuery } from '@tanstack/react-query';
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
};

type TeamCategory = 'core' | 'extended' | 'contributor' | 'special_thanks';

const sectionMeta = {
  core: {
    order: 1,
    eyebrow: 'Step 1 of 4',
    title: 'Core Team',
    description: 'The people building, operating, and polishing Medmacs for medical students.',
    icon: Crown,
  },
  extended: {
    order: 2,
    eyebrow: 'Step 2 of 4',
    title: 'Extended Team',
    description: 'Campus, content, and community collaborators helping the platform reach more learners.',
    icon: Users,
  },
  contributor: {
    order: 3,
    eyebrow: 'Step 3 of 4',
    title: 'Contributors',
    description: 'Helpful names behind feedback, ideas, and support across the Medmacs ecosystem.',
    icon: Sparkles,
  },
  special_thanks: {
    order: 4,
    eyebrow: 'Step 4 of 4',
    title: 'Special Thanks',
    description: 'People we are grateful to have had beside the project.',
    icon: Zap,
  },
};

const teamCategories: TeamCategory[] = ['core', 'extended', 'contributor', 'special_thanks'];

const fallbackMembers: TeamMember[] = [
  {
    name: 'Dr. Muhammad Ameer Hamza',
    role: 'Founder',
    category: 'core',
    image_url: '/team/founders/hamza.png',
    instagram_url: 'https://instagram.com/ameerhamza.exe',
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

const MemberCard = ({ member, index, compact = false }: { member: TeamMember; index: number; compact?: boolean }) => {
  const instagramUrl = getInstagramUrl(member);
  const isVacant = !member.name;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group relative overflow-hidden rounded-3xl border-2 border-border/40 bg-white/5 p-5 transition-all duration-300 hover:border-primary/30 hover:bg-primary/5 dark:bg-zinc-900/50"
    >
      <div className="absolute right-0 top-0 h-28 w-28 translate-x-10 -translate-y-10 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover:opacity-100" />
      <div className="relative z-10 flex items-center gap-4">
        <div className={`${compact ? 'h-14 w-14' : 'h-16 w-16'} ${isVacant ? 'pulse-ring glow-breathe bg-primary/10 p-2 ring-primary/30' : 'bg-muted/50 ring-border/50'} shrink-0 overflow-hidden rounded-2xl shadow-xl ring-1`}>
          <img
            src={getProfileImage(member)}
            alt={member.name || member.role || 'Open team position'}
            className={`${isVacant ? 'object-contain drop-shadow-lg' : 'object-cover'} h-full w-full transition-transform duration-300 group-hover:scale-110`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-black uppercase italic leading-tight tracking-tight text-foreground sm:text-lg">
            {member.name || 'Open Position'}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-muted-foreground">
            {member.role || 'Medmacs Collaborator'}
          </p>
        </div>

        {instagramUrl ? (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${member.name}'s Instagram`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95"
          >
            <Instagram className="h-4 w-4" />
          </a>
        ) : isVacant ? (
          <Link
            to="/summerinternship2025"
            aria-label="Apply for this team position"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </motion.div>
  );
};

const TeamSectionHeading = ({ category, fixed = false }: { category: TeamCategory; fixed?: boolean }) => {
  const meta = sectionMeta[category];
  const Icon = meta.icon;
  const [titleLead, ...titleRestParts] = meta.title.split(' ');
  const titleRest = titleRestParts.join(' ');

  return (
    <div
      className={`${fixed ? 'fixed left-0 right-0 top-0 z-50 pointer-events-none' : '-mx-3 sm:mx-0'} bg-background/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:px-0`}
      style={fixed ? { zIndex: 60 } : undefined}
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-0">
        <motion.div
          initial={fixed ? false : { opacity: 0, y: -12 }}
          whileInView={fixed ? undefined : { opacity: 1, y: 0 }}
          animate={fixed ? { opacity: 1, y: 0 } : undefined}
          viewport={fixed ? undefined : { once: true, margin: '-80px' }}
          className="overflow-hidden py-3 text-center"
        >
          <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.3em] text-primary">
            {meta.eyebrow}
          </span>
          <div className="flex items-center justify-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h2 className="text-3xl font-black uppercase italic leading-none tracking-tight text-foreground sm:text-5xl">
              {titleLead}{' '}
              {titleRest && <span className="live-gradient-text">{titleRest}</span>}
            </h2>
          </div>
          <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-muted-foreground">
            {meta.description}
          </p>
        </motion.div>
      </div>
      <div className="h-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
    </div>
  );
};

const MemberSection = ({
  category,
  members,
  compact = false,
}: {
  category: keyof typeof sectionMeta;
  members: TeamMember[];
  compact?: boolean;
}) => {
  if (!members.length) return null;

  return (
    <>
      <div
        data-team-section={category}
        className="team-section-marker"
      >
        <TeamSectionHeading category={category} />
      </div>

      <section className="mx-auto max-w-4xl px-4 sm:px-0">
        <div className={`grid grid-cols-1 gap-4 ${compact ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {members.map((member, index) => (
            <MemberCard key={member.id || `${category}-${member.name || member.role}-${index}`} member={member} index={index} compact={compact} />
          ))}
        </div>
      </section>
    </>
  );
};

const TeamSkeleton = () => (
  <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 px-4 sm:px-0 md:grid-cols-2">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="relative overflow-hidden rounded-3xl border border-border/40 bg-muted/20 p-5 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-1/2 rounded-full bg-muted" />
            <div className="h-3 w-2/3 rounded-full bg-muted" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const Teams = () => {
  const [activeHeading, setActiveHeading] = useState<TeamCategory | null>(null);
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

  const members = teamMembers.length ? teamMembers : fallbackMembers;
  const coreTeam = members.filter((member) => member.category === 'core');
  const extendedTeam = members.filter((member) => member.category === 'extended');
  const contributors = members.filter((member) => member.category === 'contributor');
  const specialThanks = members.filter((member) => member.category === 'special_thanks');

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    const getSafeTop = () => {
      const parsed = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--sat')
      );
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const updateActiveHeading = () => {
      if (root.scrollTop < 24) {
        setActiveHeading(null);
        return;
      }

      const safeTop = getSafeTop();
      const replacementTop = safeTop + 150;
      let active: TeamCategory | null = null;

      teamCategories.forEach((category) => {
        const marker = document.querySelector<HTMLElement>(`[data-team-section="${category}"]`);
        if (!marker) return;
        if (marker.getBoundingClientRect().top <= replacementTop) {
          active = category;
        }
      });

      setActiveHeading(active);
    };

    updateActiveHeading();
    root.addEventListener('scroll', updateActiveHeading, { passive: true });
    window.addEventListener('resize', updateActiveHeading);
    return () => {
      root.removeEventListener('scroll', updateActiveHeading);
      window.removeEventListener('resize', updateActiveHeading);
    };
  }, [isLoading, coreTeam.length, extendedTeam.length, contributors.length, specialThanks.length]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background bg-mesh text-foreground">
      <Seo
        title="Our Team - Medmacs"
        description="Meet the passionate team behind Medmacs App."
        canonical="https://www.medmacs.app/teams"
      />

      <main className="pb-20" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
        {activeHeading && <TeamSectionHeading category={activeHeading} fixed />}

        <div className="mb-6 text-center animate-fade-in">
          <h1 className="mb-3 text-2xl font-black uppercase italic tracking-tight text-foreground sm:text-3xl md:text-4xl">
            <BookOpen className="mr-2 inline h-7 w-7 text-primary" />
            Medmacs <span className="text-primary">Team</span>
          </h1>
          <p className="mx-auto max-w-2xl px-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            The medical minds, builders, and collaborators shaping the app
          </p>
        </div>

        <div className="space-y-12 pt-2">
          {isLoading ? (
            <TeamSkeleton />
          ) : (
            <>
              <MemberSection category="core" members={coreTeam} />
              <MemberSection category="extended" members={extendedTeam} />
              <MemberSection category="contributor" members={contributors} compact />
              <MemberSection category="special_thanks" members={specialThanks} compact />
            </>
          )}

          <section className="mx-auto max-w-4xl px-4 sm:px-0">
            <div className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-primary/5 p-6">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-primary/20 blur-[60px]" />
              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                    Collaborate
                  </span>
                  <h2 className="text-2xl font-black uppercase italic tracking-tight text-foreground">
                    Build With <span className="live-gradient-text">Medmacs</span>
                  </h2>
                  <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-muted-foreground">
                    Apply for open roles, campus collaborations, content support, or student-led initiatives.
                  </p>
                </div>
                <Link
                  to="/summerinternship2025"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-xs font-black uppercase tracking-[0.18em] text-primary-foreground shadow-2xl shadow-primary/30 transition-transform active:scale-95"
                >
                  Apply
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </div>

        <div className="pt-16 text-center opacity-40">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">© 2026 Medmacs App • All rights reserved</p>
        </div>
      </main>
    </div>
  );
};

export default Teams;
