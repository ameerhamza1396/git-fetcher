import { MouseEvent, useState } from 'react';
import { Download, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Chapter, Subject } from '@/utils/mcqData';
import {
  deleteOfflineChapter,
  downloadChapterForOffline,
} from '@/utils/offlineChapters';
import { useOfflineChapterStatus } from '@/hooks/useOfflineChapterStatus';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ChapterDownloadButtonProps = {
  subject: Subject;
  chapter: Chapter;
  compact?: boolean;
  className?: string;
};

export const ChapterDownloadButton = ({
  subject,
  chapter,
  compact = false,
  className = '',
}: ChapterDownloadButtonProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { status, refresh } = useOfflineChapterStatus(chapter.id);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const stopCardClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDownload = async (event: MouseEvent) => {
    stopCardClick(event);

    if (status === 'downloaded') {
      setConfirmDeleteOpen(true);
      return;
    }
    if (status === 'downloading') return;

    try {
      await downloadChapterForOffline(subject, chapter, user?.id);
      toast({
        title: 'Chapter downloaded',
        description: `${chapter.name} is available for offline use.`,
      });
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error?.message || 'Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      refresh();
    }
  };

  const handleDelete = async () => {
    await deleteOfflineChapter(chapter.id);
    setConfirmDeleteOpen(false);
    refresh();
    toast({
      title: 'Offline chapter deleted',
      description: `${chapter.name} was removed from offline storage.`,
    });
  };

  const isDownloading = status === 'downloading';
  const isDownloaded = status === 'downloaded';
  const Icon = isDownloading ? Loader2 : isDownloaded ? CheckCircle2 : Download;
  const label = isDownloading ? 'Downloading' : isDownloaded ? 'Downloaded' : 'Download';

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={isDownloaded ? 'default' : 'outline'}
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={`${label} ${chapter.name} for offline use`}
        title={`${label} for offline use`}
        className={`${compact ? 'h-9 w-9 rounded-xl p-0' : 'h-10 rounded-xl px-3'} ${
          isDownloaded ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-background/80'
        } ${className}`}
      >
        <Icon className={`${compact ? 'h-4 w-4' : 'mr-2 h-4 w-4'} ${isDownloading ? 'animate-spin' : ''}`} />
        {!compact && <span className="text-xs font-black uppercase tracking-wider">{label}</span>}
      </Button>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="rounded-3xl border-border/40 bg-background p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black italic">Delete Offline Chapter?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the encrypted offline copy of {chapter.name}. You can download it again anytime while online.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-2xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-2xl bg-red-600 font-black text-white hover:bg-red-700">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
