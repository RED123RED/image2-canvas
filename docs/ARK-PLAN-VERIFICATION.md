# 火山 Agent Plan 接入验证

日期：2026-11-11。工作目录：E:/codex/image2-canvas-work/mainline-merge，master 主线。

## 范围与配置

新增独立套餐提供商 ark-plan，地址 https://ark.cn-beijing.volces.com/api/plan/v3/images/generations。现有普通官方、Seedream 网关、Image2、模型回答及视频路由不替换。新增设置字段使用 arkPlan.apiKey / ARK_PLAN_API_KEY，独立于 ark.apiKey / ARK_API_KEY。套餐失败或额度不足时不自动转用普通付费渠道。

密钥仅保存在当前 Windows 用户的应用配置文件中；保存前已在同目录创建带时间戳的 providers.json 备份，逐项比对其他提供商配置未改变。密钥、备份、测试图片均不纳入 Git。原参考图 SHA-256 前后相同。

## 实际 API 测试

| 模型请求 ID | 操作 | 结果 | 本次耗时 | 实际返回尺寸 |
| --- | --- | --- | --- | --- |
| doubao-seedream-5-0-pro | 文字生图 | HTTP 200、单张 PNG | 27.1 秒 | 2048 × 2048 |
| doubao-seedream-5.0-flash | 文字生图 | HTTP 200、单张 PNG | 16.5 秒 | 2496 × 1664 |
| doubao-seedream-5-0-pro | 画布本机队列、10 图编辑 | succeeded、单张 PNG | 108.6 秒 | 2848 × 1600 |
| doubao-seedream-5.0-flash | 画布本机队列、10 图编辑 | succeeded、单张 PNG | 33.3 秒 | 2848 × 1600 |

最初 Pro 请求包含 sequential_image_generation 时返回 HTTP 400 InvalidParameter，说明不接受该可选参数。删除后成功。最终应用请求不包含组图或拆层参数，使用具体尺寸、output_format=png、response_format=url、stream=false、watermark=false；带图时直接传入 Base64 data URI。没有自动重试。

文字生图测试指定 2K 档位；Flash 自行选了横图尺寸。应用使用明确宽高以符合用户的节点比例。以上为单次测试时间，不是速度保证；本次生成消耗套餐额度，未查询账单或剩余额度。

十图测试重复输入同一张用户海报，用于验证十张参考图传输、模型接收和图片保存；并未验证十张不同素材的融合质量，也未以真实接口测试单张 30 MB 极限或十一张以上。应用延续现有十图上限。

## 编辑效果

提示词要求仅将右上角“高蛋白”标牌的红底改为蓝底。两款均完成颜色修改。Pro 大体保留原文字和布局；Flash 对其他位置的小字、底部食材标签和规格数字也发生重绘。不能把“接口成功”当作“未选区域像素不变”或“所有文字准确”的保证；本次不新增矩形框选局部修改功能。

## 回归验证

- npm run verify：通过。
- npm run test:ark：两项测试通过，覆盖两渠道四个模型，0/1/2/10 图校验、11 图拒绝、密钥分离、错误不自动重试、结果落盘及任务持久化不包含密钥/参考图。
- 独立 Playwright 浏览器：26 项通过，无页面异常。模拟生成不产生额外 API 费用；真实用户浏览器数据库未修改。
- 导出检查：套餐 Pro 模型、10 条参考图连接及测试中的其他节点保留；密钥不会写入项目导出。

## 本机证据

代码及文档影响：修改 public/app.js、public/index.html、public/seedream-ark.js、server.mjs、tests/seedream-ark.test.mjs、README.md、docs/PROJECT-GUIDE.md、docs/REGRESSION-CHECKLIST.md；新增本文档。运行测试还新增了 output 中的报告、脚本、截图和四张结果图片，并由服务正常更新任务记录与日志。本机 providers.json 新增套餐项，同目录保留配置备份。

- 文字生图报告和两张图片：output/api-smoke-tests/ark-plan-2026-11-11T07-51-59-755Z/。
- 本机队列编辑报告：output/api-smoke-tests/ark-plan-local-2026-11-11T08-08-27.330Z/report.json。
- Pro 编辑图片：output/generated/job-mwbu9ylj-0cvcrf-1.png。
- Flash 编辑图片：output/generated/job-mwbucaez-mbplii-1.png。
- 浏览器脚本和截图：output/playwright/ark-plan-browser.js、ark-plan-node.png。

以上路径相对于工作目录，output 是指向 E:/codex/image2-canvas/output 的目录联接。测试素材可在确认无需保留后单独清理，不应整目录删除 output 或用户配置文件。
