import type { DetailsSection } from './details-nav-types';

interface MobilePillNavProps {
  sections: DetailsSection[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function MobilePillNav({ sections, activeId, onSelect }: MobilePillNavProps) {
  return (
    <nav
      className="sticky top-0 z-40 flex shrink-0 gap-2 overflow-x-auto whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-3 md:hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      aria-label="Listing sections"
    >
      {sections.map((s) => {
        const isActive = activeId === s.id;

        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-current={isActive ? 'true' : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-indigo-500 text-white'
                : 'border border-slate-300 bg-white text-slate-600'
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
