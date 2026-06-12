# Design: page-loading-optimize

## Overview

将每次页面请求的 `getUser()` 网络调用从 3 次降至 1 次，并通过 Server Component 预取会话列表消除客户端首次加载白屏。四个串行步骤，均为 `final` 类型。

---

## Step 1: Middleware 注入 auth header + 根路由重定向 (R1, R3)

**Step Type**: `final`

### 目标

- `proxy.ts` 验证用户后将 `x-auth-id`/`x-auth-email` 写入 request header 传给 Server Component
- 根路由 `/` 的重定向逻辑移入 middleware，删除 `src/app/page.tsx`
- `layout.tsx` 改为读 header，消除第二次 `getUser()` 调用

### 关键设计

**Header 注入（安全）**：middleware 无条件剥离客户端传入的 `x-auth-id`/`x-auth-email`（防伪造），仅在用户通过 `getUser()` 验证后由 middleware 自行注入。

```
proxy.ts 逻辑顺序：
1. 从 req.headers 构建 reqHeaders，删除 x-auth-id / x-auth-email
2. 调用 supabase.auth.getUser()（保留 setAll 副作用以刷新 token）
3. 特殊处理 pathname === "/"：已登录 → redirect /chat/last，未登录 → redirect /about
4. 其余 isSignIn / bypass / 未登录 逻辑不变
5. 通过验证的 pass-through 请求：将 user.id / user.email 写入 reqHeaders，
   重建 cookie 串（req.cookies.getAll()），生成最终 NextResponse.next({ request: { headers: reqHeaders } })
   并应用 setAll 收集的 cookiesToApply
```

**Cookie 处理**：在 `setAll` 回调中只收集 `cookiesToApply`，不再即时 rebuild response。在函数末尾统一 apply，确保刷新的 token 写入响应 cookie。

**layout.tsx 变更**：

- 删除 `getInitialAuthState()`（不再调用 `getUser()`）
- 改用 `headers()` 读取 `x-auth-id`（有值 = 已登录）和 `x-auth-email`
- `role` 仍为 `null`（R4 在 Step 2 补充），`id` 仍为 `null`

**page.tsx 删除**：`/` 的路由重定向完全由 proxy.ts 处理，`page.tsx` 可安全删除。

### 变更文件

| 文件                 | 操作                                                    |
| -------------------- | ------------------------------------------------------- |
| `src/proxy.ts`       | 修改：header 剥离 + 注入；根路由重定向；cookie 处理重构 |
| `src/app/layout.tsx` | 修改：读 header 替代 `getUser()`                        |
| `src/app/page.tsx`   | 删除                                                    |

### Auto Verification

- `(auto)` `pnpm tsc --noEmit`
- `(auto)` `pnpm jest --testPathPattern="route-policy"`

### Manual Verification

- `(manual)` 浏览器访问 `/`（已登录），确认跳转到 `/chat/last`
- `(manual)` 浏览器访问 `/`（未登录），确认跳转到 `/about`
- `(manual)` 正常登录/登出流程无回归

---

## Step 2: layout Suspense + Prisma role 预取 + auth-context 优化 (R2, R4)

**Step Type**: `final`

### 目标

- `layout.tsx` 做一次 Prisma `userProfile.findUnique`（~5–20 ms）获取 role，填入 `initialAuthState`
- `auth-context.tsx` 当 `initialAuthState.role` 已有值时，跳过首次 `onAuthStateChange` 触发的 `/api/auth/me` 请求
- `layout.tsx` 用 `<Suspense>` 包裹 children，允许 HTML shell 在 children 完成前先发送

### 关键设计

**layout.tsx 角色获取**：

```ts
// getInitialAuthState() 伪代码
const userId = headersList.get("x-auth-id");
if (!userId) return ANONYMOUS_AUTH_STATE;

const profile = await prisma.userProfile.findUnique({
  where: { id: userId },
  select: { role: true },
});
return {
  isAuthenticated: true,
  role: profile?.role ?? null,
  email: headersList.get("x-auth-email") ?? null,
  id: userId,
};
```

