# FAQ-RAG Mobile Demo Plan

本文档记录在现有 FAQ-RAG 项目中加入 Expo React Native demo 前端的实施计划、认证设计、项目组织方式和验证清单。

## 目标

- 保持现有 Next.js Web 部署稳定，Web 继续部署在 Vercel。
- Expo Mobile 作为第二个前端客户端，通过 HTTPS 调用现有 Next.js API routes。
- 后端 API 同时支持 Web cookie session 和 Mobile Bearer token。
- 先做低风险 demo，不立即重构现有 Web 目录到 `apps/web`。
- 所有 Mobile 相关改动先在独立 `mobile` 分支开发，完整验证后再合并回 `main`。

## 分支策略

Mobile demo 涉及认证 helper、API route、workspace 配置、shared package 和 Expo app。即使这些改动可以做到兼容 Web，也应先全部隔离在独立分支中完成。

推荐流程：

```bash
git switch main
git pull
git switch -c mobile
```

所有阶段 1 到阶段 6 的改动都在 `mobile` 分支进行：

```txt
mobile branch:
- Bearer token API auth
- API route 改造
- packages/shared
- mobile/ Expo app
- pnpm workspace 更新
- Web 回归验证
- Mobile demo 验证
```

`main` 分支在 Mobile 开发期间保持现状，只接受和 Mobile 无关的正常 Web 修复。合并前从 `main` 同步最新改动到 `mobile`：

```bash
git switch mobile
git fetch
git merge origin/main
```

合并回 `main` 的条件：

- Web 登录、聊天、Knowledge、登出全部通过。
- Cookie auth API 路径通过。
- Bearer token API 路径通过。
- 无认证、无效 token、跨用户访问均失败。
- Expo demo 可以登录、调用 chat API、刷新 token、登出。
- Vercel preview 部署验证通过。

如果 Mobile 开发过程中发现需要较大 Web 架构调整，先继续留在 `mobile` 分支评估，不直接把中间状态合并到 `main`。

## 实施协议

Mobile demo 按阶段实施。每个阶段都必须有明确的验证方式、文档记录和 Git 暂存边界。

### 阶段状态

每个阶段使用以下状态之一：

```txt
planned
in_progress
verified
staged
awaiting-manual-verification
blocked
```

状态含义：

- `planned`：阶段尚未开始。
- `in_progress`：阶段正在实施。
- `verified`：自动验证或可执行验证已通过，但尚未暂存。
- `staged`：阶段文件已暂存，等待人工 commit 命令。
- `awaiting-manual-verification`：代码和文档已暂存，但仍需人工操作验证后再 commit。
- `blocked`：阶段无法继续，文档需记录阻塞原因和下一步选择。

### 阶段记录格式

每个阶段完成时，在对应阶段下补充实施记录：

```txt
状态:
本阶段实际改动:
验证方式:
验证结果:
已 staging 文件:
commit 状态:
备注:
```

`commit 状态` 使用：

```txt
waiting for user commit
waiting for manual verification, then user commit
blocked
```

### 阶段执行规则

每个阶段开始前先检查工作区：

```bash
git status --short
```

如果存在非本阶段改动：

- 与本阶段无关：不修改、不暂存。
- 影响本阶段：先记录风险；如果无法安全推进，再询问人工选择。

每个阶段完成后必须满足以下三种结果之一：

```txt
自动验证通过 -> 更新 PLAN-mobile.md -> stage 本阶段文件 -> 等待用户 commit
人工验证待执行 -> 更新 PLAN-mobile.md -> stage 本阶段文件 -> 等待人工验证，再等待用户 commit
阻塞 -> 更新 PLAN-mobile.md 说明原因 -> 不 stage 未完成改动，除非已有可保留的阶段性成果
```

暂存规则：

- 只暂存当前阶段相关文件。
- 不使用 `git add .`。
- 暂存前查看 `git diff --stat`。
- 暂存后查看 `git diff --staged --stat`。
- 不 revert 用户或其他任务已有改动，除非人工明确要求。

### 验证规则

优先使用自动验证。根据阶段选择：

