
"use client";

import React from 'react';
import katex from 'katex';
// CSS is imported globally in layout.tsx

interface MathRendererProps {
  content: string | undefined | null;
}

const MathRenderer: React.FC<MathRendererProps> = ({ content }) => {
  if (typeof content !== 'string' || !content.trim()) {
    // Render empty or nullish content as is, or an empty fragment
    return <>{content || ''}</>;
  }

  // Regex to find $...$ (inline) and $$...$$ (display)
  // It captures the content within delimiters
  const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
  const parts = content.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null; // Skip empty strings that can result from split

        let latexContent: string | null = null;
        let displayMode = false;

        if (part.startsWith('$$') && part.endsWith('$$')) {
          latexContent = part.substring(2, part.length - 2);
          displayMode = true;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          // Ensure there's content between $ signs and it's not just "$"
          if (part.length > 2) { 
             latexContent = part.substring(1, part.length - 1);
             displayMode = false;
          }
        }

        if (latexContent !== null && latexContent.trim() !== "") {
          try {
            const html = katex.renderToString(latexContent, {
              throwOnError: false, // Don't break page for invalid LaTeX
              displayMode: displayMode,
              output: "html",
              // Consider adding macros if needed:
              // macros: {"\\RR": "\\mathbb{R}"}
            });
            // Using div for displayMode and span for inlineMode to help with block/inline behavior
            if (displayMode) {
              return <div key={index} dangerouslySetInnerHTML={{ __html: html }} className="my-2" />;
            }
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) {
            console.error(`KaTeX render error (mode: ${displayMode ? 'display': 'inline'}):`, e, "Original:", latexContent);
            // Fallback to raw text if KaTeX fails for this part
            return <span key={index}>{part}</span>; 
          }
        }
        
        // This is a plain text part. Rely on parent styling (e.g., whitespace-pre-wrap from prose class)
        // to handle newlines and spacing.
        return <span key={index}>{part}</span>; 
      })}
    </>
  );
};

export default MathRenderer;
