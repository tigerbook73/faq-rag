---
status: final
updated: 2026-07-02
---

# Mobile Chat + Knowledge — 需求 / 架构 / 核心技术选型

## 背景与目标

Web 端已有完整的 FAQ RAG chat + knowledge 实现（会话管理、SSE 流式回答、引用展示、多 provider 选择、文档上传/indexing）。Mobile 端目前只是空壳 Expo 项目，没有路由、API 客户端、任何 UI 组件。

目标：在 mobile 端实现与 web 对等的全部 chat + knowledge 功能，直接调用 web 的 REST API（`EXPO_PUBLIC_API_URL`），不引入新的后端服务。

## 用户行为（behavior）

**Chat 功能：**

- 用户可以查看历史会话列表，按最后更新时间排序
- 用户可以新建一个对话会话
- 用户可以向 AI 提问，收到流式回答（逐 token 显示）
- 用户可以查看回答中引用的文档片段详情
- 用户可以切换 LLM provider（Claude / DeepSeek / OpenAI）
- 用户可以删除历史会话
- 用户重启 App 后自动跳转到上次访问的会话

**Knowledge 功能：**

- 用户可以查看已上传的文档列表，每条显示文件名、大小、状态、chunk 数
- 用户可以上传本地文件（pdf / docx / md / txt），查看上传和 indexing 进度
- 用户可以删除非内置文档
- 用户可以对非内置文档触发 reindex
- Indexing 中的文档自动每 3 秒刷新状态，直到完成

## 约束条件

- 文件大小限制：local 模式 1MB，cloud 模式（`EXPO_PUBLIC_IS_CLOUD=true`）50KB
- 支持文件格式：pdf、docx、md、txt
- 内置文档（`isBuiltIn=true`）不可删除、不可 reindex
- 重复上传（相同 SHA-256 + embedding model）应提示"文件已存在"
- 所有 API 调用均指向 `EXPO_PUBLIC_API_URL`（web 本地运行或部署环境）

## 验收标准

- [ ] App 启动显示三个 Tab（Chats / Knowledge / About）
- [ ] 新建会话并发送消息，能看到流式回答
- [ ] 回答含引用时，点击引用标记能看到文档详情
- [ ] 切换 provider 后下一条消息使用新 provider，重启后恢复
- [ ] 删除会话后列表更新
- [ ] 重启 App 后自动跳转上次会话
- [ ] 上传 PDF 走完完整上传流程（prepare→upload→index→embedBatch）
- [ ] 上传完成后文档出现在列表，状态显示 indexed
- [ ] Indexing 中的文档每 3 秒自动刷新状态
- [ ] 删除文档后列表更新
- [ ] 重复上传同一文件时提示"文件已存在"

## 架构概要

```
Mobile App (Expo / React Native)
  ├── expo-router v4        文件路由（tabs + stack）
  ├── Gluestack UI v2       UI 组件层（基于 NativeWind v4）
  ├── SWR                   数据获取与缓存
  └── apps/mobile/src/lib/api/
       ├── session.ts       session CRUD → /api/sessions
       ├── chat.ts          SSE streaming → /api/chat
       ├── document.ts      document CRUD + upload → /api/documents
       └── storage.ts       AsyncStorage 封装

packages/shared/src/
  └── schemas/              Zod schemas（session/chat/document）共享给 mobile 和 web

Web App (Next.js) ← 不修改
  └── REST API 继续服务 web 和 mobile 双端
```

## 核心技术选型

| 关注点        | 选择                                            | 理由                                                 |
| ------------- | ----------------------------------------------- | ---------------------------------------------------- |
| 路由          | expo-router v4                                  | 文件路由，与 Next.js App Router 一致                 |
| UI 组件库     | Gluestack UI v2（NativeWind v4）                | RN 端的 shadcn/ui 等价物，web 用 shadcn 保持风格一致 |
| Markdown 渲染 | react-native-markdown-display                   | 支持自定义渲染规则，用于引用标记处理                 |
| 引用详情弹窗  | Gluestack BottomSheet（若有）/ ActionSheet 兜底 | Step 1 安装后确认                                    |
| SSE 流式      | fetch + eventsource-parser                      | 与 web 完全一致，RN 0.86 已支持 streaming fetch      |
| 本地存储      | @react-native-async-storage/async-storage       | Expo 官方推荐                                        |
| 数据获取      | SWR                                             | 与 web 一致，自动重验证、缓存                        |
| 文档状态轮询  | SWR refreshInterval 动态开关                    | 有 active 文档时开启，全部完成后置 null              |
| 共享类型      | Zod → packages/shared                           | 防止 mobile/web 类型漂移                             |
| 文件选择      | expo-document-picker                            | Expo 官方，多平台支持                                |
| SHA-256       | expo-crypto                                     | 替代 web 的 crypto.subtle.digest                     |
| 上传进度      | expo-file-system.uploadAsync                    | 支持 onUploadProgress，fetch 不支持                  |

## 风险与开放问题

1. **Gluestack BottomSheet**：v2 是否有专门的 BottomSheet 组件待 Step 1 安装后确认；若无则用 ActionSheet
2. **Hermes streaming fetch**：RN 0.86 理论上已支持，需 Step 3 实测 SSE 解析
3. **Markdown 代码高亮**：react-native-markdown-display 不内置 highlight，若需要后续追加
4. **会话重命名**：暂不实现，可追加