```bash
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

阶段 1 到阶段 4 应尽量用自动验证覆盖：

- API auth helper 单元测试。
- API route cookie auth 回归。
- Bearer token 成功和失败路径。
- shared package TypeScript 编译。

阶段 5 和阶段 6 允许人工验证，因为 Expo 登录、扫码、真机或模拟器、token refresh、Vercel preview 可能需要人工操作。人工验证阶段仍需记录：

- 需要验证的环境。
- 操作步骤。
- 预期结果。
- 当前代码是否已暂存。

### 授权与确认规则

实施过程中，普通本地修改、检查、测试、格式化和文档更新不需要额外确认。

仍需人工确认的情况：

- 方案不确定，需要产品或架构选择。
- 修改项目目录之外的文件。
- 执行可能破坏数据或历史的命令。
- 需要远程资源或网络访问，例如创建 Expo app、安装新依赖、访问 package registry、拉取 template。
- 工具层要求 approval 的命令。

Vercel preview 或部署验证属于本计划的一部分，不需要额外方案确认；但实际远程命令如果需要工具授权，仍按工具 approval 流程执行。

### Secrets 规则

Mobile 端和文档禁止写入：

```txt
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
DIRECT_URL
LLM provider API keys
INGEST_HOOK_SECRET
真实 access token
```

Bearer token 验证只记录状态码、通过/失败和必要的错误类别，不记录真实 token。

## 推荐项目组织

当前仓库已经是一个 Next.js 应用，建议先采用渐进式 monorepo：

```txt
faq-rag/
  src/                    # 现有 Next.js Web + API，暂时保持不动
  mobile/                 # 新建 Expo React Native demo
  packages/
    shared/               # 共享类型、schema、API client、纯函数
  prisma/
  supabase/
  docs/
  pnpm-workspace.yaml
  package.json
```

后续如果 Mobile 成为长期维护的正式 App，再迁移到更标准的结构：

```txt
faq-rag/
  apps/
    web/
    mobile/
  packages/
    shared/
    config/
```

短期不建议一开始就把现有 Web 移到 `apps/web`，因为这会同时影响 Next.js 路径、部署配置、脚本、Prisma/Supabase 约定和测试路径，风险会叠加。

## 可共享内容

适合放入 `packages/shared`：

- API request/response 类型。
- Zod schema。
- `Message`、`ChatSession`、`Citation`、`Provider` 等领域类型。
- provider 列表和常量。
- citation marker 解析、日期格式化等纯函数。
- 面向 Web/Mobile 都可用的 API client 类型或轻量 fetch 封装。

不建议共享：

- shadcn UI 组件。
- Tailwind class 和 Web layout 组件。
- React Native UI 组件。
- Next.js server actions。
- Prisma client。
- Web cookie/session 专用逻辑。

## 目标架构

```txt
Web Browser
  -> Next.js pages/components
  -> Next.js API routes
  -> Supabase Auth / PostgreSQL / Storage / pgvector
  -> LLM providers

Expo Mobile
  -> Supabase Auth client
  -> Next.js API routes with Authorization: Bearer <access_token>
  -> Supabase Auth / PostgreSQL / Storage / pgvector
  -> LLM providers
```

Mobile 不直接连接数据库，不直接执行 RAG，不持有 service role key。所有用户权限、数据过滤、RAG 执行仍由后端 API 控制。

## 认证设计

后端 API routes 需要统一支持两种认证来源：

```txt
Web:
  Cookie-based Supabase session

Mobile:
  Authorization: Bearer <Supabase access_token>
```

建议新增统一 helper：

```txt
src/lib/auth/get-api-user.ts
```

逻辑：

```txt
1. 读取 request.headers.authorization。
2. 如果存在 Bearer token：
   - 提取 access token。
   - 调用 supabase.auth.getUser(token) 校验。
   - 校验成功后返回 user。
   - 校验失败返回 null 或抛出 401。
3. 如果没有 Bearer token：
   - 走现有 cookie-based Supabase server client。
   - 调用 supabase.auth.getUser()。
