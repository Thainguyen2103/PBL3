// backend/server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai"); // SDK AI mới nhất
const supabase = require("./supabaseClient"); // Import file kết nối Supabase vừa tạo
const kanjiDict = require("./kanji-dictionary.json");

dotenv.config();
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// Khởi tạo AI (Giữ nguyên logic nhận diện chữ đang chạy tốt của bạn)
const googleAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// Dùng model 2.5 Flash như yêu cầu
const modelAI = googleAI.generativeAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- 1. XỬ LÝ ĐĂNG KÝ (Kết nối Supabase) ---
app.post("/api/register", async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // Gọi Supabase để tạo user mới
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            return res.status(400).json({ error: error.message }); // Trả lỗi thật nếu có (ví dụ: email đã tồn tại)
        }

        res.json({ message: "Đăng ký thành công! Hãy kiểm tra email để xác thực (nếu bật) hoặc đăng nhập ngay." });
    } catch (err) {
        res.status(500).json({ error: "Lỗi Server khi đăng ký" });
    }
});

// --- 2. XỬ LÝ ĐĂNG NHẬP (Kết nối Supabase) ---
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Gọi Supabase để kiểm tra email/pass
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        // NẾU CÓ LỖI (Sai pass, không tìm thấy email) -> CHẶN NGAY
        if (error) {
            console.log("Lỗi đăng nhập:", error.message);
            return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác!" });
        }

        // Nếu thành công, trả về session token thật
        res.json({ 
            message: "Đăng nhập thành công!",
            session: {
                user: data.user,
                token: data.session.access_token 
            }
        });

    } catch (err) {
        res.status(500).json({ error: "Lỗi Server khi đăng nhập" });
    }
});

// --- 3. XỬ LÝ OCR KANJI (Giữ nguyên code chuẩn cũ) ---
app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: "Không có dữ liệu ảnh" });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const result = await modelAI.generateContent([
            { text: "OCR Kanji: list 6 most likely characters, no spaces, no explanation." },
            { inlineData: { data: base64Data, mimeType: "image/png" } },
        ]);

        const text = result.response.text().trim();
        const chars = text.split("").slice(0, 6);

        const candidates = chars.map(char => {
            const found = kanjiDict.find(item => item.kanji === char);
            return found || { kanji: char, hanviet: "MỚI", mean: "Dữ liệu AI" };
        });

        res.json({ candidates });
    } catch (error) {
        console.error("LỖI AI:", error.message);
        res.status(500).json({ error: `Lỗi AI: ${error.message}` });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server LIVE tại cổng ${PORT} - Đã kết nối Supabase`));