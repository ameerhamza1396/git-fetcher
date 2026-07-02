import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Sparkles, User, Building2, GraduationCap, CheckCircle2, Loader2, Gift, HeartHandshake, Moon, Sun, Search, SlidersHorizontal, X
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { fetchInstitutes, getInstituteByCode, isSpecializedTestInstitute, type Institute } from '@/utils/institutes';
import { generateUniqueReferralCode, resolveReferralCode } from '@/utils/referral';
import { notifyAchievementProgress } from '@/components/profile/AchievementBadges';

const VALID_YEARS = ['1st', '2nd', '3rd', '4th', '5th'];
type SetupSelectionCategory = 'institute' | 'specialized_test';
type SetupThemeChoice = 'light' | 'dark';
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
type OwnershipFilter = 'all' | 'public' | 'private';

const getInstituteProvince = (inst: Institute) => {
  const value = (inst.province || inst.region || '').trim();
  return value || 'Other';
};

const getInstituteOwnership = (inst: Institute): 'public' | 'private' | 'unknown' => {
  if (typeof inst.is_public === 'boolean') return inst.is_public ? 'public' : 'private';
  const value = String(inst.ownership || inst.sector || inst.institute_type || inst.type || '').toLowerCase();
  if (value.includes('private')) return 'private';
  if (value.includes('public') || value.includes('government') || value.includes('govt')) return 'public';
  return 'unknown';
};

const formatOwnership = (ownership: ReturnType<typeof getInstituteOwnership>) => {
  if (ownership === 'public') return 'Public';
  if (ownership === 'private') return 'Private';
  return 'Unspecified';
};

