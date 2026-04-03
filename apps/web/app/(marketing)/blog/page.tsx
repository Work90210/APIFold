import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog | APIFold",
  description:
    "Guides, tutorials, and updates from the APIFold team. Learn about MCP servers, AI integrations, and API best practices.",
};

const posts = [
  {
    slug: "best-mcp-servers-2026",
    title: "Best MCP Servers in 2026: Top Picks for AI-Powered API Integration",
    description:
      "Discover the best MCP servers available on APIFold in 2026. Connect Stripe, GitHub, OpenAI, Notion, Slack, and more to your AI assistant in minutes.",
    date: "2026-04-03",
  },
  {
    slug: "connect-stripe-to-claude",
    title: "How to Connect Stripe to Claude with MCP",
    description:
      "Step-by-step guide to connecting Stripe to Claude using the Model Context Protocol (MCP) through APIFold. Manage payments, invoices, and subscriptions with natural language.",
    date: "2026-04-03",
  },
  {
    slug: "what-is-mcp",
    title: "What is MCP? A Complete Guide for Developers",
    description:
      "Learn what the Model Context Protocol (MCP) is, how it works, and why it matters for developers building AI-powered applications.",
    date: "2026-04-03",
  },
] as const;

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-32">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        Blog
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Guides, tutorials, and updates from the APIFold team
      </p>

      <div className="mt-12 flex flex-col gap-8">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group rounded-xl border border-border bg-card p-6 transition-colors duration-200 hover:border-foreground/20 hover:bg-muted/40"
          >
            <time
              dateTime={post.date}
              className="text-sm text-muted-foreground"
            >
              {formatDate(post.date)}
            </time>
            <h2 className="mt-2 text-xl font-semibold text-foreground group-hover:text-foreground/80">
              {post.title}
            </h2>
            <p className="mt-2 text-muted-foreground">{post.description}</p>
            <span className="mt-4 inline-block text-sm font-medium text-foreground">
              Read more &rarr;
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
