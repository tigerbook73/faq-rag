# e2e-test-architecture 需求

> 状态：已确认，待实施
> feature-id: e2e-test-architecture

## 1. 目标

重构本项目 Playwright E2E 测试的组织方式和运行命令，使默认 E2E 快速、低成本、稳定。默认测试使用本地真实 DB/Auth/Storage，但不调用真实 LLM provider 或 embedding provider；真实 provider 和真实 embedding/retrieval 场景必须显式 opt-in。

## 2. 背景问题

- 当前 `pnpm e2e` 直接运行所有 Playwright 测试，包含真实上传、真实索引、真实检索和 chat 流程。
- 本地真实 DB/Auth/Storage 是可接受的默认依赖；真正需要显式保护的是 LLM provider 和 embedding provider。
- 真实 embedding/retrieval 测试性能较差，即使未产生外部费用，也不适合默认频繁运行。
- 当前 `e2e/` 文件组织部分按历史 feature 或修复归档，例如 `e2e/multi-user/`，短期可用，但长期不利于按产品流程和测试成本维护。
- `real-api`、`prod`、`full` 等测试语义尚未明确，容易误跑昂贵、慢速或危险测试。

## 3. 期望行为

### 3.1 默认 E2E 不调用真实 provider

- 默认 `pnpm e2e` 不应调用真实 LLM provider 或真实 embedding provider。
- 默认 E2E 可以使用本地真实 DB/Auth/Storage。
- 默认 E2E 应覆盖核心 UI 流程、路由、权限边界和数据隔离。
- 除非特意 mock 某个场景，否则默认不要求 mock DB/Auth/Storage。

### 3.2 真实 API 测试必须显式 opt-in

- `real-api` 在本项目中专指真实 LLM provider 和真实 embedding provider。
- 需要真实 provider 的测试必须通过 `pnpm e2e:real-api` 或同等显式命令运行。
- 命令名保留 `real-api`，符合使用者直觉；内部标签仍需区分 `@real-api`、`@embed`、`@slow`、`@remote`。
- `prod` 仅用于真实生产环境 smoke，且必须有额外保护，避免误操作生产数据。

### 3.3 慢速 embedding/retrieval 测试默认排除

- 真实上传、索引、embedding、pgvector retrieval 测试应标记 `@embed`，必要时也标记 `@slow`。
- 默认 `pnpm e2e` 应排除 `@real-api`、`@embed`、`@slow` 和 `@prod-smoke`。
- `@prod-smoke` 如果已被其他默认场景覆盖，也仍应排除在默认 E2E 外。

### 3.4 E2E 文件按测试意图和系统边界组织

- 不再按某次 feature 或修复随意堆放测试。
- 测试目录应体现用户流程、系统边界或成本层级，例如 `smoke`、`auth`、`chat`、`knowledge`、`admin`、`isolation`。
- 共享 fixture、mock 和 helper 应集中放置。

### 3.5 Mock 范围收窄

- 第一版只要求 mock `/api/chat` SSE，避免真实 LLM provider 成本和波动。
- 第一版不要求 mock upload/index，因为 signed URL + Supabase Storage mock 成本较高。
- 真实 upload/index/retrieval 测试先标记为 `@embed @slow`，默认排除。

## 4. 命令语义

推荐命令：

```json
{
  "e2e": "playwright test --grep-invert \"@real-api|@embed|@slow|@prod-smoke\"",
  "e2e:ui": "playwright test --ui --grep-invert \"@real-api|@embed|@slow|@prod-smoke\"",
  "e2e:smoke": "playwright test --grep @smoke --grep-invert \"@real-api|@embed|@slow|@prod-smoke\"",
  "e2e:full": "playwright test --grep-invert \"@real-api|@embed|@slow|@prod-smoke\"",
  "e2e:real-api": "REAL_API=1 playwright test --grep \"@real-api|@embed\"",
  "e2e:embed": "REAL_API=1 playwright test --grep @embed",
  "e2e:remote": "playwright test --grep @smoke",
  "e2e:prod:smoke": "E2E_ENV=prod REAL_API=1 playwright test --grep @prod-smoke"
}
```

命名约定：

- `real-api`：真实 LLM provider 或真实 embedding provider。
- `embed`：真实上传、索引、embedding 或 pgvector retrieval 场景。
- `remote`：测试已部署站点 URL，由 `E2E_BASE_URL` 指定。
- `prod`：仅表示生产环境，不等同于 real API；必须谨慎使用。
- `full`：完整默认覆盖范围，但仍排除昂贵、慢速和生产测试。

## 5. 标签约定

- `@smoke`：最小关键路径。
- `@mock`：特意 mock 某个外部或昂贵依赖。
- `@real-api`：触发真实 LLM provider 或 embedding provider。
- `@embed`：触发真实上传、索引、embedding 或 pgvector retrieval。
- `@slow`：耗时明显高于普通 E2E。
- `@remote`：针对 `E2E_BASE_URL` 指向的部署环境。
- `@prod-smoke`：生产环境极小 smoke。

## 6. 生产/远端保护要求

- `e2e:remote` 必须由调用者提供 `E2E_BASE_URL`。
- `e2e:prod:smoke` 必须同时满足：
  - `E2E_ENV=prod`
  - `E2E_BASE_URL` 匹配 allowlist
  - 只运行 `@prod-smoke`
  - 禁止写入、删除或修改真实业务数据
- 如未来确需写入远端环境，必须使用专用测试租户/测试账号，并有清理逻辑。

## 7. 验收标准

- [ ] 默认 `pnpm e2e` 不运行 `@real-api`、`@embed`、`@slow`、`@prod-smoke` 测试。
- [ ] 提供显式 `pnpm e2e:real-api` 命令运行真实 provider/embedding 测试。
- [ ] 提供 `pnpm e2e:embed` 命令运行真实 embedding/retrieval 测试。
- [ ] 提供 smoke 命令，用于快速本地/PR 前验证。
- [ ] E2E 文件目录按用户流程/系统边界重组，避免按历史 feature 命名。
- [ ] 第一版只 mock `/api/chat` SSE；upload/index mock 不在第一版强制范围内。
- [ ] prod smoke 有 allowlist 和只读保护。
- [ ] 文档说明各命令是否可能产生外部 API 成本。
- [ ] 现有 E2E 覆盖不降低，迁移后仍可通过。

## 8. 不在范围内

- 建立完整 CI/CD 流水线。
- 新增跨浏览器覆盖。
- 新增移动端视觉适配测试。
- 大规模性能/负载测试。
- 第一版 mock Supabase Storage signed upload/index 流程。
