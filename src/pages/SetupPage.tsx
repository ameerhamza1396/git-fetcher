import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Sparkles, User, Building2, GraduationCap, CheckCircle2, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { INSTITUTES } from '@/utils/institutes';

const VALID_YEARS = ['1st', '2nd', '3rd', '4th', '5th'];

const SetupWizard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [institute, setInstitute] = useState('');
  const [year, setYear] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [existingProfile, setExistingProfile] = useState<any>(null);

  // Determine which step user actually needs
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }

    const loadProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      setExistingProfile(data);

      if (data) {
        // Pre-fill existing values
        if (data.username) setUsername(data.username);
        if ((data as any).institute) setInstitute((data as any).institute);
        if ((data as any).year) setYear((data as any).year);

        // Find first missing step (skip welcome which is step 0)
        if (!data.username) { setCurrentStep(1); }
        else if (!(data as any).institute) { setCurrentStep(2); }
        else if (!(data as any).year || !VALID_YEARS.includes((data as any).year)) { setCurrentStep(3); }
        else {
          // All complete, redirect to dashboard
          navigate('/dashboard');
          return;
        }
      } else {
        setCurrentStep(0);
      }
      setLoading(false);
    };
    loadProfile();
  }, [user, authLoading, navigate]);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

  const validateUsername = async (value: string) => {
    if (value.length < 3) { setUsernameError('At least 3 characters'); return false; }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) { setUsernameError('Letters, numbers, underscores only'); return false; }
    // Check availability
    const { data } = await supabase.from('profiles').select('id').eq('username', value).neq('id', user!.id).maybeSingle();
    if (data) { setUsernameError('Username already taken'); return false; }
    setUsernameError('');
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      setCurrentStep(1);
      return;
    }
    if (currentStep === 1) {
      setSaving(true);
      const valid = await validateUsername(username);
      if (!valid) { setSaving(false); return; }
      const { error } = await supabase.from('profiles').update({ username } as any).eq('id', user!.id);
      setSaving(false);
      if (error) { toast.error('Failed to save username'); return; }
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!institute) { toast.error('Please select an institute'); return; }
      setSaving(true);
      const { error } = await supabase.from('profiles').update({ institute } as any).eq('id', user!.id);
      setSaving(false);
      if (error) { toast.error('Failed to save institute'); return; }
      setCurrentStep(3);
      return;
    }
    if (currentStep === 3) {
      if (!year) { toast.error('Please select your year'); return; }
      setSaving(true);
      const { error } = await supabase.from('profiles').update({ year } as any).eq('id', user!.id);
      setSaving(false);
      if (error) { toast.error('Failed to save year'); return; }
      setCurrentStep(4);
      return;
    }
    if (currentStep === 4) {
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const steps = [
    { title: 'Welcome', icon: Sparkles },
    { title: 'Username', icon: User },
    { title: 'Institute', icon: Building2 },
    { title: 'Year', icon: GraduationCap },
    { title: 'All Set', icon: CheckCircle2 },
  ];

  const gradients = [
    'from-violet-600 via-purple-600 to-indigo-700',
    'from-blue-600 via-indigo-600 to-violet-700',
    'from-emerald-600 via-teal-600 to-cyan-700',
    'from-orange-500 via-amber-600 to-yellow-600',
    'from-emerald-500 via-green-500 to-teal-600',
  ];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-24 h-24 object-contain animate-pulse" />
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div className="text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <img src="/mascots/Mascot1.png" alt="Welcome" className="w-48 h-48 mx-auto mb-6 drop-shadow-2xl" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
              Welcome, <span className="text-yellow-300">{displayName}</span>!
            </h2>
            <p className="text-white/70 text-lg mb-2">Let's set up your profile in 3 quick steps.</p>
            <p className="text-white/50 text-sm">This will personalize your learning experience.</p>
          </div>
        );

      case 1: // Username
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
                onChange={(e) => { setUsername(e.target.value); setUsernameError(''); }}
                placeholder="Enter your username"
                className="h-14 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center text-lg font-bold focus:ring-2 focus:ring-white/30"
                maxLength={20}
              />
              {usernameError && (
                <p className="text-red-300 text-xs mt-2 font-semibold">{usernameError}</p>
              )}
            </div>
          </div>
        );

      case 2: // Institute
        return (
          <div className="text-center max-w-lg mx-auto">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
              <div className="w-20 h-20 rounded-3xl bg-white/15 flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20">
                <Building2 className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <h2 className="text-3xl font-black text-white mb-2">Select Your Institute</h2>
            <p className="text-white/60 text-sm mb-6">We'll tailor content for your college.</p>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto px-1">
              {INSTITUTES.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => inst.enabled && setInstitute(inst.id)}
                  disabled={!inst.enabled}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                    institute === inst.id
                      ? 'border-white bg-white/20 shadow-lg'
                      : inst.enabled
                        ? 'border-white/10 bg-white/5 hover:bg-white/10'
                        : 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-white/60" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold truncate ${institute === inst.id ? 'text-white' : 'text-white/80'}`}>
                      {inst.shortName}
                    </p>
                    <p className="text-[11px] text-white/50 truncate">{inst.name}</p>
                  </div>
                  {!inst.enabled && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-300/10 px-2 py-1 rounded-full shrink-0">
                      Coming Soon
                    </span>
                  )}
                  {institute === inst.id && (
                    <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 3: // Year
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

      case 4: // All Set
        return (
          <div className="text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <img src="/mascots/Mascot5.png" alt="All Set" className="w-48 h-48 mx-auto mb-6 drop-shadow-2xl" />
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
    if (currentStep === 1) return username.length >= 3;
    if (currentStep === 2) return !!institute;
    if (currentStep === 3) return !!year;
    if (currentStep === 4) return true;
    return false;
  };

  return (
    <div className={`relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden transition-all duration-700 bg-gradient-to-br ${gradients[currentStep]}`}>
      {/* Progress bar */}
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

      {/* Skip (only on welcome) */}
      {currentStep === 0 && (
        <button
          onClick={() => navigate('/dashboard')}
          className="absolute top-[calc(env(safe-area-inset-top,0px)+16px)] right-6 z-50 text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest"
        >
          Skip
        </button>
      )}

      {/* Content */}
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

      {/* Bottom buttons */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+24px)] left-6 right-6 z-50">
        <div className={`flex items-center gap-3 ${currentStep > 0 ? 'justify-between' : 'justify-center'}`}>
          {currentStep > 0 && currentStep < 4 && (
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex-1 h-14 rounded-2xl border-2 border-white/20 bg-white/5 text-white hover:bg-white/10 font-bold"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className={`h-14 rounded-2xl bg-white text-black hover:bg-white/90 font-black shadow-2xl transition-all active:scale-95 ${
              currentStep > 0 && currentStep < 4 ? 'flex-1' : 'w-full max-w-md'
            }`}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : currentStep === 4 ? (
              <span className="flex items-center gap-2">Go to Dashboard <Sparkles className="h-5 w-5 fill-black" /></span>
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
