const STORAGE_PREFIX = 'medmacs:mcq-attempt-quota:';
const PLAN_STORAGE_PREFIX = 'medmacs:mcq-plan:';

type StoredQuota = {
  date: string;
  count: number;
};

const memoryFallback = new Map<string, StoredQuota>();

export const getPakistanDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const getStorageKey = (userId: string) => `${STORAGE_PREFIX}${userId}`;

const readStoredQuota = (userId: string): StoredQuota => {
  const today = getPakistanDateKey();
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) as Partial<StoredQuota> : null;
    if (parsed?.date === today && Number.isFinite(parsed.count)) {
      return { date: today, count: Math.max(0, Math.floor(parsed.count ?? 0)) };
    }
  } catch {
    const cached = memoryFallback.get(userId);
    if (cached?.date === today) return cached;
  }
  return { date: today, count: 0 };
};

const writeStoredQuota = (userId: string, quota: StoredQuota) => {
  memoryFallback.set(userId, quota);
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(quota));
  } catch {
    // The in-memory fallback still protects the active session.
  }
};

const isServerCountFromToday = (lastResetDate: string | null | undefined) =>
  Boolean(lastResetDate) && getPakistanDateKey(new Date(lastResetDate as string)) === getPakistanDateKey();

export const mergeLocalMCQAttemptCount = (
  userId: string,
  serverCount = 0,
  lastServerResetDate?: string | null,
) => {
  const local = readStoredQuota(userId);
  const currentServerCount = isServerCountFromToday(lastServerResetDate)
    ? Math.max(0, Math.floor(serverCount))
    : 0;
  const merged = { ...local, count: Math.max(local.count, currentServerCount) };
  writeStoredQuota(userId, merged);
  return merged.count;
};

export const reserveLocalMCQAttempt = (
  userId: string,
  serverCount: number,
  lastServerResetDate: string | null,
  limit = 50,
) => {
  const count = mergeLocalMCQAttemptCount(userId, serverCount, lastServerResetDate);
  if (count >= limit) return { allowed: false, count };

  const next = { date: getPakistanDateKey(), count: count + 1 };
  writeStoredQuota(userId, next);
  return { allowed: true, count: next.count };
};

export const setLocalMCQAttemptCount = (userId: string, count: number) => {
  const quota = {
    date: getPakistanDateKey(),
    count: Math.max(0, Math.floor(count)),
  };
  writeStoredQuota(userId, quota);
  return quota.count;
};

export const getLocalMCQAttemptCount = (userId: string) => readStoredQuota(userId).count;

export const readCachedMCQPlan = (userId: string | undefined) => {
  if (!userId) return null;
  try {
    return localStorage.getItem(`${PLAN_STORAGE_PREFIX}${userId}`);
  } catch {
    return null;
  }
};

export const cacheMCQPlan = (userId: string, plan: string) => {
  try {
    localStorage.setItem(`${PLAN_STORAGE_PREFIX}${userId}`, plan.toLowerCase());
  } catch {
    // A missing plan cache only affects disconnected startup.
  }
};
