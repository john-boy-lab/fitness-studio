# Architecture Decision Records

This document captures the foundational architectural decisions for a cross-platform application (Web, iOS, Android) with a self-hosted backend, featuring image management with metadata, text input, and deep Google integration (Tasks & Calendar).

The domain-specific features will be layered on top of this base architecture.

---

## Table of Contents

1. [Cross-Platform Framework](#1-cross-platform-framework)
2. [Backend Architecture](#2-backend-architecture)
3. [Storage Strategy](#3-storage-strategy)
4. [Offline-First Design](#4-offline-first-design)
5. [Google Integration](#5-google-integration)
6. [Adapter Pattern](#6-adapter-pattern)
7. [Database Schema](#7-database-schema)
8. [Project Structure](#8-project-structure)
9. [Docker Configuration](#9-docker-configuration)
10. [Deployment Strategy](#10-deployment-strategy)

---

## 1. Cross-Platform Framework

### Decision
**Expo (React Native)** with Expo SDK 52+ and Expo Router.

### Rationale
- **Single codebase** for iOS, Android, and Web from one TypeScript codebase
- **Expo Router** provides file-based routing similar to Next.js, simplifying navigation
- **Managed workflow** reduces native configuration complexity while allowing ejection if needed
- **OTA updates** enable pushing JavaScript updates without app store review
- **Strong ecosystem** with well-maintained libraries and active community

### UI Library: Tamagui
- Cross-platform styling with native performance
- Themeable design system with excellent TypeScript support
- Compiles styles at build time for better runtime performance

### State Management
- **Zustand**: Lightweight, unopinionated global state
- **TanStack Query**: Server state management with caching, background sync, and offline support

### Forms
- **React Hook Form**: Performance-focused form handling with minimal re-renders
- **Zod**: TypeScript-first schema validation, shared between frontend and backend

---

## 2. Backend Architecture

### Decision
**Self-hosted Supabase** deployed via Docker.

### Rationale
- **PostgreSQL** as the database provides reliability, JSONB support, and full SQL capabilities
- **Built-in Auth** with support for OAuth providers (Google) and JWT handling
- **Auto-generated REST API** reduces boilerplate for CRUD operations
- **Edge Functions** (Deno-based) for custom server logic
- **Realtime subscriptions** via PostgreSQL's LISTEN/NOTIFY
- **Row Level Security (RLS)** for fine-grained access control at the database level
- **Self-hosted** maintains data ownership and reduces vendor lock-in

### Components
| Component | Purpose |
|-----------|---------|
| PostgreSQL | Primary database |
| GoTrue | Authentication service |
| PostgREST | Auto-generated REST API |
| Realtime | WebSocket subscriptions |
| Kong | API gateway |
| Studio | Admin dashboard |

---

## 3. Storage Strategy

### Decision
**S3-compatible storage** with MinIO for local development and AWS S3/Cloudflare R2/Supabase Storage for production.

### Rationale
- **S3 API compatibility** is an industry standard with wide tooling support
- **MinIO** provides a fully S3-compatible server for local development
- **Adapter pattern** allows swapping storage backends without code changes
- **Signed URLs** enable secure, time-limited access to private assets
- **Metadata support** allows storing custom attributes alongside files

### Storage Adapter Interface

```typescript
// services/adapters/storage/index.ts
export interface StorageAdapter {
  upload(file: File, path: string, metadata?: Record<string, string>): Promise<UploadResult>;
  download(path: string): Promise<Blob>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
  listFiles(prefix: string): Promise<FileInfo[]>;
}

export interface UploadResult {
  path: string;
  url: string;
  metadata: Record<string, string>;
}

export interface FileInfo {
  path: string;
  size: number;
  lastModified: Date;
  metadata?: Record<string, string>;
}
```

### Implementations
- `s3.adapter.ts` - For MinIO (local) and AWS S3/R2 (production)
- `supabase.adapter.ts` - Alternative using Supabase Storage

---

## 4. Offline-First Design

### Decision
**SQLite via expo-sqlite + Drizzle ORM** for local persistence with custom sync logic.

### Rationale
- **Instant responsiveness**: UI reads from local database, no network latency
- **Works offline**: Full functionality without internet connection
- **Background sync**: Changes replicate to server when online
- **Conflict resolution**: Timestamp-based last-write-wins for simplicity

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Expo App                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐   │
│  │  UI Layer   │───│ TanStack    │───│ SQLite (local)  │   │
│  │  (Tamagui)  │   │ Query       │   │ via Drizzle     │   │
│  └─────────────┘   └──────┬──────┘   └────────┬────────┘   │
│                           │                    │             │
│                    ┌──────▼──────┐      ┌─────▼─────┐       │
│                    │ Sync Engine │◄────►│ Mutation  │       │
│                    │             │      │ Queue     │       │
│                    └──────┬──────┘      └───────────┘       │
└───────────────────────────┼─────────────────────────────────┘
                            │ Online
                    ┌───────▼───────┐
                    │   Supabase    │
                    │  (PostgreSQL) │
                    └───────────────┘
```

### Sync Strategy

| Operation | Behavior |
|-----------|----------|
| **Read** | Query local SQLite first, background sync from Supabase |
| **Write** | Write to local SQLite immediately, queue for remote sync |
| **Conflict** | Compare `updated_at` timestamps, latest wins |
| **Images** | Store locally first, upload in background with retry |

### Mutation Queue
- Pending mutations stored in SQLite
- Processed in order when connection available
- Exponential backoff on failure
- Conflict detection on server response

### Technologies
- **expo-sqlite**: SQLite access in Expo
- **Drizzle ORM**: Type-safe SQL queries
- **TanStack Query**: Caching and persistence layer
- **NetInfo**: Network state detection

---

## 5. Google Integration

### Decision
**OAuth2 via Supabase Auth** with extended scopes for Google Calendar and Tasks APIs.

### Rationale
- **Unified auth flow**: Single sign-in provides both app auth and Google API access
- **Refresh token storage**: Enables background sync without user re-authentication
- **Granular scopes**: Request only necessary permissions

### OAuth2 Scopes Required
```
openid
email
profile
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/tasks
```

### Token Management
1. User signs in with Google via Supabase Auth
2. Extended scopes requested during OAuth flow
3. Refresh token stored encrypted in `profiles.google_refresh_token`
4. Access tokens refreshed as needed for API calls

### Google Calendar Service Interface

```typescript
// services/google/calendar.ts
export interface GoogleCalendarService {
  listCalendars(): Promise<Calendar[]>;
  listEvents(calendarId: string, options?: ListEventsOptions): Promise<CalendarEvent[]>;
  createEvent(calendarId: string, event: CreateEventInput): Promise<CalendarEvent>;
  updateEvent(calendarId: string, eventId: string, event: UpdateEventInput): Promise<CalendarEvent>;
  deleteEvent(calendarId: string, eventId: string): Promise<void>;
  watchEvents(calendarId: string, callback: (events: CalendarEvent[]) => void): () => void;
}

export interface ListEventsOptions {
  timeMin?: Date;
  timeMax?: Date;
  maxResults?: number;
  syncToken?: string;
}
```

### Google Tasks Service Interface

```typescript
// services/google/tasks.ts
export interface GoogleTasksService {
  listTaskLists(): Promise<TaskList[]>;
  listTasks(taskListId: string): Promise<Task[]>;
  createTask(taskListId: string, task: CreateTaskInput): Promise<Task>;
  updateTask(taskListId: string, taskId: string, task: UpdateTaskInput): Promise<Task>;
  completeTask(taskListId: string, taskId: string): Promise<void>;
  deleteTask(taskListId: string, taskId: string): Promise<void>;
}
```

### Sync State Tracking
- Sync tokens stored in `google_sync_state` table
- Incremental sync using Google's sync token mechanism
- Background sync triggered on app foreground and periodic intervals

---

## 6. Adapter Pattern

### Decision
**Interface-based adapters** for storage, auth, and database operations.

### Rationale
- **Testability**: Mock implementations for unit testing
- **Flexibility**: Swap providers without application code changes
- **Abstraction**: Hide provider-specific implementation details
- **Future-proofing**: Easy migration path to alternative services

### Auth Adapter Interface

```typescript
// services/adapters/auth/index.ts
export interface AuthAdapter {
  signInWithGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;
  getUser(): Promise<AuthUser | null>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
  getAccessToken(): Promise<string | null>;
  getGoogleAccessToken(): Promise<string | null>;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}
```

### Database Adapter Interface

```typescript
// services/adapters/database/index.ts
export interface DatabaseAdapter {
  // Pictures
  createPicture(data: CreatePictureInput): Promise<Picture>;
  getPictures(filters?: PictureFilters): Promise<Picture[]>;
  getPicture(id: string): Promise<Picture | null>;
  updatePicture(id: string, data: UpdatePictureInput): Promise<Picture>;
  deletePicture(id: string): Promise<void>;

  // Text entries
  createTextEntry(data: CreateTextEntryInput): Promise<TextEntry>;
  getTextEntries(filters?: TextEntryFilters): Promise<TextEntry[]>;
  getTextEntry(id: string): Promise<TextEntry | null>;
  updateTextEntry(id: string, data: UpdateTextEntryInput): Promise<TextEntry>;
  deleteTextEntry(id: string): Promise<void>;

  // Realtime subscriptions
  subscribeToPictures(callback: (pictures: Picture[]) => void): () => void;
  subscribeToTextEntries(callback: (entries: TextEntry[]) => void): () => void;
}
```

### Adapter Factory

```typescript
// services/index.ts
export function createServices(config: ServiceConfig): Services {
  return {
    auth: new SupabaseAuthAdapter(config.supabase),
    storage: new S3StorageAdapter(config.s3),
    database: new SupabaseDatabaseAdapter(config.supabase),
    googleCalendar: new GoogleCalendarService(config.google),
    googleTasks: new GoogleTasksService(config.google),
  };
}
```

---

## 7. Database Schema

### Decision
**PostgreSQL with Row Level Security (RLS)** for multi-tenant data isolation.

### Tables

```sql
-- Users (handled by Supabase Auth, extended with profile)
create table profiles (
  id uuid references auth.users primary key,
  display_name text,
  avatar_url text,
  google_refresh_token text,  -- Encrypted, for Google API access
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pictures with metadata
create table pictures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint,
  width int,
  height int,
  -- Custom metadata
  title text,
  description text,
  tags text[],
  location jsonb,  -- { lat, lng, address }
  taken_at timestamptz,
  exif_data jsonb,
  custom_metadata jsonb,
  -- Sync tracking
  local_id text,  -- Client-generated ID for offline sync
  sync_status text default 'synced',  -- 'pending', 'synced', 'conflict'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Text entries
create table text_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  entry_type text,  -- 'note', 'journal', etc.
  tags text[],
  metadata jsonb,
  -- Sync tracking
  local_id text,
  sync_status text default 'synced',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Google sync tracking
create table google_sync_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  service text not null,  -- 'calendar', 'tasks'
  resource_id text,       -- Specific calendar or task list ID
  sync_token text,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, service, resource_id)
);

-- Indexes for common queries
create index idx_pictures_user_id on pictures(user_id);
create index idx_pictures_created_at on pictures(created_at desc);
create index idx_pictures_tags on pictures using gin(tags);
create index idx_text_entries_user_id on text_entries(user_id);
create index idx_text_entries_created_at on text_entries(created_at desc);
create index idx_text_entries_tags on text_entries using gin(tags);
```

### Row Level Security Policies

```sql
-- Enable RLS on all tables
alter table profiles enable row level security;
alter table pictures enable row level security;
alter table text_entries enable row level security;
alter table google_sync_state enable row level security;

-- Profiles
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Pictures
create policy "Users can view own pictures"
  on pictures for select
  using (auth.uid() = user_id);

create policy "Users can insert own pictures"
  on pictures for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pictures"
  on pictures for update
  using (auth.uid() = user_id);

create policy "Users can delete own pictures"
  on pictures for delete
  using (auth.uid() = user_id);

-- Text entries (same pattern)
create policy "Users can view own text entries"
  on text_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own text entries"
  on text_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own text entries"
  on text_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own text entries"
  on text_entries for delete
  using (auth.uid() = user_id);

-- Google sync state
create policy "Users can manage own sync state"
  on google_sync_state for all
  using (auth.uid() = user_id);
```

### Triggers

```sql
-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger pictures_updated_at
  before update on pictures
  for each row execute function update_updated_at();

create trigger text_entries_updated_at
  before update on text_entries
  for each row execute function update_updated_at();
```

---

## 8. Project Structure

### Decision
**pnpm monorepo** with apps and packages directories.

### Structure

```
fitness-studio/
├── apps/
│   └── mobile/                 # Expo app (iOS, Android, Web)
│       ├── app/                # Expo Router screens
│       │   ├── (auth)/         # Auth-required routes
│       │   │   ├── _layout.tsx
│       │   │   ├── index.tsx   # Home/Dashboard
│       │   │   ├── pictures/
│       │   │   └── entries/
│       │   ├── (public)/       # Public routes
│       │   │   ├── _layout.tsx
│       │   │   └── login.tsx
│       │   └── _layout.tsx     # Root layout
│       ├── components/         # Shared UI components
│       │   ├── ui/             # Base UI components
│       │   ├── forms/          # Form components
│       │   └── layout/         # Layout components
│       ├── hooks/              # Custom hooks
│       │   ├── useAuth.ts
│       │   ├── usePictures.ts
│       │   └── useSync.ts
│       ├── services/           # Service adapters
│       │   ├── adapters/
│       │   │   ├── storage/
│       │   │   │   ├── index.ts
│       │   │   │   ├── s3.adapter.ts
│       │   │   │   └── supabase.adapter.ts
│       │   │   ├── auth/
│       │   │   │   ├── index.ts
│       │   │   │   └── supabase.adapter.ts
│       │   │   └── database/
│       │   │       ├── index.ts
│       │   │       └── supabase.adapter.ts
│       │   ├── google/
│       │   │   ├── calendar.ts
│       │   │   └── tasks.ts
│       │   ├── sync/
│       │   │   ├── engine.ts
│       │   │   └── queue.ts
│       │   └── index.ts
│       ├── store/              # Zustand stores
│       │   ├── auth.store.ts
│       │   ├── pictures.store.ts
│       │   └── sync.store.ts
│       ├── db/                 # Local SQLite database
│       │   ├── schema.ts       # Drizzle schema
│       │   ├── migrations/
│       │   └── client.ts
│       ├── types/              # TypeScript types
│       ├── utils/
│       ├── app.json
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── shared/                 # Shared code between apps
│       ├── types/              # Shared TypeScript types
│       │   ├── picture.ts
│       │   ├── text-entry.ts
│       │   └── google.ts
│       ├── validation/         # Zod schemas
│       │   ├── picture.schema.ts
│       │   └── text-entry.schema.ts
│       ├── utils/              # Shared utilities
│       └── package.json
├── supabase/
│   ├── migrations/             # Database migrations
│   │   └── 00001_initial.sql
│   ├── functions/              # Edge Functions
│   │   └── google-sync/
│   │       └── index.ts
│   ├── seed.sql                # Development seed data
│   └── config.toml             # Supabase configuration
├── docker/
│   ├── docker-compose.yml      # Local development
│   ├── docker-compose.prod.yml # Production template
│   └── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json                # Monorepo root
├── pnpm-workspace.yaml
├── turbo.json                  # Turborepo config (optional)
├── .env.example
├── .gitignore
├── DECISIONS.md                # This file
└── README.md
```

### Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// package.json (root)
{
  "name": "fitness-studio",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter mobile dev",
    "build": "pnpm --filter mobile build",
    "docker:up": "docker compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f docker/docker-compose.yml down",
    "db:migrate": "supabase db push",
    "db:reset": "supabase db reset"
  },
  "devDependencies": {
    "supabase": "^1.x",
    "turbo": "^2.x"
  }
}
```

---

## 9. Docker Configuration

### Decision
**Docker Compose** for local development with self-hosted Supabase and MinIO.

### docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: supabase/postgres:15.1.1.78
    container_name: supabase-db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: postgres
    volumes:
      - supabase-db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Supabase Studio (Admin UI)
  studio:
    image: supabase/studio:20240101-ce42139
    container_name: supabase-studio
    ports:
      - "3000:3000"
    environment:
      STUDIO_PG_META_URL: http://meta:8080
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      DEFAULT_ORGANIZATION_NAME: fitness-studio
      DEFAULT_PROJECT_NAME: fitness-studio
      SUPABASE_URL: http://kong:8000
      SUPABASE_PUBLIC_URL: http://localhost:8000
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY}
    depends_on:
      - meta

  # Kong API Gateway
  kong:
    image: kong:2.8.1
    container_name: supabase-kong
    ports:
      - "8000:8000"
      - "8443:8443"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
      KONG_DNS_ORDER: LAST,A,CNAME
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth
    volumes:
      - ./kong.yml:/var/lib/kong/kong.yml:ro

  # GoTrue Auth
  auth:
    image: supabase/gotrue:v2.143.0
    container_name: supabase-auth
    depends_on:
      db:
        condition: service_healthy
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: http://localhost:8000
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD:-postgres}@db:5432/postgres
      GOTRUE_SITE_URL: http://localhost:8081
      GOTRUE_URI_ALLOW_LIST: "*"
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_JWT_EXP: 3600
      GOTRUE_EXTERNAL_GOOGLE_ENABLED: ${GOOGLE_AUTH_ENABLED:-false}
      GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOTRUE_EXTERNAL_GOOGLE_SECRET: ${GOOGLE_CLIENT_SECRET:-}
      GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: http://localhost:8000/auth/v1/callback

  # PostgREST
  rest:
    image: postgrest/postgrest:v12.0.1
    container_name: supabase-rest
    depends_on:
      db:
        condition: service_healthy
    environment:
      PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD:-postgres}@db:5432/postgres
      PGRST_DB_SCHEMAS: public,storage,graphql_public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"

  # Realtime
  realtime:
    image: supabase/realtime:v2.25.50
    container_name: supabase-realtime
    depends_on:
      db:
        condition: service_healthy
    environment:
      PORT: 4000
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: supabase_admin
      DB_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      DB_NAME: postgres
      DB_AFTER_CONNECT_QUERY: 'SET search_path TO _realtime'
      DB_ENC_KEY: supabaserealtime
      API_JWT_SECRET: ${JWT_SECRET}
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}

  # Postgres Meta (for Studio)
  meta:
    image: supabase/postgres-meta:v0.75.0
    container_name: supabase-meta
    depends_on:
      db:
        condition: service_healthy
    environment:
      PG_META_PORT: 8080
      PG_META_DB_HOST: db
      PG_META_DB_PORT: 5432
      PG_META_DB_NAME: postgres
      PG_META_DB_USER: supabase_admin
      PG_META_DB_PASSWORD: ${POSTGRES_PASSWORD:-postgres}

  # MinIO (S3-compatible storage)
  minio:
    image: minio/minio:RELEASE.2024-01-01T16-36-33Z
    container_name: minio
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Console
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # MinIO Setup (creates default bucket)
  minio-setup:
    image: minio/mc:latest
    container_name: minio-setup
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb local/fitness-studio --ignore-existing;
      mc anonymous set download local/fitness-studio/public;
      exit 0;
      "

volumes:
  supabase-db:
  minio-data:
```

### Environment Variables (.env.example)

```bash
# Supabase
POSTGRES_PASSWORD=your-super-secret-password
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters
SECRET_KEY_BASE=your-secret-key-base-for-realtime
ANON_KEY=your-anon-key
SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth
GOOGLE_AUTH_ENABLED=true
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

---

## 10. Deployment Strategy

### Decision
**Railway or Render** for production deployment with managed PostgreSQL.

### Rationale
- **Simplified ops**: Managed infrastructure reduces maintenance burden
- **Docker support**: Both platforms support Docker deployments
- **PostgreSQL**: Managed database with backups and scaling
- **Cost-effective**: Pay-as-you-go pricing suitable for early stages

### Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CDN (Cloudflare/Vercel)                  │
│                     - Static assets                          │
│                     - Edge caching                           │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                     Railway / Render                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Supabase   │  │  Edge       │  │  Background         │  │
│  │  Services   │  │  Functions  │  │  Workers            │  │
│  │  (Docker)   │  │  (Deno)     │  │  (Google Sync)      │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │
│         │                                                    │
│  ┌──────▼──────┐                                            │
│  │  PostgreSQL │                                            │
│  │  (Managed)  │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                     S3 / Cloudflare R2                       │
│                     - Image storage                          │
│                     - File uploads                           │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Options

| Platform | PostgreSQL | Docker | Edge Functions | Pros | Cons |
|----------|------------|--------|----------------|------|------|
| Railway | Managed | Yes | Via containers | Simple DX, good pricing | Limited regions |
| Render | Managed | Yes | Via containers | Free tier, auto-deploy | Cold starts |
| Fly.io | Self-managed | Yes | Edge workers | Global, low latency | More complex |

### Recommended: Railway

1. **Database**: Railway managed PostgreSQL
2. **Services**: Docker Compose deployment
3. **Storage**: Cloudflare R2 (S3-compatible, no egress fees)
4. **CDN**: Cloudflare for static assets

### Environment Configuration

```bash
# Production .env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.railway.app
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Storage (Cloudflare R2)
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=fitness-studio

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Railway
        uses: railwayapp/railway-cli@v3
        with:
          service: supabase
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Run Migrations
        run: |
          npx supabase db push --db-url ${{ secrets.DATABASE_URL }}
```

---

## Summary

| Decision | Choice | Key Rationale |
|----------|--------|---------------|
| Frontend | Expo + Tamagui | Single codebase, native performance |
| Backend | Self-hosted Supabase | PostgreSQL, auth, realtime, self-hosted |
| Storage | S3-compatible (MinIO/R2) | Industry standard, adapter pattern |
| Offline | SQLite + Drizzle | Instant UX, works offline |
| Google | OAuth2 + API | Unified auth, background sync |
| Architecture | Adapter pattern | Testability, flexibility |
| Database | PostgreSQL + RLS | Security, reliability |
| Structure | pnpm monorepo | Code sharing, tooling |
| Local Dev | Docker Compose | Reproducible environment |
| Production | Railway + R2 | Simplicity, cost-effective |

---

*Last updated: January 2026*
