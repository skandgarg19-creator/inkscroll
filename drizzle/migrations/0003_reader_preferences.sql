CREATE TABLE public.reader_preferences (
  user_id uuid PRIMARY KEY,
  width text NOT NULL DEFAULT 'medium' CHECK (width IN ('fit','narrow','medium')),
  bg text NOT NULL DEFAULT 'default' CHECK (bg IN ('default','black','warm')),
  quality text NOT NULL DEFAULT 'saver' CHECK (quality IN ('saver','hd')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reader_preferences TO authenticated;
GRANT ALL ON public.reader_preferences TO service_role;
ALTER TABLE public.reader_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs select" ON public.reader_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own prefs insert" ON public.reader_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prefs update" ON public.reader_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);