-- SQL Function để xử lý ready check một cách atomic
-- Tạo function này trong Supabase SQL Editor

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
    -- Lock row để tránh race condition
    SELECT * INTO v_match
    FROM matches
    WHERE id = p_match_id
    FOR UPDATE;

    -- Kiểm tra match có tồn tại không
    IF NOT FOUND THEN
        RETURN json_build_object(
            'status', 'error',
            'message', 'Match not found'
        );
    END IF;

    -- Kiểm tra match có đang trong ready_check không
    IF v_match.status != 'ready_check' THEN
        RETURN json_build_object(
            'status', 'error',
            'message', 'Match is not in ready_check state'
        );
    END IF;

    -- Lấy danh sách ready_players hiện tại
    v_ready_players := COALESCE(v_match.ready_players, ARRAY[]::INTEGER[]);

    -- Kiểm tra player đã ready chưa
    IF p_player_id = ANY(v_ready_players) THEN
        RETURN json_build_object(
            'status', 'already_ready',
            'ready_count', array_length(v_ready_players, 1),
            'total_players', jsonb_array_length(v_match.players)
        );
    END IF;

    -- Thêm player vào danh sách ready
    v_ready_players := array_append(v_ready_players, p_player_id);
    v_total_players := jsonb_array_length(v_match.players);

    -- Cập nhật ready_players
    UPDATE matches
    SET ready_players = v_ready_players,
        status = CASE 
            WHEN array_length(v_ready_players, 1) >= v_total_players THEN 'found'
            ELSE 'ready_check'
        END,
        updated_at = NOW()
    WHERE id = p_match_id;

    -- Trả về kết quả
    v_result := json_build_object(
        'status', 'success',
        'ready_count', array_length(v_ready_players, 1),
        'total_players', v_total_players,
        'all_ready', array_length(v_ready_players, 1) >= v_total_players
    );

    RETURN v_result;
END;
$$;
