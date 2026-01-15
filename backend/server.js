const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// SỬ DỤNG BỘ SDK MỚI NHƯ YÊU CẦU
const { GoogleGenAI } = require("@google/genai"); 
const kanjiDict = require("./kanji-dictionary.json");

dotenv.config();
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// 1. KHỞI TẠO SDK MỚI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- ROUTE ĐĂNG NHẬP (Fix lỗi 404) ---
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        res.json({ 
            message: "Đăng nhập thành công!",
            session: { user: { email }, token: "pbl3-auth-token-fixed" } 
        });
    } else {
        res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
    }
});

// --- ROUTE NHẬN DIỆN KANJI (Fix lỗi is not a function) ---
app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: "Không có dữ liệu ảnh" });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        // 2. SỬ DỤNG MODEL MỚI: gemini-2.5-flash
        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const result = await model.generateContent([
            { text: "OCR Kanji: list 6 most likely characters, no spaces, no explanation." },
            { inlineData: { data: base64Data, mimeType: "image/png" } },
        ]);

        const text = result.response.text().trim();
        const chars = text.split("").slice(0, 6);

        // Khớp dữ liệu từ điển offline ngay tại server
        const candidates = chars.map(char => {
            const found = kanjiDict.find(item => item.kanji === char);
            return found || { kanji: char, hanviet: "MỚI", mean: "Dữ liệu AI" };
        });

        res.json({ candidates });
    } catch (error) {
        // Xuất lỗi chi tiết ra Render Logs để kiểm tra API Key
        console.error("LỖI CHI TIẾT:", error.message);
        res.status(500).json({ error: `Lỗi AI: ${error.message}` });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server LIVE với SDK @google/genai và Gemini 2.5 Flash`));