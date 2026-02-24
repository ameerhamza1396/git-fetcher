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
}

const FlpTestPage: React.FC<FlpTestPageProps> = ({ mcqs, onFinish }) => {
    return <FLPQuiz mcqs={ mcqs } onFinish = { onFinish } timePerQuestion = { 60} />;
};

export default FlpTestPage;
