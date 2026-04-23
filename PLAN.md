# Plan: Persistent Chat Log Feature

## Overview

Add persistent, URL-addressable chat sessions stored in `localStorage`.
No backend changes required — this is a single-user local app.

---

## Data Model

```ts
// src/lib/chat-storage.ts
interface ChatSession {
  id: string;        // uuid (crypto.randomUUID)
  title: string;     // first user message, truncated to 60 chars
  messages: Message[]; // same Message type used in ChatWindow
  createdAt: number; // Date.now()
  updatedAt: number; // Date.now() — updated on every message
}
```

Sessions are stored as `chat:<id>` keys in `localStorage`.
A separate `chat:last` key tracks the most recently active chat ID.

---

## URL Routing

| URL | Behavior |
|-----|----------|
| `/` | Static redirect to `/chat/last` |
| `/chat/last` | Reads `chat:last`; redirects to `/chat/<id>` if valid, otherwise creates a new UUID and redirects |
| `/chat/[id]` | Load and display the session with that ID |

Next.js resolves `app/chat/last/page.tsx` before the dynamic `[id]` route, so `last` is never treated as an ID.
Browser history is preserved naturally by Next.js router, satisfying requirement 6.

---

## Auto-Discard Rule

Sessions with `updatedAt < now - 2 days` are pruned. Pruning runs once on
`chat-storage.ts` module load (called from `ChatWindow` on mount).

---

## Files

### New files (5)

| File | Purpose |
|------|---------|
| `src/lib/chat-storage.ts` | localStorage CRUD + prune logic |
| `src/components/chat/ChatSidebar.tsx` | Sidebar: list sessions, new chat, delete |
| `app/chat/last/page.tsx` | Reads `chat:last`, redirects to active or new chat |
| `app/chat/[id]/page.tsx` | Route that passes `id` param to `ChatWindow` |
| `app/chat/layout.tsx` | Flex layout: `<ChatSidebar>` + `{children}` |

### Modified files (2)

| File | Change |
|------|--------|
| `app/page.tsx` | Simple redirect to `/chat/last` |
| `src/components/chat/ChatWindow.tsx` | Accept `chatId` prop, load/save messages to storage |

---

## Step-by-Step Implementation

### Step 1 — `src/lib/chat-storage.ts`

```ts
export function pruneOldSessions(): void        // delete sessions > 2 days old
export function createSession(id: string): ChatSession
export function getSession(id: string): ChatSession | null
export function saveSession(session: ChatSession): void
export function listSessions(): ChatSession[]   // sorted by updatedAt desc
export function deleteSession(id: string): void
export function getLastChatId(): string | null
export function setLastChatId(id: string): void
```

### Step 2 — `app/chat/[id]/page.tsx`

Server component. Reads `params.id`, renders:
```tsx
<ChatWindow chatId={params.id} />
```

### Step 3 — `app/chat/layout.tsx`

Client component. Renders:
```tsx
<div className="flex h-screen">
  <ChatSidebar />
  <main className="flex-1 overflow-hidden">{children}</main>
</div>
```

### Step 4 — Update `app/page.tsx`

Simple server-side redirect (no client JS needed):
```ts
import { redirect } from "next/navigation";
export default function Home() { redirect("/chat/last"); }
```

### Step 4b — `app/chat/last/page.tsx`

Client component with `useEffect`:
- Read `getLastChatId()` → if valid (not expired), `router.replace('/chat/<id>')`
- Otherwise `router.replace('/chat/' + crypto.randomUUID())`
- Render `null` (redirect happens before paint)

### Step 5 — Refactor `src/components/chat/ChatWindow.tsx`

- Add `chatId: string` prop
- On mount: `pruneOldSessions()`, load session via `getSession(chatId)`, initialize `messages` from it; if session doesn't exist yet, call `createSession(chatId)`
- On every `setMessages(...)` call: also call `saveSession(...)` with updated messages
- Set `title` from first user message (once), `updatedAt` on every save
- Call `setLastChatId(chatId)` on mount

### Step 6 — `src/components/chat/ChatSidebar.tsx`

- On mount: `listSessions()` → display list
- Each row: title (truncated), relative date (`2 hours ago` / `yesterday`)
- Active session highlighted (compare to current `pathname`)
- "✕" delete button per row → `deleteSession(id)`, if current chat redirect to `/`
- "New Chat" button at top → navigate to `/chat/<crypto.randomUUID()>`
- Re-renders when navigating between chats (listen to `usePathname()`)

---

## UX Behaviour Summary

