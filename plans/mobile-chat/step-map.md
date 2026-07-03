---
updated: 2026-07-02
---

# Mobile Chat + Knowledge — 步骤地图

> 这份文件是实现的导航图，不是实现蓝图。每个步骤只写"做完后可以验证什么"，具体怎么实现在轮到它时就地细化。

## 步骤总览

| 步骤   | 名称               | 依赖   | 状态   |
| ------ | ------------------ | ------ | ------ |
| Step 1 | 环境初始化         | —      | 完成   |
| Step 2 | API 客户端层       | Step 1 | 完成   |
| Step 3 | 会话列表屏幕       | Step 2 | 待开始 |
| Step 4 | 聊天屏幕           | Step 3 | 待开始 |
| Step 5 | Knowledge 列表屏幕 | Step 2 | 待开始 |
| Step 6 | 文档上传           | Step 5 | 待开始 |

---

## Step 1: 环境初始化

目标：做完这步，`pnpm --filter @faq-rag/mobile start` 能启动，显示三个 Tab（Chats / Knowledge / About），Gluestack UI 组件可正常使用，mobile 可以从 `@faq-rag/shared` import 共享类型。

包含：

- 安装 expo-router v4 + 配置文件路由入口（`app/_layout.tsx`）
- 安装 Gluestack UI v2（NativeWind v4）+ 配置 GluestackUIProvider
- 创建 Tab 导航（chats / knowledge / about）及 `app/chat/[id].tsx` 占位
- 更新 `app.json` scheme、`package.json` main 字段
- 在 `packages/shared/src/` 创建 session / chat / document 三份 Zod schema，添加 `zod` 依赖，barrel export
- **额外确认**：Gluestack v2 是否有 BottomSheet 组件，结果写入 DECISIONS.md

验证：

- 功能验证：模拟器能看到三个 Tab，点击切换正常；渲染一个 Gluestack `<Button>` 无报错
- 类型验证：`tsc --noEmit`（packages/shared）无报错，mobile 中 `import { Citation } from '@faq-rag/shared'` 能编译
- 自动化测试：无（环境配置，无业务逻辑）

依赖：无

状态：完成

---

## Step 2: API 客户端层

目标：做完这步，mobile 有完整的 session CRUD、SSE 流式 chat、document CRUD + 上传相关 API 客户端，单元测试全绿。

包含（`apps/mobile/src/lib/api/`）：

- `config.ts`：读取 `EXPO_PUBLIC_API_URL`
- `session.ts`：listSessions / createSession / getSession / updateSession / deleteSession
- `chat.ts`：`streamChat(params, callbacks)` — fetch + eventsource-parser 解析 SSE（citations / token / done / error），返回 AbortController
- `document.ts`：listDocuments / prepareUpload / uploadToSupabase（`expo-file-system.uploadAsync`）/ confirmIndex / embedBatch / deleteDocument / reindexDocument
- `storage.ts`：AsyncStorage 封装（LAST_CHAT_KEY / draft key / PROVIDER_KEY）
- `utils/crypto.ts`：`computeFileSHA256(fileUri)` — expo-file-system + expo-crypto

验证：

- 自动化测试（Jest mock fetch）：
  - session.test.ts：listSessions / createSession / getSession / updateSession / deleteSession
  - chat.test.ts：streamChat 的 citations / token / done / error 事件，AbortController 中断
  - document.test.ts：listDocuments / prepareUpload（含 409 重复）/ embedBatch（remaining=0 停止）/ deleteDocument

依赖：Step 1

状态：完成（见 Amendment）

[Amendment - 实装期间发现的更正，均为可隔离型，未改变步骤范围]
原决定：`document.ts` 的上传进度用 `expo-file-system.uploadAsync`。
修正为：实际安装的 `expo-file-system@57.0.0` 已重写为 `File`/`Directory`/`UploadTask` 面向对象 API，改用 `new File(fileUri).upload(url, options)`。
原因：SDK 57 的 expo-file-system 是全新 API，无顶层 `uploadAsync` 导出（Step 2 实装时读包内 `.d.ts` 才发现）。
影响范围：仅本步骤的 `uploadToSupabase` 实现方式变化，不影响其他步骤；详见 DECISIONS.md。

---

## Step 3: 会话列表屏幕

目标：做完这步，打开 App 能看到会话列表，点击跳转聊天页，"+" 新建会话，左滑删除，重启后自动跳转上次会话。

包含（`app/(tabs)/chats.tsx`）：

