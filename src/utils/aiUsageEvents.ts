import { supabase } from '@/integrations/supabase/client';

type AiUsageEventInput = {
  source: string;
  eventType?: string;
  metadata?: Record<string, unknown>;
};

const estimateTokens = (value: unknown) => {
  const length = typeof value === 'number' ? value : String(value || '').length;
  return Math.max(0, Math.ceil(length / 4));
};

export const logAiUsageEvent = async ({
  source,
  metadata = {},
}: AiUsageEventInput) => {
  try {
    const { data } = await supabase.auth.getUser();
    const promptTokens = estimateTokens(metadata.promptLength);
    const completionTokens = estimateTokens(metadata.responseLength);

    await (supabase.from('ai_usage_events') as any).insert({
      user_id: data.user?.id || null,
      feature: source,
      provider: typeof metadata.provider === 'string' ? metadata.provider : 'medmacs-ai',
      model: typeof metadata.model === 'string' ? metadata.model : null,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    });
  } catch (error) {
    console.warn('AI usage event logging failed:', error);
  }
};