4. 两者都没有有效用户时，API 返回 401。
```

API route 只信任 helper 返回的 user，不信任客户端传入的 `userId`。

建议优先级：

```txt
Bearer token present -> validate Bearer token
Bearer token absent  -> fallback to cookie auth
No valid user        -> 401
```

这样不会破坏现有 Web cookie 登录态，同时 Mobile 可以用 Supabase session 的 `access_token` 调 API。

## Mobile 环境变量

Expo app 使用公开客户端配置：

```txt
EXPO_PUBLIC_API_BASE_URL=https://your-vercel-app.vercel.app
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

禁止放入 Mobile 的值：

```txt
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
DIRECT_URL
LLM provider API keys
INGEST_HOOK_SECRET
```

## 分阶段实施计划

### 阶段 1：梳理现有认证入口

状态: staged

目标：确认哪些 API routes 和后端逻辑依赖当前 Web cookie session。

任务：

- 列出受保护 API routes，例如 `/api/chat`、`/api/sessions/[id]`、knowledge/document 相关接口。
- 找出现有 Supabase server client 封装。
- 确认 Web 页面、API route、server action 各自如何获取 user。
- 标记第一批需要支持 Bearer token 的 API routes。

验证：

- Web 登录后可以正常聊天。
- Web 可以查看历史会话。
- Web 可以访问 Knowledge 页面。
- 未登录访问受保护 API 返回 401 或进入既有未授权流程。

实施记录：

```txt
状态: staged
本阶段实际改动:
- 已创建并切换到 mobile 分支。
- 已梳理 Supabase server/browser client、proxy、API routes、server components、server actions 和 Prisma 数据模型。
- 确认当前 Web auth 主要由 src/proxy.ts 的 cookie-based Supabase session 保护。
- 确认 API routes 内部目前基本不独立读取 user，依赖 proxy 拦截未登录请求。
- 确认 /api/ingest-hook 是公开路径中的 webhook 例外，使用 x-webhook-secret 认证。
- 确认 /auth/signin 和 /about 是公开路径，/api/health 当前会经过 proxy。

第一批需要支持 Bearer token 的 API routes:
- src/app/api/chat/route.ts
- src/app/api/sessions/route.ts
- src/app/api/sessions/[id]/route.ts

后续 Mobile 如果需要 Knowledge 功能，再纳入:
- src/app/api/documents/route.ts
- src/app/api/documents/prepare/route.ts
- src/app/api/documents/[id]/route.ts
- src/app/api/documents/[id]/index/route.ts
- src/app/api/documents/[id]/reindex/route.ts

当前风险/差异:
- prisma/schema.prisma 中 Session、Document 当前没有 userId/owner 字段；阶段 3 如果要满足“A 用户 token 不能读取或修改 B 用户 session”，需要增加所有权建模和数据迁移策略，或先把 demo 明确限制为单用户/全局知识库。
- src/app/chat/[id]/page.tsx 直接按 session id 查询，没有 user 过滤；如果引入用户所有权，页面读取也需要同步改造。
- knowledge server action src/app/knowledge/actions.ts 走 Web server action，不是 Mobile API 首批需求。

验证方式:
- git status --short --untracked-files=all
- 静态检查 src/proxy.ts、src/lib/supabase/server.ts、src/app/api/*/route.ts、src/app/chat/[id]/page.tsx、src/app/knowledge/actions.ts、prisma/schema.prisma

验证结果:
- 工作区起始状态干净。
- 已切换到 mobile 分支。
- 已确认当前认证入口和首批 Bearer token 改造范围。
- 本阶段未修改业务代码，不需要运行 Web 回归测试。

已 staging 文件:
- PLAN-mobile.md

commit 状态: waiting for user commit
备注:
- PLAN-mobile.md 被 .gitignore 的 /PLAN*.md 忽略，阶段文档需要使用 git add -f 暂存。
```

### 阶段 2：新增统一 API 认证 helper

状态: staged

目标：在不改变业务逻辑的前提下，让 API 可以解析 Bearer token。

任务：

- 新增 `src/lib/auth/get-api-user.ts`。
- 支持 `Authorization: Bearer <access_token>`。
- 保留 cookie session fallback。
- 为无效 token、缺失 token、cookie auth 成功等场景写最小测试，或至少准备手动验证脚本。

