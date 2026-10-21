# 维护自己的 Codex++

日常使用个人源码构建的 `.app`；需要上游新功能或修复时，手动合并已审阅的稳定版本，测试并启动验收后再切换。不要用上游安装包覆盖定制版，也不要用 GitHub 的“丢弃提交后同步 Fork”来更新。

## 仓库与版本

- `origin`：<https://github.com/cxin3813/CodexPlusPlus>，保存个人 `main` 和可用版本标签。
- `upstream`：<https://github.com/BigPizzaV3/CodexPlusPlus>，原作者源码。
- `main`：当前选定的上游基线，加独立的个人定制提交；不自动追踪最新版，不改写已发布历史。
- `local/usage-no-promotions-20261021`：本次整理的定制基线标签。
- 2026-10-21 建立 Fork 时，上游基线为 `42feefdd`。新 Fork 自动带入的较新 `main` 已另存为 `codex/fork-initial-main-20261021`；它不是已验收的个人版本。

首次初始化为了让新 Fork 的 `main` 对应当前定制基线，在保存初始分支后用精确 lease 替换一次新建 Fork 的 `main`。日后升级使用普通 merge/push，不再强推。

### 2026-10-21 基线验证

- 前端测试 626 项通过、1 项跳过，类型检查与 Vite 构建通过。
- 相关 Rust 测试 230 项通过，Release 构建及 app 签名校验通过；不是整个 Rust workspace 的全量测试。
- 本次 app：`dist/local-build-20261021-fork-baseline/Codex++.app`。已启动此路径的进程，确认其 `manager.start`；管理页无推广，本地服务与 Codex 调试连接正常。
- 上一版 app：`dist/local-build-20261016-usage-no-promotions/Codex++.app`，以及 `/Applications/Codex++.app` 均保留。
- 本次仅整理现有定制，没有合并上游新版；未重新逐项实测状态栏和旧皮肤场景，相关回归测试已通过。

## 两个补丁分别维护

### 用量读取修复

`fix: 修复多数据库下的会话用量读取`（`1f1b6716`）：

- 仅用量查询在允许的候选数据库中寻找最新有效 rollout，实时和历史共用定位逻辑。
- 不改变删除、恢复的选库规则；读取不创建数据库，不合并不同 rollout 的事件。
- SQLite、权限等错误仍上报，不当成“记录缺失”。
- 代码与回归测试：`crates/codex-plus-data/src/storage.rs`、`crates/codex-plus-data/tests/storage_adapter.rs`。

上游实现同等修复后，先核对这些边界和测试，再决定撤掉重复定制。

### 应用内去推广

`custom: 移除推荐入口及推广取数`（`2127df5a`）：

- 移除管理页和 Codex 注入页的推广入口、页面、启动取数；默认广告接口返回空列表，保留响应契约。
- 默认主题不带推广；旧设置和导入主题只在渲染副本中滤掉推广字段，不改写用户保存的数据。
- 保留功能拓展、市场入口，以及已发布的拓展常量名；旧 sponsor tab 请求回到主页。
- 主要测试：前端 `no-promotions.test.ts`、`renderer-inject.test.ts`、`panel-layout.test.ts`、`tool-sidebar-startup.test.ts`，Rust 的 `ads`、`cdp_bridge`、`dream_skin` 和旧主题渲染测试。

这是个人策略，随上游变化维护。范围是应用内推广，不删除上游 README、网站或许可证中的内容。

## 更新前先保存可用状态

在仓库根目录执行：

```bash
git status --short
git remote -v
git fetch upstream --tags
git log --oneline main..upstream/main
```

工作区有未提交改动时先停下：按用途保存自己的改动，其他人的改动另行协调，不自动 stash、reset 或全量提交。不要只看版本号就更新。

选好目标后，审阅差异并保存更新前标签（以下版本号仅为示例）：

