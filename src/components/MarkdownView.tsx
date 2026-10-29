import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className = '' }) => {
  return (
    <div className={`prose prose-invert max-w-none prose-headings:text-cyan-300 prose-headings:font-bold prose-p:text-slate-200 prose-p:leading-relaxed prose-strong:text-cyan-200 prose-code:text-emerald-300 prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-slate-800 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-ul:text-slate-300 prose-li:my-1.5 prose-hr:border-slate-800 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
