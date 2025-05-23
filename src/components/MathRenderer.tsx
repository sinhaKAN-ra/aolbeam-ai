
"use client";

import React, { useEffect, useId } from 'react';
import katex from 'katex';
import mermaid from 'mermaid';

// CSS for KaTeX is imported globally in layout.tsx

// Initialize Mermaid once on the client
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false, // We will manually render
    theme: 'default', // Base theme, can be 'dark', 'forest', 'neutral'
    // securityLevel: 'strict', // Default, recommended
    // logLevel: 3, // For debugging, 0-5. Default is 5 (error).
  });
}

interface MathRendererProps {
  content: string | undefined | null;
}

const MathRenderer: React.FC<MathRendererProps> = ({ content }) => {
  const componentId = useId(); // Unique ID for this instance of MathRenderer to scope queries

  useEffect(() => {
    if (typeof window !== 'undefined' && content) {
      const selector = `.math-renderer-content[data-renderer-id="${componentId}"] .mermaid`;
      const mermaidElements = document.querySelectorAll<HTMLElement>(selector);

      if (mermaidElements.length > 0) {
        // Convert NodeList to array of HTMLElement for better type safety
        const elements = Array.from(mermaidElements) as HTMLElement[];
        
        elements.forEach(el => {
          const container = el.parentElement;
          if (container) {
            const existingSvg = container.querySelector('svg');
            if (existingSvg) {
              existingSvg.remove();
            }
            const mermaidCode = el.getAttribute('data-mermaid-code');
            if (mermaidCode && el.innerHTML !== mermaidCode) {
                 el.innerHTML = mermaidCode;
            }
          }
        });
        
        mermaid.run({ nodes: elements }).catch(e => {
          console.error("Mermaid.run() error:", e);
          elements.forEach(node => {
            // Check if it was already replaced with an error message or if it's still the original code
            if (!node.querySelector('svg') && !node.querySelector('pre.mermaid-error-fallback')) { 
              const code = node.getAttribute('data-mermaid-code') || node.textContent || "Error: Mermaid code unavailable";
              // Sanitize code for display to prevent XSS if it contains HTML-like structures by mistake
              const textNode = document.createTextNode(`Error rendering diagram:\n${code}`);
              const pre = document.createElement('pre');
              pre.className = 'text-xs text-red-500 p-2 bg-red-50 border border-red-200 rounded-md mermaid-error-fallback';
              pre.appendChild(textNode);
              node.innerHTML = ''; // Clear existing content (which is the raw code)
              node.appendChild(pre);
            }
          });
        });
      }
    }
  }, [content, componentId]);

  if (typeof content !== 'string' || !content.trim()) {
    return <>{content || ''}</>;
  }

  // Regex to find $...$ (inline), $$...$$ (display), ```lang?...``` (fenced code blocks), and ```mermaid...``` blocks
  const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|```(?:(\w+)\n)?([\s\S]*?)\n```|```mermaid\n([\s\S]*?)\n```)/g;
  const parts = content.split(regex);

  return (
    <div className="math-renderer-content" data-renderer-id={componentId}>
      {parts.map((part, index) => {
        if (!part) return null;

        // Check if this part is a match result from the regex (i.e., it's one of the captured groups)
        // part will be the full match, lang will be group 2, codeContent will be group 3, mermaidContent will be group 4
        // The split array will be [text, fullMatch, lang, codeContent, mermaidContent, text, fullMatch, ...]
        // We are interested in the `fullMatch` which is `parts[index]` if `parts[index-1]` was text.
        // A more robust way is to iterate through matches instead of split.
        // However, for this split approach, the captured groups follow the full match.

        // Re-evaluating based on current regex and split behavior:
        // parts will be [textBefore, matchedDelimiter, lang, code, mermaid, textAfter, matchedDelimiter, ...]
        // The matchedDelimiter is what we check. `lang`, `code`, `mermaid` are capture groups *if* the delimiter was a code/mermaid block.

        if (index % 5 === 1) { // This is the full matched block
            const fullMatch = part;
            const lang = parts[index + 1];
            const codeContent = parts[index + 2];
            const mermaidContent = parts[index + 3];

            if (fullMatch.startsWith('$$') && fullMatch.endsWith('$$')) {
                const latex = fullMatch.substring(2, fullMatch.length - 2);
                if (latex.trim() === "") return <span key={index}>{fullMatch}</span>; // Avoid KaTeX error on empty
                try {
                    const html = katex.renderToString(latex, { throwOnError: false, displayMode: true, output: "html" });
                    return <div key={index} dangerouslySetInnerHTML={{ __html: html }} className="my-2" />;
                } catch (e) { return <span key={index} className="text-red-500">(KaTeX Error) {fullMatch}</span>; }
            } else if (fullMatch.startsWith('$') && fullMatch.endsWith('$')) {
                const latex = fullMatch.substring(1, fullMatch.length - 1);
                if (latex.trim() === "") return <span key={index}>{fullMatch}</span>;
                try {
                    const html = katex.renderToString(latex, { throwOnError: false, displayMode: false, output: "html" });
                    return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
                } catch (e) { return <span key={index} className="text-red-500">(KaTeX Error) {fullMatch}</span>; }
            } else if (fullMatch.startsWith('```mermaid\n')) {
                 // Mermaid content is in `mermaidContent` (group 4 of the regex for this specific match)
                const actualMermaidCode = mermaidContent.trim();
                return (
                    <div key={index} className="mermaid-diagram-container flex justify-center my-4 p-2 bg-card rounded-md shadow">
                        <div className="mermaid" data-mermaid-code={actualMermaidCode}>
                            {actualMermaidCode}
                        </div>
                    </div>
                );
            } else if (fullMatch.startsWith('```')) {
                // Fenced code block, content is in `codeContent` (group 3)
                const actualCode = codeContent; // Already trimmed by regex capture if structure is ```lang\nCODE\n```
                const languageClass = lang ? `language-${lang}` : 'language-text'; // Default to language-text
                return (
                    <pre key={index} className="my-2"> {/* prose pre styles will apply from globals.css */}
                        <code className={languageClass}>{actualCode}</code> {/* prose code styles will apply */}
                    </pre>
                );
            }
            return <span key={index}>{fullMatch}</span>; // Fallback for a matched part not handled
        } else if (index % 5 === 0) { // This is plain text
            return <span key={index}>{part}</span>;
        }
        // Other indices (2,3,4 for capture groups) are skipped as they are handled with the matched block
        return null;

      })}
    </div>
  );
};

export default MathRenderer;
