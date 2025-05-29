"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import katex from 'katex';
import mermaid from 'mermaid';

// CSS for KaTeX is imported globally in layout.tsx

// Extend Window interface to include mermaid
declare global {
  interface Window {
    mermaid?: typeof mermaid;
    fixMermaidDiagram?: (id: string) => void;
  }
}

// Initialize Mermaid once on the client
if (typeof window !== 'undefined') {
  window.mermaid = mermaid;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'inherit',
    themeCSS: '.label { font-family: inherit; }',
    flowchart: { useMaxWidth: false, htmlLabels: true },
    gantt: { useMaxWidth: false },
    sequence: { useMaxWidth: false },
    journey: { useMaxWidth: false },
    // Ensure unique IDs for SSR compatibility
    deterministicIds: true,
    deterministicIDSeed: 'aolbeam-ai'
  });
}

interface MathRendererProps {
  content: string | undefined | null;
}

interface TextPart {
  type: 'text';
  content: string;
}

interface MatchPart {
  type: 'match';
  fullMatch: string;
  matchType: 'display-math' | 'inline-math' | 'code-block' | 'mermaid';
  lang?: string;
  codeContent?: string;
  mathContent?: string;
  mermaidContent?: string;
  mermaidId?: string;
  failed?: boolean;
  isFixing?: boolean;
  fixedContent?: string;
}

type Part = TextPart | MatchPart;

// Helper function to sanitize and validate Mermaid content
const sanitizeMermaidContent = (content: string): string => {
  let sanitized = content.trim();
  
  // Fix arrow syntax issues - the main cause of parsing errors
  // Pattern 1: --text--> (most common problematic pattern)
  sanitized = sanitized.replace(/--([^->\n\r]*?)-->/g, (match, label) => {
    const cleanLabel = label.trim();
    if (cleanLabel && cleanLabel.length > 0) {
      // Clean the label - be more permissive with characters
      const safeLabel = cleanLabel
        .replace(/[<>]/g, '') // Remove angle brackets that break parsing
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
      return `-->|${safeLabel}|`;
    }
    return '-->';
  });
  
  // Pattern 2: --text-> (single dash arrow)
  sanitized = sanitized.replace(/--([^->\n\r]*?)->/g, (match, label) => {
    const cleanLabel = label.trim();
    if (cleanLabel && cleanLabel.length > 0) {
      const safeLabel = cleanLabel
        .replace(/[<>]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return `-->|${safeLabel}|`;
    }
    return '-->';
  });
  
  // Clean up node labels in square brackets - be more permissive
  sanitized = sanitized.replace(/\[([^\]]*)\]/g, (match, label) => {
    const cleanLabel = label
      .replace(/[<>]/g, '') // Only remove truly problematic characters
      .replace(/\s+/g, ' ')
      .trim();
    return `[${cleanLabel}]`;
  });
  
  // Clean up labels in parentheses
  sanitized = sanitized.replace(/\(([^)]*)\)/g, (match, label) => {
    const cleanLabel = label
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return `(${cleanLabel})`;
  });
  
  // Fix subgraph syntax - ensure quotes around names with spaces
  sanitized = sanitized.replace(/subgraph\s+([^"\n{]+)/g, (match, name) => {
    const cleanName = name.trim();
    // If name contains spaces and isn't already quoted, add quotes
    if (cleanName.includes(' ') && !cleanName.startsWith('"') && !cleanName.endsWith('"')) {
      return `subgraph "${cleanName}"`;
    }
    return match;
  });
  
  return sanitized;
};

// Helper function to validate Mermaid syntax
const validateMermaidSyntax = (content: string): boolean => {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length === 0) return false;
  
  // Check for valid diagram type
  const validTypes = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
    'stateDiagram', 'journey', 'gantt', 'pie', 'gitgraph',
    'erDiagram', 'mindmap', 'timeline', 'sankey', 'C4Context'
  ];
  
  const firstLine = lines[0].toLowerCase();
  const hasValidType = validTypes.some(type => firstLine.startsWith(type.toLowerCase()));
  
  if (!hasValidType) {
    console.warn('Mermaid diagram missing valid type declaration. Found:', firstLine);
  }
  
  // Be more lenient - allow diagrams that might be valid even without perfect syntax
  return hasValidType || lines.length > 1; // Allow if has type or multiple lines
};

