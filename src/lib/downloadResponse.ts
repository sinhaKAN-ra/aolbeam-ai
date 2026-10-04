/**
 * Client-side download helpers for a single chat answer.
 *
 * Markdown: a real .md file via a Blob — instant, no dependency.
 * PDF: we deliberately avoid bundling a heavy PDF library (jsPDF/pdfmake) —
 * instead we open a minimal print window with the raw answer and invoke the
 * browser's native "Save as PDF", which every browser provides. This keeps the
 * bundle small; swap in a real renderer later if pixel-perfect PDFs are needed.
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

/**
 * Open a print-ready window with the answer and trigger the browser's
 * native print dialog (where the user picks "Save as PDF"). The content is
 * escaped and shown monospace-preserving so code/markdown stays intact.
 */
export function printAsPdf(text: string, title = 'AOLBEAM response'): void {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=800,height=1000');
  if (!w) return; // popup blocked — caller can toast
  const escaped = (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8" />
<title>${title.replace(/[<>&]/g, '')}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.6; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #111; }
  pre, .content { white-space: pre-wrap; word-wrap: break-word; }
  h1 { font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
  @media print { body { margin: 0; } }
</style></head>
<body>
  <h1>${title.replace(/[<>&]/g, '')}</h1>
  <div class="content">${escaped}</div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body></html>`);
  w.document.close();
}
