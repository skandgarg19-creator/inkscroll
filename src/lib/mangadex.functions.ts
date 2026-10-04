import { createServerFn } from "@tanstack/react-start";

const API = "https://api.mangadex.org";
const UA = { "User-Agent": "InkScroll/1.0" };

export interface MangaSummary {
  id: string;
  title: string;
  coverUrl: string | null;
  description: string;
  status: string | null;
  year: number | null;
  tags: string[];
}

export interface ChapterSummary {
  id: string;
  chapter: string | null;
  title: string | null;
  pages: number;
  publishAt: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapManga(m: any): MangaSummary {
  const cover = m.relationships?.find((r: any) => r.type === "cover_art");
  const fileName = cover?.attributes?.fileName;
  const titles = m.attributes?.title ?? {};
  const altTitles: any[] = m.attributes?.altTitles ?? [];
  const altEn = altTitles.find((t: any) => t?.en)?.en;
  const title =
    titles.en ??
    altEn ??
    titles["zh-ro"] ??
    Object.values(titles)[0] ??
    "Untitled";
  return {
    id: m.id,
    title,
    coverUrl: fileName
      ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}.512.jpg`
      : null,
    description: m.attributes?.description?.en ?? "",
    status: m.attributes?.status ?? null,
    year: m.attributes?.year ?? null,
    tags:
      m.attributes?.tags
        ?.filter((t: any) => t.attributes?.group === "genre")
        .map((t: any) => t.attributes?.name?.en)
        .filter(Boolean) ?? [],
  };
}

async function mdFetch(path: string) {
  const res = await fetch(`${API}${path}`, { headers: UA });
  if (!res.ok) throw new Error(`Upstream error ${res.status}`);
  return res.json();
}

export const searchManhua = createServerFn({ method: "GET" })
  .inputValidator((data: { query?: string; offset?: number }) => data ?? {})
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    params.set("limit", "24");
    params.set("offset", String(data?.offset ?? 0));
    params.append("originalLanguage[]", "zh");
    params.append("includes[]", "cover_art");
    params.append("contentRating[]", "safe");
    params.append("contentRating[]", "suggestive");
    params.set("order[followedCount]", "desc");
    params.set("hasAvailableChapters", "true");
    params.append("availableTranslatedLanguage[]", "en");
    if (data?.query) params.set("title", data.query);
    const json = await mdFetch(`/manga?${params.toString()}`);
    return {
      manga: (json.data ?? []).map(mapManga) as MangaSummary[],
      total: json.total ?? 0,
    };
  });

export const getManhua = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const json = await mdFetch(`/manga/${data.id}?includes[]=cover_art`);
    return mapManga(json.data);
  });

export const getChapters = createServerFn({ method: "GET" })
  .inputValidator((data: { mangaId: string }) => data)
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    params.set("manga", data.mangaId);
    params.append("translatedLanguage[]", "en");
    params.append("contentRating[]", "safe");
    params.append("contentRating[]", "suggestive");
    params.set("order[chapter]", "desc");
    params.set("limit", "100");
    const json = await mdFetch(`/chapter?${params.toString()}`);
    const chapters: ChapterSummary[] = (json.data ?? []).map((c: any) => ({
      id: c.id,
      chapter: c.attributes?.chapter ?? null,
      title: c.attributes?.title ?? null,
      pages: c.attributes?.pages ?? 0,
      publishAt: c.attributes?.publishAt ?? "",
    }));
    // De-duplicate: keep first (latest group) per chapter number
    const seen = new Set<string>();
    return chapters.filter((c) => {
      const key = c.chapter ?? c.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

export const getChapterPages = createServerFn({ method: "GET" })
  .inputValidator((data: { chapterId: string }) => data)
  .handler(async ({ data }) => {
    const json = await mdFetch(`/at-home/server/${data.chapterId}`);
    const baseUrl: string = json.baseUrl;
    const hash: string = json.chapter.hash;
    const files: string[] = json.chapter.data ?? [];
    return {
      pages: files.map((f) => `${baseUrl}/data/${hash}/${f}`),
    };
  });
