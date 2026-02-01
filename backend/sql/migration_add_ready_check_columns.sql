-- Migration để thêm các cột cần thiết cho ready check
-- Chạy trong Supabase SQL Editor

-- Thêm cột ready_players (mảng integer để lưu user IDs đã ready)
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS ready_players INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Thêm cột ready_check_started_at (timestamp khi bắt đầu ready check)
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS ready_check_started_at TIMESTAMPTZ;

-- Cập nhật enum status nếu cần (thêm 'ready_check' và 'cancelled')
-- Nếu status là TEXT thì không cần làm gì
-- Nếu status là ENUM thì cần:
-- ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'ready_check';
-- ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Tạo index để tối ưu query
CREATE INDEX IF NOT EXISTS idx_matches_ready_check 
ON matches(status, ready_check_started_at) 
WHERE status = 'ready_check';

-- Comment
COMMENT ON COLUMN matches.ready_players IS 'Array of user IDs who have confirmed ready';
COMMENT ON COLUMN matches.ready_check_started_at IS 'Timestamp when ready check phase started';

-- Kiểm tra kết quả
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'matches'
ORDER BY ordinal_position;
