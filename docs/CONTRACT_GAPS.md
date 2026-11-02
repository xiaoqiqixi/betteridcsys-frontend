# 真实后端契约缺口（FE-2）

2026-11-02 验证 backend main `7a393b6c17acc987d3e16080710862da7234b30c`（固定于 `compatibility.json`），MySQL 8.4.13，生产模式，真实 session/CSRF 和 bank-transfer 插件。后端源码未修改。下表路径均省略 `/api/v1` 前缀；请求带 `X-Aster-API-Version: 0.6`。

前端原先漏发版本协商头，导致订单、账单和目录读取进入旧版响应；已在所有请求及 session bootstrap 中修复。Zod 校验和生成的 `contract/openapi.json` 未放宽。下列剩余响应仍被严格拒绝，页面显示错误状态。

## 返回 200，但字段不符合契约

`Money` 是 `{amount_minor,currency,decimal_places}`。可空字段必须显式返回 `null`，不能省略。

| 请求 / operation ID | 字段 | 期望 | 实际 |
| --- | --- | --- | --- |
| `GET /overview` / `getClientOverview` | `counts`、`credit`、`amount_due`、`services`、`invoices`、`announcements` | counts 对象、两个 Money、三个数组 | 全部缺失；仍返回 `active_services/monthly_total_minor/pending_invoices/unpaid_total_minor/recent_orders` 等旧字段。客户概览及布局摘要不可用。 |
| `GET /admin/overview` / `adminOverview` | `revenue_today`、`revenue_month`、`revenue_prev_month`、`outstanding`、`counts`、`revenue_series`、`attention` | 四个 Money、counts 对象、两个数组 | 全部缺失；仍返回 `revenue_minor/customers/total_services/unpaid_invoices/unpaid_total_minor` 等旧字段。管理概览不可用。 |
| `GET /admin/audit-events` / `adminListAudit` | `items[].at` | timestamp string | 缺失；实际字段为 `created_at`。 |
| 同上 | `items[].actor_type` | `client` / `staff` / `system` | 缺失；旧记录提供 `owner_id/actor_email`。 |
| 同上 | `items[].target_type`、`items[].target_id` | 两个 nullable string | 缺失；旧记录提供 `target`。 |
| 同上 | `items[].ip`、`items[].reason` | 两个 nullable string | 缺失；旧记录提供 `detail`。 |
| 同上 | `next_cursor` | nullable string | 缺失；旧分页为 `has_more/limit`。 |

`counts` 的精确成员：客户侧为 `active_services/unpaid_invoices/open_tickets/expiring_soon`，管理员侧为 `clients/new_clients_month/active_services/pending_orders/open_tickets/overdue_invoices`，均为整数。完整定义见 `src/contract/support.ts`、`src/contract/admin.ts`。

## 端点和写入缺口

| 请求 | 契约要求 | 实际 / 复现 |
| --- | --- | --- |
| `GET /admin/integrations/controllers` | 控制器列表 | 404 `NOT_FOUND`。owner 的集成页和产品编辑器受到影响；只读员工不会请求该端点。 |
| `POST /admin/currencies` | `CurrencyRegistry`，每个币种含 `precision_locked: boolean` | 将 `GET /admin/currencies` 的 `data` 原样提交，返回 400 `INVALID_BODY`；后端写入结构拒绝 `precision_locked`。seed 使用后端可接受的写入字段建立 USD，前端仍发送完整契约，未隐瞒设置保存失败。 |
| `POST /orders`，item 含非空 `root_password` | 请求 schema 允许配置密码 | 400 `PASSWORD_REQUIRES_DIRECT_ACTION`：后端明确要求下单使用 SSH key，密码只能在开通后通过服务直接操作设置。属于后端能力限制，不是响应字段错误；密码下单路径仍待前后端负责人确定契约。SSH key 下单与余额支付已经实际成功。 |

## 已验证成功的边界

- 新订单/账单/服务列表和详情、双语目录分类、affiliate 概览及推荐列表均已通过响应校验；不再列为历史缺口。
- 配置 Debian、主机名和 SSH key → checkout → 余额全额支付 → 已支付订单成功。
- 既有 generic 服务支持改名、关闭自动续费、到期取消申请及撤回、生成续费账单和余额支付；付款后 `next_due_at` 确实推进。该 seed 服务不支持 power/console/reinstall，按真实 capabilities 隐藏，未伪造操作成功。
- 真实 bank-transfer 插件返回转账说明。空网关列表本身不是契约错误；需正确安装 policy、manifest、UID 和 socket。此后端的 Linux 插件加载器只接受 amd64 ELF，ARM 联调用 qemu-user 运行同一真实插件。

## 回归门禁与后续处理

`tests/e2e/known-backend-gaps.json` 仅保留三个 operation 的精确 Zod issue 签名（路径、类型、期望值、消息），绑定上述 SHA。所有 52 页 × 16 组视口/主题/语言都保存原始 console、HTTP/网络错误、契约错误、溢出和错误状态证据；仅上述控制器路径的 404 可作为已知缺口。新增差异会让测试失败。业务成功流程没有 skip 或 expected failure。

后端负责人需补齐 overview、admin overview、audit-events、controllers 和币种写入结构，并确认密码下单的产品/契约策略。修复后更新固定 SHA，重新执行完整矩阵，删除对应缺口签名。前端不把旧响应转换成假成功，也不编辑后端实现。
