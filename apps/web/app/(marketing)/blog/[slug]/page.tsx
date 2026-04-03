import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

const postMeta: Record<
  string,
  { title: string; description: string; date: string }
> = {
  "best-mcp-servers-2026": {
    title: "Best MCP Servers in 2026: Top Picks for AI-Powered API Integration",
    description:
      "Discover the best MCP servers available on APIFold in 2026. Connect Stripe, GitHub, OpenAI, Notion, Slack, and more to your AI assistant in minutes.",
    date: "2026-04-03",
  },
  "connect-stripe-to-claude": {
    title: "How to Connect Stripe to Claude with MCP",
    description:
      "Connect Stripe to Claude via MCP and APIFold. Manage payments, invoices, and subscriptions with natural language.",
    date: "2026-04-03",
  },
  "what-is-mcp": {
    title: "What is MCP? A Complete Guide for Developers",
    description:
      "Learn what the Model Context Protocol (MCP) is, how it works, and why it matters for developers building AI-powered applications.",
    date: "2026-04-03",
  },
};

const slugs = Object.keys(postMeta);

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = postMeta[slug];

  if (!meta) {
    return { title: "Post Not Found" };
  }

  return {
    title: `${meta.title} | APIFold Blog`,
    description: meta.description,
    alternates: { canonical: `https://apifold.dev/blog/${slug}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: "article",
      publishedTime: meta.date,
      url: `https://apifold.dev/blog/${slug}`,
      siteName: "APIFold",
    },
    twitter: {
      card: "summary",
      title: meta.title,
      description: meta.description,
    },
  };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = postMeta[slug];

  if (!meta) {
    notFound();
  }

  let Post: React.ComponentType;
  try {
    const mod = await import(`@/content/blog/${slug}.mdx`);
    Post = mod.default;
  } catch (err: unknown) {
    if (err instanceof Error && (err.message.includes('Cannot find module') || (err as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND')) {
      notFound();
    }
    throw err;
  }

  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    datePublished: meta.date,
    author: {
      "@type": "Organization",
      name: "APIFold",
    },
    publisher: {
      "@type": "Organization",
      name: "APIFold",
      logo: {
        "@type": "ImageObject",
        url: "https://apifold.dev/logo.svg",
      },
    },
  };

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/<\/script/gi, '<\\/script') }}
      />
      <article>
        <time
          dateTime={meta.date}
          className="text-sm text-muted-foreground"
        >
          {formatDate(meta.date)}
        </time>
        <div className="blog-prose mt-8">
          <Post />
        </div>
      </article>
    </main>
  );
}
