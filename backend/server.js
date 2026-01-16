// backend/server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai"); 
const supabase = require("./supabaseClient"); 
const kanjiDict = require("./kanji-dictionary.json");

dotenv.config();
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// --- LOG KHỞI ĐỘNG HỆ THỐNG ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("\n========================================");
    console.log(`🚀 BACKEND ĐANG CHẠY TẠI CỔNG: ${PORT}`);
    console.log(`🤖 AI GEMINI (2.5 Flash):      SẴN SÀNG`);
    console.log(`🗄️  DATABASE SUPABASE:          ĐÃ KẾT NỐI`);
    console.log("========================================\n");
});

// Khởi tạo AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- 1. ĐĂNG KÝ (Ghi vào Supabase) ---
app.post("/api/register", async (req, res) => {
    const { email, password } = req.body;
    console.log(`[REGISTER] Đang tạo tài khoản: ${email}`);
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            console.error(`❌ [REGISTER ERROR] ${error.message}`);
            return res.status(400).json({ error: error.message });
        }

        console.log(`✅ [REGISTER SUCCESS] Đã tạo user: ${data.user?.id}`);
        res.json({ message: "Đăng ký thành công! Hãy đăng nhập ngay." });
    } catch (err) {
        res.status(500).json({ error: "Lỗi Server khi đăng ký" });
    }
});

// --- 2. ĐĂNG NHẬP (KIỂM TRA THẬT SỰ) ---
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    console.log(`[LOGIN] Đang kiểm tra: ${email}`);

    try {
        // HÀM QUAN TRỌNG: Kiểm tra pass với Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        // NẾU SAI PASS -> CHẶN NGAY
        if (error) {
            console.log(`⛔ [LOGIN FAILED] Sai mật khẩu hoặc không tồn tại: ${email}`);
            return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác!" });
        }

        console.log(`✅ [LOGIN SUCCESS] User ${email} đã đăng nhập.`);
        res.json({ 
            message: "Đăng nhập thành công!",
            session: {
                user: data.user,
                token: data.session.access_token 
            }
        });

    } catch (err) {
        console.error("Lỗi Server:", err);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
});

// --- 3. OCR KANJI (Giữ nguyên) ---
app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;
        console.log(`[AI OCR] Nhận được yêu cầu phân tích ảnh...`);
        
        if (!image) return res.status(400).json({ error: "Không có ảnh" });
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const model = ai.generativeAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([
            { text: "OCR Kanji: list 6 most likely characters, no spaces, no explanation." },
            { inlineData: { data: base64Data, mimeType: "image/png" } },
        ]);

        const text = result.response.text().trim();
        const chars = text.split("").slice(0, 6);
        
        // Khớp từ điển
        const candidates = chars.map(char => {
            const found = kanjiDict.find(item => item.kanji === char);
            return found || { kanji: char, hanviet: "MỚI", mean: "Dữ liệu AI" };
        });

        console.log(`✅ [AI SUCCESS] Kết quả: ${chars.join(", ")}`);
        res.json({ candidates });
    } catch (error) {
        console.error(`❌ [AI ERROR] ${error.message}`);
        res.status(500).json({ error: `Lỗi AI: ${error.message}` });
    }
});