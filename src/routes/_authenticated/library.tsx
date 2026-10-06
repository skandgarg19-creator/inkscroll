import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bookmark, History, BookOpen, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "My Library — InkScroll" },
      { name: "description", content: "Your bookmarked manhua and reading history on InkScroll." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const [tab, setTab] = useState<"bookmarks" | "history">("bookmarks");
  const queryClient = useQueryClient();

  const { data: bookmarks } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: history } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reading_history")
        .select("*")
        .order("read_at", { ascending: false });
      return data ?? [];
    },
  });

  async function removeBookmark(id: string) {
    await supabase.from("bookmarks").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
  }

  async function clearHistory() {
    await supabase.from("reading_history").delete().not("id", "is", null);
    queryClient.invalidateQueries({ queryKey: ["history"] });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-5xl">My Library</h1>

      <div className="mt-6 flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("bookmarks")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "bookmarks"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bookmark className="h-4 w-4" /> Bookmarks ({bookmarks?.length ?? 0})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "history"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" /> History ({history?.length ?? 0})
        </button>
      </div>

      {tab === "bookmarks" && (
        <div className="mt-6">
          {bookmarks?.length === 0 && (
            <EmptyState text="No bookmarks yet. Find a title and hit Bookmark." />
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {bookmarks?.map((b) => (
              <div key={b.id} className="group relative">
                <Link to="/title/$mangaId" params={{ mangaId: b.manga_id }}>
                  <div className="aspect-[2/3] overflow-hidden rounded-lg border border-border bg-card">
                    {b.cover_url ? (
                      <img
                        src={b.cover_url}
                        alt={b.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <BookOpen className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold">{b.title}</p>
                </Link>
                <button
                  onClick={() => removeBookmark(b.id)}
                  className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label="Remove bookmark"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="mt-6">
          {history && history.length > 0 && (
            <div className="mb-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={clearHistory}>
                Clear history
              </Button>
            </div>
          )}
          {history?.length === 0 && (
            <EmptyState text="Nothing read yet. Your progress will show up here." />
          )}
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {history?.map((h) => (
              <Link
                key={h.id}
                to="/read/$chapterId"
                params={{ chapterId: h.chapter_id }}
                search={{
                  mangaId: h.manga_id,
                  title: h.manga_title,
                  cover: h.cover_url ?? "",
                }}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent"
              >
                <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
                  {h.cover_url && (
                    <img src={h.cover_url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{h.manga_title}</p>
                  <p className="text-sm text-muted-foreground">
                    Last read: {h.chapter_label}
                  </p>
                </div>
                <Badge variant="secondary">Continue</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
      <BookOpen className="mx-auto mb-3 h-8 w-8" />
      {text}
    </div>
  );
}
