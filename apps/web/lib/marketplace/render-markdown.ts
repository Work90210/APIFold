import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import { toHtml } from 'hast-util-to-html';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype);

export function renderMarkdown(markdown: string): string {
  const tree = processor.runSync(processor.parse(markdown));
  return toHtml(tree);
}
