-- PickleIQ Database Schema
-- Run this in your Supabase SQL editor

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name  TEXT,
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Analyses
CREATE TABLE public.analyses (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    video_path                TEXT NOT NULL DEFAULT '',
    video_duration            INTEGER,
    video_size_bytes          BIGINT,

    status                    TEXT NOT NULL DEFAULT 'pending',
    error_message             TEXT,
    processing_started_at     TIMESTAMPTZ,
    processing_completed_at   TIMESTAMPTZ,

    rating                    NUMERIC(3,2),
    rating_confidence         TEXT,
    component_scores          JSONB,
    shot_analysis             JSONB,
    footwork_analysis         JSONB,
    positioning_analysis      JSONB,
    strengths                 TEXT[],
    weaknesses                TEXT[],
    raw_cv_metrics            JSONB,

    created_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Tips (3 per analysis)
CREATE TABLE public.tips (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id  UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    category     TEXT NOT NULL,
    priority     TEXT NOT NULL,
    tip_text     TEXT NOT NULL,
    drill_text   TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX idx_analyses_status  ON public.analyses(status);
CREATE INDEX idx_tips_analysis_id ON public.tips(analysis_id);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER analyses_updated_at
    BEFORE UPDATE ON public.analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile"   ON public.profiles  FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users manage own analyses"  ON public.analyses  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own tips"      ON public.tips      FOR ALL USING (auth.uid() = user_id);

-- Storage bucket (create in Supabase dashboard or via CLI)
-- Name: "videos"
-- Policy: authenticated users can upload/read their own files
-- Path format: {user_id}/{analysis_id}/{filename}
