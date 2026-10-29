'use client';

import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

export function MarkdownPreview({ markdown }: { markdown: string }) {
  if (!markdown) {
    return null;
  }

  return (
    <div className="prose prose-neutral mx-auto max-w-[820px] text-[14.5px] leading-[1.9] text-foreground/80 dark:prose-invert prose-headings:font-sans prose-headings:font-semibold prose-p:my-3.5 prose-blockquote:border-l-2 prose-blockquote:border-primary prose-blockquote:bg-primary/[0.06] prose-blockquote:py-2.5 prose-blockquote:pr-4 prose-blockquote:text-foreground/70 prose-code:font-mono">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
