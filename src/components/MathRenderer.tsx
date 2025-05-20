
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
      // Query for mermaid elements within this specific MathRenderer instance
      const selector = `.math-renderer-content[data-renderer-id="${componentId}"] .mermaid`;
      const mermaidElements = document.querySelectorAll(selector);

      if (mermaidElements.length > 0) {
        // Clear previous SVG if any, to allow re-rendering if code changes
        mermaidElements.forEach(el => {
          const container = el.parentElement;
          if (container) {
            // Remove any previously rendered SVG by mermaid to prevent duplicates on re-render
            const existingSvg = container.querySelector('svg');
            if (existingSvg) {
              existingSvg.remove();
            }
            // Ensure the original mermaid code is still in the .mermaid div
            if (el.dataset.mermaidCode && el.innerHTML !== el.dataset.mermaidCode) {
                 el.innerHTML = el.dataset.mermaidCode;
            }
          }
        });
        
        mermaid.run({ nodes: Array.from(mermaidElements) }).catch(e => {
          console.error("Mermaid.run() error:", e);
          // Fallback: display code for elements that failed to render
          mermaidElements.forEach(node => {
            if (!node.querySelector('svg')) { // if no svg, it probably failed
              const code = node.dataset.mermaidCode || node.textContent;
              node.innerHTML = `<pre class="text-xs text-red-500 p-2 bg-red-50 border border-red-200 rounded">Error rendering diagram:\n${code}</pre>`;
            }
          });
        });
      }
    }
  }, [content, componentId]); // Rerun if content or componentId changes

  if (typeof content !== 'string' || !content.trim()) {
    return <>{content || ''}</>;
  }

  // Regex to find $...$ (inline), $$...$$ (display), and ```mermaid...``` blocks
  const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|```mermaid\n[\s\S]*?\n```)/g;
  const parts = content.split(regex);

  return (
    <div className="math-renderer-content" data-renderer-id={componentId}>
      {parts.map((part, index) => {
        if (!part) return null; // Skip empty strings that can result from split

        let latexContent: string | null = null;
        let displayMode = false;
        let isMermaid = false;
        let mermaidCode: string | null = null;

        if (part.startsWith('$$') && part.endsWith('$$')) {
          latexContent = part.substring(2, part.length - 2);
          displayMode = true;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          if (part.length > 2) {
            latexContent = part.substring(1, part.length - 1);
            displayMode = false;
          }
        } else if (part.startsWith('```mermaid\n') && part.endsWith('\n```')) {
          isMermaid = true;
          mermaidCode = part.substring('```mermaid\n'.length, part.length - '\n```'.length).trim();
        }

        if (latexContent !== null && latexContent.trim() !== "") {
          try {
            const html = katex.renderToString(latexContent, {
              throwOnError: false,
              displayMode: displayMode,
              output: "html",
            });
            if (displayMode) {
              return <div key={index} dangerouslySetInnerHTML={{ __html: html }} className="my-2" />;
            }
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) {
            console.error(`KaTeX render error (mode: ${displayMode ? 'display': 'inline'}):`, e, "Original:", latexContent);
            // Fallback to raw text if KaTeX fails for this part
            return <span key={index} className="text-red-500">(KaTeX Error) {part}</span>;
          }
        } else if (isMermaid && mermaidCode) {
          // Render a div with class "mermaid" and the code as its content.
          // The useEffect will find these and tell Mermaid to process them.
          // Added a wrapper for centering, spacing, and basic card styling.
          return (
            <div key={index} className="mermaid-diagram-container flex justify-center my-4 p-2 bg-card rounded-md shadow">
              <div className="mermaid" data-mermaid-code={mermaidCode}>
                {mermaidCode}
              </div>
            </div>
          );
        }
        
        // This is a plain text part.
        // Ensure newlines are respected if they are meaningful (e.g. not inside prose already)
        // If this component is used within a `prose` styled element, `whitespace-pre-wrap` might already be active.
        // Otherwise, we might need to handle newlines explicitly here if they are not rendered.
        // For now, assume parent or CSS handles plain text newlines if needed.
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
};

export default MathRenderer;
