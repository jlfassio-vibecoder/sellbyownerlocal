import { parseMarkdownBlocks, renderInlineMarkdown } from '../lib/parse-markdown';

interface MarkdownTextProps {
  text: string;
  accentClass: string;
  className?: string;
  /** Render inline spans only (for headings); no block paragraphs or lists. */
  inline?: boolean;
}

export default function MarkdownText({ text, accentClass, className, inline }: MarkdownTextProps) {
  if (inline) {
    return <span className={className}>{renderInlineMarkdown(text, accentClass)}</span>;
  }

  const blocks = parseMarkdownBlocks(text);
  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === 'list') {
          return (
            <ul key={index} className="my-2 list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="text-slate-700">
                  {renderInlineMarkdown(item, accentClass)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="mb-2 last:mb-0">
            {renderInlineMarkdown(block.content, accentClass)}
          </p>
        );
      })}
    </div>
  );
}
