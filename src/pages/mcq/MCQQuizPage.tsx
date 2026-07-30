import { useLayoutEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { MCQDisplay } from '@/components/mcq/MCQDisplay';
import { useAuth } from '@/hooks/useAuth';
import MCQLoadingSkeleton from '@/features/mcq/components/MCQLoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const MCQQuizPage = () => {
  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, []);

  const { subjectId, chapterId } = useParams<{ subjectId: string; chapterId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const routeState = location.state as {
    startIndex?: number;
    wrongMcqIds?: string[];
    subject?: import('@/utils/mcqData').Subject | null;
    chapter?: import('@/utils/mcqData').Chapter | null;
  } | null;
  const initialIndex = routeState?.startIndex || 0;
  const mistakeMcqIds = useMemo(
    () => routeState?.wrongMcqIds || [],
    [routeState?.wrongMcqIds],
  );

  const timerEnabled = searchParams.get('timer') === 'true';
  const mistakeMode = searchParams.get('mode') === 'mistakes';
  const timePerQuestion = parseInt(searchParams.get('time') || '30', 10);

  const handleBack = () => {
    if (mistakeMode) {
      navigate('/dashboard');
      return;
    }
    if (subjectId && chapterId) {
      navigate(`/mcqs/settings/${subjectId}/${chapterId}`);
    } else {
      navigate('/mcqs');
    }
  };

  if (authLoading) {
    return <MCQLoadingSkeleton />;
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

  if (!subjectId || !chapterId) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center">
        <Card className="w-full max-w-md bg-card/90 backdrop-blur-sm border-border shadow-lg p-6">
          <CardHeader className="mb-4">
            <CardTitle className="text-2xl font-bold text-foreground">Invalid Quiz Session</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">The quiz session is invalid or has expired.</p>
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg shadow-md">
              <Link to="/mcqs">Start New Session</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MCQDisplay
      subject={subjectId}
      chapter={chapterId}
      onBack={handleBack}
      timerEnabled={timerEnabled}
      timePerQuestion={timePerQuestion}
      initialIndex={initialIndex}
      mistakeMode={mistakeMode}
      mistakeMcqIds={mistakeMcqIds}
      initialSubject={routeState?.subject}
      initialChapter={routeState?.chapter}
    />
  );
};

export default MCQQuizPage;
