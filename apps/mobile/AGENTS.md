# apps/mobile — @faq-rag/mobile

Expo Router / React Native 客户端。这里不放服务端代码;所有数据都通过普通 HTTP 调用 `apps/web` 的 `/api/*`。

以下路径相对于 `apps/mobile/`。

## 命令

```bash
pnpm dev        # expo start
pnpm android
pnpm ios
pnpm lint       # expo lint --fix
pnpm typecheck
pnpm test       # jest --watchAll=false
pnpm verify     # lint + typecheck + format + test
```

单测: `npx jest path/to/file.test.ts`。本包暂无 Playwright/e2e。

涉及 NativeWind/Babel/Metro、workspace 依赖解析或 web fallback 上传时,额外跑:

```bash
pnpm --filter @faq-rag/mobile exec expo export --platform web --output-dir /tmp/faq-rag-mobile-web-export
```

## 架构边界

- `src/app/_layout.tsx`: 根 Stack,主题、手势、键盘、bottom-sheet provider。
- `src/app/(drawer)/_layout.tsx`: drawer navigator,只包 `chat/new` 与 `chat/[id]`。
- `src/lib/api/*`: 对 web `/api/*` 的 fetch 封装;响应 schema 从 `@faq-rag/shared` 导入。
- `src/hooks/use{ChatSessions,Documents,DocumentUpload,StreamingChat}.ts`: React Query（`useQuery`/`useQueryClient`，乐观更新 + `invalidateQueries` 回滚）与业务流程封装。

## API Host

`src/lib/api/config.ts#getApiUrl()` 的顺序:

1. `EXPO_PUBLIC_API_URL` 显式值优先,生产/EAS 必须设置。
2. 本地开发自动从 Expo web `location.hostname` 或 Metro `Constants.expoConfig.hostUri` 推断 host,端口默认 `EXPO_PUBLIC_API_PORT || 3000`。
3. 无法推断时直接抛错。不要静默回退到 `localhost`,真机会连错机器。

## NativeWind / UI

- 本包用 NativeWind + 本地 `src/components/ui/*`,不是 shadcn;不要复制 web 组件结构。
- NativeWind v4 在这里仍需要 `tailwind.config.js`;不要按 web 的 Tailwind v4 CSS-first 模式删除它。
- `babel.config.js` 中 `nativewind/babel` 是 preset 位置;`metro.config.js` 用 `withNativeWind(config, { input: "./global.css" })`。
- 抽屉宽度用固定计算值 `min(windowWidth * 0.84, 320)`,不要改回百分比 + maxWidth;react-native-web 会出现测量和动画宽度不一致。
- 改间距、字号、头部、抽屉或点击区域前先读 `../../docs/ui-system.md` 的 Mobile Rules。
- 颜色一律走 `src/lib/theme/colors.js` 的 token(`tailwind.config.js` 与 `useThemeColors()` 都从它派生),不要新增硬编码 hex 或裸 `gray-*`/`blue-*`/`red-*` class;完整 token 表见 `../../docs/ui-system-mobile.md`。

## 本地状态

- `AsyncStorage` 存 `chat:last`、`chat:draft:<id>`、`chat:provider`;key 见 `src/lib/api/storage.ts`。
- 草稿恢复是异步的。保存前必须确认当前 `draftKey` 已恢复完成,避免切换会话时旧输入覆盖/删除新会话草稿。
- 新增跨端 key 时先看 `@faq-rag/shared` 的 `STORAGE_KEYS`;mobile-only key 留在本包。

## 上传与聊天

- 上传流程必须与 web 一致:prepare -> signed URL upload -> index -> embedBatch loop -> React Query invalidate。
- web fallback 上传要保持 Supabase multipart 形状:空字段名 file + `cacheControl=3600`,不要改成裸 PUT。
- 聊天 SSE 用 `eventsource-parser`;mobile 解析逻辑应与 web 保持同一事件语义(`citations`/`token`/`done`/`error`)。
- `expo-file-system` `File.upload()` 是 native 路径;web 由 picker 暴露 DOM `File`,相关类型在 `winter-runtime.d.ts`。

## TypeScript 环境

`tsconfig` 不包含 DOM lib。访问 `window`/`location` 等 web-only API 时用局部窄化,不要新增全局 `Window` 声明。