- `useSWR('/api/sessions', listSessions)` 拉取列表，FlatList 渲染（标题 + 相对时间）
- "+" 按钮：`crypto.randomUUID()` → createSession → router.push → mutate
- 左滑删除（ReanimatedSwipeable）→ deleteSession → mutate
- 空状态 + 新建按钮
- 启动时读 `LAST_CHAT_KEY`，有值则自动跳转

验证：

- 功能验证（需 web 本地运行）：
  1. 看到会话列表
  2. "+" 新建会话，跳转聊天页，返回列表后新会话出现
  3. 左滑删除，列表更新
  4. 重启 App，自动跳转上次 chat
- 自动化测试：无

依赖：Step 2

状态：待开始

---

## Step 4: 聊天屏幕

目标：做完这步，用户能发送消息并看到流式回答，回答中的引用可点击查看详情，可切换 LLM provider 且重启后恢复。

包含（`app/chat/[id].tsx` + `src/context/provider-context.tsx`）：

- SWR 加载历史消息（`revalidateIfStale: false`）
- FlatList 消息气泡（user 右对齐 / assistant 左对齐）
- TypingDots 组件（加载中动画）
- react-native-markdown-display 渲染 Markdown
- 发送逻辑：乐观更新 → streamChat → onToken 追加 → onDone 持久化 → updateSession
- 首次发送自动设 title（前 30 字），写入 LAST_CHAT_KEY
- 中断/异常：append "⚠️ 回答被中断"
- 引用标记：`[^n]`/`[n]`/`(^n)` → `@@n@@` → 自定义渲染为可点击上标
- CitationSheet 组件（`@gorhom/bottom-sheet`，Step 1 确认 Gluestack v2 无此组件）：文档名 + score badge + preview
- 消息底部引用列表
- ProviderContext + Header 右侧 provider 切换（ActionSheet）+ AsyncStorage 持久化

验证：

- 功能验证（需 web 本地运行 + 至少一个 indexed 文档）：
  1. 发消息 → 流式回答逐 token 出现
  2. 重进会话 → 历史消息正确展示
  3. 引用标记可点击，弹出详情
  4. 切换 provider → 下一条消息使用新 provider
  5. 重启 App → provider 选择恢复
- 自动化测试：无

依赖：Step 3

状态：待开始

---

## Step 5: Knowledge 列表屏幕

目标：做完这步，Knowledge tab 能列出文档，状态 badge 正确，indexing 时自动轮询刷新，可删除/reindex 非内置文档。

包含（`app/(tabs)/knowledge.tsx`）：

- `useSWR('/api/documents', listDocuments)` + 动态 refreshInterval（有 pending/uploaded/indexing 时 3000ms，否则 0）
- FlatList 渲染：文件名、大小、chunks 数、状态 badge（indexed=绿 / indexing=蓝 / failed=红 / pending=灰）、时间
- 长按非内置文档 → Gluestack ActionSheet（Reindex / Delete）
- Delete：乐观更新 → deleteDocument → mutate
- Reindex：reindexDocument → embedBatch 循环 → mutate
- 内置文档只读
- 失败文档展开显示 errorMsg
- 右上角上传按钮（Step 6 实现）

验证：

- 功能验证（需 web 本地运行 + 已有文档）：
  1. 看到文档列表，状态 badge 颜色正确
  2. 长按非内置文档，ActionSheet 出现 Reindex / Delete
  3. 删除文档，列表更新
  4. Reindex 后状态变 indexing → 3 秒自动刷新 → 变 indexed
- 自动化测试：无

依赖：Step 2

状态：待开始

---

## Step 6: 文档上传

目标：做完这步，用户能选择本地文件并完成上传，全程显示进度，完成后文档出现在 indexed 状态。

包含：

1. expo-document-picker 选文件（限 pdf/docx/md/txt）
2. 大小校验（local 1MB / cloud 50KB，读 `EXPO_PUBLIC_IS_CLOUD`）
3. `computeFileSHA256(fileUri)` 计算哈希
4. prepareUpload → 409 提示"文件已存在"
5. uploadToSupabase（显示上传进度 %）
6. confirmIndex
7. embedBatch 循环（显示"正在嵌入 X/total chunks..."）
8. 完成 → mutate('/api/documents') → 关闭进度 modal

验证：

- 功能验证：
  1. 选 PDF → 走完全流程，进度正常展示
  2. 文档出现在列表，状态 indexed
  3. 重复上传同一文件 → 提示"文件已存在"
  4. 超大文件 → 提示错误，不触发 prepare
  5. 上传完成的文档在对话中可被引用
- 自动化测试：无（依赖原生文件系统 + 网络）

依赖：Step 5

状态：待开始
