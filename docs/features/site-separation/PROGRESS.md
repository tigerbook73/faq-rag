# site-separation 进度

## Current Phase

Phase 1: requirements and design confirmed (single sign-in, single session, role-based routing). No implementation has started.

## Last Confirmed Commit

969b6cc

## Confirmed Decisions

- 只有一个 sign-in 页面（`/auth/signin`），user 和 admin 均通过此页面登录。
- 单一 Supabase session；`user_profiles.role` 决定访问权限。
- 登录后按 role 智能跳转（role=admin → `/admin`；role=user → `/chat/last`）。
- `from` 参数存在时优先使用，但若 role 无权访问目标路径则忽略并跳 role home。
- 已登录但 role=user 访问 admin 私有页面 → admin layout 渲染 403 UI，不重定向 sign-in。
- 未登录访问 user 或 admin 私有页面 → 跳 `/auth/signin?from=...`。
- admin 账号可访问 user 站点，user shell 展示，只见自己的数据。
- user shell 中 admin 管理入口按 role 条件渲染：role=admin 可见，role=user 不可见。
- admin shell 可以显示 Chat / Knowledge 等 user 功能快捷入口。
- 只有一个 signout 路由（`/auth/signout`）；user/admin shell 均链接到此。
- 登录逻辑改为服务端 endpoint（`POST /api/auth/signin`），不使用 Server Action 或 browser direct sign-in。
- `requireUser()` 接受 role=admin session（不限 role=user）。
- `requireAdmin()` 明确校验 `role=admin`。
- `/admin/about` 是 admin 私有页面，role=admin 才可访问。

## Design History

- **初始版本**（已废弃）：设计了双 Supabase session（`sb-faq-user-auth` / `sb-faq-admin-auth`），支持同一浏览器不同账号分别登录 user 和 admin 站点。废弃原因：`@supabase/ssr` 自定义 cookie name 的行为未验证，且"同浏览器双账号"需求不是真实业务需求。
- **中间版本**（已废弃）：单一 session + 两个 sign-in 页面（`/auth/signin` 和 `/admin/signin`）。废弃原因：两个 sign-in 创建相同 session，admin 签入后能访问 user site、user 签入后（若 role=admin）也能访问 admin site，两个入口的区别只剩跳转目标，隔离价值不足以支撑维护成本。
- **当前版本**：单一 session + 单一 sign-in + role-aware redirect。隔离收敛到路由命名空间、访问控制（role 校验）、Shell/导航分离、数据权限四个层次。

## Completed Work

- Created `docs/features/site-separation/REQUIREMENTS.md`.
- Created `docs/features/site-separation/DESIGN.md`.
- Created this `PROGRESS.md`.
- Iterated design from dual-session → single-session + dual sign-in → single-session + single sign-in.
- Refined implementation plan to keep `route-policy.ts` and Supabase/auth helpers as focused single-file extensions where practical.

## Known Mismatches

- Existing `docs/features/admin-ui/REQUIREMENTS.md` 仍包含关于站点自由切换、user UI 显示 admin 入口的旧假设；`site-separation` 明确覆盖这些条目。
- 当前实现仍是 browser direct sign-in；尚未做任何代码变更。

## Verification Status

Documentation-only change. No tests or build were run.

## Next Entry Point

Phase 1 实施从以下开始：

1. 在 `src/lib/route-policy.ts` 中扩展 user/admin route classification、`RouteAccess` 类型和路径常量。
2. 添加 `resolvePostLoginRedirect(role, from)`。
3. 补充路由策略测试。

建议第一个实现 commit message：

`site-separation phase 1: add route policy for separated sites`
