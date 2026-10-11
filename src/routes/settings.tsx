import { createFileRoute, Link } from "@tanstack/react-router";
import { useReaderSettings, type ReaderSettings } from "@/lib/reader-settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Reader Settings — InkScroll" },
      { name: "description", content: "Choose page width, background and image quality for reading manhua on InkScroll." },
      { property: "og:title", content: "Reader Settings — InkScroll" },
      { property: "og:description", content: "Save your manhua reading preferences across sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings: s, update, signedIn, loaded } = useReaderSettings();
  const row = <K extends keyof ReaderSettings>(label: string, hint: string, key: K, opts: [ReaderSettings[K], string][]) => (
    <section className="rounded-md border border-border bg-card p-5">
      <h2 className="font-semibold">{label}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {opts.map(([v, l]) => (
          <button
            key={v}
            onClick={() => update({ [key]: v } as Partial<ReaderSettings>)}
            className={`rounded-md border px-4 py-2 text-sm ${s[key] === v ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </section>
  );
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10">
      <h1 className="font-display text-4xl">Reader settings</h1>
      {loaded && (
        <p className="text-sm text-muted-foreground">
          {signedIn ? (
            "Saved to your account — they follow you on every device."
          ) : (
            <>
              Saved on this device only. <Link to="/auth" className="text-primary underline">Sign in</Link> to keep them across sessions.
            </>
          )}
        </p>
      )}
      {row("Page width", "How wide pages appear on large screens.", "width", [["fit", "Fit screen"], ["medium", "Medium"], ["narrow", "Narrow"]])}
      {row("Background", "Colour behind the pages.", "bg", [["default", "Slate"], ["black", "Black"], ["warm", "Warm"]])}
      {row("Image quality", "Data saver loads faster; HD is sharper.", "quality", [["saver", "Data saver"], ["hd", "Original HD"]])}
    </main>
  );
}
