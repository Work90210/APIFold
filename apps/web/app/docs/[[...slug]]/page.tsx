import { getPage, getPages } from "@/lib/source";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";

const DEFAULT_SLUG = ["getting-started"] as const;

export default function Page({
  params,
}: {
  readonly params: { readonly slug?: string[] };
}) {
  const slug =
    !params.slug || params.slug.length === 0
      ? [...DEFAULT_SLUG]
      : params.slug;

  const page = getPage(slug);
  if (!page) notFound();

  const MDX = page.data.exports.default;

  return (
    <DocsPage toc={page.data.exports.toc} full={page.data.full}>
      <DocsBody>
        <h1>{page.data.title}</h1>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return getPages().map((page) => ({
    slug: page.slugs,
  }));
}

export function generateMetadata({
  params,
}: {
  readonly params: { readonly slug?: string[] };
}) {
  const slug =
    !params.slug || params.slug.length === 0
      ? [...DEFAULT_SLUG]
      : params.slug;

  const page = getPage(slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
