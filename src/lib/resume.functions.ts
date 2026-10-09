import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input = {
  mangaId: string;
  title: string;
  note: string;
  currentChapterId: string;
  chapters: { id: string; chapter: string | null }[];
};

export type ResumeSuggestion = {
  chapterId: string | null;
  chapterLabel: string;
  page: number | null;
  reason: string;
};

export const suggestResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Input) => {
    if (!d?.mangaId || typeof d.note !== "string") throw new Error("Invalid input");
    return { ...d, note: d.note.slice(0, 500), chapters: (d.chapters ?? []).slice(0, 1500) };
  })
  .handler(async ({ data, context }): Promise<ResumeSuggestion> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");

    const { data: history } = await context.supabase
      .from("reading_history")
      .select("manga_id, manga_title, chapter_id, chapter_label, read_at")
      .order("read_at", { ascending: false })
      .limit(20);

    const { data: progress } = await context.supabase
      .from("chapter_progress")
      .select("chapter_label, last_page, total_pages, completed, updated_at")
      .eq("manga_id", data.mangaId)
      .order("updated_at", { ascending: false })
      .limit(60);
    const progressText =
      (progress ?? [])
        .map((p) => `Ch ${p.chapter_label || "?"}: page ${p.last_page}/${p.total_pages}${p.completed ? " (finished)" : " (unfinished)"}, last opened ${p.updated_at}`)
        .join("\n") || "none";

    const byId = new Map(data.chapters.map((c) => [c.id, c.chapter]));
    const thisSeries = (history ?? []).find((h) => h.manga_id === data.mangaId);
    const current = byId.get(data.currentChapterId);

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const { createLovableAiGatewayRunIdFetch } = await import("./ai/run-id.server");
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const prompt = [
      `Series: ${data.title || data.mangaId}`,
      `Available chapter numbers (oldest to newest): ${data.chapters.map((c) => c.chapter ?? "?").join(", ")}`,
      `Chapter currently open: ${current ?? "unknown"}`,
      `Saved history for this series: ${thisSeries ? `${thisSeries.chapter_label} (read ${thisSeries.read_at})` : "none"}`,
      `Per-chapter progress for this series (most recent first):\n${progressText}`,
      `Other recent reading: ${(history ?? []).filter((h) => h.manga_id !== data.mangaId).slice(0, 8).map((h) => `${h.manga_title} – ${h.chapter_label}`).join("; ") || "none"}`,
      `Reader's note: "${data.note || "(no note — just suggest where to resume)"}"`,
    ].join("\n");

    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions:
        'You help a manhua reader decide where to resume. Use the per-chapter progress as the source of truth: if the most recently opened chapter is unfinished, resume there at its last page; if finished, suggest the next chapter at page 1. A reader note overrides this. Pick a chapter number that exists in the list. Reply with only JSON: {"chapter": "<chapter number as listed>", "page": <page number or null>, "reason": "<one or two friendly sentences>"}',
      messages: [{ role: "user", content: prompt }],
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const text = await result.text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("The AI didn't return a suggestion. Please try again.");
    let parsed: { chapter?: string | number; page?: number | null; reason?: string };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error("The AI didn't return a suggestion. Please try again.");
    }
    const label = String(parsed.chapter ?? "");
    const target = data.chapters.find((c) => c.chapter === label);
    return {
      chapterId: target?.id ?? null,
      chapterLabel: label,
      page: typeof parsed.page === "number" && parsed.page > 0 ? Math.floor(parsed.page) : null,
      reason: parsed.reason ?? "",
    };
  });
