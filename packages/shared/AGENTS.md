# packages/shared — @faq-rag/shared

跨平台 Zod schema + 常量包,`apps/web` 和 `apps/mobile` 均为消费方。仓库整体结构见 `../../AGENTS.md`。

以下所有路径均相对于本目录(`packages/shared/`),除非另有前缀说明。

---

## 命令

```bash
pnpm lint
pnpm typecheck
pnpm format
```

没有 `build`、`dev`、`test` 脚本 —— 本包直接以源码形式被消费(`package.json` 的 `main`/`types`/`exports` 都指向 `./src/index.ts`),消费方各自的 TypeScript/打包配置负责解析 `.ts` 源文件(见 `apps/web/tsconfig.json`、`apps/mobile/tsconfig.json` 与 `jest.config.ts` 中对 `@faq-rag/shared` 的 `paths` / `moduleNameMapper` 映射)。

---

## 内容

```
src/
├── index.ts               — re-export 所有 schema/常量
├── constants/
│   ├── providers.ts     — PROVIDER, Provider, PROVIDER_LABEL, DEFAULT_PROVIDER
│   ├── limits.ts        — MAX_UPLOAD_BYTES_CLOUD/LOCAL, POLL_INTERVAL_MS
│   └── storage-keys.ts  — STORAGE_KEYS(web/mobile 共有的 key 交集)
└── schemas/
    ├── chat.ts          — /api/chat 请求/响应相关类型
    ├── document.ts      — 文档 CRUD 相关类型
    └── session.ts       — 会话 CRUD 相关类型 + ChatSession/toSession 客户端转换
```

---

## 与 apps/web 的关系

`apps/web` 直接引用本包(不再维护本地拷贝)。`provider` 相关的默认值有两个独立的层次,分别解决不同问题,不要混为一谈:

- **API 校验层的兜底**(`ChatRequestInputSchema.provider` 的 `.default(DEFAULT_PROVIDER)`):固定使用本包的 `DEFAULT_PROVIDER`,不读任何环境变量。只在请求体完全不含 `provider` 字段时才会生效 —— 正常情况下 web/mobile 客户端总是显式传这个字段,这只是防御性兜底,不是驱动 UI 行为的机制。
- **各端 UI 初始选中值**:`apps/web`/`apps/mobile` 的 `context/provider-context.tsx` 各自读自己的环境变量(`NEXT_PUBLIC_DEFAULT_PROVIDER` / `EXPO_PUBLIC_DEFAULT_PROVIDER`),没设置时才落到本包的 `DEFAULT_PROVIDER`。这一层决定用户打开聊天界面时默认选中哪个 provider,和 API 校验层的默认值互不影响。

`ChatSession`/`SessionRawSchema`/`toSession()` 只下沉了纯类型转换部分;两端各自的 `fetch` 包装函数(错误处理策略、函数命名)保留在本地,不在本包内。

---

## 关键约定

- 本包的类型必须能在 React Native(Metro/Hermes)和 Node(Jest)两种环境下同时工作 —— 避免引入依赖 DOM 或 Node 内置模块的代码,也不能反向依赖任何 app 的代码(包括 server-only 模块)。
- 常量/类型只要不依赖环境变量、密钥或其他 server 基础设施,且两端理应保持一致,就应该放在本包,而不是在 `apps/web`/`apps/mobile` 各自维护一份手写拷贝。
- 消费方(`apps/web` 与 `apps/mobile`)通过 workspace 协议(`workspace:*`)引用本包,修改后不需要单独发布或 build 步骤,改完保存即可在两端生效(前提是消费方的 dev server / test runner 支持解析 workspace 内的 TS 源码,当前均已配置好)。
