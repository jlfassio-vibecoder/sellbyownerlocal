import { useRef } from 'react';
import AutoTextarea from './AutoTextarea';
import MarkdownToolbar from './MarkdownToolbar';

interface MarkdownTextareaProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  showHint?: boolean;
}

export default function MarkdownTextarea({
  value,
  onChange,
  className = '',
  placeholder,
  id,
  showHint = true,
}: MarkdownTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div>
      <MarkdownToolbar
        value={value}
        onChange={onChange}
        textareaRef={textareaRef}
        textareaId={id}
      />
      <AutoTextarea
        ref={textareaRef}
        id={id}
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={(event) => onChange(event.target.value)}
      />
      {showHint ? (
        <p className="mt-2 text-xs text-slate-400 italic">
          Supports <strong className="font-semibold text-slate-500">bold</strong>,{' '}
          <em className="italic text-slate-500">italic</em>, ==accent==, and - lists.
        </p>
      ) : null}
    </div>
  );
}
