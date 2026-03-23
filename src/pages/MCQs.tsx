import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SubjectSelectionScreen } from '@/components/mcq/SubjectSelectionScreen';
import { ChapterSelectionScreen } from '@/components/mcq/ChapterSelectionScreen';
import { QuizSettingsScreen } from '@/components/mcq/QuizSettingsScreen';
import { MCQDisplay } from '@/components/mcq/MCQDisplay';
import { ProgressTracker } from '@/components/mcq/ProgressTracker';
import { useAuth } from '@/hooks/useAuth';
import { getUserStats, Subject, Chapter } from '@/utils/mcqData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import Seo from '@/components/Seo';
import { Lock } from 'lucide-react';
import PageSkeleton from '@/components/skeletons/PageSkeleton';

type Screen = 'subjects' | 'chapters' | 'settings' | 'quiz';

const MCQs = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [initialIndex, setInitialIndex] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const lastScrollY = useRef(0);
  const [userStats, setUserStats] = useState({
    totalQuestions: 0, correctAnswers: 0, accuracy: 0, averageTime: 0, bestStreak: 0
  });

  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleLocationState = async () => {
      if (location.state?.autoResume && location.state?.resumeData) {
        const { subjectId, chapterId } = location.state.resumeData;

        try {
          // Fetch subject and chapter objects from Supabase
          const [{ data: subject }, { data: chapter }] = await Promise.all([
            supabase.from('subjects').select('*').eq('id', subjectId).single(),
            supabase.from('chapters').select('*').eq('id', chapterId).single(),
          ]);

          if (subject && chapter) {
            setSelectedSubject(subject as Subject);
            setSelectedChapter(chapter as Chapter);
            if (location.state.resumeData.lastIndex !== undefined) {
              setInitialIndex(location.state.resumeData.lastIndex);
            }
            setCurrentScreen('quiz');
          }
        } catch (error) {
          console.error("Failed to fetch resume data:", error);
        }

        // Clear state to prevent infinite auto-resume on reload
        window.history.replaceState({}, document.title)
      }
    };

    handleLocationState();
  }, [location.state]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles').select('plan').eq('id', user.id).maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id
  });

  // Scroll-hide header
  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    if (currentY > 80 && currentY > lastScrollY.current) {
      setHeaderVisible(false);
    } else {
      setHeaderVisible(true);
    }
    lastScrollY.current = currentY;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const loadUserStats = async () => {
      if (user?.id) {
        const stats = await getUserStats(user.id);
        setUserStats(stats);
      }
    };
    if (user?.id && !authLoading && !profileLoading) loadUserStats();
  }, [user?.id, authLoading, profileLoading]);

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setCurrentScreen('chapters');
  };

  const handleChapterSelect = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setCurrentScreen('settings');
  };

  const handleStartQuiz = (timerEnabledValue: boolean, timePerQuestionValue: number) => {
    setTimerEnabled(timerEnabledValue);
    setTimePerQuestion(timePerQuestionValue);
    setInitialIndex(0); // Reset for manual start
    setCurrentScreen('quiz');
  };

  const handleBackToSubjects = () => {
    setCurrentScreen('subjects');
    setSelectedSubject(null);
    setSelectedChapter(null);
  };

  const handleBackToChapters = () => {
    setCurrentScreen('chapters');
    setSelectedChapter(null);
  };

  const handleBackToSettings = () => {
    setCurrentScreen('settings');
  };

  const getHeaderBackAction = () => {
    switch (currentScreen) {
      case 'chapters': return { label: 'Back to Subjects', action: handleBackToSubjects };
      case 'settings': return { label: 'Back to Chapters', action: handleBackToChapters };
      case 'quiz': return { label: 'Leave Test', action: () => setShowLeaveConfirm(true) };
      default: return { label: 'Dashboard', action: () => { } };
    }
  };

  const headerBack = getHeaderBackAction();

  const renderContent = () => {
    switch (currentScreen) {
      case 'subjects':
        return <SubjectSelectionScreen onSubjectSelect={handleSubjectSelect} />;
      case 'chapters':
        return selectedSubject ? (
          <ChapterSelectionScreen
            subject={selectedSubject}
            onChapterSelect={handleChapterSelect}
            onBack={handleBackToSubjects}
            userProfile={profile}
          />
        ) : null;
      case 'settings':
        return selectedSubject && selectedChapter ? <QuizSettingsScreen subject={selectedSubject} chapter={selectedChapter} onStartQuiz={handleStartQuiz} onBack={handleBackToChapters} /> : null;
      case 'quiz':
        return selectedSubject && selectedChapter ? (
          <MCQDisplay
            subject={selectedSubject.id}
            chapter={selectedChapter.id}
            onBack={handleBackToSettings}
            timerEnabled={timerEnabled}
            timePerQuestion={timePerQuestion}
            initialIndex={initialIndex}
          />
        ) : null;
      default:
        return <SubjectSelectionScreen onSubjectSelect={handleSubjectSelect} />;
    }
  };

  if (authLoading || profileLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center">
        <Card className="w-full max-w-md bg-card/90 backdrop-blur-sm border-border shadow-lg p-6">
          <CardHeader className="mb-4">
            <Lock className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="text-2xl font-bold text-foreground">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">Please log in to access the MCQ practice section.</p>
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg shadow-md">
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950">
      <Seo title="MCQs Practice" description="Practice thousands of MCQs for MDCAT and other medical entrance exams with Medmacs App." canonical="https://medmacs.app/mcqs" />

      {/* Glass header with scroll retract - hidden during quiz for immersive experience */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)] transition-transform duration-300 ${headerVisible && currentScreen !== 'quiz' ? 'translate-y-0' : '-translate-y-full'} ${currentScreen === 'quiz' ? 'pointer-events-none opacity-0' : ''}`}
      >
        <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex justify-between items-center max-w-full">
          {currentScreen === 'subjects' ? (
            <Link to="/dashboard" className="flex items-center space-x-1 sm:space-x-2 text-primary hover:text-primary/80 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Dashboard</span>
            </Link>
          ) : (
            <button onClick={headerBack.action} className="flex items-center space-x-1 sm:space-x-2 text-primary hover:text-primary/80 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">{headerBack.label}</span>
            </button>
          )}

          <div className="flex items-center space-x-2 sm:space-x-3">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
            <span className="text-lg sm:text-xl font-bold text-foreground hidden sm:inline">Practice MCQs</span>
            <span className="text-sm font-bold text-foreground sm:hidden">MCQs</span>
          </div>

          <ProfileDropdown />
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 max-w-full mt-[var(--header-height)]">
        {currentScreen === 'subjects' && (
          <>
            {/* Hero with mascot */}
            <div className="text-center mb-6 sm:mb-8 animate-fade-in">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase italic mb-3">
                📚 MCQ <span className="text-primary">Practice</span>
              </h1>
              <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] max-w-2xl mx-auto px-4 sm:px-0">
                Master medical concepts with our comprehensive MCQ practice system
              </p>
            </div>

            <div className="mb-6 sm:mb-8">
              <ProgressTracker userId={user?.id} />
            </div>

            {/* Stats cards removed - using ProgressTracker's new design */}
          </>
        )}

        {renderContent()}

        {/* Leave Test Confirmation */}
        <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
          <DialogContent className="sm:max-w-[400px] bg-white dark:bg-zinc-900 border-2 border-red-200 dark:border-red-900 rounded-3xl overflow-hidden shadow-2xl p-0 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex flex-col items-center text-center p-6">
              <div className="mb-4 w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Leave Test?</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">Your progress has been saved. You can resume from where you left off next time.</p>
              <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
                <Button onClick={() => setShowLeaveConfirm(false)} variant="outline" className="flex-1 rounded-xl h-12">Continue Test</Button>
                <Button onClick={() => { setShowLeaveConfirm(false); handleBackToSettings(); }} className="flex-1 rounded-xl h-12 font-bold bg-red-600 hover:bg-red-700 text-white">Leave Test</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MCQs;
