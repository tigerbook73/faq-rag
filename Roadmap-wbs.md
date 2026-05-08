# Roadmap WBS

> 基于 Roadmap.md 8 条诉求的任务分解。每个任务设计为独立 commit，可在新 Claude CLI 会话中直接启动。

---

## 决策记录

| 决策 | 选项 | 说明 |
|------|------|------|
| A — T3 时机 | A1：跳过 T3 | T6–T9 迁移时在各 client component 内加 inline loading，一步到位 |
| B — proxy.ts auth | B1：换 `getSession()` | 本地 JWT 验证，零网络开销；并入 T8 一起做 |
| C — admin/layout.tsx | C1：保留 SC，只做 role check | 子页面改 client component；`admin/layout.tsx` 不动 |
| D — T8 范围 | D2：T8 含 proxy.ts 改动 | layout 去 async + AuthContext 修复 + proxy.ts 换 getSession() |

---

## 现状速览

| 方面 | 现状 |
|------|------|
| Server Components | 除 `chat/last` 外，所有 page/layout 均为 async server component |
| API Schema | `src/lib/schemas/` 已有 zod schemas，但未审计覆盖率 |
| Loading 状态 | 仅 `knowledge/loading.tsx` 有骨架屏，其余页面无 |
| Admin Sidebar | 独立的 `AdminSidebar`（不可折叠）与 `AppSidebar`（可折叠）两套体系 → 已修复（T1） |
| Admin 页面 | 4 个 async server component，有独立 `AdminShell` layout |
| proxy.ts auth | `getUser()`（网络验证，~100ms/次） → T8 改为 `getSession()` |

---

## 依赖关系

```
T0 (架构审计) ✅
  └── T6, T7, T8, T9

T4 (API schema 审计)
  └── T6, T7, T9

T1 (admin sidebar) ✅
  └── T6

T8（含 proxy.ts B1 改动）
  └── 建议先于 T6/T7/T9，确保 auth 基础稳定

T2, T3 — 关闭 / 暂缓
T10, T11 — 待 Phase 3 完成后分析
```

---

## Phase 0 — 分析前置

### T0 · [analysis] Server Component 数据依赖审计

**状态**：✅ 已完成

---

#### 数据依赖映射表

| Server Component | 当前数据来源 | 对应 API | API 覆盖？ | 迁移备注 |
|-----------------|------------|---------|-----------|---------|
| `layout.tsx` | `getCurrentUser()` → `{role, email}` | `GET /api/auth/me` → `{id, email, role}` | ✅ | T8 处理 |
| `chat/[id]/page.tsx` | `requireUser()` + `getSessionForUser(actorId, id)` | `GET /api/sessions/[id]` | ✅ | middleware 已覆盖认证 |
| `admin/layout.tsx` | `requireAdmin()` → role check | — | ✅ 保留 SC | **C1 决策**：保留为 SC，只做 role check，不取数据 |
| `admin/page.tsx` | `listUsers()` + `listAdminDocuments({take:5})` | `GET /api/admin/users` + `GET /api/admin/documents?pageSize=5` | ✅ | T6 处理 |
| `admin/documents/page.tsx` | `listAdminDocuments({take:100})` | `GET /api/admin/documents?pageSize=100` | ✅ | T6 处理 |
| `admin/users/page.tsx` | `requireAdmin()` + `listUsers()` | `GET /api/admin/users` | ✅ | T6 处理；`actorId` 改从 `/api/auth/me` 取 |
| `knowledge/page.tsx` | `requireUser()` + `listDocumentsForOwner()` + `listSelectablePublicDocuments()` | `GET /api/documents` + `GET /api/public-documents` | ✅ | T7 处理 |

---

#### 关键发现

**发现 1 — AuthContext `role` 字段永久陈旧**

`auth-context.tsx` 中 `onAuthStateChange` 只更新 `isAuthenticated` 和 `email`，不更新 `role`。T8 中修复：每次 `onAuthStateChange` 触发时调 `/api/auth/me` 获取最新 role。

**发现 2 — proxy.ts 不检查 admin 角色（C1 决策已处理）**

`admin/layout.tsx` 的 `requireAdmin()` 是唯一 admin 角色门卫。**C1 决策**：保留 `admin/layout.tsx` 为 Server Component 专做 role check，子页面改为 client component。proxy.ts 不需要加 role 检查。

**发现 3 — T5 关闭**

所有迁移所需 API 已存在，相关小调整并入 T6/T8。

---

## Phase 1 — 独立改进

### T1 · [refactor] Admin sidebar 可折叠，与主 sidebar 行为一致

**状态**：✅ 已完成（commit `00761b0`）

改动：`AdminSidebar.tsx`（Sidebar collapsible="icon"）、`AdminShell.tsx`（SidebarProvider + SidebarInset）、`AdminTopBar.tsx`（移动端 SidebarTrigger）

---

### T2 · [feature] 页面切换导航进度条

**状态**：⏸ 暂缓（价值有限，进度条为伪造进度；T3–T9 完成后视情况再评估）

---

### T3 · [feature] 补全各页面 loading skeleton

**状态**：❌ 跳过（**决策 A1**）

`loading.tsx` 仅对 Server Component 有效。T6–T9 迁移为 client component 后会失效，需改写为 inline loading 状态。直接在 T6–T9 各任务中加 inline loading，一步到位。

---

## Phase 2 — API 基础巩固

### T4 · [refactor] API schema 覆盖率审计与统一

**来源**：Roadmap 条目 2  
**范围**：`src/app/api/**`，`src/lib/schemas/`

实施要点：
1. 逐个检查每条 API 路由的 request body/query 校验
2. 未使用 schema 的路由补充接入 `src/lib/schemas/`
3. 统一 error response 格式（`{ error: string }`）

