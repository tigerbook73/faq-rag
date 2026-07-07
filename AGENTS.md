<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# FAQ RAG 项目总览

单用户 FAQ 问答系统:上传中文或英文文档,用任一语言提问,获得带引用来源的流式回答。无需登录。同一套后端同时服务 Next.js Web 端和 Expo/React Native 移动端。

---

## Monorepo 结构

pnpm workspaces + Turborepo。根目录 `package.json` 中的脚本通过 `turbo run <task> --filter=...` 分发到各个 workspace。

| 目录              | 包名              | 说明                                                                                    | 详细文档                    |
| ----------------- | ----------------- | --------------------------------------------------------------------------------------- | --------------------------- |
| `apps/web`        | `@faq-rag/web`    | Next.js 16 应用 — UI + 全部后端 API 路由 + 数据库访问                                   | `apps/web/AGENTS.md`        |
| `apps/mobile`     | `@faq-rag/mobile` | Expo Router 应用 — 通过 HTTP 调用 `apps/web` 的 API,自身不含服务端代码                  | `apps/mobile/AGENTS.md`     |
| `packages/shared` | `@faq-rag/shared` | 跨平台 Zod schema + 常量(chat/document/session),被 `apps/web` 和 `apps/mobile` 共同引用 | `packages/shared/AGENTS.md` |

每个目录都有自己的 `CLAUDE.md`(仅作入口,内容为 `@AGENTS.md` 导入)和 `AGENTS.md`(实际约定与架构说明)。在对应目录下工作时,优先阅读该目录的 `AGENTS.md`,本文件只记录跨包的全局信息。

---

## 根级命令

```bash
pnpm install                # 一次性,安装所有 workspace

# 开发
pnpm dev                    # turbo: web + mobile 并行启动
pnpm dev:web                # 仅 Next.js,http://localhost:3000
pnpm dev:mobile             # 仅 Expo(按 w/i/a 切换 web/iOS/Android)

# 质量门禁(通过 turbo 扇出到每个 workspace)
pnpm build
pnpm lint
pnpm format
pnpm typecheck
pnpm test                   # Jest — apps/web(ts-jest)+ apps/mobile(jest-expo)+ packages/shared
pnpm e2e                    # Playwright,仅 apps/web
pnpm verify                 # 各 app 自己的组合校验脚本,见各自 package.json 的 "verify"
```

各 workspace 的具体命令(单测运行方式、Supabase/DB、webhook、部署等)见对应目录的 `AGENTS.md`。

---

## Git Hooks

`lefthook.yml`(仓库级配置):pre-commit 阶段禁止直接提交到 `main`,并对暂存文件自动执行 `prettier --write` + `eslint --fix`。

---

## UI 尺寸体系

修改排版、间距、布局宽度、移动端侧边栏/头部行为或组件尺寸之前,先读 `docs/ui-system.md`——该文档同时覆盖 web 与 mobile 的规则(含专门的 "Mobile Rules" 小节)。Web 端的具体落地方式(Tailwind v4 CSS-first token、shadcn 组件目录)见 `apps/web/AGENTS.md`;mobile 端(NativeWind、本地组件库)见 `apps/mobile/AGENTS.md`。
