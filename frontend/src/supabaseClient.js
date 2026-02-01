import { createClient } from '@supabase/supabase-js'

// Thay URL và Key của bạn vào đây
const supabaseUrl = 'https://mizckkkwhggqphptwyvz.supabase.co'
const supabaseKey = 'sb_publishable_XG6geLGfbcorX5GSUVxIFA_sfL3g3t2'

// ⚠️ QUAN TRỌNG: Phải có chữ "export const" ở đầu dòng này
export const supabase = createClient(supabaseUrl, supabaseKey)