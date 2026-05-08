# Roadmap WBS

> 基于 Roadmap.md 8 条诉求的任务分解。每个任务设计为独立 commit，可在新 Claude CLI 会话中直接启动。

---

## 现状速览

| 方面 | 现状 |
|------|------|
| Server Components | 除 `chat/last` 外，所有 page/layout 均为 async server component |
| API Schema | `src/lib/schemas/` 已有 zod schemas，但未审计覆盖率 |
| Loading 状态 | 仅 `knowledge/loading.tsx` 有骨架屏，其余页面无 |
| 页面切换提示 | 无导航进度条 |
| Admin Sidebar | 独立的 `AdminSidebar`（不可折叠）与 `AppSidebar`（可折叠）两套体系 |
| Admin 页面 | 4 个 async server component，有独立 `AdminShell` layout |

---

## 依赖关系

```
T0 (架构审计)
  └── T6, T7, T8, T9 (Server Component 迁移，Phase 3)

T4 (API schema 审计)
  └── T5 (补全缺失 API)
       └── T6, T7, T8, T9

T1, T2, T3 — 独立，无阻塞依赖
T10 — 待 Phase 3 完成后再分析
```

**关键冲突点**：T1（Admin sidebar 重构）与 T6（admin 页面迁移）都会动 admin layout，建议先做 T1 再做 T6，避免二次改动。

---

## Phase 0 — 分析前置

### T0 · [analysis] Server Component 数据依赖审计

**状态**：✅ 已完成

---

#### 数据依赖映射表

| Server Component | 当前数据来源 | 对应 API | API 覆盖？ | 迁移备注 |
|-----------------|------------|---------|-----------|---------|
| `layout.tsx` | `getCurrentUser()` → `{role, email}` | `GET /api/auth/me` → `{id, email, role}` | ✅ | 见下方【关键发现 1】 |
| `chat/[id]/page.tsx` | `requireUser()` + `getSessionForUser(actorId, id)` | `GET /api/sessions/[id]` | ✅ | middleware 已覆盖认证，`requireUser()` 可移除 |
| `admin/layout.tsx` | `requireAdmin()` → `{email}` | 无独立 API | ⚠️ | 见下方【关键发现 2】 |
| `admin/page.tsx` | `listUsers()` + `listAdminDocuments({take:5})` | `GET /api/admin/users` + `GET /api/admin/documents?pageSize=5` | ✅ | |
| `admin/documents/page.tsx` | `listAdminDocuments({take:100})` | `GET /api/admin/documents?pageSize=100` | ✅ | |
| `admin/users/page.tsx` | `requireAdmin()` + `listUsers()` | `GET /api/admin/users` | ✅ | `requireAdmin()` 与 layout 重复；`actorId` 需从 `/api/auth/me` 取 |
| `knowledge/page.tsx` | `requireUser()` + `listDocumentsForOwner()` + `listSelectablePublicDocuments()` | `GET /api/documents` + `GET /api/public-documents` | ✅ | middleware 已覆盖认证，`requireUser()` 可移除 |

---

#### 关键发现

**发现 1 — AuthContext `role` 字段永久陈旧**

`auth-context.tsx` 中 `onAuthStateChange` 回调只更新 `isAuthenticated` 和 `email`，**不更新 `role`**。  
`role` 初始值来自 server 端 `getCurrentUser()`，此后不再刷新。若将来支持用户角色变更，客户端 `role` 不会同步。

**T8 迁移方案**：
- `layout.tsx` 改为非 async，移除 `getCurrentUser()`，`Providers` 的 `initialAuth/initialRole/initialEmail` 均传 `false/null/null`
- `AuthContextProvider` 在 mount 时调用 `GET /api/auth/me` 获取真实值，并在每次 `onAuthStateChange` 触发时重新调用（而不是只从 session 取 email）
- 首次加载会有一次短暂的"未登录"初始状态（约 1 次 RTT），middleware 已保护路由不会导致错误跳转，但 Sidebar/TopBar 会有短暂 flash → **需在 T8 中处理 loading 态**

**发现 2 — `proxy.ts` 不检查 admin 角色，admin 路由无 role 保护**

`proxy.ts` 中间件仅检查用户是否已登录，不检查 `role === "admin"`。  
`admin/layout.tsx` 中的 `requireAdmin()` 是当前唯一的 admin 角色门卫。  
若将 `admin/layout.tsx` 改为 client component，普通用户将能访问 `/admin/**`（API 层仍有 `requireAdmin()` 保护，但页面会可见）。

**T6 前置条件（新增）**：必须先在 `proxy.ts` 中添加 `/admin` 路由的 role 检查，才能移除 `admin/layout.tsx` 的 server 端 auth。  
或保守做法：**`admin/layout.tsx` 保持 server component 只做 auth check**（不渲染数据），admin 子页面改为 client component——这样无需改 middleware。

**发现 3 — T5 范围极小**

