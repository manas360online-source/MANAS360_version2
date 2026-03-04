CREATE TABLE IF NOT EXISTS "chat_messages" (
  "message_id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "bot_type" TEXT NOT NULL,
  CONSTRAINT "chat_messages_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "chat_messages_user_bot_ts_idx"
  ON "chat_messages" ("user_id", "bot_type", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS "chat_messages_user_ts_idx"
  ON "chat_messages" ("user_id", "timestamp" DESC);
