import './markdown-content.css';

interface MarkdownContentProps {
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
