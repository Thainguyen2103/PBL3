-- BƯỚC 1: Bật extension vector để hỗ trợ Semantic Search
CREATE EXTENSION IF NOT EXISTS vector;

-- BƯỚC 2: Tạo mảng/Bảng lưu trữ Tài liệu
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(768), -- Gemini text-embedding-004 tạo ra vector 768 chiều
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo Index để tăng tốc độ tìm kiếm Vector (HNSW)
-- Tìm kiếm vector Cosine là <> cho L2, hoặc <=> cho Cosine
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON documents 
USING hnsw (embedding vector_cosine_ops);

-- BƯỚC 3: Tạo Stored Procedure (RPC) để Backend dễ dàng gọi bằng Supabase Client
-- Truyền vào 1 chuỗi vector của câu hỏi, hàm sẽ trả về những tài liệu gần giống nhất
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
