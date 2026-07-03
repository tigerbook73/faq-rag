# Mobile Chat + Knowledge 规划进度

> 每次开始或结束一段实质性工作，都要更新这份文件。新 session 恢复时，一切以这里的内容为准，不依赖对话记忆。

## 当前状态

**所处阶段**：逐步实现

**当前停在**：Step 2（API 客户端层）实现完成并通过验证，尚未提交/合并

**建议下一步**：提交 Step 2 改动（建议走 PR 流程，同 Step 1），然后开始 Step 3 — 会话列表屏幕（`app/(tabs)/chats.tsx`）。

---

## 第一层：需求 + 架构 + 技术选型

- [x] 00-brief.md 已冻结
- [x] 需求是否拆分到 requirements/（否）
- [x] DECISIONS.md 初始版本已建立

---

## 第二层：步骤地图

| 步骤   | 名称               | 状态   | 备注 |
| ------ | ------------------ | ------ | ---- |
| Step 1 | 环境初始化         | 完成   |      |
| Step 2 | API 客户端层       | 完成   |      |
| Step 3 | 会话列表屏幕       | 待开始 |      |
| Step 4 | 聊天屏幕           | 待开始 |      |
| Step 5 | Knowledge 列表屏幕 | 待开始 |      |
| Step 6 | 文档上传           | 待开始 |      |

---

## 第三层：实现

| 步骤   | 验证状态  | 前瞻性检查 | 备注                                                                                                                                                                                                                           |
| ------ | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Step 1 | ✅ 通过   | ✅ 通过    | Gluestack 无 BottomSheet，改用 @gorhom/bottom-sheet（见 DECISIONS.md）；/code-review high 发现 7 处问题（缺 index 路由、jest 测试基础设施两处、provider 默认值分叉、zod 版本分裂、AGENTS.md 文档约定冲突）均已修复，见变更记录 |
| Step 2 | ✅ 通过   | ✅ 通过    | 实装期间发现两处真实缺口并修正：mobile 包缺 `zod` 显式依赖导致幽灵解析出 zod v3/v4 双实例、Expo SDK 57 fetch 流式类型缺失（新增 `winter-runtime.d.ts`），均见 DECISIONS.md 与变更记录                                          |
| Step 3 | ⏳ 待开始 | —          |                                                                                                                                                                                                                                |
| Step 4 | ⏳ 待开始 | —          |                                                                                                                                                                                                                                |
| Step 5 | ⏳ 待开始 | —          |                                                                                                                                                                                                                                |
| Step 6 | ⏳ 待开始 | —          |                                                                                                                                                                                                                                |

---

## 变更记录

| 时间       | 类型 | 影响的步骤 | 处理方式                                                                                                                                                                                                 |
| ---------- | ---- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-02 | 追加 | 全部       | 规划阶段将原 10 步合并为 6 步：环境初始化（Step 1+2）、API 客户端层（Step 3+8）、聊天屏幕（Step 5+6+7）合并                                                                                              |
| 2026-07-03 | 修正 | Step 1     | `/code-review` high effort 发现 7 处问题，均判定为可隔离型修正（不影响 Step 1 已确认的架构决策），直接修复后继续，未触发 Amendment：详见"最近更新"                                                       |
| 2026-07-03 | 修正 | Step 2     | 实装期间发现 `expo-file-system` 上传 API 与规划时假设的 `uploadAsync` 不符（SDK 57 已重写为 `File`/`Directory` 面向对象 API），可隔离型修正，已在 step-map.md Step 2 加 Amendment，直接按新 API 实现继续 |

---

## 架构归并待办

- [ ] expo-router v4 作为 Expo 应用路由方案（来自 DECISIONS.md [arch]）
- [ ] Gluestack UI v2 作为 RN 端 UI 组件库（来自 DECISIONS.md [arch]）
- [ ] Expo SDK 57 类型缺口用根目录 `.d.ts` + `declare global` 打补丁的模式（来自 DECISIONS.md [arch]，Step 2 新增）
- [ ] mobile 端 `eslint-config-expo` flat config 方案（来自 DECISIONS.md [arch]，Step 2 收尾新增）

---

## 最近更新

