# 财务前端静态包合同

这是构建/内容消费边界，不是面向用户的安装命令。整站安装器从财务发行清单选取精确前端版本；用户不需要安装 Node 或执行 npm。

## 文件

- `aster-finance-frontend-VERSION.tar.gz`：`dist/`、项目许可证、依赖声明/许可证副本及构建所用的三份 package/兼容元数据；不包含 Vue 源码、服务器代码、node_modules 或运行秘密。
- `FRONTEND.json`：schema1、固定前端仓库名/ID、前端版本、精确 Core 配对版本、声明的源码提交/时间、归档名/大小/摘要和有序文件清单。

`compatibility.json` 的 `source_commit` 保留接口基线来源，不充当新前端发行提交。实际新前端提交记录在 `FRONTEND.json.source_commit`。前端版本与 Core 版本允许不同，但 Core 配对必须精确；不推断“相邻版本应该兼容”。

归档只含普通只读文件，UID/GID=0，固定提交时间，无链接/可执行文件/扩展 tar 头/路径穿越。文件最多2048个，单文件8MiB、归档32MiB、展开64MiB、清单512KiB，锁文件最多4096条包记录。收集依赖许可时逐文件检查总量，不先无限读入再拒绝。超过限制拒绝，不通过命令行提高上限。检验器只在内存读取，不解压到宿主文件系统。

依赖清单覆盖 production lock 闭包，不声称等于 tree-shaking 后实际进入浏览器的模块集合。能取得的 LICENSE/NOTICE 原文保留；未随 npm 包分发许可文件的条目仍记录其声明和空的 notice 列表，不编造第三方许可文本。发行前仍需依赖安全和许可证审查。

## 构建与消费

先按开发指南完成锁文件安装、测试和 Vite 构建，在可信 CI 的精确源码上运行：

```sh
python3 scripts/frontend_bundle.py build \
  --source-root "$GITHUB_WORKSPACE" --output "$RUNNER_TEMP/frontend-package" \
  --source-sha "$GITHUB_SHA" --source-date-epoch "$(git show -s --format=%ct HEAD)"
```

输出目录必须是新目录，不能覆盖旧结果。构建工具记录调用方声明的源码信息，**不能证明该工作区没有修改或构建者可信**；独立发布门禁负责精确 checkout 和验证同 SHA 成功检查。

```sh
python3 scripts/frontend_bundle.py inspect \
  --manifest /absolute/path/FRONTEND.json \
  --archive /absolute/path/aster-finance-frontend-VERSION.tar.gz \
  --expected-source-sha VERIFIED_SOURCE_SHA \
  --expected-core-version SELECTED_CORE_VERSION
```

`content_verified` 只表示内容、配对与归档结构校验通过；输出始终 `authenticated_source=false`。归档与相邻清单都可被攻击者替换，所以不能只检查包自带的 SHA256 后安装。独立发布/安装验证器还必须验证固定仓库 ID、工作流身份、精确提交、Release/资产 ID 与摘要，及相应签名。当前工具不下载、不执行、不安装，也不是升级服务。

## 回归与接入

`python3 scripts/test_frontend_bundle.py` 通过公开 CLI 检查真实包往返、字节确定性、旧输出保护、精确 Core/提交、错误来源/类型/重复字段、包篡改、穿越/链接/重复 tar 成员、权限、缺失文件和资源边界。

`Finance frontend checks` 在实际 Vite build 后执行测试及实际静态包构建/检查。它尚不发布 Release，也不代替后端组合、HTTPS 浏览器或升级演练。后台内置升级使用[整体设计](https://github.com/xiaoqiqixi/betteridcsys-backend/blob/main/docs/development/BUILTIN_UPGRADES.md)中的后续独立来源验证，不直接信任这个 CLI 的输出。
