const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const kanjiDict = require("./kanji-dictionary.json"); 

dotenv.config();
const app = express();

app.use(cors({ origin: "*" })); 
app.use(express.json({ limit: "10mb" }));

// Log mọi yêu cầu đến để bạn theo dõi trên Render Dashboard
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] Request: ${req.method} ${req.url}`);
    next();
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- ROUTE ĐĂNG NHẬP (Khớp /api/login) ---
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        res.json({ 
            message: "Thành công!",
            session: { user: { email }, token: "pbl3-auth-token" } 
        });
    } else {
        res.status(400).json({ error: "Thiếu thông tin đăng nhập" });
    }
});

// --- ROUTE NHẬN DIỆN KANJI (6 GỢI Ý) ---
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
        const chars = text.split("").slice(0, 6);

        const candidates = chars.map(char => {
            const found = kanjiDict.find(item => item.kanji === char);
            return found || { kanji: char, hanviet: "MỚI", mean: "Dữ liệu AI" };
        });

        res.json({ candidates });
    } catch (error) {
        console.error("LỖI AI CHI TIẾT:", error.message);
        res.status(500).json({ error: `Lỗi AI: ${error.message}` });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server LIVE tại cổng ${PORT}`));