```bash
UPSTREAM_REF=v1.9.0  # 替换为本次已经审阅的上游标签或提交
git diff --stat main "$UPSTREAM_REF"
git diff main "$UPSTREAM_REF" -- crates/codex-plus-data/src/storage.rs crates/codex-plus-core/src/ads.rs crates/codex-plus-core/src/assets.rs apps/codex-plus-manager/src/App.tsx assets/inject/renderer-inject
BEFORE_TAG="local/pre-update-$(date +%Y%m%d-%H%M%S)"
git tag -a "$BEFORE_TAG" -m '更新前的个人可用版本'
git push origin "$BEFORE_TAG"
git merge --no-ff "$UPSTREAM_REF"
```

小更新直接维护 `main`；大版本或预期冲突较多时，从当前 `main` 开 `codex/update-版本号`，验收后合回。合并中决定暂不升级，可执行 `git merge --abort`。不要为通过测试而删掉仍需保留的定制断言。

## 验证、构建，再切换

```bash
git diff --check
cd apps/codex-plus-manager
npm test
npm run check
npm run vite:build
cd ../..
cargo test -p codex-plus-data --test storage_adapter
cargo test -p codex-plus-core --lib assets::tests::saved_theme_promotions_never_reach_renderers_or_live_updates
cargo test -p codex-plus-core --test ads --test cdp_bridge --test dream_skin
cargo build --release -p codex-plus-manager
```

修改注入分片时先运行 `node scripts/assemble-renderer-inject.mjs`，将分片、manifest 和组装产物一起提交。若 sherpa-onnx 下载报 `SOCKS feature disabled`，且环境已有可用的 HTTP/HTTPS 代理，仅对当前 Cargo 命令清除 `ALL_PROXY` 和 `all_proxy`，保留 HTTP/HTTPS 代理；不修改依赖或全局代理配置。

将新二进制装进独立目录的 `.app`，不要覆盖当前可用版。macOS 可以沿用现有 bundle 的资源与 Info.plist（升级版本时相应更新版本字段）：

```bash
BUILD="dist/local-build-$(date +%Y%m%d-%H%M%S)"
APP_TEMPLATE="dist/local-build-20261016-usage-no-promotions/Codex++.app"
mkdir -p "$BUILD"
ditto "$APP_TEMPLATE" "$BUILD/Codex++.app"
cp target/release/codex-plus-plus "$BUILD/Codex++.app/Contents/MacOS/CodexPlusPlus"
codesign --force --deep --sign - "$BUILD/Codex++.app"
codesign --verify --deep --strict "$BUILD/Codex++.app"
```

模板是本机已有的完整 app bundle，不在 Git 中。换机器时需先准备匹配版本的 bundle 模板。

退出旧 Codex++ 管理进程，再 `open "$BUILD/Codex++.app"`；不要退出官方 Codex 或清理会话数据。确认存活的进程路径是新 `.app`，且 `~/.codex-session-delete/codex-plus.log` 有该进程的 `manager.start`。仅有启动记录不够：单实例保护可能写完记录便退出。

实际验收：

1. 新旧会话的状态栏均能显示用量，实时与历史接口正确，异常不会假装无数据。
2. 管理页、Codex 导航栏无推广；开启皮肤、载入旧主题也不重新出现推广。
3. Codex++ 和拓展入口仍能使用。

通过后提交合并后的必要修复，打新的 `local/…` 可用版本标签，普通推送 `main` 和该标签。记录标签、app 路径、验证结果；不要把 `.app`、本地配置、日志或凭据提交到源码仓库。

## 回退

- 运行版本：退出新版 Codex++，打开保留的上一版 `.app`。版本标签仅保存源码，不能代替本机二进制备份。
- 合并尚未完成：`git merge --abort`。
- 合并已经推送：在工作区干净时，对对应 merge commit 执行 `git revert -m 1 <合并提交>`，重新测试并提交回退；不要强推改写共享历史。若合并后还有修复提交，一并评估其依赖。
- 若某次升级涉及用户配置或数据库迁移，升级前另存对应数据备份；仅换回旧 `.app` 不保证能撤销数据迁移。不要删除会话、身份数据或配置来回退。

官方 Codex 更新不会覆盖这两个源码提交，但可能改变数据库或界面结构，需要兼容性复测。Codex++ 应用内更新源当前仍指向原作者的安装包；本 Fork 不配置自动同步、自动发布或自建更新服务。
