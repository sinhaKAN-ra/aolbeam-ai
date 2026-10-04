/**
 * Client-side download helper for a single chat answer.
 *
 * Markdown: a real .md file via a Blob — instant, no dependency.
 * (A browser-print "Save as PDF" path was removed — it opened an awkward popup
 * and misbehaved in Firefox. If a true PDF export is wanted later, add a
 * dedicated renderer rather than relying on the print dialog.)
 */

function safeFileName(seed: string, ext: string): string {
  const base = (seed || 'response')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .slice(0, 40) || 'response';
  const stamp = new Date().toISOString().slice(0, 10);
  return `aolbeam-${base}-${stamp}.${ext}`;
}

/** Download the given markdown text as a .md file. */
export function downloadMarkdown(markdown: string, titleSeed = 'response'): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFileName(titleSeed, 'md');
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