所有迁移所需 API 均已存在，不需要新增 API 端点。T5 可缩减为：
- `AuthContextProvider` 调用 `onAuthStateChange` 后补充调用 `/api/auth/me` 更新 role（合并进 T8）
- `AdminUsersWorkspace` 需从 `/api/auth/me` 取 `actorId`（合并进 T6）

**T5 可关闭**，相关调整并入 T6/T8。

---

#### 对任务依赖的影响

- T6 新增前置：**先在 `proxy.ts` 补 admin role 检查**（或采用保守方案保留 server layout）；这是 T6 内的第一步，不单独成任务
- T8 实施需同步修复 AuthContext 的 `role` 更新逻辑
- T5 关闭，并入 T6/T8

---

## Phase 1 — 独立改进（无阻塞依赖，可并行启动）

### T1 · [refactor] Admin sidebar 可折叠，与主 sidebar 行为一致

**来源**：Roadmap 条目 7  
**范围**：`src/components/admin/AdminSidebar.tsx`（主要），`AdminShell.tsx`（次要）

当前问题：`AdminSidebar` 是固定导航，无折叠能力；`AppSidebar` 用 shadcn `<Sidebar collapsible="icon">`。

实施要点：
1. 将 `AdminSidebar` 改用 `<Sidebar collapsible="icon">` 包装，与 `AppSidebar` 样式保持一致
2. 在 `AdminShell.tsx` 中引入 `<SidebarProvider>`（或复用已有 provider）
3. 保留 admin 独立 layout（不合并到主 `providers.tsx`），避免路由权限混用

**依赖**：无  
**状态**：⬜ 待做  
**风险**：🟡 中（影响 admin 所有页面视觉，需验证响应式）

---

### T2 · [feature] 页面切换导航进度条

**来源**：Roadmap 条目 4  
**范围**：`src/app/providers.tsx`（新增 1 个 provider）

当前问题：App Router 下没有 `router.events`，点击链接无视觉反馈。

实施要点：
1. 安装 `nprogress`（或 `nextjs-toploader`）
2. 在 `providers.tsx` 中用 `usePathname` + `useEffect` 驱动进度条
3. 在 `globals.css` 中添加进度条颜色变量

**依赖**：无  
**状态**：⬜ 待做  
**风险**：🟢 低

---

### T3 · [feature] 补全各页面 loading skeleton

**来源**：Roadmap 条目 5  
**范围**：新增 `loading.tsx`，不改现有页面逻辑

当前缺失：`/chat/[id]`、`/admin`、`/admin/documents`、`/admin/users` 均无 `loading.tsx`。

实施要点：
1. 为上述路由各新增 `loading.tsx`，使用 `<Skeleton>` 组件
2. 骨架屏形状与对应页面主体结构匹配
3. 不在此任务中改动页面本体（留给 Phase 3）

**注意**：Phase 3 将 server component 转为 client component 后，`loading.tsx` 的触发时机会改变（Suspense boundary 而非 RSC streaming）。届时需检查是否仍生效，必要时迁移为 `<Suspense>` fallback。

**依赖**：无（可先做，Phase 3 后需复查）  
**状态**：⬜ 待做  
**风险**：🟢 低

---

## Phase 2 — API 基础巩固

### T4 · [refactor] API schema 覆盖率审计与统一

**来源**：Roadmap 条目 2  
**范围**：`src/app/api/**`，`src/lib/schemas/`

当前问题：schemas 已存在但未知覆盖率，部分路由可能直接用 `req.json()` 而不经 zod 校验。

实施要点：
1. 逐个检查每条 API 路由的 request body/query 校验方式
2. 将未使用 schema 的路由补充接入 `src/lib/schemas/` 中对应 schema
3. 统一 error response 格式（`{ error: string }`）

**依赖**：无  
**状态**：⬜ 待做  
**风险**：🟡 中（需逐路由审计，改动面较广）

---

### T5 · [feature] 补全 client-side 所需 API（T0 的输出决定范围）

**来源**：Roadmap 条目 1、2  
**范围**：由 T0 审计结果确定，预期较小

已知可能缺失：无（初步判断现有 API 已覆盖 Phase 3 所需数据）。T0 完成后确认。

**依赖**：T0  
**状态**：⬜ 待做（范围待定）  
**风险**：🟢 低（预计 T0 后确认无需新增）

---

## Phase 3 — Server Component → Client Component 迁移

> **前置条件**：T0 完成（确认 API 覆盖）、T4 完成（API 健壮性）、T1 完成（admin layout 稳定）

### T6 · [refactor] Admin 页面迁移为 client component

**来源**：Roadmap 条目 1  
**范围**：`admin/page.tsx`、`admin/documents/page.tsx`、`admin/users/page.tsx`、`admin/layout.tsx`

当前：4 个 async server component，`admin/layout.tsx` 调用 `requireAdmin()`。

实施要点：
1. 确认 `proxy.ts` 中间件已保护 `/admin/**`（否则先加）
2. 将 admin 页面改为 `"use client"` + `useEffect` 调用对应 `/api/admin/*`
3. `admin/layout.tsx` 移除 `requireAdmin()` server 调用，改为纯 client layout

