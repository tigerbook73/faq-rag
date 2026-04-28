# FAQ RAG 项目 — 第三阶段改进计划

> 基于对现有 UI 组件的系统审查，聚焦**将零散原生 HTML 元素统一替换为 Shadcn/ui 组件**，提升可访问性与样式一致性。
> 项目已深度集成 Shadcn（Badge、Button、Dialog、Drawer、Select 等均已正确使用），本阶段仅处理有实际收益的遗漏点。
> 规则同 Roadmap.md（直接执行，git add 但不 commit，保持专注）。

---

## 快速导航

| 类别                                | 项目数 | 完成 | 建议先做 |
| ----------------------------------- | ------ | ---- | -------- |
| [UI 组件规范化](#十一ui-组件规范化) | 2 项   | 2/2  | §11-A    |

---

## 优先级总览

```
阶段 11（UI 组件规范化）
  §11-A ✅ 替换 ChatSidebar 中的裸 <button>
  §11-B ✅ 替换 MessageBubble 引用列表中的裸 <button>
```

---

## 十一、UI 组件规范化

### 11-A 替换 ChatSidebar 中的裸 `<button>`

|              |                                            |
| ------------ | ------------------------------------------ |
| **难度**     | ⭐ 简单                                    |
| **预计工时** | 0.5 小时                                   |
| **核心技能** | Shadcn Button 变体、可访问性（focus ring） |

**现状**：`src/components/chat/ChatSidebar.tsx:211` 使用原生 `<button>`，手动拼接 hover 颜色过渡类：

```tsx
<button
  onClick={() => router.push("/chat/last")}
  className="w-full px-2 text-sm text-muted-foreground hover:text-foreground text-left transition-colors"
>
  ↩ Back to last chat
</button>
```

**目标**：替换为 `Button variant="ghost" size="sm"`，消除手动 hover 样式，获得内置 focus ring（键盘可访问性）。

**注意**：`ChatSidebar.tsx:177` 的内联重命名 `<input>` **保持不变** — 该元素刻意使用透明背景 + 仅底边框的极简风格，替换为 Shadcn `Input` 会引入盒型边框，破坏 `SidebarMenuButton` 内嵌的视觉效果。

**学习点**：何时选择 Shadcn 组件，何时维持原生元素（内嵌编辑场景 vs. 独立操作按钮）。

---

### 11-B 替换 MessageBubble 引用列表中的裸 `<button>`

|              |                                           |
| ------------ | ----------------------------------------- |
| **难度**     | ⭐ 简单                                   |
| **预计工时** | 0.5 小时                                  |
| **核心技能** | Shadcn Button 变体、内联 vs. 块级元素选择 |

**现状**：`src/components/chat/MessageBubble.tsx:53-59` 在引用脚注列表中使用原生 `<button>`：

```tsx
<button
  onClick={() => onCitationClick?.(c)}
  className="block text-xs text-muted-foreground hover:text-foreground text-left"
>
  [{c.id}] {c.documentName} — {c.preview.slice(0, 60)}…
</button>
```

**目标**：替换为 `Button variant="ghost" size="sm" className="h-auto text-xs ..."` 等价形式，获得统一 focus 处理和一致的点击目标大小。

**注意**：`MessageBubble.tsx:96` 的行内引用上标 `<sup><button>` **保持不变** — 在 `<sup>` 内使用 `Button variant="link"` 会引入多余 padding/height，破坏正文行内排版。原生 `<button>` 在此场景是正确选择。

**学习点**：区分块级操作按钮与行内文本链接按钮的组件选择策略。

---

_创建：2026-04-27_
