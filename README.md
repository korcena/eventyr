# Eventyr

Eventyr is a multi-user event planner and management app for tech events — hackathons, workshops, tech socials, and more. It serves as the single source of truth for your event with todos, Notion-like pages, external shortcuts, Google Calendar sync, Telegram reminders, and an AI chat to query your event data.

## Features

- **Events & Members** — Create events, invite members via unique links, assign custom roles with granular permission flags.
- **Todos** — Full task management with statuses (Not Started → In Progress → Blocked → Completed), due dates with auto-calculated days left, assignees, dependencies (with cycle detection), and comments.
- **Pages** — Notion-like block editor with structured block types: heading, text, list, table, organizer list, and prize list. Full-text search across pages.
- **Shortcuts** — Add external links to make Eventyr the single source of truth for your event.
- **Google Calendar Sync** — Per-user OAuth. Each user connects their own Google Calendar, picks which calendar to sync to, and assigned todos automatically appear as calendar events.
- **Telegram Reminders** — Per-event bot configuration. A daily cron job sends reminders to the event's Telegram group 3 and 1 day before a todo's due date.
- **AI Chat** — RAG-powered chat using pgvector and Ollama Cloud. Ask questions about your event data and get answers with source citations.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend & Backend | Next.js 16 (App Router) with Server Actions |
| Database | Supabase Postgres + pgvector |
| Auth | Supabase Auth |
| Background Jobs | Render Cron Job |
| LLM | Ollama Cloud (OpenAI-compatible API) |
| Google Calendar | googleapis (OAuth per user) |
| Styling | Tailwind CSS v4 (dark mode) |
| Testing | Vitest (unit) · Playwright (E2E) |
| Deployment | Render (web + cron services) |

## Prerequisites

- Node.js 20+ (Node 22+ recommended for Supabase JS v2)
- A Supabase project
- A Google Cloud project with OAuth credentials (for Calendar sync)
- An Ollama Cloud account (for AI chat)
- A Telegram bot token and group chat ID (for reminders)
- A Render account (for deployment)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, never exposed to client) |
| `ENCRYPTION_KEY` | AES-256 key for encrypting secrets (Telegram tokens, OAuth tokens) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL (e.g. `http://localhost:3000/api/calendar/callback`) |
| `OLLAMA_BASE_URL` | Ollama Cloud API base URL |
| `OLLAMA_API_KEY` | Ollama Cloud API key |
| `OLLAMA_CHAT_MODEL` | Chat model name (e.g. `llama3.2`) |
| `OLLAMA_EMBED_MODEL` | Embedding model name (e.g. `nomic-embed-text`) |
| `APP_BASE_URL` | Your app's base URL (e.g. `http://localhost:3000`) |
| `DRY_RUN` | Set to `true` to run cron without sending Telegram messages |

### 3. Run database migrations

Run the SQL migration files in order against your Supabase database. You can do this via the Supabase SQL Editor or the Supabase CLI:

```bash
# If using Supabase CLI with a linked project:
supabase db push
```

Or manually run each file in `supabase/migrations/` in order:

```
001_profiles.sql
002_events.sql
003_todos.sql
004_pages.sql
005_shortcuts.sql
006_calendar.sql
007_reminder_log.sql
008_ai_embeddings.sql
```

### 4. Enable pgvector

Ensure the `vector` extension is enabled in your Supabase project. Migration `008_ai_embeddings.sql` includes this, but if running manually:

```sql
create extension if not exists vector;
```

### 5. Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run E2E tests (Playwright) |

## Telegram Cron Job

The reminder cron script runs as a standalone process:

```bash
npx tsx src/cron/send-reminders.ts
```

- Queries all events with Telegram config.
- Finds todos due in exactly 3 or 1 day(s) that are not completed.
- Sends formatted messages to the event's Telegram group.
- Retries failed sends up to 3 times with backoff.
- Logs results to the `reminder_log` table for idempotency.
- Set `DRY_RUN=true` to test without sending actual messages.

## Deployment (Render)

The `render.yaml` file defines two services:

1. **Web service** (`eventyr`) — Next.js app. Build: `npm install && npm run build`. Start: `npm run start`.
2. **Cron service** (`eventyr-reminders`) — Runs daily at 09:00 UTC. Command: `npx tsx src/cron/send-reminders.ts`.

Configure all environment variables in the Render dashboard. The `GOOGLE_REDIRECT_URI` should point to your production URL (e.g. `https://your-app.onrender.com/api/calendar/callback`).

## Project Structure

```
src/
  app/
    (auth)/          — Login, signup, OAuth callback
    (app)/           — Main app (dashboard, events, chat)
      events/
        [eventId]/
          todos/     — Todo list + detail
          pages/     — Page list + block editor
          shortcuts/— External links grid
          settings/ — Event settings, roles, members, integrations
    api/
      calendar/     — Google Calendar OAuth + sync routes
      chat/         — AI chat streaming endpoint
  components/
    ui/             — Reusable UI primitives (Button, Card, Dialog, etc.)
    event/          — Event-specific components
    todo/           — Todo components
    page/           — Page/block components
    chat/           — Chat UI
    settings/       — Settings components
    shortcut/       — Shortcut components
    sidebar/        — App sidebar
  lib/
    actions/        — Server Actions (events, todos, pages, etc.)
    supabase/       — Supabase clients (server, client, admin)
    todo-status.ts  — Status types, labels, days-left logic
    cycle-detection.ts — Dependency cycle detection (DFS)
    calendar.ts     — Google Calendar sync logic
    crypto.ts       — AES-256-GCM encryption
    embeddings.ts   — pgvector embedding generation
    rag.ts          — RAG similarity search
    llm.ts          — Ollama Cloud LLM client
    telegram.ts     — Telegram Bot API client
    permissions.ts  — Role-based permission checks
    auth.ts         — Current user helper
  cron/
    send-reminders.ts — Standalone cron script
supabase/
  migrations/       — SQL migration files (001–008)
```

## Google Calendar Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create OAuth 2.0 credentials with the following scopes:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.calendars.readonly`
3. Set the redirect URI to `http://localhost:3000/api/calendar/callback` (or your production URL).
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to your env file.
5. In the app, go to Event Settings → Google Calendar → Connect.

## Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram.
2. Get the bot token and your group chat ID.
3. In the app, go to Event Settings → Telegram Reminders → enter the bot token and chat ID.
4. Click "Send Test Message" to verify.

## Testing

```bash
# Unit tests
npm run test

# E2E tests (requires the dev server running)
npm run test:e2e
```

## License

Private project.