const SetupWizard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [selectionCategory, setSelectionCategory] = useState<SetupSelectionCategory>('institute');

  const [username, setUsername] = useState('');
  const [institute, setInstitute] = useState('');
  const [year, setYear] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [setupLoadError, setSetupLoadError] = useState('');
  const [referredByName, setReferredByName] = useState<string | null>(null);
  const [referralStepCode, setReferralStepCode] = useState('');
  const [setupTheme, setSetupTheme] = useState<SetupThemeChoice>('dark');
  const [studySearchExpanded, setStudySearchExpanded] = useState(false);
  const [studyFiltersExpanded, setStudyFiltersExpanded] = useState(false);
  const [studySearch, setStudySearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');

  useEffect(() => {
    if (resolvedTheme === 'light' || resolvedTheme === 'dark') {
      setSetupTheme(resolvedTheme);
    }
  }, [resolvedTheme]);

  const chooseSetupTheme = (theme: SetupThemeChoice) => {
    setSetupTheme(theme);
    setTheme(theme);
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

    const root = document.getElementById('root');
    const previousHtmlBackground = document.documentElement.style.backgroundColor;
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousRootBackground = root?.style.backgroundColor;
    const fallbackColor = setupTheme === 'dark' ? '#000000' : '#f8fafc';

    document.documentElement.style.backgroundColor = fallbackColor;
    document.body.style.backgroundColor = fallbackColor;
    if (root) root.style.backgroundColor = fallbackColor;

    const applyNativeBars = async () => {
      try {
        await StatusBar.setStyle({ style: setupTheme === 'dark' ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({ color: 'transparent' });

        if ((NavigationBar as any).setNavigationBarColor) {
          await (NavigationBar as any).setNavigationBarColor({ color: 'transparent', darkButtons: setupTheme === 'light' });
        } else {
          await (NavigationBar as any).set?.({ color: fallbackColor, darkButtons: setupTheme === 'light' });
          await (NavigationBar as any).setBackgroundColor?.({ color: fallbackColor });
          await (NavigationBar as any).setButtonsColor?.({ dark: setupTheme === 'light' });
        }
      } catch (error) {
        console.warn('Failed to sync setup page native bars', error);
      }
    };

    applyNativeBars();

    return () => {
      document.documentElement.style.backgroundColor = previousHtmlBackground;
      document.body.style.backgroundColor = previousBodyBackground;
      if (root && previousRootBackground !== undefined) root.style.backgroundColor = previousRootBackground;
    };
  }, [setupTheme]);

  const ensureProfile = useCallback(async () => {
    if (!user?.id) throw new Error('User not authenticated.');

    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      if (!existing.referral_code) {
        const code = await generateUniqueReferralCode();
        await supabase.from('profiles').update({ referral_code: code }).eq('id', user.id);
        existing.referral_code = code;
      }
      return existing;
    }

    const referralCode = await generateUniqueReferralCode();
    let referredBy: string | null = null;
    const metaReferralCode = user.user_metadata?.referral_code as string | undefined;
    if (metaReferralCode) {
      referredBy = await resolveReferralCode(metaReferralCode);
    }

    const profileSeed = {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      referral_code: referralCode,
      referred_by: referredBy,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert(profileSeed as any)
      .select('*')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        const { data: raceProfile, error: raceFetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (raceFetchError) throw raceFetchError;
        return raceProfile;
      }

      throw error;
    }

    if (data && referredBy) {
      notifyAchievementProgress('referral');
    }

    return data;
  }, [user]);

  const getInitialStep = useCallback((profile: any, instituteRows: Institute[]) => {
    const hasUsername = !!profile?.username;
    const hasInstitute = !!profile?.institute;
    const hasValidYear = !!profile?.year && VALID_YEARS.includes(profile.year);
    const selectedInstitute = hasInstitute ? getInstituteByCode(profile.institute, instituteRows) : null;
    const selectedSpecializedTest = isSpecializedTestInstitute(selectedInstitute);

    // Brand-new users should see the welcome step first.
    if (!hasUsername && !hasInstitute && !hasValidYear) return 0;
    if (!hasUsername) return 1;
    if (!hasInstitute) return 2;
    if (selectedSpecializedTest) return 4;
    if (!hasValidYear) return 3;
    return 5;
  }, []);

  const loadSetupProfile = useCallback(async () => {
    setLoading(true);
    setSetupLoadError('');

    try {
      const [profile, insts] = await Promise.all([
        ensureProfile(),
        fetchInstitutes(),
      ]);
      setInstitutes(insts);
      setExistingProfile(profile);

      setUsername(profile?.username || '');
      setInstitute((profile as any)?.institute || '');
      setYear((profile as any)?.year || '');
      const selectedInstitute = getInstituteByCode((profile as any)?.institute || '', insts);
      setSelectionCategory(isSpecializedTestInstitute(selectedInstitute) ? 'specialized_test' : 'institute');

      if (profile?.referred_by) {
        const { data: referrer } = await supabase.from('profiles').select('full_name, username').eq('id', profile.referred_by).maybeSingle();
        if (referrer) setReferredByName(referrer.full_name || referrer.username || 'a friend');
      }

      const initialStep = getInitialStep(profile, insts);
      if (initialStep === 5) { navigate('/dashboard', { replace: true }); return; }
      setCurrentStep(initialStep);
    } catch (error) {
      console.error('Failed to initialize setup profile:', error);
      setSetupLoadError(
        navigator.onLine
          ? 'We could not load your profile from the server. Please try again.'
          : 'You appear to be offline, so setup fields cannot be verified right now.'
      );
      toast.error('Failed to load setup. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [ensureProfile, getInitialStep, navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    loadSetupProfile();
  }, [user, authLoading, navigate, loadSetupProfile]);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

  useEffect(() => {
    const value = username.trim();
    if (!user?.id) return;

    if (!value) {
      setUsernameStatus('idle');
      setUsernameError('');
      return;
    }

    if (value.length < 3) {
      setUsernameStatus('invalid');
      setUsernameError('At least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameStatus('invalid');
      setUsernameError('Letters, numbers, underscores only');
      return;
    }

    if (existingProfile?.username === value) {
      setUsernameStatus('available');
      setUsernameError('');
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');
    setUsernameError('');

    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', value)
        .neq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setUsernameStatus('idle');
        setUsernameError('Could not check username');
        return;
      }

      if (data) {
        setUsernameStatus('taken');
        setUsernameError('Username already taken');
      } else {
        setUsernameStatus('available');
        setUsernameError('');
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [username, user?.id, existingProfile?.username]);

  const validateUsername = async (value: string) => {
    const normalizedValue = value.trim();
    if (normalizedValue.length < 3) { setUsernameError('At least 3 characters'); return false; }
    if (!/^[a-zA-Z0-9_]+$/.test(normalizedValue)) { setUsernameError('Letters, numbers, underscores only'); return false; }
    const { data } = await supabase.from('profiles').select('id').eq('username', normalizedValue).neq('id', user!.id).maybeSingle();
    if (data) { setUsernameError('Username already taken'); return false; }
    setUsernameError('');
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 0) { setCurrentStep(1); return; }
    if (currentStep === 1) {
      setSaving(true);
      const valid = await validateUsername(username);
      if (!valid) { setSaving(false); return; }
      const { error } = await supabase.from('profiles').upsert({
        id: user!.id,
        username: username.trim(),
        full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || null,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: 'id' });
      setSaving(false);
      if (error) { toast.error('Failed to save username'); return; }
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!institute) {
        toast.error(selectionCategory === 'specialized_test' ? 'Please select a specialized test' : 'Please select an institute');
        return;
      }
      const selectedInstitute = getInstituteByCode(institute, institutes);
      const selectedSpecializedTest = isSpecializedTestInstitute(selectedInstitute);
      const profilePatch: any = {
        id: user!.id,
        institute,
        updated_at: new Date().toISOString(),
      };
      if (selectedSpecializedTest) profilePatch.year = null;
      setSaving(true);
      const { error } = await supabase.from('profiles').upsert(profilePatch, { onConflict: 'id' });
      setSaving(false);
      if (error) {
        toast.error(selectedSpecializedTest ? 'Failed to save specialized test' : 'Failed to save institute');
        return;
      }
      setCurrentStep(selectedSpecializedTest ? 4 : 3);
      return;
    }
    if (currentStep === 3) {
      if (!year) { toast.error('Please select your year'); return; }
      setSaving(true);
      const { error } = await supabase.from('profiles').upsert({
        id: user!.id,
        year,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: 'id' });
      setSaving(false);
      if (error) { toast.error('Failed to save year'); return; }
      setCurrentStep(4);
      return;
    }
    if (currentStep === 4) {
      if (referralStepCode && !referredByName) {
        setSaving(true);
        const referrerId = await resolveReferralCode(referralStepCode);
        if (referrerId) {
          await supabase.from('profiles').update({ referred_by: referrerId }).eq('id', user!.id);
          const { data: referrer } = await supabase.from('profiles').select('full_name, username').eq('id', referrerId).maybeSingle();
          if (referrer) setReferredByName(referrer.full_name || referrer.username || 'a friend');
          notifyAchievementProgress('referral');
        }
        setSaving(false);
      }
      setCurrentStep(5);
      return;
    }
    if (currentStep === 5) { navigate('/dashboard'); }
  };

  const handleBack = () => {
    if (currentStep === 4) {
      const selectedInstitute = getInstituteByCode(institute, institutes);
      if (isSpecializedTestInstitute(selectedInstitute)) {
        setCurrentStep(2);
        return;
      }
    }
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const steps = [
    { title: 'Welcome', icon: Sparkles },
    { title: 'Username', icon: User },
    { title: 'Study Path', icon: Building2 },
    { title: 'Year', icon: GraduationCap },
    { title: 'Referral', icon: Gift },
    { title: 'All Set', icon: CheckCircle2 },
  ];

  const haloLayouts = [
    { primary: '-left-28 -top-28', secondary: '-right-24 bottom-16' },
    { primary: 'left-[8%] -top-32', secondary: '-right-28 top-[42%]' },
    { primary: '-right-20 -top-24', secondary: 'left-[-6rem] bottom-20' },
    { primary: 'right-[12%] bottom-[-7rem]', secondary: 'left-[8%] top-[18%]' },
    { primary: '-left-24 top-[34%]', secondary: 'right-[-5rem] top-12' },
    { primary: 'left-[22%] bottom-[-8rem]', secondary: 'right-[10%] top-[20%]' },
    { primary: 'right-[18%] -top-28', secondary: 'left-[12%] bottom-[-7rem]' },
  ];
  const haloLayout = haloLayouts[currentStep] || haloLayouts[0];
  const setupIsDark = setupTheme === 'dark';

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-24 h-24 object-contain animate-pulse" />
      </div>
    );
  }

  if (setupLoadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-center">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <User className="h-8 w-8 text-white/80" />
          </div>
          <h1 className="text-2xl font-black">Profile Setup Unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{setupLoadError}</p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button onClick={() => navigate('/dashboard', { replace: true })} variant="outline" className="h-12 rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10">
              Go Back
            </Button>
            <Button onClick={loadSetupProfile} className="h-12 rounded-2xl bg-white font-black text-black hover:bg-white/90">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    const searchTerm = studySearch.trim().toLowerCase();
    const categoryInstitutes = institutes.filter(inst => {
      const category = isSpecializedTestInstitute(inst) ? 'specialized_test' : 'institute';
      return category === selectionCategory;
    });
    const availableProvinces = Array.from(
      new Set(
        institutes
          .filter(inst => !isSpecializedTestInstitute(inst))
          .map(getInstituteProvince)
      )
    ).sort((a, b) => a.localeCompare(b));
    const visibleInstitutes = categoryInstitutes.filter(inst => {
      const searchable = `${inst.name} ${inst.short_name} ${getInstituteProvince(inst)} ${formatOwnership(getInstituteOwnership(inst))}`.toLowerCase();
      const matchesSearch = !searchTerm || searchable.includes(searchTerm);
      const matchesProvince = selectionCategory !== 'institute' || provinceFilter === 'all' || getInstituteProvince(inst) === provinceFilter;
      const ownership = getInstituteOwnership(inst);
      const matchesOwnership = selectionCategory !== 'institute' || ownershipFilter === 'all' || ownership === ownershipFilter;
      return matchesSearch && matchesProvince && matchesOwnership;
    });
    const groupedInstitutes = visibleInstitutes.reduce<Record<string, Institute[]>>((groups, inst) => {
      const groupName = selectionCategory === 'institute' ? getInstituteProvince(inst) : 'Specialized Tests';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(inst);
      return groups;
    }, {});
    const sortedGroupNames = Object.keys(groupedInstitutes).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });
    const handleSelectionCategoryChange = (value: string) => {
      const nextCategory = value as SetupSelectionCategory;
      setSelectionCategory(nextCategory);
      setStudyFiltersExpanded(false);
      const selectedInstitute = getInstituteByCode(institute, institutes);
      const selectedCategory = isSpecializedTestInstitute(selectedInstitute) ? 'specialized_test' : 'institute';
      if (selectedInstitute && selectedCategory !== nextCategory) {
        setInstitute('');
      }
    };

    switch (currentStep) {
      case 0:
        return (
          <div className="text-center max-w-lg mx-auto">
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.12 }}>
              <img
                src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
                alt="Medmacs"
                className="w-36 h-36 md:w-44 md:h-44 object-contain mx-auto mb-6 drop-shadow-2xl"
              />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
              Welcome, <span className="text-cyan-300">{displayName}</span>!
            </h2>
            <p className="text-white/70 text-lg mb-6">Let's set up your profile in 3 quick steps.</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'dark' as const, label: 'Dark', icon: Moon, description: 'Pitch black setup' },
                { value: 'light' as const, label: 'Light', icon: Sun, description: 'Bright and soft' },
              ]).map((option) => {
                const Icon = option.icon;
                const selected = setupTheme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => chooseSetupTheme(option.value)}
                    className={`rounded-3xl border-2 p-5 text-left transition-all duration-200 ${
                      selected
                        ? 'border-cyan-300 bg-cyan-400/15 shadow-2xl shadow-cyan-500/20'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      {selected && <CheckCircle2 className="h-5 w-5 text-cyan-300" />}
                    </div>
                    <p className="text-lg font-black text-white">{option.label}</p>
                    <p className="mt-1 text-xs font-semibold text-white/50">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="text-center max-w-md mx-auto">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
              <div className="w-20 h-20 rounded-3xl bg-white/15 flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20">
                <User className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <h2 className="text-3xl font-black text-white mb-2">Choose Your Username</h2>
            <p className="text-white/60 text-sm mb-8">This will be visible on leaderboards and battles.</p>
            <div className="relative">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="h-14 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center text-lg font-bold focus:ring-2 focus:ring-white/30"
                maxLength={20}
              />
              {usernameStatus === 'checking' && (
                <p className="text-cyan-300 text-xs mt-2 font-semibold">Checking availability...</p>
              )}
              {usernameStatus === 'available' && username.trim().length >= 3 && (
                <p className="text-emerald-300 text-xs mt-2 font-semibold">Username is available</p>
              )}
              {usernameError && usernameStatus !== 'checking' && usernameStatus !== 'available' && (
                <p className="text-red-300 text-xs mt-2 font-semibold">{usernameError}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center max-w-lg mx-auto">
            <div className="relative mb-5">
              <div className="absolute right-0 top-0 flex items-center justify-end gap-2">
                <motion.div
                  initial={false}
                  animate={{ width: studySearchExpanded ? 210 : 44 }}
                  className="h-11 overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md"
                >
                  {studySearchExpanded ? (
                    <div className="flex h-full items-center gap-2 px-3">
                      <Search className="h-4 w-4 shrink-0 text-white/50" />
                      <input
                        value={studySearch}
                        onChange={(event) => setStudySearch(event.target.value)}
                        placeholder="Search"
                        autoFocus
                        className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/40"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setStudySearch('');
                          setStudySearchExpanded(false);
                        }}
                        className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStudySearchExpanded(true)}
                      className="flex h-full w-full items-center justify-center text-white/70 hover:text-white"
                    >
                      <Search className="h-5 w-5" />
                    </button>
                  )}
                </motion.div>
                <button
                  type="button"
                  onClick={() => setStudyFiltersExpanded((value) => !value)}
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${
                    studyFiltersExpanded || provinceFilter !== 'all' || ownershipFilter !== 'all'
                      ? 'border-cyan-300 bg-cyan-400/15 text-cyan-300'
                      : 'border-white/10 bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <SlidersHorizontal className="h-5 w-5" />
                </button>
              </div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
                <div className="w-20 h-20 rounded-3xl bg-white/15 flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
              </motion.div>
              <h2 className="text-3xl font-black text-white mb-2">Choose Your Study Path</h2>
              <p className="text-white/60 text-sm">
                {selectionCategory === 'specialized_test'
                  ? "We'll tailor content for your selected exam."
                  : "We'll tailor content for your college."}
              </p>
            </div>
            <Tabs value={selectionCategory} onValueChange={handleSelectionCategoryChange} className="mb-4">
              <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl bg-white/10 p-1">
                <TabsTrigger value="institute" className="rounded-xl text-xs font-black text-white/70 data-[state=active]:bg-white data-[state=active]:text-black">
                  Institutes
                </TabsTrigger>
                <TabsTrigger value="specialized_test" className="rounded-xl text-xs font-black text-white/70 data-[state=active]:bg-white data-[state=active]:text-black">
                  Specialized Tests
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <AnimatePresence>
              {studyFiltersExpanded && selectionCategory === 'institute' && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-3 text-left backdrop-blur-md"
                >
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/50">Province</p>
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                    {['all', ...availableProvinces].map((province) => (
                      <button
                        key={province}
                        type="button"
                        onClick={() => setProvinceFilter(province)}
                        className={`shrink-0 rounded-full px-3 py-2 text-xs font-black transition-all ${
                          provinceFilter === province
                            ? 'bg-cyan-500 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
                        }`}
                      >
                        {province === 'all' ? 'All' : province}
                      </button>
                    ))}
                  </div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/50">Ownership</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['all', 'public', 'private'] as OwnershipFilter[]).map((ownership) => (
                      <button
                        key={ownership}
                        type="button"
                        onClick={() => setOwnershipFilter(ownership)}
                        className={`rounded-xl px-3 py-2 text-xs font-black capitalize transition-all ${
                          ownershipFilter === ownership
                            ? 'bg-cyan-500 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
                        }`}
                      >
                        {ownership}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto px-1 overscroll-contain">
              {sortedGroupNames.map((groupName) => (
                <section key={groupName} className="space-y-2">
                  <div className={`sticky top-0 z-10 flex items-center justify-between rounded-xl border px-3 py-2 text-left backdrop-blur-md ${
                    setupIsDark ? 'border-white/10 bg-black/30' : 'border-cyan-600/15 bg-white/70'
                  }`}>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-white/70">{groupName}</h3>
                    <span className="text-[10px] font-bold text-white/40">{groupedInstitutes[groupName].length}</span>
                  </div>
                  {groupedInstitutes[groupName].map((inst) => {
                    const ownership = getInstituteOwnership(inst);
                    return (
                      <button
                        key={inst.code}
                        onClick={() => inst.enabled && setInstitute(inst.code)}
                        disabled={!inst.enabled}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-200 text-left ${
                          institute === inst.code
                            ? 'border-white bg-white/20 shadow-lg'
                            : inst.enabled
                              ? 'border-white/10 bg-white/5 hover:bg-white/10'
                              : 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white/10">
                          {inst.image_url ? (
                            <img
                              src={inst.image_url}
                              alt={inst.short_name}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white/5" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-white/30" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold leading-tight ${institute === inst.code ? 'text-white' : 'text-white/80'}`}>
                            {inst.name}
                          </p>
                          <p className="text-[11px] text-white/40 mt-0.5">
                            {[inst.short_name, selectionCategory === 'institute' ? formatOwnership(ownership) : null].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        {!inst.enabled && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-300/10 px-2 py-1 rounded-full shrink-0 whitespace-nowrap">
                            Coming Soon
                          </span>
                        )}
                        {institute === inst.code && (
                          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </section>
              ))}
              {visibleInstitutes.length === 0 && (
                <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-5 text-sm font-semibold text-white/60">
                  {selectionCategory === 'specialized_test'
                    ? 'No specialized tests match your search.'
                    : 'No institutes match your filters.'}
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center max-w-md mx-auto">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
              <div className="w-20 h-20 rounded-3xl bg-white/15 flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <h2 className="text-3xl font-black text-white mb-2">Select Your Year</h2>
            <p className="text-white/60 text-sm mb-8">Pick your current MBBS year.</p>
            <div className="grid grid-cols-2 gap-3">
              {VALID_YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`p-4 rounded-2xl border-2 transition-all duration-200 font-bold ${
                    year === y
                      ? 'border-white bg-white/20 text-white shadow-lg'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {y} Year MBBS
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center max-w-md mx-auto">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
              <div className="w-20 h-20 rounded-3xl bg-white/15 flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20">
                <Gift className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <h2 className="text-3xl font-black text-white mb-2">Referral</h2>
            {referredByName ? (
              <div className="rounded-2xl bg-white/5 border-2 border-white/10 p-5 opacity-60 select-none">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <HeartHandshake className="h-6 w-6 text-white/70" />
                  <p className="text-lg font-bold text-white/70">You were referred to Medmacs by <span className="text-primary-foreground">{referredByName}</span></p>
                </div>
                <p className="text-xs text-white/40 mt-1">Referral already applied</p>
              </div>
            ) : (
              <div>
                <p className="text-white/60 text-sm mb-6">Enter a referral code if you have one (optional).</p>
                <Input
                  value={referralStepCode}
                  onChange={(e) => setReferralStepCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="Enter referral code"
                  className="h-14 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center text-lg font-bold tracking-[0.25em] focus:ring-2 focus:ring-white/30 uppercase"
                  maxLength={6}
                />
                <p className="text-white/30 text-xs mt-3">Ask a friend for their code</p>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <img src="/mascots/Mascot14.png" alt="All Set" className="w-48 h-auto mx-auto mb-6 drop-shadow-2xl" />
            </motion.div>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring' }}>
              <CheckCircle2 className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">You're All Set!</h2>
            <p className="text-white/70 text-lg">Your profile is complete. Let's start learning!</p>
          </div>
        );
    }
  };

  const canProceed = () => {
    if (currentStep === 0) return true;
    if (currentStep === 1) return usernameStatus === 'available';
    if (currentStep === 2) return !!institute;
    if (currentStep === 3) return !!year;
    if (currentStep === 4) return true;
    if (currentStep === 5) return true;
    return false;
  };

  return (
    <div className={`setup-theme-${setupTheme} fixed inset-0 isolate h-dvh w-full flex flex-col items-center justify-center overflow-hidden overscroll-none transition-all duration-700 ${setupIsDark ? 'bg-black' : 'bg-slate-50'}`}>
      {!setupIsDark && (
        <style>{`
          .setup-theme-light .text-white { color: rgb(15 23 42) !important; }
          .setup-theme-light .text-white\\/80 { color: rgba(15, 23, 42, 0.80) !important; }
          .setup-theme-light .text-white\\/70 { color: rgba(15, 23, 42, 0.70) !important; }
          .setup-theme-light .text-white\\/60 { color: rgba(15, 23, 42, 0.62) !important; }
          .setup-theme-light .text-white\\/50 { color: rgba(15, 23, 42, 0.52) !important; }
          .setup-theme-light .text-white\\/40 { color: rgba(15, 23, 42, 0.42) !important; }
          .setup-theme-light .text-white\\/30 { color: rgba(15, 23, 42, 0.32) !important; }
          .setup-theme-light .text-cyan-300 { color: rgb(8 145 178) !important; }
          .setup-theme-light .text-emerald-300 { color: rgb(5 150 105) !important; }
          .setup-theme-light .text-black { color: rgb(255 255 255) !important; }
          .setup-theme-light .bg-white { background-color: rgb(8 145 178) !important; }
          .setup-theme-light .bg-white\\/20 { background-color: rgba(8, 145, 178, 0.14) !important; }
          .setup-theme-light .bg-white\\/15 { background-color: rgba(8, 145, 178, 0.12) !important; }
          .setup-theme-light .bg-white\\/10 { background-color: rgba(8, 145, 178, 0.08) !important; }
          .setup-theme-light .bg-white\\/5 { background-color: rgba(8, 145, 178, 0.05) !important; }
          .setup-theme-light .border-white { border-color: rgb(8 145 178) !important; }
          .setup-theme-light .border-white\\/20 { border-color: rgba(8, 145, 178, 0.22) !important; }
          .setup-theme-light .border-white\\/10 { border-color: rgba(8, 145, 178, 0.16) !important; }
          .setup-theme-light .placeholder\\:text-white\\/40::placeholder { color: rgba(15, 23, 42, 0.42) !important; }
        `}</style>
      )}
      <div className={`absolute h-80 w-80 rounded-full blur-3xl transition-all duration-700 ${haloLayout.primary} ${setupIsDark ? 'bg-cyan-500/25' : 'bg-cyan-300/45'}`} />
      <div className={`absolute h-96 w-96 rounded-full blur-3xl transition-all duration-700 ${haloLayout.secondary} ${setupIsDark ? 'bg-teal-400/20' : 'bg-teal-200/50'}`} />
      <div className={`absolute inset-0 z-0 transition-all duration-700 ${setupIsDark ? 'bg-black/45' : 'bg-white/55'}`} />
      <div className="absolute top-[calc(env(safe-area-inset-top,0px)+16px)] left-6 right-6 z-50">
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/15">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: i <= currentStep ? '100%' : '0%' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((s, i) => (
            <span key={i} className={`text-[9px] font-bold uppercase tracking-wider transition-all ${
              i <= currentStep ? 'text-white/80' : 'text-white/30'
            }`}>
              {s.title}
            </span>
          ))}
        </div>
      </div>

      {currentStep === 0 && (
        <button
          onClick={() => setCurrentStep(1)}
          className="absolute top-[calc(env(safe-area-inset-top,0px)+16px)] right-6 z-50 text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest"
        >
          Skip
        </button>
      )}

      <div className="relative z-10 w-full max-w-2xl px-6 py-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+24px)] left-6 right-6 z-50">
        <div className={`flex items-center gap-3 ${currentStep > 0 ? 'justify-between' : 'justify-center'}`}>
          {currentStep > 0 && currentStep < 5 && (
            <Button
              onClick={handleBack}
              variant="outline"
              className={`flex-1 h-14 rounded-2xl border-2 font-bold ${
                setupIsDark
                  ? 'border-white/20 bg-white/5 text-white hover:bg-white/10'
                  : 'border-cyan-600/20 bg-cyan-600/5 text-cyan-700 hover:bg-cyan-600/10'
              }`}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className={`h-14 rounded-2xl font-black shadow-2xl transition-all active:scale-95 ${
              setupIsDark
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-gradient-to-r from-cyan-600 to-teal-500 text-white hover:from-cyan-500 hover:to-teal-400 shadow-cyan-700/20'
            } ${
              currentStep > 0 && currentStep < 5 ? 'flex-1' : 'w-full max-w-md'
            }`}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : currentStep === 5 ? (
              <span className="flex items-center gap-2">Go to Dashboard <Sparkles className={`h-5 w-5 ${setupIsDark ? 'fill-black' : 'fill-white'}`} /></span>
            ) : currentStep === 0 ? (
              <span className="flex items-center gap-2">Let's Go <ChevronRight className="h-5 w-5" /></span>
            ) : (
              <span className="flex items-center gap-2">Next <ChevronRight className="h-5 w-5" /></span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
