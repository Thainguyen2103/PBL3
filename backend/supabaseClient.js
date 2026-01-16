// backend/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ LỖI: Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong file .env");
} else {
    console.log("✅ Supabase Client: Đã tải cấu hình");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;