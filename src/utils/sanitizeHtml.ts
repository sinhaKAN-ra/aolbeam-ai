import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(unsafeHtml: string): string {
  return DOMPurify.sanitize(unsafeHtml, {
    USE_PROFILES: { html: true },
  });
}


