<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# FAQ RAG Agent Notes

本仓库是 pnpm workspace + Turborepo monorepo。具体实现细节优先读所在目录的 `AGENTS.md`;本文件只保留跨包约束。

## 工作区边界

- `apps/web`: Next.js 16 应用,同时承载 UI、API routes、数据库、检索、LLM、文件摄取。改 Next 代码前先读 Next 本地 docs。
- `apps/mobile`: Expo Router / React Native 客户端,只通过 HTTP 调用 `apps/web` 的 `/api/*`,不要在 mobile 里加入服务端逻辑。
- `packages/shared`: 跨 web/mobile 的 Zod schema、常量和纯类型转换。不能依赖 app 代码、DOM 或 Node 内置模块。

`CLAUDE.md` 只是入口转发,实际规则维护在各级 `AGENTS.md`。

## 常用命令

```bash
pnpm install
pnpm dev                         # web + mobile
pnpm dev:web                     # 仅 web
pnpm --filter @faq-rag/mobile dev # 仅 mobile

pnpm lint
pnpm typecheck
pnpm test
pnpm e2e                         # 仅 web Playwright
pnpm verify                      # 各 workspace 自己的组合校验
```

如果只改一个 workspace,优先用 `pnpm --filter <package> ...` 缩小验证范围。

## 提交前注意

`lefthook.yml` 会阻止直接提交到 `main`,并对暂存文件执行 Prettier;暂存的 TS/TSX 会用 `apps/web/eslint.config.mjs` 跑 `eslint --fix`。提交失败时先检查 hook 修改过的文件和暂存区。

## UI 修改

改排版、间距、组件尺寸、移动端头部/抽屉前,先读 `docs/ui-system.md`。Web 使用 Tailwind v4 CSS-first + shadcn 组件;mobile 使用 NativeWind + 本地 `src/components/ui/*`,不要照搬 web 组件结构。
