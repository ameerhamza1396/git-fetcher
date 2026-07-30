import { Megaphone } from 'lucide-react';
import type { DashboardAnnouncement } from '../types';

type DashboardAnnouncementCardProps = {
  announcement: DashboardAnnouncement;
  onOpen: () => void;
};

export function DashboardAnnouncementCard({ announcement, onOpen }: DashboardAnnouncementCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative overflow-hidden rounded-[2rem] h-32 mb-6 w-full text-left shadow-xl active:scale-[0.98] transition-all group"
    >
      {announcement.card_background_image_url ? (
        <img
          src={announcement.card_background_image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#0d9488] to-[#0284c7]" />
      )}
      <div className="absolute inset-0 bg-black/35" />
      {announcement.card_secondary_image_url && (
        <img
          src={announcement.card_secondary_image_url}
          alt=""
          className="absolute right-2 bottom-0 h-[92%] max-w-[42%] object-contain drop-shadow-2xl"
        />
      )}
      <div className="relative z-10 h-full flex flex-col justify-end p-5 pr-[42%]">
        <div className="flex items-center gap-1.5 mb-1">
          <Megaphone className="w-3.5 h-3.5 text-[#2dd4bf]" />
          <span className="text-[10px] font-black text-white/65 uppercase tracking-[0.18em]">Announcement</span>
        </div>
        <h3 className="text-lg font-black text-white tracking-tight leading-tight line-clamp-1">
          {announcement.card_heading}
        </h3>
        <p className="text-white/70 text-[11px] leading-relaxed line-clamp-2 mt-1">
          {announcement.card_subheading}
        </p>
      </div>
    </button>
  );
}