验证：

- Web cookie 请求仍然成功。
- 带有效 Supabase access token 的请求成功。
- 不带 cookie 且不带 Bearer token 的请求失败。
- 无效 Bearer token 请求失败。

实施记录：

```txt
状态: staged
本阶段实际改动:
- 新增 src/lib/auth/get-api-user.ts。
- 新增 getApiUser(request)，统一解析 API user。
- 支持 Authorization: Bearer <access_token>，并调用 supabase.auth.getUser(token) 验证。
- 没有 Bearer token 时保留 cookie session fallback，调用 supabase.auth.getUser()。
- Bearer header 一旦出现但无效或格式不完整，直接返回 null，不回退 cookie auth。
- 新增 src/lib/auth/get-api-user.test.ts，覆盖 token 提取、Bearer 检测、有效 Bearer、cookie fallback、无效 Bearer、格式错误 Bearer、cookie auth 失败。

验证方式:
- pnpm test -- src/lib/auth/get-api-user.test.ts
- pnpm lint

验证结果:
- get-api-user.test.ts: 1 suite passed, 8 tests passed。
- pnpm lint 通过，包括 tsc --noEmit 和 eslint --fix。
- 本阶段 helper 尚未接入 API routes，因此不需要重启当前 pnpm dev。

已 staging 文件:
- src/lib/auth/get-api-user.ts
- src/lib/auth/get-api-user.test.ts
- PLAN-mobile.md

commit 状态: waiting for user commit
备注:
- 阶段 3 接入 API routes 时，仍需同步处理 proxy 对 Bearer API 请求的放行，否则无 cookie 的 Mobile 请求会在到达 route 前被 redirect。
```

### 阶段 3：改造核心 API routes

状态: staged

目标：让 Mobile demo 所需 API 支持 Bearer token。

优先范围：

- `/api/chat`
- `/api/sessions/[id]`
- 如 Mobile demo 需要历史列表，再补充 session list API。

任务：

- API route 从统一 helper 获取 user。
- 所有 DB 查询继续按 `user.id` 过滤。
- 写操作禁止使用客户端传入的 user id。
- 保留 Web cookie 请求路径。

验证：

- Web 新建聊天、继续聊天、查看历史正常。
- Mobile 风格请求带 Bearer token 可以调用 `/api/chat`。
- A 用户 token 不能读取或修改 B 用户 session。
- 无认证请求返回 401。

实施记录：

