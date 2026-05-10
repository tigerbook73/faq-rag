# 重构计划：消除代码库中的重复模式

## Context

随着功能迭代，代码库中积累了几类重复模式：

- API 路由里每个 handler 都有相同的 `try/catch` + `requireUser()` + `404` 模板代码（~15 个路由文件）
- 客户端组件各自重复定义相同的 SWR `fetcher` 函数（5 处）
- 客户端异步操作（删除、重索引、改密码等）都有相同的 loading/toast/catch/finally 样板（3 个组件）

目标：通过提取共享工具降低维护成本，不改变任何对外行为。

---

## Phase 1 — Quick Wins（低风险，独立可执行）

### 1A：提取共享 SWR fetcher

**新建文件** `src/lib/swr.ts`：

```typescript
export const fetcher = (url: string) => fetch(url).then((r) => r.json());
```

**更新以下 5 个文件**，删除本地 `fetcher` 定义，改为 `import { fetcher } from "@/lib/swr"`：

- `src/components/admin/AdminUsersWorkspace.tsx`（行 30）
- `src/components/admin/AdminDocumentsWorkspace.tsx`
- `src/components/knowledge/DocumentTable/useDocumentManagement.ts`（行 11）
- `src/components/knowledge/PublicDocumentTable.tsx`
- `src/components/chat/ChatSidebar/useChatSessions.ts`（行 11–14，该版本有 `.then(data => data as ChatSession[])` 类型断言，需保留泛型传给 `useSWR`，fetcher 本身可统一）

### 1B：提取 `notFoundResponse` 辅助函数

**更新** `src/lib/auth/api.ts`，新增：

```typescript
export function notFoundResponse(resource = "Resource") {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}
```

**更新** 所有包含 `NextResponse.json({ error: "Not found" }, { status: 404 })` 的文件（约 8 处），替换为 `notFoundResponse()`：

- `src/app/api/documents/[id]/route.ts`（2 处）
- `src/app/api/sessions/[id]/route.ts`（2 处）
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/api/admin/documents/[id]/route.ts`
- `src/app/api/documents/[id]/reindex/route.ts`
- `src/app/api/admin/users/[id]/password/route.ts`

**验证**：`pnpm lint` 通过；浏览器测试 404 响应格式不变。

---

## Phase 2 — API 路由 HOF 包装器（中等工作量，影响最广）

当前每个 route handler 都是：

```typescript
export async function GET(req, ctx) {
  try {
    const actor = await requireUser();
    // ...业务逻辑...
  } catch (error) {
    return authErrorResponse(error);
  }
}
```

**更新** `src/lib/auth/api.ts`，新增两个 HOF：

```typescript
import type { NextRequest } from "next/server";

type RouteCtx<P = Record<string, string>> = { params: Promise<P> };
type UserHandler<P> = (actor: UserProfile, req: NextRequest, ctx: RouteCtx<P>) => Promise<Response>;
type AdminHandler<P> = (actor: AdminProfile, req: NextRequest, ctx: RouteCtx<P>) => Promise<Response>;

export function withUser<P = Record<string, string>>(handler: UserHandler<P>) {
  return async (req: NextRequest, ctx: RouteCtx<P>) => {
    try {
      const actor = await requireUser();
      return await handler(actor, req, ctx);
    } catch (error) {
      return authErrorResponse(error);
    }
  };
}

export function withAdmin<P = Record<string, string>>(handler: AdminHandler<P>) {
  return async (req: NextRequest, ctx: RouteCtx<P>) => {
    try {
      const actor = await requireAdmin();
      return await handler(actor, req, ctx);
    } catch (error) {
      return authErrorResponse(error);
    }
  };
}
```

**重构目标路由文件**（约 13 个，不含 `ingest-hook`、`health`、`auth/me` 等独立端点）：

| 文件                                           | 当前 auth    | 迁移到    |
| ---------------------------------------------- | ------------ | --------- |
| `api/documents/route.ts`                       | requireUser  | withUser  |
| `api/documents/[id]/route.ts`                  | requireUser  | withUser  |
| `api/documents/[id]/index/route.ts`            | requireUser  | withUser  |
| `api/documents/[id]/reindex/route.ts`          | requireUser  | withUser  |
| `api/documents/prepare/route.ts`               | requireUser  | withUser  |
| `api/sessions/route.ts`                        | requireUser  | withUser  |
| `api/sessions/[id]/route.ts`                   | requireUser  | withUser  |
| `api/public-documents/route.ts`                | requireUser  | withUser  |
| `api/public-documents/[id]/selection/route.ts` | requireUser  | withUser  |
| `api/admin/documents/route.ts`                 | requireAdmin | withAdmin |
| `api/admin/documents/[id]/route.ts`            | requireAdmin | withAdmin |
| `api/admin/users/route.ts`                     | requireAdmin | withAdmin |
| `api/admin/users/[id]/route.ts`                | requireAdmin | withAdmin |
| `api/admin/users/[id]/password/route.ts`       | requireAdmin | withAdmin |

迁移后示例（`sessions/[id]/route.ts`）：

```typescript
type P = { id: string };

