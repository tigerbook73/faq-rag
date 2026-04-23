# Plan: Replace Custom Sidebar with shadcn Sidebar

## What's installed (done)

`npx shadcn@latest add sidebar` added:
- `components/ui/sidebar.tsx`
- `components/ui/tooltip.tsx`
- `components/ui/sheet.tsx`
- `hooks/use-mobile.ts`

## Approach

Use `collapsible="icon"` mode — the sidebar collapses to a 3rem icon strip
automatically, matching the current thumb bar behaviour.

State is managed by `SidebarProvider` (cookie-persisted). No manual
`useState(sidebarOpen)` needed in the layout.

## Collapsed vs expanded mapping

```
Collapsed icon strip (3rem):           Expanded (16rem):
┌────┐                                 ┌──────────────────┐
│ ☰  │  SidebarTrigger                 │ FAQ-RAG        ☰ │  SidebarHeader
│ ✎  │  New Chat (SquarePen tooltip)   ├──────────────────┤
└────┘                                 │ ✎ New Chat       │  first menu item
                                       │ session title    │  sessions (hidden
                                       │ ...              │  in icon mode)
                                       ├──────────────────┤
                                       │ ↩ Back to last   │  SidebarFooter
                                       └──────────────────┘
```

Sessions are hidden in icon mode via `group-data-[collapsible=icon]:hidden`
on the session `SidebarGroup` — you can't meaningfully distinguish sessions
from identical icons anyway.

## Files changed (3)

### 1. `app/chat/layout.tsx`

- Add `TooltipProvider` (required by shadcn sidebar for icon-mode tooltips)
- Replace `SidebarProvider` state logic: remove `useState(sidebarOpen)`,
  wrap with `<SidebarProvider defaultOpen={false}>`
- Replace `<main>` with `<SidebarInset className="overflow-hidden">`
- Remove `open / onClose / onOpen` props from `<ChatSidebar>`
- Keep `pruneOldSessions()` in `useEffect`

### 2. `src/components/chat/ChatSidebar.tsx`

Full rewrite. No props needed — state via `SidebarProvider` context.

Structure:
```tsx
<Sidebar collapsible="icon">
  <SidebarHeader>
    <div className="flex items-center justify-between">
      <span className="group-data-[collapsible=icon]:hidden text-sm font-semibold">
        FAQ-RAG
      </span>
      <SidebarTrigger />
    </div>
  </SidebarHeader>

  <SidebarContent>
    {/* New Chat — visible in both modes */}
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="New Chat" onClick={handleNew}>
              <SquarePen />
              <span>New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>

    {/* Sessions — hidden in icon mode */}
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupContent>
        <SidebarMenu>
          {sessions.map(s => (
            <SidebarMenuItem key={s.id}>
              <SidebarMenuButton isActive={active} onClick={...}>
                <div>
                  <p className="truncate">{s.title}</p>
                  <p className="text-xs">{relativeDate(s.updatedAt)}</p>
                </div>
                <button onClick={handleDelete}>✕</button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  </SidebarContent>

  <SidebarFooter className="group-data-[collapsible=icon]:hidden">
    {showBackToLast && <button>↩ Back to last chat</button>}
  </SidebarFooter>
</Sidebar>
```

### 3. `app/layout.tsx` — no change needed

`TooltipProvider` goes into `app/chat/layout.tsx` (scoped to where sidebar lives).

## Scope

- shadcn Sidebar already installed ✅
- 2 existing files modified (`layout.tsx`, `ChatSidebar.tsx`)
- No storage, routing, or API changes
