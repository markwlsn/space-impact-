-- ==============================================================================
-- SPACE IMPACT REMASTER: SUPABASE REALTIME LEADERBOARD & CLOUD SCHEMA
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- to provision the real-time global leaderboard and arcade placements.

-- 1. Create Leaderboard Table
CREATE TABLE IF NOT EXISTS public.space_impact_leaderboard (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pilot_name VARCHAR(12) NOT NULL,
    score INTEGER NOT NULL,
    stage INTEGER NOT NULL DEFAULT 1,
    ship_id VARCHAR(32) NOT NULL DEFAULT 'NOKIA_VIPER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_score_desc 
ON public.space_impact_leaderboard (score DESC, created_at ASC);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.space_impact_leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow public read access to everyone (arcade leaderboard is public)
CREATE POLICY "Allow public read access"
ON public.space_impact_leaderboard
FOR SELECT
USING (true);

-- Allow public insert access for any player logging their score
CREATE POLICY "Allow public insert access"
ON public.space_impact_leaderboard
FOR INSERT
WITH CHECK (
    score >= 0 
    AND length(trim(pilot_name)) >= 1 
    AND length(pilot_name) <= 12
);

-- 4. Enable Supabase Realtime Publication
-- This broadcasts INSERT events via WebSockets to all active connected browsers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'space_impact_leaderboard'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.space_impact_leaderboard;
    END IF;
END $$;

-- 5. Seed Initial Legendary Hall of Fame Scores (Optional fallback)
INSERT INTO public.space_impact_leaderboard (pilot_name, score, stage, ship_id)
VALUES
    ('MARKWLSN', 99990, 8, 'X_WING'),
    ('NOKIA3310', 88400, 6, 'NOKIA_VIPER'),
    ('SOLO_YT', 74200, 5, 'MILLENNIUM_FALCON'),
    ('TREK_NCC', 61500, 4, 'USS_ENTERPRISE'),
    ('VADER_TIE', 53000, 4, 'TIE_PHANTOM')
ON CONFLICT DO NOTHING;
