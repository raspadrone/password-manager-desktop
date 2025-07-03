-- This file should undo anything in `up.sql`
-- down.sql
ALTER TABLE passwords DROP COLUMN login_uri;
ALTER TABLE passwords ADD CONSTRAINT passwords_user_id_key_key UNIQUE (user_id, key);