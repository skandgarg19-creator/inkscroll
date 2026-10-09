import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { suggestResume, type ResumeSuggestion } from "@/lib/resume.functions";

export function ResumeHelper({
  signedIn,
  mangaId,
  title,
  cover,
  chapterId,
  chapters,
  onSamePage,
}: {
  signedIn: boolean;
  mangaId: string;
  title: string;
  cover: string;
  chapterId: string;
  chapters: { id: string; chapter?: string | null }[];
  onSamePage: (page: number) => void;
}) {
  const ask = useServerFn(suggestResume);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeSuggestion | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await ask({
        data: {
          mangaId,
          title,
          note,
          currentChapterId: chapterId,
          chapters: [...chapters].reverse().map((c) => ({ id: c.id, chapter: c.chapter ?? null })),
        },
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function go() {
    if (!result?.chapterId) return;
    if (result.chapterId === chapterId) {
      if (result.page) onSamePage(result.page);
    } else {
      navigate({
        to: "/read/$chapterId",
        params: { chapterId: result.chapterId },
        search: { mangaId, title, cover, ...(result.page ? { page: result.page } : {}) },
      });
    }
    setOpen(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Sparkles className="h-4 w-4 text-primary" /> Where should I resume?
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> AI resume helper
            </p>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {!signedIn ? (
            <p className="text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary underline">Sign in</Link> so I can use your reading history.
            </p>
          ) : (
            <>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="e.g. I stopped around chapter 42, page 10 — or: I remember the tournament arc starting"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <button
                onClick={submit}
                disabled={loading}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Suggest
              </button>
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              {result && (
                <div className="mt-3 rounded-md border border-border bg-background p-3 text-sm">
                  <p className="font-semibold">
                    Chapter {result.chapterLabel}
                    {result.page ? `, page ${result.page}` : ""}
                  </p>
                  <p className="mt-1 text-muted-foreground">{result.reason}</p>
                  {result.chapterId ? (
                    <button onClick={go} className="mt-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
                      Go there
                    </button>
                  ) : (
                    <p className="mt-2 text-muted-foreground">That chapter isn't available here.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
