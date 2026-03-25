-- Enable the extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_user_email_trgm
  ON "User" USING GIN (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_user_username_trgm
  ON "User" USING GIN (username gin_trgm_ops);