const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const kanjiDict = require("./kanji-dictionary.json"); 

dotenv.config();
const app = express();

// Cấu hình CORS mở để nhận yêu cầu từ Vercel
app.use(cors({ origin: "*" })); 
app.use(express.json({ limit: "10mb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- 1. ENDPOINT ĐĂNG NHẬP (Fix lỗi 404) ---
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    console.log("Yêu cầu đăng nhập:", email);
    
    if (email && password) {
        // Trả về dữ liệu session để Frontend lưu vào localStorage
        res.json({ 
            message: "Đăng nhập thành công!",
            session: { user: { email: email }, token: "pbl3-auth-token-fixed" } 
        });
    } else {
        res.status(400).json({ error: "Vui lòng nhập đầy đủ email và mật khẩu" });
    }
});

// --- 2. ENDPOINT ĐĂNG KÝ ---
app.post("/api/register", (req, res) => {
    res.json({ message: "Đăng ký thành công! Bạn có thể đăng nhập ngay." });
});

// --- 3. ENDPOINT NHẬN DIỆN KANJI (6 GỢI Ý) ---
app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([
            { text: "OCR Kanji: list 6 most likely characters, no spaces, no explanation." },
            { inlineData: { data: base64Data, mimeType: "image/png" } },
        ]);

        const chars = result.response.text().trim().split("").slice(0, 6);

        // Khớp dữ liệu offline trực tiếp tại server để Frontend không cần xử lý nặng
        const candidates = chars.map(char => {
            const found = kanjiDict.find(item => item.kanji === char);
            return found || { kanji: char, hanviet: "MỚI", mean: "Ký tự hiếm - Hãy nhấn Phân tích AI" };
        });

        res.json({ candidates });
    } catch (error) {
        console.error("Lỗi AI:", error.message);
        res.status(500).json({ error: "Lỗi xử lý AI" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`--- SERVER ĐÃ LIVE TẠI CỔNG ${PORT} ---`));