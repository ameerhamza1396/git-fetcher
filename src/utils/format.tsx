import { ReactNode } from "react";

export const parseBoldText = (text: string): ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const renderInline = (text: string): ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4 hover:text-primary/80">{linkMatch[1]}</a>;
    }
    return part;
  });
};

type MarkdownOptions = {
  skipFirstH1?: boolean;
};

export const renderMarkdown = (markdown: string, options: MarkdownOptions = {}): ReactNode => {
  const lines = markdown.trim().split('\n');
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];
  let skippedFirstH1 = false;

  const flushList = (listKey: number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={listKey} className="mb-5 list-disc space-y-2 pl-5 text-[15px] leading-7 marker:text-primary/70">
          {listItems.map((item, index) => (
            <li key={`${listKey}-${index}`} className="pl-1 text-muted-foreground">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushParagraph = (paragraphKey: number) => {
    if (paragraphLines.length === 0) return;

    const text = paragraphLines.join(' ');
    const isLastUpdated = text.startsWith('**Last updated:**');

    elements.push(
      <p
        key={paragraphKey}
        className={
          isLastUpdated
            ? "mb-6 inline-flex rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
            : "mb-4 text-[15px] leading-7 text-muted-foreground"
        }
      >
        {renderInline(text)}
      </p>
    );
    paragraphLines = [];
  };

  const flushText = () => {
    flushList(elementKey++);
    flushParagraph(elementKey++);
  };

  let elementKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const headingMatch = trimmedLine.match(/^(#{1,4})\s+(.+)$/);
    const listMatch = line.match(/^\s*[*-]\s+(.+)$/);

    if (headingMatch) {
      flushText();

      const level = headingMatch[1].length;
      const content = headingMatch[2];

      if (level === 1 && options.skipFirstH1 && !skippedFirstH1) {
        skippedFirstH1 = true;
        continue;
      }

      if (level === 1) {
        elements.push(<h1 key={elementKey++} className="mb-5 mt-2 text-3xl font-bold tracking-tight text-foreground">{renderInline(content)}</h1>);
      } else if (level === 2) {
        elements.push(<h2 key={elementKey++} className="mb-3 mt-10 border-t border-border/70 pt-8 text-2xl font-bold tracking-tight text-foreground first:mt-0 first:border-t-0 first:pt-0">{renderInline(content)}</h2>);
      } else if (level === 3) {
        elements.push(<h3 key={elementKey++} className="mb-3 mt-6 text-lg font-semibold text-foreground">{renderInline(content)}</h3>);
      } else {
        elements.push(<h4 key={elementKey++} className="mb-2 mt-5 text-base font-semibold text-foreground">{renderInline(content)}</h4>);
      }
    } else if (listMatch) {
      flushParagraph(elementKey++);
      listItems.push(listMatch[1].trim());
    } else if (listItems.length > 0 && /^\s{2,}\S/.test(line)) {
      listItems[listItems.length - 1] = `${listItems[listItems.length - 1]} ${trimmedLine}`;
    } else if (trimmedLine === '---') {
      flushText();
      elements.push(<hr key={elementKey++} className="my-8 border-border/70" />);
    } else if (trimmedLine === '') {
      flushText();
    } else {
      flushList(elementKey++);
      paragraphLines.push(trimmedLine);
    }
  }
  flushText();

  return <>{elements}</>;
};
