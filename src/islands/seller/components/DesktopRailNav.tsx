import { useState } from 'react';
import {
  Check,
  Circle,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Gauge,
  Images,
  PanelLeft,
  PanelLeftClose,
  Sparkles,
  Star,
  TrendingUp,
  Video,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { DetailsSection } from './details-nav-types';

interface DesktopRailNavProps {
  vehicleId: string;
  publicListingPath: string;
  sections: DetailsSection[];
  activeId: string;
  onSelect: (id: string) => void;
}

const SECTION_ICONS: Record<string, LucideIcon> = {
  basics: Gauge,
  overview: FileText,
  mechanical: Wrench,
  upgrades: Sparkles,
  market: TrendingUp,
  highlights: Star,
  video: Video,
  gallery: Images,
  documents: FolderOpen,
};

function CompleteIcon({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${
        isActive ? 'bg-black/25' : 'bg-white/10'
      }`}
      aria-hidden="true"
    >
      <Check size={11} strokeWidth={3} className="text-emerald-400" />
    </span>
  );
}

export default function DesktopRailNav({
  vehicleId,
  publicListingPath,
  sections,
  activeId,
  onSelect,
}: DesktopRailNavProps) {
  const [isRailOpen, setIsRailOpen] = useState(true);

  const completeCount = sections.filter((s) => s.complete).length;
  const pct = Math.round((completeCount / sections.length) * 100);

  return (
    <nav
      className={`hidden md:flex shrink-0 flex-col overflow-hidden bg-slate-800 transition-all duration-300 ${
        isRailOpen ? 'w-64' : 'w-16'
      }`}
    >
      <div
        className={`flex shrink-0 items-center border-b border-slate-700/50 ${
          isRailOpen ? 'justify-between gap-2 px-3 py-3' : 'flex-col justify-center gap-2 py-3'
        }`}
      >
        <div className="flex items-center gap-1">
          <a
            href={publicListingPath}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center rounded-lg text-slate-300 transition-colors hover:bg-slate-700/60 hover:text-white ${
              isRailOpen ? 'gap-1.5 px-2 py-1.5 text-xs font-medium' : 'p-2'
            }`}
            title="View public listing"
          >
            <ExternalLink size={isRailOpen ? 16 : 20} aria-hidden="true" />
            {isRailOpen ? <span>View Live</span> : <span className="sr-only">View public listing</span>}
          </a>
          <a
            href={`/seller/vehicles/${vehicleId}/preview`}
            className={`flex items-center rounded-lg text-slate-300 transition-colors hover:bg-slate-700/60 hover:text-white ${
              isRailOpen ? 'gap-1.5 px-2 py-1.5 text-xs font-medium' : 'p-2'
            }`}
            title="Preview listing"
          >
            <Eye size={isRailOpen ? 16 : 20} aria-hidden="true" />
            {isRailOpen ? <span>Preview</span> : <span className="sr-only">Preview listing</span>}
          </a>
        </div>
        <button
          type="button"
          onClick={() => setIsRailOpen((open) => !open)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/60 hover:text-white"
          aria-label={isRailOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isRailOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
        </button>
      </div>

      {isRailOpen && (
        <div className="shrink-0 px-5 pt-4 pb-5">
          <div className="text-sm font-bold text-white">Manage Listing</div>
          <div className="mt-1 text-xs text-slate-400">
            {completeCount} of {sections.length} sections complete
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {sections.map((s) => {
          const isActive = activeId === s.id;
          const SectionIcon = SECTION_ICONS[s.id] ?? FileText;

          return (
            <button
              key={s.id}
              type="button"
              title={s.label}
              onClick={() => onSelect(s.id)}
              className={`flex w-full items-center rounded-lg border-2 text-sm transition-colors ${
                isRailOpen ? 'gap-3 px-3 py-2.5 text-left' : 'justify-center px-0 py-2.5'
              } ${
                isActive
                  ? 'border-white bg-indigo-500 font-bold text-white'
                  : 'border-transparent font-normal text-slate-200 hover:bg-slate-700/60'
              }`}
            >
              {isRailOpen ? (
                s.complete ? (
                  <CompleteIcon isActive={isActive} />
                ) : (
                  <Circle
                    size={18}
                    strokeWidth={1.5}
                    className={`shrink-0 ${isActive ? 'text-white/70' : 'text-slate-500'}`}
                  />
                )
              ) : (
                <SectionIcon
                  size={20}
                  className={`shrink-0 ${s.complete ? 'text-emerald-400' : isActive ? 'text-white' : 'text-slate-300'}`}
                />
              )}
              {isRailOpen && (
                <>
                  <SectionIcon size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-300'}`} />
                  <span className="flex-1 truncate leading-snug">{s.label}</span>
                </>
              )}
              {!isRailOpen && <span className="sr-only">{s.label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
