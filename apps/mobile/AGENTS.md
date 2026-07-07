# apps/mobile — @faq-rag/mobile

Expo Router 应用,不含任何服务端代码 —— 每个屏幕都通过普通 HTTP 调用 `apps/web` 暴露的 `/api/*` 路由。与 web 端行为一致:无需登录、跨语言 RAG 问答;区别只是原生 UI 而非 webview。仓库整体结构见 `../../AGENTS.md`,后端 API 的实现细节见 `../web/AGENTS.md`。

以下所有路径均相对于本目录(`apps/mobile/`),除非另有前缀说明。

---

## 命令

```bash
pnpm dev            # expo start(按 w/i/a 切换 web/iOS/Android)
pnpm android        # expo run:android
pnpm ios            # expo run:ios
pnpm lint           # expo lint --fix
pnpm typecheck
pnpm format
pnpm test           # jest --watchAll=false(jest-expo)
pnpm verify         # lint && typecheck && format && test
```

单测运行单个文件:

```bash
npx jest path/to/file.test.ts
```

无 Playwright/e2e 覆盖(暂缺)。

---

## 技术栈

| 层次        | 选型                                                                                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 框架        | Expo Router(React Native 0.86,React 19)                                                                                                                                    |
| UI          | NativeWind(Tailwind)+ gluestack-ui 基础组件                                                                                                                                |
| 组件库      | `src/components/ui/` 下的本地组件集(button、badge、icon-button、list-item、action-sheet、screen-header、gluestack-ui-provider)—— **不是** shadcn,不要照搬 web 端的组件结构 |
| 状态/数据   | SWR + 自研 `src/lib/api/*` fetch 封装                                                                                                                                      |
| 本地存储    | `@react-native-async-storage/async-storage`                                                                                                                                |
| Schema 校验 | `@faq-rag/shared`(`packages/shared`)提供的 Zod schema                                                                                                                      |
| 测试        | Jest(jest-expo 预设)                                                                                                                                                       |

---

## 架构要点

- **API host 解析**(`src/lib/api/config.ts` 的 `getApiUrl()`):
  1. `EXPO_PUBLIC_API_URL` 一旦设置,始终优先生效(生产/EAS 构建必须设置,因为没有 dev server 可供自动探测)。
  2. 否则自动探测:Expo web 下取 `window.location.hostname`,原生端取 Metro 的 `Constants.expoConfig.hostUri` 中的 host,再拼上 `EXPO_PUBLIC_API_PORT`(默认 `3000`)。
  3. 两者都拿不到时直接抛错并给出可执行的修复建议 —— **刻意不做**"静默回退到 localhost",因为那种默认值只会在真机上出问题,而真机恰恰是最难调试的场景。

- **导航结构**:`src/app/_layout.tsx` 是根 Stack(主题、手势处理、键盘控制器、bottom-sheet provider)。`src/app/(drawer)/_layout.tsx` 用 `expo-router/drawer` 把 `chat/new` 和 `chat/[id]` 包在抽屉导航里;抽屉宽度用固定像素值计算(`min(windowWidth * 0.84, 320)`),而不是百分比 —— 因为 react-native-web 下,抽屉的实际布局宽度会忽略 `maxWidth`,但展开动画又会遵守它,用百分比会导致两者不一致,抽屉卡在半开状态。

- **主题**:NativeWind 的 color scheme 同时驱动 `dark:` Tailwind variant 和导航主题。`_layout.tsx` 中显式调用 `SystemUI.setBackgroundColorAsync` 按当前主题设置原生根视图背景色 —— 否则状态栏和 home indicator 区域背后的原生根视图会一直保持系统默认的白色,不跟随 app 主题切换。

- **数据层**:`src/hooks/use{ChatSessions,Documents,DocumentUpload,StreamingChat}.ts` 用 SWR 包装 `src/lib/api/*` 的 fetch client。`src/lib/api/utils/crypto.ts` 用 `expo-crypto` 做哈希(web 端对应用 Node 的 `crypto`)。

- **测试**:`src/lib/api/__tests__/*` 覆盖了 fetch client(jest-expo)。

---

## 会话与本地存储

会话数据结构与 web 端一致(见 `../web/AGENTS.md` 的"会话持久化"),但本地缓存机制不同:

- 用 `AsyncStorage`(而非 web 端的 localStorage)存储 `chat:last`、按会话的草稿(`chat:draft:<id>`)、上次选择的 provider(`chat:provider`)—— 见 `src/lib/api/storage.ts`。key 命名有意与 `apps/web/src/lib/client/constants.ts` 的 `STORAGE_KEYS` 保持一致。
- `src/lib/api/{session,chat,document}.ts` 是对 `/api/*` 路由的薄 `fetch` 封装,用 `@faq-rag/shared` 的 Zod schema 校验响应。
- 没有 SWR fallback 预取(没有服务端组件)—— 会话列表和单会话数据都是冷启动后在客户端经 SWR 拉取。
- 聊天流式响应(`src/lib/api/chat.ts`)与 web 端一样依赖 `eventsource-parser` 解析 SSE,两端解析逻辑保持一致。

---

## LLM Provider

Provider 集合(Claude / DeepSeek / OpenAI)与 web 端完全一致,定义见 `../web/AGENTS.md` 的"LLM Provider 抽象"。Mobile 端通过 `ProviderSheet` 选择,状态保存在 `src/context/provider-context.tsx`(镜像 web 端的 provider context)。

---

## UI 尺寸体系(mobile 端落地)

修改间距、字号、点击区域大小之前,先读 `../../docs/ui-system.md` 中的 "Mobile Rules" 小节。本地组件库(`src/components/ui/*`)是产品自有的 gluestack-ui 封装,不是 shadcn,尺寸调整直接改这里的组件,不要去找 web 端的生成式组件。NativeWind v4 在本项目中仍需要 `tailwind.config.js`(与 web 端 Tailwind v4 的纯 CSS-first 配置不同,这是 NativeWind 的限制,不要尝试删除)。

---

## 关键约定

- **API host**:见上方"架构要点"—— 生产/EAS 构建必须显式设置 `EXPO_PUBLIC_API_URL`(参考 `.env.example`),不要依赖自动探测。
- **本地存储 key**:新增 key 时同步检查是否需要与 `apps/web/src/lib/client/constants.ts` 的 `STORAGE_KEYS` 保持命名一致,便于跨端理解。
- **Schema 校验**:所有请求/响应校验都从 `@faq-rag/shared` 导入类型和 schema,不要在本包内重新定义 —— 需要新增或修改字段时去改 `packages/shared`,详见 `../../packages/shared/AGENTS.md`。
- **无 DOM 环境**:本项目的 TS 配置是 `lib: ["es2020"]`(无 `dom`),访问 `window`/`location` 等 web-only API 前需要局部窄化类型(见 `src/lib/api/config.ts` 中 `getWebHost()` 的写法),不要引入全局 `Window` 声明。
- **上传流程**:与 web 端一致,见 `../web/AGENTS.md` 的"上传流程"约定。
