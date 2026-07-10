import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe HTML tags for rich content display.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe', 'div', 'span'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'rel', 'data-interactive-video', 'contenteditable', 'style', 'class'],
  });
}
