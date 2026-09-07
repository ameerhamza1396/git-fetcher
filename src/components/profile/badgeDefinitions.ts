import { Award, BookOpenCheck, Flame, HelpCircle, Library, MessageSquare, ScrollText, ShieldCheck, Swords, Target, UserPlus, Zap } from 'lucide-react';
import type { BadgeShape, BadgeTone } from './BadgeMedallion';

export type AchievementStats = {
  lifetimeMcqs: number;
  correctMcqs: number;
  flpCompletions: number;
  aiChatSessions: number;
  points: number;
  accuracy: number;
  aiQuestionHelpCount: number;
  fastCorrectCount: number;
  savedMcqs: number;
  battleWins: number;
  currentStreak: number;
  correctedMcqs: number;
  flashcardsGenerated: number;
  referralCount: number;
};

export type BadgeGroup = 'Practice' | 'Precision' | 'Consistency' | 'Papers' | 'AI Learning' | 'Community';

/** Section order on the badges page. */
export const BADGE_GROUP_ORDER: BadgeGroup[] = ['Practice', 'Precision', 'Consistency', 'Papers', 'AI Learning', 'Community'];

export type BadgeDefinition = {
  id: string;
  name: string;
  details: string;
  icon: any;
  shape: BadgeShape;
  tone: BadgeTone;
  group: BadgeGroup;
  isEarned: (stats: AchievementStats) => boolean;
};

const questionMilestones = [50, 100, 500, 1000, 5000, 10000, 25000];
const aiChatMilestones = [5, 10, 50, 100, 200, 500];
const accuracyMilestones = [95, 90, 85, 80, 75];
const flpMilestones = [1, 5, 10, 20];
const streakMilestones = [3, 7, 30, 60, 90, 120, 150];
const correctedMcqMilestones = [5, 20, 50, 100, 250, 500];
const flashcardMilestones = [20, 50, 100, 500, 1000, 5000];

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  ...questionMilestones.map((count) => ({
    id: `mcqs_${count}`,
    name: `${count.toLocaleString()} MCQs`,
    details: `Attempt ${count.toLocaleString()} lifetime MCQs.`,
    icon: Target,
    shape: 'hexagon' as BadgeShape,
    tone: 'ocean' as BadgeTone,
    group: 'Practice' as BadgeGroup,
    isEarned: (stats) => stats.lifetimeMcqs >= count,
  })),
  ...aiChatMilestones.map((count) => ({
    id: `ai_chats_${count}`,
    name: `${count} AI Chats`,
    details: `Start ${count} Dr Ahroid AI chat sessions.`,
    icon: MessageSquare,
    shape: 'orb' as BadgeShape,
    tone: 'violet' as BadgeTone,
    group: 'AI Learning' as BadgeGroup,
    isEarned: (stats) => stats.aiChatSessions >= count,
  })),
  ...accuracyMilestones.map((accuracy) => ({
    id: `accuracy_${accuracy}`,
    name: `${accuracy}% Accuracy`,
    details: `Maintain at least ${accuracy}% accuracy after 200 MCQs.`,
    icon: ShieldCheck,
    shape: 'shield' as BadgeShape,
    tone: 'emerald' as BadgeTone,
    group: 'Precision' as BadgeGroup,
    isEarned: (stats) => stats.lifetimeMcqs >= 200 && stats.accuracy >= accuracy,
  })),
  ...flpMilestones.map((count) => ({
    id: `flp_completed_${count}`,
    name: count === 1 ? 'Complete an FLP' : `${count} FLPs Complete`,
    details: count === 1 ? 'Complete your first Full-Length Paper.' : `Complete ${count} Full-Length Papers.`,
    icon: ScrollText,
    shape: 'rosette' as BadgeShape,
    tone: 'fuchsia' as BadgeTone,
    group: 'Papers' as BadgeGroup,
    isEarned: (stats) => stats.flpCompletions >= count,
  })),
  ...streakMilestones.map((days) => ({
    id: `streak_${days}`,
    name: `${days} Day Streak`,
    details: `Maintain a ${days} day study streak.`,
    icon: Flame,
    shape: 'rosette' as BadgeShape,
    tone: 'ember' as BadgeTone,
    group: 'Consistency' as BadgeGroup,
    isEarned: (stats) => stats.currentStreak >= days,
  })),
  ...correctedMcqMilestones.map((count) => ({
    id: `corrected_mcqs_${count}`,
    name: `${count} MCQs Corrected`,
    details: `Correct ${count} MCQs in correction mode.`,
    icon: BookOpenCheck,
    shape: 'shield' as BadgeShape,
    tone: 'rose' as BadgeTone,
    group: 'Practice' as BadgeGroup,
    isEarned: (stats) => stats.correctedMcqs >= count,
  })),
  ...flashcardMilestones.map((count) => ({
    id: `flashcards_generated_${count}`,
    name: `${count.toLocaleString()} Flashcards`,
    details: `Generate ${count.toLocaleString()} AI learning flashcards.`,
    icon: Library,
    shape: 'hexagon' as BadgeShape,
    tone: 'cyan' as BadgeTone,
    group: 'AI Learning' as BadgeGroup,
    isEarned: (stats) => stats.flashcardsGenerated >= count,
  })),
  {
    id: 'dr_ahroid_question_help',
    name: 'Guided By Dr Ahroid',
    details: 'Use Help with current question while solving an MCQ.',
    icon: HelpCircle,
    shape: 'orb',
    tone: 'amber',
    group: 'AI Learning',
    isEarned: (stats) => stats.aiQuestionHelpCount >= 1,
  },
  {
    id: 'fast_correct_under_15',
    name: '15 Second Strike',
    details: 'Answer a question correctly in under 15 seconds.',
    icon: Zap,
    shape: 'rosette',
    tone: 'crimson',
    group: 'Precision',
    isEarned: (stats) => stats.fastCorrectCount >= 1,
  },
  {
    id: 'saved_25_mcqs',
    name: 'Question Collector',
    details: 'Save 25 MCQs for revision.',
    icon: Award,
    shape: 'shield',
    tone: 'indigo',
    group: 'Practice',
    isEarned: (stats) => stats.savedMcqs >= 25,
  },
  {
    id: 'first_battle_win',
    name: 'Battle Winner',
    details: 'Win your first battle.',
    icon: Swords,
    shape: 'shield',
    tone: 'purple',
    group: 'Community',
    isEarned: (stats) => stats.battleWins >= 1,
  },
  {
    id: 'invite_a_friend',
    name: 'Social Butterfly',
    details: 'Invite a friend to join Medmacs.',
    icon: UserPlus,
    shape: 'orb',
    tone: 'pink',
    group: 'Community',
    isEarned: (stats) => stats.referralCount >= 1,
  },
];

export const defaultStats: AchievementStats = {
  lifetimeMcqs: 0,
  correctMcqs: 0,
  flpCompletions: 0,
  aiChatSessions: 0,
  points: 0,
  accuracy: 0,
  aiQuestionHelpCount: 0,
  fastCorrectCount: 0,
  savedMcqs: 0,
  battleWins: 0,
  currentStreak: 0,
  correctedMcqs: 0,
  flashcardsGenerated: 0,
  referralCount: 0,
};

/** Unlocked first, definition order within each group so nothing shuffles between renders. */
export const sortEarnedFirst = (badges: BadgeDefinition[], earnedIds: Set<string>) =>
  [...badges].sort((first, second) => Number(earnedIds.has(second.id)) - Number(earnedIds.has(first.id)));
