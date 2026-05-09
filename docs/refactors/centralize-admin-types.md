# 重构计划：集中管理 Admin 类型定义

## Context

管理后台的核心类型 `AdminUser` 和 `AdminDocument` 目前定义在 UI 组件文件内：

- `AdminUser` — `src/components/admin/AdminUsersWorkspace.tsx`（行 22–27，`export interface`）
- `AdminDocument` — `src/components/admin/AdminDocumentsWorkspace.tsx`（行 18–26，`export interface`）

类型定义混入组件文件违反了关注点分离原则：当其他模块需要引用这些类型时，
必须从 UI 组件导入，造成不合理的依赖方向（`lib/` → `components/`）。

`Document` 类型同样定义在 `src/components/knowledge/DocumentRow.tsx` 中，
被 `useDocumentManagement.ts` 从组件文件导入，同属此问题。

---

## 实现

### 新增文件 `src/lib/types/admin.ts`

```typescript
export interface AdminUser {
  id: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
}

export interface AdminDocument {
  id: string;
  name: string;
  ownerEmail: string;
  visibility: "private" | "public";
  status: string;
  createdAt: string;
  // 根据实际字段补充
}
```

> **注意**：以现有组件文件中的字段定义为准，写入时逐字复制，不增不减。

### 将 `Document` 类型迁移至 `src/lib/types/document.ts`

```typescript
// 从 src/components/knowledge/DocumentRow.tsx 提取
export interface Document {
  id: string;
  name: string;
  status: "pending" | "uploaded" | "indexing" | "indexed" | "failed";
  visibility: "private" | "public";
  // 根据实际字段补充
}
```

---

## 受影响文件

| 文件 | 变更类型 |
|------|---------|
| `src/lib/types/admin.ts` | 新增 |
| `src/lib/types/document.ts` | 新增（或合并到现有 schema 文件） |
| `src/components/admin/AdminUsersWorkspace.tsx` | 删除本地接口定义，改为从 `@/lib/types/admin` 导入 |
| `src/components/admin/AdminDocumentsWorkspace.tsx` | 删除本地接口定义，改为从 `@/lib/types/admin` 导入 |
| `src/components/knowledge/DocumentRow.tsx` | 删除或保留类型导出（视是否有其他组件直接引用决定） |
| `src/components/knowledge/DocumentTable/useDocumentManagement.ts` | 更新导入路径 |

---

## 决策备注

- 若 `src/lib/schemas/user.ts` / `src/lib/schemas/document.ts` 已有相近类型，
  优先扩展现有文件而非新增 `src/lib/types/`，保持目录结构一致。
- Zod schema 推断类型（`z.infer<typeof Schema>`）与手写接口可以共存：
  Zod schema 用于运行时验证，接口用于 API 响应的静态类型。
- 迁移时保持 `export` 不变，避免需要更新所有调用方。

---

## 验证

- `pnpm lint`（TypeScript 编译）通过，无导入错误
- `pnpm test` 通过
- 确认无循环依赖：`lib/` 不应导入 `components/`
