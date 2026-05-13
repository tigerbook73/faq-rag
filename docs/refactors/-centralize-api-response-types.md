# 重构计划：将 API 响应类型集中到 schemas/

## 背景

项目已在 `src/lib/schemas/` 下建立了统一的类型层，同时承载**请求输入验证**（Zod schema）和
**API 响应 DTO**（`z.infer<>`）。`session.ts` 是最完整的范本：`Citation`、`Message`、
`SessionSummary` 均以 Zod schema 定义，并从同一文件导出类型，组件直接引用，无重复 interface。

但以下 API 响应类型**尚未遵循此模式**，仍以手写 interface 散落在 UI 组件或缺乏显式类型：

| 类型                | 当前位置                                       | 问题                                   |
| ------------------- | ---------------------------------------------- | -------------------------------------- |
| `Document`          | `components/knowledge/DocumentRow.tsx`         | lib 层钩子从 UI 组件导入类型           |
| `AdminDocument`     | `components/admin/AdminDocumentsWorkspace.tsx` | 页面文件跨模块导入自 UI 组件           |
| `AdminUser`         | `components/admin/AdminUsersWorkspace.tsx`     | 同上，且字段不完整（缺 `_count`）      |
| `PublicDocument`    | `components/knowledge/PublicDocumentTable.tsx` | API 响应无显式 schema 约束             |
| `/api/auth/me` 响应 | 无                                             | `auth-context.tsx` 直接 `any` 访问字段 |
| `Citation` 再导出   | `components/chat/CitationDrawer.tsx`           | 组件充当类型中转站                     |

**不在本次范围内**（位置合理，无需移动）：

- `ChunkRow` — `lib/retrieval/vector-search.ts`：检索层内部类型，仅在 `lib/retrieval/` 内流通
- `ChatSession` — `lib/session-api.ts`：客户端计算类型（时间戳从 ISO 转 ms），不直接映射 API 响应
- `Msg`、`LLMProvider` — `lib/llm/types.ts`：LLM 抽象内部接口

---

## 三层类型职责划分

```
DB 层     Prisma 生成类型（Document, UserProfile...）
          → 只在 lib/data/ 内部使用，不跨层传递

API 层    src/lib/schemas/{domain}.ts
          → Zod schema（运行时验证）+ z.infer<> 派生类型（静态契约）
          → 请求 input 和响应 DTO 在同一文件，按注释分区

UI 层     src/components/**
          → 只导入 schemas/ 中的类型，不自定义数据类型
          → 纯 UI 状态（modal 开关、本地过滤）内联定义，不导出
```

---

## 实现

### 1. `src/lib/schemas/document.ts` — 追加响应 DTO

```typescript
// ── Response DTOs ─────────────────────────────────────────────────────────────

// GET /api/documents — 当前用户的文档列表
export const DocumentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  lang: z.string().nullable(),
  status: z.enum(["pending", "uploaded", "indexing", "indexed", "failed"]),
  visibility: z.enum(["private", "public"]),
  sizeBytes: z.number(),
  errorMsg: z.string().nullable(),
  totalChunks: z.number().nullable(),
  createdAt: z.union([z.string(), z.date()]),
  _count: z.object({ chunks: z.number() }),
});
export type DocumentItem = z.infer<typeof DocumentItemSchema>;

// GET /api/admin/documents — 管理员视角的文档列表
export const AdminDocumentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerUserId: z.string(),
  status: z.string(),
  visibility: z.enum(["private", "public"]),
  owner: z.object({ email: z.string() }),
  _count: z.object({ chunks: z.number(), selections: z.number() }),
  createdAt: z.union([z.string(), z.date()]),
});
export type AdminDocumentItem = z.infer<typeof AdminDocumentItemSchema>;

// GET /api/public-documents — 可供当前用户选择的公共文档
export const PublicDocumentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  lang: z.string().nullable(),
  status: z.string(),
  selected: z.boolean(),
  createdAt: z.union([z.string(), z.date()]),
  owner: z.object({ email: z.string() }),
  _count: z.object({ chunks: z.number() }),
});
export type PublicDocumentItem = z.infer<typeof PublicDocumentItemSchema>;
```

### 2. `src/lib/schemas/user.ts` — 追加响应 DTO

```typescript
// ── Response DTOs ─────────────────────────────────────────────────────────────

// GET /api/admin/users — 管理员用户列表
// 注意：API 实际返回包含 _count.documents/sessions/publicDocumentSelections，
//       此处只声明 UI 用到的字段，其余字段 Zod 默认忽略（strip 模式）
export const AdminUserItemSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(["user", "admin"]),
  createdAt: z.union([z.string(), z.date()]),
});
export type AdminUserItem = z.infer<typeof AdminUserItemSchema>;

// GET /api/auth/me — 当前登录用户信息
export const AuthMeResponseSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  role: z.enum(["user", "admin"]),
});
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
```