2026-07-02 规划完成，6 步路径确认，技术选型已与用户全部确认。
2026-07-02 Step 1 完成：packages/shared Zod schemas、expo-router 导航、NativeWind + Gluestack Button、Jest 配置。发现 Gluestack v2 无 BottomSheet npm 包，改用 @gorhom/bottom-sheet（见 DECISIONS.md Amendment）。
2026-07-02 Step 1 环境补丁：`expo-doctor` 发现依赖不满足 SDK 57——补齐 `react-native-worklets` peer dependency、`tailwindcss` 从误装的 v4 改回 NativeWind 要求的 `^3.4.0`（commit 834a3dc）；Web 端运行时报 `Cannot manually set color scheme, as dark mode is type 'media'`，`tailwind.config.js` 补 `darkMode: "class"` 修复（commit 0e9253d，见 DECISIONS.md）。
2026-07-03 `/code-review` high effort 审查 PR #24（8 角度 finder + 13 项 verify），确认 7 处问题并修复（commit 17f8f9d, 10a0bd1）：① `app/(tabs)/` 缺 index 路由导致冷启动 Unmatched Route，补 `index.tsx` 重定向到 `/chats`；② `jest.config.ts` 手写 `transformIgnorePatterns` 覆盖 jest-expo 预设默认值，在 pnpm 的 `.pnpm` 嵌套目录下测试转译直接失败，删除后回退用预设值；③ `tsconfig.json` 显式 `types` 数组排除了 `@types/jest` 全局类型，补上 `"jest"`；④ mobile 包无测试文件但 `test` 脚本没设 `passWithNoTests`，导致根目录 `pnpm test` 失败，已加上；⑤ `packages/shared/src/schemas/chat.ts` provider 默认值硬编码为 `"deepseek"`，与 web 端文档化的默认值 `claude` 不一致，已改正并加注释说明该枚举需与 `apps/web` 的 `PROVIDER` 手动同步；⑥ `packages/shared` 的 `zod` 停留在 `^3`，与 `apps/web` 的 `^4.3.6` 造成同一 workspace 内两个 zod 主版本共存，已升级对齐（连带检查了 typescript/react 版本，确认 mobile 端的 `~6.0.3`/`19.2.3` 是 Expo SDK 57 `expo install --check` 要求的精确版本，未做改动）；⑦ `AGENTS.md` 的 Feature Documentation System 章节与本 feature 实际使用的 `plans/` 目录约定冲突，已从 `AGENTS.md` 删除该章节。另外在验证过程中发现 `app/_layout.tsx` 的 `import "../global.css"` 因 NativeWind 未声明 `*.css` 模块类型导致 `tsc` 报 TS2882（改动前既已存在），新增 `css.d.ts` 一并修复。全部改动已通过 `expo-doctor`（20/20）、`tsc --noEmit`（mobile + shared）、根目录 `pnpm test`（exit 0）验证，并随 PR #24 squash merge 进 main（commit 4d7996e）。
2026-07-03 Step 2 完成：`apps/mobile/src/lib/api/` 新增 `config.ts`（`EXPO_PUBLIC_API_URL` 缺失时 throw）、`session.ts`（listSessions/createSession/getSession/updateSession/deleteSession，仿 web 端 `SessionRawSchema` 转换模式）、`chat.ts`（`streamChat` — AbortController + fetch + eventsource-parser 解析 citations/token/done/error）、`document.ts`（listDocuments/prepareUpload/uploadToSupabase/confirmIndex/embedBatch/deleteDocument/reindexDocument）、`storage.ts`（AsyncStorage 封装：LAST_CHAT/DRAFT/PROVIDER 三个 key）、`utils/crypto.ts`（`computeFileSHA256`）。新增依赖：`eventsource-parser@^3.0.8`、`expo-file-system@~57.0.0`、`expo-crypto@~57.0.0`、`zod@^4.3.6`（显式声明，见下）。三个 Jest 测试文件（session/chat/document.test.ts，共 18 用例，mock `global.fetch`）全绿，已按项目测试审查规则补 `@test-file`/`@test-suite` 注释头。实装期间发现并修复两处真实缺口（均已写入 DECISIONS.md）：① mobile 包未显式声明 `zod` 依赖，pnpm 幽灵解析出 `zod@3.x`（与 `packages/shared` 的 `zod@4.x` 冲突），导致 `SessionRawSchema.extend()`/`.parse()` 报 "expected a Zod schema"——加上 `"zod": "^4.3.6"` 依赖后消失；② Expo SDK 57 的 Winter 运行时已原生支持流式 `Response.body`（解决 00-brief 标注的 Step 3 风险项），但 RN 自带类型声明和 Expo 都没有把 `TextEncoder`/`TextDecoder`/`DOMException`/`ReadableStream`/`Response.body` 暴露为全局类型，新增 `apps/mobile/winter-runtime.d.ts` 补齐（仿 Step 1 `css.d.ts` 先例）。另发现 `expo-file-system@57.0.0` 已从 legacy `uploadAsync` 重写为 `File`/`Directory` 面向对象 API，`uploadToSupabase` 按新 API 实现（step-map.md Step 2 已加 Amendment）。全部改动已通过 `tsc --noEmit`（mobile，0 错误）、`pnpm --filter @faq-rag/mobile test`（18/18）、根目录 `pnpm test`（apps/web 68/68 + apps/mobile 18/18）验证；已提交（commit 82650ff，分支 `feat/mobile-chat-step2-api-client`）。
2026-07-03 Step 2 收尾：给 mobile 补齐 `lint`/`format`/`typecheck` 脚本。装 `eslint-config-expo@^57.0.0`（与 SDK 版本对齐）+ `apps/mobile/eslint.config.js`（`require("eslint-config-expo/flat")`）——之前 mobile 没有自己的 eslint 配置，`expo lint` 会摸到根目录 `eslint.config.mjs` 的占位配置（`export default [{}]`，对 `.ts`/`.tsx` 无匹配规则），报 "all files are ignored"；包级配置文件会完全覆盖（不是合并）根目录占位配置，装上 `eslint-config-expo` 后 `expo lint` 全绿。`pnpm -r lint`/`pnpm -r format` 现在覆盖 mobile + web（shared 仍无脚本，按预期跳过）。
