# 发行包

`scripts/frontend_bundle.py` 把构建好的 `dist/`、许可证、生产依赖清单和 `compatibility.json` 打成可复现的 `aster-finance-frontend-<版本>.tar.gz`，并生成 `FRONTEND.json`（版本、源提交、逐文件 SHA-256）。

```sh
npm ci && npm run build
python3 scripts/frontend_bundle.py build --source-root . --output /tmp/pkg \
  --source-sha "$(git rev-parse HEAD)" --source-date-epoch "$(git show -s --format=%ct HEAD)"
python3 scripts/frontend_bundle.py inspect --manifest /tmp/pkg/FRONTEND.json \
  --archive /tmp/pkg/aster-finance-frontend-<版本>.tar.gz --expected-source-sha "$(git rev-parse HEAD)" \
  --expected-core-version "$(python3 -c 'import json;print(json.load(open("compatibility.json"))["core_version"])')"
```

- `inspect` 只校验内容，不证明来源；来源由财务后端发行流程按仓库 ID、工作流和摘要独立验证。
- `compatibility.json` 的 `core_version` 必须与配对的财务后端 Core 版本一致；后端通过 `FRONTEND_PAIR.json` 固定前端提交与该文件的摘要。
