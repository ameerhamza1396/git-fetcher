export type AiLoadingIntent = 'analytics' | 'team' | 'references' | 'mcqs' | 'profile' | 'general';

const loadingCopy: Record<AiLoadingIntent, string[]> = {
  analytics: [
    'Dr Ahroid is analysing your performance',
    'Dr Ahroid is reviewing your recent accuracy',
    'Dr Ahroid is finding patterns in your attempts',
    'Dr Ahroid is checking where your next focus should be',
  ],
  team: [
    'Dr Ahroid is checking the Medmacs team directory',
    'Dr Ahroid is looking up team roles',
    'Dr Ahroid is verifying who handles what at Medmacs',
    'Dr Ahroid is gathering the latest team details',
  ],
  references: [
    'Dr Ahroid is reading book references',
    'Dr Ahroid is comparing trusted study material',
    'Dr Ahroid is preparing a referenced summary',
    'Dr Ahroid is checking the relevant book context',
  ],
  mcqs: [
    'Dr Ahroid is checking related MCQs',
    'Dr Ahroid is reviewing question patterns',
    'Dr Ahroid is looking for the best practice context',
    'Dr Ahroid is matching your query with MCQ data',
  ],
  profile: [
    'Dr Ahroid is checking your profile status',
    'Dr Ahroid is reviewing your account details',
    'Dr Ahroid is confirming your study setup',
    'Dr Ahroid is loading your personal context',
  ],
  general: [
    'Dr Ahroid is thinking',
    'Dr Ahroid is preparing your answer',
    'Dr Ahroid is checking the best explanation',
    'Dr Ahroid is shaping a clear response',
  ],
};

const preseedReplies: Record<AiLoadingIntent, string[]> = {
  analytics: [
    'I am checking your performance now. Let me look at the pattern first.',
    'Let me review your stats and see what they are pointing toward.',
    'I am looking into your recent attempts so I can guide you properly.',
    'Give me a moment, I am checking where your performance needs attention.',
  ],
  team: [
    'I am checking the latest team details for you.',
    'Let me look that up from the Medmacs team records.',
    'I am verifying the team information before answering.',
    'Give me a moment, I am checking who handles that.',
  ],
  references: [
    'I am checking the book references first.',
    'Let me look into the study material before I summarize it.',
    'I am reviewing the relevant references so I can keep this accurate.',
    'Give me a moment, I am matching this with the book context.',
  ],
  mcqs: [
    'I am checking the related MCQs first.',
    'Let me review the question data before I answer.',
    'I am looking at the relevant practice context.',
    'Give me a moment, I am checking the MCQ pattern.',
  ],
  profile: [
    'I am checking your account details first.',
    'Let me confirm your profile status before answering.',
    'I am reviewing your study setup now.',
    'Give me a moment, I am checking your personal context.',
  ],
  general: [
    'I am checking into it. Let me see.',
    'Give me a moment, I am looking at this carefully.',
    'Let me think this through and answer clearly.',
    'I am working on it now.',
  ],
};

export const getAiLoadingIntent = (text: string): AiLoadingIntent => {
  const query = text.toLowerCase();
  if (/(stat|analytics|performance|accuracy|attempt|progress|weak|strong|score|result)/.test(query)) return 'analytics';
  if (/(team|founder|developer|position|role|staff|hmacs)/.test(query)) return 'team';
  if (/(book|reference|rag|summary|chapter|source|explain from|according to)/.test(query)) return 'references';
  if (/(mcq|question|answer|option|practice|test)/.test(query)) return 'mcqs';
  if (/(profile|account|plan|status|subscription|expiry|institute|province)/.test(query)) return 'profile';
  return 'general';
};

export const getAiLoadingLines = (intent: AiLoadingIntent) => loadingCopy[intent];

export const getAiPreseedReply = (intent: AiLoadingIntent, text: string) => {
  const replies = preseedReplies[intent];
  const index = Array.from(text).reduce((sum, char) => sum + char.charCodeAt(0), 0) % replies.length;
  return replies[index];
};
