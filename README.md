# 星屿云 · 财务系统前端

面向云服务销售的客户门户与运营后台。客户可以选择套餐、确认订单、查看账单和服务；管理员在同一站点维护商品、客户与运营设置。

基于 Vue 3、TypeScript 和 Vite，配合[财务后端](https://github.com/xiaoqiqixi/betteridcsys-backend)部署。默认简体中文、人民币，支持英文、美元与浅色/深色主题。

[使用文档](docs/README.md) · [接口文档](docs/CONTRACT.md) · [发行版本](https://github.com/xiaoqiqixi/betteridcsys-frontend/releases) · [问题反馈](https://github.com/xiaoqiqixi/betteridcsys-frontend/issues)

## 主要功能

| 模块 | 功能 |
| --- | --- |
| 商品选购 | 类型 → 地区 → 节点 → 套餐，规格与价格展示、购买确认 |
| 客户中心 | 控制台、订单与账单、付款入口、已有服务与账户设置 |
| 运营后台 | 商品新增/复制/编辑/上下架、客户与角色、订单详情、审计记录 |
| 站点管理 | 品牌信息、中英文内容、语言与购买币种、插件和版本信息 |
| 多端使用 | 桌面导航、移动端抽屉与底栏、统一表单和弹层、加载/空/错误状态 |

语言与购买币种可以分别设置。切换币种不换算已有订单，也不改变历史账单。付款和服务开通各有独立状态。

## 安装使用

**前端随财务整站安装，不需要用户编译或单独配置开发工具。**

前往[财务系统安装入口](https://github.com/xiaoqiqixi/betteridcsys-backend#一键安装)，按向导完成域名、HTTPS、数据库和管理员设置，即可使用客户门户与管理后台。

定制部署可使用[发行页](https://github.com/xiaoqiqixi/betteridcsys-frontend/releases)的静态文件包，版本须与财务后端匹配。部署说明见[使用文档](docs/README.md)。

## 开发说明

前端定制、构建和测试见[开发文档](docs/development/README.md)，正常安装不需要执行开发命令。

## 扩展与相关项目

- [财务后端](https://github.com/xiaoqiqixi/betteridcsys-backend)：商品、账户、订单、账单与插件 API。
- [云主控与 KVM 被控](https://github.com/xiaoqiqixi/betteridcsys-cloud)：计算资源与虚拟机管理。
- [界面规范](docs/UI_GUIDELINES.md)：组件、响应式布局与可访问性约定。

## 许可证

[Apache License 2.0](LICENSE)。