**依赖**：T0, T1, T4  
**状态**：⬜ 待做  
**风险**：🔴 高（涉及 auth 安全边界，中间件必须正确覆盖后才能动）

---

### T7 · [refactor] Knowledge 页面迁移为 client component

**来源**：Roadmap 条目 1  
**范围**：`src/app/knowledge/page.tsx`

当前：async server component，服务端获取 document 列表。

实施要点：
1. 改为 `"use client"` + `useEffect` 调用 `/api/documents`
2. 利用 T3 添加的 `loading.tsx` 作为初始加载状态
3. 保留现有上传/列表/删除交互逻辑不变

**依赖**：T0, T4  
**状态**：⬜ 待做  
**风险**：🟡 中

---

### T8 · [refactor] Root layout 去除 server 端数据获取

**来源**：Roadmap 条目 1  
**范围**：`src/app/layout.tsx`、`src/app/providers.tsx`

当前：`layout.tsx` 调用 Supabase 读取 session，将 `isAuthenticated` 传给 providers。  
已有：`src/context/auth-context.tsx` 通过 `onAuthStateChange` 提供响应式 `isAuthenticated`。

实施要点：
1. 确认 `auth-context.tsx` 的 `isAuthenticated` 已覆盖所有使用 `isAuthenticated` prop 的组件
2. `layout.tsx` 改为非 async，移除 Supabase session 读取
3. `providers.tsx` 中依赖 `isAuthenticated` 的逻辑改为消费 `AuthContext`

**风险提示**：首次加载会有短暂的 `isAuthenticated=false`（auth-context 初始化前），需确保不会导致 sidebar/topbar 闪烁或跳转。

**依赖**：T0  
**状态**：⬜ 待做  
**风险**：🔴 高（auth 状态初始化时序问题，需充分测试）

---

### T9 · [refactor] Chat 页面去除服务端 session 水合

**来源**：Roadmap 条目 1  
**范围**：`src/app/chat/[id]/page.tsx`

当前：服务端获取 `initialSession` 传给 `ChatWindow`。

实施要点：
1. `chat/[id]/page.tsx` 改为非 async，不传 `initialSession`
2. `ChatWindow` 改为在 mount 时调用 `/api/sessions/[id]` 获取数据
3. 加入加载状态（skeleton 或 spinner）

**依赖**：T0, T4  
**状态**：⬜ 待做  
**风险**：🟡 中（首次加载体验退化，需 skeleton 兜底）

---

## Phase 4 — 其他改进（Roadmap 条目 3、6、8）

### T10 · [analysis] 首页加载优化分析

**来源**：Roadmap 条目 3

Phase 3 完成后，sign-in 和 about 页面的加载路径会改变，再做针对性分析：
- about 页面保持 server component，考虑静态化（`export const dynamic = 'force-static'`）
- sign-in 页面是否有不必要的 bundle 引入

**状态**：⬜ 待做（等 Phase 3 稳定后分析）

---

### T11 · [analysis] 全系统架构一致性报告

**来源**：Roadmap 条目 6、8

Phase 3 完成后，形成最终架构描述，识别剩余不一致点并提出改进建议。

**状态**：⬜ 待做（等 Phase 3 稳定后分析）

---

## 任务总表

| ID | 类型 | 标题 | 依赖 | 风险 | 状态 |
|----|------|------|------|------|------|
| T0 | analysis | Server Component 数据依赖审计 | — | 🟢 | ✅ |
| T1 | refactor | Admin sidebar 可折叠 | — | 🟡 | ⬜ |
| T2 | feature | 页面切换导航进度条 | — | 🟢 | ⬜ |
| T3 | feature | 补全各页面 loading skeleton | — | 🟢 | ⬜ |
| T4 | refactor | API schema 覆盖率审计与统一 | — | 🟡 | ⬜ |
| T5 | ~~feature~~ | ~~补全 client-side 所需 API~~ | — | — | ❌ 关闭，并入 T6/T8 |
| T6 | refactor | Admin 页面 → client component（含 proxy.ts admin role 检查） | T0,T1,T4 | 🔴 | ⬜ |
| T7 | refactor | Knowledge 页面 → client component | T0,T4 | 🟡 | ⬜ |
| T8 | refactor | Root layout 去除 server 端数据获取 + 修复 AuthContext role 更新 | T0 | 🔴 | ⬜ |
| T9 | refactor | Chat 页面去除服务端 session 水合 | T0,T4 | 🟡 | ⬜ |
| T10 | analysis | 首页加载优化分析 | Phase 3 | — | ⬜ |
| T11 | analysis | 全系统架构一致性报告 | Phase 3 | — | ⬜ |

---

## 建议启动顺序

**立即可做（并行）**：T0、T1、T2、T3、T4  
**T0+T4 完成后**：T5、T7、T8、T9  
**T0+T1+T4 完成后**：T6  
**Phase 3 全部完成后**：T10、T11
