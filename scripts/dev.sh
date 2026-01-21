#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Parse arguments
RESET=false
SKIP_DOCKER=false
WEB_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --reset)
            RESET=true
            shift
            ;;
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --web)
            WEB_ONLY=true
            shift
            ;;
        -h|--help)
            echo "Usage: ./scripts/dev.sh [options]"
            echo ""
            echo "Options:"
            echo "  --reset        Reset Docker volumes and start fresh"
            echo "  --skip-docker  Skip starting Docker (use existing services)"
            echo "  --web          Start Expo in web-only mode"
            echo "  -h, --help     Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}=== Fitness Studio Development ===${NC}"

# Check if setup has been run
if [ ! -f docker/.env ] || [ ! -f apps/mobile/.env ]; then
    echo -e "${YELLOW}Running setup first...${NC}"
    "$SCRIPT_DIR/setup.sh"
fi

if [ "$SKIP_DOCKER" = false ]; then
    # Reset if requested
    if [ "$RESET" = true ]; then
        echo -e "\n${YELLOW}Resetting Docker environment...${NC}"
        docker compose -f docker/docker-compose.yml down -v 2>/dev/null || true
        echo -e "${GREEN}Docker volumes cleared${NC}"
    fi

    echo -e "\n${YELLOW}Starting Docker services...${NC}"
    # Allow partial failure (MinIO healthcheck may fail but services still work)
    docker compose -f docker/docker-compose.yml up -d || true

    echo -e "\n${YELLOW}Waiting for database to be healthy...${NC}"
    for i in {1..30}; do
        if docker exec supabase-db pg_isready -U postgres > /dev/null 2>&1; then
            echo -e "${GREEN}Database is ready${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done

    # Check if roles exist, if not grant permissions
    echo -e "\n${YELLOW}Checking database roles...${NC}"
    ROLE_COUNT=$(docker exec supabase-db psql -U postgres -t -c "SELECT COUNT(*) FROM pg_roles WHERE rolname = 'supabase_auth_admin';" 2>/dev/null | tr -d ' ')

    if [ "$ROLE_COUNT" = "0" ] || [ -z "$ROLE_COUNT" ]; then
        echo -e "${YELLOW}Waiting for database initialization...${NC}"
        sleep 10
    fi

    # Grant permissions for auth (in case init script didn't run)
    echo -e "${YELLOW}Ensuring auth permissions...${NC}"
    docker exec supabase-db psql -U postgres -c "GRANT ALL ON SCHEMA public TO supabase_auth_admin;" 2>/dev/null || true

    # Restart auth if it was failing
    docker restart supabase-auth 2>/dev/null || true

    # Run migrations
    echo -e "\n${YELLOW}Running database migrations...${NC}"
    if docker exec supabase-db psql -U postgres -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles';" 2>/dev/null | grep -q 1; then
        echo -e "${GREEN}Migrations already applied${NC}"
    else
        docker exec -i supabase-db psql -U postgres -d postgres < supabase/migrations/00001_fitness_schema.sql
        echo -e "${GREEN}Migrations applied${NC}"
    fi

    # Wait for services
    echo -e "\n${YELLOW}Waiting for services to be ready...${NC}"
    sleep 5

    # Show service status
    echo -e "\n${BLUE}Service Status:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "supabase|minio" || true
fi

echo -e "\n${GREEN}=== Starting Expo ===${NC}"
echo -e "${BLUE}Services:${NC}"
echo -e "  Supabase API:    http://localhost:8010"
echo -e "  Supabase Studio: http://localhost:3000"
echo -e "  MinIO Console:   http://localhost:9003"
echo -e ""
echo -e "${YELLOW}Press 'i' for iOS Simulator, 'a' for Android, 'w' for web${NC}"
echo -e ""

cd apps/mobile
if [ "$WEB_ONLY" = true ]; then
    npx expo start --web
else
    npx expo start
fi
