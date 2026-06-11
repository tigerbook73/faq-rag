# Requirements: page-loading-optimize

## 目标

消除已登录用户在慢网络下的首屏等待感。聚焦可观测的性能瓶颈，不做过度工程化。Admin 路由不在本次范围内。

---

## 背景：现状分析

### 1. getUser() 调用次数与缓存机制

Supabase 提供两种获取会话的方式：

| 方法           | 行为                                           | 延迟                    |
| -------------- | ---------------------------------------------- | ----------------------- |
| `getUser()`    | 向 Supabase Auth 服务器发起 HTTPS 请求验证 JWT | 50–300 ms（取决于网络） |
| `getSession()` | 读取本地 cookie，不验证                        | ~0 ms                   |

**`helpers.ts` 里的 `React.cache()`**：仅在同一次 React Server Component 渲染树内去重，跨请求无效，API Route Handler 完全不受益。

**当前每次页面请求发生的 `getUser()` 调用**：

```
HTTP 请求进入
  ① proxy.ts (middleware)         → supabase.auth.getUser()  ← 网络调用，必须等完才放行
  ② layout.tsx                    → supabase.auth.getUser()  ← 网络调用，阻塞 HTML 输出
  ③ page.tsx (根路由 / 重定向)    → supabase.auth.getUser()  ← 网络调用（仅访问 / 时）

浏览器收到 HTML 后：
  ④ auth-context.tsx 挂载        → GET /api/auth/me         ← 获取 role，客户端额外往返
  ⑤ ChatSidebar 挂载             → GET /api/sessions        ← SWR 获取会话列表
  ⑥ ChatWindow (chat/[id]) 挂载  → GET /api/sessions/[id]   ← 纯 fetch，无 SWR 缓存
```

每个 API Route Handler（`/api/sessions`、`/api/chat` 等）内的 `withUser()` 也会各自调用一次 `getUser()`，这些是不可避免的，但它们与页面渲染串行。

---

### 2. proxy.ts 中的 getUser() 能否优化？

**结论：proxy.ts 的 `getUser()` 不能被消除，但可以减少其影响。**

原因：

- Supabase SSR 要求 middleware 调用 `getUser()` 来触发 token 刷新（`setAll` cookie 回调是副作用）
- 用 `getSession()` 替代在安全上不可接受：token 可能已被撤销但 middleware 无感知
- Suspense 无法用于 middleware：middleware 运行在 Edge/Node.js 层，HTTP 响应开始之前，React 渲染根本没启动

**可行方案**：middleware 验完之后，把结果写进 request header 传给后续 Server Component，避免二次调用：

```
proxy.ts:  getUser() → 写 x-auth-id / x-auth-email header
layout.tsx: 读 header → 不再调用 getUser()
page.tsx:   读 header → 不再调用 getUser()
```

这样整个请求生命周期只有 1 次 getUser() 网络调用（在 middleware）。

---

### 3. 会话列表加载慢

**原因**：

1. 会话列表通过 SWR 客户端拉取，时序如下：

   ```
   HTML 到达 → 水合（hydration）完成 → ChatSidebar 挂载 → SWR 发起请求 → 数据返回
   ```

   在水合完成前，侧边栏只显示骨架屏。

2. 进入 `/chat/[id]` 时，`ChatWindow` 用裸 `fetch` 拉取当前会话——无 SWR 缓存，每次路由跳转都重新请求。

**可行方案**：

- Server Component 预取会话列表，通过 SWR 的 `fallback` 注水，水合后立即可见
- `ChatWindow` 的 `fetchSession()` 改用带 SWR key 的 hook，切换会话时命中缓存

---

### 4. auth-context 的额外 /api/auth/me 请求

`layout.tsx` 的 `initialAuthState` 当前 `role: null`，导致客户端挂载后必须再调一次 `/api/auth/me` 才能拿到 role。

如果在方案 2（header 传递）的基础上，同时在 middleware 里读取 Prisma 的 role（或在 layout.tsx 里读 DB），则可以把 role 一并写入 `initialAuthState`，消除这次客户端往返。

> 注意：middleware 里读 DB 会增加每次请求的 DB 延迟，需权衡。备选：仅在 layout.tsx 里做一次 DB 查询（比 getUser() 快，因为是内网 Prisma 调用）。

---

### 5. 根路由 page.tsx 重定向

`src/app/page.tsx` 有独立的 `getUser()` 用于判断重定向目标。middleware 已经知道用户是否登录，这个判断可以移入 middleware，彻底删除 `page.tsx` 的第三次 `getUser()`。

---

## 需求范围（本次 feature）

### P0 — 必做

| #   | 需求                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------- |
| R1  | middleware 验证后将 `userId` 和 `email` 写入 request header，供 layout 和 page.tsx 读取，消除重复 `getUser()` |
| R2  | `layout.tsx` 改为读 header，加 `<Suspense>` 流式输出 HTML shell，用户在慢网络下能立即看到骨架屏               |
| R3  | `page.tsx` 根路由重定向逻辑移入 middleware，删除 `page.tsx` 的 `getUser()`                                    |

### P1 — 重要

| #   | 需求                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------ |
| R4  | `layout.tsx` 的 `initialAuthState` 包含 role（通过内网 Prisma 查询），消除 auth-context 的 `/api/auth/me` 额外往返 |
| R5  | 会话列表在 Server Component 预取，通过 SWR `fallback` 注水，水合后立即可见，无闪烁                                 |

### P2 — 可选

| #   | 需求                                                                             |
| --- | -------------------------------------------------------------------------------- |
| R6  | `ChatWindow` 的 `fetchSession()` 改用 SWR 缓存，切换会话时命中缓存，无需重新请求 |

---

## 约束与边界

- Header 伪造风险：`x-auth-id` 等 header 可被客户端覆盖，仅用于渲染初始 UI 状态；所有权限校验仍依赖 API handler 内的 `requireUser()`，安全不受影响
- 不修改 API handler 内部的 `getUser()` 调用（每次 API 请求需独立验证，不共享 server-side 状态）
- 不引入分布式缓存（Redis 等）——超出本次范围
- 不改动 Admin 相关路由

---

## 验收标准

| 场景                        | 改前                                   | 改后                              |
| --------------------------- | -------------------------------------- | --------------------------------- |
| 首次访问（已登录），慢网络  | 白屏等待约 2× RTT                      | 骨架屏立即出现，1× RTT 后完整渲染 |
| `getUser()` 调用次数/请求   | 3 次（middleware + layout + page.tsx） | 1 次（middleware）                |
| 客户端额外往返（role 获取） | 1 次 `/api/auth/me`                    | 0 次（R4 完成后）                 |
| 进入 /chat/[id]，已有缓存   | 重新 fetch                             | 命中 SWR 缓存（R6 完成后）        |
