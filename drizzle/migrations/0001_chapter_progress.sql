CREATE TABLE public.chapter_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  manga_id text NOT NULL,
  chapter_id text NOT NULL,
  chapter_label text NOT NULL DEFAULT '',
  last_page integer NOT NULL DEFAULT 1,
  total_pages integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_id)
);
CREATE INDEX chapter_progress_user_manga ON public.chapter_progress (user_id, manga_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_progress TO authenticated;
GRANT ALL ON public.chapter_progress TO service_role;
ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chapter progress" ON public.chapter_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);