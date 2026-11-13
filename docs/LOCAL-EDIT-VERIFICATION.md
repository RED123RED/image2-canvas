# 参考图局部修改验证

日期：2026-11-13；工作目录 E:/codex/image2-canvas-work/mainline-merge，master，基线 5a89c81。

## 使用

1. 点参考图右上角画笔按钮，点选多处、框选或圈选并填写每处要求。可用画笔、箭头和文字工具画示意；移动工具移动标记或在空白处拖动画面。
2. 默认火山套餐 Seedream 5.0 Pro，可选 Flash。生成修改预览后，关闭/刷新可恢复同一任务，不自动重发。
3. 拖动中轴对比；滚轮缩放，两图共用位置。确认后应用到原节点，或另存一个参考图。
4. 严格保留其他部分时，框/圈选后开启保护选区外画面。物体、阴影、过渡都要包括在选区内；这是本地合成，不是模型保证只改选区。
5. 分层作品只另存整图结果，已保存图层与未保存分层草稿保留。原有再次拆层、PSD/JPG/PNG 导出继续用原工具。

## 实际调用

仅各调用一次套餐 Pro 和 Flash，消费两次生成额度，未查询金额。用已有抹茶可可海报要求将绿色圆球改粉红色，并按手绘弧线添加金色新月。共传干净原图和带标注示意图 2 张，未修改源文件。

| 模型 | 状态 | 执行耗时（不含排队） | 返回尺寸 |
| --- | --- | --- | --- |
| doubao-seedream-5-0-pro | succeeded | 42.9 秒 | 2848 × 1600 |
| doubao-seedream-5.0-flash | succeeded | 22.8 秒 | 2848 × 1600 |

两款均完成圆球改色、新月装饰，未留下红色辅助线及编号。Pro 构图与文字保持较好；Flash 对部分字形、字号、底部细节及商品轮廓有重绘。仅为一次样本，不代表任意手绘都能准确还原。保护合成后，两张结果各检查 4,090,960 个选区外像素，RGBA 差异均为 0（额外排除选区边缘外 1px，避免抗锯齿边界计为外部）。软件条带混合修正了初版 GPU 合成的微小取整偏差；修正使用原返回结果，没有额外调用 API。

## 回归与恢复

- npm run verify、npm run test:ark、npm run test:layers、npm run test:local-edit、git diff --check。
- 新增 4 项 Node 测试：坐标/标注、原图比例、模型输入限制、本地队列+模拟上游（独立密钥、重复并发 POST 去重、参数冲突、失败不重试、重启恢复、不存密钥/参考图）。
- 普通节点浏览器 21 项、分层节点 11 项：标注工具与草稿恢复、对比、保护合成、保存失败回退、画布撤销重做、异常画幅救援另存、其他节点/连线不变。
- 另有恢复专项 2 项：上游已接受但本地返回 HTTP 502 时只查原任务、不再 POST；未使用图片清理的引用列表包含 localEdit 历史原图。导出文件中保留已应用状态和历史，重新导入可继续查看对比。
- 像素专项 3 项：复杂 RGB 图案的区域外像素一致、透明结果仅清除选区、圈选遵守多边形而非外接矩形。脚本 tests/local-edit-pixels.browser.js；恢复脚本 tests/local-edit-recovery.browser.js。
- 既有分层再次拆分浏览器 27 项，多模型浏览器 26 项（Image2、套餐/官方模型、Astra 模拟回答、H3/K2 节点、项目导出、设置密钥隔离）。这些回归不消费模型额度，未重新调用全部视频/回答供应商。
- 独立 Playwright 浏览器和测试项目，没有修改用户正在使用的浏览器数据库。源海报 SHA256 前后均 B6BD73D54484D82445A1079F4B011552ED5FC9F806DA4EDC92FCDE3DB2792B7A。

## 本机证据

- output/local-edit-test/report.json：实际请求、耗时、图片地址、像素检查。
- output/local-edit-test/local-edit-live.image2.json：可导入的两模型实测预览项目，引用本机已有图片；不是跨机器打包素材。
- output/playwright/local-edit-live-pro.png：实测可拖动中轴预览。
- Pro 原始：output/generated/job-le-7eb28680-1ee8-4544-9eae-2428184c6c76-1.png。
- Flash 原始：output/generated/job-le-9d66e7c1-1e23-45c1-b91a-ab72dae80b04-1.png。
- 保护后 Pro：output/assets/asset-mweacrkf-s0iv8c.png；Flash：output/assets/asset-mweacspa-8dytfb.png。
- output/local-edit-test/jobs-before-local-edit.json 是启动前任务备份，含媒体任务元数据，仅本机保留，不提交 Git。
- 服务继续使用原 output 联接和套餐配置，未改密钥。启动前确认没有运行中/排队任务，默认端口 45173。

媒体与报告不提交 Git。测试生成物可逐项清理；需继续查看的结果、来源图应保留。不要整体删除 output/assets、output/generated、任务库或用户配置。
