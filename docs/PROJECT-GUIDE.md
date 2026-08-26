# Image2 Canvas 项目指导手册

本手册是跨 Codex 窗口继续开发的稳定上下文。它记录项目事实、功能边界和恢复策略；具体窗口的临时想法不写在这里。

## 当前基线

- 工作目录：`E:\AI剧本\image2-canvas`
- 主分支：`master`
- 当前稳定提交以 `git log --oneline --decorate -12` 为准；最近已存在按功能命名的提交和标签。
- 当前工作区可能存在未提交改动。新窗口必须先执行 `git status --short --branch`，不得假设工作区干净。
- Node.js 要求：20 或更高；校验命令：`npm run verify`。
- 本地入口：`npm start`，默认地址 `http://127.0.0.1:45173`。
- 当前稳定基线可用 `git log --oneline --decorate -12` 查看；截至本手册更新，最近稳定提交包含 RunningHub Krea2 工作流、Krea2 自定义尺寸/比例预设和分组画板文字放大。

## 产品边界

这是一个本地、浏览器/桌面应用式的无限节点画布，核心能力包括：

- 项目首页：新建、打开、搜索、复制、删除项目。
- 工作流画布：提示词、参考图、Image2、生图结果、模型回答、视频/H3 和剧本流节点。
- 连线按端口类型约束；Image2 结果可以继续作为参考图输入。
- 参考图节点可通过标题栏或图片预览区域拖动整个节点；图片预览双击、裁剪、下载、禁用、缩放和端口操作保持独立。
- 项目状态保存在浏览器 IndexedDB；项目可导出为 `.image2.json`。
- 生成任务由本机服务排队，任务与媒体保存在 `output/`；关闭窗口后可恢复任务状态。

## 当前模型与服务提供商

- Image2：默认 `gpt-image-2`，支持提示词和最多 8 张参考图。
- Gemini/魔芋：支持 Gemini 图像模型及其输出尺寸控制。
- Seedream：支持豆包图像模型及像素尺寸控制。
- Midjourney Fast：支持四宫格候选图和候选图放大任务。
- RunningHub H3：支持首帧生视频等已接入模式，任务会上传参考图、轮询远程任务并保存诊断阶段。
- RunningHub Krea2（界面显示“K2 白玉”）：独立的提示词生图工作流，支持自定义宽高、批量数量和比例预设；它不使用参考图输入。
- 模型回答：支持 GPT-5.5/GPT-5.6、DeepSeek V4 系列和 Claude Sonnet 4.6；Claude 参考图会在前端压缩后再提交，以降低多图请求体积。

各提供商密钥由本机服务读取，配置文件位于当前 Windows 用户的 `%APPDATA%\image2-canvas\providers.json`；密钥不得写入项目、导出文件、日志或 Git。

## 代码分区

| 路径 | 责任 | 修改风险 |
| --- | --- | --- |
| `public/index.html` | 页面骨架、对话框、控件和节点容器 | 中 |
| `public/app.js` | 画布状态、节点/连线、项目持久化、交互和请求 | 高 |
| `public/styles.css` | 主题、布局、节点和响应式样式 | 中 |
| `server.mjs` | 本地 HTTP 服务、密钥读取、模型网关、任务队列、文件输出 | 很高，可能涉及费用和数据恢复 |
| `image2-desktop-launcher.mjs` | 桌面启动器和浏览器窗口 | 中 |
| `docs/` | 回归清单、工作流资料和工程说明 | 低 |
| `output/` | 本地运行时、生成媒体、日志和任务状态 | 不提交、不清理，除非用户明确要求 |

## 不变量

修改后必须保持：

1. 打开、复制、删除项目不会误删其他项目的节点或生成媒体。
2. 画布拖动、缩放、多选、连线、撤销和刷新恢复继续可用。
3. 旧项目可以打开；导入导出格式不能无说明地破坏兼容。
4. 生成中可以继续编辑画布；任务失败不能静默重复请求或造成重复扣费。
5. API Key 只进入本地配置或当前页面内存，不进入项目文件、日志或 Git。
6. 脚本流、对话脚本、角色/故事卡、视频节点等已有功能不能因 Image2 或模型回答改动而退化。
7. Krea2 生成节点的宽高、比例预设和批量数量必须与界面选择一致；不能把 Krea2 请求错误地送入普通 Image2 或参考图流程。
8. Claude 多图回答的压缩只影响发送给 Claude 的临时请求数据，不得改变画布中原始参考图、节点尺寸或项目保存内容。
9. 参考图图片预览区拖动只改变节点位置，不得改变图片内容或触发上传、裁剪、下载等操作。

## 推荐的跨窗口流程

### 开始前

```powershell
cd E:\AI剧本\image2-canvas
git status --short --branch
git log --oneline --decorate -12
npm run verify
```

如果 `git status` 显示改动，先把它当作正在进行的工作：阅读 `git diff`，不要 reset、checkout、clean 或强制切换分支。

### 单个任务

```powershell
git switch -c feat/<task-name>
# 修改并做最小范围测试
npm run verify
git diff --check
git add <明确的文件>
git commit -m "feat: <简短描述>"
```

修复使用 `fix:`；只改文档使用 `docs:`。提交后可创建标签作为恢复点：

```powershell
git tag stable-YYYYMMDD-<task-name>
```

### 多个窗口同时工作

不要让多个窗口同时打开并修改同一个目录。为每个独立任务创建 worktree：

```powershell
git worktree add -b feat/<task-name> E:\AI剧本\image2-canvas-work\<task-name> master
git worktree list
```

任务完成并合并后，确认目录干净再移除：

```powershell
git worktree remove E:\AI剧本\image2-canvas-work\<task-name>
git worktree prune
```

生成媒体和本机配置仍以各自工作目录为准；涉及真实 API 调用时，先确认当前服务端口、密钥和费用风险。

## 回退与恢复

- 只想撤销已提交的单个功能：优先 `git revert <commit>`，保留历史。
- 需要回到稳定点：先创建保护分支或标签，再切换到目标标签；不要直接强制重置。
- 未提交改动需要暂存时使用带说明的 `git stash push -u -m "描述"`，恢复前先查看 `git stash list` 和 `git stash show`。
- 代码回退不等于用户数据回退。IndexedDB、`output/generated`、任务 JSON 和项目导出文件应单独备份。
- 任何可能删除生成图片、视频或任务记录的操作，都先导出项目并复制相关 `output/` 子目录。

## 验证等级

- 文档或纯样式：`npm run verify` + `git diff --check`。
- 交互、节点、持久化或模型请求：再执行 `docs/REGRESSION-CHECKLIST.md` 的人工回归。
- `server.mjs`、任务队列、网关或媒体路径：必须做最小本地接口检查，并确认日志不含密钥、提示词或图片内容。
- 大范围状态/数据结构修改：先导出一个真实项目副本，再验证旧项目打开、生成任务恢复和导入导出。
- 新增模型或提供商：至少验证设置保存、`/api/status`、对应健康检查、任务创建和失败诊断；不要用真实 API 调用替代静态验证。

## 窗口交接模板

```text
任务：
基线提交/标签：
当前分支：
已修改文件：
已完成：
验证命令及结果：
未完成或风险：
下一窗口第一步：
```

## 文档维护边界

只有稳定、可复用的工程事实才写入本手册，例如新的节点类型、持久化字段、验证步骤或恢复约束。一次性的调试过程放在窗口交接中；不要把 API Key、用户项目内容或大体积日志写进仓库。