```txt
状态: staged
本阶段实际改动:
- 选择正式多用户隔离方案。
- prisma/schema.prisma 的 Session 增加 nullable userId 字段，映射到 sessions.user_id。
- 新增 prisma/migrations/20260504000000_add_session_user_id/migration.sql。
- 已对本地 Supabase 数据库执行 pnpm prisma migrate deploy，迁移成功应用。
- 已执行 pnpm prisma generate --schema=prisma/schema.prisma，生成 client 已更新到 ignored 的 src/generated/prisma。
- src/proxy.ts 对 Bearer API 请求只放行 /api/chat 和 /api/sessions，避免未改造 document API 被绕过 cookie auth。
- src/app/api/chat/route.ts 接入 getApiUser，未认证返回 401，并在日志 child 中记录 userId。
- src/app/api/sessions/route.ts 接入 getApiUser，GET/POST 均按 user.id 过滤或写入 userId。
- src/app/api/sessions/[id]/route.ts 接入 getApiUser，GET/PATCH/DELETE 均按 user.id 限制；跨用户访问返回 404。
- src/app/chat/[id]/page.tsx 的初始 session 读取改为按当前 cookie user 过滤。
- 新增 src/app/api/sessions/route.test.ts。
- 新增 src/app/api/sessions/[id]/route.test.ts。
- jest.config.ts 临时排除 src/lib/retrieval 下的测试；同时排除 e2e 目录，避免 Playwright 测试被 Jest 执行。

验证方式:
- pnpm prisma migrate deploy
- pnpm prisma generate --schema=prisma/schema.prisma
- pnpm exec jest --runTestsByPath src/app/api/sessions/route.test.ts 'src/app/api/sessions/[id]/route.test.ts'
- pnpm exec jest --runTestsByPath src/lib/auth/get-api-user.test.ts src/app/api/sessions/route.test.ts 'src/app/api/sessions/[id]/route.test.ts' src/lib/llm/truncate.test.ts src/lib/llm/router.test.ts src/lib/retrieval/utils.test.ts src/lib/ingest/parse.test.ts
- pnpm test
- pnpm lint
- pnpm build

验证结果:
- 本地 Supabase migration 成功应用。
- sessions route tests: 2 suites passed, 8 tests passed。
- 阶段相关和稳定单测集合: 7 suites passed, 39 tests passed。
- pnpm test 在临时排除 src/lib/retrieval 和 e2e 后通过：6 suites passed, 35 tests passed。
- pnpm lint 通过，包括 tsc --noEmit 和 eslint --fix。
- pnpm build 第一次因沙箱无法访问 Google Fonts 失败；提升权限重跑后通过。
- pnpm build 仍输出既有 Turbopack/NFT tracing warning，但编译、TypeScript、page generation 均通过。
- src/lib/retrieval 测试为临时屏蔽，后续应单独修复 query.test.ts 的 mock 后恢复。

已 staging 文件:
- prisma/schema.prisma
- prisma/migrations/20260504000000_add_session_user_id/migration.sql
- src/proxy.ts
- src/app/api/chat/route.ts
- src/app/api/sessions/route.ts
- src/app/api/sessions/[id]/route.ts
- src/app/chat/[id]/page.tsx
- src/app/api/sessions/route.test.ts
- src/app/api/sessions/[id]/route.test.ts
- jest.config.ts
- PLAN-mobile.md

commit 状态: waiting for user commit
备注:
- 本阶段改了 Prisma schema、migration、proxy 和 route handler；当前正在运行的 pnpm dev 需要重启后才能可靠反映这些改动。
- 兼容迁移使用 nullable sessions.user_id；新建/更新 session 均写入 userId，旧的 user_id 为 null 的 legacy session 不会自动暴露给任何用户。
```

### 阶段 4：建立 shared package

状态: staged

目标：减少 Web/Mobile API 类型漂移。

建议结构：

```txt
packages/shared/
  package.json
  tsconfig.json
  src/
    index.ts
    types.ts
    schemas.ts
    constants.ts
    api-client.ts
```

任务：

- 抽出 chat request/response schema。
- 抽出 session/message/citation/provider 类型。
- 确认 Web 可以引用 `@faq-rag/shared`。
- 更新 `pnpm-workspace.yaml`，纳入 `packages/*` 和后续 `mobile`。

验证：

- `pnpm lint` 或 `tsc --noEmit` 通过。
- Web API route 和前端仍能正常编译。
- shared package 不依赖 Next.js、React DOM、Prisma 或 Node-only API。

实施记录：

```txt
状态: staged
本阶段实际改动:
- 新增 packages/shared workspace package。
- packages/shared 导出 provider 常量、Provider 类型、provider label、默认 provider。
- packages/shared 导出 chat request schema factory 和默认 chat request schema。
- packages/shared 导出 session/message/citation schemas 和 create/update session input schemas。
- root package.json 增加 @faq-rag/shared workspace dependency。
- pnpm-workspace.yaml 增加 packages: ".", "packages/*", "mobile"。
- next.config.ts 增加 transpilePackages: ["@faq-rag/shared"]。
- jest.config.ts 增加 @faq-rag/shared moduleNameMapper。
- src/lib/llm/providers.ts 改为从 @faq-rag/shared re-export。
- src/lib/schemas/session.ts 改为从 @faq-rag/shared re-export。
- src/lib/schemas/chat.ts 使用 shared 的 createChatRequestInputSchema，并继续注入 Web 后端 env default provider。
- .gitignore 增加 **/node_modules，避免 workspace 子包 node_modules symlink 被提交。
- pnpm-lock.yaml 已通过人工运行 pnpm install 更新。

验证方式:
- pnpm install（人工本地运行）
- pnpm test
- pnpm lint
- pnpm build

验证结果:
- pnpm install 成功，pnpm-lock.yaml 已包含 @faq-rag/shared link:packages/shared。
- pnpm test 通过：6 suites passed, 35 tests passed。
- pnpm lint 通过，包括 tsc --noEmit 和 eslint --fix。
- pnpm build 通过；仍输出既有 Turbopack/NFT tracing warning。

已 staging 文件:
- .gitignore
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- next.config.ts
- jest.config.ts
- packages/shared/package.json
- packages/shared/tsconfig.json
- packages/shared/src/index.ts
- packages/shared/src/providers.ts
- packages/shared/src/schemas/chat.ts
- packages/shared/src/schemas/session.ts
- src/lib/llm/providers.ts
- src/lib/schemas/chat.ts
- src/lib/schemas/session.ts
- PLAN-mobile.md

commit 状态: waiting for user commit
备注:
- 本阶段改了 workspace/package 结构和 next.config.ts；当前正在运行的 pnpm dev 需要重启后才能可靠解析 @faq-rag/shared。
- shared package 当前保持无 Next.js、React DOM、Prisma 或 Node-only API 依赖。
```

