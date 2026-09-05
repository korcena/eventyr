# Eventyr

Eventyr is a multi-user event planner and management app for tech events — hackathons, workshops, tech socials, and more. It serves as the single source of truth for your event with todos, WYSIWYG pages, external shortcuts, Google Calendar sync, Telegram reminders, and an AI chat to query your event data.

## Features

- **Events & Members** — Create events, invite members via unique shareable links, assign custom roles with granular permission flags. The event creator automatically gets an Owner role with all permissions.
- **Todos** — Full task management with statuses (Not Started → In Progress → Blocked → Completed), due dates with auto-calculated days left, **multiple assignees** per task, dependencies (with cycle detection), and comments.
- **Pages** — WYSIWYG page editor (Quill) with HTML content storage, auto-save (debounced 800ms), and full-text search across all pages in an event.
- **Shortcuts** — Add external links to make Eventyr the single source of truth for your event (e.g. registration page, Discord, sponsors doc).
- **Google Calendar Sync** — Per-user OAuth. Each user connects their own Google Calendar, picks which calendar to sync to, and assigned todos automatically appear as calendar events.
- **Telegram Reminders** — Per-user Telegram bot integration. A daily cron job sends digest reminders to assignees 3 days and 1 day before a todo's due date, plus overdue reminders. Unassigned todos notify all event members.
- **Telegram Comment Notifications** — When someone comments on a task, all assignees (except the commenter) receive a Telegram notification.
- **AI Chat** — Chat with your event data using Ollama Cloud. The AI has direct context access to todos, pages, and shortcuts, with inline citations linking to the relevant items.
- **Roles & Permissions** — Create custom roles per event with 8 granular permission flags. Members can be assigned roles with a batch save + confirmation flow.
- **Dark Mode** — Full dark mode UI with Tailwind CSS v4.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend & Backend | Next.js 16 (App Router, Server Actions) |
| Database | Supabase Postgres |
| Auth | Supabase Auth |
| LLM | Ollama Cloud (native `/api/chat` endpoint, model `gpt-oss:20b`) |
| Google Calendar | googleapis (OAuth per user) |
| Telegram | Telegram Bot API (per-user DM reminders) |
| Page Editor | Quill (react-quill-new) |
| Markdown | react-markdown + remark-gfm |
| Styling | Tailwind CSS v4 (dark mode, 17px root font) |
| Deployment | Render (web service) + cron-job.org (scheduled reminders) |

## Prerequisites

- Node.js 20+ (Node 22+ recommended)
- A Supabase project
- A Google Cloud project with OAuth credentials (for Calendar sync)
- An Ollama Cloud account (for AI chat)
- A Telegram bot (for reminders and comment notifications)
- A Render account (for deployment)
- A cron-job.org account (for free scheduled reminders)

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
| `OLLAMA_BASE_URL` | Ollama Cloud API base URL (e.g. `https://ollama.com/api`) |
| `OLLAMA_API_KEY` | Ollama Cloud API key |
| `OLLAMA_CHAT_MODEL` | Chat model name (e.g. `gpt-oss:20b`) |
| `APP_BASE_URL` | Your app's base URL (e.g. `http://localhost:3000`) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from BotFather |
| `TELEGRAM_BOT_USERNAME` | Telegram bot username (without @) |
| `CRON_SECRET` | Secret key to protect the cron API endpoint |

### 3. Run database migrations

Run the consolidated schema file against your Supabase database via the Supabase SQL Editor:

```sql
-- Paste the contents of supabase/migrations/001_initial.sql and run
```

Or via the Supabase CLI:

```bash
supabase db push
```

The schema file creates all tables, RLS policies, triggers, and indexes in one go. It also reloads the PostgREST schema cache automatically at the end.

### 4. Run the development server

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

## How to Use

### Creating an Event

1. Sign up or log in to Eventyr.
2. On the dashboard, click "New Event".
3. Fill in the event name, type (Hackathon, Workshop, Social, Other), start/end dates, and description.
4. The event creator automatically becomes the Owner with all permissions.
5. An Owner role with all permissions is created automatically for the event.

### Inviting Members

