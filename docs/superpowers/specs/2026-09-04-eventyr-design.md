# Eventyr — Event Planner & Management App

**Date:** 2026-09-04
**Status:** Approved

## Overview

Eventyr is a multi-user web app for planning and managing tech events (hackathons, workshops, tech socials). It serves as the single source of truth for an event: todos with dependencies and reminders, Notion-like pages for key data, external shortcuts, Google Calendar sync, Telegram reminders, and an AI chat for querying event data.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend + Backend | Next.js (App Router) full-stack, single deployable |
| Database | Supabase Postgres (relational) + pgvector (AI embeddings) |
| Auth | Supabase Auth (email/password + OAuth providers) |
| Background jobs | Render Cron Job (daily Telegram reminders) |
| LLM | Ollama Cloud (OpenAI-compatible API) via `OLLAMA_BASE_URL` |
| Google Calendar | Google OAuth per user, Calendar API |
| Styling | Tailwind CSS, Notion/Linear-inspired |
| Deployment | Render (web service + cron service) |

### Key Libraries

- `@supabase/supabase-js` + `@supabase/ssr` — DB + Auth
- `googleapis` — Calendar API
- `node-telegram-bot-api` or native fetch — Telegram messages
- `openai` npm package (pointed at Ollama Cloud) — LLM chat
- `zod` — validation
- `lucide-react` — icons
- `vitest` — unit/integration tests
- `playwright` — E2E tests

## Architecture

```
Browser → Next.js (SSR/API routes) → Supabase Postgres
                                    → Google Calendar API (per-user OAuth)
                                    → Telegram Bot API (per-event config)
                                    → Ollama Cloud (AI chat, RAG via pgvector)
Render Cron ──────────────────────→ Supabase (query due todos) → Telegram Bot API
```

### Deployment Topology (Render)

- **web** service — Next.js app (SSR + API routes)
- **cron** service — daily script: checks todos due in 3/1 days, sends Telegram reminders

### App Layout

Sidebar + Tabs (Notion-style):
- Left sidebar: list of events the user belongs to.
- Right: tabbed interface for the selected event (Overview, Todos, Pages, Shortcuts, Settings).

## Data Model

### Tables

#### `auth.users` (Supabase managed)
Authentication users. A `profiles` table extends with `display_name` and `avatar_url`, linked 1:1 to `auth.users`.

#### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK, FK → auth.users | 1:1 with auth user |
| display_name | text | |
| avatar_url | text | nullable |

#### `events`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | |
| description | text | |
| type | enum | hackathon, workshop, social, other |
| start_date | timestamptz | |
| end_date | timestamptz | |
| created_by | uuid FK → auth.users | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| telegram_bot_token | text | nullable, encrypted |
| telegram_chat_id | text | nullable |
| invite_token | text unique | cryptographically random |

#### `roles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| name | text | e.g. "Owner", "Organizer", or custom |
| permissions | jsonb | permission flags (see below) |

**Status transitions:** All transitions are allowed (Not Started ↔ In Progress ↔ Blocked → Completed). The only constraint: a todo cannot be marked Completed if any of its dependencies are not Completed. Completed todos can be reopened to any state. Enforced both client-side (UI disables the action) and server-side (API returns error).
**Permission flags:**

`can_create_todo`, `can_delete_todo`, `can_manage_members`, `can_edit_pages`, `can_view`, `can_edit_event`, `can_manage_shortcuts`, `can_manage_integrations`

#### `event_members`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| user_id | uuid FK → auth.users | |
| role_id | uuid FK → roles | |
| joined_at | timestamptz | |
| | unique(event_id, user_id) | |

#### `todos`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| title | text | |
| description | text | |
| due_date | timestamptz | |
| status | enum | not_started, in_progress, blocked, completed |
| assigned_to | uuid FK → auth.users | nullable |
| created_by | uuid FK → auth.users | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

`days_left` is computed at query time (`due_date - now()`), not stored.

#### `todo_dependencies`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| todo_id | uuid FK → todos | |
| depends_on_todo_id | uuid FK → todos | |
| | unique(todo_id, depends_on_todo_id) | |

Cycle prevention enforced at app level (DFS check on insert).

#### `todo_comments`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| todo_id | uuid FK → todos | |
| user_id | uuid FK → auth.users | |
| content | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Flat list per todo (not threaded).

