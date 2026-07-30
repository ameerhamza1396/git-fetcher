import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ShieldAlert, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchChaptersBySubject,
  fetchSubjects,
  type Chapter,
  type Subject,
} from '@/utils/mcqData';

type ChapterLock = {
  chapter_id: string;
  is_locked: boolean;
  message: string;
  updated_at: string;
};

const ChapterLocks = () => {
  const [access, setAccess] = useState<'loading' | 'allowed' | 'denied'>('loading');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [locks, setLocks] = useState<ChapterLock[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [message, setMessage] = useState('This chapter is temporarily unavailable.');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const selectedLock = useMemo(
    () => locks.find(lock => lock.chapter_id === chapterId),
    [chapterId, locks],
  );

  useEffect(() => {
    const initialize = async () => {
      const adminResult = await supabase.rpc('is_mcq_lock_admin');
      if (adminResult.error || adminResult.data !== true) {
        setAccess('denied');
        return;
      }

      const [subjectData, lockResult] = await Promise.all([
        fetchSubjects(),
        supabase.rpc('admin_list_mcq_chapter_locks'),
      ]);
      setSubjects(subjectData);
      setLocks(lockResult.data || []);
      setAccess('allowed');
    };

    void initialize();
  }, []);

  useEffect(() => {
    if (!subjectId) {
      setChapters([]);
      setChapterId('');
      return;
    }
    void fetchChaptersBySubject(subjectId).then(setChapters);
    setChapterId('');
  }, [subjectId]);

  useEffect(() => {
    setMessage(selectedLock?.message || 'This chapter is temporarily unavailable.');
  }, [selectedLock]);

  const saveLock = async (isLocked: boolean) => {
    if (!chapterId) return;
    setSaving(true);
    setStatusMessage('');
    const { error } = await supabase.rpc('admin_set_mcq_chapter_lock', {
      p_chapter_id: chapterId,
      p_is_locked: isLocked,
      p_message: message,
    });

    if (error) {
      setStatusMessage(error.message);
    } else {
      const lockResult = await supabase.rpc('admin_list_mcq_chapter_locks');
      setLocks(lockResult.data || []);
      setStatusMessage(isLocked ? 'Chapter locked.' : 'Chapter unlocked.');
    }
    setSaving(false);
  };

  if (access === 'loading') {
    return <div className="min-h-screen bg-background p-8 text-center text-muted-foreground">Checking administrator access…</div>;
  }

  if (access === 'denied') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div className="max-w-md rounded-3xl border bg-card p-8">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-xl font-black">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This control is restricted to the medmacs-supers administrator account.
          </p>
          <Button asChild className="mt-6"><Link to="/dashboard">Return to dashboard</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary">medmacs-supers</p>
            <h1 className="text-2xl font-black">Chapter access control</h1>
          </div>
          <Button asChild variant="outline"><Link to="/dashboard">Dashboard</Link></Button>
        </div>

        <div className="space-y-5 rounded-3xl border bg-card p-6 shadow-sm">
          <label className="block text-sm font-bold">
            Subject
            <select
              value={subjectId}
              onChange={event => setSubjectId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3"
            >
              <option value="">Choose a subject</option>
              {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>

          <label className="block text-sm font-bold">
            Chapter
            <select
              value={chapterId}
              onChange={event => setChapterId(event.target.value)}
              disabled={!subjectId}
              className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 disabled:opacity-50"
            >
              <option value="">Choose a chapter</option>
              {chapters.map(chapter => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.chapter_number}. {chapter.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-bold">
            Message shown to students
            <Textarea
              value={message}
              onChange={event => setMessage(event.target.value)}
              maxLength={500}
              className="mt-2 min-h-28"
            />
          </label>

          {chapterId && (
            <div className={`rounded-xl border p-3 text-sm ${
              selectedLock?.is_locked
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-700'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
            }`}>
              Current status: {selectedLock?.is_locked ? 'Locked' : 'Available'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => void saveLock(true)}
              disabled={!chapterId || saving}
              className="rounded-xl bg-amber-600 hover:bg-amber-700"
            >
              <Lock className="mr-2 h-4 w-4" /> Lock
            </Button>
            <Button
              onClick={() => void saveLock(false)}
              disabled={!chapterId || saving}
              variant="outline"
              className="rounded-xl"
            >
              <Unlock className="mr-2 h-4 w-4" /> Unlock
            </Button>
          </div>

          {statusMessage && <p className="text-center text-sm text-muted-foreground">{statusMessage}</p>}
        </div>
      </div>
    </div>
  );
};

export default ChapterLocks;