1. Go to Event Settings → Invite Link.
2. Copy the invite link and share it with your team.
3. When someone opens the link, they join the event and are assigned the Volunteer role (or the first available role if no Volunteer role exists).
4. They can then see the event in their dashboard.

### Roles & Permissions

1. Go to Event Settings → Roles & Permissions.
2. You'll see the default Owner role (created automatically).
3. Click "New Role", enter a name, and toggle the permission flags:
   - **Create Todo** — Can create new tasks
   - **Delete Todo** — Can delete tasks
   - **Manage Members** — Can assign/remove members and change roles
   - **Edit Pages** — Can create and edit event pages
   - **View** — Can view the event and its contents
   - **Edit Event** — Can change event details (name, dates, etc.)
   - **Manage Shortcuts** — Can add/remove external links
   - **Manage Integrations** — Can configure Telegram, Calendar, etc.
4. Role names and permissions auto-save (debounced 500ms).
5. The roles list is scrollable with a fixed max height.

### Managing Members

1. Go to Event Settings → Members section.
2. Each member shows their avatar initials, name, and a role dropdown (sorted alphabetically).
3. Change roles by selecting from the dropdown — changes are staged locally.
4. Click "Save Changes" to batch-save all role changes.
5. A confirmation modal shows all changes (e.g. "Alice: Volunteer → Organizer") before applying.
6. To remove a member, click "Remove" — a confirmation modal appears before removal.

### Creating and Managing Todos

1. Navigate to the Todos tab within an event.
2. Click "New Todo" to create a task.
3. Fill in the title, description, due date, and **select one or more assignees** via checkboxes.
4. The todo appears in the list with status, assignee names, due date, and days left.
5. Click a todo to view details, change status, add comments, or manage dependencies.
6. Dependencies prevent completing a task until its blockers are done (cycle detection included).

### Telegram Integration

Telegram integration in Eventyr is per-user — each user connects their own Telegram account to receive personal DM reminders.

#### Creating a Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts to create a bot.
3. Copy the bot token provided.
4. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` in your environment variables.

#### Registering the Webhook

Register the webhook so the bot can receive messages:

```bash
curl -F "url=https://your-app-url/api/telegram/webhook" https://api.telegram.org/bot<TOKEN>/setWebhook
```

For local development, use a tunnel like ngrok:

```bash
ngrok http 3000
curl -F "url=https://<ngrok-url>/api/telegram/webhook" https://api.telegram.org/bot<TOKEN>/setWebhook
```

#### Connecting Your Account

1. Start a DM with your bot on Telegram.
2. The bot will ask for your Eventyr account email.
3. Enter the email associated with your Eventyr account.
4. In Eventyr, go to Settings → Telegram Connect.
5. You'll see a pending connection request — click "Approve" to link your Telegram.
6. Once connected, you'll receive:
   - **Task reminders** — Digest messages 3 days and 1 day before a todo's due date, plus overdue reminders.
   - **Comment notifications** — When someone comments on a task assigned to you.

#### Telegram Reminder Format

```
You have 2 tasks

1. Set up registration page - Overdue
2. Order catering - Due on Mon, Sep 8, 09:00

Check your tasks in: https://your-app-url/app/events/{eventId}/todos
```

- **Assigned todos**: Sent to all assignees with Telegram connected.
- **Unassigned todos**: Sent to all event members with Telegram connected.
- Reminders are sent once per todo per reminder type (logged in `reminder_log` table).

### Google Calendar Sync

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create OAuth 2.0 Client ID credentials with the following scopes:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.calendars.readonly`
3. Add your redirect URI to **Authorized redirect URIs**:
   - Local: `http://localhost:3000/api/calendar/callback`
   - Production: `https://your-app.onrender.com/api/calendar/callback`
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in your env vars.
5. If your Google app is in "Testing" mode, add your Google email as a test user in the OAuth consent screen.
6. In Eventyr, go to Event Settings → Google Calendar → Connect.
7. Authorize with your Google account and select a calendar to sync to.
8. Assigned todos are automatically synced as calendar events.

### Pages (WYSIWYG Editor)

1. Navigate to the Pages tab within an event.
2. Click "+" to create a new page.
3. Use the Quill WYSIWYG editor to write rich content — headings, lists, tables, formatting.
4. Content auto-saves 800ms after you stop typing.
5. Search across all pages in an event using the search bar.

