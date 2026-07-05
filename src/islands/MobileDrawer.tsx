import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
}

export default function MobileDrawer({
  isOpen,
  onClose,
  children,
  ariaLabel = 'Menu',
}: MobileDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed top-0 right-0 z-50 h-full w-64 transform bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        {...(isOpen ? { 'aria-modal': true as const } : {})}
        aria-label={ariaLabel}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="mb-8 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 transition-colors hover:text-white"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
