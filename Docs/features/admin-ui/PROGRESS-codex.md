# admin-ui 实施进度

## 当前状态

- 当前阶段：未开始
- 状态：需求已草拟，设计已生成，待确认后启动实施
- 最后确认的实现提交：无
- 最后确认的设计提交：无
- 进度文档状态：已从旧 `admin-pagination` 进度刷新为 `admin-ui`
- 下一步入口：阶段 1 — Admin Shell 与路由拆分（见 [DESIGN.md](./DESIGN.md) 第 13 节）

当前 feature 文档结构为：

- `REQUIREMENTS.md`
- `DESIGN.md`
- `PROGRESS.md`

## 文档一致性检查

- `git status`：`Docs/features/admin-ui/REQUIREMENTS.md`、`DESIGN.md`、`PROGRESS.md` 均为新增文件；另有 `Docs/features/multi-user-e2e/*` 新增文件，与本 feature 无直接关系。
- `REQUIREMENTS.md` 当前状态：草稿，待确认。
- 原 `PROGRESS.md` 和 `DESIGN.md` 均为旧 `admin-pagination` 范围，已机械刷新为 `admin-ui` 范围。
- 最后确认提交之后的 feature 相关实现提交：无。

## 阶段清单

- [ ] 阶段 1：Admin Shell 与路由拆分
- [ ] 阶段 2：用户管理页完善
- [ ] 阶段 3：文档管理页迁移
- [ ] 阶段 4：登录落点与主界面入口
- [ ] 阶段 5：清理与验收

## 已完成工作

- 根据 [REQUIREMENTS.md](./REQUIREMENTS.md) 生成新的 [DESIGN.md](./DESIGN.md)。
- 将进度状态从旧 `admin-pagination` 更新为 `admin-ui`。
- 记录当前实现缺口：
  - 缺少 `src/app/admin/layout.tsx`。
  - 缺少 `/admin/users` 和 `/admin/documents` 子路由。
  - 缺少 admin 专属 TopBar / Sidebar。
  - 缺少修改用户密码 API 和 UI。
  - 登录页无 `from` 时尚未按 admin role 跳转 `/admin`。
  - 后端创建用户 schema 仍允许 `role: "admin"`，与需求"不支持角色升降级"存在待修正点。

## 已知不一致

- `REQUIREMENTS.md` 状态仍为草稿，待产品确认。
- 需求要求文档管理页展示"全站文档列表"且暂不支持分页；现有 API 有分页能力，当前 `/admin` SSR 只取前 50 条。实施阶段 3 需要明确无分页时的数量上限处理。
- 非 admin 访问 `/admin/**` 的验收标准允许"重定向到主界面（或 403）"，设计当前建议页面重定向到 `/chat/new`，API 保持 401/403。

## 验证状态

- `pnpm exec tsc --noEmit`：未运行（仅文档变更）。
- `pnpm exec jest`：未运行（仅文档变更）。
- 人工验证：未进行（尚未实施代码变更）。

## 下一步

启动阶段 1：

1. 调整 `src/app/providers.tsx`，让 `/admin/**` 不再渲染主应用 `TopBar` / `AppSidebar`。
2. 新增 `src/app/admin/layout.tsx` 和 admin 专属 shell 组件。
3. 将 `/admin` 改为 Dashboard，并新增 `/admin/users`、`/admin/documents`。
4. 运行 `pnpm exec tsc --noEmit` 并人工访问 admin 三个路由。

## 恢复协议

恢复此 feature 时：

1. 先读取本文件。
2. 再读取 [DESIGN.md](./DESIGN.md)。
3. 最后读取 [REQUIREMENTS.md](./REQUIREMENTS.md)。
4. 检查 `git status`。
5. 检查最后确认实现提交之后的新提交；如果仍为"无"，以当前工作树文档为准。
6. 检查 `REQUIREMENTS.md`、`DESIGN.md` 或本文件是否在最后确认进度之后发生变化。
7. 如果需求、设计、范围、阶段顺序或验收标准发生冲突，先停下说明不一致。
8. 每次阶段或子阶段提交前，按实际实现状态更新本文件。