const MathRenderer: React.FC<MathRendererProps> = ({ content }) => {
  const componentId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidInitialized = useRef(false);
  const [failedDiagrams, setFailedDiagrams] = useState<{[key: string]: boolean}>({});
  const [fixingDiagrams, setFixingDiagrams] = useState<{[key: string]: boolean}>({});
  const [fixedDiagrams, setFixedDiagrams] = useState<{[key: string]: string}>({});
  const [copiedDiagrams, setCopiedDiagrams] = useState<{[key: string]: boolean}>({});

  // Function to copy diagram code to clipboard
  const copyDiagramCode = async (mermaidId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedDiagrams(prev => ({ ...prev, [mermaidId]: true }));
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedDiagrams(prev => {
          const newState = { ...prev };
          delete newState[mermaidId];
          return newState;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy diagram code:', error);
    }
  };

  // Function to fix a specific diagram
  const fixDiagram = async (mermaidId: string) => {
    setFixingDiagrams(prev => ({ ...prev, [mermaidId]: true }));
    
    try {
      // Get the original diagram content
      const element = containerRef.current?.querySelector(`[data-mermaid-id="${mermaidId}"]`);
      const originalContent = element?.getAttribute('data-mermaid-code');
      
      if (!originalContent) {
        console.error('Could not find original content for diagram:', mermaidId);
        return;
      }
      
      // Apply sanitization
      const sanitizedContent = sanitizeMermaidContent(originalContent);
      
      // Store the fixed content
      setFixedDiagrams(prev => ({ ...prev, [mermaidId]: sanitizedContent }));
      
      // Remove from failed diagrams
      setFailedDiagrams(prev => {
        const newFailed = { ...prev };
        delete newFailed[mermaidId];
        return newFailed;
      });
      
      // Trigger a re-render by updating the element
      setTimeout(() => {
        if (element) {
          element.removeAttribute('data-processed');
          // Force re-render
          const event = new CustomEvent('mermaid-rerender');
          element.dispatchEvent(event);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error fixing diagram:', error);
    } finally {
      setFixingDiagrams(prev => ({ ...prev, [mermaidId]: false }));
    }
  };

  // Initialize mermaid when the component mounts or content changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.mermaid || !containerRef.current) return;

    // Initialize Mermaid with default config
    const initializeMermaid = async () => {
      try {
        if (!mermaidInitialized.current) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
            themeCSS: `
              .label { font-family: inherit; }
              /* Hide Mermaid error elements */
              .error-icon, 
              .error-text,
              .mermaid-error-icon,
              .mermaid-error-text {
                display: none !important;
              }
              /* Hide syntax error messages */
              .error-message {
                display: none !important;
              }
              /* Hide any error containers */
              .mermaid-error {
                display: none !important;
              }
            `,
            flowchart: { 
              useMaxWidth: false, 
              htmlLabels: true,
              curve: 'basis'
            },
            gantt: { useMaxWidth: false },
            sequence: { useMaxWidth: false },
            journey: { useMaxWidth: false },
            // Error handling configuration
            logLevel: 'error',
            // @ts-ignore - suppressErrorRendering is valid in runtime but not in types
            suppressErrorRendering: true
          });
          mermaidInitialized.current = true;
        }
        return true;
      } catch (e) {
        console.error('Failed to initialize Mermaid:', e);
        return false;
      }
    };

    // Render all Mermaid diagrams
    const renderMermaid = async () => {
      if (!await initializeMermaid()) return;
      
      const elements = containerRef.current?.querySelectorAll<HTMLElement>('.mermaid:not([data-processed])');
      if (!elements || elements.length === 0) return;
      
      try {
        await Promise.all(Array.from(elements).map(async (element) => {
          // Get the Mermaid code and ID from the data attributes
          const mermaidCode = element.getAttribute('data-mermaid-code');
          const mermaidId = element.getAttribute('data-mermaid-id') || '';
          if (!mermaidCode) return;
          
          // Check if we have a fixed version of this diagram
          const fixedContent = fixedDiagrams[mermaidId];
          const contentToRender = fixedContent || mermaidCode;
          const sanitizedCode = sanitizeMermaidContent(contentToRender);
          
          try {
            // Clear any previous content for re-rendering
            element.innerHTML = '';
            
            // Create a container div for the diagram
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.justifyContent = 'center';
            container.style.width = '100%';
            element.appendChild(container);
            
            // Try to render directly without parse validation first (more permissive)
            let renderSuccess = false;
            let svg = '';
            
            try {
              const result = await mermaid.render(mermaidId, sanitizedCode);
              svg = result.svg;
              renderSuccess = true;
            } catch (directRenderError) {
              console.warn('Direct render failed, trying with parse validation:', directRenderError);
              
              // Fallback: try with parse validation
              try {
                const isValid = await mermaid.parse(sanitizedCode);
                if (isValid) {
                  const result = await mermaid.render(mermaidId, sanitizedCode);
                  svg = result.svg;
                  renderSuccess = true;
                }
              } catch (parseError) {
                console.warn('Parse validation also failed:', parseError);
                throw directRenderError; // Use the original error
              }
            }
            
            if (renderSuccess && svg) {
              container.innerHTML = svg;
              
              // Make SVG responsive
              const svgElement = container.querySelector('svg');
              if (svgElement) {
                svgElement.style.maxWidth = '100%';
                svgElement.style.height = 'auto';
                svgElement.style.display = 'block';
                svgElement.style.margin = '0 auto';
              }
              
              // Mark as processed
              element.setAttribute('data-processed', 'true');
            } else {
              throw new Error('Failed to generate SVG');
            }
          } catch (renderError) {
            console.error('Mermaid render error:', renderError);
            
            // Mark this diagram as failed
            setFailedDiagrams(prev => ({ ...prev, [mermaidId]: true }));
            
            // On error, show the original mermaid code in a clean code block
            const codeBlock = document.createElement('pre');
            codeBlock.className = 'bg-gray-100 p-3 rounded-md overflow-x-auto text-sm';
            codeBlock.textContent = mermaidCode;
            
            // Clear the container and append just the code block
            element.innerHTML = '';
            element.appendChild(codeBlock);
          }
        }));
      } catch (e) {
        console.error('Error processing Mermaid elements:', e);
      }
    };

    // Use requestAnimationFrame to ensure the DOM is ready
    const frameId = requestAnimationFrame(() => {
      renderMermaid().catch(console.error);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [content, componentId, fixedDiagrams]);

  if (typeof content !== 'string' || !content.trim()) {
    return <>{content || ''}</>;
  }

  // More precise regex patterns with better handling
  const patterns = [
    // Display math $$...$$ (multiline supported)
    { pattern: /\$\$\s*([\s\S]*?)\s*\$\$/g, type: 'display-math' as const },
    // Inline math $...$ (single line only, no nested $)
    { pattern: /\$([^$\n\r]+?)\$/g, type: 'inline-math' as const },
    // Mermaid diagrams - more flexible matching
    { pattern: /```mermaid\s*\n?([\s\S]*?)\n?```/g, type: 'mermaid' as const },
    // Code blocks with language
    { pattern: /```(\w+)\s*\n?([\s\S]*?)\n?```/g, type: 'code-block' as const },
    // Code blocks without language
    { pattern: /```\s*\n?([\s\S]*?)\n?```/g, type: 'code-block' as const }
  ];

  const parts: Part[] = [];
  const matches: { index: number; length: number; part: MatchPart }[] = [];

  // Find all matches with their positions
  for (const { pattern, type } of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(content)) !== null) {
      let matchPart: MatchPart;
      
      switch (type) {
        case 'display-math':
          matchPart = {
            type: 'match',
            fullMatch: match[0],
            matchType: 'display-math',
            mathContent: match[1]?.trim()
          };
          break;
        case 'inline-math':
          matchPart = {
            type: 'match',
            fullMatch: match[0],
            matchType: 'inline-math',
            mathContent: match[1]?.trim()
          };
          break;
        case 'mermaid':
          matchPart = {
            type: 'match',
            fullMatch: match[0],
            matchType: 'mermaid',
            mermaidContent: match[1]?.trim()
          };
          break;
        case 'code-block':
          // Handle both with and without language
          const hasLang = match[2] !== undefined;
          matchPart = {
            type: 'match',
            fullMatch: match[0],
            matchType: 'code-block',
            lang: hasLang ? match[1] : undefined,
            codeContent: (hasLang ? match[2] : match[1])?.trim()
          };
          break;
        default:
          continue;
      }
      
      matches.push({
        index: match.index,
        length: match[0].length,
        part: matchPart
      });
      
      // Prevent infinite loops
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  }

  // Sort matches by position and remove overlapping ones
  matches.sort((a, b) => a.index - b.index);
  const nonOverlappingMatches: typeof matches = [];
  
  for (const match of matches) {
    const isOverlapping = nonOverlappingMatches.some(existing => 
      match.index < existing.index + existing.length && 
      match.index + match.length > existing.index
    );
    
    if (!isOverlapping) {
      nonOverlappingMatches.push(match);
    }
  }

  // Build parts array
  let lastIndex = 0;
  for (const match of nonOverlappingMatches) {
    // Add text before the match
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index);
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }
    
    // Add the match
    parts.push(match.part);
    lastIndex = match.index + match.length;
  }
  
  // Add remaining text after the last match
  if (lastIndex < content.length) {
    const remainingContent = content.slice(lastIndex);
    if (remainingContent) {
      parts.push({ type: 'text', content: remainingContent });
    }
  }

  const renderPart = (part: Part, index: number) => {
    if (part.type === 'text') {
      return <React.Fragment key={index}>{part.content}</React.Fragment>;
    }

    const { fullMatch, matchType, lang, codeContent, mathContent, mermaidContent } = part;

    switch (matchType) {
      case 'display-math':
        if (!mathContent) return <span key={index}>{fullMatch}</span>;
        
        try {
          const html = katex.renderToString(mathContent, { 
            throwOnError: false, 
            displayMode: true, 
            output: "html",
            strict: false,
            trust: false
          });
          return <div key={index} dangerouslySetInnerHTML={{ __html: html }} className="my-4 text-center" />;
        } catch (e) {
          console.error("KaTeX render error:", e);
          return (
            <div key={index} className="text-red-500 bg-red-50 p-3 rounded border my-2">
              <div className="font-medium text-sm">KaTeX Error</div>
              <pre className="text-xs mt-1 bg-gray-100 p-2 rounded">{mathContent}</pre>
            </div>
          );
        }

      case 'inline-math':
        if (!mathContent) return <span key={index}>{fullMatch}</span>;
        
        try {
          const html = katex.renderToString(mathContent, { 
            throwOnError: false, 
            displayMode: false, 
            output: "html",
            strict: false,
            trust: false
          });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch (e) {
          console.error("KaTeX render error:", e);
          return <span key={index} className="text-red-500 bg-red-50 px-1 rounded text-sm">(KaTeX Error: {mathContent})</span>;
        }

      case 'mermaid':
        if (!mermaidContent) return <span key={index}>{fullMatch}</span>;
        
        // Generate a unique ID for this diagram
        const mermaidId = `mermaid-${componentId}-${index}`;
        const isFailed = failedDiagrams[mermaidId];
        const isFixing = fixingDiagrams[mermaidId];
        
        return (
          <div key={index} className="mermaid-diagram-container my-6 p-4 bg-card rounded-lg border shadow-sm">
            {isFailed && (
              <div className="mb-3 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="mb-3">
                  <div className="text-yellow-800 text-sm">
                    <strong>Mermaid Diagram Error:</strong> This diagram couldn't be rendered. You can try to fix it automatically or copy the code to generate correct one and use in an external editor.
                  </div>
                  <div className="mt-2 text-xs text-yellow-700">
                    Tip: Some complex diagrams might work better in the <a href="https://mermaid.live/" target="_blank" rel="noopener noreferrer" className="text-yellow-800 underline hover:text-yellow-900">Mermaid Live Editor</a>.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fixDiagram(mermaidId);
                    }}
                    disabled={isFixing}
                    className="px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {isFixing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Fixing...
                      </>
                    ) : 'Fix Automatically'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyDiagramCode(mermaidId, mermaidContent);
                    }}
                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors flex items-center"
                  >
                    {copiedDiagrams[mermaidId] ? (
                      <>
                        <svg className="w-3 h-3 mr-1.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            <div 
              className="mermaid flex justify-center" 
              data-mermaid-code={mermaidContent}
              data-mermaid-id={mermaidId}
              style={{ minWidth: '100%', overflow: 'auto' }}
            >
              {mermaidContent}
            </div>
          </div>
        );

      case 'code-block':
        if (codeContent === undefined) return <span key={index}>{fullMatch}</span>;
        
        const actualCode = codeContent || '';
        const language = lang?.trim() || 'text';
        
        return (
          <div key={index} className="my-4">
            {lang && (
              <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-t border-b">
                {language}
              </div>
            )}
            <pre className={`overflow-x-auto bg-gray-100 dark:bg-gray-800 p-4 ${lang ? 'rounded-b' : 'rounded'}`}>
              <code className={`language-${language} text-sm`}>
                {actualCode}
              </code>
            </pre>
          </div>
        );

      default:
        return <span key={index}>{fullMatch}</span>;
    }
  };

  // Add window function for button click handler
  useEffect(() => {
    // Add the fix function to the window object for the button to call
    window.fixMermaidDiagram = (mermaidId: string) => {
      fixDiagram(mermaidId);
    };
    
    return () => {
      // Clean up when component unmounts
      delete window.fixMermaidDiagram;
    };
  }, []);
  
  return (
    <div className="math-renderer-content" data-renderer-id={componentId} ref={containerRef}>
      {parts.map((part, index) => renderPart(part, index))}
    </div>
  );
};

export default MathRenderer;