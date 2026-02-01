-- ⚡ TẠO BẢNG DAILY_STATS ĐỂ TRACKING THỐNG KÊ THEO NGÀY ⚡

-- 📌 BƯỚC 1: Tạo bảng daily_stats
CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
    flashcards_learned INTEGER DEFAULT 0,      -- Số flashcard đã thuộc trong ngày
    challenge_score INTEGER DEFAULT 0,          -- Điểm chiến công kiếm được trong ngày
    rank_points_earned INTEGER DEFAULT 0,       -- Rank points kiếm được trong ngày (Arena)
    kanji_learned INTEGER DEFAULT 0,            -- Số kanji học trong ngày
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Đảm bảo mỗi user chỉ có 1 record mỗi ngày
    UNIQUE(user_id, stat_date)
);

-- 📌 BƯỚC 2: Tạo index để query nhanh hơn
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, stat_date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(stat_date);

-- 📌 BƯỚC 3: Function để cập nhật hoặc tạo mới daily stats
CREATE OR REPLACE FUNCTION update_daily_stat(
    p_user_id UUID,
    p_stat_type TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert hoặc update record cho ngày hôm nay
    INSERT INTO daily_stats (user_id, stat_date, flashcards_learned, challenge_score, rank_points_earned, kanji_learned)
    VALUES (
        p_user_id, 
        CURRENT_DATE, 
        CASE WHEN p_stat_type = 'flashcards' THEN p_increment ELSE 0 END,
        CASE WHEN p_stat_type = 'challenge_score' THEN p_increment ELSE 0 END,
        CASE WHEN p_stat_type = 'rank_points' THEN p_increment ELSE 0 END,
        CASE WHEN p_stat_type = 'kanji' THEN p_increment ELSE 0 END
    )
    ON CONFLICT (user_id, stat_date)
    DO UPDATE SET
        flashcards_learned = daily_stats.flashcards_learned + CASE WHEN p_stat_type = 'flashcards' THEN p_increment ELSE 0 END,
        challenge_score = daily_stats.challenge_score + CASE WHEN p_stat_type = 'challenge_score' THEN p_increment ELSE 0 END,
        rank_points_earned = daily_stats.rank_points_earned + CASE WHEN p_stat_type = 'rank_points' THEN p_increment ELSE 0 END,
        kanji_learned = daily_stats.kanji_learned + CASE WHEN p_stat_type = 'kanji' THEN p_increment ELSE 0 END,
        updated_at = NOW();
END;
$$;

-- 📌 BƯỚC 4: Enable RLS (Row Level Security)
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Policy: User chỉ được xem stats của chính mình
CREATE POLICY "Users can view their own daily stats"
    ON daily_stats FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: User có thể insert/update stats của chính mình  
CREATE POLICY "Users can insert their own daily stats"
    ON daily_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily stats"
    ON daily_stats FOR UPDATE
    USING (auth.uid() = user_id);

-- 📌 BƯỚC 5: Grant permissions
GRANT ALL ON daily_stats TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_stat TO authenticated;
