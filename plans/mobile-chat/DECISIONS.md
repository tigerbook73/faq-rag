# Mobile Chat + Knowledge 全局约束 / 决策清单

> 只放对多个步骤或章节有约束力的、已经拍板的决定。每个细化步骤开始前都会完整读这份文件。

---

## 技术选型

- [arch] 路由方案：expo-router v4，文件路由，与 web 端 Next.js App Router 一致。（来源：架构阶段，理由：monorepo 内统一文件路由体验，降低认知切换成本）

- [arch] UI 组件库：Gluestack UI v2（基于 NativeWind v4），是 shadcn/ui 在 RN 端的等价物。（来源：架构阶段）

- 引用详情弹窗：**使用 `@gorhom/bottom-sheet`**。Step 1 确认 Gluestack v2 不以 npm 包形式提供 BottomSheet（需要 CLI 复制组件文件，TTY 限制无法使用），`@gluestack-ui/nativewind-utils` 也不含此组件。改用 `@gorhom/bottom-sheet`（需 `react-native-reanimated` + `react-native-gesture-handler`，已安装）。（来源：Step 1 实装确认）

- `tailwind.config.js` 必须显式声明 `darkMode: "class"`。Tailwind 默认的 `"media"` 策略会让 NativeWind（`react-native-css-interop`）在 Web 端初始化时崩溃（`Cannot manually set color scheme, as dark mode is type 'media'`），任何涉及主题/深色模式的实现（如 Step 4 的 provider 切换 UI）都不能依赖系统级 `prefers-color-scheme` 自动切换，需走 class 策略手动控制。（来源：Step 1 环境补丁，commit 0e9253d）

- SSE 流式：fetch + eventsource-parser，与 web 端完全一致。（来源：架构阶段）

- 数据获取：SWR，与 web 端一致。（来源：架构阶段）

- [arch] Lint：`eslint-config-expo`（Expo 官方 flat config，随 `npx expo install` 装的是与 SDK 版本对齐的 `^57.0.0`），配置文件 `apps/mobile/eslint.config.js` 直接 `require("eslint-config-expo/flat")` 组装，不复用 web 端的 `eslint-config-next`。根目录 `eslint.config.mjs` 只是给未配置 ESLint 的包占位（`export default [{}]`，对 `.ts`/`.tsx` 没有任何匹配规则），mobile 之前用它会导致 `expo lint` 报 "all files are ignored"——任何包只要放自己的 `eslint.config.js`/`.mjs`，就会完全覆盖（不是合并）根目录占位配置。`package.json` 脚本：`lint` = `expo lint --fix`、`format` = 与 web 端一致的 `prettier --write . | rg -v -F '(unchanged)' || true`、`typecheck` = `tsc --noEmit`（三者分开，不像 web 端把 typecheck 塞进 lint 里）。（来源：Step 2 收尾）

## 数据层

- 共享类型：Zod schema 从 `apps/web/src/lib/shared/schemas/` 搬运到 `packages/shared/src/schemas/`，mobile 从 `@faq-rag/shared` import。Web 端继续使用自己的文件，不修改。（来源：架构阶段，理由：防止 mobile/web 类型漂移）

- `packages/shared/src/schemas/chat.ts` 的 `provider` 枚举（`claude`/`deepseek`/`openai`）和默认值（`claude`）是手写字面量，**不**从 `apps/web/src/lib/server/llm/providers.ts` 的 `PROVIDER` 常量派生——`packages/shared` 是 app 的下游依赖，不能反向依赖某个具体 app。Step 2 接入这个 schema 前，如果 web 端新增/删除了 provider 或改了默认值（`NEXT_PUBLIC_DEFAULT_PROVIDER`），需要手动同步过来。（来源：/code-review high 发现，commit 17f8f9d）

- `packages/shared` 的 `zod` 版本必须跟 `apps/web` 保持一致（目前 `^4.3.6`），避免同一 workspace 内两个 zod 主版本共存导致 `z.infer`/`ZodError` 类型不兼容。升级 packages/shared 的 zod 大版本前，先确认 schema 代码没有用到被移除的 v3-only API。（来源：/code-review high 发现，commit 17f8f9d）

- Web 端数据层不修改：所有 DB 操作、API 路由均保持不变，mobile 仅作 API 消费方。

