import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, BookOpen, ChevronRight } from "lucide-react";
import { getManhua, getChapters } from "@/lib/mangadex.functions";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/title/$mangaId")({
  head: () => ({
    meta: [
      { title: "Title — InkScroll" },
      { name: "description", content: "Read chapters of this manhua on InkScroll." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TitlePage,
});

function TitlePage() {
  const { mangaId } = Route.useParams();
  const fetchManhua = useServerFn(getManhua);
  const fetchChapters = useServerFn(getChapters);
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [oldestFirst, setOldestFirst] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: manga, isLoading } = useQuery({
    queryKey: ["manhua", mangaId],
    queryFn: () => fetchManhua({ data: { id: mangaId } }),
  });

  const { data: chapters } = useQuery({
    queryKey: ["chapters", mangaId],
    queryFn: () => fetchChapters({ data: { mangaId } }),
  });

  const { data: bookmarked } = useQuery({
    queryKey: ["bookmark", userId, mangaId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("manga_id", mangaId)
        .maybeSingle();
      return !!data;
    },
  });

  async function toggleBookmark() {
    if (!userId) {
      toast.info("Sign in to bookmark titles");
      return;
    }
    if (!manga) return;
    if (bookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("manga_id", mangaId);
      toast.success("Removed from library");
    } else {
      await supabase.from("bookmarks").insert({
        user_id: userId,
        manga_id: mangaId,
        title: manga.title,
        cover_url: manga.coverUrl,
      });
      toast.success("Saved to your library");
    }
    queryClient.invalidateQueries({ queryKey: ["bookmark", userId, mangaId] });
  }

  if (isLoading || !manga) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="h-64 animate-pulse rounded-lg bg-card" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="w-48 shrink-0 overflow-hidden rounded-lg border border-border bg-card">
          {manga.coverUrl ? (
            <img src={manga.coverUrl} alt={manga.title} referrerPolicy="no-referrer" className="w-full" />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center text-muted-foreground">
              <BookOpen className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-5xl leading-none">{manga.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {manga.status && (
              <Badge variant="outline" className="capitalize">
                {manga.status}
              </Badge>
            )}
            {manga.year && <Badge variant="outline">{manga.year}</Badge>}
            {manga.tags.map((t: string) => (
              <Link key={t} to="/" search={{ genre: t }}>
                <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                  {t}
                </Badge>
              </Link>
            ))}
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground line-clamp-6">
            {manga.description || "No description available."}
          </p>
          <div className="mt-6 flex gap-3">
            {chapters && chapters.length > 0 && (
              <Button asChild>
                <Link
                  to="/read/$chapterId"
                  params={{ chapterId: chapters.at(-1)!.id }}
                  search={{
                    mangaId,
                    title: manga.title,
                    cover: manga.coverUrl ?? "",
                  }}
                >
                  Start reading
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={toggleBookmark}>
              {bookmarked ? (
                <>
                  <BookmarkCheck className="mr-2 h-4 w-4 text-primary" /> In library
                </>
              ) : (
                <>
                  <Bookmark className="mr-2 h-4 w-4" /> Bookmark
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-12 mb-4 flex items-center justify-between">
        <h2 className="font-display text-3xl">Chapters</h2>
        <Button variant="outline" size="sm" onClick={() => setOldestFirst((v) => !v)}>
          {oldestFirst ? "Oldest first" : "Newest first"}
        </Button>
      </div>
      {!chapters && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-card" />
          ))}
        </div>
      )}
      {chapters && chapters.length === 0 && (
        <p className="text-muted-foreground">
          No English-translated chapters available for this title yet.
        </p>
      )}
      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {(oldestFirst ? [...(chapters ?? [])].reverse() : chapters)?.map((c: import("@/lib/mangadex.functions").ChapterSummary) => (
          <Link
            key={c.id}
            to="/read/$chapterId"
            params={{ chapterId: c.id }}
            search={{ mangaId, title: manga.title, cover: manga.coverUrl ?? "" }}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent"
          >
            <div>
              <span className="font-semibold">
                Chapter {c.chapter ?? "—"}
              </span>
              {c.title && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {c.title}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{c.pages} pages</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
