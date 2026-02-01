const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();

const corsOptions = {
    origin: [
        "http://localhost:2103",
        "http://localhost:5173",
        "https://kanjilearning.vercel.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 10000;

// 1. KHO KEY
const API_KEYS = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5
].filter(key => key);

if (API_KEYS.length === 0 && process.env.GEMINI_API_KEY) {
    API_KEYS.push(process.env.GEMINI_API_KEY);
}

// 2. CẤU HÌNH GIỚI HẠN (QUOTA) ĐỂ ĐẾM
const MODEL_LIMITS = {
    "gemini-2.5-flash": 20,      // Giới hạn 20/ngày
    "gemini-3-flash": 20,        // Giới hạn 20/ngày
    "gemini-1.5-flash": 1500,    // Giới hạn 1500/ngày
    "gemma-2-27b-it": 14400      // Giới hạn siêu to
};

// 3. DANH SÁCH XOAY TUA
const MODEL_LIST = [
    "gemini-2.5-flash",    
    "gemini-3-flash",      
    "gemini-1.5-flash",    
    "gemma-2-27b-it" 
];

// --- BỘ ĐẾM (Lưu trong RAM) ---
// Cấu trúc: { "Key_Index": { "model_name": so_lan_da_dung } }
const usageTracker = {};

// Hàm lấy Key ngẫu nhiên (Có trả về cả index để theo dõi)
const getRandomKeyData = () => {
    if (API_KEYS.length === 0) return null;
    const index = Math.floor(Math.random() * API_KEYS.length);
    return { key: API_KEYS[index], index: index };
};

// --- ROUTE GỐC ---
app.get("/", (req, res) => res.send(`🚀 Backend đang chạy (Keys: ${API_KEYS.length})!`));

// --- API CHATBOT ---
app.post("/api/chat", async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (API_KEYS.length === 0) return res.status(500).json({ error: "Chưa cấu hình API Key!" });
        if (!message) return res.status(400).json({ error: "Vui lòng nhập tin nhắn" });

        // Xử lý lịch sử chat
        let contents = [];
        if (history && Array.isArray(history)) {
            contents = history
                .filter(msg => msg.role === 'user' || msg.role === 'model')
                .map(msg => ({
                    role: msg.role,
                    parts: [{ text: msg.parts[0].text }]
                }));
            if (contents.length > 0 && contents[0].role === 'model') contents.shift();
        }
        contents.push({ role: "user", parts: [{ text: message }] });

        let finalReply = null;
        let lastError = null;

        // VÒNG LẶP THỬ MODEL
        for (const modelName of MODEL_LIST) {
            try {
                // Lấy ngẫu nhiên 1 Key
                const { key, index } = getRandomKeyData();
                const keyShort = `...${key.slice(-4)}`; // Lấy 4 số cuối để log cho gọn

                console.log(`🤖 Đang thử: ${modelName} | Key [${index}]: ${keyShort}`);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: contents,
                        system_instruction: {
                            parts: { text: `VAI TRÒ: Lão Vô Danh... (như cũ)` }
                        }
                    })
                });

                const data = await response.json();

                if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    finalReply = data.candidates[0].content.parts[0].text;
                    
                    // --- 📊 CẬP NHẬT & IN LOG THỐNG KÊ ---
                    
                    // 1. Khởi tạo bộ đếm cho Key này nếu chưa có
                    if (!usageTracker[index]) usageTracker[index] = {};
                    if (!usageTracker[index][modelName]) usageTracker[index][modelName] = 0;

                    // 2. Tăng số lần dùng
                    usageTracker[index][modelName]++;

                    // 3. Tính toán
                    const used = usageTracker[index][modelName];
                    const limit = MODEL_LIMITS[modelName] || 9999;
                    const remaining = limit - used;

                    // 4. In Log màu mè cho dễ nhìn
                    console.log(`✅ THÀNH CÔNG!`);
                    console.log(`📊 [THỐNG KÊ KEY ${index} - ${keyShort}]`);
                    console.log(`   Model: ${modelName}`);
                    console.log(`   Đã dùng: ${used} / ${limit}`);
                    console.log(`   CÒN LẠI: ${remaining} lượt (Ước tính)`);
                    console.log("---------------------------------------------------");

                    break; // Xong việc thì thoát
                } 
                
                console.warn(`⚠️ Model ${modelName} thất bại (Key ${index}). Chuyển cái khác...`);
                lastError = data.error?.message;

            } catch (err) {
                console.error(`❌ Lỗi kết nối:`, err.message);
                lastError = err.message;
            }
        }

        if (finalReply) {
            res.json({ reply: finalReply });
        } else {
            res.status(500).json({ error: `Lão phu bó tay rồi. (${lastError})` });
        }

    } catch (error) {
        res.status(500).json({ error: "Lỗi Server: " + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
    console.log(`🔑 Số lượng Key đang dùng: ${API_KEYS.length}`);
});