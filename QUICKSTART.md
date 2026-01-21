# Quickstart Guide

Get the Fitness Studio app running locally.

## Prerequisites

- **Node.js** 18+
- **pnpm** 9+ (`npm install -g pnpm`)
- **Docker** (for local Supabase)

## 1. Install Dependencies

```bash
pnpm install
```

## 2. Configure Environment

### Docker (Supabase backend)

```bash
cd docker
cp .env.example .env
```

Edit `docker/.env` with these dev values:

```bash
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
```

### Mobile App

```bash
cd apps/mobile
cp .env.example .env
```

Edit `apps/mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://localhost:8010
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
EXPO_PUBLIC_S3_ENDPOINT=http://localhost:9002
EXPO_PUBLIC_S3_BUCKET=fitness-studio
```

## 3. Start Backend Services

```bash
# From project root
pnpm docker:up
```

This starts:
- **PostgreSQL** on port 5433
- **Supabase API** on port 8010
- **Supabase Studio** on port 3000
- **MinIO** (S3 storage) on port 9002 (console: 9003)

Wait for all services to be healthy (~30 seconds).

### Run Database Migrations

```bash
docker exec -i supabase-db psql -U postgres -d postgres < supabase/migrations/00001_fitness_schema.sql
```

## 4. Start the App

```bash
cd apps/mobile
npx expo start
```

Then press:
- **i** - Open iOS Simulator (recommended)
- **a** - Open Android Emulator
- **w** - Open web browser (limited - native APIs won't work)

**Note:** The web version has limited functionality because some features (SecureStore, SQLite) are native-only. Use iOS Simulator or Android Emulator for full functionality.

## Services URLs

| Service | URL |
|---------|-----|
| App (Web) | http://localhost:8081 |
| Supabase API | http://localhost:8010 |
| Supabase Studio | http://localhost:3000 |
| MinIO Console | http://localhost:9003 |

## Common Commands

```bash
# Start everything
pnpm docker:up && cd apps/mobile && npx expo start

# Stop Docker services
pnpm docker:down

# Type check
pnpm typecheck

# Build
pnpm build
```

## Troubleshooting

### Port conflicts

If ports are in use, the docker-compose.yml uses these non-standard ports:
- PostgreSQL: 5433 (instead of 5432)
- Supabase API: 8010 (instead of 8000)
- MinIO: 9002/9003 (instead of 9000/9001)

Check what's using ports:
```bash
lsof -i :5432 -i :8000 -i :9000
```

### "Cannot find module" errors

```bash
# Reinstall with hoisting
rm -rf node_modules apps/mobile/node_modules
pnpm install
```

### Package version warnings

```bash
cd apps/mobile && npx expo install --fix
```

### Database user authentication failed

If Supabase auth fails to connect, grant permissions manually:
```bash
docker exec supabase-db psql -U postgres -c "GRANT ALL ON SCHEMA public TO supabase_auth_admin;"
docker restart supabase-auth
```

### Reset everything

```bash
pnpm docker:down
docker volume rm docker_supabase-db docker_minio-data
pnpm docker:up
```

## Development Notes

- **iOS Simulator** is recommended for development (full native API support)
- **Web** works but SecureStore and SQLite have limitations
- Database schema is in `supabase/migrations/`
- SQLite local schema is in `apps/mobile/db/schema.ts`

## Next Steps

1. Open Supabase Studio at http://localhost:3000 to view your database
2. Run the app on iOS Simulator (`i` key)
3. Sign up for a new account
4. Set up your profile and goals
5. Start tracking weight and food!
