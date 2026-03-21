import { Star } from "lucide-react";

const GITHUB_REPO = "https://github.com/Work90210/APIFold";

async function getStarCount(): Promise<string> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(
      "https://api.github.com/repos/Work90210/APIFold",
      {
        next: { revalidate: 3600 },
        headers,
      },
    );

    if (!res.ok) return "0";

    const data = await res.json();
    const count = data.stargazers_count;
    return typeof count === "number"
      ? new Intl.NumberFormat().format(count)
      : "0";
  } catch {
    return "0";
  }
}

export async function GithubStars() {
  const stars = await getStarCount();

  return (
    <a
      href={GITHUB_REPO}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#40485d] bg-[#0f1930] px-6 text-base font-semibold text-[#dee5ff] transition-all duration-300 hover:border-[#a7a5ff]/30 hover:bg-[#141f38] active:scale-[0.98]"
    >
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      Star on GitHub
      <span className="ml-1 rounded-md bg-[#060e20]/60 px-2 py-0.5 text-sm tabular-nums text-[#a3aac4] ring-1 ring-[#40485d]/50">
        {stars}
      </span>
    </a>
  );
}
