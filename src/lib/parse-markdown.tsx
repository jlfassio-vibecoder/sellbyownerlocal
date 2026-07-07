import type { ReactNode } from 'react';

export type MarkdownBlock =
  | { type: 'paragraph'; content: string }
  | { type: 'list'; items: string[] };

type InlinePart =
  | { type: 'plain'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'accent'; text: string };

const INLINE_PATTERN = /(\*\*[^*]+\*\*|_[^_]+_|==[^=]+==)/g;

function parseInlineParts(text: string): InlinePart[] {
  if (!text) return [];

  const parts: InlinePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'plain', text: text.slice(lastIndex, match.index) });
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push({ type: 'bold', text: token.slice(2, -2) });
    } else if (token.startsWith('_') && token.endsWith('_')) {
      parts.push({ type: 'italic', text: token.slice(1, -1) });
    } else if (token.startsWith('==') && token.endsWith('==')) {
      parts.push({ type: 'accent', text: token.slice(2, -2) });
    } else {
      parts.push({ type: 'plain', text: token });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'plain', text: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'plain', text }];
}

export function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  if (!text.trim()) return [];

  const blocks: MarkdownBlock[] = [];
  const lines = text.split('\n');
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push({ type: 'list', items: [...listItems] });
    listItems = [];
  };

  for (const line of lines) {
    const listMatch = line.match(/^- (.+)$/);
    if (listMatch) {
      listItems.push(listMatch[1] ?? '');
      continue;
    }

    flushList();

    if (line.trim() === '') {
      continue;
    }

    blocks.push({ type: 'paragraph', content: line });
  }

  flushList();
  return blocks;
}

export function renderInlineMarkdown(text: string, accentClass: string): ReactNode[] {
  return parseInlineParts(text).map((part, index) => {
    switch (part.type) {
      case 'bold':
        return (
          <strong key={index} className="font-semibold text-slate-900">
            {part.text}
          </strong>
        );
      case 'italic':
        return (
          <em key={index} className="italic">
            {part.text}
          </em>
        );
      case 'accent':
        return (
          <span key={index} className={`font-semibold ${accentClass}`}>
            {part.text}
          </span>
        );
      default:
        return <span key={index}>{part.text}</span>;
    }
  });
}
