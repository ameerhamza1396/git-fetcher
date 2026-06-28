import { useCallback, useEffect, useState } from 'react';
import {
  getOfflineChapterStatus,
  OfflineChapterStatus,
  subscribeOfflineChapterChanges,
} from '@/utils/offlineChapters';

export const useOfflineChapterStatus = (chapterId?: string | null) => {
  const [status, setStatus] = useState<OfflineChapterStatus>('idle');

  const refresh = useCallback(async () => {
    if (!chapterId) {
      setStatus('idle');
      return;
    }
    setStatus(await getOfflineChapterStatus(chapterId));
  }, [chapterId]);

  useEffect(() => {
    refresh();
    return subscribeOfflineChapterChanges(refresh);
  }, [refresh]);

  return { status, refresh };
};

