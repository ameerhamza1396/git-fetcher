import { supabase } from '@/integrations/supabase/client';

type QueuedMCQAnswer = {
  id: string;
  user_id: string;
  mcq_id: string;
  selected_answer: string;
  is_correct: boolean;
  time_taken: number;
  used_ai_help: boolean;
  correction_mode: boolean;
  queued_at: string;
};

const DB_NAME = 'medmacs-offline-answer-sync';
const DB_VERSION = 1;
const ANSWER_STORE = 'mcq_answers';
const SYNC_EVENT = 'medmacs-offline-answers-changed';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = () => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('Offline answer sync is unavailable on this device.');
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ANSWER_STORE)) {
        const store = db.createObjectStore(ANSWER_STORE, { keyPath: 'id' });
        store.createIndex('user_id', 'user_id', { unique: false });
        store.createIndex('mcq_id', 'mcq_id', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

const emitSyncChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  }
};

export const subscribeOfflineAnswerChanges = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(SYNC_EVENT, callback);
  return () => window.removeEventListener(SYNC_EVENT, callback);
};

const getAllQueuedAnswers = async () => {
  try {
    const db = await openDb();
    return await requestToPromise<QueuedMCQAnswer[]>(
      db.transaction(ANSWER_STORE, 'readonly').objectStore(ANSWER_STORE).getAll(),
    );
  } catch {
    return [];
  }
};

const deleteQueuedAnswer = async (id: string) => {
  const db = await openDb();
  const transaction = db.transaction(ANSWER_STORE, 'readwrite');
  transaction.objectStore(ANSWER_STORE).delete(id);
  await transactionDone(transaction);
};

export const queueMCQAnswerForSync = async (
  answer: Omit<QueuedMCQAnswer, 'id' | 'queued_at'>,
) => {
  const db = await openDb();
  const queued: QueuedMCQAnswer = {
    ...answer,
    id: `${answer.user_id}:${answer.mcq_id}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    queued_at: new Date().toISOString(),
  };

  const transaction = db.transaction(ANSWER_STORE, 'readwrite');
  transaction.objectStore(ANSWER_STORE).put(queued);
  await transactionDone(transaction);
  emitSyncChange();
};

export const getQueuedMCQAnswerMap = async (userId: string, mcqIds: string[]) => {
  const idSet = new Set(mcqIds);
  const queued = await getAllQueuedAnswers();

  return queued.reduce<Record<string, { selectedAnswer: string }>>((acc, answer) => {
    if (answer.user_id === userId && idSet.has(answer.mcq_id)) {
      acc[answer.mcq_id] = { selectedAnswer: answer.selected_answer };
    }
    return acc;
  }, {});
};

export const getQueuedMCQAnswerCount = async () => {
  return (await getAllQueuedAnswers()).length;
};

export const syncQueuedMCQAnswers = async () => {
  const queued = await getAllQueuedAnswers();
  if (queued.length === 0) return { synced: 0, remaining: 0 };

  let synced = 0;

  for (const answer of queued) {
    const { id, queued_at, ...row } = answer;
    const { error } = await supabase.from('user_answers').insert(row);

    if (error) {
      continue;
    }

    await deleteQueuedAnswer(id);
    synced += 1;
  }

  if (synced > 0) emitSyncChange();
  return { synced, remaining: queued.length - synced };
};