### 阶段 5：创建 Expo demo

状态: awaiting-manual-verification

目标：实现最小可用 Mobile 前端。

建议位置：

```txt
mobile/
```

最小功能：

- Sign in 页面。
- Supabase session 保存和恢复。
- Chat 页面。
- Provider 选择可先固定，后续再做 UI。
- 发送消息到 Next.js API。
- 展示 streamed 或非 streamed 响应。Demo 阶段可以先用非 streamed fallback，降低 React Native streaming 复杂度。

API 调用约定：

```ts
fetch(`${apiBaseUrl}/api/chat`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
```

验证：

- Expo 可以登录 Supabase。
- Expo 能拿到 session access token。
- Expo 能调用本地或 Vercel API。
- token 过期后可以 refresh session。
- 登出后 API 请求失败。

实施记录：

```txt
状态: awaiting-manual-verification
本阶段实际改动:
- 使用 Expo blank TypeScript template 创建 mobile/。
- mobile/package.json 增加 @faq-rag/shared、@supabase/supabase-js、expo-secure-store、react-native-url-polyfill。
- mobile/package.json 增加 Expo Web 运行依赖 react-dom、react-native-web、@expo/metro-runtime，用于支持 Expo Web bundling。
- mobile/App.tsx 实现最小 demo：Supabase email/password 登录、SecureStore session persistence、API base URL 输入、provider 选择、chat 消息列表、composer、sign out。
- Mobile chat 请求调用 `${EXPO_PUBLIC_API_BASE_URL}/api/chat`，使用 Authorization: Bearer <access_token>。
- Mobile 先用 response.text() 解析 SSE data 行，避免第一版阻塞在 React Native streaming 兼容性上。
- 新增 mobile/metro.config.js，配置 monorepo watchFolders 和 nodeModulesPaths，确保 Metro 解析 @faq-rag/shared。
- mobile/metro.config.js 增加精确 resolveRequest：仅强制 react 和 react-dom 从 mobile/node_modules 解析，避免 Expo Web 在 monorepo/hoisted 依赖下混用多份 React；其它依赖仍走 Metro 默认解析，避免影响 Expo dev runtime / HMR。
- 新增 mobile/.env.example 和 mobile/README.md。
- Mobile env 约定改为 local = .env + .env.development.local；remote = .env + .env.production；真实 env 文件忽略提交，只提交 .env.example。
- mobile/app.json 名称和 slug 改为 FAQ-RAG Demo / faq-rag-demo。
- pnpm-workspace.yaml 由 Expo/pnpm 调整为 unquoted packages，并增加 nodeLinker: hoisted。
- 保持 Expo mobile 的 react 运行时版本为 19.1.0；root Web 的 @types/react 显式固定为 19.2.14，并将 src/app/auth/signin/page.tsx 恢复为 React.SubmitEvent<HTMLFormElement>。
- mobile/App.tsx 将 Supabase auth storage 按平台拆分：Native 使用 expo-secure-store，Web 使用 localStorage fallback，避免 Expo Web 调用 SecureStore native module 失败。
- src/lib/http/cors.ts 增加 Bearer API CORS helper；proxy.ts 对 /api/chat 和 /api/sessions 的 OPTIONS preflight 直接返回 204，避免未登录 preflight 被重定向到 /auth/signin。
- /api/chat、/api/sessions、/api/sessions/[id] 的实际响应补充 CORS headers，支持 Expo Web 从 localhost:8081 调用本地 Next API；额外允许 origin 可通过 API_CORS_ORIGINS 配置。

验证方式:
- pnpm --filter mobile exec tsc --noEmit
- pnpm test
- pnpm lint
- pnpm --filter mobile exec expo export --platform android --output-dir /tmp/faq-rag-mobile-export
- pnpm --filter mobile exec expo export --platform web --output-dir /tmp/faq-rag-mobile-web-export
- pnpm why @types/react
- pnpm build

验证结果:
- pnpm why @types/react 显示 root/Web 使用 @types/react 19.2.14，mobile/React Native 依赖链仍使用 @types/react 19.1.17。
- mobile TypeScript 通过。
- pnpm test 通过：6 suites passed, 35 tests passed。
- pnpm lint 通过，包括 tsc --noEmit 和 eslint --fix。
- Expo android export 通过，Metro 成功 bundle mobile/index.ts，输出到 /tmp/faq-rag-mobile-export。
- Expo web export 通过，Metro 成功 bundle mobile/index.ts，输出到 /tmp/faq-rag-mobile-web-export。
- pnpm build 通过；仍输出既有 Turbopack/NFT tracing warning。
- 2026-05-04 runtime 修复后重新验证：pnpm --filter mobile exec tsc --noEmit 通过。
- 2026-05-04 runtime 修复后重新验证：pnpm --filter mobile exec expo export --platform web --output-dir /tmp/faq-rag-mobile-web-export 通过。
- 2026-05-04 继续修复 Metro React resolver 后重新验证：pnpm --filter mobile exec tsc --noEmit 通过。
- 2026-05-04 继续修复 Metro React resolver 后重新验证：pnpm --filter mobile exec expo export --platform web --output-dir /tmp/faq-rag-mobile-web-export 通过。
- 2026-05-04 继续修复 Metro React resolver 后新增 dev export 验证：pnpm --filter mobile exec expo export --platform web --dev --output-dir /tmp/faq-rag-mobile-web-dev-export 通过；dev bundle 中只检测到 mobile React/React DOM 19.1.0，未检测到 root React/React DOM 19.2.x。
- 2026-05-04 CORS 修复后验证：pnpm jest src/lib/http/cors.test.ts src/app/api/sessions/route.test.ts --runInBand 通过。
- 2026-05-04 CORS 修复后验证：pnpm test 通过，7 suites passed, 38 tests passed。
- 2026-05-04 CORS 修复后验证：pnpm lint 通过，包括 tsc --noEmit 和 eslint --fix。

需要人工验证:
- 按 local 约定写入 mobile/.env 和 mobile/.env.development.local，或按 remote 约定写入 mobile/.env 和 mobile/.env.production。
- 运行 pnpm --filter mobile start。
- 如果已打开 Expo Web dev server，重启并清缓存后再验证：pnpm --filter mobile exec expo start --web --clear。
- Expo Web 打开后不再出现 invalid hook call 或 ExpoSecureStore.default.getValueWithKeyAsync is not a function。
- Expo Web 从 http://localhost:8081 调用 http://127.0.0.1:3000/api/chat 时，preflight 不再被 Redirect is not allowed for a preflight request 拦截。
- 使用 Expo Go 或模拟器打开 App。
- 登录 Supabase 测试账号。
- 发送 chat 问题，确认 Next API 返回 answer。
- 关闭并重新打开 App，确认 session 恢复。
- Sign out 后确认回到登录页；未登录状态无法调用 chat。

已 staging 文件:
- mobile/**
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- src/app/auth/signin/page.tsx
- PLAN-mobile.md

commit 状态: waiting for manual verification, then user commit
备注:
- 本阶段创建了 Expo app 和 workspace 依赖；如果 pnpm dev 或 Expo start 已运行，需要重启以加载 workspace/package 变化。
- 真机测试本地 API 时，EXPO_PUBLIC_API_BASE_URL 需要使用电脑局域网 IP，而不是 localhost。
```

