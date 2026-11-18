# 语音节点编辑问题修复

日期：2026-11-18，基线 54deace，主线 master。仅调整语音模块、语音测试及说明。

## 已确认原因

1. 打开详细编辑即创建 draft，旧节点界面在存在 draft 时将正文、表达要求设为 readonly、音色设为 disabled。这是交互设计造成的锁定，并非生成次数限制。
2. 有已生成片段/片段历史时，详细编辑渲染直接调用会抛异常的 speechFingerprint。保存了不兼容的音色+方言、语言或其他非法参数后，整段 innerHTML 构造被打断，只剩弹窗标题。隔离复现结果：locked=true、speakerDisabled=true、emptyDialog=true；修复后均为 false。
3. 检查本地最近真实任务，用户填写的“忧郁的情绪，不开心”确实存在于请求设置，使用小何音色，未复用缓存。因此该次效果不能归因为表达要求丢失。原 draft 隔离也会使后续节点/上游编辑不参与生成，已解决输入优先级的可见性。
4. 扩展回归发现 A/B 切换时旧 audio 的延迟 timeupdate 会读取新版本字幕列表，偶发访问不存在的 cue；增加连接状态与 cue 存在校验。

## 修复行为

- 节点和详细编辑操作同一当前段落。已生成后正文、表达、音色、语速仍能编辑；多个段落通过节点上的“当前编辑段落”切换，不摊平多角色设置。只有任务待确认/处理中暂时锁定。
- 每个正文/表达输入独立提供“使用连接：名称”和“在此编写（保留连线）”。连接模式读取最新上游，本地模式允许编辑而不删除连线或覆盖提示词源。切回本地保留原本地内容；原来的旧分段稿默认本地，防止加载后被连线覆盖。
- 详细编辑与节点互相同步，重新打开和刷新不重发请求；“返回直接配音”携带当前段内容和设置，原稿收纳 savedSpeechDraft。上游分段同步仍须主动操作，避免重排多角色段落。
- 渲染使用不会抛异常的指纹检查；非法旧设置保留并显示内联错误供修正，提交前严格校验。空分段稿恢复为一段，不显示空白弹窗。
- 音色选项标明方言能力；详细编辑列出支持范围。当前内置 Vivi、小何（女）、云舟、小天（男）支持八种方言；其他内置音色不开放方言。非中文语言禁用方言，英语音色限制为英语/自动；主动切换导致原方言不适用时恢复默认并提示。
- 表达要求通过官方 additions.context_texts 传入，包装为明确的声音表演指令，不拼入朗读正文。提供忧郁/难过、平静、开心示例。指纹增加 directionInstructionVersion=2，旧的有表达要求音频不当作新版指令的匹配缓存；历史音频继续保留。
- 协议 canvas-speech-v2，旧服务先提示恢复服务；本机服务已在无活跃任务时刷新。原生图/回答/H3/图层/清理路由及素材不变。

## 官方依据与实测

- HTTP 指令、方言参数：https://docs.volcengine.com/docs/doubao-voice/unidirectional-streaming-text-to-speech-http?lang=zh
- 音色支持列表：https://docs.volcengine.com/docs/doubao-voice/tone-list-3?lang=zh
- 新增 tests/speech-editing.browser.js：29 项专项检查，覆盖旧错误稿打开、生成后反复编辑、详细与节点同步、方言语言适配、显式来源切换、保存刷新、旧音频保留；API 模拟，不消费套餐、不修改真实项目。
- 原 tests/speech.browser.js 55 项继续通过，合计 84 项浏览器检查；speech 单元测试补充非法配置安全渲染、空稿恢复、指令包装及缓存版本。npm run verify、git diff --check 通过。27 项完整离线测试串行全部通过；首次并行运行中 Kimi 临时服务启动等待超时，未改其代码，串行复跑通过。
- 两个真实短句使用小何，正文相同，每个一次上游请求：简短要求 sp-97182dbd-9dd7-4c57-8bbb-0eaa96e51184，明确忧郁示例 sp-7ae7e780-348c-4ff4-91aa-bd0de35cd44f。均 succeeded，24kHz WAV，约 2.609 秒，文件内容不同。
- 真实验证确认请求/返回与文件可播放：独立浏览器实际播放两条 WAV，currentTime 增加、error=null，播放未新增生成请求。不以时长、哈希或 HTTP 成功作为情绪符合度证明。情绪仍须用户试听判断；未承诺所有声音都能稳定生成相同情感。
- 测试 WAV 保存在 output/speech/files，任务追加到已有 jobs.json；没有覆盖或删除既有音频。测试截图 output/playwright/speech-editing-fixed.png、speech-input-sources.png；日志 .playwright-cli/speech-*-result.txt。
