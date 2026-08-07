import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split into block sections by double newlines or single newlines depending on structure
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!currentList) return;
    const ListTag = currentList.type;
    const listElements = (
      <ListTag
        key={key}
        className={`my-4 pl-6 space-y-2 text-slate-700 ${
          currentList.type === 'ul' ? 'list-disc' : 'list-decimal'
        }`}
      >
        {currentList.items.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {formatInlineText(item)}
          </li>
        ))}
      </ListTag>
    );
    elements.push(listElements);
    currentList = null;
  };

  const formatInlineText = (text: string): React.ReactNode[] => {
    // Process bold (**text**) and italic (*text*) and code (`text`)
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /(\*\*(.*?)\*\*|\*(.*?)\*|`(.*?)`)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      if (match[1].startsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-bold text-[#043c44]">
            {match[2]}
          </strong>
        );
      } else if (match[1].startsWith('*')) {
        parts.push(
          <em key={match.index} className="italic text-slate-800">
            {match[3]}
          </em>
        );
      } else if (match[1].startsWith('`')) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-teal-50 text-[#0d9488] border border-teal-200/60 text-xs font-mono"
          >
            {match[4]}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Code Block Toggle
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${index}`}
            className="p-4 my-4 rounded-xl bg-slate-900 text-teal-300 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner"
          >
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushList(`list-pre-${index}`);
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***') {
      flushList(`list-hr-${index}`);
      elements.push(<hr key={`hr-${index}`} className="my-8 border-slate-200/80" />);
      return;
    }

    // Headers
    if (trimmed.startsWith('# ')) {
      flushList(`list-h1-${index}`);
      elements.push(
        <h1
          key={`h1-${index}`}
          className="font-heading text-3xl font-extrabold text-[#043c44] mt-8 mb-4 tracking-tight leading-snug"
        >
          {formatInlineText(trimmed.replace('# ', ''))}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList(`list-h2-${index}`);
      elements.push(
        <h2
          key={`h2-${index}`}
          className="font-heading text-2xl font-bold text-[#043c44] mt-7 mb-3 tracking-tight"
        >
          {formatInlineText(trimmed.replace('## ', ''))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList(`list-h3-${index}`);
      elements.push(
        <h3
          key={`h3-${index}`}
          className="font-heading text-lg font-semibold text-[#043c44] mt-5 mb-2"
        >
          {formatInlineText(trimmed.replace('### ', ''))}
        </h3>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList(`list-bq-${index}`);
      elements.push(
        <blockquote
          key={`bq-${index}`}
          className="p-4 my-4 rounded-xl bg-teal-50/70 border-l-4 border-[#0d9488] text-slate-700 italic text-sm space-y-1 shadow-xs"
        >
          {formatInlineText(trimmed.replace('> ', ''))}
        </blockquote>
      );
      return;
    }

    // Unordered List (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.substring(2);
      if (!currentList || currentList.type !== 'ul') {
        flushList(`list-change-${index}`);
        currentList = { type: 'ul', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      return;
    }

    // Ordered List (1. 2. etc.)
    const olMatch = trimmed.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      const itemText = olMatch[1];
      if (!currentList || currentList.type !== 'ol') {
        flushList(`list-change-${index}`);
        currentList = { type: 'ol', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      return;
    }

    // Normal Text Paragraph
    if (trimmed.length > 0) {
      flushList(`list-[#043c44]-${index}`);
      elements.push(
        <p key={`p-${index}`} className="my-3 text-slate-600 leading-relaxed text-base">
          {formatInlineText(line)}
        </p>
      );
    } else {
      flushList(`list-space-${index}`);
    }
  });

  flushList('list-end');

  return <div className="prose prose-slate max-w-none space-y-1">{elements}</div>;
};
