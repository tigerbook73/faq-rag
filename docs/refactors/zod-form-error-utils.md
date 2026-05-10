# 重构计划：提取 Zod 表单错误解析工具

## Context

`AdminUsersWorkspace` 中有两处手写的 ZodError → 字段错误映射逻辑：

```typescript
// 创建用户（行 65–75）
const errors: { email?: string; password?: string } = {};
for (const issue of result.error.issues) {
  const field = issue.path[0] as string;
  if (field === "email") errors.email = issue.message;
  if (field === "password") errors.password = issue.message;
}
setCreateErrors(errors);

// 修改密码（行 117–121）
setPasswordError(result.error.issues[0]?.message);
```

第一种模式（多字段映射）在任何带前端验证的表单中都会重复出现。
`validationErrorResponse` 在服务端已使用 `error.flatten().fieldErrors`，
客户端应有对应的解析工具保持一致。

---

## 实现

**更新** `src/lib/schemas/index.ts`（若不存在则新建 `src/lib/form-utils.ts`），新增：

```typescript
import type { ZodError } from "zod";

/**
 * 将 ZodError 转换为字段 → 首条错误消息的映射。
 * 对应服务端 validationErrorResponse 的 flatten().fieldErrors。
 */
export function parseZodFieldErrors<T extends Record<string, unknown>>(
  error: ZodError,
): Partial<Record<keyof T, string>> {
  const result: Partial<Record<keyof T, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof T;
    if (field && !(field in result)) {
      result[field] = issue.message;
    }
  }
  return result;
}
```

---

## 受影响文件

| 文件                                           | 变更类型                                     |
| ---------------------------------------------- | -------------------------------------------- |
| `src/lib/form-utils.ts`                        | 新增（或并入现有工具文件）                   |
| `src/components/admin/AdminUsersWorkspace.tsx` | 替换两处手写循环，改用 `parseZodFieldErrors` |

**替换后示例**：

```typescript
// 替换前
const errors: { email?: string; password?: string } = {};
for (const issue of result.error.issues) {
  const field = issue.path[0] as string;
  if (field === "email") errors.email = issue.message;
  if (field === "password") errors.password = issue.message;
}
setCreateErrors(errors);

// 替换后
setCreateErrors(parseZodFieldErrors<{ email: string; password: string }>(result.error));
```

---

## 变更范围

这是一个低风险的小型重构，仅影响 2 个文件，逻辑完全等价。

## 验证

- `pnpm lint` 通过
- 手动测试：创建用户表单提交空字段时，email/password 错误提示正常显示
