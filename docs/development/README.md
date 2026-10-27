# 前端开发指南

[文档首页](../README.md)

`src/` 为 Vue 应用，`tests/` 为组件、数据层与浏览器回归。`compatibility.json` 记录后端接口配对版本，不通过读取后端源码推断。依赖使用已提交的锁文件安装。

本地检查命令见下方“本地开发”。浏览器入口为 `npm run test:e2e`；先按测试文件说明准备隔离数据、真实后端及 HTTPS。纯组件或 loopback fixture 不能替代购买流程与数据库验收。

## 内置升级开发

前端升级作为财务整站升级的一部分：确认页面、版本说明、预检查、进度与失败恢复。不得由网页指定宿主命令、路径或下载地址；网络中断后查询原操作，不自动重发。

完整接口、权限与执行器设计见[内置升级方案](https://github.com/xiaoqiqixi/betteridcsys-backend/blob/main/docs/development/BUILTIN_UPGRADES.md)。这是一项开发规格，不是已发布功能说明。

## 工程记录

[仓库迁移](REPOSITORY_MIGRATION.md) · [初始文件来源](../../SOURCE_ORIGIN.json)

## 本地开发

需要 Node.js 24.19.0。先启动财务后端，再运行：

```sh
npm ci
API_PROXY_TARGET=http://127.0.0.1:8080 npm run dev
```

涉及登录会话的联调使用可信的同源 HTTPS。代理配置只用于开发，不关闭 Secure Cookie 或浏览器证书校验。

```sh
npm run typecheck
npm test
npm run build
npm run format:check
```

生产静态文件输出到 `dist/`。本页说明目录、浏览器测试与版本配对。

## 静态发行包

[文件格式、构建与内容校验](RELEASE_BUNDLE.md)。此工具供 CI 和受控组合流程使用，用户通过财务整站安装器安装。