#### `pages`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| title | text | |
| parent_id | uuid FK → pages | nullable, for sub-pages |
| created_by | uuid FK → auth.users | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `page_blocks`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| page_id | uuid FK → pages | |
| type | enum | heading, text, list, table, organizer_list, prize_list |
| content | jsonb | type-specific structured data |
| position | int | ordering within page |

**Block types:**
- `heading` — `{ text, level }`
- `text` — `{ text }`
- `list` — `{ items: string[] }`
- `table` — `{ rows: string[][] }`
- `organizer_list` — `{ items: [{ name, role, contact }] }`
- `prize_list` — `{ items: [{ rank, prize, sponsor }] }`

Structured types (organizer_list, prize_list) enable search and AI indexing.

#### `shortcuts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| label | text | |
| url | text | |
| icon | text | nullable |
| created_by | uuid FK → auth.users | |
| created_at | timestamptz | |

#### `google_calendar_tokens`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → auth.users | unique |
| access_token | text | encrypted |
| refresh_token | text | encrypted |
| expires_at | timestamptz | |
| calendar_id | text | selected calendar ID (user picks from their calendar list after OAuth, or enters manually) |

#### `calendar_sync_state`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| todo_id | uuid FK → todos | |
| user_id | uuid FK → auth.users | |
| google_event_id | text | |
| last_synced_at | timestamptz | |
| | unique(todo_id, user_id) | |

#### `ai_embeddings`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| source_type | enum | todo, page, page_block, shortcut |
| source_id | uuid | |
| content | text | text used for embedding |
| embedding | vector | pgvector, dimension matches model (e.g., 1536 for `nomic-embed-text`) |

- **Embedding generation** — embeddings generated on content change via a Server Action that calls Ollama Cloud's embedding endpoint (e.g., `nomic-embed-text`). Alternatively a Supabase DB trigger + Edge Function. Decision: Server Action for simplicity in v1; revisit Edge Function if latency becomes an issue.

#### `reminder_log` (cron tracking)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| todo_id | uuid FK → todos | |
| event_id | uuid FK → events | |
| days_before | int | 3 or 1 |
| sent_at | timestamptz | |
| status | text | sent, failed |
| error | text | nullable |

### Security

- **Row Level Security (RLS)** enabled on all tables. Users can only access rows for events where they are members (via `event_members` join).
- **Permission checks** in Server Actions / API routes: verify the user's role has the required permission flag before mutating data. UI hiding is not sufficient.
- **Secrets encryption** — Telegram bot tokens and Google OAuth tokens encrypted at rest using Supabase Vault or app-level AES encryption with a server-side key.
- **Google OAuth scopes** — limited to `calendar.events` (read/write calendar events only).
- **Invite tokens** — cryptographically random, non-guessable. Can be revoked/regenerated by event owner.
- **AI chat** — query embeddings filtered by user's event membership before LLM call; no cross-event data leakage.
- **Cycle prevention** — todo dependency insertions validated server-side via DFS to prevent circular dependencies.
- **Rate limiting** — AI chat endpoint rate-limited per user (e.g., 20 messages/hour) to control Ollama Cloud costs.

### Indexes

- `todos(event_id, status)`
- `todos(assigned_to)`
- `event_members(user_id)`
- `event_members(event_id)`
- `ai_embeddings(event_id)` with ivfflat index on `embedding`

## Features

### 1. Events
- CRUD operations. Owner can delete.
- Fields: name, description, type (hackathon/workshop/social/other), start date, end date.
- Private by default; only members can see an event and its data.

### 2. Members & Roles
- Custom roles per event with granular permission flags.
- Invite link system: each event has a unique `invite_token`; joining via the link assigns a default role (configurable in settings).
- Roles UI: create role, name it, toggle permission flags, assign to members.

### 3. Todos
- Full CRUD. Fields: title, description, due date, status, assigned_to.
- `days_left` auto-calculated (rendered, not stored).
- Status flow: Not Started → In Progress → Blocked → Completed (transitions enforced in UI). Allowed transitions: any state → any state except None → Completed is allowed, but completing a todo with incomplete dependencies is blocked by the UI (server-side returns an error if dependencies are not all completed).
- Dependencies: a todo can depend on one or more other todos. UI prevents marking a dependent todo as complete if its blockers aren't done. Cycle prevention via DFS at insert time.
- Comments: flat list per todo.

