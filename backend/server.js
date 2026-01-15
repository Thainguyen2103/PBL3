const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const kanjiDict = require("./kanji-dictionary.json"); 

dotenv.config();
const app = express();

// Cấu hình CORS mở để Frontend trên Vercel có thể truy cập
app.use(cors({ origin: "*" })); 
app.use(express.json({ limit: "10mb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        // Prompt tối ưu để lấy nhanh 6 gợi ý
        const result = await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent([
            { text: "OCR Kanji: list 6 most likely characters, no spaces, no explanation." },
            { inlineData: { data: base64Data, mimeType: "image/png" } },
        ]);

        const chars = result.response.text().trim().split("").slice(0, 6);

        // Khớp dữ liệu từ điển ngay tại Server để Frontend chạy nhanh hơn
        const candidates = chars.map(char => {
            const found = kanjiDict.find(item => item.kanji === char);
            return found || { kanji: char, hanviet: "Mới", mean: "Nhấn phân tích để xem chi tiết" };
        });

        res.json({ candidates });
    } catch (error) {
        console.error("Lỗi AI:", error.message);
        res.status(500).json({ error: "Lỗi kết nối AI" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server đang chạy tại cổng ${PORT}`));