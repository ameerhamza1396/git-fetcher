import { useMemo } from 'react';
import { Link } from 'react-router-dom';
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

const TeamMemberRow = ({ member }: { member: TeamMember }) => {
  const instagramUrl = getInstagramUrl(member);
  const isVacant = !member.name;

  return (
    <div className="group relative flex items-center justify-between gap-4 p-4 transition-colors duration-200 hover:bg-primary/5">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/50 shadow-sm transition-transform duration-300 group-hover:scale-105">
          <img
            src={getProfileImage(member)}
            alt={member.name || member.role || 'Open team position'}
            className={`${isVacant ? 'object-contain p-1.5' : 'object-cover'} h-full w-full`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black uppercase italic tracking-normal leading-snug text-foreground group-hover:text-primary transition-colors truncate">
            {member.name || 'Open Position'}
          </h3>
          <p className="text-muted-foreground text-[11px] font-medium leading-relaxed truncate">
            {member.role || 'Medmacs Collaborator'}
          </p>
        </div>
      </div>

      {instagramUrl ? (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${member.name || 'team member'} on Instagram`}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/55 text-foreground/70 transition-all hover:bg-primary hover:text-white"
        >
          <Instagram className="w-4 h-4" />
        </a>
      ) : isVacant ? (
        <a
          href="https://medmacs.app/collaborate"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Apply for this team position"
          className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/55 text-foreground/70 transition-all hover:bg-primary hover:text-white"
        >
          <ArrowRight className="w-4 h-4" />
        </a>
      ) : null}
    </div>
  );
};

const TeamSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {Array.from({ length: 2 }).map((_, catIndex) => (
      <div key={catIndex} className="space-y-4">
        <div className="h-6 w-1/4 bg-muted rounded-full" />
        <div className="overflow-hidden rounded-3xl border-2 border-border/40 bg-white/5 dark:bg-white/[0.035] divide-y divide-border/40">
          {Array.from({ length: 3 }).map((_, itemIndex) => (
            <div key={itemIndex} className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-muted rounded-full" />
                <div className="h-3 w-1/2 bg-muted rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const Teams = () => {
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

  return (
    <div className="fixed inset-0 overflow-hidden bg-background text-foreground">
      <Seo
        title="Our Team - Medmacs"
        description="Meet the people building and supporting Medmacs App."
        canonical="https://www.medmacs.app/teams"
      />

      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-90" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-primary/10 to-transparent dark:from-primary/15" />

      <header className="absolute inset-x-0 top-0 z-30 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+10px)] backdrop-blur-2xl border-b border-border/60 bg-background/88">
        <div className="mx-auto flex items-center justify-between gap-3 max-w-4xl">
          <Link
            to="/dashboard"
            aria-label="Back to dashboard"
            className="flex shrink-0 items-center justify-center bg-muted text-foreground transition active:scale-95 active:bg-primary active:text-primary-foreground h-11 w-11 rounded-2xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="min-w-0 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Medmacs</p>
            <h1 className="truncate text-lg font-black tracking-tight">Our Team</h1>
          </div>

          <div className="flex shrink-0 items-center justify-center bg-primary/10 text-primary h-11 w-11 rounded-2xl">
            <UserRound className="h-5 w-5" />
          </div>
        </div>
      </header>

      <main className="relative z-10 h-full overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+48px)] pt-[calc(env(safe-area-inset-top,0px)+96px)]">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-8 px-4">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3 block">Medmacs Crew</span>
            <h2 className="px-1 text-3xl sm:text-5xl font-black tracking-normal text-foreground uppercase italic leading-[1.08] text-center">
              Meet <span className="live-gradient-text">Our Team&nbsp;</span>
            </h2>
            <p className="text-muted-foreground text-sm font-medium mt-3 max-w-lg mx-auto text-center">
              Choose to build, collaborate, or explore the campus representatives expanding Medmacs.
            </p>
          </div>

          {isLoading ? (
            <TeamSkeleton />
          ) : (
            <div className="space-y-10">
              {categories.map((category) => {
                const activeMembers = groupedMembers[category.id] || [];
                if (!activeMembers.length) return null;
                const ActiveIcon = category.icon || Sparkles;

                return (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ActiveIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase italic tracking-wider text-foreground">{category.title}</h3>
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border-2 border-border/40 bg-white/5 dark:bg-white/[0.035] backdrop-blur-xl divide-y divide-border/40 shadow-sm">
                      {activeMembers.map((member) => (
                        <TeamMemberRow
                          key={member.id || `${category.id}-${member.name || member.role}`}
                          member={member}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <section className="mt-20 rounded-[2rem] border border-primary/20 bg-primary/5 p-6 text-center max-w-xl mx-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Collaborate</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight uppercase italic">Want to build with Medmacs?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Apply for campus collaborations, content support, open roles, or student-led initiatives.
            </p>
            <a
              href="https://medmacs.app/collaborate"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Apply Now
              <ArrowRight className="h-4 w-4" />
            </a>
          </section>

          <p className="pb-4 pt-12 text-center text-[10px] text-muted-foreground tracking-widest">
            © 2026 Medmacs App • All rights reserved
          </p>
        </div>
      </main>
    </div>
  );
};

export default Teams;
