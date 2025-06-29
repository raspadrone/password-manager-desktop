-- up.sql
ALTER TABLE passwords ALTER COLUMN value TYPE BYTEA USING convert_to(value, 'UTF8');
ALTER TABLE passwords ALTER COLUMN notes TYPE BYTEA USING convert_to(notes, 'UTF8');
