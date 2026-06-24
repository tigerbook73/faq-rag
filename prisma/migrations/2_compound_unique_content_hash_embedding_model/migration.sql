-- Fill NULL embedding_model values before making the column NOT NULL
UPDATE documents SET embedding_model = 'bge-m3' WHERE embedding_model IS NULL;

-- Make embedding_model NOT NULL with default
ALTER TABLE documents ALTER COLUMN embedding_model SET DEFAULT 'bge-m3';
ALTER TABLE documents ALTER COLUMN embedding_model SET NOT NULL;

-- Replace single-column unique index with compound unique index
DROP INDEX IF EXISTS documents_content_hash_key;
CREATE UNIQUE INDEX documents_content_hash_embedding_model_key
  ON documents(content_hash, embedding_model);
