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

## 本地联调

本次实际环境：macOS arm64，Node 24.19.0，MySQL **8.4.13** 原生实例，Lima 2.2.1 的 Ubuntu 24.04 arm64 VM，真实 Core 0.6.0。后端只读检出在忽略目录 `artifacts/backend`；固定源码 SHA 见 `compatibility.json`。不用内存 store、demo 模式或 mock API 代替成功流程。

当前开发站点为 **https://localhost:5178**，Vite 代理到 `http://127.0.0.1:18080`。生产模式 session 使用 Secure cookie，所以本地也用 HTTPS；证书仅用于联调，Playwright 设置 `ignoreHTTPSErrors`。测试生成物、数据库、VM、浏览器、Go/npm 缓存均放在 `artifacts/`，不要提交它们。

### 可复现的 Linux / CI 启动方式

在一次性 Linux VM 中准备 Node 24.19.0、Go 1.26+、mysql 客户端、Docker、systemd、Python 3、openssl。CI 使用 Go 1.27.3。以下命令从仓库根目录执行；`install-bank.sh` 的 root 操作只用于这个可丢弃 VM。

```sh
mkdir -p artifacts/mysql-data
export npm_config_cache="$PWD/artifacts/npm-cache"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/artifacts/browsers"
export TMPDIR="$PWD/artifacts"
npm ci
npx playwright install --with-deps chromium
npm run e2e:prepare
bash scripts/e2e/build-backend.sh

# 全新、空的 fe2_test 数据库；不能指向工作数据库。
docker run --detach --rm --name fe2-mysql \
  --publish 127.0.0.1:13306:3306 \
  --env MYSQL_ALLOW_EMPTY_PASSWORD=yes --env MYSQL_DATABASE=fe2_test \
  --mount "type=bind,source=$PWD/artifacts/mysql-data,target=/var/lib/mysql" \
  mysql:8.4.13
export MYSQL_PORT=13306
export MYSQL_DSN='root@tcp(127.0.0.1:13306)/fe2_test?parseTime=true'
# 等 mysqladmin --protocol=tcp -h127.0.0.1 -P13306 -uroot ping 成功再继续。
bash scripts/e2e/start-linux.sh

# 第一个终端保持运行
LOCAL_HTTPS=1 API_PROXY_TARGET=http://127.0.0.1:18080 npm run dev -- --port 5178 --strictPort

# 第二个终端：真实 API seed，然后运行浏览器验收
npm run e2e:seed
npm run build -- --manifest
npm run test:e2e
```

运行 Docker 前创建空的 `artifacts/mysql-data`。每轮完整验收需要新数据库，避免重复注册同一测试用户；保留失败数据库用于排查，然后只重建自己的 `fe2_test`。`bootstrap.sh` 拒绝其他数据库名，执行真实迁移和 bootstrap CLI，再应用 `seed.sql`。`seed.mjs` 通过真实 API 建产品、价格、信用余额、工单和公告，并验证真实 bank-transfer 网关已就绪。CI 从全新 MySQL 8.4 容器启动，设置 `E2E_SEED=1`，在 Playwright 启动 HTTPS 开发服务器后自动 seed。

### 本次 macOS 原生 MySQL + Lima 布置

MySQL 8.4.13 macOS arm64 官方压缩包解压到 `artifacts/mysql`，数据目录 `artifacts/mysql-data`。首次初始化及启动命令：

```sh
artifacts/mysql/bin/mysqld --no-defaults --initialize-insecure \
  --basedir="$PWD/artifacts/mysql" --datadir="$PWD/artifacts/mysql-data"
artifacts/mysql/bin/mysqld --no-defaults \
  --basedir="$PWD/artifacts/mysql" --datadir="$PWD/artifacts/mysql-data" \
  --socket="$PWD/artifacts/m.sock" --port=13306 --bind-address=127.0.0.1 \
  --mysqlx=0 --log-error="$PWD/artifacts/mysql.log"
artifacts/mysql/bin/mysql --no-defaults --socket="$PWD/artifacts/m.sock" -uroot \
  -e 'CREATE DATABASE fe2_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci'
```

Lima VM `fe2` 的仓库挂载点是 `/workspace`，4 CPU / 4 GiB / 16 GiB，转发 guest 18080 → host 18080。设置 `LIMA_HOME="$PWD/artifacts/lima"`；VM 镜像应预下载并转换为仓库内的 raw 镜像再配置本地 `images.location`，避免 Lima 使用用户目录的自动下载/转换缓存。实际 Core UID 为 501、GID 为 1000，以 `id -u` / `id -g` 为准，不能假设两者相同。

