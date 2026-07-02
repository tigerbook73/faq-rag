# Mobile Chat + Knowledge 全局约束 / 决策清单

> 只放对多个步骤或章节有约束力的、已经拍板的决定。每个细化步骤开始前都会完整读这份文件。

---

## 技术选型

- [arch] 路由方案：expo-router v4，文件路由，与 web 端 Next.js App Router 一致。（来源：架构阶段，理由：monorepo 内统一文件路由体验，降低认知切换成本）

- [arch] UI 组件库：Gluestack UI v2（基于 NativeWind v4），是 shadcn/ui 在 RN 端的等价物。（来源：架构阶段）

- 引用详情弹窗：**使用 `@gorhom/bottom-sheet`**。Step 1 确认 Gluestack v2 不以 npm 包形式提供 BottomSheet（需要 CLI 复制组件文件，TTY 限制无法使用），`@gluestack-ui/nativewind-utils` 也不含此组件。改用 `@gorhom/bottom-sheet`（需 `react-native-reanimated` + `react-native-gesture-handler`，已安装）。（来源：Step 1 实装确认）

- SSE 流式：fetch + eventsource-parser，与 web 端完全一致。（来源：架构阶段）

- 数据获取：SWR，与 web 端一致。（来源：架构阶段）

## 数据层

- 共享类型：Zod schema 从 `apps/web/src/lib/shared/schemas/` 搬运到 `packages/shared/src/schemas/`，mobile 从 `@faq-rag/shared` import。Web 端继续使用自己的文件，不修改。（来源：架构阶段，理由：防止 mobile/web 类型漂移）

- Web 端数据层不修改：所有 DB 操作、API 路由均保持不变，mobile 仅作 API 消费方。

## API 层

- Mobile 调用 web REST API，base URL 来自 `EXPO_PUBLIC_API_URL` 环境变量。

- Session 写入规范（对标 web 的 Key Conventions）：任何 session 写操作后，同时 `mutate('/api/sessions')`（列表）AND `mutate('/api/sessions/${id}', updated, { revalidate: false })`（单条缓存），防止导航回旧聊天时看到过期数据。

- 上传进度：使用 `expo-file-system.uploadAsync`（支持 `onUploadProgress`），不用 fetch（fetch 不支持 upload progress 事件）。

## 前端

- 内置文档（`isBuiltIn=true`）在 Knowledge 列表中只读，不显示删除/reindex 操作。

- 文档状态轮询：SWR `refreshInterval` 动态开关——有 `pending/uploaded/indexing` 状态文档时开启 3000ms，全部完成（`indexed`/`failed`）后置 `0`。

- 首次发送消息时从 question 取前 30 字设为会话标题，调用 `updateSession(id, { title })` 写入。

## 其他横切约束

- 未完成的功能（会话重命名、Rebuild All、Markdown 代码高亮）不在本次范围内，后续作为追加型变更处理。
