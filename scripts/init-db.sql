-- Initialization script for PostgreSQL database
-- This script runs automatically when the database container starts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create initial database user if needed (already created via env vars)
-- Additional setup can be added here if needed

SELECT 'Database initialized successfully' AS status;
