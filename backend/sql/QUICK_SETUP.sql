-- ⚡ QUICK SETUP GUIDE FOR READY CHECK SYSTEM ⚡
-- Copy và paste các đoạn SQL này vào Supabase SQL Editor

-- 📌 BƯỚC 0: Xóa tất cả matches cũ (để tránh lỗi dữ liệu)
DELETE FROM matches WHERE status IN ('waiting', 'ready_check', 'cancelled');

-- 📌 BƯỚC 1: Thêm các cột mới vào bảng matches
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS ready_players INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN IF NOT EXISTS ready_check_started_at TIMESTAMPTZ;

-- Đảm bảo cột mode tồn tại
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS mode INTEGER DEFAULT 2;

-- Thêm cột updated_at nếu chưa có
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Thêm cột created_at nếu chưa có
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_matches_ready_check 
ON matches(status, ready_check_started_at) 
WHERE status = 'ready_check';

-- 📌 BƯỚC 2: XÓA function cũ trước (xóa tất cả overloads)
DROP FUNCTION IF EXISTS join_match_queue(INTEGER, JSONB);
DROP FUNCTION IF EXISTS join_match_queue(INTEGER, JSON);
DROP FUNCTION IF EXISTS accept_match_ready(UUID, INTEGER);
DROP FUNCTION IF EXISTS accept_match_ready(TEXT, INTEGER);

-- 📌 BƯỚC 3: Tạo lại function join_match_queue
CREATE OR REPLACE FUNCTION join_match_queue(
    p_mode INTEGER,
    p_player_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_match_id UUID;
    v_match_identifier TEXT;
    v_current_players JSONB;
    v_player_count INTEGER;
    v_status TEXT;
    v_result JSON;
BEGIN
    SELECT id, match_identifier, players, status
    INTO v_match_id, v_match_identifier, v_current_players, v_status
    FROM matches
    WHERE mode = p_mode 
      AND status = 'waiting'
      AND jsonb_array_length(players) < p_mode
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
        IF v_current_players @> jsonb_build_array(p_player_data) THEN
            RETURN json_build_object('status', 'already_in_match', 'match_id', v_match_id, 'match_identifier', v_match_identifier);
        END IF;

        v_current_players := v_current_players || jsonb_build_array(p_player_data);
        v_player_count := jsonb_array_length(v_current_players);

        IF v_player_count >= p_mode THEN
            UPDATE matches SET players = v_current_players, status = 'ready_check', ready_players = ARRAY[]::INTEGER[], ready_check_started_at = NOW(), updated_at = NOW() WHERE id = v_match_id;
            v_result := json_build_object('status', 'ready_check', 'match_id', v_match_id, 'match_identifier', v_match_identifier, 'player_count', v_player_count);
        ELSE
            UPDATE matches SET players = v_current_players, updated_at = NOW() WHERE id = v_match_id;
            v_result := json_build_object('status', 'waiting', 'match_id', v_match_id, 'match_identifier', v_match_identifier, 'player_count', v_player_count);
        END IF;

        RETURN v_result;
    END IF;

    v_match_identifier := 'match_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || floor(random() * 10000)::TEXT;
    
    INSERT INTO matches (match_identifier, mode, players, status, ready_players)
    VALUES (v_match_identifier, p_mode, jsonb_build_array(p_player_data), 'waiting', ARRAY[]::INTEGER[])
    RETURNING id, match_identifier INTO v_match_id, v_match_identifier;

    v_result := json_build_object('status', 'waiting', 'match_id', v_match_id, 'match_identifier', v_match_identifier, 'player_count', 1);
    RETURN v_result;
END;
$$;

-- 📌 BƯỚC 4: Tạo function accept_match_ready
CREATE OR REPLACE FUNCTION accept_match_ready(
    p_match_id UUID,
    p_player_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_match RECORD;
    v_ready_players INTEGER[];
    v_total_players INTEGER;
    v_result JSON;
BEGIN
    SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('status', 'error', 'message', 'Match not found');
    END IF;

    IF v_match.status != 'ready_check' THEN
        RETURN json_build_object('status', 'error', 'message', 'Match is not in ready_check state');
    END IF;

    v_ready_players := COALESCE(v_match.ready_players, ARRAY[]::INTEGER[]);

    IF p_player_id = ANY(v_ready_players) THEN
        RETURN json_build_object('status', 'already_ready', 'ready_count', array_length(v_ready_players, 1), 'total_players', jsonb_array_length(v_match.players));
    END IF;

    v_ready_players := array_append(v_ready_players, p_player_id);
    v_total_players := jsonb_array_length(v_match.players);

    UPDATE matches
    SET ready_players = v_ready_players,
        status = CASE WHEN array_length(v_ready_players, 1) >= v_total_players THEN 'found' ELSE 'ready_check' END,
        updated_at = NOW()
    WHERE id = p_match_id;

    v_result := json_build_object('status', 'success', 'ready_count', array_length(v_ready_players, 1), 'total_players', v_total_players, 'all_ready', array_length(v_ready_players, 1) >= v_total_players);
    RETURN v_result;
END;
$$;

-- ✅ XONG! Giờ có thể test ở frontend
-- Frontend code đã được cập nhật trong:
-- - frontend/src/hooks/useArenaMatchmaking.js
-- - frontend/src/pages/ArenaLobbyPage.jsx
-- - frontend/src/utils/translations.js

-- 📌 BƯỚC 5: RELOAD SCHEMA CACHE (BẮT BUỘC!)
NOTIFY pgrst, 'reload schema';

-- 🧪 TEST QUERIES
-- Xem tất cả matches:
-- SELECT id, match_identifier, mode, status, jsonb_array_length(players) as player_count, array_length(ready_players, 1) as ready_count, ready_check_started_at FROM matches ORDER BY created_at DESC LIMIT 10;

-- Kiểm tra function đã tạo:
-- SELECT proname FROM pg_proc WHERE proname IN ('join_match_queue', 'accept_match_ready');

-- Xóa tất cả matches để test lại:
-- DELETE FROM matches;
