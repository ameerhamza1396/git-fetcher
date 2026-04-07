import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { FLPQuiz } from '@/components/FLPs/FLPQuiz';
import { Loader2 } from 'lucide-react';

interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  chapter_id: string;
}

interface ShuffledMCQ extends Omit<MCQ, 'options'> {
  shuffledOptions: string[];
  originalCorrectIndex: number;
}

interface FLPSessionData {
  shuffledMcqs: ShuffledMCQ[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string | null>;
  totalTimeLeft: number;
  subjectName?: string;
  savedAt: number;
}

const FLP_STORAGE_KEY = 'flp_session';

const FLPTestPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [mcqs, setMcqs] = useState<ShuffledMCQ[]>([]);
  const [subjectName, setSubjectName] = useState('');
  const [initialIndex, setInitialIndex] = useState<number | undefined>();
  const [initialAnswers, setInitialAnswers] = useState<Record<string, string | null> | undefined>();
  const [initialTimeLeft, setInitialTimeLeft] = useState<number | undefined>();

  useEffect(() => {
    const loadQuizData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const state = location.state as {
        mcqs?: ShuffledMCQ[];
        subjectName?: string;
        mcqCount?: number;
      } | null;

      if (state?.mcqs && state.mcqs.length > 0) {
        setMcqs(state.mcqs);
        setSubjectName(state.subjectName || '');
        setIsLoading(false);
        return;
      }

      try {
        const saved = localStorage.getItem(FLP_STORAGE_KEY);
        if (saved) {
          const sessionData: FLPSessionData = JSON.parse(saved);
          const hoursSinceSaved = (Date.now() - sessionData.savedAt) / (1000 * 60 * 60);
          if (hoursSinceSaved < 24 && sessionData.shuffledMcqs.length > 0) {
            setMcqs(sessionData.shuffledMcqs);
            setSubjectName(sessionData.subjectName || '');
            setInitialIndex(sessionData.currentQuestionIndex);
            setInitialAnswers(sessionData.userAnswers);
            setInitialTimeLeft(sessionData.totalTimeLeft);
            setIsLoading(false);
            return;
          } else {
            localStorage.removeItem(FLP_STORAGE_KEY);
          }
        }
      } catch (e) {
        console.error("Failed to load FLP session", e);
        localStorage.removeItem(FLP_STORAGE_KEY);
      }

      toast({
        title: "No Active Session",
        description: "Please start a new FLP test.",
      });
      navigate('/flp');
    };

    loadQuizData();
  }, [user, location.state, navigate, toast]);

  const handleFinish = (score: number, totalQuestions: number) => {
    if (score === 0 && totalQuestions === 0) {
      navigate('/flp');
    } else {
      setMcqs([]);
      navigate('/flp');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground font-medium">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center">
        <Card className="w-full max-w-md bg-card/90 backdrop-blur-sm border-border shadow-lg p-6">
          <CardHeader className="mb-4">
            <CardTitle className="text-2xl font-bold text-foreground">Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">Please sign in to access the Full-Length Paper test.</p>
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg shadow-md"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mcqs.length === 0) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center">
        <Card className="w-full max-w-md bg-card/90 backdrop-blur-sm border-border shadow-lg p-6">
          <CardHeader className="mb-4">
            <CardTitle className="text-2xl font-bold text-foreground">No Test Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">The test session is invalid or has expired.</p>
            <Button
              onClick={() => navigate('/flp')}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg shadow-md"
            >
              Start New Test
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FLPQuiz
      mcqs={mcqs as unknown as MCQ[]}
      onFinish={handleFinish}
      timePerQuestion={60}
      subjectName={subjectName}
      initialIndex={initialIndex}
      initialAnswers={initialAnswers}
      initialTimeLeft={initialTimeLeft}
    />
  );
};

export default FLPTestPage;
