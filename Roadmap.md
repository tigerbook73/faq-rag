# Roadmap

## 待实施清单

> 请对每项标注状态，**N** 的项目不进行深入分析。

---

### 一、命名与常量管理

| #   | 状态 | 项目                 | 说明                                                                                                                                |
| --- | ---- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | ✅   | `IS_CLOUD` 命名问题  | 实际语义是 `EMBEDDING_PROVIDER === "openai"`，名称掩盖切换维度；改为直接判断 `EMBEDDING_PROVIDER` 或重命名为 `USE_OPENAI_EMBEDDING` |
| 1.2 | ✅   | `config.ts` 组织方式 | 当前是平铺的裸 export 全大写常量；可改为命名空间对象（`Config.retrieval.topK`）或按功能拆分为多个小文件                             |

---

### 二、模块职责拆分

| #   | 状态 | 项目                                    | 说明                                                                                                                           |
| --- | ---- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 2.1 | ✅   | `chat-storage.ts` 关注点分离            | API 调用（session CRUD）与 localStorage 操作混杂；拆成两个独立模块                                                             |
| 2.2 | ✅   | `chat-storage.ts` localStorage 接口升级 | 当前只暴露 key 常量；改为提供对象级读写接口（`lastChat.get()` / `lastChat.set(id)`）                                           |
| 2.3 | ✅   | `ChatSidebar.tsx`（324 行）拆分         | Session CRUD、重命名、导出、删除确认、键盘事件集中在一处；已拆出 `SessionItem` 组件和 `useChatSessions` hook                   |
| 2.4 | ✅   | `DocumentTable.tsx`（298 行）拆分       | 文档列表、状态轮询、删除确认、reindex 操作在同一组件；已拆出 `DocumentRow` / `DocumentDialogs` 及 `useDocumentManagement` hook |
| 2.5 | ✅   | `DocumentTable.tsx` 上传后立即刷新      | 已优化轮询逻辑：每当有文档状态从 active 变为 terminal 时立即触发 `router.refresh()`；并增加了手动刷新按钮                      |

---

### 三、代码质量

| #   | 状态 | 项目                            | 说明                                                                                                                           |
| --- | ---- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 3.1 | ✅   | Cross-encoder feature flag 化   | 已通过 `ENABLE_RERANKER` 环境变量控制 `rerankChunks` 的启用，代码路径已显式化 |
| 3.2 | ✅   | `bodySchema` 默认 provider 对齐 | 已通过 `config.llm.defaultProvider` 对齐，优先读取 `NEXT_PUBLIC_DEFAULT_PROVIDER` |
| 3.3 | ✅   | `SYSTEM_PROMPT` 提取            | 已提取至 `src/lib/llm/prompts.ts` |
| 3.4 | ✅   | `sanitizeChunkContent` 位置调整 | 已提取至 `src/lib/retrieval/utils.ts` |

---

### 四、架构设计

| #   | 状态 | 项目                                   | 说明                                                                                                                  |
| --- | ---- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 4.1 | ✅   | Supabase 浏览器客户端集中化            | `TopBar.tsx` 和 `signin/page.tsx` 各自内联 `createBrowserClient`；提取到 `src/lib/supabase/browser.ts`                |
| 4.2 | ✅   | `filePath` 字段二义性                  | 本地模式存 FS 路径，云模式存 Storage 对象路径，同字段两种语义；重命名为 `fileRef`（DB 列 `file_path` 不变，无需迁移） |
| 4.3 | ✅   | `retrieval/query.ts` provider 逻辑重复 | 将 `resolveClient()` 提取为 `resolveQueryClient()` 移至 `llm/clients.ts`，与客户端单例同处                            |
| 4.4 | ✅   | Rate limiting 删除                     | 进程内内存实现在多进程/云部署下无效；直接删除 `rate-limit.ts` 及 `/api/chat` 中的限速逻辑                             |
| 4.5 | N    | LLM provider 重复模式观察              | `claude.ts` / `deepseek.ts` / `openai.ts` 有相似的 token 流循环和错误处理；目前量少不急于抽象，随 provider 增加再评估 |
| 4.6 | N    | `ingest/pipeline.ts` 扩展性            | parse/split/embed/store 目前逻辑清晰；若后续阶段变复杂（错误重试、多格式分支）再考虑引入 pipeline step 接口           |

---

### 五、测试

| #   | 状态 | 项目                 | 说明                                                           |
| --- | ---- | -------------------- | -------------------------------------------------------------- |
| 5.1 | N    | 测试策略评估         | 评估单元/集成/e2e 对本项目各自的必要性和性价比                 |
| 5.2 | N    | 重构期测试优先级评估 | 项目经常重构，哪些部分测试应优先添加，哪些暂缓（等稳定后再补） |
| 5.3 | N    | 脚本类测试评估       | 脚本命令（`scripts/`）是否需要测试，以及如何实施               |
| 5.4 | N    | 测试代码实施         | 按评估结论逐步添加单元 / 集成 / e2e 测试                       |

---

## 原始记录（参考）

> 以下为初始思路记录，内容已整理至上方清单。

- IS_CLOUD标识名称有问题，直接用 EMBEDDING_PROVIDER 就好了
- chat-storage.ts文件需要重构，里面API和sessionStorage混在一起了, 需要分开来
- chat-storage.ts文件，关于sessionStorage的部分，直接提供对象接口，而不是仅提供key常量
- 增加单元测试代码
- 增加集成测试代码
- 增加e2e测试代码
- 评语一下单元/集成/e2e测试代码对于本项目而言，是否都有必要
- 本项目经常重构，那些部分测试代码适合添加？那些可以暂缓，等比较稳定后再添加？或者集成测试先添加？
- 脚本类的命令是否需要添加测试？怎么添加？
- config.ts文件，全部红全局大写变量，感觉不太合适，是否使用config类来管理这些变量更好？
- 评估一下，本项目还有那些可以重构地方
- DocumentTable.tsx完善，在上载完成后，就自动刷新一次，不要等到indexing完成才刷新
