import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search, Flame, BookOpen } from "lucide-react";
import { searchManhua } from "@/lib/mangadex.functions";
import heroArt from "@/assets/hero-manhua.png";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InkScroll — Read Manhua Online" },
      {
        name: "description",
        content:
          "Browse and read popular manhua online. Dark, cinematic reading experience with bookmarks and reading history.",
      },
      { property: "og:title", content: "InkScroll — Read Manhua Online" },
      {
        property: "og:description",
        content:
          "Browse and read popular manhua online with a dark, cinematic reader.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { genre?: string } =>
    typeof s["genre"] === "string" && s["genre"] ? { genre: s["genre"] } : {},
  component: Home,
});

const POPULAR_GENRES = [
  "Action", "Fantasy", "Wuxia", "Romance", "Adventure", "Comedy",
  "Drama", "Historical", "Isekai", "Mystery", "Horror", "Sci-Fi",
];

function Home() {
  const { genre } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const fetchManhua = useServerFn(searchManhua);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["manhua", submitted, genre],
    queryFn: () =>
      fetchManhua({
        data: {
          ...(submitted ? { query: submitted } : {}),
          ...(genre ? { genre } : {}),
        },
      }),
  });

  const setGenre = (g?: string) =>
    navigate({ search: g ? { genre: g } : {} });

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60% 80% at 70% 10%, oklch(0.58 0.21 27 / 0.25), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1.2fr_1fr]">
          <div>
          <div className="flex items-center gap-2 text-primary">
            <Flame className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-widest">
              Trending Manhua
            </span>
          </div>
          <h1 className="font-display mt-4 text-6xl sm:text-8xl leading-none">
            Dive into the
            <br />
            <span className="text-primary">ink-dark</span> shelves
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Thousands of manhua titles, scanned and translated. Pick a series,
            scroll vertically, lose track of time.
          </p>
          <form
            className="mt-8 flex max-w-lg gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(query.trim());
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles… e.g. Solo Leveling"
                className="pl-9 bg-card border-input"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          </div>
          <div className="relative hidden lg:block">
            <div className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(circle,oklch(0.58_0.21_27/0.3),transparent_70%)] blur-2xl" />
            <img
              src={heroArt}
              alt="Manhua warrior amid swirling red ink and floating comic pages"
              width={1024}
              height={1280}
              className="relative aspect-[4/5] w-full rounded-2xl border border-border object-cover shadow-2xl [mask-image:linear-gradient(to_bottom,black_82%,transparent)]"
            />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={!genre ? "default" : "secondary"}
            onClick={() => setGenre()}
          >
            All
          </Button>
          {POPULAR_GENRES.map((g) => (
            <Button
              key={g}
              size="sm"
              variant={genre === g ? "default" : "secondary"}
              onClick={() => setGenre(g)}
            >
              {g}
            </Button>
          ))}
        </div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-3xl">
            {submitted
              ? `Results for “${submitted}”${genre ? ` in ${genre}` : ""}`
              : genre
                ? genre
                : "Most followed"}
          </h2>
          {data && (
            <span className="text-sm text-muted-foreground">
              {data.total.toLocaleString()} titles
            </span>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-lg bg-card"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <BookOpen className="mx-auto mb-3 h-8 w-8" />
            Couldn't reach the catalog right now. Try again in a moment.
          </div>
        )}

        {data && data.manga.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            No titles found for “{submitted}”.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {data?.manga.map((m: import("@/lib/mangadex.functions").MangaSummary) => (
            <Link
              key={m.id}
              to="/title/$mangaId"
              params={{ mangaId: m.id }}
              className="group"
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-card">
                {m.coverUrl ? (
                  <img
                    src={m.coverUrl}
                    alt={m.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <BookOpen className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 to-transparent p-2 pt-8">
                  <p className="line-clamp-2 text-sm font-semibold leading-tight">
                    {m.title}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {m.tags.slice(0, 2).map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
