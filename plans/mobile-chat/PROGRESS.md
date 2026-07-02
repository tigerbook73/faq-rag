# Mobile Chat + Knowledge 规划进度

> 每次开始或结束一段实质性工作，都要更新这份文件。新 session 恢复时，一切以这里的内容为准，不依赖对话记忆。

## 当前状态

**所处阶段**：逐步实现

**当前停在**：Step 1 完成，等待开始 Step 2

**建议下一步**：开始 Step 2 — API 客户端层（session.ts / chat.ts / document.ts / storage.ts + Jest 单元测试）。

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
| Step 2 | API 客户端层       | 待开始 |      |
| Step 3 | 会话列表屏幕       | 待开始 |      |
| Step 4 | 聊天屏幕           | 待开始 |      |
| Step 5 | Knowledge 列表屏幕 | 待开始 |      |
| Step 6 | 文档上传           | 待开始 |      |

---

## 第三层：实现

| 步骤   | 验证状态  | 前瞻性检查 | 备注                                                                   |
| ------ | --------- | ---------- | ---------------------------------------------------------------------- |
| Step 1 | ✅ 通过   | ✅ 通过    | Gluestack 无 BottomSheet，改用 @gorhom/bottom-sheet（见 DECISIONS.md） |
| Step 2 | ⏳ 待开始 | —          |                                                                        |
| Step 3 | ⏳ 待开始 | —          |                                                                        |
| Step 4 | ⏳ 待开始 | —          |                                                                        |
| Step 5 | ⏳ 待开始 | —          |                                                                        |
| Step 6 | ⏳ 待开始 | —          |                                                                        |

---

## 变更记录

| 时间       | 类型 | 影响的步骤 | 处理方式                                                                                                    |
| ---------- | ---- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| 2026-07-02 | 追加 | 全部       | 规划阶段将原 10 步合并为 6 步：环境初始化（Step 1+2）、API 客户端层（Step 3+8）、聊天屏幕（Step 5+6+7）合并 |

---

## 架构归并待办

- [ ] expo-router v4 作为 Expo 应用路由方案（来自 DECISIONS.md [arch]）
- [ ] Gluestack UI v2 作为 RN 端 UI 组件库（来自 DECISIONS.md [arch]）

---

## 最近更新

2026-07-02 规划完成，6 步路径确认，技术选型已与用户全部确认。
2026-07-02 Step 1 完成：packages/shared Zod schemas、expo-router 导航、NativeWind + Gluestack Button、Jest 配置。发现 Gluestack v2 无 BottomSheet npm 包，改用 @gorhom/bottom-sheet（见 DECISIONS.md Amendment）。
2026-07-02 Step 1 环境补丁：`expo-doctor` 发现依赖不满足 SDK 57——补齐 `react-native-worklets` peer dependency、`tailwindcss` 从误装的 v4 改回 NativeWind 要求的 `^3.4.0`（commit 834a3dc）；Web 端运行时报 `Cannot manually set color scheme, as dark mode is type 'media'`，`tailwind.config.js` 补 `darkMode: "class"` 修复（commit 0e9253d，见 DECISIONS.md）。
