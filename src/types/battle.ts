
export interface BattleRoom {
  id: string;
  room_code: string;
  battle_type: '1v1' | '2v2' | 'ffa';
  max_players: number;
  current_players: number;
  status: 'waiting' | 'in_progress' | 'completed';
  subject_id: string | null;
  chapter_id: string | null;
  questions: any[] | null;
  current_question: number;
  time_per_question: number;
  total_questions: number;
  subject: string | null;
  host_id: string | null;
  host_ping_requested_at: string | null;
  last_ping_sender_id: string | null;
  last_ping_sender_username: string | null;
  countdown_initiated_at: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface Participant {
  id: string;
  battle_room_id: string;
  user_id: string;
  username: string;
  team: number | null;
  score: number;
  answers: any[];
  is_ready: boolean;
  joined_at: string;
  created_at: string;
  kicked_at: string | null;
}

export interface BattleResult {
  id: string;
  battle_room_id: string;
  user_id: string;
  final_score: number;
  rank: number;
  total_correct: number;
  total_questions: number;
  accuracy_percentage: number | null;
  time_bonus: number;
  created_at: string;
}

// Database types from Supabase
export interface DatabaseBattleRoom {
  id: string;
  room_code: string;
  battle_type: string;
  max_players: number;
  current_players: number;
  status: string;
  subject_id: string | null;
  chapter_id: string | null;
  questions: any;
  current_question: number;
  time_per_question: number;
  total_questions: number;
  subject: string | null;
  host_id: string | null;
  host_ping_requested_at: string | null;
  last_ping_sender_id: string | null;
  last_ping_sender_username: string | null;
  countdown_initiated_at: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface DatabaseParticipant {
  id: string;
  battle_room_id: string;
  user_id: string;
  username: string;
  team: number | null;
  score: number;
  answers: any;
  is_ready: boolean;
  joined_at: string;
  created_at: string;
  kicked_at: string | null;
}

// Real-time event types
export interface RealtimePayload<T = any> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  errors: any[];
}
