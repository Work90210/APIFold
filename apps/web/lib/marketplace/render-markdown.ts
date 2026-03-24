import { toHtml } from 'hast-util-to-html';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize);

export function renderMarkdown(markdown: string): string {
  const tree = processor.runSync(processor.parse(markdown));
  return toHtml(tree);
}
