# admin-ui 实施进度

## 当前状态

- 当前阶段：阶段 1 已完成
- 状态：Admin Shell 与路由拆分完成，TypeScript 通过，待人工验证
- 最后确认的实现提交：（见本次提交 SHA）
- 最后确认的设计提交：`35ae5a3`（codex-version）
- 下一步入口：阶段 2 — 用户管理页完善（见 [DESIGN.md](./DESIGN.md) 第 13 节）

当前 feature 文档结构为：

- `REQUIREMENTS.md`（已提交）
- `DESIGN-codex.md`（已提交，参考版）
- `PROGRESS-codex.md`（已提交，参考版）
- `DESIGN.md`（未提交，规范版，内容已与需求对齐）
- `PROGRESS.md`（未提交，规范版，即本文件）

## 文档一致性检查

- `git status`（2026-05-07）：`DESIGN.md`、`PROGRESS.md` 为 untracked（未追踪）；`REQUIREMENTS.md`、`DESIGN-codex.md`、`PROGRESS-codex.md`、`Docs/features/multi-user-e2e/*` 均已在提交 `35ae5a3`（codex-version）中提交。
- `REQUIREMENTS.md` 当前状态：草稿，待确认（文件头部标注）；已纳入版本控制，内容稳定。
- `DESIGN.md` 与 `DESIGN-codex.md` 内容一致（仅 Section 1 措辞有微调），已与 REQUIREMENTS.md 逐项核对，无结构性缺口。
- `PROGRESS.md` 与 `PROGRESS-codex.md` 内容一致（当前状态字段已更新）。
- 最后确认提交之后的 feature 相关实现提交：无（admin-ui 实现尚未开始）。

## 阶段清单

- [x] 阶段 1：Admin Shell 与路由拆分
- [ ] 阶段 2：用户管理页完善
- [ ] 阶段 3：文档管理页迁移
- [ ] 阶段 4：登录落点与主界面入口
- [ ] 阶段 5：清理与验收

## 已完成工作

### 文档准备
- 根据 [REQUIREMENTS.md](./REQUIREMENTS.md) 生成 [DESIGN.md](./DESIGN.md)，已与需求逐项核对，无结构性缺口。
- 将进度状态从旧 `admin-pagination` 更新为 `admin-ui`。

### 阶段 1：Admin Shell 与路由拆分
- `src/app/providers.tsx`：添加 `usePathname()` 分流，`/admin/**` 路径跳过 `AppSidebar` / `TopBar`。
- `src/app/admin/layout.tsx`：Server Component，调用 `requireAdmin()`；非 admin 重定向到 `/chat/new`；渲染 `AdminShell`。
- `src/components/admin/AdminShell.tsx`：管理界面骨架（`h-dvh` 布局，AdminTopBar + AdminSidebar + 内容区）。
- `src/components/admin/AdminTopBar.tsx`："FAQ-RAG Admin" 标题、"回到 FAQ"（`getLastChatHref()`）、主题切换、退出登录。
- `src/components/admin/AdminSidebar.tsx`：独立垂直导航（不依赖 SidebarProvider），三项：仪表板 / 用户管理 / 文档管理。
- `src/app/admin/page.tsx`：改写为 Dashboard（统计卡片 + 最近文档表 + 子页面入口）。
- `src/app/admin/users/page.tsx`：只读用户表（邮箱、角色、注册日期），阶段 2 补操作。
- `src/app/admin/documents/page.tsx`：只读文档表（文件名、所有者、状态、可见性、选择数），阶段 3 补删除。
- `pnpm exec tsc --noEmit`：通过，0 错误。

### 待实施缺口（阶段 2–5）
- 用户管理操作（创建/删除/改密码）→ 阶段 2
- 后端创建用户 schema 仍允许 `role: "admin"` → 阶段 2 收紧
- 文档删除操作 → 阶段 3
- 登录页无 `from` 时按 role 跳转 → 阶段 4
- `AdminWorkspace.tsx` 删除（已无引用）→ 阶段 5

## 已知不一致

- `REQUIREMENTS.md` 状态仍为草稿，待产品确认。
- 需求要求文档管理页展示"全站文档列表"且暂不支持分页；现有 API 有分页能力，当前 `/admin` SSR 只取前 50 条。实施阶段 3 需要明确无分页时的数量上限处理。
- 非 admin 访问 `/admin/**` 的验收标准允许"重定向到主界面（或 403）"，设计当前建议页面重定向到 `/chat/new`，API 保持 401/403。

## 验证状态

- `pnpm exec tsc --noEmit`：通过（阶段 1 完成后）。
- `pnpm exec jest`：未运行（阶段 1 无新 API，既有测试预计无影响）。
- 人工验证：待进行（需验证 /admin、/admin/users、/admin/documents 及主界面不回归）。

## 下一步

启动阶段 2：用户管理页完善

1. 从 `AdminWorkspace.tsx` 提取创建/删除用户逻辑，移入 `AdminUsersWorkspace`。
2. 收紧 `POST /api/admin/users` schema，移除 `role` 字段（固定为 `"user"`）。
3. 新增 `PATCH /api/admin/users/[id]/password` API 和 `update-user-password` 服务。
4. `AdminUsersWorkspace` 接入修改密码弹窗。
5. 运行 Jest API 测试 + `pnpm exec tsc --noEmit`，人工验证创建/删除/改密码。

## 恢复协议

恢复此 feature 时：

1. 先读取本文件（PROGRESS.md）。
2. 再读取 [DESIGN.md](./DESIGN.md)（规范版；如不存在，读 DESIGN-codex.md）。
3. 最后读取 [REQUIREMENTS.md](./REQUIREMENTS.md)。
4. 检查 `git status` 和 `git log`，与"最后确认的实现提交"对比，确认是否有新的 admin-ui 相关提交。
5. 如果"最后确认的实现提交"仍为"无"，以当前工作树文档为准。
6. 检查 `REQUIREMENTS.md`、`DESIGN.md` 或本文件是否在最后确认进度之后发生变化。
7. 如果需求、设计、范围、阶段顺序或验收标准发生冲突，先停下说明不一致。
8. 每次阶段或子阶段提交前，按实际实现状态更新本文件。
9. DESIGN-codex.md 和 PROGRESS-codex.md 是 Codex 生成的参考版本，实施时以 DESIGN.md 和 PROGRESS.md 为准，不修改 codex 版本。
