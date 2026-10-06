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

export const GENRES: Record<string, string> = {
  Action: "391b0423-d847-456f-aff0-8b0cfc03066b",
  Adventure: "87cc87cd-a395-47af-b27a-93258283bbc6",
  Comedy: "4d32cc48-9f00-4cca-9b5a-a839f0764984",
  Drama: "b9af3a63-f058-46de-a9a0-e0c13906197a",
  Fantasy: "cdc58593-87dd-415e-bbc0-2ec27bf404cc",
  Historical: "33771934-028e-4cb3-8744-691e866a923e",
  Horror: "cdad7e68-1419-41dd-bdce-27753074a640",
  Isekai: "ace04997-f6bd-436e-b261-779182193d3d",
  Mystery: "ee968100-4191-4968-93d3-f82d72be7e46",
  Psychological: "3b60b75c-a2d7-4860-ab56-05f391bb889c",
  Romance: "423e2eae-a7a2-4a8b-ac03-a8351462d71d",
  "Sci-Fi": "256c8bd9-4904-4360-bf4f-508a76d67183",
  "Slice of Life": "e5301a23-ebd9-49dd-a0cb-2add944c7fe9",
  Sports: "69964a64-2f90-4d33-beeb-f3ed2875eb4c",
  Thriller: "07251805-a27e-4d59-b488-f0bfbec15168",
  Tragedy: "f8f62932-27da-4fe4-8ee1-6779a8c5edba",
  Wuxia: "acc803a4-c95a-4c22-86fc-eb6b582d82a2",
  Crime: "5ca48985-9a9d-4bd8-be29-80dc0303db72",
  Mecha: "50880a9d-5440-4732-9afb-8f457127e836",
  Superhero: "7064a261-a137-4d3a-8848-2d385de3a99c",
  Medical: "c8cbe35b-1b2b-4a3f-9c37-db84c4514856",
  Philosophical: "b1e97889-25b4-4258-b28b-cd7f4d28ea9b",
  "Boys' Love": "5920b825-4181-4a17-beeb-9918b0ff7a30",
  "Girls' Love": "a3c67850-4684-404e-9b7f-c69850ee5da6",
  "Magical Girls": "81c836c9-914a-4eca-981a-560dad663e73",
};

export const searchManhua = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { query?: string; offset?: number; genre?: string }) => data ?? {},
  )
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
    const tagId = data?.genre ? GENRES[data.genre] : undefined;
    if (tagId) params.append("includedTags[]", tagId);
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
    const saver: string[] = json.chapter.dataSaver ?? [];
    const fallback = "https://uploads.mangadex.org";
    return {
      pages: files.map((f, i) => ({
        saver: saver[i] ? `${baseUrl}/data-saver/${hash}/${saver[i]}` : null,
        original: `${baseUrl}/data/${hash}/${f}`,
        fallback: `${fallback}/data/${hash}/${f}`,
      })),
    };
  });
