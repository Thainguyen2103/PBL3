const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const kanjiDict = require("./kanji-dictionary.json"); // Đảm bảo file này nằm cùng thư mục

dotenv.config();
const app = express();

// Cấu hình CORS mở rộng để Vercel truy cập ổn định
app.use(cors({ origin: "*" })); 
app.use(express.json({ limit: "10mb" }));

// Log hệ thống để theo dõi yêu cầu trên Render Dashboard
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] Request nhận được: ${req.method} ${req.url}`);
    next();
});

// Khởi tạo Google AI với API Key từ biến môi trường
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- ROUTE ĐĂNG NHẬP (Dùng tiền tố /api/ để fix lỗi 404) ---
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    console.log(`Đang xử lý đăng nhập cho: ${email}`);
    
    if (email && password) {
        res.json({ 
            message: "Đăng nhập thành công!",
            session: { user: { email }, token: "fixed-pbl3-auth-token-2026" } 
        });
    } else {
        res.status(400).json({ error: "Vui lòng nhập đầy đủ email và mật khẩu" });
    }
});

// --- ROUTE ĐĂNG KÝ ---
app.post("/api/register", (req, res) => {
    const { email } = req.body;
    res.json({ message: "Đăng ký thành công! Bạn có thể đăng nhập ngay." });
});

// --- ROUTE NHẬN DIỆN KANJI (6 GỢI Ý SIÊU TỐC) ---
app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([
            { text: "OCR Kanji: list 6 most likely characters, no spaces, no explanation." },
            { inlineData: { data: base64Data, mimeType: "image/png" } },
        ]);

        const text = result.response.text().trim();
        const chars = text.split("").slice(0, 6); // Lấy tối đa 6 ký tự gợi ý

        // Khớp dữ liệu từ điển offline ngay tại Server
        const finalCandidates = chars.map(char => {
            const found = kanjiDict.find(item => item.kanji === char);
            return found || { 
                kanji: char, 
                hanviet: "MỚI", 
                mean: "Ký tự hiếm - Vui lòng nhấn xem chi tiết AI" 
            };
        });

        console.log(`Nhận diện thành công: ${chars.join(", ")}`);
        res.json({ candidates: finalCandidates });

    } catch (error) {
        console.error("LỖI CHI TIẾT TỪ GOOGLE API:", error.message); // Xuất hiện tại Render Logs
        res.status(500).json({ error: `Lỗi AI: ${error.message}` });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`--- SERVER PBL3 ĐÃ SẴN SÀNG TẠI CỔNG ${PORT} ---`);
});