**auth-context.tsx 优化**：

添加 `skipFirstRoleFetch` ref：

- 初始值 = `initialAuthState.role !== null`
- 首次 `onAuthStateChange` 触发时若为 `true`：跳过 `fetchRole`，直接 `setIsAuthLoading(false)` 并置 ref 为 `false`
- 后续（sign-in/sign-out）正常走 `fetchRole`

这样已登录页面完全无 `/api/auth/me` 往返；登录/登出事件后的 role 刷新不受影响。

**Suspense**：

```tsx
// layout.tsx
<Providers initialAuthState={initialAuthState}>
  <Suspense>{children}</Suspense>
</Providers>
```

Suspense 无需 fallback（`AppLayout` 本身含骨架逻辑），主要作用是让 HTML shell 先流式发送，page-level 的异步 SC 后续 flush。

### 变更文件

| 文件                           | 操作                                                          |
| ------------------------------ | ------------------------------------------------------------- |
| `src/app/layout.tsx`           | 修改：Prisma role 查询；`id` 填入；`<Suspense>` 包裹 children |
| `src/context/auth-context.tsx` | 修改：添加 `skipFirstRoleFetch` ref，跳过首次 `/api/auth/me`  |

### Auto Verification

- `(auto)` `pnpm tsc --noEmit`
- `(auto)` `pnpm jest --testPathPattern="auth/helpers"`

### Manual Verification

- `(manual)` 打开 Network 面板，刷新已登录页面，确认无 `/api/auth/me` 请求
- `(manual)` 登出后重新登录，确认 `/api/auth/me` 仍正常触发（role 刷新）
- `(manual) [automation-candidate]` 慢网络模拟（DevTools 3G），刷新时骨架屏先于内容显示

---

## Step 3: Chat layout 会话列表 Server-side 预取 (R5)

**Step Type**: `final`

### 目标

- `src/app/chat/layout.tsx` 升级为 async Server Component，从 DB 预取会话列表
- 通过 SWR `fallback` 注水，`useChatSessions` 水合后立即可见，无 loading 闪烁

### 关键设计

**chat/layout.tsx**：

```ts
// 从 middleware 注入的 x-auth-id 读取 userId（无需再次 getUser()）
const userId = (await headers()).get("x-auth-id");
const sessions = userId ? await listSessionsForUser(userId) : [];

return (
  <SWRBootstrap fallbackSessions={sessions}>
    {children}
  </SWRBootstrap>
);
```

**SWRBootstrap 客户端组件**（新建 `src/components/chat/SWRBootstrap.tsx`）：

```tsx
"use client";
import { SWRConfig } from "swr";

const SESSIONS_KEY = "/api/sessions";

export function SWRBootstrap({ fallbackSessions, children }) {
  return <SWRConfig value={{ fallback: { [SESSIONS_KEY]: fallbackSessions } }}>{children}</SWRConfig>;
}
```

**数据格式**：`listSessionsForUser` 返回 `{ id, title, updatedAt, createdAt }[]`，与 `fetcher` 返回的原始 JSON 格式一致（日期为 Date 对象，序列化后为 ISO 字符串），直接传给 SWR fallback 即可。SWR `fallback` 不影响后续的 `mutate()` 更新。

**安全说明**：`x-auth-id` header 由 proxy.ts 在 middleware 层强制覆写，客户端无法伪造（见 Step 1）。Server Component 中读取此 header 用于 DB 查询是安全的。

### 变更文件

| 文件                                   | 操作                                                              |
| -------------------------------------- | ----------------------------------------------------------------- |
| `src/app/chat/layout.tsx`              | 修改：升级为 async SC；读 header；预取会话；返回 `<SWRBootstrap>` |
| `src/components/chat/SWRBootstrap.tsx` | 新建：SWRConfig fallback 包装                                     |

