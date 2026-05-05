## 2. Multi-user Design

### 2.1 目录

- [2. Multi-user Design](#2-multi-user-design)
  - [2.1 目录](#21-目录)
  - [2.2 对应需求](#22-对应需求)
  - [2.3 当前系统现状](#23-当前系统现状)
  - [2.4 设计原则](#24-设计原则)
  - [2.5 数据模型设计](#25-数据模型设计)
    - [2.5.1 新增用户资料](#251-新增用户资料)
    - [2.5.2 修改聊天模型](#252-修改聊天模型)
    - [2.5.3 修改文档模型](#253-修改文档模型)
    - [2.5.4 新增公开文档选择关系](#254-新增公开文档选择关系)
  - [2.6 认证和授权设计](#26-认证和授权设计)
  - [2.7 API 设计](#27-api-设计)
    - [2.7.1 会话 API](#271-会话-api)
    - [2.7.2 文档 API](#272-文档-api)
    - [2.7.3 文档可见性 API](#273-文档可见性-api)
    - [2.7.4 公开文档选择 API](#274-公开文档选择-api)
    - [2.7.5 管理员 API](#275-管理员-api)
  - [2.8 检索设计](#28-检索设计)
  - [2.9 删除清理设计](#29-删除清理设计)
    - [2.9.1 删除文档](#291-删除文档)
    - [2.9.2 删除用户](#292-删除用户)
  - [2.10 默认账号初始化](#210-默认账号初始化)
  - [2.11 页面和组件设计](#211-页面和组件设计)
    - [2.11.1 登录页](#2111-登录页)
    - [2.11.2 Knowledge 页面](#2112-knowledge-页面)
    - [2.11.3 Admin 用户管理](#2113-admin-用户管理)
  - [2.12 迁移策略](#212-迁移策略)
  - [2.13 实施顺序](#213-实施顺序)
  - [2.14 测试策略](#214-测试策略)
    - [2.14.1 单元/接口测试](#2141-单元接口测试)
    - [2.14.2 E2E 验收](#2142-e2e-验收)
  - [2.15 风险和注意事项](#215-风险和注意事项)

### 2.2 对应需求

本设计对应 [FEATURE-multi-user.md](./FEATURE-multi-user.md)。

目标是在现有 Supabase Auth 登录能力基础上，为聊天、文档、公开文档选择、问答检索和管理员操作增加明确的用户边界。

### 2.3 当前系统现状

- Supabase Auth 已接入，`src/proxy.ts` 会拦截未登录用户。
- 登录页已使用 Supabase `signInWithPassword`。
- 业务数据库目前没有用户资料表，也没有角色字段。
- `Session` 和 `Document` 都没有用户归属字段，当前所有聊天和文档都是全局共享。
- 文档 `contentHash` 当前全局唯一，不满足“不同用户允许上传内容相同的文件”。
- 文档检索 SQL 只过滤 `documents.status = 'indexed'`，没有按当前用户权限限制检索范围。
- 文档上传、删除、重建索引、会话读写等 API 当前都没有业务级资源授权。

### 2.4 设计原则

- 以后端权限校验为准，前端只负责展示和交互。
- 所有聊天、文档、检索 API 都必须从当前登录用户推导权限范围。
- 普通用户的数据访问默认只限本人资源。
- 管理员能力只扩展到用户管理和全站文档管理，不扩展到查看他人聊天内容。
- 删除用户或文档时，数据库记录、索引、文件和公开文档选择关系必须一起清理。
- 需求文档保持产品规则，本文档记录实现设计和落地步骤。

### 2.5 数据模型设计

#### 2.5.1 新增用户资料

新增业务用户资料表，用来承接 Supabase Auth 用户和业务角色。

建议模型：

```prisma
enum UserRole {
  user
  admin
}

model UserProfile {
  id        String   @id
  email     String   @unique
  role      UserRole @default(user)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  documents Document[]
  sessions  Session[]
  publicDocumentSelections PublicDocumentSelection[]

  @@map("user_profiles")
}
```

说明：

- `id` 使用 Supabase Auth user id。
- 角色以业务表为准，不依赖前端状态。
- 默认账号由 seed 或初始化脚本创建 Supabase Auth 用户，并同步写入 `UserProfile`。

#### 2.5.2 修改聊天模型

`Session` 增加 `userId`，所有查询和写入都按当前用户过滤。

建议变更：

```prisma
model Session {
  id        String           @id @default(uuid())
  userId    String           @map("user_id")
  title     String           @default("New Chat")
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")
  user      UserProfile      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  SessionMessage[]

  @@index([userId, updatedAt])
  @@map("sessions")
}
```

`SessionMessage` 继续通过 `Session` 级联删除即可。

#### 2.5.3 修改文档模型

`Document` 增加上传者和可见性。

建议模型：

```prisma
enum DocumentVisibility {
  private
  public
}

model Document {
  id          String             @id @default(uuid())
  ownerUserId String             @map("owner_user_id")
  name        String
  mime        String
  contentHash String             @map("content_hash")
  visibility  DocumentVisibility @default(private)
  lang        String             @default("unknown")
  sizeBytes   Int                @map("size_bytes")
  status      String             @default("pending")
  errorMsg    String?            @map("error_msg")
  totalChunks Int?               @map("total_chunks")
  fileRef     String?            @map("file_path")
  createdAt   DateTime           @default(now()) @map("created_at")

  owner       UserProfile        @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  chunks      Chunk[]
  selections  PublicDocumentSelection[]

  @@unique([ownerUserId, contentHash])
  @@index([ownerUserId, createdAt])
  @@index([visibility, status])
  @@map("documents")
}
```

说明：

- 移除 `contentHash` 的全局唯一约束，改为 `(ownerUserId, contentHash)` 唯一。
- 同一用户重复上传同内容仍返回重复错误。
- 不同用户上传同内容允许创建各自的文档和索引。

#### 2.5.4 新增公开文档选择关系

```prisma
model PublicDocumentSelection {
  id         String      @id @default(uuid())
  userId     String      @map("user_id")
  documentId String      @map("document_id")
  createdAt  DateTime    @default(now()) @map("created_at")

  user       UserProfile @relation(fields: [userId], references: [id], onDelete: Cascade)
  document   Document    @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([userId, documentId])
  @@index([documentId])
  @@map("public_document_selections")
}
```

约束规则：

- 只能选择其他用户的 `public` 文档。
- 不能选择自己的文档，因为自己的文档天然参与自己的可用范围。
- 不能选择未索引完成、索引失败或已删除文档。

### 2.6 认证和授权设计

新增服务端 helper，集中处理当前用户和角色判断。

建议文件：

- `src/lib/auth/get-current-user.ts`
- `src/lib/auth/require-user.ts`
- `src/lib/auth/require-admin.ts`

职责：

- 从 Supabase server client 获取当前 auth user。
- 用 auth user id 查询 `UserProfile`。
- 未登录返回 401。
- 缺少业务用户资料返回 403 或执行受控补齐。
- 管理员接口通过 `requireAdmin()` 校验角色。

所有 API route 和 server page 不直接相信前端传入的 user id。

### 2.7 API 设计

#### 2.7.1 会话 API

现有接口：

- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/sessions/[id]`
- `PATCH /api/sessions/[id]`
- `DELETE /api/sessions/[id]`

设计变更：

- `GET /api/sessions` 只返回当前用户的 sessions。
- `POST /api/sessions` 创建时写入当前用户 `userId`。
- `GET /api/sessions/[id]` 必须同时过滤 `id` 和当前用户 `userId`。
- `PATCH /api/sessions/[id]` 只能更新当前用户 session。
- 当前 PATCH 的 upsert 逻辑需要改造，避免用户通过自定义 ID 覆盖或创建不属于自己的 session。
- `DELETE /api/sessions/[id]` 只能删除当前用户 session。
- 管理员也不能通过这些普通会话 API 访问其他用户聊天。

#### 2.7.2 文档 API

现有接口：

- `GET /api/documents`
- `POST /api/documents/prepare`
- `DELETE /api/documents/[id]`
- `POST /api/documents/[id]/index`
- `POST /api/documents/[id]/reindex`

设计变更：

- `GET /api/documents` 默认只返回当前用户自己的文档。
- 支持查询不同视图：
  - `scope=mine`：自己的文档。
  - `scope=public`：其他用户公开且可选择的文档。
  - `scope=admin`：管理员查看全站文档。
- `POST /api/documents/prepare` 创建文档时写入当前用户 `ownerUserId` 和 `visibility`。
- 上传前重复检查改为 `(ownerUserId, contentHash)`。
- `DELETE /api/documents/[id]` 允许文档 owner 删除自己的文档，管理员可以删除任意文档。
- `POST /api/documents/[id]/index` 只允许文档 owner 或管理员触发。
- `POST /api/documents/[id]/reindex` 只允许文档 owner 或管理员触发。
- 文档删除需要同时删除 storage 文件；数据库 chunks 和选择关系通过级联删除。

#### 2.7.3 文档可见性 API

新增接口：

- `PATCH /api/documents/[id]`

请求：

```json
{ "visibility": "private" }
```

规则：

- 只有文档 owner 可以修改自己文档的可见性。
- 管理员是否允许替用户修改可见性，需求未要求，设计上不开放。
- 文档从 `public` 改为 `private` 后，其他用户对该文档的选择关系应删除或失效。建议直接删除选择关系，保持后续检索简单。

#### 2.7.4 公开文档选择 API

新增接口：

- `GET /api/public-documents`
- `POST /api/public-documents/[id]/selection`
- `DELETE /api/public-documents/[id]/selection`

规则：

- `GET` 返回其他用户 `public` 文档，并标记当前用户是否已选择。
- `POST` 只能选择其他用户的 `public` 且 `indexed` 文档。
- `DELETE` 取消当前用户对该文档的选择。
- 如果文档被删除或改为 private，选择关系自动删除或失效。

#### 2.7.5 管理员 API

新增接口：

- `GET /api/admin/users`
- `POST /api/admin/users`
- `DELETE /api/admin/users/[id]`
- `GET /api/admin/documents`
- `DELETE /api/admin/documents/[id]`

规则：

- 所有 `/api/admin/*` 都必须调用 `requireAdmin()`。
- 创建用户需要同时创建 Supabase Auth 用户和 `UserProfile`。
- 删除用户需要禁止删除自己。
- 删除用户需要删除 Supabase Auth 用户，并清理业务数据和 storage 文件。
- 管理员删除文档可以复用普通文档删除服务，但权限由 admin API 校验。

### 2.8 检索设计

当前 `vectorSearch(embedding, topK)` 只按 `d.status = 'indexed'` 过滤。需要改为按当前用户可用文档范围过滤。

建议函数签名：

```ts
retrieve(userQuery, { userId, traceId, provider })
vectorSearch(embedding, topK, userId)
```

可用文档 SQL 条件：

```sql
d.status = 'indexed'
AND (
  d.owner_user_id = $userId
  OR EXISTS (
    SELECT 1
    FROM public_document_selections s
    WHERE s.document_id = d.id
      AND s.user_id = $userId
  )
)
```

补充说明：

- 自己的 `private` 和 `public` 文档都通过 `owner_user_id = userId` 覆盖。
- 其他用户文档只有存在选择关系时才进入检索。
- 选择关系创建时已经保证只能选择其他用户 public indexed 文档。
- 为防御数据异常，检索 SQL 可以额外要求被选择文档仍为 `public`。

更防御的条件：

```sql
d.status = 'indexed'
AND (
  d.owner_user_id = $userId
  OR (
    d.visibility = 'public'
    AND EXISTS (
      SELECT 1
      FROM public_document_selections s
      WHERE s.document_id = d.id
        AND s.user_id = $userId
    )
  )
)
```

`POST /api/chat` 必须从服务端获取当前用户，并把 `userId` 传入 `retrieve()`。不能允许前端传入检索文档列表作为权限依据。

### 2.9 删除清理设计

#### 2.9.1 删除文档

建议提取服务函数：

- `src/lib/documents/delete-document.ts`

职责：

- 校验调用者是否为 owner 或 admin。
- 读取文档及 `fileRef`。
- 删除 storage 文件。
- 删除 document 记录。
- 依赖数据库级联删除 chunks 和 selections。

需要注意：

- storage 删除失败不应留下数据库记录永久不可删。建议记录日志，并继续删除数据库记录；后续可补清理脚本。
- 如果文档正在 indexing，`processDocument()` 现有 catch 已能处理文档删除后更新失败场景，但需要保留该容错。

#### 2.9.2 删除用户

建议提取服务函数：

- `src/lib/admin/delete-user.ts`

职责：

- 禁止管理员删除自己。
- 查询用户所有文档的 `fileRef`。
- 删除这些 storage 文件。
- 删除 Supabase Auth 用户。
- 删除 `UserProfile`，依赖级联删除 sessions、messages、documents、chunks、selections。

删除顺序建议：

1. 校验 admin 和目标用户。
2. 收集目标用户文档 file refs。
3. 删除 storage 文件。
4. 删除 Supabase Auth 用户。
5. 删除 `UserProfile`。

如果 Supabase Auth 删除成功但数据库删除失败，需要返回错误并保留日志；不引入审计日志，因为需求明确不支持。

### 2.10 默认账号初始化

需要新增脚本，例如：

- `scripts/seed-users.ts`

职责：

- 使用 Supabase service role 创建或更新三个默认用户。
- 同步创建或更新 `UserProfile`。
- 设置 `admin@test.com` 为 `admin`，其余为 `user`。

脚本需要幂等：

- 用户存在时不重复创建。
- 角色不一致时修正业务表角色。
- 密码是否重置需要明确。为了演示一致性，建议 seed 时可更新默认账号密码。

### 2.11 页面和组件设计

本节只描述功能入口，不展开视觉设计。

#### 2.11.1 登录页

- 保留默认账号提示。
- 默认填充 admin 账号可以继续保留，方便演示。

#### 2.11.2 Knowledge 页面

建议从一个全局文档列表改为三个功能区或标签：

- My Documents：当前用户自己的文档，支持上传、改可见性、删除、重建索引。
- Public Documents：其他用户公开文档，支持选择和取消选择。
- Admin Documents：仅管理员可见，全站文档列表，支持删除。

上传文档时需要增加可见性选择，默认 `private`。

#### 2.11.3 Admin 用户管理

可以新增独立页面：

- `/admin/users`

能力：

- 查看用户列表。
- 创建普通用户。
- 删除普通用户。
- 禁止删除自己。

导航入口仅管理员可见；后端仍必须校验管理员权限。

### 2.12 迁移策略

当前已有数据没有 owner。迁移需要为现有 sessions/documents 指定归属。

建议策略：

- 先创建默认 admin 用户。
- 新增字段时先允许 nullable。
- 将现有 sessions 和 documents 归属到 admin。
- 填充完成后把 `userId` / `ownerUserId` 改为 required。
- 移除 `Document.contentHash` 全局唯一约束，新增 `(ownerUserId, contentHash)` 唯一约束。

如果使用 Prisma migrate，一次迁移中涉及数据回填和约束调整时，建议检查生成 SQL，必要时手写 migration。

### 2.13 实施顺序

1. 移动文档到 `Docs/` 并提交。
2. 增加用户资料、角色、文档可见性、公开文档选择的数据模型和迁移。
3. 增加认证授权 helper。
4. 改造 session API，确保聊天隔离。
5. 改造 document API，确保 owner、visibility、重复文件规则和删除权限。
6. 增加 public document selection API。
7. 改造 retrieval/vector search，按当前用户可用文档过滤。
8. 增加 admin users/documents API。
9. 增加默认用户 seed 脚本。
10. 更新 Knowledge/Admin 页面入口和交互。
11. 补测试和验收用例。

### 2.14 测试策略

#### 2.14.1 单元/接口测试

需要覆盖：

- 普通用户只能列出自己的 sessions。
- 普通用户不能 GET/PATCH/DELETE 其他用户 session。
- PATCH session 不能通过自定义 ID 创建或覆盖其他用户 session。
- 用户上传同 hash 文件时，同用户重复失败，不同用户允许。
- 普通用户不能删除其他用户文档。
- owner 可以修改自己文档 visibility。
- public 改 private 后选择关系失效。
- 用户只能选择其他用户 public indexed 文档。
- `POST /api/chat` 的检索范围只包含当前用户可用文档。
- 管理员不能删除自己。
- 管理员可以删除普通用户，并清理关联数据。

#### 2.14.2 E2E 验收

需要覆盖：

- `user1` 创建聊天，`user2` 看不到。
- `user1` 私有文档不会被 `user2` 检索。
- `user1` 公开文档被 `user2` 勾选前不会参与检索。
- `user2` 勾选后可以参与检索。
- 取消勾选后不再参与检索。
- 管理员删除公开文档后所有用户都不能再检索。

### 2.15 风险和注意事项

- 当前 API 存在全局读写行为，多用户改造必须先完成后端隔离，再做 UI。
- `PATCH /api/sessions/[id]` 的 upsert 逻辑是权限风险点，需要优先改造。
- 向量检索是最关键的数据泄露风险点，必须从后端传入当前 userId 并在 SQL 中过滤。
- Supabase service role client 绕过 RLS，所有 admin 和 storage 操作必须在应用层显式校验。
- 删除用户涉及 Supabase Auth、业务数据库和 storage 三处状态，失败处理需要日志和可重试思路。
- 需求明确不做审计日志，因此设计不引入审计表。
