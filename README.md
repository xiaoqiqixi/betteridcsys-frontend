# 星屿云 · 财务系统前端

Vue 3 / TypeScript 客户门户与管理后台：商品选购、订单、账单、已有服务、客户和运营设置。默认中文 / CNY，语言与币种独立；金额、订单状态和操作结果由真实财务 API 决定。

[财务前端](https://github.com/xiaoqiqixi/betteridcsys-frontend) · [财务后端](https://github.com/xiaoqiqixi/betteridcsys-backend) · [主控与被控](https://github.com/xiaoqiqixi/betteridcsys-cloud)

## 本仓库包含什么

- `src/`：完整财务前端；客户与管理员界面、移动端导航、主题与统一控件。
- `tests/`：组件、数据层和浏览器回归；后者需要真实后端或明确隔离的 loopback fixture。
- `docs/`：[API 合同](docs/CONTRACT.md)、[UI 规范](docs/UI_GUIDELINES.md)及商品/财务边界说明。
- `compatibility.json`：本轮选择的 Core 0.5.10 接口版本，不再通过扫描后端源码猜版本。

不包含后端数据库、支付执行、主控或宿主机权限。页面不会把连接失败替换成演示成功。

## 本地开发

Node.js 24.19.0；使用锁文件安装，不提交 node_modules、dist 或环境私钥。

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run format:check
# 另行启动后端；默认反代到回环 8080
API_PROXY_TARGET=http://127.0.0.1:8080 npm run dev
```

Secure Cookie 的生产联调必须采用受信任的同源 HTTPS，不能关闭浏览器安全检查。生产静态站点由 Nginx 服务 `dist/`，`/api/v1` 反代到财务后端；Vite 不是生产服务器。没有后端时只能验组件，不算购买流程或数据库验收。

## CI 与发行

`Finance frontend checks` 执行类型检查、组件/数据层测试、生产构建、格式和依赖安全扫描。CI 构建产物不是已发布版本；独立浏览器和真实 MySQL 全链仍需配对后端验收。

## 拆分与交付状态

本仓库从已提交、通过原项目 CI 的 main `fa4d2139ff5ecfc2802c0825e839134ca488d138` 拆出，不包含原工作区未完成的 schema14/员工权限改动。保留 Apache-2.0 许可证；初始来源见 [SOURCE_ORIGIN.json](SOURCE_ORIGIN.json)。它是来源清单，不是发行签名或本仓库的验收证明。

只使用 `main` 分支，不导入旧 Git 历史、贡献者署名或旧标签。原仓库 CI 结果不自动继承；本仓库构建与验收以自己的提交和运行记录为准。

三个新仓库均完成构建、首版 Release、匿名产物下载/校验和安装更新来源迁移后，才删除原仓库及其 Releases。未完成迁移门禁时不得删除；具体门禁见 [仓库迁移清单](MIGRATION.md)。
