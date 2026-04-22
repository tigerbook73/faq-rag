-- HNSW vector index (cosine distance) for fast similarity search
CREATE INDEX chunks_embedding_idx ON chunks
    USING hnsw (embedding vector_cosine_ops);

-- Full-text trigram index for hybrid retrieval
CREATE INDEX chunks_content_trgm_idx ON chunks
    USING gin (content gin_trgm_ops);