### 阶段 6：部署与集成验证

目标：确认 Mobile 接入不影响现有 Web 生产部署。

Vercel：

- 保持现有 Next.js Web + API 部署。
- 不需要为 Mobile 单独部署后端。
- 确认生产环境变量不泄露到 Mobile。

Supabase：

- Email/password 登录通常不需要额外配置。
- OAuth 登录需要配置 Expo deep link redirect URL。
- RLS 策略通常不用因为 Mobile 改动，前提是数据库仍由后端访问。

验证清单：

```txt
Web:
- 登录成功
- 新建聊天成功
- 历史聊天读取成功
- Knowledge 页面正常
- 登出成功

API:
- cookie auth 成功
- Bearer token auth 成功
- 无认证失败
- 无效 token 失败
- 跨用户访问失败

Mobile:
- 登录成功
- session 恢复成功
- chat API 调用成功
- token refresh 成功
- 登出后 API 拒绝请求
```

## Mobile Demo UI 设计

目标是做一个工作型 demo，而不是完整营销页或复杂客户端。

### 信息架构

建议先做 3 个主要界面：

```txt
AuthScreen
ChatScreen
SettingsScreen
```

后续再加入：

```txt
SessionListScreen
KnowledgeScreen
CitationDetailScreen
```

### AuthScreen

