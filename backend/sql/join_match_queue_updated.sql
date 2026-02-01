-- SQL Function cập nhật để hỗ trợ ready check
-- Cập nhật function join_match_queue trong Supabase SQL Editor

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
    -- Tìm match đang chờ với cùng mode
    SELECT id, match_identifier, players, status
    INTO v_match_id, v_match_identifier, v_current_players, v_status
    FROM matches
    WHERE mode = p_mode 
      AND status = 'waiting'
      AND jsonb_array_length(players) < p_mode
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- Nếu tìm thấy match đang chờ
    IF FOUND THEN
        -- Kiểm tra player đã trong match chưa
        IF v_current_players @> jsonb_build_array(p_player_data) THEN
            RETURN json_build_object(
                'status', 'already_in_match',
                'match_id', v_match_id,
                'match_identifier', v_match_identifier
            );
        END IF;

        -- Thêm player vào match
        v_current_players := v_current_players || jsonb_build_array(p_player_data);
        v_player_count := jsonb_array_length(v_current_players);

        -- Nếu đủ người -> chuyển sang ready_check
        IF v_player_count >= p_mode THEN
            UPDATE matches
            SET players = v_current_players,
                status = 'ready_check', -- 🔥 Chuyển sang ready_check thay vì found
                ready_players = ARRAY[]::INTEGER[], -- Khởi tạo mảng rỗng
                ready_check_started_at = NOW(),
                updated_at = NOW()
            WHERE id = v_match_id;

            v_result := json_build_object(
                'status', 'ready_check', -- 🔥 Trả về ready_check
                'match_id', v_match_id,
                'match_identifier', v_match_identifier,
                'player_count', v_player_count
            );
        ELSE
            -- Chưa đủ người, vẫn waiting
            UPDATE matches
            SET players = v_current_players,
                updated_at = NOW()
            WHERE id = v_match_id;

            v_result := json_build_object(
                'status', 'waiting',
                'match_id', v_match_id,
                'match_identifier', v_match_identifier,
                'player_count', v_player_count
            );
        END IF;

        RETURN v_result;
    END IF;

    -- Không tìm thấy match -> tạo match mới
    v_match_identifier := 'match_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || floor(random() * 10000)::TEXT;
    
    INSERT INTO matches (match_identifier, mode, players, status, ready_players)
    VALUES (
        v_match_identifier,
        p_mode,
        jsonb_build_array(p_player_data),
        'waiting',
        ARRAY[]::INTEGER[]
    )
    RETURNING id, match_identifier INTO v_match_id, v_match_identifier;

    v_result := json_build_object(
        'status', 'waiting',
        'match_id', v_match_id,
        'match_identifier', v_match_identifier,
        'player_count', 1
    );

    RETURN v_result;
END;
$$;
