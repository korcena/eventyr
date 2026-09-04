# Eventyr — Implementation Plan

**Date:** 2026-09-04
**Spec:** `docs/superpowers/specs/2026-09-04-eventyr-design.md`

## Principles

- Each phase ends with a deployable, testable increment.
- Phases ordered by dependency: foundation first, then core features, then integrations, then AI.
- Within each phase, steps are ordered by dependency.
- Every phase includes a verification section (what to test / run).

---

## Phase 0: Project Scaffolding & Infrastructure

**Goal:** Next.js app running locally, Supabase project configured, CI basics in place.

### Steps

1. **Scaffold Next.js app**
   - `npx create-next-app@latest eventyr --typescript --tailwind --app --eslint --src-dir`
   - Install deps: `@supabase/supabase-js @supabase/ssr zod lucide-react`
   - Dev deps: `vitest @testing-library/react @testing-library/jestdom playwright @playwright/test`
   - Configure `vitest.config.ts`, `playwright.config.ts`.

2. **Supabase project setup**
   - Create Supabase project (dashboard or CLI).
   - Enable pgvector extension: `create extension if not exists vector;`
   - Create a `profiles` table linked to `auth.users` (handle via trigger on new user signup).
   - Store env vars locally in `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

3. **Supabase client utilities**
   - `src/lib/supabase/server.ts` — server-side client (cookies, RLS-aware).
   - `src/lib/supabase/client.ts` — browser client.
   - `src/lib/supabase/admin.ts` — service-role client (cron job only, never exposed to browser).

4. **Base layout + Tailwind theme**
   - Set up Notion/Linear-inspired theme tokens (colors, spacing, fonts) in `tailwind.config.ts` / `globals.css`.
   - Create `src/components/ui/` primitives: Button, Input, Card, Badge, Dialog, Tabs, Sidebar.
   - Root layout with font + metadata.

5. **Render deployment config**
   - Add `render.yaml` with `web` service (Next.js) placeholder.
   - Set build command `next build`, start command `next start`.

### Verification
- `npm run dev` starts the app at `localhost:3000`.
- `npm run lint` passes.
- `npm run typecheck` (add `tsc --noEmit` script) passes.
- Supabase connection works (run a simple query from a server component).

---

## Phase 1: Authentication & User Profiles

**Goal:** Users can sign up, log in, log out. Profile created automatically.

### Steps

1. **Auth pages**
   - `src/app/(auth)/login/page.tsx` — email/password login form.
   - `src/app/(auth)/signup/page.tsx` — signup form (email, password, display name).
   - `src/app/(auth)/callback/route.ts` — OAuth callback handler (for future OAuth providers).
   - `src/app/(auth)/layout.tsx` — centered auth layout.

2. **Auth Server Actions**
   - `src/app/(auth)/actions.ts` — `signup`, `login`, `logout` using Supabase Auth.
   - Validate inputs with `zod`.

3. **Profile auto-creation**
   - Supabase trigger: on `auth.users` insert, create row in `profiles` with `display_name` from signup metadata.
   - SQL migration file: `supabase/migrations/001_profiles.sql`.

4. **Auth context / middleware**
   - `src/middleware.ts` — protect `(app)` routes, redirect to `/login` if unauthenticated.
   - `src/lib/auth.ts` — `getCurrentUser()` helper (returns user + profile).

5. **Root redirect**
   - `src/app/page.tsx` — redirect to `/login` if unauthed, `/app` if authed.

### Verification
- Signup creates a user + profile row.
- Login → redirect to `/app`.
- Logout → redirect to `/login`.
- Protected routes redirect when unauthenticated.
- `npm run typecheck && npm run lint` pass.

---

## Phase 2: Events & Membership (Core CRUD)

**Goal:** Users can create events, see their events in the sidebar, and invite others.

### Steps

1. **Database migrations**
   - `002_events.sql` — `events`, `roles`, `event_members` tables, RLS policies, indexes.
   - Default: event creator gets an "Owner" role with all permission flags.
   - `invite_token` generated on event creation.

2. **Server Actions / data layer**
   - `src/lib/actions/events.ts` — `createEvent`, `updateEvent`, `deleteEvent`, `getEventsForUser`, `getEvent`.
   - `src/lib/permissions.ts` — `hasPermission(eventId, userId, flag)` helper.
   - `src/lib/actions/members.ts` — `joinEventByToken`, `getMembers`, `removeMember`, `updateMemberRole`.
   - `src/lib/actions/roles.ts` — `createRole`, `updateRole`, `deleteRole`, `getRoles`.

3. **Pages**
   - `src/app/(app)/layout.tsx` — sidebar with events list + user menu.
   - `src/app/(app)/page.tsx` — dashboard: list of user's events, "Create Event" button.
   - `src/app/(app)/events/new/page.tsx` — create event form.
   - `src/app/(app)/events/[eventId]/layout.tsx` — event tabs nav (Overview / Todos / Pages / Shortcuts / Settings). Verify membership; 404 if not a member.
   - `src/app/(app)/events/[eventId]/page.tsx` — Overview (placeholder for now).
   - `src/app/(app)/events/[eventId]/settings/page.tsx` — event settings: edit name/desc/type/dates, roles manager, members list, invite link, danger zone (delete).
   - `src/app/(app)/invite/[token]/page.tsx` — join event via invite link.

4. **Components**
   - `src/components/sidebar/EventsSidebar.tsx`
   - `src/components/event/EventTabs.tsx`
   - `src/components/settings/RolesManager.tsx`
   - `src/components/settings/MembersList.tsx`
   - `src/components/settings/InviteLink.tsx`

### Verification
- Create an event → appears in sidebar.
- Generate invite link → open in incognito → signup → join event with default role.
- Owner can edit/delete event; members with `can_edit_event` can edit; others cannot.
- RLS: a non-member cannot fetch event data via API.
- `npm run typecheck && npm run lint` pass.

---

## Phase 3: Todos, Dependencies & Comments

**Goal:** Full todo management with dependencies, status flow, comments, and days-left display.

### Steps

1. **Database migrations**
   - `003_todos.sql` — `todos`, `todo_dependencies`, `todo_comments` tables, RLS policies, indexes.

2. **Server Actions / data layer**
   - `src/lib/actions/todos.ts`:
     - `createTodo`, `updateTodo`, `deleteTodo`, `getTodos(eventId, filters)`, `getTodo(id)`.
     - `daysLeft` computed in query (`extract(epoch from due_date - now())/86400`).
   - `src/lib/actions/dependencies.ts`:
     - `addDependency`, `removeDependency`, `getDependencies(todoId)`.
     - `detectCycle(todoId, dependsOnId)` — DFS cycle detection.
   - `src/lib/actions/comments.ts`:
     - `addComment`, `updateComment`, `deleteComment`, `getComments(todoId)`.
   - `src/lib/permissions.ts` — extend with todo-specific checks (`can_create_todo`, `can_delete_todo`).

3. **Status logic**
   - `src/lib/todo-status.ts` — allowed transitions, `canComplete(todoId)` (checks dependencies all completed).
   - Server Action `updateTodoStatus` enforces: cannot complete if dependencies incomplete.

4. **Pages**
   - `src/app/(app)/events/[eventId]/todos/page.tsx` — todo list: grouped by status, filter by assignee, "Add Todo" button.
   - `src/app/(app)/events/[eventId]/todos/[todoId]/page.tsx` — todo detail: edit form, status changer, assignee picker, dependency manager, comments thread.

5. **Components**
   - `src/components/todo/TodoList.tsx` — grouped by status, filterable.
   - `src/components/todo/TodoCard.tsx` — compact row: title, assignee, due date, days left badge, status badge.
   - `src/components/todo/TodoDetail.tsx` — full detail + edit.
   - `src/components/todo/StatusBadge.tsx` — color-coded status.
   - `src/components/todo/DependencyManager.tsx` — add/remove dependencies, show blockers.
   - `src/components/todo/CommentThread.tsx` — flat comment list + add comment.

### Verification
- Create todos, assign users, set due dates.
- Status transitions work; completing a todo with incomplete dependencies is blocked.
- Dependencies: add A depends on B → B must be completed before A can be completed.
- Cycle: A→B, B→A is rejected with an error.
- Comments can be added/edited/deleted by their authors.
- `days_left` displays correctly (e.g., "2 days left", "Overdue").
- RLS + permissions enforced.
- `npm run typecheck && npm run lint` pass.

---

## Phase 4: Pages (Notion-like Block Editor)

**Goal:** Users can create pages, add/edit/reorder blocks, and search page content.

### Steps

1. **Database migrations**
   - `004_pages.sql` — `pages`, `page_blocks` tables, RLS policies, indexes.
   - Full-text search: add `tsvector` generated column on `page_blocks.content` + GIN index, or search via `ilike` on extracted text (simpler for v1).

2. **Server Actions / data layer**
   - `src/lib/actions/pages.ts`:
     - `createPage`, `updatePage`, `deletePage`, `getPages(eventId)`, `getPage(id)`, `getSubPages(parentId)`.
   - `src/lib/actions/blocks.ts`:
     - `addBlock`, `updateBlock`, `deleteBlock`, `reorderBlocks(pageId, newOrder)`.
   - `src/lib/actions/search.ts`:
     - `searchPages(eventId, query)` — search page titles + block content.

3. **Pages**
   - `src/app/(app)/events/[eventId]/pages/page.tsx` — pages tree/list + search bar.
   - `src/app/(app)/events/[eventId]/pages/[pageId]/page.tsx` — page editor: block list, add block (type picker), inline edit, drag-to-reorder.

4. **Components**
   - `src/components/page/PageTree.tsx` — hierarchical page list.
   - `src/components/page/PageSearch.tsx` — search input + results dropdown.
   - `src/components/page/BlockEditor.tsx` — renders blocks, handles reordering.
   - `src/components/page/blocks/` — one component per block type:
     - `HeadingBlock.tsx`, `TextBlock.tsx`, `ListBlock.tsx`, `TableBlock.tsx`, `OrganizerListBlock.tsx`, `PrizeListBlock.tsx`.
   - `src/components/page/AddBlockMenu.tsx` — type picker.

### Verification
- Create a page, add blocks of each type, reorder them.
- Sub-pages work (parent_id nesting).
- Search finds text in page titles and block content.
- Organize list and prize list blocks render structured data correctly.
- Permissions: only users with `can_edit_pages` can mutate; all members can view.
- `npm run typecheck && npm run lint` pass.

---

## Phase 5: Shortcuts

**Goal:** Users can add/edit/delete external links, displayed in a grid.

### Steps

1. **Database migrations**
   - `005_shortcuts.sql` — `shortcuts` table, RLS policies.

2. **Server Actions**
   - `src/lib/actions/shortcuts.ts` — `createShortcut`, `updateShortcut`, `deleteShortcut`, `getShortcuts(eventId)`.

3. **Pages**
   - `src/app/(app)/events/[eventId]/shortcuts/page.tsx` — shortcuts grid + add/edit modal.

4. **Components**
   - `src/components/shortcut/ShortcutGrid.tsx`
   - `src/components/shortcut/ShortcutCard.tsx` — label, URL, favicon-as-icon, open in new tab.
   - `src/components/shortcut/ShortcutForm.tsx` — add/edit form.

5. **Overview integration**
   - Update `src/app/(app)/events/[eventId]/page.tsx` — show shortcuts summary card on Overview.

### Verification
- Add shortcuts, edit, delete.
- Links open in new tab.
- Permissions enforced (`can_manage_shortcuts`).
- `npm run typecheck && npm run lint` pass.

---

## Phase 6: Google Calendar Sync

**Goal:** Per-user OAuth, todos sync to Google Calendar events.

### Steps

1. **Google Cloud setup**
   - Create OAuth credentials (client ID + secret) with `calendar.events` scope.
   - Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.

2. **Database migrations**
   - `006_calendar.sql` — `google_calendar_tokens`, `calendar_sync_state` tables, RLS policies.

3. **API routes**
   - `src/app/api/calendar/connect/route.ts` — redirect to Google OAuth consent.
   - `src/app/api/calendar/callback/route.ts` — handle callback, exchange code for tokens, store encrypted.
   - `src/app/api/calendar/sync/route.ts` — POST `{ todoId }` → create/update/delete Google Calendar event for the assigned user.

4. **Token encryption**
   - `src/lib/crypto.ts` — AES encrypt/decrypt using `ENCRYPTION_KEY` env var.

5. **Sync logic**
   - `src/lib/calendar.ts`:
     - `syncTodoToCalendar(todoId, userId)` — create or update Google event, upsert `calendar_sync_state`.
     - `deleteCalendarEvent(todoId, userId)` — remove Google event, delete sync state.
     - `refreshTokenIfNeeded(userId)` — refresh access token using stored refresh token.
   - Trigger sync on: todo create (if assigned), todo update (title/description/due_date/assigned_to change), todo delete, status change.
   - Trigger via Server Action (call `syncTodoToCalendar` after todo mutations, fire-and-forget).

6. **UI**
   - Settings page: "Connect Google Calendar" button → OAuth flow.
   - Connected state: show status, "Disconnect" button.
   - Todo detail: calendar sync indicator (synced / not synced / error).
   - Banner in app if tokens expired: "Reconnect Google Calendar".

### Verification
- Connect Google Calendar → tokens stored encrypted.
- Create a todo assigned to yourself → appears in Google Calendar.
- Edit the todo → Google Calendar event updates.
- Delete the todo → Google Calendar event removed.
- Reassign todo → event moves to new assignee's calendar (if connected).
- Token refresh works after expiry.
- `npm run typecheck && npm run lint` pass.

---

## Phase 7: Telegram Reminders (Cron)

**Goal:** Daily cron checks todos due in 3/1 days, sends Telegram reminders.

### Steps

1. **Database migrations**
   - `007_reminder_log.sql` — `reminder_log` table.

2. **Telegram config UI**
   - Event settings: add fields for `telegram_bot_token` and `telegram_chat_id` (encrypted at rest).
   - "Send test message" button to verify configuration.

3. **Cron job script**
   - `src/cron/send-reminders.ts` — standalone script (run via `tsx`):
     - Query all events with Telegram config.
     - For each event: find todos where `due_date` is exactly 3 or 1 days away AND `status != completed`.
     - For each matching todo: send Telegram message (title, assignee, due date, app link).
     - Log to `reminder_log` (sent/failed).
     - Retry up to 3 times with backoff on send failure.
     - Dry-run mode: `DRY_RUN=true` → log only, no send.
     - Idempotency: check `reminder_log` to avoid duplicate sends for the same todo + days_before.

4. **Telegram client**
   - `src/lib/telegram.ts` — `sendMessage(botToken, chatId, text)` using Telegram Bot API (fetch-based, no heavy dependency).

5. **Render cron config**
   - `render.yaml` — add `cron` service:
     ```
     services:
       - type: cron
         name: eventyr-reminders
         schedule: "0 9 * * *"  # daily at 09:00 UTC
         command: npx tsx src/cron/send-reminders.ts
         envVars: [SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY, APP_BASE_URL, DRY_RUN]
     ```

6. **Settings UI**
   - `src/components/settings/TelegramConfig.tsx` — input fields, test button, status.

### Verification
- Configure Telegram in event settings → test message arrives in group.
- Create a todo due in 3 days, run cron with `DRY_RUN=true` → logs the reminder without sending.
- Run without dry-run → message sent to Telegram, logged in `reminder_log`.
- Run again same day → no duplicate (idempotency check).
- Todo due in 1 day, status completed → no reminder sent.
- `npm run typecheck && npm run lint` pass.

---

## Phase 8: AI Chat (RAG)

**Goal:** Users can ask questions about their event data; answers grounded via pgvector RAG.

### Steps

1. **Database migrations**
   - `008_ai_embeddings.sql` — `ai_embeddings` table with `vector` column, ivfflat index.

2. **Embedding generation**
   - `src/lib/embeddings.ts`:
     - `generateEmbedding(text)` — call Ollama Cloud embedding endpoint (`nomic-embed-text` or configured model).
     - `indexContent(eventId, sourceType, sourceId, content)` — generate embedding, upsert into `ai_embeddings`.
     - `removeIndex(sourceType, sourceId)` — delete embedding.
   - Hook into content mutations:
     - Todo create/update/delete → index/remove.
     - Page block create/update/delete → index/remove.
     - Shortcut create/update/delete → index/remove.
   - Called from Server Actions after successful DB write (fire-and-forget).

3. **RAG query**
   - `src/lib/rag.ts`:
     - `searchRelevantContent(userId, query, topK=5)`:
       - Generate query embedding.
       - Filter `ai_embeddings` by events the user belongs to.
       - Cosine similarity search via pgvector (`<=>` operator).
       - Return top K chunks with source metadata.
   - `src/lib/llm.ts`:
     - `chat(messages, systemPrompt)` — call Ollama Cloud via `openai` npm package with `baseURL: process.env.OLLAMA_BASE_URL`.
     - Streaming support for SSE response.

4. **API route**
   - `src/app/api/chat/route.ts`:
     - POST `{ message }`.
     - Rate limit: 20 messages/hour per user (in-memory or Supabase counter).
     - RAG search → build context from top chunks → send to LLM with system prompt ("You are Eventyr's assistant. Answer based on the provided event data. Cite sources.").
     - Stream response via SSE.
     - Include source citations in the final message.

5. **UI**
   - `src/app/(app)/chat/page.tsx` — chat interface:
     - Message list (user + assistant, markdown rendered).
     - Input box, send button.
     - Source citations displayed under each assistant message.
     - Event selector (optional: filter to a specific event or search across all).
   - `src/components/chat/ChatMessage.tsx`
   - `src/components/chat/ChatInput.tsx`
   - `src/components/chat/SourceCitations.tsx`

6. **Env vars**
   - `OLLAMA_BASE_URL`, `OLLAMA_API_KEY` (if required), `OLLAMA_CHAT_MODEL`, `OLLAMA_EMBED_MODEL`.

### Verification
- Create event data (todos, pages with prize lists, shortcuts).
- Ask "What are the prizes for the hackathon?" → response cites the prize list page.
- Ask "What tasks are overdue?" → response lists overdue todos.
- Ask about an event you're NOT a member of → no data from that event appears (RLS on embeddings).
- Rate limiting works after 20 messages.
- Streaming response renders progressively.
- `npm run typecheck && npm run lint` pass.

---

## Phase 9: Polish & E2E Tests

**Goal:** Production-ready polish, full E2E coverage, deployment verified.

### Steps

1. **UI polish**
   - Loading states (skeletons) for all data-fetching pages.
   - Empty states (no events, no todos, no pages, no shortcuts).
   - Error boundaries at route segment level.
   - Toast notifications for mutations (success/error).
   - Responsive: sidebar collapses on mobile, tabs become scrollable.
   - Dark mode toggle (Tailwind `dark:` classes).

2. **Overview page**
   - `src/app/(app)/events/[eventId]/page.tsx` — full overview:
     - Todo stats (counts by status, overdue count).
     - Upcoming due (next 5 todos by due date).
     - Recent pages (last edited).
     - Shortcuts quick access.
     - Members count.

3. **E2E tests (Playwright)**
   - `e2e/auth.spec.ts` — signup, login, logout.
   - `e2e/events.spec.ts` — create event, invite, join.
   - `e2e/todos.spec.ts` — create todo, assign, status change, dependency, comment.
   - `e2e/pages.spec.ts` — create page, add blocks, reorder, search.
   - `e2e/shortcuts.spec.ts` — add, edit, delete.
   - `e2e/chat.spec.ts` — ask a question, get response with citations.

4. **Unit tests (Vitest)**
   - `src/lib/__tests__/permissions.test.ts`
   - `src/lib/__tests__/todo-status.test.ts`
   - `src/lib/__tests__/cycle-detection.test.ts`
   - `src/lib/__tests__/reminder-logic.test.ts`

5. **Render deployment**
   - Configure all env vars in Render dashboard.
   - Deploy web service.
   - Deploy cron service.
   - Verify: auth, event creation, todo flow, Telegram reminder, Google Calendar sync, AI chat all work on production.

### Verification
- All E2E tests pass: `npx playwright test`.
- All unit tests pass: `npm run test`.
- `npm run typecheck && npm run lint` pass.
- Production deployment on Render is functional.

---

## Dependency Order Summary

```
Phase 0 (scaffolding)
  └→ Phase 1 (auth)
      └→ Phase 2 (events & members)
          ├→ Phase 3 (todos)
          │    └→ Phase 6 (google calendar, needs todos)
          │    └→ Phase 7 (telegram cron, needs todos)
          ├→ Phase 4 (pages)
          └→ Phase 5 (shortcuts)
               └→ Phase 8 (AI chat, needs all content)
                   └→ Phase 9 (polish & E2E)
```

## Environment Variables (Complete)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Encryption
ENCRYPTION_KEY=

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Ollama Cloud
OLLAMA_BASE_URL=
OLLAMA_API_KEY=
OLLAMA_CHAT_MODEL=
OLLAMA_EMBED_MODEL=

# App
APP_BASE_URL=

# Cron
DRY_RUN=
```

## SQL Migration Files

```
supabase/migrations/
  001_profiles.sql
  002_events.sql
  003_todos.sql
  004_pages.sql
  005_shortcuts.sql
  006_calendar.sql
  007_reminder_log.sql
  008_ai_embeddings.sql
```