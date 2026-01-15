const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const kanjiDict = require("./kanji-dictionary.json"); 

dotenv.config();
const app = express();

// Cấu hình CORS để Vercel có thể truy cập Backend
app.use(cors({ origin: "*" })); 
app.use(express.json({ limit: "10mb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- FIX LỖI 404: Cấu hình Route có tiền tố /api/ ---
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    console.log("Đăng nhập:", email);
    if (email && password) {
        res.json({ 
            message: "Đăng nhập thành công!",
            session: { user: { email: email }, token: "fixed-pbl3-token" } 
        });
    } else {
        res.status(400).json({ error: "Thiếu thông tin đăng nhập" });
    }
});

app.post("/api/register", (req, res) => {
    res.json({ message: "Đăng ký thành công!" });
});

app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const result = await model.generateContent([
            { text: "OCR Kanji: list 6 most likely characters, no spaces, no explanation." },
            { inlineData: { data: base64Data, mimeType: "image/png" } },
        ]);

        const chars = result.response.text().trim().split("").slice(0, 6);
        const candidates = chars.map(char => {
            const found = kanjiDict.find(item => item.kanji === char);
            return found || { kanji: char, hanviet: "MỚI", mean: "Nhấn phân tích AI để xem" };
        });

        res.json({ candidates });
    } catch (error) {
        res.status(500).json({ error: "Lỗi AI" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server LIVE tại cổng ${PORT}`));