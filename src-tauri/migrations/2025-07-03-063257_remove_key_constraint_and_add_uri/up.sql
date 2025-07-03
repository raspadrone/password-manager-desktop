-- Your SQL goes here
-- up.sql
ALTER TABLE passwords ADD COLUMN login_uri TEXT;
ALTER TABLE passwords DROP CONSTRAINT passwords_user_id_key_key;