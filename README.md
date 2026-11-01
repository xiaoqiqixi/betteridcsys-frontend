# 星屿云财务前端：客户门户、商城与运营后台

星屿云财务前端是[星屿云财务系统](https://github.com/xiaoqiqixi/betteridcsys-backend)的网页界面，基于 Vue 3 + TypeScript 开发，包含官网商城、客户控制台和管理后台三部分。构建产物是纯静态文件，由财务后端的 Nginx 同源提供，不需要 Node.js 运行时。

## 关键能力

### 官网与商城
首页、套餐列表（按地区、周期筛选）、配置下单（系统镜像、附加项、Root 密码或 SSH 密钥）、购物车与优惠码、公告。

### 客户控制台
云服务器管理（开关机、网页控制台、重装、重置密码、救援模式、快照、监控图表）、续费与升降级、订单、账单与支付、余额充值、工单、推广返佣、账户安全、SSH 密钥、API 令牌。

### 管理后台
概览与营收、客户与余额调整、订单、服务生命周期、账单（登记付款、退款、手动账单）、商品与价格矩阵、分类与镜像、优惠码、工单（内部备注、分配）、公告、自动化规则、云主控/支付插件/邮件集成、员工角色与权限、审计日志、站点与币种设置。

### 体验
中英文、深浅色主题、桌面与手机自适应、键盘与读屏可用；加载、空数据、出错三种状态完整；写操作防重复提交，结果不确定时提示核对后再重试。

### 支付插槽
支付方式完全由后端已启用的支付插件提供（跳转、扫码、银行转账三种结账方式），新增渠道无需修改前端。

***

## 运行环境

随财务后端一起安装，不需要单独部署。定制部署时把发行包中的 `dist/` 放到后端站点目录，版本须与后端 Core 匹配（见 `compatibility.json`）。

## 如何开发

需要 Node.js 24.19+。

```sh
npm ci
API_PROXY_TARGET=http://127.0.0.1:8080 npm run dev   # 代理到本地财务后端
npm run typecheck && npm run lint && npm test && npm run build
```

- [开发文档](docs/README.md)：目录结构、契约、状态与错误处理约定
- [API 契约（OpenAPI）](contract/openapi.json)：由 `src/contract` 生成，修改后执行 `npm run contract`
- [发行包](docs/RELEASE.md)：`scripts/frontend_bundle.py` 打包与校验

问题反馈：[Issues](https://github.com/xiaoqiqixi/betteridcsys-frontend/issues)

***

## 许可证

[Apache License 2.0](LICENSE)。软件按“原样”提供，不附带任何明示或暗示的保证。
