const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const { createClient } = require('@supabase/supabase-js');

// --- CẤU HÌNH SUPABASE (Dùng Service Key để có quyền Ghi an toàn) ---
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("✅ Supabase Client Initialized");
} else {
    console.warn("⚠️ Chưa cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_KEY");
}

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

// --- API BƠM KIẾN THỨC VÀO TỪ ĐIỂN RAG ---
app.post("/api/ingest_document", async (req, res) => {
    try {
        const { text, metadata } = req.body;
        if (!text) return res.status(400).json({ error: "Thiếu dữ liệu text" });
        if (!supabase) return res.status(500).json({ error: "Chưa cấu hình Supabase" });

        const { key } = getRandomKeyData();
        
        // 1. Gửi chuỗi Text cho Gemini để sinh Vector (Embedding)
        const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${key}`;
        const embedResponse = await fetch(embedUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "models/gemini-embedding-2",
                content: { parts: [{ text: text }] }, outputDimensionality: 768
            })
        });

        const embedData = await embedResponse.json();
        
        if (!embedData.embedding || !embedData.embedding.values) {
            return res.status(500).json({ error: "Lỗi sinh Vector từ Gemini", details: embedData });
        }

        const vector = embedData.embedding.values; // Mảng 768 chiều

        // 2. Lưu Vector vào bảng documents
        const { error: dbError } = await supabase
            .from('documents')
            .insert({
                content: text,
                embedding: vector,
                metadata: metadata || {}
            });

        if (dbError) throw dbError;

        res.json({ success: true, message: "Đã nhồi kiến thức vào Neural Database!" });

    } catch (err) {
        console.error("Lỗi Ingest Document:", err);
        res.status(500).json({ error: err.message });
    }
});

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

        // --- BƯỚC MỚI: TÌM KIẾM TÀI LIỆU RAG (Vector Search) ---
        let augmentedContext = "";
        try {
            if (supabase) {
                const { key: ragKey } = getRandomKeyData();
                const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${ragKey}`;
                const embedResponse = await fetch(embedUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "models/gemini-embedding-2",
                        content: { parts: [{ text: message }] }, outputDimensionality: 768
                    })
                });
                const embedData = await embedResponse.json();
                
                if (embedData.embedding?.values) {
                    const queryVector = embedData.embedding.values;
                    
                    const { data: matchedDocs, error: matchError } = await supabase.rpc('match_documents', {
                        query_embedding: queryVector,
                        match_threshold: 0.05, // GIẢM XUỐNG CỰC THẤP ĐỂ TEST (Mức độ giống nhau >= 5%)
                        match_count: 3        // Lấy 3 tài liệu
                    });

                    if (!matchError && matchedDocs && matchedDocs.length > 0) {
                        augmentedContext = "\n\n--- TÀI LIỆU NỘI BỘ TÌM THẤY ---\nDựa vào thông tin sau đây để trả lời câu hỏi nếu liên quan (Bắt buộc phải ưu tiên thông tin này hơn trí nhớ của bạn):\n";
                        matchedDocs.forEach((doc, idx) => {
                            augmentedContext += `[Tài liệu ${idx + 1}]: ${doc.content}\n`;
                        });
                        console.log(`🔍 [RAG] Tìm thấy ${matchedDocs.length} tài liệu liên quan cho context.`);
                    }
                }
            }
        } catch (err) {
            console.error("⚠️ Lỗi Vector Search RAG (Bỏ qua & dùng kiến thức chay):", err.message);
        }
        // --------------------------------------------------------

        // THIẾT LẬP KẾT NỐI STREAMING (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // VÒNG LẶP THỬ MODEL
        for (const modelName of MODEL_LIST) {
            try {
                // Lấy ngẫu nhiên 1 Key
                const { key, index } = getRandomKeyData();
                const keyShort = `...${key.slice(-4)}`; // Lấy 4 số cuối để log cho gọn

                console.log(`🤖 Đang thử (Stream): ${modelName} | Key [${index}]: ${keyShort}`);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${key}`;

                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: contents,
                        system_instruction: {
                            parts: [{ text: `VAI TRÒ: Lão Vô Danh... (như cũ)` + augmentedContext }]
                        }
                    })
                });

                if (response.ok && response.body) {
                    // Cập nhật thống kê
                    if (!usageTracker[index]) usageTracker[index] = {};
                    if (!usageTracker[index][modelName]) usageTracker[index][modelName] = 0;
                    usageTracker[index][modelName]++;

                    console.log(`✅ STREAMING THÀNH CÔNG! (Model: ${modelName})`);
                    console.log("---------------------------------------------------");

                    // Bơm dữ liệu Stream thẳng xuống client thông qua Reader
                    const reader = response.body.getReader();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        res.write(value);
                    }
                    res.end();
                    return; // Thoát vòng lặp sau khi stream xong
                } 
                
                const errorData = await response.json();
                console.warn(`⚠️ Model ${modelName} thất bại (Key ${index}). Lỗi: ${errorData?.error?.message}`);
            } catch (err) {
                console.error(`❌ Lỗi kết nối:`, err.message);
            }
        }

        // Báo lỗi bằng định dạng Stream nếu tất cả model đều chết
        res.write(`data: {"error": {"message": "Lão phu bó tay rồi, mạng mẽo chán quá!"}}\n\n`);
        res.end();

    } catch (error) {
        res.status(500).json({ error: "Lỗi Server: " + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
    console.log(`🔑 Số lượng Key đang dùng: ${API_KEYS.length}`);
});