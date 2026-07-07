import { parseAccentText } from '../lib/parse-accent-text';

interface AccentTextProps {
  text: string;
  accentClass: string;
  className?: string;
}

export default function AccentText({ text, accentClass, className }: AccentTextProps) {
  const parts = parseAccentText(text);
  if (parts.length === 0) return null;

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.type === 'highlight' ? (
          <span key={index} className={`font-semibold ${accentClass}`}>
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  );
}
