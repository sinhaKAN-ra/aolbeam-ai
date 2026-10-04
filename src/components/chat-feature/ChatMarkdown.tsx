"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import katex from 'katex';

/**
 * Chat message renderer. Handles GitHub-flavoured Markdown (headings, tables,
 * lists, bold, code) via react-markdown, plus LaTeX math ($...$ and $$...$$)
 * rendered with KaTeX. Themed for light + dark.
 *
 * No remark-math/rehype-katex dependency: we pre-render math spans to KaTeX
 * HTML and feed them to react-markdown as raw inline HTML-free tokens via a
 * custom text splitter, keeping the dependency surface to what's installed.
 */

function renderMathToHtml(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    return display ? `$$${tex}$$` : `$${tex}$`;
  }
}

/**
 * Replace $$...$$ and $...$ with placeholder tokens, remember their rendered
 * HTML, and restore them after markdown runs. This keeps markdown and math from
 * interfering with each other.
 */
function extractMath(src: string): { text: string; math: Map<string, string> } {
  const math = new Map<string, string>();
  let i = 0;
  // Block math first.
  let text = src.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) => {
    const key = `@@MATHBLOCK${i++}@@`;
    math.set(key, renderMathToHtml(tex.trim(), true));
    return `\n\n${key}\n\n`;
  });
  // Inline math — avoid matching currency like "$5 and $10" by requiring no
  // whitespace right after the opening $ and a closing $ on the same stretch.
  text = text.replace(/\$([^\$\n]+?)\$/g, (_m, tex) => {
    const key = `@@MATHINLINE${i++}@@`;
    math.set(key, renderMathToHtml(tex.trim(), false));
    return key;
  });
  return { text, math };
}

const MathSpan: React.FC<{ html: string; block?: boolean }> = ({ html, block }) =>
  block ? (
    <div className="my-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );

/** Walk text children and swap math placeholder tokens for rendered KaTeX. */
function renderWithMath(children: React.ReactNode, math: Map<string, string>): React.ReactNode {
  if (typeof children === 'string') {
    if (!/@@MATH(BLOCK|INLINE)\d+@@/.test(children)) return children;
    const parts = children.split(/(@@MATH(?:BLOCK|INLINE)\d+@@)/g);
    return parts.map((part, idx) => {
      const html = math.get(part);
      if (html) {
        return <MathSpan key={idx} html={html} block={part.includes('BLOCK')} />;
      }
      return part;
    });
  }
  if (Array.isArray(children)) {
    return children.map((c, i) => <React.Fragment key={i}>{renderWithMath(c, math)}</React.Fragment>);
  }
  return children;
}

interface ChatMarkdownProps {
  content: string | undefined | null;
}

const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ content }) => {
  const { text, math } = React.useMemo(() => extractMath(content || ''), [content]);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 leading-relaxed">{renderWithMath(children, math)}</p>,
          li: ({ children }) => <li className="my-0.5">{renderWithMath(children, math)}</li>,
          h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{renderWithMath(children, math)}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-4 mb-2">{renderWithMath(children, math)}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1.5">{renderWithMath(children, math)}</h3>,
          strong: ({ children }) => <strong className="font-semibold">{renderWithMath(children, math)}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
          th: ({ children }) => <th className="border border-border px-3 py-1.5 text-left font-semibold">{renderWithMath(children, math)}</th>,
          td: ({ children }) => <td className="border border-border px-3 py-1.5">{renderWithMath(children, math)}</td>,
          code: ({ className, children }) => {
            const isInline = !className || !className.includes('language-');
            return isInline ? (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
            ) : (
              <code className="font-mono text-sm">{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-muted border border-border p-3 rounded-lg my-3 overflow-x-auto text-sm">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-border pl-3 italic text-muted-foreground my-3">{children}</blockquote>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

export default ChatMarkdown;
