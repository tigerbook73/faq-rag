# packages/shared — @faq-rag/shared

跨 web/mobile 的 Zod schema、常量和纯类型转换包。消费方是 `apps/web` 与 `apps/mobile`。

以下路径相对于 `packages/shared/`。

## 命令

```bash
pnpm lint
pnpm typecheck
pnpm format
```

没有 `build`、`dev`、`test` 脚本。本包源码直接被 workspace 消费,`package.json` 的 `main`/`types`/`exports` 都指向 `./src/index.ts`。

## 放什么

适合放入本包:

- `src/schemas/*`: web/mobile 都要遵守的 API 请求/响应 schema。
- `src/constants/providers.ts`: provider 枚举、标签、shared 默认兜底。
- `src/constants/limits.ts`: 上传上限、轮询间隔等跨端一致常量。
- `src/constants/storage-keys.ts`: 跨端语义相同的 storage key,当前只包括 `LAST_CHAT` 与 `DRAFT`。
- `SessionRawSchema` -> `ChatSession` 这类纯转换。

不适合放入本包:

- 依赖 DOM、Node 内置模块、React/React Native 运行时或任一 app 代码的逻辑。
- fetch 封装、错误展示、toast、SWR key 管理等端侧策略。
- Web-only key,例如滚动位置;mobile-only key,例如 provider 选择。

## Provider 默认值

不要混淆两层默认值:

- API schema 兜底: `ChatRequestInputSchema.provider.default(DEFAULT_PROVIDER)` 固定使用本包常量,只在请求体缺字段时生效。
- UI 初始选择: web/mobile 各自读取 `NEXT_PUBLIC_DEFAULT_PROVIDER` / `EXPO_PUBLIC_DEFAULT_PROVIDER`,没设置才回落到本包 `DEFAULT_PROVIDER`。

正常客户端请求应显式传 provider。

## 修改规则

- 新增/修改 schema 字段时,同步检查 web API route、web client、mobile client 与测试。
- 本包必须能在 React Native(Metro/Hermes)、浏览器和 Node/Jest 环境下解析。
- 修改后通常验证消费方,而不是只跑 shared:至少按影响范围跑 `pnpm --filter @faq-rag/web typecheck` 和/或 `pnpm --filter @faq-rag/mobile typecheck`。