```sh
export LIMA_HOME="$PWD/artifacts/lima"
ssh -F artifacts/lima/fe2/ssh.config -o ExitOnForwardFailure=yes -N \
  -R "/tmp/fe2-mysql.sock:$PWD/artifacts/m.sock" lima-fe2
```

在 VM 中使用 `MYSQL_DSN='root@unix(/tmp/fe2-mysql.sock)/fe2_test?parseTime=true'` 和 `MYSQL_SOCKET=/tmp/fe2-mysql.sock`。Core 必须在 Linux 运行；当前支付插件运行时只接受 amd64 ELF，因此 `build-backend.sh` 构建本机架构 Core、amd64 bank-transfer。在 ARM VM 安装 `qemu-user-static`，安装脚本会通过它启动同一真实插件；CI amd64 不需要模拟器。插件工作 UID 28002 与 Core 分离，manifest/policy 由 root 拥有，socket 所在目录 0750、socket 0660，bank 配置仅包含虚构转账说明。

后端环境：`APP_MODE=production`、`APP_ORIGIN=https://localhost:5178`、`LISTEN_ADDR=127.0.0.1:18080`、`MYSQL_ALLOW_INSECURE=true`、`PLUGIN_DIRECTORY=/opt/fe2/plugins`、`PLUGIN_POLICY_FILE=/opt/fe2/policy.json`。`SESSION_SECRET` 来自 `e2e:prepare` 生成的 `artifacts/session-secret`，不写入版本库。使用 `limactl shell --workdir=/workspace fe2 -- ...` 在 VM 执行 bootstrap、安装插件和运行 Core，宿主运行 Vite/Playwright。

### 测试数据和验收范围

测试密码均为 `Fe2-Local!2026-Deterministic`，只用于这些本地虚构账户：

| 用户 | 用途 |
| --- | --- |
| `owner@fe2.test` | owner 管理员，完整权限 |
| `client@fe2.test` | 客户，CNY 信用余额 |
| `reader@fe2.test` | 只读员工，显式 read 权限，无写权限 |

种子还包含三款 CNY/USD 产品，各有月付/季付/年付价格；Debian/Ubuntu 镜像；技术支持部门；双语公告；真实 bank-transfer 网关；工单；通过新契约创建的待支付订单/账单；可续费的既有服务；用于下单的 SSH 公钥。密码下单目前被后端明确拒绝，成功验收使用 SSH key。

`tests/e2e/pages.ts` 对应所有命名路由，单元测试检查覆盖不会漏掉新增页面。巡检执行 375 / 768 / 1280 / 1440 × light/dark × zh-CN/en；附件 `audit.json` 记录控制台、请求、契约错误、横向溢出、axe 和可见错误状态。34 个主页面在 375 / 1280 宽度、双主题、双语言执行 axe serious/critical 门禁。业务流程先完成，再执行只读页面矩阵，避免数据修改干扰巡检。测试等待网络响应、DOM 或真实服务就绪，不使用固定睡眠。

概览、审计、控制器、币种保存等剩余后端缺口及精确字段差异见 [CONTRACT_GAPS.md](CONTRACT_GAPS.md)。已知缺口保留为有 SHA 约束的证据，不能据此宣称业务全链路已完成。失败 trace 只用于一次性测试账户，保留 7 天，不要把真实账户用于这些录制。

### 首屏预算

`npm run build -- --manifest` 后执行 `npm run check:initial-js`。统计冷启动首页入口、布局、首页、所选语言及 `theme-init.js` 的全部静态依赖；每个响应单独按 gzip level 6 压缩，相加，门限 **180,000 bytes**。基线 `0d69f19` 为 **214,847 bytes**；优化后英文 **177,673 bytes**、中文 **178,391 bytes**。CI 检查两种语言，并用生产预览浏览器验证实际请求集合。

公共、客户、管理端点注册表分别在 `contract/index.ts`、`client-endpoints.ts`、`admin-endpoints.ts`；管理页面显式导入后者。OpenAPI 使用完整注册表，契约测试确保没有删除/放松 schema。国际化资源在构建时预编译，按语言和公开/私有页面加载；确认框及菜单内容在打开时加载，保持原来的布局和文案。实现依据 [Vue I18n 的构建优化说明](https://vue-i18n.intlify.dev/guide/advanced/optimization)。
