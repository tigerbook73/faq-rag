# FAQ RAG 项目 — 学习路线图与改进计划

> 基于项目现状整理，按**学习价值 × 实施成本**排序。  
> 每项标注：难度 · 预计工时 · 核心技能收益 · 具体切入点。

---

## 快速导航

| 类别                                          | 项目数 | 完成 | 建议先做                        |
| --------------------------------------------- | ------ | ---- | ------------------------------- |
| [RAG 核心质量](#一rag-核心质量)               | 6 项   | 4 ✅ | HyDE 检索                       |
| [Next.js / React 技能](#二nextjs--react-技能) | 5 项   | 4 ✅ | 多轮对话上下文管理              |
| [用户体验 / 缺失功能](#三用户体验--缺失功能)  | 8 项   | 6 ✅ | 对话导出、Rebuild All 进度      |
| [可靠性 / 生产就绪](#四可靠性--生产就绪)      | 7 项   | 2 ✅ | DB 索引、Sessions Zod、速率限制 |
| [代码质量](#五代码质量)                       | 4 项   | 0 ✅ | DeepSeek 单例、config.ts        |
| [测试](#六测试)                               | 3 项   | 0 ✅ | 检索管道测试                    |

---

## 优先级总览（建议执行顺序）

```
阶段 1（速赢）✅ 全部完成
  §1-A  DeepSeek Prefix Cache 验证   ✅
  §1-B  Claude Prompt Caching        ✅
  §3-A  启用 Claude UI               ✅
  §3-B  暗色模式切换                 ✅
  §1-E  引用片段完整显示             ✅

阶段 2（Next.js 深水区）✅ 全部完成
  §2-A  知识库页改 Server Components ✅
  §2-B  上传改 Server Actions        ✅
  §2-C  乐观更新（useState 模式）    ✅
  §3-F  会话迁移至 PostgreSQL        ✅
  §4-A  并行文档块嵌入（层1）        ✅
  §4-B  API 文件校验 + Zod           ✅
  §3-C  会话重命名                   ✅
  §3-D  文档搜索/筛选               ✅

阶段 3（核心 RAG 提升，3–5 天）
  §1-C  交叉编码器重排序             ✅
  §1-D  HyDE 检索                    ← ~10 行，学习 RAG 进阶技巧

阶段 4（可靠性 + 代码质量，3–5 天）
  §4-C  DB 索引补全                  ← 一次 migration，立竿见影
  §4-D  Sessions PATCH Zod 校验      ← 补齐安全加固
  §4-E  速率限制                     ← 防滥用
  §4-F  SSE 流解析健壮化             ← 消除边界 bug
  §5-A  DeepSeek 客户端单例化        ← 去重实例
  §5-B  魔法数字提取到 config.ts     ← 统一调优参数
  §5-C  文件扩展名改用 path.extname  ← 边界修复
  §5-D  Embedding 单例并发初始化锁   ← 并发安全

阶段 5（UX 补全，2–3 天）
  §3-E  对话导出                     ← Blob API + Markdown 序列化
  §3-G  文档失败错误内联显示         ← 可见性改善
  §3-H  Rebuild All 进度反馈         ← 大文档集合体验
  §2-E  多轮对话上下文管理           ← Token 窗口截断

阶段 6（测试 + 高阶 RAG，5–10 天）
  §6-A  检索管道单元测试             ← ts-jest 异步生成器测试
  §6-B  Playwright E2E 测试          ← 全链路自动化
  §1-F  语义分块                     ← 替代固定字符分块
  §6-C  嵌入质量对比实验             ← RAG 评估方法论
```

---

## 一、RAG 核心质量

### 1-A ✅ DeepSeek Prefix Cache 验证 【已完成】

|              |                                      |
| ------------ | ------------------------------------ |
| **难度**     | ⭐ 极简                              |
| **预计工时** | 30 分钟                              |
| **核心技能** | LLM Token 成本优化、API 响应结构分析 |

**结论**：per-turn RAG 注入模式下，每次请求的 context 不同，前缀在第一条消息即分叉，自动前缀缓存无法命中。DeepSeek prefix cache 适合消息数组开头稳定的场景，不适合本项目的动态 context 注入架构。已加 `stream_options: { include_usage: true }` 验证，`prompt_cache_hit_tokens` 持续为 0。

---

### 1-B ✅ Claude Prompt Caching 【已完成】

|              |                                                             |
| ------------ | ----------------------------------------------------------- |
| **难度**     | ⭐⭐ 中等                                                   |
| **预计工时** | 2–3 小时                                                    |
| **核心技能** | Anthropic SDK `cache_control`、Token 成本优化、流式事件解析 |

**已实施**：`system` 标注 `cache_control: { type: "ephemeral" }`，最后一条 assistant 消息和当前 user 消息同步标注。usage 从 `stream.on("message")` 读取。

**与 1-A 相同根本限制**：每轮 context 变化导致前缀分叉，`cache_read` 为 0。多轮 assistant 消息积累到 ≥1024 tokens 后方能命中。

---

### 1-C ✅ 交叉编码器重排序（Cross-encoder Rerank）【已完成】

|              |                                                    |
| ------------ | -------------------------------------------------- |
| **难度**     | ⭐⭐⭐ 中等偏高                                    |
| **预计工时** | 4–8 小时                                           |
| **核心技能** | Two-stage RAG retrieval、Cohere API / 本地模型集成 |

**现状**：`src/lib/retrieval/rerank.ts` 仅做去重 + 余弦相似度排序（bi-encoder 分数），无法捕捉查询与文档块之间的深层语义关联。

**两种方案**：

| 方案                            | 优点                | 缺点                 |
| ------------------------------- | ------------------- | -------------------- |
| **Cohere Rerank API**           | 接入简单，10 行代码 | 需要 API key，有成本 |
| **本地 BAAI/bge-reranker-base** | 免费，隐私安全      | 需额外内存，冷启动慢 |

**Cohere 方案示例**：

```ts
import { CohereClient } from "cohere-ai";
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

const reranked = await cohere.rerank({
  model: "rerank-multilingual-v3.0",
  query,
  documents: chunks.map((c) => c.content),
  topN: 5,
});
```

**架构位置**：在 `vectorSearch` 返回 top-20 后，调用 reranker 取 top-5，再传给 LLM。

---

### 1-D ✦ HyDE 检索（假设性文档嵌入）

|              |                                |
| ------------ | ------------------------------ |
| **难度**     | ⭐⭐ 中等                      |
| **预计工时** | 2–4 小时                       |
| **核心技能** | RAG 进阶检索策略、向量空间直觉 |

**现状**：`src/lib/retrieval/query.ts` 直接对用户问题做嵌入，在"问题空间"中检索，而知识库存的是"答案空间"的文本，两者向量分布存在天然偏差。

**目标**：先让 LLM 根据问题生成一个"假设性答案"，对这个假设答案做嵌入后再检索，命中率显著提升。

```ts
const hypotheticalAnswer = await generateHypotheticalAnswer(query, provider);
const hydeVector = await embed(hypotheticalAnswer);
const results = await mergedVectorSearch([queryVector, hydeVector], topK);
```

**注意**：HyDE 会多一次 LLM 调用，需在失败时回退到原始查询。

---

### 1-E ✅ 引用片段完整显示 【已完成】

|              |                          |
| ------------ | ------------------------ |
| **难度**     | ⭐ 简单                  |
| **预计工时** | 30 分钟                  |
| **核心技能** | UX 细节、citation 数据流 |

`app/api/chat/route.ts`：`c.content.slice(0, 200)` → `c.content`，取消截断。`CitationDrawer.tsx`：`h-64` → `max-h-[60vh]`，自适应高度。

---

### 1-F ✦ 语义分块（Semantic Chunking）【高级】

|              |                                           |
| ------------ | ----------------------------------------- |
| **难度**     | ⭐⭐⭐⭐ 较难                             |
| **预计工时** | 1–2 天                                    |
| **核心技能** | 分块策略对 RAG 质量的影响、嵌入相似度阈值 |

**现状**：`pipeline.ts` 使用 `RecursiveCharacterTextSplitter`，按字符数硬切，可能把同一语义段落切断，也可能把不相关内容拼在一起。

**目标**：用相邻句子的嵌入余弦相似度判断"语义边界"，在相似度骤降处切块。需要 A/B 实验验证效果。

---

## 二、Next.js / React 技能

### 2-A ✅ 知识库页面改用 Server Components + Suspense 【已完成】

|              |                                                      |
| ------------ | ---------------------------------------------------- |
| **难度**     | ⭐⭐ 中等                                            |
| **预计工时** | 3–5 小时                                             |
| **核心技能** | RSC 心智模型、Suspense 流式渲染、App Router 数据获取 |

`app/knowledge/page.tsx` 改为 async Server Component，直接 `prisma.document.findMany()`。`loading.tsx` 新建骨架屏。`DocumentTable.tsx` 接收 `initialDocuments` prop。

---

### 2-B ✅ 上传改用 Server Actions 【已完成】

|              |                                                             |
| ------------ | ----------------------------------------------------------- |
| **难度**     | ⭐⭐ 中等                                                   |
| **预计工时** | 3–5 小时                                                    |
| **核心技能** | Server Actions、`useActionState`、`useFormStatus`、渐进增强 |

`app/knowledge/actions.ts`（新建）：`"use server"` Server Action，接收多文件 FormData，最后 `revalidatePath("/knowledge")`。`UploadZone.tsx`：`useActionState(uploadDocuments, null)` 替换手动 fetch。

---

### 2-C ✅ DocumentTable 乐观更新 【已完成】

|              |                                               |
| ------------ | --------------------------------------------- |
| **难度**     | ⭐⭐ 中等                                     |
| **预计工时** | 1–2 小时                                      |
| **核心技能** | 前端乐观更新模式、useState 状态管理、错误回滚 |

**注意**：原计划用 React Query `onMutate/onError`，已迁移为原生 `useState` + try/catch 回滚（`@tanstack/react-query` 已从依赖中移除）。

```ts
async function handleDelete(id: string) {
  const prev = polledDocuments ?? initialDocuments;
  setPolledDocuments(prev.filter((d) => d.id !== id)); // 立即更新 UI
  try {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    router.refresh();
  } catch {
    setPolledDocuments(prev); // 失败回滚
  }
}
```

---

### 2-D ✅ 会话持久化迁移至 PostgreSQL 【已完成】

|              |                                                   |
| ------------ | ------------------------------------------------- |
| **难度**     | ⭐⭐⭐ 中等偏高                                   |
| **预计工时** | 4–8 小时                                          |
| **核心技能** | Prisma schema 迁移、API 设计、服务端 session CRUD |

新增 `Session` / `SessionMessage` 模型，`GET/POST /api/sessions`，`GET/PATCH/DELETE /api/sessions/[id]`。`chat-storage.ts` 替换为 API 调用。`ChatWindow` 接收 Server Component 传入的 `initialSession`。`ChatSidebar` 改为 `useState` + fetch + 自定义事件触发刷新。

---

### 2-E ✦ 多轮对话上下文管理

|              |                                  |
| ------------ | -------------------------------- |
| **难度**     | ⭐⭐ 中等                        |
| **预计工时** | 2–4 小时                         |
| **核心技能** | Token 窗口管理、对话历史截断策略 |

`app/api/chat/route.ts` 发送全量历史，长对话会超出 LLM 上下文限制（DeepSeek Chat：64K tokens；Claude Sonnet：200K tokens）。实现滑动窗口策略——保留最近 N 条消息，或按 token 数截断。

---

## 三、用户体验 / 缺失功能

### 3-A ✅ 在 UI 中启用 Claude 【已完成】

`src/components/chat/ProviderSelect.tsx` 移除 `disabled` 属性。

---

### 3-B ✅ 暗色模式切换 【已完成】

`ChatWindow` Header 加 `Sun/Moon` 切换按钮，`useTheme` 驱动。

---

### 3-C ✅ 会话重命名（行内编辑）【已完成】

|              |                                      |
| ------------ | ------------------------------------ |
| **难度**     | ⭐⭐ 中等                            |
| **预计工时** | 2–3 小时                             |
| **核心技能** | 受控输入、双击编辑模式、键盘事件处理 |

`ChatSidebar.tsx`：双击标题进入编辑模式，`Enter`/失焦保存，`Escape` 取消。`chat-storage.ts` 新增 `updateSessionTitle()` 调用 `PATCH /api/sessions/:id`。

---

### 3-D ✅ 文档搜索 / 筛选 【已完成】

|              |                      |
| ------------ | -------------------- |
| **难度**     | ⭐ 简单              |
| **预计工时** | 1 小时               |
| **核心技能** | 受控输入、客户端过滤 |

`DocumentTable` 顶部加 `<Input />`，`useMemo` 按文档名实时过滤。无结果时表格内显示提示，搜索框保持可见。

---

### 3-E ✦ 对话导出

|              |                                     |
| ------------ | ----------------------------------- |
| **难度**     | ⭐⭐ 中等                           |
| **预计工时** | 2–3 小时                            |
| **核心技能** | Blob API、文件下载、Markdown 序列化 |

在侧边栏每个会话上加"导出为 Markdown"按钮，将 `messages` 序列化为 `.md` 文件（含引用来源），触发浏览器下载。

---

### 3-F ✅ 会话持久化迁移至 PostgreSQL 【已完成 → 见 §2-D】

---

### 3-G ✦ 文档处理失败错误内联显示

|              |                     |
| ------------ | ------------------- |
| **难度**     | ⭐ 简单             |
| **预计工时** | 1 小时              |
| **核心技能** | UX 可见性、条件渲染 |

`DocumentTable.tsx`：`failed` 文档的 `errorMsg` 当前仅作为 hover tooltip（`title={errorMsg}`），用户难以发现。改为在状态徽章下方显示可展开的错误行，或增加 "View Error" 按钮触发 Dialog。

---

### 3-H ✦ Rebuild All 进度反馈

|              |                        |
| ------------ | ---------------------- |
| **难度**     | ⭐ 简单                |
| **预计工时** | 1 小时                 |
| **核心技能** | 乐观更新、进度状态管理 |

`handleRebuildAll()` 串行请求多文档无进度反馈。改为：动态文字 `"Rebuilding 3 / 47…"` + 对每个文档立即乐观更新为 `pending` 状态（复用已有乐观更新模式）。

---

## 四、可靠性 / 生产就绪

### 4-A ✅ 并行文档块嵌入（层1）【已完成】

|              |                                                        |
| ------------ | ------------------------------------------------------ |
| **难度**     | ⭐⭐⭐ 中等偏高                                        |
| **预计工时** | 4–8 小时（层1 已完成，层2 待实施）                     |
| **核心技能** | 批量推理、ONNX 内部并行（SIMD）、`worker_threads` 多核 |

**层1（已完成）**：`bge.ts` 新增 `getEmbeddings(texts[])` 批量函数，单次 ONNX 调用处理整批文本。`pipeline.ts` 串行循环替换为按 `EMBED_BATCH=8` 分批调用。

**层2（待实施）**：`worker_threads` 多核分片，每个 worker 独立运行 ONNX 实例，需额外 bundler 配置。

---

### 4-B ✅ API 层文件校验 + Zod 输入验证 【已完成】

|              |                               |
| ------------ | ----------------------------- |
| **难度**     | ⭐⭐ 中等                     |
| **预计工时** | 2–3 小时                      |
| **核心技能** | Zod schema 验证、安全编程实践 |

`documents/route.ts`：MIME 类型白名单 + 50MB 上限（413）。`chat/route.ts`：`question` ≤ 4000 字符，history 每条 ≤ 8000 字符，数组 ≤ 50 条。

---

### 4-C ✦ DB 索引补全

|              |                           |
| ------------ | ------------------------- |
| **难度**     | ⭐ 简单                   |
| **预计工时** | 1 小时                    |
| **核心技能** | SQL 执行计划、Prisma 迁移 |

`prisma/schema.prisma` 三处缺失索引：

```prisma
model Document {
  @@index([status])      // vectorSearch 用 WHERE status = 'indexed'
}
model Session {
  @@index([updatedAt])   // 侧边栏按 updatedAt desc 排序
}
model Chunk {
  @@index([documentId])  // 向量查询 join（确认外键是否自动建索引）
}
```

学习点：运行 `EXPLAIN ANALYZE` 对比索引前后查询计划。

---

### 4-D ✦ Sessions PATCH Zod 校验

|              |                     |
| ------------ | ------------------- |
| **难度**     | ⭐ 简单             |
| **预计工时** | 30 分钟             |
| **核心技能** | Zod、API 安全一致性 |

`app/api/sessions/[id]/route.ts` 的 PATCH 直接 `req.json()` 无验证（与 chat/documents 路由不一致）：

```ts
const patchSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
        citations: z.array(z.unknown()).optional(),
      }),
    )
    .optional(),
});
```

同步修复 `m.role as "user" | "assistant"` unsafe cast 为 Zod 推断类型。

---

### 4-E ✦ 速率限制（Rate Limiting）

|              |                                |
| ------------ | ------------------------------ |
| **难度**     | ⭐⭐ 中等                      |
| **预计工时** | 2–3 小时                       |
| **核心技能** | Next.js Middleware、令牌桶算法 |

`/api/chat` 和 `/api/documents/[id]/reindex` 无任何限制，LLM/嵌入调用成本高：

- **方案 A**：内存 LRU（无依赖）：每 IP 每分钟最多 10 次 chat、每文档每小时最多 1 次 reindex
- **方案 B**：`@upstash/ratelimit` + Redis（支持分布式）
- 实现位置：`middleware.ts` 拦截，或路由内直接检查

---

### 4-F ✦ SSE 流解析健壮化

|              |                              |
| ------------ | ---------------------------- |
| **难度**     | ⭐⭐ 中等                    |
| **预计工时** | 2–3 小时                     |
| **核心技能** | SSE 协议、流式解析、错误边界 |

`ChatWindow.tsx` 手动 `split("\n\n")` 解析 SSE，两个边界问题：

1. 单个 TCP chunk 跨事件边界时偶发丢事件
2. 流中断时 `buffer` 剩余内容被丢弃

改用 `eventsource-parser`（~1KB）：

```ts
import { createParser } from "eventsource-parser";
const parser = createParser((event) => {
  /* handle */
});
for await (const chunk of reader) {
  parser.feed(decoder.decode(chunk));
}
```

同时实现流中断恢复：捕获中断，将已有内容保存为消息（追加 `⚠️ _回答被中断_` 标记），不丢弃已生成内容。

---

### 4-G ✦ pgvector HNSW 索引

|              |                              |
| ------------ | ---------------------------- |
| **难度**     | ⭐⭐ 中等                    |
| **预计工时** | 1–2 小时                     |
| **核心技能** | 向量数据库索引原理、SQL 迁移 |

向量搜索未建 HNSW 索引，chunk 数量增加后查询越来越慢：

```sql
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

## 五、代码质量

### 5-A ✦ DeepSeek 客户端单例化

|              |                    |
| ------------ | ------------------ |
| **难度**     | ⭐ 简单            |
| **预计工时** | 30 分钟            |
| **核心技能** | 单例模式、依赖管理 |

`OpenAI` 实例在 `deepseek.ts` 和 `retrieval/query.ts`（翻译调用）中独立创建，浪费内存且难以 mock 测试。提取到 `src/lib/llm/clients.ts` 导出 `deepseekClient` 单例。

---

### 5-B ✦ 魔法数字提取到 config.ts

|              |              |
| ------------ | ------------ |
| **难度**     | ⭐ 简单      |
| **预计工时** | 30 分钟      |
| **核心技能** | 代码可维护性 |

散落的硬编码常量：`TOP_K = 8`、`TOP_FINAL = 6`（`query.ts`）、`EMBED_BATCH = 8`（`pipeline.ts`）、`3000` ms 轮询间隔（`DocumentTable.tsx`）。提取到 `src/lib/config.ts` 统一管理，便于调优。

---

### 5-C ✦ 文件扩展名改用 path.extname()

|              |                  |
| ------------ | ---------------- |
| **难度**     | ⭐ 极简          |
| **预计工时** | 10 分钟          |
| **核心技能** | Node.js path API |

`app/api/documents/route.ts:46` 的字符串切割 `.split(".").pop()` 在多点文件名下行为异常（如 `my.backup.pdf` → `.pdf` 正确，`report.pdf.old` → `.old` 错误）：

```ts
// 当前
const ext = "." + file.name.split(".").pop()?.toLowerCase();
// 修复
import path from "path";
const ext = path.extname(file.name).toLowerCase();
```

---

### 5-D ✦ Embedding 单例并发初始化锁

|              |                      |
| ------------ | -------------------- |
| **难度**     | ⭐ 简单              |
| **预计工时** | 20 分钟              |
| **核心技能** | 并发安全、Promise 锁 |

`src/lib/embeddings/bge.ts` 的 `getExtractor()` 若两个请求同时触发初始化，会并发执行两次 ONNX 模型加载（各占 ~570MB 内存）。加模块级 Promise 锁：

```ts
let initPromise: Promise<FeatureExtractionPipeline> | null = null;
export function getExtractor() {
  initPromise ??= pipeline("feature-extraction", MODEL_NAME);
  return initPromise;
}
```

---

## 六、测试

### 6-A ✦ 检索管道单元测试

|              |                                       |
| ------------ | ------------------------------------- |
| **难度**     | ⭐⭐⭐ 中等偏高                       |
| **预计工时** | 4–6 小时                              |
| **核心技能** | ts-jest 异步生成器测试、依赖注入 Mock |

为 `retrieve()` 写测试，mock `vectorSearch` 和 `translateQuery`：

```ts
jest.mock("../embeddings/bge", () => ({
  embed: jest.fn().mockResolvedValue(new Array(1024).fill(0.1)),
}));
jest.mock("../retrieval/search", () => ({
  vectorSearch: jest.fn().mockResolvedValue([{ id: "c1", content: "测试内容", score: 0.9 }]),
}));

test("双语检索合并去重", async () => {
  const chunks = await retrieve("什么是 RAG？", "deepseek");
  expect(chunks.length).toBeGreaterThan(0);
});
```

---

### 6-B ✦ Playwright 端到端测试

|              |                                    |
| ------------ | ---------------------------------- |
| **难度**     | ⭐⭐⭐ 中等偏高                    |
| **预计工时** | 1–2 天                             |
| **核心技能** | Playwright、E2E 测试策略、测试隔离 |

核心测试路径：

1. 上传文档 → 轮询 `status === "indexed"`
2. 输入问题 → 等待 SSE 流结束
3. 验证回答中出现引用角标 `[1]`
4. 点击引用 → 验证 CitationDrawer 内容非空

---

### 6-C ✦ 嵌入质量对比实验

|              |                                             |
| ------------ | ------------------------------------------- |
| **难度**     | ⭐⭐⭐ 中等偏高                             |
| **预计工时** | 1–2 天                                      |
| **核心技能** | 评估方法论、RAG 指标（MRR、NDCG）、实验设计 |

对比 `bge-m3`（现有）与其他嵌入模型（如 `text-embedding-3-small`），建立评估数据集，计算 Top-5 召回率，量化分析不同嵌入的效果差异。

---

## 附录：改动成本 × 学习价值矩阵

```
学习价值
   高 │  HyDE   Cross-encoder  ✅Sessions→PG
      │  ✅DeepSeek/Claude Cache  ✅Server Components  ✅Server Actions
      │
   中 │  ✅并行嵌入  ✅乐观更新  ✅Zod校验  SSE健壮化  速率限制
      │  HNSW索引  DB索引  Playwright  上下文管理
      │
   低 │  ✅启用Claude UI  ✅暗色模式  ✅文档搜索  ✅引用长度
      │  ✅会话重命名  单例化  config.ts  path.extname
      └────────────────────────────────────────────
         低改动成本     中改动成本     高改动成本
```

**下一步建议**：左上角未完成项 — §1-C Cross-encoder Rerank（最大质量跃升）+ §4-C DB 索引（最快见效）。

---

_最后更新：2026-04-27_