- `apps/mobile` 必须显式声明 `zod` 依赖（版本与 `packages/shared` 对齐，`^4.3.6`），不能依赖幽灵解析。Step 2 实测发现：mobile 包本身不声明 `zod` 时，pnpm 会把裸 `import "zod"` 解析到某个传递依赖带来的 `zod@3.x`，而 `packages/shared` 用的是 `zod@4.x`——两个主版本的 schema 实例互不兼容，`.extend()`/`.parse()` 直接报 "expected a Zod schema"。以后任何 mobile 端文件直接 `import { z } from "zod"` 或使用从 `@faq-rag/shared` 拿到的 schema 做 `.extend()`，都依赖这条约束成立。（来源：Step 2 实装确认）

- [arch] Expo SDK 57 的 Winter（WinterCG 兼容）运行时已经在原生层支持流式 `Response.body`（真正的 `ReadableStream`），解决了 00-brief.md 中标注的"Hermes streaming fetch 是否可用"风险——运行时能力已具备。但 React Native 自带的环境类型声明（`react-native/src/types/globals.d.ts`）还是旧版非流式 `Response`/`Body` 接口，也完全没有声明 `TextEncoder`/`TextDecoder`/`DOMException`/`ReadableStream` 全局类型（这些能力由 `node_modules/expo/src/winter/*` 在运行时安装，但对应类型包没跟上）。已加 `apps/mobile/winter-runtime.d.ts` 用全局类型增强（`declare global`）补齐这些类型，仿照 Step 1 `css.d.ts` 的先例——根目录 `.d.ts` 文件是本项目给 Expo/RN 类型缺口打补丁的标准做法，后续步骤如果撞到类似"运行时有、类型没有"的缺口，应沿用这个模式而不是到处散落类型断言。（来源：Step 2 实装确认，tsc 报错定位到 `react-native/src/types/globals.d.ts`）

## API 层

- Mobile 调用 web REST API，base URL 来自 `EXPO_PUBLIC_API_URL` 环境变量。

- Session 写入规范（对标 web 的 Key Conventions）：任何 session 写操作后，同时 `mutate('/api/sessions')`（列表）AND `mutate('/api/sessions/${id}', updated, { revalidate: false })`（单条缓存），防止导航回旧聊天时看到过期数据。

- 上传进度：使用 `expo-file-system` 的 `File` 类（`new File(fileUri).upload(url, options)`，支持 `onProgress`），不用 fetch（fetch 不支持 upload progress 事件）。**更正**：00-brief.md/step-map.md 里写的 `expo-file-system.uploadAsync` 是旧版（legacy）API 名称，SDK 57 装的 `expo-file-system@57.0.0` 已完全重写为 `File`/`Directory`/`UploadTask` 的面向对象 API，没有顶层 `uploadAsync` 导出。（来源：Step 2 实装确认，读 `node_modules/expo-file-system/build/*.d.ts` 核实）

- API 客户端层（`apps/mobile/src/lib/api/*`）统一的错误处理约定：非 2xx 响应一律 `throw new Error(message)`（优先取响应体里的 `error` 字段），不做静默失败；`getSession`/`deleteSession` 把 404 当作正常结果（返回 `null` / 视为已删除）而不是错误。UI 层（Step 3 起）统一用 try/catch + toast 处理这些异常，不要在 API 层吞错误。（来源：Step 2 实装确认）

- `Provider` 类型（`"claude" | "deepseek" | "openai"`）由 `apps/mobile/src/lib/api/chat.ts` 从 `ChatRequestInput["provider"]` 派生导出，不新增到 `packages/shared`（避免和 `ChatRequestInputSchema` 的 provider 枚举出现两份定义）。`storage.ts` 的 provider 持久化函数从 `./chat` import 这个类型，Step 4 的 provider context 也应从这里 import。（来源：Step 2 实装确认）

## 前端

- 内置文档（`isBuiltIn=true`）在 Knowledge 列表中只读，不显示删除/reindex 操作。

- 文档状态轮询：SWR `refreshInterval` 动态开关——有 `pending/uploaded/indexing` 状态文档时开启 3000ms，全部完成（`indexed`/`failed`）后置 `0`。

- 首次发送消息时从 question 取前 30 字设为会话标题，调用 `updateSession(id, { title })` 写入。

## 其他横切约束

- 未完成的功能（会话重命名、Rebuild All、Markdown 代码高亮）不在本次范围内，后续作为追加型变更处理。
