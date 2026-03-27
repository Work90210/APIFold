import './markdown-content.css';

interface MarkdownContentProps {
  /** Pre-sanitized HTML string. Callers MUST sanitize with DOMPurify or equivalent
   *  before passing to this component — the html is rendered via dangerouslySetInnerHTML.
   *  TODO: Add DOMPurify as a dependency and sanitize here at the boundary. */
  readonly html: string;
  readonly className?: string;
}

export function MarkdownContent({ html, className = '' }: MarkdownContentProps) {
  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
