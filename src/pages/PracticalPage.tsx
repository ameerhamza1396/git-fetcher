import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronRight, 
  Search, 
  BookOpen, 
  LayoutGrid, 
  Sparkles,
  School,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Seo from '@/components/Seo';
import { StationRenderer } from '@/components/practical/StationRenderer';
import { Link } from 'react-router-dom';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { cn } from '@/lib/utils';

type ViewLevel = 'subjects' | 'stations' | 'detail';

const PracticalPage = () => {
  const { user } = useAuth();
  const [level, setLevel] = useState<ViewLevel>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch User Profile with Institute Code
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Handle both institute_code (potential array) and institute (fallback)
  const userInstitute = profile?.institute_code || profile?.institute;
  const hasInstitute = Array.isArray(userInstitute) ? userInstitute.length > 0 : !!userInstitute;

  // 2. Fetch Subjects Filtered by Institute
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['practical_subjects', userInstitute],
    queryFn: async () => {
      if (!hasInstitute) return [];
      
      let query = supabase.from('practical_subjects').select('*');
      
      // If userInstitute is an array, use overlaps. If string, use contains.
      if (Array.isArray(userInstitute)) {
        query = query.overlaps('institute_codes', userInstitute);
      } else {
        query = query.contains('institute_codes', [userInstitute]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: hasInstitute
  });

  // 3. Fetch Stations for selected subject
  const { data: stations, isLoading: stationsLoading } = useQuery({
    queryKey: ['osce_stations', selectedSubject?.id],
    queryFn: async () => {
      if (!selectedSubject?.id) return [];
      const { data, error } = await supabase
        .from('osce_stations')
        .select('*')
        .eq('subject_id', selectedSubject.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSubject?.id
  });

  // Derived Data: Distinct Tags for current stations
  const availableTags = useMemo(() => {
    if (!stations) return ['All'];
    const tags = new Set(stations.map(s => s.tag).filter(Boolean));
    return ['All', ...Array.from(tags)];
  }, [stations]);

  // Filtered Stations
  const filteredStations = useMemo(() => {
    if (!stations) return [];
    return stations.filter(s => {
      if (!s) return false;
      const matchesTag = selectedTag === 'All' || s.tag === selectedTag;
      const name = s.name || s.title || '';
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTag && matchesSearch;
    });
  }, [stations, selectedTag, searchQuery]);

  // Navigation Handlers
  const handleBack = () => {
    if (level === 'detail') {
      setLevel('stations');
      setSelectedStation(null);
    } else if (level === 'stations') {
      setLevel('subjects');
      setSelectedSubject(null);
      setSelectedTag('All');
    }
  };

  const handleSubjectClick = (subject: any) => {
    setSelectedSubject(subject);
    setLevel('stations');
  };

  const handleStationClick = (station: any) => {
    setSelectedStation(station);
    setLevel('detail');
  };

  if (profileLoading || subjectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading Medmacs Practicals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background overflow-x-hidden relative">
      <Seo 
        title="OSCE & Clinical Practicals" 
        description="Master your clinical rotations with Medmacs sparse-column OSCE stations and dynamic marking checklists." 
      />

      {/* Modern Gradient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[100px] animate-pulse-slow-reverse" />
        <div className="absolute center inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,184,166,0.05)_0%,transparent_70%)]" />
      </div>

      {/* Glass Navigation Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/40 backdrop-blur-xl border-b border-white/5 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <div className="flex items-center space-x-4">
            {level !== 'subjects' ? (
              <button 
                onClick={handleBack}
                className="p-2 hover:bg-white/10 rounded-full transition-colors group"
              >
                <ArrowLeft className="w-6 h-6 text-foreground group-active:scale-90 transition-transform" />
              </button>
            ) : (
              <Link to="/dashboard" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-foreground" />
              </Link>
            )}
            <div className="flex flex-col">
              <span className="text-xl font-black italic tracking-tighter text-foreground leading-none">
                MED<span className="text-primary text-shimmer">MACS</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Practical Portal</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <ProfileDropdown />
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-[calc(100px+env(safe-area-inset-top))] pb-20 max-w-7xl">
        
        {/* Render different levels */}
        <AnimatePresence mode="wait">
          
          {/* LEVEL 1: SUBJECT GRID */}
          {level === 'subjects' && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div className="space-y-3">
                  <Badge className="bg-primary/20 text-primary-foreground border-none hover:bg-primary/30 px-4 py-1.5 rounded-full font-bold uppercase tracking-wider text-[10px]">
                    Clinical Rotations
                  </Badge>
                  <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight leading-[0.9]">
                    Select <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Subject</span>
                  </h1>
                  <p className="text-muted-foreground font-medium max-w-md">
                    Access high-yield OSCE stations curated specifically for <strong>{Array.isArray(userInstitute) ? userInstitute.join(', ').toUpperCase() : userInstitute?.toUpperCase() || 'your institute'}</strong>.
                  </p>
                </div>
                {!hasInstitute && (
                    <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-sm font-medium flex items-center space-x-3 backdrop-blur-md">
                        <School className="w-5 h-5 shrink-0" />
                        <span>Content is still in the phase of rolling out for your academic year. Stay tuned.</span>
                    </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {subjects?.map((subject: any) => (
                  <motion.div
                    key={subject.id}
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSubjectClick(subject)}
                    className="cursor-pointer group"
                  >
                    <div className="relative h-64 rounded-[2.5rem] overflow-hidden glass-card border-white/10 group-hover:border-primary/50 transition-all duration-500 shadow-xl group-hover:shadow-primary/20 bg-gradient-to-br from-white/5 to-white/[0.02]">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                      
                      {/* Subject Visual Representative */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                         <ClipboardList className="w-32 h-32 text-primary" />
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-8 z-20 space-y-2">
                        <Badge className="bg-white/10 text-white border-white/10 backdrop-blur-md mb-2">
                            {subject.code || "MED"}
                        </Badge>
                        <h3 className="text-2xl font-black text-white leading-tight">
                          {subject.name}
                        </h3>
                        <p className="text-white/60 text-xs font-bold uppercase tracking-widest flex items-center">
                          View Stations <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* LEVEL 2: STATIONS LIST */}
          {level === 'stations' && (
            <motion.div
              key="stations"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Secondary Header */}
              <div className="flex flex-col space-y-6">
                <div className="space-y-2 px-2">
                    <button 
                        onClick={() => setLevel('subjects')}
                        className="text-primary font-bold text-xs uppercase tracking-widest flex items-center hover:underline"
                    >
                        <ArrowLeft className="w-3 h-3 mr-2" /> All Subjects
                    </button>
                   <h2 className="text-4xl font-black text-foreground italic flex items-center gap-4">
                     <span className="text-primary"><Sparkles className="w-8 h-8" /></span>
                     {selectedSubject?.name}
                   </h2>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center">
                   <div className="relative flex-1 w-full group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input 
                        placeholder="Search stations..." 
                        className="pl-12 h-14 rounded-2xl bg-white/5 border-white/10 focus:ring-primary focus:border-primary backdrop-blur-md border-2"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                   </div>
                   
                   <div className="flex overflow-x-auto w-full md:w-auto pb-2 md:pb-0 gap-2 scrollbar-hide no-scrollbar">
                      {availableTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className={cn(
                            "px-6 py-3 rounded-2xl text-sm font-black whitespace-nowrap transition-all border-2",
                            selectedTag === tag 
                              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105" 
                              : "bg-white/5 text-muted-foreground border-white/5 hover:border-white/20"
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                   </div>
                </div>
              </div>

              {/* Stations Grid/List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stationsLoading ? (
                    [1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)
                ) : filteredStations.length > 0 ? (
                  filteredStations.map((station: any) => (
                    <motion.div
                      key={station.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleStationClick(station)}
                      className="group cursor-pointer p-6 rounded-3xl glass-card border-white/5 hover:border-primary/30 transition-all flex items-center justify-between shadow-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:from-primary group-hover:to-accent transition-all">
                           <BookOpen className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-foreground group-hover:text-primary transition-colors">
                            {station.name || station.title || 'Untitled Station'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] py-0 border-white/10 text-muted-foreground uppercase font-black tracking-widest">
                                {station.tag || 'Clinical'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <p className="text-muted-foreground font-bold italic">No stations found matching your criteria.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* LEVEL 3: STATION DETAIL */}
          {level === 'detail' && selectedStation && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
            >
              <div className="mb-8 px-2">
                <button 
                  onClick={() => setLevel('stations')}
                  className="flex items-center text-muted-foreground hover:text-primary transition-colors font-bold text-sm uppercase tracking-widest"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to {selectedSubject?.name}
                </button>
              </div>
              
              <StationRenderer station={selectedStation} />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Floating Action Button for Support (Optional) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
            <LayoutGrid className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default PracticalPage;
