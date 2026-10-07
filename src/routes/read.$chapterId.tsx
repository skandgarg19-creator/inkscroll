import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getChapterPages, getChapters } from "@/lib/mangadex.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/read/$chapterId")({
  validateSearch: (search: Record<string, unknown>) => ({
    mangaId: (search["mangaId"] as string) ?? "",
    title: (search["title"] as string) ?? "",
    cover: (search["cover"] as string) ?? "",
  }),
  head: () => ({
    meta: [
      { title: "Reading — InkScroll" },
      { name: "description", content: "Reading a manhua chapter on InkScroll." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReaderPage,
});

function ReaderPage() {
  const { chapterId } = Route.useParams();
  const { mangaId, title, cover } = Route.useSearch();
  const fetchPages = useServerFn(getChapterPages);
  const fetchChapters = useServerFn(getChapters);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pages", chapterId],
    queryFn: () => fetchPages({ data: { chapterId } }),
  });

  const { data: chapters } = useQuery({
    queryKey: ["chapters", mangaId],
    enabled: !!mangaId,
    queryFn: () => fetchChapters({ data: { mangaId } }),
  });

  // Track which page is on screen
  useEffect(() => {
    if (!data) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setCurrentPage(Number((e.target as HTMLElement).dataset["page"]));
          }
        }
      },
      { rootMargin: "-40% 0px -40% 0px" }
    );
    document
      .querySelectorAll("[data-page]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [data]);

  const scrollToPage = (n: number) => {
    document.getElementById(`page-${n}`)?.scrollIntoView({ behavior: "smooth" });
    setCurrentPage(n);
  };

  // Record reading history once pages load
  useEffect(() => {
    if (!userId || !data || !mangaId) return;
    const chapterLabel =
      chapters?.find((c: { id: string }) => c.id === chapterId)?.chapter ?? "";
    supabase.from("reading_history").upsert(
      {
        user_id: userId,
        manga_id: mangaId,
        manga_title: title || "Untitled",
        cover_url: cover || null,
        chapter_id: chapterId,
        chapter_label: chapterLabel ? `Chapter ${chapterLabel}` : "Chapter",
        read_at: new Date().toISOString(),
      },
      { onConflict: "user_id,manga_id" }
    );
  }, [userId, data, mangaId, chapterId, title, cover, chapters]);

  const idx = chapters?.findIndex((c: { id: string }) => c.id === chapterId) ?? -1;
  // chapters are sorted desc: newer = lower index
  const nextChapter = idx > 0 ? chapters![idx - 1] : null;
  const prevChapter =
    idx >= 0 && chapters && idx < chapters.length - 1 ? chapters[idx + 1] : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            to="/title/$mangaId"
            params={{ mangaId }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <span className="truncate text-sm font-semibold">{title}</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-2 py-4">
        {isLoading && (
          <div className="flex h-96 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {isError && (
          <p className="py-20 text-center text-muted-foreground">
            Couldn't load this chapter. It may have been removed upstream.
          </p>
        )}
        {data?.pages.map((p, i) => (
          <div key={p.original} id={`page-${i + 1}`} data-page={i + 1}>
            <PageImage page={p} index={i} />
          </div>
        ))}

        {data && (
          <div className="my-8 flex items-center justify-between gap-3 px-2">
            {prevChapter ? (
              <Link
                to="/read/$chapterId"
                params={{ chapterId: prevChapter.id }}
                search={{ mangaId, title, cover }}
                className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
              >
                ← Previous chapter
              </Link>
            ) : (
              <span />
            )}
            {nextChapter ? (
              <Link
                to="/read/$chapterId"
                params={{ chapterId: nextChapter.id }}
                search={{ mangaId, title, cover }}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Next chapter →
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">
                You're caught up 🎉
              </span>
            )}
          </div>
        )}
      </div>

      {data && data.pages.length > 1 && (
        <div className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
          <button
            onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="rounded-full p-1.5 hover:bg-accent disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-16 text-center text-sm font-medium tabular-nums">
            {currentPage} / {data.pages.length}
          </span>
          <button
            onClick={() =>
              scrollToPage(Math.min(data.pages.length, currentPage + 1))
            }
            disabled={currentPage >= data.pages.length}
            aria-label="Next page"
            className="rounded-full p-1.5 hover:bg-accent disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function PageImage({
  page,
  index,
}: {
  page: { saver: string | null; original: string; fallback: string };
  index: number;
}) {
  const sources = [page.saver, page.original, page.fallback].filter(
    (s): s is string => !!s
  );
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const src = sources[attempt % sources.length];
  const url = attempt >= sources.length ? `${src}?r=${attempt}` : src;

  if (failed) {
    return (
      <button
        onClick={() => {
          setFailed(false);
          setAttempt((a) => a + 1);
        }}
        className="mx-auto my-2 flex h-64 w-full max-w-2xl items-center justify-center rounded-md border border-border bg-card text-sm text-muted-foreground hover:text-foreground"
      >
        Page {index + 1} didn't load — tap to retry
      </button>
    );
  }

  return (
    <div className={loaded ? "" : "mx-auto min-h-64 w-full max-w-2xl animate-pulse bg-card"}>
      <img
        key={url}
        src={url}
        alt={`Page ${index + 1}`}
        loading={index < 3 ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (attempt < sources.length * 2 - 1) setAttempt((a) => a + 1);
          else setFailed(true);
        }}
        className="mx-auto w-full max-w-2xl"
      />
    </div>
  );
}
