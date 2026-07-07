export type MarkdownWrapType = 'bold' | 'italic' | 'accent' | 'bullet';

export type MarkdownWrapResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

const WRAP_MARKERS: Record<Exclude<MarkdownWrapType, 'bullet'>, { before: string; after: string }> =
  {
    bold: { before: '**', after: '**' },
    italic: { before: '_', after: '_' },
    accent: { before: '==', after: '==' },
  };

function wrapSelection(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string
): MarkdownWrapResult {
  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));
  const selected = text.slice(start, end);

  if (selected.length > 0) {
    const value = text.slice(0, start) + before + selected + after + text.slice(end);
    return {
      value,
      selectionStart: start + before.length,
      selectionEnd: start + before.length + selected.length,
    };
  }

  const value = text.slice(0, start) + before + after + text.slice(end);
  const cursor = start + before.length;
  return { value, selectionStart: cursor, selectionEnd: cursor };
}

function getLineBounds(text: string, index: number) {
  const safeIndex = Math.max(0, Math.min(index, text.length));
  const lineStart = text.lastIndexOf('\n', safeIndex - 1) + 1;
  const nextBreak = text.indexOf('\n', safeIndex);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  return { lineStart, lineEnd };
}

function applyBulletWrap(
  text: string,
  selectionStart: number,
  selectionEnd: number
): MarkdownWrapResult {
  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));

  let rangeStart = start;
  let rangeEnd = end;

  if (start === end) {
    const { lineStart, lineEnd } = getLineBounds(text, start);
    rangeStart = lineStart;
    rangeEnd = lineEnd;
  } else if (text.slice(start, end).includes('\n')) {
    rangeStart = text.lastIndexOf('\n', start - 1) + 1;
    const nextBreak = text.indexOf('\n', end);
    rangeEnd = nextBreak === -1 ? text.length : nextBreak;
  }

  const block = text.slice(rangeStart, rangeEnd);
  const lines = block.split('\n');
  const updatedLines = lines.map((line) => {
    if (line.trim() === '' || line.startsWith('- ')) return line;
    return `- ${line}`;
  });
  const updatedBlock = updatedLines.join('\n');
  const value = text.slice(0, rangeStart) + updatedBlock + text.slice(rangeEnd);

  return {
    value,
    selectionStart: rangeStart,
    selectionEnd: rangeStart + updatedBlock.length,
  };
}

export function applyMarkdownWrap(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  wrap: MarkdownWrapType
): MarkdownWrapResult {
  if (wrap === 'bullet') {
    return applyBulletWrap(text, selectionStart, selectionEnd);
  }

  const markers = WRAP_MARKERS[wrap];
  return wrapSelection(text, selectionStart, selectionEnd, markers.before, markers.after);
}
