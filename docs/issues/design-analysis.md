# API 层设计问题分析

> 审查时间：2026-05-09
> 范围：前端 API 调用 + 后端路由处理
> 状态：待实施

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

#### 2. `SignInForm.tsx` — 不检查 `res.ok` 直接读 role

**文件**: `src/app/auth/signin/SignInForm.tsx`

```ts
// 现状：API 返回 401 时，profile 是 { error: "..." }，role 为 undefined
const res = await fetch("/api/auth/me");
const profile = await res.json().catch(() => ({}));
router.replace(profile.role === "admin" ? "/admin" : "/chat/new");
```

`/api/auth/me` 返回非 2xx 时，`profile.role` 为 undefined，静默跳转到 `/chat/new`，不抛出可见错误。

**修复方向**：

```ts
const res = await fetch("/api/auth/me");
if (!res.ok) {
  router.replace("/chat/new");
  return;
}
const parsed = AuthMeResponseSchema.safeParse(await res.json());
router.replace(parsed.success && parsed.data.role === "admin" ? "/admin" : "/chat/new");
```

---

### 🟡 最佳实践缺口 — 与项目约定不符

#### 3. `/api/documents/prepare` — Zod 错误未用 `validationErrorResponse`

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

#### 4. `UploadZone.tsx` — 类型断言应改为 schema 解析

**文件**: `src/components/knowledge/UploadZone.tsx`

```ts
// 现状：纯类型断言，无运行时保护
const { docId, signedUrl } = (await prepareRes.json()) as { docId: string; signedUrl: string };
```

`schemas/document.ts` 中尚未定义 `PrepareUploadOutputSchema`，此处字段拼错在编译期和运行期都不会报错。

**修复方向**：在 `src/lib/schemas/document.ts` 补充：

```ts
// GET /api/documents/prepare 响应
export const PrepareUploadOutputSchema = z.object({
  docId: z.string().uuid(),
  signedUrl: z.string(),
  token: z.string().optional(),
});
export type PrepareUploadOutput = z.infer<typeof PrepareUploadOutputSchema>;
```

然后在 `UploadZone.tsx` 改为 `PrepareUploadOutputSchema.parse(await prepareRes.json())`。

---

#### 5. `admin/page.tsx` — 本地 `DashboardUser` 应改用 `AdminUserItem`

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

---

## 优先级建议

| 优先级 | 问题                                    | 理由                               |
| ------ | --------------------------------------- | ---------------------------------- |
| P1     | `useChatWindow.ts` SSE 不检查 `res.ok`  | 用户完全感知不到 chat 错误         |
| P1     | `SignInForm.tsx` 不检查 `res.ok`        | 登录成功后可能无声跳错页面         |
| P2     | `/api/documents/prepare` 错误处理不标准 | 与项目约定不一致，影响错误可观测性 |
| P2     | `UploadZone.tsx` 类型断言               | 有 schema 但未用，字段拼错不报错   |
| P3     | `admin/page.tsx` 本地 interface         | 纯类型层问题，不影响运行时         |
