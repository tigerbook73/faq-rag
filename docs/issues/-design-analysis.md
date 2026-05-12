# API 层设计问题分析

> 审查时间：2026-05-12
> 范围：前端 API 调用 + 后端路由处理
> 状态：已完成

---

## 问题分类

### 🔴 Bug — 运行时可能出错

#### 1. `useChatWindow.ts` — SSE fetch 不检查 `res.ok`

**文件**: `src/components/chat/useChatWindow.ts`

```ts
// 现状：跳过状态码直接读 body
const res = await fetch("/api/chat", { ... });
if (!res.body) throw new Error("No response body");
```

API 返回 400/429/500 时，`res.body` 不为 null（错误响应有 body），代码把错误 JSON 当 SSE 流解析，导致 silent failure，用户看不到任何错误提示。

**修复方向**：

```ts
const res = await fetch("/api/chat", { ... });
if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  throw new Error((err as { error?: string }).error ?? `Chat failed (${res.status})`);
}
if (!res.body) throw new Error("No response body");
```

---

### 🟡 最佳实践缺口 — 与项目约定不符

#### 2. `/api/documents/prepare` — Zod 错误未用 `validationErrorResponse`

**文件**: `src/app/api/documents/prepare/route.ts`

```ts
// 现状：直接抛出 + catch，错误结构与其他路由不一致
const body = PrepareUploadInputSchema.parse(await req.json());
// ...
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
```

项目约定是 `safeParse` + `validationErrorResponse(error)`（返回结构化字段级错误），此处用硬编码字符串，与其他路由不一致。

**修复方向**：

```ts
const parsed = PrepareUploadInputSchema.safeParse(await req.json());
if (!parsed.success) return validationErrorResponse(parsed.error);
const { name, size, mime, hash } = parsed.data;
// catch 里删除 ZodError 分支
```

---

#### 3. `UploadZone.tsx` — 类型断言应改为 schema 解析

**文件**: `src/components/knowledge/UploadZone.tsx`

```ts
// 现状：纯类型断言，无运行时保护
const { docId, signedUrl, document } = (await prepareRes.json()) as {
  docId: string;
  signedUrl: string;
  document: DocumentItem;
};
```

`schemas/document.ts` 中尚未定义 `PrepareUploadOutputSchema`，此处字段拼错在编译期和运行期都不会报错。

**修复方向**：在 `src/lib/schemas/document.ts` 补充：

```ts
// GET /api/documents/prepare 响应
export const PrepareUploadOutputSchema = z.object({
  docId: z.string().uuid(),
  signedUrl: z.string(),
  token: z.string(),
  document: DocumentItemSchema,
});
export type PrepareUploadOutput = z.infer<typeof PrepareUploadOutputSchema>;
```

然后在 `UploadZone.tsx` 改为 `PrepareUploadOutputSchema.parse(await prepareRes.json())`。

---

#### 4. `admin/page.tsx` — 本地 `DashboardUser` 应改用 `AdminUserItem`

**文件**: `src/app/admin/page.tsx`

```ts
// 现状：本地手写 interface，与 schemas/ 的约定重复
interface DashboardUser {
  id: string;
  role: string;
}
```

`AdminUserItem`（`src/lib/schemas/user.ts`）已包含所需字段，应直接使用。

**修复方向**：

```ts
import { type AdminUserItem } from "@/lib/schemas/user";

const { data: usersData } = useSWR<{ items: AdminUserItem[] }>("/api/admin/users", fetcher);
// 删除本地 DashboardUser interface
```

---

## 不建议修复的（已评估）

| 建议                                                   | 结论                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| SWR fetcher 里对每个响应调用 `Schema.parse()`          | 客户端信任自己的 API；增加 bundle size 和运行时开销；过度设计 |
| 后端路由 parse 自己生成的响应 DTO                      | 路由是数据生产者，不需要验证自己的输出                        |
| `updateSessionTitle`/`apiDeleteSession` 加严格错误抛出 | 上层调用方已有 try-catch，PATCH/DELETE 失败是非致命操作       |
| 补充 `PATCH /api/admin/users/[id]`（role 更新）        | Feature gap，不是最佳实践问题；UI 无对应功能                  |
| `SignInForm.tsx` 登录后再调用 `/api/auth/me`           | 已由 server sign-in endpoint 和 role-aware redirect 改造替代  |

---

## 优先级建议

| 优先级 | 问题                                    | 理由                               |
| ------ | --------------------------------------- | ---------------------------------- |
| P1     | `useChatWindow.ts` SSE 不检查 `res.ok`  | 用户完全感知不到 chat 错误         |
| P2     | `/api/documents/prepare` 错误处理不标准 | 与项目约定不一致，影响错误可观测性 |
| P2     | `UploadZone.tsx` 类型断言               | 有 schema 但未用，字段拼错不报错   |
| P3     | `admin/page.tsx` 本地 interface         | 纯类型层问题，不影响运行时         |

---

## 完成记录

- `useChatWindow.ts`：SSE fetch 增加 `res.ok` 检查，非 2xx 响应会读取错误 JSON 并通过 toast 显示。
- `/api/documents/prepare`：改为 `safeParse` + `validationErrorResponse`，返回结构化 `fieldErrors`。
- `schemas/document.ts`：新增 `PrepareUploadOutputSchema` / `PrepareUploadOutput`。
- `UploadZone.tsx`：prepare 响应改为 `PrepareUploadOutputSchema.parse()`。
- `admin/page.tsx`：删除本地 `DashboardUser`，改用 `AdminUserItem`。

验证：

- `pnpm exec tsc --noEmit`
- `pnpm exec jest src/app/api/documents/prepare/route.test.ts --runInBand`