### 4. Google Calendar Sync
- Per-user OAuth (each user connects their own Google Calendar).
- After OAuth, the app fetches the user's calendar list via the Calendar API and lets them pick which calendar to sync to. Manual calendar ID entry is also supported as a fallback.
- The selected `calendar_id` is stored in `google_calendar_tokens`.
- When a todo is assigned to a user with a connected calendar, it syncs as a Google Calendar event (title, due date/time, description) to the selected calendar.
- Auto-updates on todo edit, removes on delete.
- Sync state tracked in `calendar_sync_state`.

### 5. Telegram Reminders
- Per-event config: bot token + chat ID, stored encrypted.
- Render Cron runs daily: queries todos where `due_date` is exactly 3 or 1 day away AND status != completed.
- Sends a formatted message to the event's Telegram group: todo title, assignee, due date, link back to the app.
- Failed sends retried up to 3 times with backoff. Results logged in `reminder_log`.
- Dry-run mode (env flag) for testing without sending.

### 6. Pages (Notion-like)
- Block-based editor. Block types: heading, text, bulleted list, table, organizer list (structured: name + role + contact), prize list (structured: rank + prize + sponsor).
- Blocks reorderable.
- Sub-pages via `parent_id`.
- Search: full-text over page titles and block content. Structured types also indexed for AI chat.

### 7. Shortcuts
- Simple CRUD: label, URL, optional icon.
- Displayed as a grid on the Shortcuts tab and linked in the Overview.
- Makes the app the single source of truth for the event.

### 8. AI Chat
- RAG-based. User asks a question about their event data.
- Query is embedded, searched against `ai_embeddings` (filtered by events the user belongs to) via pgvector cosine similarity.
- Top chunks + question sent to Ollama Cloud (OpenAI-compatible API).
- Response streamed back. Sources cited (e.g., "From page: Prize List").
- Embeddings generated on content change (todos, pages, page_blocks, shortcuts) via Server Action or DB trigger + edge function.

## App Router Structure

```
app/
  (auth)/
    login, signup, callback          → Supabase Auth flows
  (app)/
    layout.tsx                       → sidebar (events list) + top bar
    page.tsx                         → dashboard: your events overview
    events/
      new/page.tsx                   → create event form
      [eventId]/
        layout.tsx                   → event tabs nav (Overview|Todos|Pages|Shortcuts|Settings)
        page.tsx                     → Overview: summary cards (todo stats, upcoming due, members)
        todos/
          page.tsx                   → todo list (filter by status/assignee, grouped by status)
          [todoId]/page.tsx          → todo detail: edit, comments, dependencies, status changes
        pages/
          page.tsx                   → pages tree/list
          [pageId]/page.tsx          → page editor (block-based, add/reorder blocks)
        shortcuts/
          page.tsx                   → shortcuts grid, add/edit/delete
        settings/
          page.tsx                   → event settings: name, type, dates, Telegram config,
                                          roles manager, members list, invite link, danger zone
    invite/[token]/page.tsx          → join event via invite link
    chat/page.tsx                    → global AI chat (ask about any event you're in)
  api/
    calendar/
      connect/route.ts               → Google OAuth redirect
      callback/route.ts              → OAuth callback, store tokens
      sync/route.ts                  → push a todo to user's Google Calendar
    chat/route.ts                    → streaming AI chat (RAG over pgvector)
```

### Shared UI Components

Sidebar, Tabs, TodoCard, TodoDetail, BlockEditor, RolePicker, MemberList, ShortcutCard, ChatPanel, StatusBadge, DatePicker, ConfirmDialog.

## Error Handling

- API routes return structured error responses `{ error: string, code: string }` with appropriate HTTP status codes.
- Server Actions use `zod` for input validation; form errors surfaced inline via `useFormState`.
- Google Calendar sync failures (token expired, API error) → log, mark `calendar_sync_state` as stale, show a non-blocking banner in UI to reconnect.
- Telegram send failures in cron → logged with retry (up to 3 attempts with backoff); failed sends tracked in `reminder_log`.
- AI chat errors (Ollama unreachable, timeout) → graceful fallback message: "Sorry, I couldn't reach the AI service. Please try again."
- Optimistic UI updates for todo status changes with rollback on failure.

## Testing

- **Unit tests** (Vitest) — utility functions, permission checks, dependency cycle detection, reminder date logic, block rendering.
- **Integration tests** (Vitest + Supabase local) — CRUD operations with RLS enforced, Google Calendar sync flow, Telegram reminder logic.
- **E2E tests** (Playwright) — critical paths: create event → invite → join, create todo → assign → change status, page editor, AI chat.
- **Cron job** — dry-run mode (env flag) that logs what would be sent without actually sending to Telegram.