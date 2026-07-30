import { Stethoscope } from 'lucide-react';
import { isSpecializedTestInstitute } from '@/utils/institutes';
import type { DashboardInstitute } from '../types';

export function InstituteDetailCard({ institute }: { institute: DashboardInstitute }) {
  if (!institute) return null;
  const specializedTest = isSpecializedTestInstitute(institute);

  return (
    <div className="relative overflow-hidden rounded-[2rem] h-32 mb-6 group shadow-xl">
      {institute.image_url ? (
        <img
          src={institute.image_url}
          alt={institute.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#2dd4bf] to-[#0ea5e9]" />
      )}
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
      <div className="relative z-10 h-full flex flex-col justify-end p-6">
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope className="w-4 h-4 text-[#2dd4bf]" />
          <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">
            {specializedTest ? 'Your Specialized Test' : 'Your Institute'}
          </span>
        </div>
        <h3 className="text-lg font-black text-white tracking-tight leading-tight">{institute.name}</h3>
      </div>
    </div>
  );
}
