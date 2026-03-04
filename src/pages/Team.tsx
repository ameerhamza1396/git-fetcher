import { Link } from 'react-router-dom';
import { ArrowLeft, Instagram } from 'lucide-react';
import Seo from '@/components/Seo';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { useAuth } from '@/hooks/useAuth';

import { Typewriter } from 'react-simple-typewriter';

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

  return (
    <div className="min-h-screen w-full bg-background">
      <Seo
        title="Our Teams"
        description="Meet the passionate team behind Medmacs — innovators, leaders, and contributors shaping the future of medical education."
        canonical="https://www.medmacs.app/teams"
      />

      {/* Header - themed */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <Link to={user ? "/dashboard" : "/"}>
            <Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:scale-110">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="text-xl font-bold text-foreground">Meet Our Team</span>
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
              className="text-5xl md:text-7xl font-extrabold text-primary animate-fade-in sticky top-20 transition-opacity duration-700 z-10 pt-[calc(45px+env(safe-area-inset-top))] overscroll-y-contain"
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
            {[
              { name: 'Saba Yaqoob', role: 'Academics Head', img: '/teampage/female.png' },
              { name: 'Muhammad Junaid Imran', role: 'Marketing Head', img: '/teampage/male.png' },
            ].map((member, i) => (
              <div key={i} className="group text-center transform hover:scale-110 transition duration-500">
                <img src={member.img} alt={member.name} className="w-32 h-32 rounded-full mx-auto object-cover shadow-lg group-hover:shadow-primary/30 transition-shadow" />
                <h3 className="mt-4 text-xl font-semibold text-foreground">{member.name}</h3>
                <p className="text-primary">{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Extended Team */}
        <div className="mb-20 text-center">
          <h2 className="text-4xl font-bold text-primary mb-12">Extended Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { name: 'Manhil Mushtaq', role: 'Social Media Head', img: '/teampage/female.png' },
              { name: 'Hira Khan', role: 'Graphics Head', img: '/teampage/female.png' },
              { name: 'Tooba Soomro', role: 'Content Head', img: '/teampage/female.png' },
              { name: 'Arshia Janjua', role: 'HR Head', img: '/teampage/female.png' },
            ].map((member, i) => (
              <div key={i} className="group text-center hover:scale-110 transition-transform duration-500">
                <img src={member.img} alt={member.name} className="w-28 h-28 rounded-full mx-auto object-cover shadow-lg group-hover:shadow-primary/30 transition-shadow" />
                <h3 className="mt-3 text-lg font-semibold text-foreground">{member.name}</h3>
                <p className="text-primary">{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contributors */}
        <div className="mb-20 text-center">
          <h2 className="text-4xl font-bold text-primary mb-10">Contributors</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              'Muhammad Muzammil (Batch 11 SMBBMC)',
              'Muhammad Irfan (Batch 11 SMBBMC)',
              'Abdul Hadi Ansari (Batch 12 SMBBMC)',
              'Hammad Faridi (Batch 12 SMBBMC)',
              'Manhil Mushtaq (Batch 13 SMBBMC)',
              'Hira Khan (Batch 14 SMBBMC)',
              'Tania Ratani (Batch 15 SMBBMC)',
            ].map((contrib, i) => (
              <span
                key={i}
                className="px-4 py-2 text-foreground rounded-full bg-accent shadow hover:shadow-lg hover:scale-105 transition-all"
              >
                {contrib}
              </span>
            ))}
          </div>
        </div>

        {/* Special Thanks */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-primary mb-6">Special Thanks To</h2>
          <p className="text-lg text-muted-foreground">✨ Dr Rahima Shakir</p>
          <p className="text-lg text-muted-foreground">✨ Hafiz Abdul Ahad</p>
        </div>
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
