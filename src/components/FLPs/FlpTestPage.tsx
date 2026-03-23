import { FLPQuiz } from "./FLPQuiz";

interface MCQ {
    id: string;
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
    chapter_id: string;
    subject?: string;
}

interface FlpTestPageProps {
    mcqs: MCQ[];
    onFinish: (score: number, totalQuestions: number) => void;
    subjectName?: string;
    initialIndex?: number;
    initialAnswers?: Record<string, string | null>;
    initialTimeLeft?: number;
}

const FlpTestPage: React.FC<FlpTestPageProps> = ({ mcqs, onFinish, subjectName, initialIndex, initialAnswers, initialTimeLeft }) => {
    return <FLPQuiz mcqs={ mcqs } onFinish = { onFinish } timePerQuestion = { 60} subjectName={subjectName} initialIndex={initialIndex} initialAnswers={initialAnswers} initialTimeLeft={initialTimeLeft} />;
};

export default FlpTestPage;