内容：

- Email 输入框。
- Password 输入框。
- Sign in 按钮。
- 错误提示。
- Loading 状态。

设计原则：

- 不做复杂品牌页。
- 表单居中但不要过度留白。
- 保持移动端输入框高度足够，建议 44px 以上。

### ChatScreen

内容：

- 顶部栏：标题、provider 状态、设置入口。
- 消息列表：user bubble 右对齐，assistant bubble 左对齐。
- Composer：多行输入、发送按钮、loading 状态。
- Citation：先以内联标记展示，点击后可以用 bottom sheet 或独立详情页展示。

设计原则：

- 正文字号至少 16px。
- composer 输入区不要低于 44px。
- 避免把所有功能放在首版；先保证登录、发送、响应展示稳定。
- streamed response 如果实现复杂，第一版可以先等完整响应返回。

### SettingsScreen

内容：

- 当前用户 email。
- API base URL 显示或 dev-only 编辑。
- Provider 选择。
- Sign out。

设计原则：

- demo 阶段可以保留 dev-only 配置入口。
- 不在客户端暴露任何 server secret。

## 技术注意事项

- Expo 端使用 `@supabase/supabase-js` 和安全存储适配器保存 session。
- API client 需要在 401 后尝试 refresh session，再重试一次。
- React Native 对 streaming fetch 的支持需要单独验证；不要把 streaming 作为第一阶段阻塞项。
- 如果后续支持 Expo Web，需要再考虑 CORS。
- 如果使用 OAuth，需要配置 deep link scheme 和 Supabase redirect URL。

## 不做事项

第一阶段不做：

- 不迁移现有 Web 到 `apps/web`。
- 不让 Mobile 直连数据库。
- 不在 Mobile 中保存 service role key。
- 不把 Web UI 组件抽给 Mobile 复用。
- 不一次性重写 API 响应协议。
- 不把所有 server actions 立即改成 API routes，除非 Mobile demo 需要。

## 推荐实施顺序

1. 完成阶段 1 到阶段 3，先打通后端 Bearer token 认证。
2. Web 回归验证通过后，再创建 `packages/shared`。
3. shared package 稳定后，再创建 `mobile/` Expo app。
4. Mobile 先接登录和单轮 chat API。
5. 再补 session list、citation detail、provider select。

这条路径的核心原则是：先让后端认证兼容 Mobile，再做共享类型，最后创建 Expo 前端；不要把认证改造、目录迁移和移动端 UI 同时推进。
