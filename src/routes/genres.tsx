import { createFileRoute, Link } from "@tanstack/react-router";
import { Tags } from "lucide-react";
import { GENRES } from "@/lib/mangadex.functions";

export const Route = createFileRoute("/genres")({
  head: () => ({
    meta: [
      { title: "All Genres — InkScroll" },
      {
        name: "description",
        content: "Browse every manhua genre on InkScroll — Wuxia, Fantasy, Romance, Action and more.",
      },
      { property: "og:title", content: "All Genres — InkScroll" },
      {
        property: "og:description",
        content: "Pick a genre and discover manhua to read on InkScroll.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GenresPage,
});

function GenresPage() {
  const names = Object.keys(GENRES).sort((a, b) => a.localeCompare(b));
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-12">
      <div className="flex items-center gap-2 text-primary">
        <Tags className="h-5 w-5" />
        <span className="text-sm font-semibold uppercase tracking-widest">Browse by genre</span>
      </div>
      <h1 className="font-display mt-3 text-5xl sm:text-7xl leading-none">All genres</h1>
      <p className="mt-3 text-muted-foreground">Tap a genre to see every manhua in it.</p>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {names.map((g) => (
          <Link
            key={g}
            to="/"
            search={{ genre: g }}
            className="rounded-lg border border-border bg-card px-4 py-5 font-display text-2xl tracking-wide transition-colors hover:border-primary hover:text-primary"
          >
            {g}
          </Link>
        ))}
      </div>
    </div>
  );
}
