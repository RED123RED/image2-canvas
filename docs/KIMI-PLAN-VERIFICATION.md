# 火山套餐 Kimi K3.1 Pro 接入验证

日期：2026-11-14。主线目录 E:/codex/image2-canvas-work/mainline-merge。清理功能已先独立提交 de5b48b，本次只处理新模型。

## 官方依据

- https://ark.volcengine.com/region:cn-beijing/docs/agent-plan-personal-plan-overview.md：套餐支持矩阵列出 kimi-k3.1-pro，Small/Medium/Large/Max 支持。
- https://ark.volcengine.com/region:cn-beijing/docs/agent-plan-personal-zcode.md：套餐 OpenAI Chat Completions 的 Base URL 为 https://ark.cn-beijing.volces.com/api/plan/v3；模型示例是 kimi-k3.1-pro，text/image 输入、text 输出，须使用套餐专属密钥。
- https://ark.volcengine.com/models/kimi-k3-1-pro.md：模型详情包含视觉、reasoning_effort low/high/max、采样固定等说明；其普通按量渠道 ID 为 kimi-k3-1-pro，与套餐 ID 不混用。套餐请求以套餐文档及真实验证为准。

## 实现边界

新增「火山套餐 · Kimi K3.1 Pro」选项，使用已有 Agent Plan 密钥，不另建配置、不修改现有选择。纯文字及最多八张参考图，已有提示词 Skill 复用。该限制沿用画布端口，不声称是服务商最大图片数。

图片仅对发送副本压缩，最长边 2560px，编码每张最多 4MiB；必要时降为 1600px，仍超限则明确报错。原节点、图像文件和像素不改。八图编码合计最多约 32MiB，低于当前本机 48MiB 请求体读取限额；反推中的真实尺寸另传原始元数据。

默认 high 思考和 16384 输出 token 上限，不传 temperature/top_p；210 秒单次上游预算，前端 240 秒。不自动重试或降级，不增加收费健康探测。节点只显示文本回答，不扩展视频或工具执行。

## 真实调用

使用现有已配置的 Agent Plan 密钥，通过复制出的隔离本机服务调用新 /api/respond 路由；密钥仅在进程环境中使用，不写入报告或测试代码。共两次真实套餐推理：

| 测试 | HTTP | 耗时 | 结果 |
|---|---|---|---|
| 纯文字：2 加 3 | 200 | 3.28 秒 | 5 |
| 自制 512×512 左红右蓝测试图 | 200 | 4.23 秒 | 左半边是红色，右半边是蓝色。 |

返回 model 均为 kimi-k3.1-pro、provider 为 ark-plan。报告 output/kimi-plan-test/live-results.json 与测试图 reference.png；不包含密钥。两次请求消耗少量套餐额度，未读取或上传用户项目图片。

## 自动与浏览器验证

- tests/kimi-plan-api.test.mjs：临时配置和模拟网关，验证缺密钥阻止、其他密钥不替代、状态协议、正确模型/端点/密钥、八图、系统指令、非法输入拒绝、503/空回答报错、无自动重试、七个原模型路由不变。
- tests/kimi-plan.browser.js：26 项通过，3 次模拟回答；独立 Playwright 会话，八个模型选项、缺套餐/旧服务拦截、4800×2400 参考图发送缩至 2560×1280、画布原图不变、纯文字、刷新、撤销/重做、反推尺寸元数据、导出与无页面异常。
- npm run verify 和 git diff --check；既有 test:cleanup、test:ark、test:layers、test:local-edit 回归。

正式服务加载后刷新页面即可选择新模型。不代表重新验证其他模型的外部网关，也未做真实八图大批量收费测试；八图链路已通过隔离测试。
