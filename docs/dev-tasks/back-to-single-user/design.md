# 设计文档：back-to-single-user

## 总体策略

分四个独立阶段推进，每阶段结束后应用可运行：

1. 删除 Admin 与公开文档功能（最独立，风险最低）
2. 移除 Auth 层（proxy、API wrapper、UI）
3. 简化数据库 Schema（迁移 + 数据层同步）
4. 收尾清理

---

## 阶段一：删除 Admin 与公开文档

### 删除文件

**页面**

- `src/app/admin/` 整个目录

**API 路由**

- `src/app/api/admin/` 整个目录
- `src/app/api/public-documents/` 整个目录

**数据 / 服务层**

- `src/lib/server/data/public-documents.ts`（及 `.test.ts`）
- `src/lib/server/data/users.ts`
- `src/lib/server/services/create-user.ts`
- `src/lib/server/services/delete-user.ts`（及 `.test.ts`）
- `src/lib/server/services/update-user-password.ts`

**客户端**

- `src/lib/client/admin-api.ts`

### 修改文件

- `src/components/layout/TopBar.tsx`：移除 Admin 导航入口
- `src/lib/server/route-policy.ts`：移除 admin 路由分类、`isAdminRoute`、`ADMIN_ACCESS_DENIED_PATH` 等

---

## 阶段二：移除 Auth 层

### 删除文件

**页面**

- `src/app/auth/` 整个目录

**API 路由**

- `src/app/api/auth/` 整个目录

**认证库**

- `src/lib/server/auth/` 整个目录（`api.ts`、`errors.ts`、`get-current-user.ts`、`helpers.ts`、`.test.ts`、`require-admin.ts`、`require-user.ts`）
- `src/lib/server/supabase/browser.ts`（仅用于 Auth）
- `src/lib/server/default-users.ts`

**客户端**

- `src/context/auth-context.tsx`

### 修改文件

**`src/proxy.ts`**

- 移除 Supabase Auth 调用（`getUser`）
- 移除 auth header 注入（`x-auth-id`、`x-auth-email`）
- 保留：`/` → `/chat/last` 重定向；静态资源 bypass
- `/about` 直接 passthrough；其余路由直接 passthrough

**API 路由（移除 `withUser` wrapper）**

- `src/app/api/chat/route.ts`：不再调用 `requireUser`，直接处理请求
- `src/app/api/documents/route.ts` 及 `[id]` 子路由：同上
- `src/app/api/sessions/route.ts` 及 `[id]` 子路由：同上
- `src/app/api/ingest-hook/route.ts`：移除 auth 校验（保留 webhook secret 校验）

**`src/lib/server/supabase/server.ts`**

- 移除 SSR cookie-based client（`createServerClient`）
- 保留 service-role client（Storage 操作需要）

**`src/app/layout.tsx`**

- 移除读取 `x-auth-id` header 和角色查询逻辑
- 不再向 `<Providers>` 传 `initialAuthState`

**`src/app/providers.tsx`**

- 移除 `isAuthenticated` / auth 相关状态判断
- `AppLayout` 不再因未认证而隐藏 sidebar

**`src/components/layout/TopBar.tsx`**

- 移除退出登录按钮、用户邮箱显示

---

## 阶段三：简化数据库 Schema

### Prisma Schema 变更

**删除 model**

- `UserProfile`
- `PublicDocumentSelection`
- `UserRole` enum
- `DocumentVisibility` enum

**修改 `Document`**

- 删除字段：`ownerUserId`、`visibility`、`owner` 关联、`selections` 关联
- 删除索引：`@@unique([ownerUserId, contentHash])` → 改为 `@@unique([contentHash])`
- 删除索引：`@@index([ownerUserId, createdAt])`、`@@index([visibility, status])`

**修改 `Session`**

- 删除字段：`userId`、`user` 关联
- 删除索引：`@@index([userId, updatedAt])`，改为 `@@index([updatedAt])`

### 数据库迁移

生成并应用一条 migration：

- `DROP TABLE public_document_selections`
- `DROP TABLE user_profiles`
- `ALTER TABLE documents DROP COLUMN owner_user_id, DROP COLUMN visibility`
- `ALTER TABLE sessions DROP COLUMN user_id`
- 相应 index 变更

### 数据层修改

**`src/lib/server/data/documents.ts`**

- 所有函数移除 `userId` 参数，去掉 `ownerUserId` 过滤

**`src/lib/server/data/sessions.ts`**

- 所有函数移除 `userId` 参数，去掉 `userId` 过滤
- `upsertSessionForUser` 重命名为 `upsertSession`，其余类似

**`src/lib/server/retrieval/vector-search.ts`**

- 移除 `userId` 参数
- SQL 查询去掉 ownership 过滤，仅保留 `d.status = 'indexed'`

**`src/lib/server/retrieval/query.ts`**

- `retrieveContext(query, userId)` → `retrieveContext(query)`

**`src/app/api/chat/route.ts`**

- 调用 `retrieveContext` 时不传 `userId`

---

## 阶段四：收尾清理

- `src/lib/server/route-policy.ts`：如仍有残留 auth 引用则清理，或整体删除
- `.env.example`：移除 `SUPABASE_ANON_KEY`（仅 Auth 使用）；`SUPABASE_SERVICE_ROLE_KEY` 保留（Storage）
- `src/lib/client/` 中 `session-api.ts`、`documents-api.ts`：移除 userId 相关参数（如有）
- 运行测试，修复因接口签名变更导致的失败
- 删除 `src/app/chat/last/page.tsx` 中读取 `isAuthenticated` 的逻辑（如有）

---

## 文件删除汇总

| 路径                                              | 原因            |
| ------------------------------------------------- | --------------- |
| `src/app/admin/`                                  | Admin 页面      |
| `src/app/auth/`                                   | 登录 / 退出页面 |
| `src/app/api/admin/`                              | Admin API       |
| `src/app/api/auth/`                               | Auth API        |
| `src/app/api/public-documents/`                   | 公开文档 API    |
| `src/lib/server/auth/`                            | 认证库          |
| `src/lib/server/data/public-documents.ts`         | 公开文档数据层  |
| `src/lib/server/data/users.ts`                    | 用户数据层      |
| `src/lib/server/services/create-user.ts`          | 用户服务        |
| `src/lib/server/services/delete-user.ts`          | 用户服务        |
| `src/lib/server/services/update-user-password.ts` | 用户服务        |
| `src/lib/server/supabase/browser.ts`              | Auth 专用       |
| `src/lib/server/default-users.ts`                 | 初始用户配置    |
| `src/lib/client/admin-api.ts`                     | Admin 客户端    |
| `src/context/auth-context.tsx`                    | Auth 状态       |
