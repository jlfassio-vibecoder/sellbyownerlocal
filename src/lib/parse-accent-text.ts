export type AccentTextPart = {
  type: 'plain' | 'highlight';
  text: string;
};

/**
 * Splits text on ==highlight== markers. Unmatched `==` remain plain text.
 * Does not parse HTML — safe for React/Astro text children.
 */
export function parseAccentText(text: string): AccentTextPart[] {
  if (!text) return [];

  const parts: AccentTextPart[] = [];
  const pattern = /==([^=]+)==/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  pattern.lastIndex = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'plain', text: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'highlight', text: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'plain', text: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'plain', text }];
}