### AI Chat

1. Navigate to the Chat tab within an event.
2. Ask questions about your event — e.g. "What tasks are overdue?" or "Summarize the setup page".
3. The AI fetches context directly from the database (todos, pages, shortcuts) and responds with inline citations.
4. Citations appear as clickable chips linking to the relevant todo, page, or shortcut.

### Shortcuts

1. Navigate to the Shortcuts tab within an event.
2. Click "+" to add an external link (e.g. registration form, Discord invite, sponsor doc).
3. Shortcuts appear as a grid of cards — click to open in a new tab.

## Deployment

### Render (Web Service)

The `render.yaml` file defines a single web service.

1. Push your code to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), create a new web service from your repository (or use Blueprints with `render.yaml`).
3. Build command: `npm install && npm run build`
4. Start command: `npm run start`
5. Configure all environment variables in the Render dashboard (see the env vars table above):
   - Set `APP_BASE_URL` to your production URL (e.g. `https://eventyr.onrender.com`)
   - Set `GOOGLE_REDIRECT_URI` to `https://eventyr.onrender.com/api/calendar/callback`
   - Set `CRON_SECRET` to a random string (e.g. generate with `openssl rand -hex 32`)
   - Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`
6. Deploy the service.

### Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Run the consolidated schema file `supabase/migrations/001_initial.sql` via the Supabase SQL Editor.
3. The schema cache is reloaded automatically at the end of the script.
4. Copy the project URL and anon key to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Copy the service role key to `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose to client).

### cron-job.org (Telegram Reminders)

Instead of a paid Render cron service, reminders are triggered via a free external scheduler that calls your app's API endpoint.

1. Create a free account at [cron-job.org](https://cron-job.org).
2. Create a new cron job with:
   - **URL**: `https://your-app.onrender.com/api/cron/reminders`
   - **Method**: GET
   - **Schedule**: Daily at 09:00 UTC (or your preferred time)
   - **HTTP Header**: `Authorization: Bearer <your-CRON_SECRET>`
3. Save and enable the job.

To test manually:

```bash
curl -H "Authorization: Bearer <your-CRON_SECRET>" https://your-app.onrender.com/api/cron/reminders?dry_run=true
```

The `dry_run=true` parameter logs what would be sent without actually sending Telegram messages.

## Project Structure

```
src/
  app/
    (auth)/              — Login, signup pages
    app/                 — Main app routes (/app/*)
      events/[eventId]/
        todos/           — Todo list, detail, new
        pages/           — Page list, WYSIWYG editor
        shortcuts/       — External links grid
        settings/        — Event settings, roles, members, integrations
        chat/            — AI chat
    api/
      calendar/          — Google Calendar OAuth + callback
      chat/              — AI chat streaming endpoint
      cron/reminders/    — Cron API endpoint (protected by CRON_SECRET)
      telegram/webhook/  — Telegram bot webhook
  components/
    ui/                  — Reusable UI primitives (Button, Card, Input, etc.)
    todo/                — Todo components (list, form, status, comments)
    page/                — Page editor (Quill)
    chat/                — Chat UI (messages, citations)
    settings/            — Settings components (roles, members, telegram, calendar)
    sidebar/             — App sidebar
  lib/
    actions/             — Server Actions (events, todos, pages, members, comments, etc.)
    supabase/            — Supabase clients (server, client, admin)
    reminders.ts         — Reminder logic (digest messages, overdue, grouping)
    calendar.ts          — Google Calendar sync logic
    crypto.ts            — AES-256-GCM encryption
    rag.ts               — Direct DB context fetch for AI chat
    llm.ts               — Ollama Cloud LLM client (native /api/chat)
    telegram.ts          — Telegram Bot API client
    permissions.ts       — Role-based permission checks
    auth.ts              — Current user helper
    todo-status.ts       — Status types, labels, days-left logic
    cycle-detection.ts   — Dependency cycle detection (DFS)
  cron/
    send-reminders.ts    — Standalone cron script (calls runReminders)
supabase/
  migrations/
    001_initial.sql    — Consolidated schema (all tables, policies, triggers, indexes)
```

## License

Private project.