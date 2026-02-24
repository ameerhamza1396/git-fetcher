import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Target, Trophy, Clock } from 'lucide-react';
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

type Screen = 'subjects' | 'chapters' | 'settings' | 'quiz';

const MCQs = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [userStats, setUserStats] = useState({
    totalQuestions: 0, correctAnswers: 0, accuracy: 0, averageTime: 0, bestStreak: 0
  });

  const { user, loading: authLoading } = useAuth();

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
      case 'quiz': return { label: 'Back to Settings', action: handleBackToSettings };
      default: return { label: 'Dashboard', action: () => {} };
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
        return selectedSubject && selectedChapter ? <MCQDisplay subject={selectedSubject.id} chapter={selectedChapter.id} onBack={handleBackToSettings} timerEnabled={timerEnabled} timePerQuestion={timePerQuestion} /> : null;
      default:
        return <SubjectSelectionScreen onSubjectSelect={handleSubjectSelect} />;
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-24 h-24 object-contain animate-pulse" />
      </div>
    );
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
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-accent/20 to-primary/5">
      <Seo title="MCQs Practice" description="Practice thousands of MCQs for MDCAT and other medical entrance exams with Medmacs App." canonical="https://medmacs.app/mcqs" />
      
      {/* Glass header with scroll retract */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)] transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
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

      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 max-w-full mt-[calc(env(safe-area-inset-top)+60px)]">
        {currentScreen === 'subjects' && (
          <>
            {/* Hero with mascot */}
            <div className="text-center mb-6 sm:mb-8 animate-fade-in">
              <img src="/images/mascots/doctor-desk.png" alt="Study mascot" className="w-28 h-28 mx-auto mb-4 object-contain drop-shadow-lg" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
                📚 MCQ Practice
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
                Master medical concepts with our comprehensive MCQ practice system.
              </p>
            </div>

            <div className="mb-6 sm:mb-8">
              <ProgressTracker userId={user?.id} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
              <Card className="text-center bg-card/80 backdrop-blur-sm border-border hover:scale-105 transition-transform duration-300 animate-fade-in">
                <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mx-auto mb-1 sm:mb-2 text-primary" />
                  <CardTitle className="text-xs sm:text-sm text-foreground">Questions Practiced</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary">{userStats.totalQuestions}</div>
                </CardContent>
              </Card>

              <Card className="text-center bg-card/80 backdrop-blur-sm border-border hover:scale-105 transition-transform duration-300 animate-fade-in">
                <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mx-auto mb-1 sm:mb-2 text-emerald-500" />
                  <CardTitle className="text-xs sm:text-sm text-foreground">Accuracy Rate</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-500">{userStats.accuracy}%</div>
                </CardContent>
              </Card>

              <Card className="text-center bg-card/80 backdrop-blur-sm border-border hover:scale-105 transition-transform duration-300 animate-fade-in">
                <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mx-auto mb-1 sm:mb-2 text-yellow-500" />
                  <CardTitle className="text-xs sm:text-sm text-foreground">Best Streak</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-500">{userStats.bestStreak}</div>
                </CardContent>
              </Card>

              <Card className="text-center bg-card/80 backdrop-blur-sm border-border hover:scale-105 transition-transform duration-300 animate-fade-in">
                <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mx-auto mb-1 sm:mb-2 text-blue-500" />
                  <CardTitle className="text-xs sm:text-sm text-foreground">Avg. Time</CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-500">{userStats.averageTime}s</div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {renderContent()}
      </div>
    </div>
  );
};

export default MCQs;
