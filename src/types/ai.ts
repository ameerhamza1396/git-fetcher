
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  session_name: string | null;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface AIGeneratedTest {
  id: string;
  user_id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: any[];
  total_questions: number;
  generated_at: string;
  test_taken: boolean;
  score: number | null;
  accuracy: number | null;
}

// Database insert type for chat sessions
export interface ChatSessionInsert {
  user_id: string;
  session_name?: string;
  messages?: any; // Json type from database
}

// Database update type for chat sessions
export interface ChatSessionUpdate {
  messages?: any; // Json type from database
  updated_at?: string;
}
