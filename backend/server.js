const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/api/ocr", async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: "Thiếu dữ liệu ảnh" });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        // Cập nhật Prompt để lấy 6 gợi ý giúp tăng độ chính xác
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: [{
                role: "user",
                parts: [
                    { text: "Bạn là chuyên gia OCR tiếng Nhật. Hãy liệt kê 6 chữ Kanji có xác suất giống nhất với hình vẽ này (kể cả khi thiếu nét). Chỉ trả về danh sách các chữ đó, viết liền nhau, không giải thích gì thêm." },
                    { inlineData: { data: base64Data, mimeType: "image/png" } },
                ],
            }],
        });

        const rawText = result?.text || "";
        // Chuyển chuỗi chữ cái thành mảng 6 phần tử
        const kanjiCandidates = rawText.trim().split("").filter(c => c.trim()).slice(0, 6);

        console.log("Gợi ý từ AI:", kanjiCandidates);
        res.json({ candidates: kanjiCandidates });

    } catch (error) {
        console.error("Lỗi Server:", error.message);
        res.status(500).json({ error: "Lỗi AI", details: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server chạy tại cổng ${PORT}`));