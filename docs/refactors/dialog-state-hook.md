# 重构计划：useDialog Hook — 统一 Dialog 状态管理

## Context

`AdminUsersWorkspace` 中有三组 dialog 状态，每组各自维护 open/data/loading/error 字段，
共计 12 个 `useState` 声明。每次新增 dialog 都需要复制相同的样板。
`AdminDocumentsWorkspace` 也有相同的模式。

**当前模式（以删除 dialog 为例）**：
```typescript
const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);

// 打开
setDeleteTarget(user);

// 关闭并重置
setDeleteTarget(null);
```

**目标**：提取 `useDialog<T>` hook，把 open + data 合并为一个单元，消除手写的 open/close/reset 逻辑。

---

## 实现

**新建文件** `src/hooks/useDialog.ts`：
```typescript
import { useState, useCallback } from "react";

interface DialogState<T> {
  open: boolean;
  data: T | null;
}

export function useDialog<T = null>() {
  const [state, setState] = useState<DialogState<T>>({ open: false, data: null });

  const openWith = useCallback((data: T) => setState({ open: true, data }), []);
  const openEmpty = useCallback(() => setState({ open: true, data: null }), []);
  const close = useCallback(() => setState({ open: false, data: null }), []);

  return {
    open: state.open,
    data: state.data,
    openWith,
    openEmpty,
    close,
    // shadcn Dialog 的 onOpenChange 兼容
    onOpenChange: (open: boolean) => { if (!open) close(); },
  };
}
```

---

## 受影响文件

### `src/components/admin/AdminUsersWorkspace.tsx`

将 3 组 dialog 状态替换为 hook：

```typescript
// 替换前（12 个 useState）
const [createOpen, setCreateOpen] = useState(false);
const [createEmail, setCreateEmail] = useState("");
// ...
const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);
const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
// ...

// 替换后（3 个 hook 调用 + 保留 form 字段 state）
const createDialog = useDialog();
const deleteDialog = useDialog<AdminUser>();
const passwordDialog = useDialog<AdminUser>();
```

使用示例：
```typescript
// 打开删除 dialog
deleteDialog.openWith(user);

// Dialog 组件
<Dialog open={deleteDialog.open} onOpenChange={deleteDialog.onOpenChange}>
  {deleteDialog.data && <p>Delete {deleteDialog.data.email}?</p>}
  <Button onClick={() => handleDeleteUser(deleteDialog.data!.id)}>Confirm</Button>
</Dialog>
```

**注意**：`creating` / `deletingId` / `changingPasswordId` 这些 loading 状态由 `useAsyncAction`
（见 `extract-shared-patterns.md` Phase 3）管理，不属于 dialog 状态，不纳入此 hook。

### `src/components/admin/AdminDocumentsWorkspace.tsx`

将 delete dialog 的 `deleteTarget`/`setDeleteTarget` 替换为 `useDialog<AdminDocument>()`。

---

## 变更范围

| 文件 | 变更类型 |
|------|---------|
| `src/hooks/useDialog.ts` | 新增 |
| `src/components/admin/AdminUsersWorkspace.tsx` | 重构（减少 ~8 个 useState） |
| `src/components/admin/AdminDocumentsWorkspace.tsx` | 重构（减少 ~2 个 useState） |

---

## 验证

- `pnpm lint` 通过
- 手动测试：创建用户、删除用户、修改密码三个 dialog 的打开/关闭/提交/取消均正常
- ESC 关闭 dialog 后状态正确重置（data 清空）
