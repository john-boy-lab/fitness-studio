#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Fitness Studio Setup ===${NC}"

# Get project root (parent of scripts directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo -e "\n${YELLOW}1. Installing dependencies...${NC}"
pnpm install

echo -e "\n${YELLOW}2. Creating Docker environment file...${NC}"
if [ ! -f docker/.env ]; then
    cat > docker/.env << 'EOF'
# Supabase Configuration
POSTGRES_PASSWORD=postgres
JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
SECRET_KEY_BASE=UpNc5CqDqMmB0P6g6uxHgRJpDKOu2R4f6D4k3K0fHPw=

# Dev-only Supabase keys
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Google OAuth (disabled for local dev)
GOOGLE_AUTH_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
EOF
    echo -e "${GREEN}Created docker/.env${NC}"
else
    echo -e "${YELLOW}docker/.env already exists, skipping${NC}"
fi

echo -e "\n${YELLOW}3. Creating mobile app environment file...${NC}"
if [ ! -f apps/mobile/.env ]; then
    cat > apps/mobile/.env << 'EOF'
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=http://localhost:8010
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# S3/MinIO Configuration
EXPO_PUBLIC_S3_ENDPOINT=http://localhost:9002
EXPO_PUBLIC_S3_BUCKET=fitness-studio
EOF
    echo -e "${GREEN}Created apps/mobile/.env${NC}"
else
    echo -e "${YELLOW}apps/mobile/.env already exists, skipping${NC}"
fi

echo -e "\n${YELLOW}4. Creating database init script...${NC}"
mkdir -p docker/volumes/db/init
if [ ! -f docker/volumes/db/init/00-init.sql ]; then
    cat > docker/volumes/db/init/00-init.sql << 'EOF'
-- Create necessary Supabase roles
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE authenticator LOGIN PASSWORD 'postgres' NOINHERIT;
CREATE ROLE supabase_auth_admin LOGIN PASSWORD 'postgres' NOINHERIT CREATEROLE CREATEDB;
CREATE ROLE supabase_admin LOGIN PASSWORD 'postgres' CREATEROLE CREATEDB REPLICATION BYPASSRLS;

-- Grant roles
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT supabase_admin TO authenticator;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA storage TO supabase_admin;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO supabase_auth_admin;
GRANT CREATE ON SCHEMA public TO authenticator;

-- Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
EOF
    echo -e "${GREEN}Created docker/volumes/db/init/00-init.sql${NC}"
else
    echo -e "${YELLOW}Init script already exists, skipping${NC}"
fi

echo -e "\n${GREEN}=== Setup Complete ===${NC}"
echo -e "\nNext steps:"
echo -e "  1. Run ${YELLOW}./scripts/dev.sh${NC} to start the development environment"
echo -e "  2. Or run ${YELLOW}./scripts/dev.sh --reset${NC} to reset and start fresh"
