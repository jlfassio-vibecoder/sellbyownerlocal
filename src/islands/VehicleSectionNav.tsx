import { useCallback, useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

export interface NavSection {
  id: string;
  label: string;
}

interface VehicleSectionNavProps {
  pageTitle: string;
  vin?: string;
  locationCity?: string;
  backHref?: string;
  sections: NavSection[];
}

const DESKTOP_SHORTCUT_IDS = ['pitch', 'gallery', 'market', 'build-sheet', 'carfax'];

export default function VehicleSectionNav({
  pageTitle,
  vin,
  locationCity,
  backHref = '/',
  sections,
}: VehicleSectionNavProps) {
  const [activeSection, setActiveSection] = useState('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const sectionIds = sections.map((section) => section.id);
  const desktopSections = sections.filter((section) =>
    DESKTOP_SHORTCUT_IDS.includes(section.id)
  );

  const updateActiveSection = useCallback(() => {
    const scrollPosition = window.scrollY + 100;

    for (const sectionId of sectionIds) {
      const el = document.getElementById(sectionId);
      if (
        el &&
        el.offsetTop <= scrollPosition &&
        el.offsetTop + el.offsetHeight > scrollPosition
      ) {
        setActiveSection(sectionId);
        return;
      }
    }
  }, [sectionIds]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActiveSection(id);
    setIsDrawerOpen(false);
  };

  useEffect(() => {
    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection);
    return () => window.removeEventListener('scroll', updateActiveSection);
  }, [updateActiveSection]);

  useEffect(() => {
    if (isDrawerOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsDrawerOpen(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isDrawerOpen]);

  const subtitle = vin ? `VIN Verified: ${vin}` : (locationCity ?? '');

  const navLinkClass = (sectionId: string, bordered = true) =>
    [
      bordered ? 'border-b-2 pb-1' : 'border-b pb-2',
      'transition-colors',
      activeSection === sectionId
        ? 'border-red-600 text-red-600'
        : bordered
          ? 'border-transparent text-slate-400 hover:border-slate-600 hover:text-white'
          : 'border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white',
    ].join(' ');

  return (
    <>
      <nav className="sticky top-0 z-40 flex h-16 flex-shrink-0 items-center justify-between bg-slate-900 px-8 text-white shadow-sm">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xl font-bold tracking-tight">{pageTitle}</span>
              {subtitle && (
                <span className="truncate text-[10px] font-semibold tracking-[0.2em] text-red-600 uppercase">
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          <div className="hidden items-center space-x-6 text-sm font-medium md:flex">
            {desktopSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={navLinkClass(section.id)}
              >
                {section.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="ml-4 flex items-center gap-1 text-slate-400 transition-colors hover:text-white"
            >
              More <Menu size={16} />
            </button>
            <a
              href={backHref}
              className="ml-2 text-sm text-slate-400 transition-colors hover:text-white"
            >
              ← All listings
            </a>
          </div>

          <div className="flex items-center gap-4 md:hidden">
            <a href={backHref} className="text-sm text-slate-400 transition-colors hover:text-white">
              ← Back
            </a>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="text-slate-400 transition-colors hover:text-white"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed top-0 right-0 z-50 h-full w-64 transform bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="mb-8 flex justify-end">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="text-slate-400 transition-colors hover:text-white"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex flex-col space-y-6 text-sm font-medium">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={`text-left ${navLinkClass(section.id, false)}`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