export const GET = withUser<P>(async (actor, _req, { params }) => {
  const { id } = await params;
  const session = await getSessionForUser(actor.id, id);
  if (!session) return notFoundResponse("Session");
  return NextResponse.json(session);
});

export const PATCH = withUser<P>(async (actor, req, { params }) => {
  const { id } = await params;
  const parsed = UpdateSessionInputSchema.safeParse(await req.json());
  if (!parsed.success) return validationErrorResponse(parsed.error);
  const session = await upsertSessionForUser(actor.id, id, parsed.data);
  if (!session) return notFoundResponse("Session");
  return NextResponse.json(session);
});
```

**注意**：

- `api/auth/me/route.ts` 使用 `getSession()` 而非 `requireUser()`，不迁移
- `api/chat/route.ts` 逻辑复杂，单独评估是否值得迁移

**验证**：`pnpm lint && pnpm test`；Playwright E2E 测试通过；对每类操作（GET/POST/PATCH/DELETE）手动测试一次。

---

## Phase 3 — `useAsyncAction` Hook（消除客户端操作样板）

**当前重复模式**（出现在 AdminUsersWorkspace、AdminDocumentsWorkspace、useDocumentManagement）：

```typescript
setState(loading);
try {
  const res = await fetch(...);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
  await mutate();
  toast.success("...");
} catch (error) {
  toast.error(error instanceof Error ? error.message : "Failed");
} finally {
  setState(null);
}
```

**新建文件** `src/hooks/useAsyncAction.ts`：

```typescript
import { useState, useCallback } from "react";
import { toast } from "sonner";

interface Options {
  onSuccess?: () => void | Promise<void>;
  successMessage?: string;
  errorMessage?: string;
}

export function useAsyncAction<TId = string>(options: Options = {}) {
  const [pendingId, setPendingId] = useState<TId | null>(null);

  const run = useCallback(
    async (id: TId, action: () => Promise<Response | void>) => {
      setPendingId(id);
      try {
        const res = await action();
        if (res && !res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }
        if (options.successMessage) toast.success(options.successMessage);
        await options.onSuccess?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : (options.errorMessage ?? "Operation failed"));
      } finally {
        setPendingId(null);
      }
    },
    [options],
  );

  return { pendingId, run };
}
```

**更新以下文件**，用 `useAsyncAction` 替换手写的 try/catch/finally 块：

- `src/components/admin/AdminUsersWorkspace.tsx` — `handleDeleteUser`、`handleChangePassword`、`handleChangeRole`
- `src/components/admin/AdminDocumentsWorkspace.tsx` — `handleDelete`
- `src/components/knowledge/DocumentTable/useDocumentManagement.ts` — `handleDelete`、`handleReindex`、`handleVisibilityChange`

**验证**：`pnpm lint && pnpm test`；手动测试删除/重索引/改角色操作，toast 行为不变。

---

## 执行顺序建议

```
Phase 1A (fetcher)  →  Phase 1B (notFoundResponse)  →  Phase 2 (HOF)  →  Phase 3 (useAsyncAction)
    5 files               8 files                        13 files             6 files
```

每个 Phase 独立提交，逐步合并。Phase 2 影响最广，建议在 PR 中做充分的代码审查。

## 验证清单

- [ ] `pnpm lint` 无报错
- [ ] `pnpm test` 通过
- [ ] 手动测试：登录/登出、文档上传/删除/重索引、对话创建/删除、管理员用户管理
- [ ] 确认 401/403/404 响应格式与重构前一致
