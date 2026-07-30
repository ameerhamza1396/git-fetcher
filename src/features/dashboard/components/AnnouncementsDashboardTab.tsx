import { BellRing, ScrollText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Announcement } from '../types';

type AnnouncementsDashboardTabProps = {
  announcements?: Announcement[];
  isLoading: boolean;
};

export function AnnouncementsDashboardTab({ announcements, isLoading }: AnnouncementsDashboardTabProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">📢 Announcements</h1>
      <p className="text-xs text-muted-foreground">Latest news & updates</p>
      {isLoading && (
        <div className="flex justify-center py-12">
          <BellRing className="h-6 w-6 animate-bounce text-muted-foreground" />
        </div>
      )}
      {announcements?.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <ScrollText className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">No announcements yet</p>
        </div>
      )}
      {announcements?.map((announcement) => (
        <Card key={announcement.id} className="border border-border/40 shadow-sm bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BellRing className="h-3.5 w-3.5 text-primary" />
              {announcement.title}
            </CardTitle>
            <CardDescription className="text-[11px]">
              {new Date(announcement.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
            {announcement.media_url?.match(/\.(jpeg|jpg|png|gif|webp)$/i) && (
              <img src={announcement.media_url} alt="" className="w-full rounded-xl mt-3 max-h-48 object-cover" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
