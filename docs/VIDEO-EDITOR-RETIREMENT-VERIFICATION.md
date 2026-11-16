# 视频剪辑新建入口下线验证

日期：2026-11-16。主线工作目录：E:/codex/image2-canvas-work/mainline-merge，分支 master。

## 修改边界

- 从模块库、空白画布右键菜单、视频连线创建菜单移除视频剪辑。
- 删除对应三个创建分支和不再使用的 createVideoEditorNode 构造函数。
- 旧项目可能通过剪辑节点为成片预览提供视频，故保留旧节点数据归一化、显示、时间轴及视频源解析，导入时不丢弃节点或连线。旧节点仍可使用；本次是撤下新建入口，不是强制删除历史节点。
- 未修改 server.mjs、模型配置、图层或局部修改模块、素材清理逻辑；未删除用户视频或其他素材。

## 验证

- 修改前基线和修改后 npm run verify 通过；git diff --check 通过。
- 专用 Playwright 会话 retire-video-editor 使用独立浏览器数据。执行 tests/video-editor-retirement.browser.js，29 项检查通过，无页面运行异常。
- 验证三个新增入口均不再出现视频剪辑；视频结果仍可创建 H3 或成片预览，成片预览仍可创建并连接 H3，H3 参考视频输入仍可创建成片预览。
- 实际拖线新建成片预览并连接 H3，再撤销，原参考视频连线恢复。
- 模拟本地视频上传仍走 /api/video-assets，替换预览来源且保留到 H3 的输出连线。测试视频在浏览器内临时生成，API 返回由路由模拟，不写入实际 video-assets 目录。
- 其他六种模块（提示词、参数控制、生图、视频/H3、成片预览、模型回答）可新建，参考图入口及 GPT-6 Astra 保留。
- 旧剪辑片段、裁切值、视频输出和预览在导入、刷新、导出后保留，原回答及四条连线保留。
- 截图：output/playwright/video-editor-retirement.png。CLI 日志：.playwright-cli/video-editor-retirement-result.txt。这些产物已由既有 .gitignore 排除。

本次验证针对前端入口和兼容链路；没有重新调用付费生视频/生图/回答 API，也没有重新执行 FFmpeg 转码或视频合成。服务端未变更，不需要重启服务；刷新画布可载入新前端。
