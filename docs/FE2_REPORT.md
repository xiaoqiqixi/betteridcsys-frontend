# FE-2 联调验收记录

验证日期：2026-11-02。后端 main 固定为 `7a393b6c17acc987d3e16080710862da7234b30c`，未修改后端源码。启动、seed 和复现步骤见 [本地联调](README.md#本地联调)。

| 交付项 | 状态 | 证据与限制 |
| --- | --- | --- |
| 本地全栈 | done | macOS MySQL 8.4.13 + Linux Core + 真实 bank-transfer 插件；HTTPS Vite 5178。owner/client/reader、双币种三周期产品、镜像、部门、公告、信用余额、SSH key、工单和订单均已 seed。 |
| 全页面巡检与修复 | partially done | 全部 52 路由 × 4 宽度 × 2 主题 × 2 语言，共 832 次访问完成，前端异常已修复。后端概览、审计、控制器、币种写入仍有缺口，详见 [CONTRACT_GAPS.md](CONTRACT_GAPS.md)。 |
| E2E 套件及 CI | done | 11 条业务流程 + 16 组页面矩阵 + 2 个生产首页测试，本地 29/29 通过，无 skip/expected failure。CI 使用全新 MySQL 8.4、固定 SHA 构建的真实后端和真实支付插件。 |
| 无障碍 | done | 34 个主页面 × 2 宽度 × 2 主题 × 2 语言，共 272 次 axe 扫描，serious/critical 为零。另验证菜单及对话框焦点、Esc 返回触发器、折叠侧栏入口的键盘可用性；自动扫描不等于完整 WCAG 人工认证。 |
| 首屏 JS | done | 基线 214,847 bytes gzip；最终英文 177,673、中文 178,391（约减少 17%）。两种语言均低于 180,000。生产浏览器核验实际下载集合，管理 schema 与私有文案不在首屏请求中。 |
| main 提交 / CI | done（以对应提交运行结果为准） | 直接提交 main，不建分支、PR、tag 或 release。每次推送前 fetch/rebase 并重跑本地检查；CI 同时保留既有构建、依赖安全、静态包门禁与新增 E2E 门禁。具体 SHA 和最后运行结果在交付回复列出。 |

## 成功流程

- 注册、退出、登录、忘记密码提交及确认状态。
- Debian + hostname + SSH key 配置，真实报价、checkout、信用余额支付、已支付订单。
- 服务改名、自动续费关闭、到期取消申请及撤回、续费账单、余额支付并确认到期日推进。power/console/reinstall 按 seed 服务的真实 capabilities 隐藏。
- 客户/员工双向工单回复；内部备注对客户不可见。
- 其他会话撤销；SSH key 新增删除；API token 只显示一次、列表不返回明文、撤销。
- CNY/USD 多周期价格矩阵精确保存最小货币单位，并在重新加载后验证。
- 只读员工隐藏写入入口、禁用价格输入、禁止员工管理路由；直接写请求返回 403。
- 真实银行转账说明、读取失败的重试状态、菜单/对话框/侧栏键盘操作。

## 页面矩阵证据

本地全量运行耗时约 3.2 分钟，`test-results/audit-*/audit.json` 保存每页结果，`artifacts/e2e/results-full.json` 保存此次完整结果。CI 上传 `frontend-e2e-<SHA>`（7 天），包含 JSON、HTML 报告、失败 trace 和 Core 日志。

- 横向溢出：0；新增 console/pageerror/失败请求/契约错误：0。
- 已知契约日志：`getClientOverview` 290 次（共享布局重复读取也计入）、`adminOverview` 16 次、`adminListAudit` 16 次。
- 已知失败请求：控制器端点 404 共 48 次，伴随 48 条 Chromium 资源错误。
- 可见错误区域共 64 页次，来自已知概览、审计和集成缺口；没有把这些页面标为业务成功。
- 缺口签名绑定后端 SHA，按具体 operation、字段路径和校验 issue 匹配；新差异仍使 CI 失败。

## 本地检查

`npm run typecheck`、`npm run lint`、`npm test`（37 项）、`npm run build -- --manifest`、`npm run check:initial-js`、`npm run format:check`；Python 静态包测试 18 项、发布源校验测试 9 项；完整 Playwright 29 项。生成的 OpenAPI 与重构前完全相同，既有测试未删除或放宽。最后增补的折叠侧栏名称和状态另有针对性键盘复测。

## 需维护者处理

后端负责人补齐 [契约缺口](CONTRACT_GAPS.md)，并决定是否继续支持密码下单，或通过双方确认的契约变更明确 SSH key 要求。当前成功 E2E 覆盖后端支持的 SSH key 路径。

环境偏差：最初启动 Lima 时，工具自动在 `~/Library/Caches/lima` 写入了下载/转换缓存，未完全遵守“仓库外不写入”的限制。后续数据、VM 和测试产物均使用仓库内 `artifacts/`；没有擅自清理该仓库外缓存。维护者可决定是否手工删除该工具缓存，后续复现应预下载 raw 镜像到仓库内再启动 VM。
