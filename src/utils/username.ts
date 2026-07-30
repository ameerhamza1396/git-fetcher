export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[a-z0-9_.-]+$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function getUsernameValidationError(value: string): string {
  const username = normalizeUsername(value);
  if (!username) return 'Username cannot be empty';
  if (username.length < USERNAME_MIN_LENGTH) return `At least ${USERNAME_MIN_LENGTH} characters`;
  if (username.length > USERNAME_MAX_LENGTH) return `Maximum ${USERNAME_MAX_LENGTH} characters`;
  if (!USERNAME_PATTERN.test(username)) return 'Use lowercase letters, numbers, _, -, or . only';
  return '';
}

export function isUsernameConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === '23505' || /username.*(unique|already|duplicate)/i.test(candidate.message || '');
}
