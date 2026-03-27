import './markdown-content.css';

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=/gi, ' data-removed=');
}

interface MarkdownContentProps {
  readonly html: string;
  readonly className?: string;
}

export function MarkdownContent({ html, className = '' }: MarkdownContentProps) {
  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
