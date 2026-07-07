import { useCallback, type RefObject } from 'react';
import { Bold, Flag, Italic, List } from 'lucide-react';
import { applyMarkdownWrap, type MarkdownWrapType } from '../../../lib/markdown-selection';

interface MarkdownToolbarProps {
  value: string;
  onChange: (value: string) => void;
  /** Preferred: ref to the paired textarea for selection-aware wrapping. */
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  /** Fallback: DOM id of the paired textarea when a ref is not available. */
  textareaId?: string;
}

const TOOLBAR_BUTTON_CLASS =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-slate-600 transition-colors hover:border-slate-300 hover:bg-white';

function resolveTextarea(
  textareaRef?: RefObject<HTMLTextAreaElement | null>,
  textareaId?: string
): HTMLTextAreaElement | null {
  if (textareaRef?.current) return textareaRef.current;
  if (textareaId) return document.getElementById(textareaId) as HTMLTextAreaElement | null;
  return null;
}

export default function MarkdownToolbar({
  value,
  onChange,
  textareaRef,
  textareaId,
}: MarkdownToolbarProps) {
  const handleWrap = useCallback(
    (type: MarkdownWrapType) => {
      const textarea = resolveTextarea(textareaRef, textareaId);
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;
      const result = applyMarkdownWrap(value, selectionStart, selectionEnd, type);
      onChange(result.value);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
      });
    },
    [value, onChange, textareaRef, textareaId]
  );

  return (
    <div
      className="mb-2 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
      role="toolbar"
      aria-label="Text formatting"
    >
      <button
        type="button"
        className={TOOLBAR_BUTTON_CLASS}
        title="Bold"
        aria-label="Bold"
        onClick={() => handleWrap('bold')}
      >
        <Bold size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={TOOLBAR_BUTTON_CLASS}
        title="Italic"
        aria-label="Italic"
        onClick={() => handleWrap('italic')}
      >
        <Italic size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={TOOLBAR_BUTTON_CLASS}
        title="Accent color"
        aria-label="Accent color"
        onClick={() => handleWrap('accent')}
      >
        <Flag size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={TOOLBAR_BUTTON_CLASS}
        title="Bullet list"
        aria-label="Bullet list"
        onClick={() => handleWrap('bullet')}
      >
        <List size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
