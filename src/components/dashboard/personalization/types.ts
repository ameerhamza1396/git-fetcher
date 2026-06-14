export type WrongAttempt = {
  id: string;
  selectedAnswer: string;
  createdAt: string;
  mcq: {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    chapterId: string;
    chapterName: string;
    chapterNumber: number;
    subjectId: string;
    subjectName: string;
    subjectIcon?: string;
    year?: string | null;
  };
};

export type MistakeChapter = {
  id: string;
  subjectId: string;
  subjectName?: string;
  name: string;
  number: number;
  attempts: WrongAttempt[];
};

export type MistakeSubject = {
  id: string;
  name: string;
  icon?: string;
  total: number;
  chapters: MistakeChapter[];
};

export type Flashcard = {
  front: string;
  back: string;
  source: string;
};