**依赖**：无  
**状态**：⬜ 待做  
**风险**：🟡 中

---

## Phase 3 — Server Component → Client Component 迁移

> **建议顺序**：T8 → T7 → T9 → T6（T8 先做，auth 基础稳定后再迁移各页面）

---

### T8 · [refactor] Root layout 去除 server 端数据获取 + proxy.ts 换 getSession()

**来源**：Roadmap 条目 1；**决策 B1 + D2**  
**范围**：`proxy.ts`、`src/app/layout.tsx`、`src/context/auth-context.tsx`

实施要点：
1. **`proxy.ts`**：`getUser()` → `getSession()`，消除每次导航的 Supabase 网络调用
2. **`layout.tsx`**：去除 `async`，移除 `getCurrentUser()`，`Providers` 的 `initialAuth/initialRole/initialEmail` 改传 `false/null/null`
3. **`auth-context.tsx`**：mount 时调 `GET /api/auth/me` 获取初始值；`onAuthStateChange` 触发时重新调 `/api/auth/me` 更新 role（而非只从 session 取 email）
4. **处理 flash**：`isAuthenticated` 从 `false` 变为真实值期间，TopBar/Sidebar 不得出现闪烁或错误跳转

**依赖**：T0  
**状态**：⬜ 待做  
**风险**：🔴 高（auth 初始化时序，需充分测试 TopBar/Sidebar 闪烁问题）

---

### T6 · [refactor] Admin 子页面迁移为 client component

**来源**：Roadmap 条目 1；**决策 C1**  
**范围**：`admin/page.tsx`、`admin/documents/page.tsx`、`admin/users/page.tsx`  
**不改**：`admin/layout.tsx`（保留 SC，继续做 `requireAdmin()` role check）

实施要点：
1. 三个子页面改为 `"use client"` + `useEffect` 调用对应 `/api/admin/*`
2. `admin/users/page.tsx`：移除冗余的 `requireAdmin()`，`actorId` 改从 `useAuth()` 或 `GET /api/auth/me` 取
3. 各页面加 inline loading 状态（**决策 A1**，取代 loading.tsx）

**依赖**：T0, T1, T4  
**状态**：⬜ 待做  
**风险**：🟡 中（admin/layout.tsx 保留 SC 后，auth 边界清晰，风险降低）

---

### T7 · [refactor] Knowledge 页面迁移为 client component

**来源**：Roadmap 条目 1  
**范围**：`src/app/knowledge/page.tsx`

实施要点：
1. 改为 `"use client"` + `useEffect` 调用 `GET /api/documents` + `GET /api/public-documents`
2. 移除冗余的 `requireUser()`（middleware 已覆盖）
3. 加 inline loading 状态（**决策 A1**）

**依赖**：T0, T4  
**状态**：⬜ 待做  
**风险**：🟡 中

---

### T9 · [refactor] Chat 页面去除服务端 session 水合

**来源**：Roadmap 条目 1  
**范围**：`src/app/chat/[id]/page.tsx`，`src/components/chat/ChatWindow.tsx`

实施要点：
1. `chat/[id]/page.tsx` 改为非 async，不传 `initialSession`
2. `ChatWindow` 改为 mount 时调 `GET /api/sessions/[id]` 获取数据
3. 加 inline loading 状态（**决策 A1**）

**依赖**：T0, T4  
**状态**：⬜ 待做  
**风险**：🟡 中

---

## Phase 4 — 其他改进

### T10 · [analysis] 首页加载优化分析

**来源**：Roadmap 条目 3  
Phase 3 完成后分析 about/sign-in 页面优化空间（静态化等）。  
**状态**：⬜ 待做（等 Phase 3 稳定）

---

### T11 · [analysis] 全系统架构一致性报告

**来源**：Roadmap 条目 6、8  
Phase 3 完成后形成最终架构描述，识别剩余不一致点。  
**状态**：⬜ 待做（等 Phase 3 稳定）

---

## 任务总表

| ID | 类型 | 标题 | 依赖 | 风险 | 状态 |
|----|------|------|------|------|------|
| T0 | analysis | Server Component 数据依赖审计 | — | 🟢 | ✅ |
| T1 | refactor | Admin sidebar 可折叠 | — | 🟡 | ✅ |
| T2 | feature | 页面切换导航进度条 | — | 🟢 | ⏸ 暂缓 |
| T3 | feature | ~~补全各页面 loading skeleton~~ | — | — | ❌ 跳过（A1） |
| T4 | refactor | API schema 覆盖率审计与统一 | — | 🟡 | ✅ |
| T5 | ~~feature~~ | ~~补全 client-side 所需 API~~ | — | — | ❌ 关闭，并入 T6/T8 |
| T6 | refactor | Admin 子页面 → client component（admin/layout.tsx 保留 SC） | T0,T1,T4 | 🟡 | ✅ |
| T7 | refactor | Knowledge 页面 → client component | T0,T4 | 🟡 | ✅ |
| T8 | refactor | Root layout 去 async + AuthContext role 修复 + proxy.ts getSession() | T0 | 🔴 | ✅ |
| T9 | refactor | Chat 页面去除服务端 session 水合 | T0,T4 | 🟡 | ✅ |
| T10 | analysis | 首页加载优化分析 | Phase 3 | — | ❌ 关闭（about/signin 已是 Static，优化收益不足）|
| T11 | analysis | 全系统架构一致性报告 | Phase 3 | — | ✅ |

---

## 建议启动顺序

**立即可做**：T4  
**T4 完成后**：T8（先做，auth 基础稳定） → T7、T9（可并行） → T6（需 T1 已完成）  
**Phase 3 全部完成后**：T10、T11