### 3. 更新各消费方的导入路径

| 文件                                                              | 变更                                                                                                                             |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/knowledge/DocumentRow.tsx`                        | 删除 `export interface Document`，改从 `@/lib/schemas/document` 导入 `DocumentItem`（本地 alias 为 `Document` 保持组件内部不变） |
| `src/components/knowledge/DocumentTable/useDocumentManagement.ts` | 从 `@/lib/schemas/document` 导入 `DocumentItem`，替换原来从 `DocumentRow.tsx` 导入的 `Document`                                  |
| `src/components/admin/AdminDocumentsWorkspace.tsx`                | 删除 `export interface AdminDocument`，改从 `@/lib/schemas/document` 导入 `AdminDocumentItem`                                    |
| `src/components/admin/AdminUsersWorkspace.tsx`                    | 删除 `export interface AdminUser`，改从 `@/lib/schemas/user` 导入 `AdminUserItem`                                                |
| `src/components/knowledge/PublicDocumentTable.tsx`                | 删除 `export interface PublicDocument`，改从 `@/lib/schemas/document` 导入 `PublicDocumentItem`                                  |
| `src/app/admin/page.tsx`                                          | 更新 `AdminDocumentItem` 导入路径（从 schemas/ 而非 AdminDocumentsWorkspace）                                                    |
| `src/components/chat/CitationDrawer.tsx`                          | 删除 `export type { Citation }` 这行再导出                                                                                       |
| 所有从 `CitationDrawer` 导入 `Citation` 的文件                    | 改从 `@/lib/schemas/session` 直接导入                                                                                            |
| `src/context/auth-context.tsx`                                    | 用 `AuthMeResponseSchema.safeParse(data)` 替换裸访问 `data.role`/`data.id`                                                       |

---

## 受影响文件汇总

| 文件                                                              | 变更类型                                                                         |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/schemas/document.ts`                                     | 追加 `DocumentItemSchema`、`AdminDocumentItemSchema`、`PublicDocumentItemSchema` |
| `src/lib/schemas/user.ts`                                         | 追加 `AdminUserItemSchema`、`AuthMeResponseSchema`                               |
| `src/components/knowledge/DocumentRow.tsx`                        | 删除 interface，改为导入                                                         |
| `src/components/knowledge/DocumentTable/useDocumentManagement.ts` | 更新导入路径                                                                     |
| `src/components/admin/AdminDocumentsWorkspace.tsx`                | 删除 interface，改为导入                                                         |
| `src/components/admin/AdminUsersWorkspace.tsx`                    | 删除 interface，改为导入                                                         |
| `src/components/knowledge/PublicDocumentTable.tsx`                | 删除 interface，改为导入                                                         |
| `src/app/admin/page.tsx`                                          | 更新导入路径                                                                     |
| `src/components/chat/CitationDrawer.tsx`                          | 删除 re-export                                                                   |
| `src/context/auth-context.tsx`                                    | 用 schema 解析替换裸字段访问                                                     |

---

## 决策备注

- **Zod strip 模式**：Zod 默认剥离 schema 外的字段，所以 `AdminUserItemSchema` 不需要声明
  API 实际返回的 `_count` 等未使用字段，组件侧类型仍然安全。
- **不新增 `src/lib/types/` 目录**：`schemas/` 已同时承载请求 schema 和响应 DTO，
  模式与 `session.ts` 一致，避免目录碎片化。
- **`ChatSession` 保持不动**：它是 `session-api.ts` 内部的客户端变换类型（ISO→ms），
  与 API 响应形状不同，不适合放入 schemas/。
- **`DocumentItem` vs `Document`**：迁移后建议在组件内 `import { DocumentItem as Document }`，
  最小化组件内代码改动。
- **`auth-context.tsx` 校验**：`safeParse` 失败时静默降级（`role: null`），
  行为与现有代码一致，不改变认证逻辑。
- **import 路径全量更新**：不在旧组件文件保留 re-export，彻底断开 `lib→components` 的错误依赖。

---

## 验证

- `pnpm lint`（TypeScript 编译）通过，无导入错误，无循环依赖
- `pnpm test` 通过
- 检查 `CitationDrawer` 的调用方均已改用 `@/lib/schemas/session` 导入 `Citation`
