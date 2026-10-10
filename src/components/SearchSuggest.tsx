import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { searchManhua } from "@/lib/mangadex.functions";

export function SearchSuggest({
  query,
  open,
  onClose,
}: {
  query: string;
  open: boolean;
  onClose: () => void;
}) {
  const [debounced, setDebounced] = useState("");
  const fetchManhua = useServerFn(searchManhua);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["suggest", debounced],
    queryFn: () => fetchManhua({ data: { query: debounced } }),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });

  if (!open || debounced.length < 2) return null;
  const items = data?.manga.slice(0, 5) ?? [];

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-border bg-card shadow-xl">
      {isFetching && items.length === 0 && (
        <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching…
        </div>
      )}
      {!isFetching && items.length === 0 && (
        <div className="p-3 text-sm text-muted-foreground">No matches</div>
      )}
      {items.map((m) => (
        <Link
          key={m.id}
          to="/title/$mangaId"
          params={{ mangaId: m.id }}
          onClick={onClose}
          className="flex items-center gap-3 p-2 hover:bg-accent"
        >
          {m.coverUrl ? (
            <img
              src={m.coverUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-14 w-10 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="h-14 w-10 shrink-0 rounded bg-muted" />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{m.title}</div>
            {m.status && (
              <div className="text-xs capitalize text-muted-foreground">{m.status}</div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
