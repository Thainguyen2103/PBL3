const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Đưa dòng này lên đầu để nạp biến môi trường ngay lập tức
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 5000;

// --- CẤU HÌNH MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Tăng giới hạn nhận ảnh
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- KẾT NỐI SUPABASE TRỰC TIẾP TẠI ĐÂY ---
// (Không dùng file supabaseClient.js nữa để tránh lỗi)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Kiểm tra xem có Key chưa (để debug lỗi)
if (!supabaseUrl || !supabaseKey) {
    console.error("❌ LỖI NGHIÊM TRỌNG: Chưa tìm thấy SUPABASE_URL hoặc SUPABASE_KEY trong biến môi trường!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- KẾT NỐI GOOGLE GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// =======================
// CÁC ROUTE API
// =======================

// 1. Route Đăng ký
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: "Đăng ký thành công!", user: data.user });
});

// 2. Route Đăng nhập
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: "Đăng nhập thành công!", session: data.session });
});

// 3. API Nhận diện chữ viết tay (OCR)
app.post('/api/ocr', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) return res.status(400).json({ error: "Thiếu dữ liệu ảnh" });

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    // Sửa dòng này:
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = "Đây là một chữ cái Kanji (tiếng Nhật) viết tay. Hãy nhận diện xem nó là chữ gì. Chỉ trả về duy nhất ký tự Kanji đó làm kết quả. Không thêm bất kỳ lời giải thích nào.";

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/png" } },
    ]);

    const text = result.response.text().trim();
    console.log("Gemini nhận diện:", text);
    res.json({ result: text });

  } catch (error) {
    console.error("Lỗi Gemini:", error);
    res.status(500).json({ error: "Lỗi nhận diện", details: error.message });
  }
});

// Route kiểm tra sức khỏe server
app.get('/', (req, res) => {
    res.send('✅ Server Node.js đang chạy ngon lành!');
});

app.listen(PORT, () => console.log(`🚀 Backend chạy tại http://localhost:${PORT}`));
// Update: Force server restart to load new library