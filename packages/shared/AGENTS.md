# packages/shared — @faq-rag/shared

跨平台 Zod schema 包,目前唯一的消费方是 `apps/mobile`(`apps/web` **不**引用本包,原因见下)。仓库整体结构见 `../../AGENTS.md`。

以下所有路径均相对于本目录(`packages/shared/`),除非另有前缀说明。

---

## 命令

```bash
pnpm lint
pnpm typecheck
pnpm format
```

没有 `build`、`dev`、`test` 脚本 —— 本包直接以源码形式被消费(`package.json` 的 `main`/`types`/`exports` 都指向 `./src/index.ts`),消费方各自的 TypeScript/打包配置负责解析 `.ts` 源文件(见 `apps/mobile/tsconfig.json` 与 `jest.config.ts` 中对 `@faq-rag/shared` 的 `paths` / `moduleNameMapper` 映射)。

---

## 内容

```
src/
├── index.ts              — re-export 所有 schema
└── schemas/
    ├── chat.ts           — /api/chat 请求/响应相关类型
    ├── document.ts        — 文档 CRUD 相关类型
    └── session.ts          — 会话 CRUD 相关类型
```

---

## 为什么 apps/web 不用这个包

`apps/web` 在 `apps/web/src/lib/shared/schemas/` 维护着一份内容几乎相同、但**不完全相同**的 schema 拷贝。核心原因:web 版的 schema 需要引入 server-only 的值作为默认值(例如 chat schema 里 `provider` 字段的默认值来自 `apps/web/src/lib/server/llm/providers.ts` 的 `PROVIDER` 常量 + `apps/web/src/lib/shared/config.ts` 的 `config.llm.defaultProvider`),而本包是纯前端包,不能反向依赖任何 app 的代码 —— 所以本包里的等价字段(如 `provider` 的 enum 值和默认值 `"claude"`)是**手写硬编码**的,并在源码注释中说明了这一点。

**这意味着**:

- 修改任意一个 chat/document/session schema 的字段、枚举值或默认值时,必须同时检查并同步更新 `apps/web/src/lib/shared/schemas/*` 与本包的 `src/schemas/*` 两处 —— 目前没有类型系统或 CI 检查会在两者不一致时报错。
- 新增字段如果不涉及 server-only 依赖,可以只加在本包并让 `apps/web` 后续也引用本包实现,但那是一次更大的重构(消除重复),不要在日常改动中顺手做。
- 判断改动是否需要同步的经验法则:如果新增/修改的字段默认值或枚举值来自 `apps/web/src/lib/server/**` 下的常量,本包这边就只能手写一份等价值,并加注释说明来源。

---

## 关键约定

- 本包的类型必须能在 React Native(Metro/Hermes)和 Node(Jest)两种环境下同时工作 —— 避免引入依赖 DOM 或 Node 内置模块的代码。
- 消费方(目前是 `apps/mobile`)通过 workspace 协议(`workspace:*`)引用本包,修改后不需要单独发布或 build 步骤,改完保存即可在 `apps/mobile` 里生效(前提是消费方的 dev server / test runner 支持解析 workspace 内的 TS 源码,当前均已配置好)。
