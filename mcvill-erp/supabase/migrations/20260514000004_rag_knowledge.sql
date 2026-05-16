CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documentos_rag_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID REFERENCES documentos_rag_meta(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    contenido TEXT NOT NULL,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
ON documentos_rag_chunks USING hnsw (embedding vector_ip_ops);

ALTER TABLE documentos_rag_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_rag_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their tenant RAG documents" ON documentos_rag_meta;
DROP POLICY IF EXISTS "Users can delete their tenant RAG documents" ON documentos_rag_meta;
DROP POLICY IF EXISTS "Users can see their tenant RAG chunks" ON documentos_rag_chunks;

CREATE POLICY "Users can see their tenant RAG documents" ON documentos_rag_meta
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete their tenant RAG documents" ON documentos_rag_meta
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can see their tenant RAG chunks" ON documentos_rag_chunks
    FOR SELECT USING (
        documento_id IN (
            SELECT id FROM documentos_rag_meta
            WHERE tenant_id IN (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
        )
    );
