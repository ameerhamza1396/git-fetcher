import { Link } from 'react-router-dom';
import { ArrowLeft, Instagram, Sun, Moon, Zap } from 'lucide-react';
import { useTheme } from 'next-themes';
import Seo from '@/components/Seo';
import { useEffect, useState } from 'react';
import { Typewriter } from 'react-simple-typewriter';
import { useAuth } from '@/hooks/useAuth';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Teams = () => {
  const { user } = useAuth();
  const [heroOpacity, setHeroOpacity] = useState(1);
  const [subheadingOpacity, setSubheadingOpacity] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.getElementById('hero-heading');
      const subheading = document.getElementById('hero-subheading');
      if (heroSection && subheading) {
        const scrollPosition = window.scrollY;
        const heroOffset = heroSection.offsetTop;
        const subheadingOffset = subheading.offsetTop;

        const heroFadeStart = heroOffset + 20;
        const heroFadeEnd = heroFadeStart + 100;
        const newHeroOpacity = 1 - (scrollPosition - heroFadeStart) / (heroFadeEnd - heroFadeStart);
        setHeroOpacity(Math.max(0, newHeroOpacity));

        const subheadingFadeStart = subheadingOffset + 20;
        const subheadingFadeEnd = subheadingFadeStart + 100;
        const newSubheadingOpacity = 1 - (scrollPosition - subheadingFadeStart) / (subheadingFadeEnd - subheadingFadeStart);
        setSubheadingOpacity(Math.max(0, newSubheadingOpacity));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Data from Supabase ---
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team_members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const coreTeam = teamMembers.filter(m => m.category === 'core');
  const extendedTeam = teamMembers.filter(m => m.category === 'extended');
  const contributors = teamMembers.filter(m => m.category === 'contributor');
  const specialThanks = teamMembers.filter(m => m.category === 'special_thanks');

  // --- Render Function ---

  return (
    <div className="min-h-screen w-full bg-background">
      <Seo
        title="Our Team - Medmacs"
        description="Meet the passionate team behind Medmacs — innovators, leaders, and contributors shaping the future of medical education."
        canonical="https://www.medmacs.app/teams"
      />

      {/* Header */}
      <header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <Link
            to="/"
            className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-300 dark:to-blue-400 animate-pulse">
            Meet Our Team
          </span>

          <div className="flex items-center space-x-3">
            {user ? <ProfileDropdown /> : <div className="w-9" />}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-16 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="relative">
            <h1
              id="hero-heading"
              style={{ opacity: heroOpacity }}
              className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-blue-500 to-pink-500 dark:from-purple-300 dark:via-blue-300 dark:to-pink-300 animate-fade-in sticky top-20 opacity-90 transition-opacity duration-700 z-10"
            >
              <Typewriter
                words={['The Medmacs Team']}
                loop={1}
                typeSpeed={80}
                deleteSpeed={50}
                delaySpeed={1000}
              />
            </h1>
          </div>
          <p
            id="hero-subheading"
            style={{ opacity: subheadingOpacity }}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-fade-in transition-opacity duration-700"
          >
            A collective of dreamers, innovators, and medical minds — working to
            reshape how students learn, connect, and succeed.
          </p>
        </div>

        {/* Founder Section */}
        <div className="text-center mb-24 animate-fade-in-up">
          <div className="relative inline-flex items-center group">
            <img
              src="https://i.postimg.cc/VLJk5HPk/Gemini-Generated-Image-r8zbqr8zbqr8zbqr.png"
              alt="Founder"
              className="w-40 h-40 rounded-full object-cover shadow-2xl border-4 border-primary/40 transition-all duration-500 group-hover:translate-x-[-80px]"
            />
            <div className="absolute left-0 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-[60px] transition-all duration-500 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full px-6 py-3 shadow-lg whitespace-nowrap">
              <p>UI/UX Designer</p>
              <p>Web Developer</p>
              <p>Mobile Application</p>
              <p>Database Manager</p>
              <p>AI Trainer</p>
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            Dr. Muhammad Ameer Hamza
          </h2>
          <p className="text-primary font-medium">Founder</p>
          <a
            href="https://instagram.com/ameerhamza.exe"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center text-primary hover:underline hover:scale-105 transition-transform"
          >
            <Instagram className="w-5 h-5 mr-2" /> ameerhamza.exe
          </a>
        </div>

        {/* Core Team */}
        <div className="mb-20 text-center">
          <h2 className="text-4xl font-bold text-primary mb-12">Core Team</h2>
          <div className="flex flex-wrap justify-center gap-12">
            {coreTeam.map((member, i) => (
              <div
                key={i}
                className="group text-center transform hover:scale-110 transition duration-500 flex flex-col items-center"
              >
                <img
                  src={member.image_url || '/teampage/user.png'}
                  alt={member.name || 'Vacant'}
                  className="w-32 h-32 rounded-full mx-auto object-cover shadow-lg group-hover:shadow-purple-400/50 transition-shadow"
                />
                
                {member.name ? (
                  <>
                    <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                      {member.name}
                    </h3>
                    <p className="text-purple-600 dark:text-purple-400">
                      {member.role}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-4 text-purple-600 dark:text-purple-400 font-medium">
                      {member.role}
                    </p>
                    <Link
                      to="/summerinternship2025"
                      className="mt-2 text-xs font-bold px-4 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      Apply for Position
                    </Link>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Extended Team */}
        <div className="mb-20 text-center">
          <h2 className="text-4xl font-bold text-primary mb-12">Extended Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
            {extendedTeam.map((member, i) => (
              <div
                key={i}
                className="group text-center hover:scale-110 transition-transform duration-500 flex flex-col items-center"
              >
                <img
                  src={member.image_url || '/teampage/user.png'}
                  alt={member.name || 'Vacant'}
                  className="w-28 h-28 rounded-full mx-auto object-cover shadow-lg group-hover:shadow-blue-400/50 transition-shadow"
                />
                
                {member.name ? (
                  <>
                    <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                      {member.name}
                    </h3>
                    <p className="text-blue-600 dark:text-blue-400">{member.role}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-medium">{member.role}</p>
                    <Link
                      to="/summerinternship2025"
                      className="mt-2 text-[10px] font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
                    >
                      Apply for Position
                    </Link>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Collaboration Request Button */}
        <div className="text-center my-16">
          <Link
            to="/summerinternship2025"
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-xl text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 dark:from-pink-400 dark:to-purple-500 dark:hover:from-pink-500 dark:hover:to-purple-600 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800"
          >
            <Zap className="w-5 h-5 mr-2" />
            Request to Become a Collaborator
          </Link>
        </div>

        {/* Contributors */}
        {contributors.length > 0 && (
          <div className="mb-20 text-center">
            <h2 className="text-4xl font-bold text-primary mb-10">Contributors</h2>
            <div className="flex flex-wrap justify-center gap-6">
              {contributors.map((contrib, i) => (
                <span
                  key={i}
                  className="px-4 py-2 text-foreground rounded-full bg-accent shadow hover:shadow-lg hover:scale-105 transition-all text-sm font-medium"
                >
                  {contrib.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Special Thanks */}
        {specialThanks.length > 0 && (
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-500 mb-6">
              Special Thanks To
            </h2>
            {specialThanks.map((thanks, i) => (
              <p key={i} className="text-lg text-gray-700 dark:text-gray-300 font-medium mb-2">
                {thanks.name}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-6 text-center text-muted-foreground">
        <div className="container mx-auto px-4 lg:px-8">
          <p className="text-sm font-semibold mb-1">A Project by Hmacs Studios.</p>
          <p className="text-xs">&copy; 2025 Hmacs Studios. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Teams;