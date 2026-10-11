import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ReaderSettings = {
  width: "fit" | "narrow" | "medium";
  bg: "default" | "black" | "warm";
  quality: "saver" | "hd";
};
export const DEFAULT_SETTINGS: ReaderSettings = { width: "medium", bg: "default", quality: "saver" };
const KEY = "inkscroll-reader";

/** Loads prefs from the signed-in profile (falls back to this device), saves to both. */
export function useReaderSettings() {
  const [s, setS] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {}
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: row } = await supabase
          .from("reader_preferences")
          .select("width, bg, quality")
          .eq("user_id", uid)
          .maybeSingle();
        if (row) {
          const next = { ...DEFAULT_SETTINGS, ...row } as ReaderSettings;
          setS(next);
          localStorage.setItem(KEY, JSON.stringify(next));
        }
      }
      setLoaded(true);
    })();
  }, []);

  const update = (patch: Partial<ReaderSettings>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(KEY, JSON.stringify(next));
      if (userId) {
        void supabase
          .from("reader_preferences")
          .upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() });
      }
      return next;
    });
  };
  return { settings: s, update, signedIn: !!userId, loaded };
}
