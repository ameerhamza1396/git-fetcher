export const isAiPolicyNotice = (text = '') =>
  /\b(ai|feature|plan|quota|usage|request|requests|login|sign in|subscription|access)\b.{0,80}\b(not available|unavailable|reached|exceeded|required|disabled|not enabled|upgrade|current plan)\b/i.test(text) ||
  /\b(not available|unavailable|reached|exceeded|required|disabled|not enabled|upgrade|current plan)\b.{0,80}\b(ai|feature|plan|quota|usage|request|requests|login|sign in|subscription|access)\b/i.test(text);
