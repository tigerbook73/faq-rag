# FAQ RAG 项目 — 学习路线图与改进计划

> 基于项目现状（CLAUDE.md）整理，按**学习价值 × 实施成本**排序。  
> 每项标注：难度 · 预计工时 · 核心技能收益 · 具体切入点。

---

## 快速导航

| 类别                                          | 项目数 | 建议先做                          |
| --------------------------------------------- | ------ | --------------------------------- |
| [RAG 核心质量](#一rag-核心质量)               | 6 项   | DeepSeek Prefix Cache 验证、Claude Prompt Caching |
| [Next.js / React 技能](#二nextjs--react-技能) | 5 项   | Server Components、Server Actions |
| [用户体验 / 缺失功能](#三用户体验--缺失功能)  | 6 项   | 启用 Claude UI、暗色模式          |
| [可靠性 / 生产就绪](#四可靠性--生产就绪)      | 5 项   | 并行嵌入、Zod 校验                |
| [测试](#五测试)                               | 3 项   | 检索管道测试                      |

---

## 优先级总览（建议执行顺序）

```
阶段 1（速赢，1–2 天）
  §1-A  DeepSeek Prefix Cache 验证   ← 无需改代码，加日志确认命中率
  §1-B  Claude Prompt Caching        ← cache_control 标注，验证命中率
  §3-A  启用 Claude UI               ← 1 行改动，立即可见
  §3-B  暗色模式切换                 ← next-themes 已装，补入口即可
  §1-E  引用片段完整显示             ← 改一个截断常量

阶段 2（核心 RAG 提升，3–5 天）
  §1-C  交叉编码器重排序             ← Cohere API 或本地模型，最大质量跃升
  §1-D  HyDE 检索                    ← ~10 行，学习 RAG 进阶技巧
  §4-A  并行文档块嵌入               ← Promise.all + 并发限制

阶段 3（Next.js 深水区，3–5 天）
  §2-A  知识库页改 Server Components ← RSC 心智模型
  §2-B  上传改 Server Actions        ← useActionState / useFormStatus
  §2-C  乐观更新                     ← React Query onMutate/onError

阶段 4（持久化 + 可靠性，4–7 天）
  §3-F  会话迁移至 PostgreSQL        ← 数据库 schema 迁移实战
  §4-B  API 文件校验 + Zod           ← 安全加固
  §4-C  流中断恢复                   ← 错误边界实践

阶段 5（测试 + 高阶 RAG，5–10 天）
  §5-A  检索管道单元测试             ← ts-jest 异步生成器测试
  §5-B  Playwright E2E 测试          ← 全链路自动化
  §1-F  语义分块                     ← 替代固定字符分块
```

---

## 一、RAG 核心质量

### 1-A ✦ DeepSeek Prefix Cache 验证 【优先级最高 · 零改动】

|              |                                      |
| ------------ | ------------------------------------ |
| **难度**     | ⭐ 极简                              |
| **预计工时** | 30 分钟                              |
| **核心技能** | LLM Token 成本优化、API 响应结构分析 |

**核心结论**：DeepSeek 的前缀缓存（Prefix Caching / KV Cache）**完全自动**，不需要任何代码标注。只要相邻两次请求的前缀（system prompt + 历史消息）相同，缓存就会命中。命中后缓存 token 的价格是正常价格的 **1/10**（$0.014/M vs $0.14/M）。

**你现在只需要做一件事：加日志确认是否已在命中**

```ts
// src/lib/llm/deepseek.ts — 在非流式请求后读取 usage
const response = await openai.chat.completions.create({ ... });
console.log("[DeepSeek Cache]", {
  hit:  response.usage?.prompt_cache_hit_tokens  ?? 0,
  miss: response.usage?.prompt_cache_miss_tokens ?? 0,
});
```

流式请求中，`usage` 在最后一个 chunk 里（需开启 `stream_options: { include_usage: true }`）：

```ts
// 流式模式
const stream = await openai.chat.completions.create({
  stream: true,
  stream_options: { include_usage: true },   // ← 开启 usage 上报
  ...
});
for await (const chunk of stream) {
  if (chunk.usage) {
    console.log("[DeepSeek Cache]", {
      hit:  chunk.usage.prompt_cache_hit_tokens  ?? 0,
      miss: chunk.usage.prompt_cache_miss_tokens ?? 0,
    });
  }
}
```

**常见缓存失效原因**（如果 hit 一直为 0，排查这几点）：

| 原因                                 | 定位                            | 修复                                     |
| ------------------------------------ | ------------------------------- | ---------------------------------------- |
| system prompt 含动态内容（时间戳等） | `deepseek.ts` 的 system 字段    | 把动态内容移入 user message              |
| 每轮只发最新消息、不发历史           | `route.ts` 构建 messages 的逻辑 | 确保历史消息按顺序拼接在前               |
| 上下文顺序每次不一致                 | retrieval 注入的 `<context>` 块 | 固定 context 在 system 或首条 message 中 |

---

**参考：Claude 的等价功能**（启用 Claude UI 后同样适用）

Claude 需要**显式标注**才能缓存，无需代码却要加注解：

```ts
// src/lib/llm/claude.ts
system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }];
// 验证：response.usage.cache_read_input_tokens > 0
```

两者对比：DeepSeek 自动但不可控；Claude 手动但可精确指定缓存边界。

---

### 1-B ✦ Claude Prompt Caching

|              |                                                             |
| ------------ | ----------------------------------------------------------- |
| **难度**     | ⭐⭐ 中等                                                   |
| **预计工时** | 2–3 小时                                                    |
| **核心技能** | Anthropic SDK `cache_control`、Token 成本优化、流式事件解析 |

**与 1-A 的区别**：DeepSeek 自动缓存前缀，无法精确控制；Claude 需要显式用
`cache_control: { type: "ephemeral" }` 标注要缓存的 token 块，可精确指定缓存边界，
适合 RAG 场景。

**实施要点**（`src/lib/llm/claude.ts`）：

```ts
// system prompt 每次请求相同，标注后第二次起命中缓存
system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]

// 标注最后一条 assistant 消息（稳定历史前缀）和当前 user 消息（含 RAG context）
const addCache = i === lastAssistantIdx || (i === messages.length - 1 && m.role === "user");
```

**验证**：从 `stream.on("message")` 回调读取完整 usage（比 `message_start` 事件更准确）：

```ts
stream.on("message", (msg) => {
  // msg.usage.cache_creation_input_tokens — 写入缓存（1.25x 计费）
  // msg.usage.cache_read_input_tokens    — 命中缓存（0.1x 计费）
});
```

**最低缓存阈值**：claude-sonnet 系列 ≥ 1024 tokens，短对话 assistant 消息积累不足时
`cache_read` 为 0 是正常现象，不代表实现有误。

---

### 1-C ✦ 交叉编码器重排序（Cross-encoder Rerank）

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

**目标**：先让 LLM 根据问题生成一个"假设性答案"（即使不准确），对这个假设答案做嵌入后再检索，命中率显著提升。

**实施要点**（在 `query.ts` 的 `retrieve()` 函数中）：

```ts
// 1. 生成假设性答案
const hypotheticalAnswer = await generateHypotheticalAnswer(query, provider);

// 2. 对假设答案嵌入（替换或追加到原有查询向量）
const hydeVector = await embed(hypotheticalAnswer);

// 3. 合并原始查询向量 + HyDE 向量参与检索（加权或取并集）
const results = await mergedVectorSearch([queryVector, hydeVector], topK);
```

**注意**：HyDE 会多一次 LLM 调用，需在失败时回退到原始查询，保持优雅降级。

---

### 1-E ✦ 引用片段完整显示

|              |                          |
| ------------ | ------------------------ |
| **难度**     | ⭐ 简单                  |
| **预计工时** | 30 分钟                  |
| **核心技能** | UX 细节、citation 数据流 |

**现状**：`app/api/chat/route.ts:40` 中 `content.slice(0, 200)` 截断了引用预览。

**修改**：将截断长度改为 0（不截断）或 800，同时更新 `CitationDrawer` 展示完整内容。用户看到完整引用块，对 AI 回答的信任度显著提升。

---

### 1-F ✦ 语义分块（Semantic Chunking）【高级】

|              |                                           |
| ------------ | ----------------------------------------- |
| **难度**     | ⭐⭐⭐⭐ 较难                             |
| **预计工时** | 1–2 天                                    |
| **核心技能** | 分块策略对 RAG 质量的影响、嵌入相似度阈值 |

**现状**：`pipeline.ts` 使用 `RecursiveCharacterTextSplitter`，按字符数硬切，可能把同一语义段落切断，也可能把不相关内容拼在一起。

**目标**：用相邻句子的嵌入余弦相似度判断"语义边界"，在相似度骤降处切块。需要对比实验（A/B 测量检索精度）才能验证效果，是一个很好的实验性学习项目。

---

## 二、Next.js / React 技能

### 2-A ✦ 知识库页面改用 Server Components + Suspense

|              |                                                      |
| ------------ | ---------------------------------------------------- |
| **难度**     | ⭐⭐ 中等                                            |
| **预计工时** | 3–5 小时                                             |
| **核心技能** | RSC 心智模型、Suspense 流式渲染、App Router 数据获取 |

**现状**：`app/knowledge/page.tsx` 全是 `"use client"`，手动 `new QueryClient()`，在客户端 fetch `/api/documents`。

**目标架构**：

```
app/knowledge/
  page.tsx          ← Server Component，直接 await prisma.document.findMany()
  DocumentTable.tsx ← "use client"，接收 documents 作为 props，负责交互
  loading.tsx       ← Suspense fallback，骨架屏
```

**核心改动**：

```tsx
// app/knowledge/page.tsx（Server Component，无需 "use client"）
import { prisma } from "@/lib/prisma";

export default async function KnowledgePage() {
  const documents = await prisma.document.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <Suspense fallback={<DocumentTableSkeleton />}>
      <DocumentTable initialDocuments={documents} />
    </Suspense>
  );
}
```

**学习收益**：真正理解 RSC 与 Client Component 的边界，以及"在服务器上直接查数据库"的 App Router 范式。

---

### 2-B ✦ 上传改用 Server Actions

|              |                                                             |
| ------------ | ----------------------------------------------------------- |
| **难度**     | ⭐⭐ 中等                                                   |
| **预计工时** | 3–5 小时                                                    |
| **核心技能** | Server Actions、`useActionState`、`useFormStatus`、渐进增强 |

**现状**：`UploadZone` 组件 `fetch("/api/documents", { method: "POST" })` 手动调用 API。

**目标**：

```tsx
// app/knowledge/actions.ts
"use server";
export async function uploadDocument(formData: FormData) {
  const file = formData.get("file") as File;
  // ... ingestBuffer(file)
}

// UploadZone.tsx
import { useActionState } from "react";
const [state, action, isPending] = useActionState(uploadDocument, null);
```

**学习收益**：理解 Server Actions 与 API Routes 的适用场景差异，学会 `useFormStatus` 实现 pending 状态的原生表单反馈。

---

### 2-C ✦ DocumentTable 乐观更新

|              |                                                 |
| ------------ | ----------------------------------------------- |
| **难度**     | ⭐⭐ 中等                                       |
| **预计工时** | 2–3 小时                                        |
| **核心技能** | React Query `onMutate` / `onError` 乐观更新模式 |

**现状**：`deleteMut` 和 `reindexMut` 等服务器确认后才更新 UI，用户感知到明显延迟。

**目标**：

```ts
deleteMut = useMutation({
  mutationFn: deleteDocument,
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ["documents"] });
    const prev = queryClient.getQueryData(["documents"]);
    queryClient.setQueryData(
      ["documents"],
      (old) => old.filter((d) => d.id !== id), // 立即更新 UI
    );
    return { prev };
  },
  onError: (_, __, ctx) => {
    queryClient.setQueryData(["documents"], ctx.prev); // 失败回滚
  },
});
```

---

### 2-D ✦ 完整的 useSyncExternalStore 封装

|              |                                            |
| ------------ | ------------------------------------------ |
| **难度**     | ⭐⭐ 中等                                  |
| **预计工时** | 2–3 小时                                   |
| **核心技能** | React 18/19 外部存储同步、自定义 Hook 设计 |

**现状**：`ChatWindow` 直接读写 localStorage；`ChatSidebar` 用 `useSyncExternalStore` + 自定义事件，但两者逻辑分散。

**目标**：把 `chat-storage.ts` 封装为统一的 `useChatSessions()` hook，内部用 `useSyncExternalStore`，所有组件通过 hook 消费，彻底消除 localStorage 直接调用的散落。

---

### 2-E ✦ 多轮对话上下文管理

|              |                                  |
| ------------ | -------------------------------- |
| **难度**     | ⭐⭐ 中等                        |
| **预计工时** | 2–4 小时                         |
| **核心技能** | Token 窗口管理、对话历史截断策略 |

**现状**：`app/api/chat/route.ts` 目前发送多少轮历史？需确认是否有上下文窗口管理逻辑。如果没有，长对话会超出 LLM 上下文限制。

**目标**：实现滑动窗口策略——保留最近 N 条消息，或按 token 数截断，确保 `messages` 数组不超出模型限制（DeepSeek Chat：64K tokens；Claude Sonnet：200K tokens）。DeepSeek 上下文窗口较小，这一点尤其需要注意。

---

## 三、用户体验 / 缺失功能

### 3-A ✦ 在 UI 中启用 Claude 【最快见效】

|              |         |
| ------------ | ------- |
| **难度**     | ⭐ 极简 |
| **预计工时** | 15 分钟 |
| **核心技能** | —       |

**现状**：`src/components/chat/ProviderSelect.tsx` 中 Claude 选项被设为 `disabled`，但服务端路由已完整支持。

**修改**：删除 `disabled` 属性，让用户可以选择两个 Provider 并实际对比效果。

---

### 3-B ✦ 暗色模式切换

|              |                                  |
| ------------ | -------------------------------- |
| **难度**     | ⭐ 简单                          |
| **预计工时** | 1 小时                           |
| **核心技能** | next-themes、Tailwind dark: 变体 |

**现状**：`next-themes` 已安装，但没有 UI 入口。

**修改**：在 `ChatWindow` 或全局 Header 中加一个 `ThemeToggle` 按钮（shadcn/ui 已有 `<Button variant="ghost">` + `Sun/Moon` 图标）。

---

### 3-C ✦ 会话重命名（行内编辑）

|              |                                      |
| ------------ | ------------------------------------ |
| **难度**     | ⭐⭐ 中等                            |
| **预计工时** | 2–3 小时                             |
| **核心技能** | 受控输入、双击编辑模式、键盘事件处理 |

**在 `ChatSidebar.tsx` 中**：双击会话标题进入编辑模式，`Enter` 保存，`Escape` 取消。需要 `updateSession(id, { title })` 函数（`chat-storage.ts` 中添加）。

---

### 3-D ✦ 文档搜索 / 筛选

|              |                      |
| ------------ | -------------------- |
| **难度**     | ⭐ 简单              |
| **预计工时** | 1 小时               |
| **核心技能** | 受控输入、客户端过滤 |

在 `DocumentTable` 顶部加一个 `<Input placeholder="搜索文档名..." />` 并用 `useMemo` 过滤列表。约 10 行代码，但体验提升明显。

---

### 3-E ✦ 对话导出

|              |                                     |
| ------------ | ----------------------------------- |
| **难度**     | ⭐⭐ 中等                           |
| **预计工时** | 2–3 小时                            |
| **核心技能** | Blob API、文件下载、Markdown 序列化 |

在侧边栏每个会话上加"导出为 Markdown"按钮，将 `messages` 序列化为 `.md` 文件（含引用来源），触发浏览器下载。

---

### 3-F ✦ 会话持久化迁移至 PostgreSQL

|              |                                                   |
| ------------ | ------------------------------------------------- |
| **难度**     | ⭐⭐⭐ 中等偏高                                   |
| **预计工时** | 4–8 小时                                          |
| **核心技能** | Prisma schema 迁移、API 设计、服务端 session CRUD |

**现状**：会话存 localStorage，2 天后删除，换设备丢失。

**新增 Prisma schema**：

```prisma
model Session {
  id        String    @id @default(uuid())
  title     String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  SessionMessage[]
}

model SessionMessage {
  id        String   @id @default(uuid())
  sessionId String
  role      String
  content   String
  citations Json?
  createdAt DateTime @default(now())
  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}
```

新增 API：`GET/POST /api/sessions`、`GET/PATCH/DELETE /api/sessions/[id]`。

---

## 四、可靠性 / 生产就绪

### 4-A ✦ 并行文档块嵌入

|              |                           |
| ------------ | ------------------------- |
| **难度**     | ⭐⭐ 中等                 |
| **预计工时** | 1–2 小时                  |
| **核心技能** | Promise 并发控制、p-limit |

**现状**：`pipeline.ts` 中 `processDocument` 串行 `for` 循环嵌入每个 chunk，100 个 chunk 的文档要等所有 chunk 顺序完成。

**目标**：

```ts
import pLimit from "p-limit";
const limit = pLimit(5); // 最多 5 个并发嵌入

await Promise.all(
  chunks.map((chunk, i) =>
    limit(async () => {
      const vector = await embed(chunk.content);
      await prisma.$executeRaw`INSERT INTO chunks ...`;
    }),
  ),
);
```

大文档索引速度预计提升 3–5 倍。

---

### 4-B ✦ API 层文件校验 + Zod 输入验证

|              |                               |
| ------------ | ----------------------------- |
| **难度**     | ⭐⭐ 中等                     |
| **预计工时** | 2–3 小时                      |
| **核心技能** | Zod schema 验证、安全编程实践 |

**现状**：`app/api/documents/route.ts` 无文件大小上限、无 MIME 类型校验；`/api/chat` 无请求体 schema 验证。

**目标**：

```ts
// 文件上传校验
const ALLOWED_TYPES = [
  "application/pdf",
  "text/markdown",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE_MB = 50;

if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "不支持的文件类型" }, { status: 400 });
if (file.size > MAX_SIZE_MB * 1024 * 1024) return NextResponse.json({ error: "文件超过 50MB" }, { status: 413 });

// chat API 请求体校验
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  chatId: z.string().uuid().optional(),
  provider: z.enum(["claude", "deepseek"]).optional(),
});
```

---

### 4-C ✦ 流式传输中断恢复

|              |                                            |
| ------------ | ------------------------------------------ |
| **难度**     | ⭐⭐⭐ 中等偏高                            |
| **预计工时** | 3–5 小时                                   |
| **核心技能** | SSE 错误处理、React 错误边界、部分响应保存 |

**现状**：SSE 流中断时，`ChatWindow` 丢弃已生成的 `assistantContent`，回退到纯用户消息。

**目标**：捕获中断，将已有内容保存为消息（追加 `\n\n⚠️ _回答被中断_` 标记），不丢弃已生成的内容。

---

### 4-D ✦ pgvector HNSW 索引优化

|              |                              |
| ------------ | ---------------------------- |
| **难度**     | ⭐⭐ 中等                    |
| **预计工时** | 1–2 小时                     |
| **核心技能** | 向量数据库索引原理、SQL 迁移 |

**现状**：向量搜索是否已建 HNSW 索引？如果没有，随着 chunk 数量增加查询会越来越慢。

**目标**：在 Prisma migration 中加：

```sql
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

### 4-E ✦ 速率限制（Rate Limiting）

|              |                                |
| ------------ | ------------------------------ |
| **难度**     | ⭐⭐ 中等                      |
| **预计工时** | 2–3 小时                       |
| **核心技能** | Next.js Middleware、令牌桶算法 |

在 `middleware.ts` 中对 `/api/chat` 和 `/api/documents` 加基于 IP 的速率限制，防止滥用（可用 `@upstash/ratelimit` + Redis，或内存实现的简单版本）。

---

## 五、测试

### 5-A ✦ 检索管道单元测试

|              |                                       |
| ------------ | ------------------------------------- |
| **难度**     | ⭐⭐⭐ 中等偏高                       |
| **预计工时** | 4–6 小时                              |
| **核心技能** | ts-jest 异步生成器测试、依赖注入 Mock |

**目标**：为 `retrieve()` 写测试，mock `vectorSearch` 和 `translateQuery`：

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

### 5-B ✦ Playwright 端到端测试

|              |                                    |
| ------------ | ---------------------------------- |
| **难度**     | ⭐⭐⭐ 中等偏高                    |
| **预计工时** | 1–2 天                             |
| **核心技能** | Playwright、E2E 测试策略、测试隔离 |

**核心测试路径**：

1. 上传文档 → 轮询 `status === "indexed"`
2. 在聊天框输入问题 → 等待 SSE 流结束
3. 验证回答中出现引用角标 `[1]`
4. 点击引用 → 验证 CitationDrawer 内容非空

---

### 5-C ✦ 嵌入质量对比实验

|              |                                             |
| ------------ | ------------------------------------------- |
| **难度**     | ⭐⭐⭐ 中等偏高                             |
| **预计工时** | 1–2 天                                      |
| **核心技能** | 评估方法论、RAG 指标（MRR、NDCG）、实验设计 |

对比 `bge-m3`（现有）与其他嵌入模型（如 `text-embedding-3-small`），建立评估数据集（问题 + 期望召回的文档块），计算 Top-5 召回率，量化分析不同嵌入的效果差异。

---

## 附录：改动成本 × 学习价值矩阵

```
学习价值
   高 │  HyDE   Cross-encoder  Server Components
      │  DeepSeek Cache验证  Server Actions  PG Sessions
      │
   中 │  并行嵌入  乐观更新  Zod校验  流中断恢复
      │  useSyncExternalStore  HNSW索引  Playwright
      │
   低 │  启用Claude UI  暗色模式  文档搜索  引用长度
      └────────────────────────────────────────────
         低改动成本     中改动成本     高改动成本
```

**结论**：先做左上角（高价值 + 低成本）：§1-A DeepSeek Cache 验证、§1-B Claude Prompt Caching、§3-A 启用 Claude UI（解锁双 Provider 对比）、§1-E 引用片段长度。

---

_文档生成日期：2026-04-26_
