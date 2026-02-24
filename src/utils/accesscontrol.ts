// src/utils/accessControl.ts
export function getAccessibleChapters<T>(
  chapters: T[],
  userRole: 'free' | 'premium' | 'iconic'
): T[] {
  if (userRole === 'free') {
    return chapters.slice(0, 2);
  }
  return chapters;
}
