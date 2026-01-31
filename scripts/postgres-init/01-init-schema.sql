-- Initialize the inquiry_pooler schema
CREATE SCHEMA IF NOT EXISTS inquiry_pooler;

-- Grant permissions
GRANT ALL ON SCHEMA inquiry_pooler TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA inquiry_pooler GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA inquiry_pooler GRANT ALL ON SEQUENCES TO postgres;
