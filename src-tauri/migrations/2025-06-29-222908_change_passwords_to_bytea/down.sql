-- down.sql
ALTER TABLE passwords ALTER COLUMN value TYPE TEXT USING convert_from(value, 'UTF8');
ALTER TABLE passwords ALTER COLUMN notes TYPE TEXT USING convert_from(notes, 'UTF8');