| Action | Result |
|--------|--------|
| Visit `/` | Redirected to `/chat/last` |
| Visit `/chat/last` (first time) | New UUID created, redirected to `/chat/<uuid>` |
| Visit `/chat/last` (returning) | Redirected to last active chat |
| Click "New Chat" | Fresh UUID, new empty session |
| Click session in sidebar | Navigate to `/chat/<id>` (browser history preserved) |
| Click discard on session | Session deleted; if active, redirect to `/` |
| Sessions > 2 days old | Pruned silently on next app load |
| Browser back button | Normal browser history — returns to previous chat |

---

## Out of Scope (not included)

- Search across chat history
- Rename chat sessions
- Export chat logs
- Cross-device sync (would require backend)

---

## [REVISED] Revision 2 — Routing Overhaul

### New URL table

| URL | Behavior |
|-----|----------|
| `/` | Redirect to `/chat/new` (always a fresh chat) |
| `/chat/new` | Renders `ChatWindow` with no ID; URL updates to `/chat/<uuid>` on first response |
| `/chat/last` | Reads `chat:last`, redirects to that session; only reachable via explicit "Back to last chat" link |
| `/chat/:id` | Load session; if ID not found in localStorage → redirect to `/chat/new` |

### Key behavioral changes

#### 1. No UUID until first response
- `ChatWindow` accepts `chatId: string | null` (`null` = new chat)
- Inside `send()`, a `resolvedId` is computed once: `chatId ?? crypto.randomUUID()`
- On `done` event: if `chatId` was null, call `router.replace('/chat/<resolvedId>')` then `persistMessages`
- URL never changes to a real UUID until a response is received

#### 2. `/` always goes to new chat
- `app/page.tsx` redirects to `/chat/new` (not `/chat/last`)

#### 3. "Back to last chat" — explicit only
- `chat:last` is no longer touched on `/` load
- Sidebar footer shows a "Back to last chat" link (only if `getLastChatId()` is set) that navigates to `/chat/last`

#### 4. Invalid ID → new chat
- `ChatWindow` on mount: if `chatId` is set but `getSession(chatId)` returns null → `router.replace('/chat/new')`

### Files

| File | Action | Change |
|------|--------|--------|
| `app/chat/new/page.tsx` | New | Renders `<ChatWindow key="new" chatId={null} />` |
| `app/page.tsx` | Modify | Redirect to `/chat/new` |
| `src/components/chat/ChatWindow.tsx` | Modify | `chatId: string \| null`, URL update on first response, invalid-ID redirect |
| `src/components/chat/ChatSidebar.tsx` | Modify | "New Chat" → `/chat/new`; add "Back to last chat" footer link |

---

## [REVISED] Revision 1 — Layout, Sidebar, Lazy Session

### Changes

#### 1. ChatGPT-style collapsible sidebar + hidden by default

`app/chat/layout.tsx` becomes a client component managing `sidebarOpen` state (default `false`).

Layout structure:
```
<div class="flex h-screen">
  <ChatSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
  <main class="flex-1 overflow-hidden">
    <!-- hamburger button, only shown when sidebar closed -->
    {!sidebarOpen && <SidebarToggle onClick={() => setSidebarOpen(true)} />}
    {children}
  </main>
</div>
```

`ChatSidebar` receives `open` + `onClose` props. Width animates via Tailwind transition:
- Open: `w-60`
- Closed: `w-0 overflow-hidden`

Close button (← arrow) sits at the top of the sidebar, calls `onClose`.
Hamburger button (☰) floats top-left of `<main>` when sidebar is closed.

#### 2. Lazy session creation — no thread until first response

Current: `createSession(chatId)` is called on every mount, even for empty chats.

Revised flow in `ChatWindow`:
- On mount: call `getSession(chatId)` → if null, leave `session` as `null` (do NOT call `createSession`)
- `createSession` + `setLastChatId` are called lazily inside `persistMessages`, the first time a response arrives
- Sidebar does not list the chat until the session is persisted

To keep the sidebar in sync without a context, use a custom browser event:
- `ChatWindow` dispatches `new CustomEvent('chat-session-updated')` after every `saveSession`
- `ChatSidebar` listens to this event via `window.addEventListener` and re-runs `listSessions()`

### Files modified (3)

| File | Change |
|------|--------|
| `app/chat/layout.tsx` | Client component, `sidebarOpen` state, toggle button |
| `src/components/chat/ChatSidebar.tsx` | Accept `open`/`onClose` props, animated width, close button |
| `src/components/chat/ChatWindow.tsx` | Lazy session creation, dispatch `chat-session-updated` event |
