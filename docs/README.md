# 开发文档

## 目录结构

```text
src/
  contract/      API 契约（Zod）：数据结构 + 端点注册表，唯一事实来源
  shared/
    api/         HTTP 客户端、vue-query 封装（useApiQuery / useApiList / useApiMutation）
    ui/          通用组件（Ui*），只使用语义化设计 token
    composables/ 格式化、站点配置、提示、确认框、错误文案
    stores/      会话、偏好、购物车（Pinia）
    i18n/        en.ts 为结构基准，zh-CN.ts 必须同构
  app/           路由、布局、应用外壳
  modules/       store（商城）/ auth / portal（客户）/ admin（后台）
  styles/        Tailwind v4 与设计 token（深浅色、主题色）
contract/openapi.json   由 src/contract 导出，供后端实现与测试
```

## 契约优先

1. 新接口先写进 `src/contract`（Zod 结构 + `endpoint()`），管理端点必须声明 `permission`。
2. `npm run contract` 重新导出 `contract/openapi.json`，测试会校验导出文件是最新的。
3. 页面只通过 `api.<group>.<name>` 调用；客户端会在发送前校验请求体、收到后校验响应，任何不符合契约的响应都按错误处理。

## 读写约定

- 读：`useApiQuery`（单个资源）、`useApiList`（游标分页 + 加载更多）。
- 写：`useApiMutation`。标记 `idempotent` 的端点自动带 `Idempotency-Key`；失败结果“不确定”（超时、断网、发送后 5xx）时保留同一个键，并禁用重复提交，提示用户先刷新核对。
- 金额一律是 `Money`（整数最小单位 + 小数位快照），使用 `shared/lib/money.ts` 解析与格式化，禁止浮点运算。
- 401 / `AUTH_REQUIRED` / `CSRF_INVALID` 会结束会话并跳转登录；403 不登出。

## 界面约定

- 每个数据区域都处理加载（骨架屏）、空数据（`UiEmpty`）、出错（`UiErrorState` + 重试）。
- 危险操作用 `confirm()`；需要审计原因的后台操作用 `ReasonDialog`；不可逆操作要求输入主机名或 ID 确认。
- 表格在窄屏通过 `hideBelow` 隐藏次要列；表单在手机上单列排列。
- 不使用 `v-html`；不加载外部资源（站点 CSP 仅允许同源）；模板属性值中不要写字面量 `//`（vue-tsc 会误判，改用脚本常量）。
- 所有可见文字走 i18n，`npm test` 会检查中英文键完全一致且无缺失。

## 脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器，`/api` 代理到 `API_PROXY_TARGET`（默认 `http://127.0.0.1:8080`） |
| `npm run typecheck` | vue-tsc 类型检查 |
| `npm run lint` | ESLint |
| `npm test` | 单元测试（金额、客户端、契约、路由、文案完整性、OpenAPI 同步） |
| `npm run build` | 生产构建到 `dist/` |
| `npm run contract` | 重新导出 OpenAPI |
| `npm run format` | Prettier 格式化 |