### Auto Verification

- `(auto)` `pnpm tsc --noEmit`

### Manual Verification

- `(manual)` Network 面板，首次进入 `/chat/*`，侧边栏无 loading 骨架（会话立即可见）
- `(manual)` 导航到 `/chat/new` 再回到已有会话，侧边栏无闪烁

---

## Step 4: ChatWindow SWR 缓存 (R6)

**Step Type**: `final`

### 目标

- `ChatWindow` 的 `fetchSession()` 改用 SWR，切换会话时命中缓存，无需重新请求

### 关键设计

**替换 useEffect + fetchSession**：

```ts
// 使用 SWR key: `/api/sessions/${chatId}`
const { data: sessionData, isLoading: isSessionLoading } = useSWR<ChatSession | null>(
  chatId ? `/api/sessions/${chatId}` : null,
  (url) => fetchSession(url.replace("/api/sessions/", "")),
  {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false, // 有缓存时不重新请求
  },
);
```

`revalidateIfStale: false` 保证：

- 首次访问：正常 fetch
- 再次访问（已缓存）：立即返回缓存，不发起请求
- 流式更新中：SWR 不会触发后台重新请求覆盖本地状态

**本地状态同步**：

```ts
// 替换原 useEffect([chatId]) 中的 fetchSession 调用
// 当 SWR 数据就绪时同步到本地 session/messages 状态
useEffect(() => {
  if (isSessionLoading) return;
  if (sessionData === null) {
    router.replace("/chat/new");
    return;
  }
  if (!sessionData) return;
  setSession(sessionData);
  setMessages(sessionData.messages);
  if (chatId) lastChat.set(chatId);
}, [chatId, sessionData, isSessionLoading]); // eslint-disable-line react-hooks/exhaustive-deps
```

流式更新（`useStreamingChat`）通过 `setMessages`/`setSession` 更新本地状态，SWR 不会自动覆盖（无后台 revalidation）。

### 变更文件

| 文件                                 | 操作                                    |
| ------------------------------------ | --------------------------------------- |
| `src/components/chat/ChatWindow.tsx` | 修改：useEffect + fetchSession → useSWR |

### Auto Verification

- `(auto)` `pnpm tsc --noEmit`

### Manual Verification

- `(manual)` 打开两个不同的 chat 来回切换，Network 面板确认第二次切回已有缓存的 chat 无 `/api/sessions/[id]` 请求
- `(manual)` 发送消息，流式回复正常，不被 SWR 覆盖

---

## Dev-Task Acceptance

### R1 — middleware 只调用一次 getUser()

- `(manual)` 在 layout.tsx 打断点或添加 log，刷新页面，服务端只触发一次 `getUser()` 调用

### R2 — 慢网络下骨架屏先于内容

- `(manual) [automation-candidate]` DevTools → Network → Slow 3G，刷新已登录页面，骨架屏（侧边栏轮廓 + 顶栏）在内容前出现

### R3 — 根路由重定向正确

- `(auto)` `pnpm jest --testPathPattern="route-policy"`
- `(manual)` 已登录访问 `/` → 跳转 `/chat/last`；未登录访问 `/` → 跳转 `/about`

### R4 — 无 /api/auth/me 额外请求

- `(manual)` 刷新已登录页面，DevTools Network 无 `/api/auth/me` 请求

### R5 — 会话列表水合后立即可见

- `(manual)` DevTools Performance，首次进入 `/chat/*`，侧边栏无 loading 状态

### R6 — 切换会话命中缓存

- `(manual)` 访问 chat A → chat B → chat A，Network 面板第二次访问 chat A 无 `/api/sessions/[id]` 请求

### 全量回归

- `(auto)` `pnpm tsc --noEmit`
- `(auto)` `pnpm jest`
