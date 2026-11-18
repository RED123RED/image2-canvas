# 画布语音节点交付与验证

日期：2026-11-18。工作目录 E:/codex/image2-canvas-work/mainline-merge，分支 master，开发基线 f57b41b。媒体目录 output 是指向 E:/codex/image2-canvas/output 的既有连接。

## 使用方法

1. 刷新画布，从模块库或空白右键选择“语音生成”。
2. 直接输入正文，或把提示词接到“配音正文”。语气、情绪、表现方式可另接“表达要求”；这部分不作为朗读正文。
3. 选音色、语速、WAV/MP3，点击生成。首次自动增加“音频结果”，后续生成进入同一个结果节点的候选版本；点击播放即可试听，满意后“设为当前”。
4. 长文本/多角色用“详细编辑”：分段、每段独立音色和表达、语言、受支持的方言、语速、音量、音调、发音纠正、停顿。生成单段后可试听，也可从本段历史选回匹配版本；合成整篇复用匹配音频。
5. “详细试听 / A·B”可比较两个版本、调整播放速度、循环片段和点击字幕定位。可下载全篇 WAV、生成时选择的 MP3、分段 WAV、正文和模型时间戳 SRT。没有时间戳时不提供伪字幕。

详细编辑创建独立稿，不会跟随上游变化而覆盖；修改上游后点击“同步上游正文”，或“返回直接配音”。音色库支持搜索、收藏和自定义已开通 ID。试读当前选中音色会明确提交一段短句；相同音色及短句复用本地结果。

## 接口与持久化

- 固定套餐语音 HTTP API： https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional 。读取已有火山 Agent Plan 密钥，resource ID 为 seed-tts-2.0，不使用生图/回答普通网关密钥，不回退普通计费端点。
- 参数依据官方 HTTP 与音色文档：https://docs.volcengine.com/docs/doubao-voice/unidirectional-streaming-text-to-speech-http?lang=zh 和 https://docs.volcengine.com/docs/doubao-voice/tone-list-3?lang=zh 。模型是否接受具体自定义音色及语言取决于账户权限，表达风格执行程度由模型决定。
- 服务独立保存 output/speech/jobs.json 和 files；正文/设置为本地任务记录，密钥不写入任务。24kHz PCM 封装 WAV；MP3 通过已有 FFmpeg 编码。没找到 FFmpeg 时 WAV 仍可用，MP3 提交前阻止。
- 同一请求编号只生成一次，不自动重试。刷新后查询原任务；服务中断时明确标记 interrupted，已完成段落保留。点击“停止等待”不会保证远端取消，也不会自动重复请求。
- 结果生成后若项目保存失败，保留已保存请求编号；检查任务可恢复结果，不新增模型 POST。旧当前版本、草稿及历史仍保留。
- 项目 JSON 保存引用，不包含音频文件；迁移和备份须同时保留项目与 output/speech。现有“清理未使用图片”不清理语音目录。

## 验证范围

- npm run verify 与 git diff --check；27 项离线测试覆盖语音、Kimi、Seedream、分层、局部修改、素材清理，均使用独立临时数据/模拟模型。
- tests/speech.browser.js：独立会话 speech-nodes，覆盖语音节点全链路、重复点击、状态恢复、保存失败恢复、候选版本、真实 DOM 拖线及多结果输出。测试音频是合成波形，模型请求均模拟；最终 55 项检查通过，无页面运行异常；包含试读失败后手动重试、重复试听不请求。
- 原 tests/kimi-plan.browser.js 26 项、tests/video-editor-retirement.browser.js 29 项在独立会话 speech-compat 复测通过；并非重新调用这些模型付费接口。
- 真实套餐测试：先前一次 Vivi 短句约 4.397 秒 WAV；本次完整服务生成 Vivi/云舟双角色，共两段、一次作品任务、两次上游合成请求，插入 0.5 秒停顿，得到约 5.884 秒 MP3/WAV、两条模型时间戳。
- 完整任务 ID：sp-66402b6a-046c-461b-950c-bd9e6c9fc39e。结果位于 output/speech/files，以任务 ID 命名。服务刷新后结果仍可获取；独立浏览器 speech-live 实际播放 MP3，currentTime 正向增加，error 为 null；WAV 解码时长一致，字幕点击可播放。播放验证没有再次提交生成。
- 截图已人工查看：output/playwright/speech-live-nodes.png、speech-live-listener.png、speech-editor.png。CLI 结果保存在 .playwright-cli/speech-*.txt，均被 Git 忽略。

## 修改边界与限制

新增服务/文档/UI模块；主 app 只增加节点接入，服务只增加 /api/speech/ 路由。没有修改生图/回答/H3网关、分层/局部修改算法、图片清理范围或用户真实项目。

此次交付文字配音与试听节点，不包括语音识别、实时对话、声音克隆和剪辑时间轴。每篇最多 40 段/12000 字、每段 2000 字是本工具保守限制。12 个内置音色中真实验证 Vivi 和云舟；未逐个真实调用全部音色、语言及方言，不把界面选项视为听感保证。未执行批量长篇付费压测。

## 本地文件

- 需保留：public/speech*.js、public/speech.css、speech-service.mjs、测试和说明，以及用户需要的 output/speech 中音频和 jobs.json。
- 可清理：确认不需要后删除 .playwright-cli/speech-* 日志、output/playwright/speech-*.png、output/speech-verification 测试记录；不应把整个 output 或既有 FFmpeg 作为测试垃圾删除。
- 代码、文档和测试提交 Git；密钥、生成媒体、浏览器资料和运行日志不提交。测试项目只存在于独立 Playwright 浏览器，不写入用户日常浏览器项目。
