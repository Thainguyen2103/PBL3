-- SQL Function để tự động hủy các match ready_check quá hạn
-- Tạo function này trong Supabase SQL Editor
-- Sau đó setup cron job chạy mỗi giây: SELECT cancel_expired_ready_checks();

CREATE OR REPLACE FUNCTION cancel_expired_ready_checks()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_cancelled_count INTEGER := 0;
    v_match RECORD;
BEGIN
    -- Tìm tất cả match ready_check quá 15 giây
    FOR v_match IN
        SELECT id, match_identifier, ready_check_started_at
        FROM matches
        WHERE status = 'ready_check'
          AND ready_check_started_at IS NOT NULL
          AND EXTRACT(EPOCH FROM (NOW() - ready_check_started_at)) > 15
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Đánh dấu match là cancelled
        UPDATE matches
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE id = v_match.id;

        v_cancelled_count := v_cancelled_count + 1;

        RAISE NOTICE 'Cancelled match % due to ready check timeout', v_match.match_identifier;
    END LOOP;

    RETURN json_build_object(
        'status', 'success',
        'cancelled_count', v_cancelled_count
    );
END;
$$;

-- Để setup cron job trong Supabase:
-- 1. Vào Supabase Dashboard > Database > Extensions
-- 2. Enable extension "pg_cron"
-- 3. Chạy lệnh sau để tạo cron job:

/*
SELECT cron.schedule(
    'cancel-expired-ready-checks',
    '* * * * *', -- Chạy mỗi phút
    $$SELECT cancel_expired_ready_checks()$$
);
*/

-- Hoặc nếu muốn chạy thường xuyên hơn, có thể dùng pg_timetable hoặc xử lý ở client side
