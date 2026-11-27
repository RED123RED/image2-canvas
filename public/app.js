import { arkProtocol, arkModels, arkSizes, arkPlanProtocol, arkPlanModels, isArkProvider, arkModelsForProvider, buildArkPayload } from "./seedream-ark.js";
import {createSpeechController} from './speech.js';
import {createSpeechNode,normalizeSpeechNode} from './speech-document.js';
import {allLayerSources,leafLayers} from './layer-tree.js';
import {localEditSources} from './local-edit-document.js';
import {applyLocalEditToLayers} from './local-edit-apply.js';
import {collectMediaReferences,mediaCleanupProtocol} from './media-references.js';
import { wenwuId, wenwuAspects, wenwuDefaults, isWenwu, validMegapixels, validMultiple, wenwuDimensions } from './h3-wenwu.js';
import { mossWorkflow, mossAspects, mossAspect } from './runninghub-moss.js';
let localEditorModule;
const getLocalEditor=()=>localEditorModule ||= import('./local-edit.js');

const $ = selector => document.querySelector(selector);
const layerJobPollers = new Map();
let layerEditorModule;
const getLayerEditor = () => layerEditorModule ||= import('./layer-editor.js');
const $$ = selector => [...document.querySelectorAll(selector)];

const sizeMap = {
  "1:1": { api: "1024x1024", label: "方形", shape: "aspect-square" },
  "3:4": { api: "1536x2048", label: "竖版", shape: "aspect-portrait" },
  "4:3": { api: "2048x1536", label: "横版", shape: "aspect-landscape" },
  "16:9": { api: "2048x1152", label: "宽银幕", shape: "aspect-landscape" },
  "9:16": { api: "1152x2048", label: "短视频", shape: "aspect-portrait" }
};
const themeLabels = { dark: "暗黑科技", light: "明亮清晰", premium: "高级灰" };
const fixedGeneratorSettings = Object.freeze({ aspect: "3:4", quality: "medium", batch: 1 });
const seedreamImageModels = Object.freeze([
  { id: "doubao-seedream-5-0-pro-260628", label: "Seedream 5.0 Pro" }
]);
const midjourneyImageModels = Object.freeze([
  { id: "mj_fast_imagine", label: "Midjourney Fast" }
]);
const image2Models = Object.freeze([
  { id: "gpt-image-2.5-sunburst", label: "GPT Image 2.5 Sunburst" },
  { id: "gpt-image-2.5-flare", label: "GPT Image 2.5 Flare", legacyOnly: true },
  { id: "gpt-image-2.5", label: "GPT Image 2.5", legacyOnly: true },
  { id: "gpt-image-2", label: "GPT Image 2" }
]);
const image2DefaultModel = "gpt-image-2.5-sunburst";
const image25ModelIds = Object.freeze(image2Models.filter(item => item.id.startsWith("gpt-image-2.5")).map(item => item.id));
const image25AdvancedModelIds = Object.freeze(["gpt-image-2.5-flare", "gpt-image-2.5-sunburst"]);
const image25SizeProtocol = "image2-size-v2";
const image2QualityOptions = Object.freeze([
  { value: "low", label: "快速" },
  { value: "medium", label: "标准" },
  { value: "high", label: "高品质" }
]);
const image25QualityOptions = Object.freeze([
  { value: "auto", label: "自动" },
  { value: "low", label: "快速" },
  { value: "medium", label: "标准" },
  { value: "high", label: "高品质" },
  { value: "xhigh", label: "超高品质" },
  { value: "max", label: "最高品质" }
]);
const image25ResolutionOptions = Object.freeze([
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" }
]);
const image25Sizes = Object.freeze({
  "1K": Object.freeze({ "1:1": "1024x1024", "3:4": "912x1216", "4:3": "1024x768", "16:9": "1280x720", "9:16": "864x1536" }),
  "2K": Object.freeze({ "1:1": "2048x2048", "3:4": "1536x2048", "4:3": "2048x1536", "16:9": "2048x1152", "9:16": "1152x2048" }),
  "4K": Object.freeze({ "1:1": "2880x2880", "3:4": "2448x3264", "4:3": "3264x2448", "16:9": "3840x2160", "9:16": "2160x3840" })
});
const generatorOutputSizeOptions = Object.freeze({
  image2: [{ value: "current", label: "当前最大" }],
  "gpt-image-2": [{ value: "current", label: "当前最大" }],
  "gpt-image-2.5": image25ResolutionOptions,
  "gpt-image-2.5-flare": image25ResolutionOptions,
  "gpt-image-2.5-sunburst": image25ResolutionOptions,
  "doubao-seedream-5-0-pro-260628": [{ value: "2K", label: "2K · 当前最大" }],
  mj_fast_imagine: [{ value: "current", label: "MJ 模型控制" }]
});
const runningHubVideoAspects = Object.freeze(["1:1", "3:2", "4:3", "16:9", "2:1", "9:16", "3:4", "2:3"]);
const runningHubVideoMegapixelOptions = Object.freeze([
  { value: 0.2, label: "0.2 MP" },
  { value: 0.3, label: "0.3 MP" },
  { value: 0.4, label: "0.4 MP" },
  { value: 0.5, label: "0.5 MP" },
  { value: 0.6, label: "0.6 MP" },
  { value: 0.7, label: "0.7 MP" },
  { value: 0.8, label: "0.8 MP" },
  { value: 0.9, label: "0.9 MP" },
  { value: 0.98, label: "0.98 MP" },
  { value: 1, label: "1.0 MP" },
  { value: 1.2, label: "1.2 MP" },
  { value: 1.5, label: "1.5 MP" },
  { value: 1.8, label: "1.8 MP" },
  { value: 2, label: "2.0 MP" }
]);
// Exact 16:9 presets documented by the workflow's ResolutionSelector (multiple = 32).
const runningHubVideo16x9Dimensions = Object.freeze({
  0.2: { width: 608, height: 352 },
  0.3: { width: 736, height: 416 },
  0.4: { width: 864, height: 480 },
  0.5: { width: 960, height: 544 },
  0.6: { width: 1056, height: 608 },
  0.7: { width: 1152, height: 640 },
  0.8: { width: 1216, height: 672 },
  0.9: { width: 1280, height: 736 },
  0.98: { width: 1344, height: 768 },
  1: { width: 1376, height: 768 },
  1.2: { width: 1504, height: 832 },
  1.5: { width: 1664, height: 928 },
  1.8: { width: 1824, height: 1024 },
  2: { width: 1920, height: 1088 }
});
const runningHubVideo9x16Dimensions = Object.freeze(Object.fromEntries(
  Object.entries(runningHubVideo16x9Dimensions).map(([megapixels, dimensions]) => [
    megapixels,
    { width: dimensions.height, height: dimensions.width }
  ])
));
const runningHubReferenceWorkflowId = "2093564802919649281";
const runningHubVideoProvider = Object.freeze({ label: "海螺 H3 视频", model: "RunningHub · API plus" });
const runningHubKrea2Provider = Object.freeze({ label: "K2 白玉", model: "Krea2 White Marble" });
const runningHubMossProvider = Object.freeze({ label: "MOSS", model: mossWorkflow.model });
const answerSkillOptions = Object.freeze([
  { value: "none", label: "普通模型问答" },
  { value: "minimax-h3", label: "MiniMax H3 提示词生成器" },
  { value: "nuyoah-reverse", label: "南鸢图片反推" },
  { value: "minimalist-product-ad", label: "极简产品广告生成器" },
  { value: "brand-promo-video", label: "品牌宣传短片生成器" }
]);
const answerModelOptions = Object.freeze([
  { value: "gpt-6-astra", label: "GPT-6 Astra", provider: "openai", vision: true },
  { value: "gemini-4-neon", label: "Gemini 4 Neon", provider: "gemini-neon", vision: false },
  { value: "deepseek-flash", label: "DeepSeek V4.1 Flash", provider: "deepseek", vision: true },
  { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "deepseek", vision: false },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "claude", vision: true },
  { value: "claude-opus-5-5", label: "Claude Opus 5.5", provider: "claude", vision: true },
  { value: "kimi-k3-moyu", label: "Kimi K3 · 魔芋 AI", provider: "kimi", vision: true },
  { value: "kimi-k3-moonshot", label: "Kimi K3 · Moonshot 官方", provider: "kimi", vision: true },
  { value: "kimi-k3.1-pro", label: "火山套餐 · Kimi K3.1 Pro", provider: "ark-plan-answer", vision: true }
]);
export const videoRemakeModelOptions = Object.freeze(answerModelOptions.map(({ value, label, vision }) => ({ value, label, vision })));

export async function readVideoRemakeGalleryProjects() {
  const projects = await dbGetAll("projects");
  return projects.filter(project => project?.id).map(project => ({
    id: String(project.id),
    name: String(project.projectName || "未命名项目"),
    updatedAt: Number(project.updatedAt) || 0,
    images: (Array.isArray(project.nodes) ? project.nodes : [])
      .filter(node => node?.type === "image" && typeof (node.src || node.previewSrc) === "string" && (node.src || node.previewSrc))
      .map(node => ({
        id: String(node.id || ""),
        name: String(node.name || "画布图片"),
        src: String(node.src || node.previewSrc),
        previewSrc: String(node.previewSrc || node.src),
        originalSrc: String(node.originalSrc || ""),
        sources: [...new Set([node.previewSrc, node.src, node.originalSrc].filter(value => typeof value === "string" && value))],
        width: Number(node.imageWidth || node.width) || 0,
        height: Number(node.imageHeight || node.height) || 0
      }))
  })).filter(project => project.images.length).sort((a, b) => b.updatedAt - a.updatedAt);
}
const deepseekAnswerModels = Object.freeze(answerModelOptions.filter(option => option.provider === "deepseek").map(option => option.value));
const deepseekVisionAnswerModel = "deepseek-flash";
const deepseekModelAliases = Object.freeze({
  "deepseek-v4-flash": deepseekVisionAnswerModel,
  "deepseek-v4-flash-vision-exp": deepseekVisionAnswerModel
});
const claudeAnswerModels = Object.freeze(answerModelOptions.filter(option => option.provider === "claude").map(option => option.value));
const kimiAnswerModels = Object.freeze(answerModelOptions.filter(option => option.provider === "kimi").map(option => option.value));
function answerModelOption(value) { return answerModelOptions.find(option => option.value === value) || answerModelOptions[0]; }
function normalizedDeepseekModel(value) { const candidate = String(value || ""); return deepseekModelAliases[candidate] || candidate; }
function answerModelIsDeepseek(value) { return deepseekAnswerModels.includes(normalizedDeepseekModel(value)); }
function answerModelIsClaude(value) { return claudeAnswerModels.includes(String(value || "")); }
function normalizedKimiAnswerModel(value) { return String(value || "") === "kimi-k3" ? "kimi-k3-moonshot" : String(value || ""); }
function answerModelIsKimi(value) { return kimiAnswerModels.includes(normalizedKimiAnswerModel(value)); }
function normalizedAnswerModel(value) { const normalized = normalizedKimiAnswerModel(normalizedDeepseekModel(String(value || ""))); return answerModelOptions.some(option => option.value === normalized) ? normalized : answerModelOptions[0].value; }
function normalizedDeepseekThinking(value) { return value === "disabled" ? "disabled" : "enabled"; }
function normalizedDeepseekReasoningEffort(value) { return ["low", "high", "max"].includes(value) ? value : "high"; }
const h3AnswerModeOptions = Object.freeze([
  { value: "auto", label: "自动识别" },
  { value: "t2va", label: "文生视频 · T2VA" },
  { value: "i2va", label: "首帧生视频 · I2VA" },
  { value: "l2va", label: "尾帧生视频 · L2VA" },
  { value: "fl2va", label: "首尾帧生视频 · FL2VA" },
  { value: "ref2va", label: "全能多参考 · Ref2VA" }
]);
const h3DurationOptions = Object.freeze(Array.from({ length: 28 }, (_, index) => index + 3));
const productAdDurationOptions = Object.freeze(Array.from({ length: 13 }, (_, index) => index + 3));
const brandPromoDurationOptions = Object.freeze(Array.from({ length: 28 }, (_, index) => index + 3));
function answerSkillExtraHeight(value) { return value === "minimax-h3" || ["minimalist-product-ad", "brand-promo-video"].includes(value) ? 112 : value === "nuyoah-reverse" ? 36 : 0; }
function answerNodeHeight(node) { return nodeHeight("answer", node?.inputSlots || 4, 1) + answerSkillExtraHeight(node?.answerSkill) + (answerModelIsDeepseek(node?.model) ? 100 : 0); }
function normalizedAnswerSkill(value) { return answerSkillOptions.some(item => item.value === value) ? value : "none"; }
function normalizedH3AnswerMode(value) { return h3AnswerModeOptions.some(item => item.value === value) ? value : "auto"; }
function normalizedH3Duration(value) { return Math.min(30, Math.max(3, Math.round(Number(value) || 6))); }
function normalizedProductAdDuration(value, fallback) { const duration = Math.round(Number(value)); return productAdDurationOptions.includes(duration) ? duration : fallback; }
function normalizedBrandPromoDuration(value, fallback) { const duration = Math.round(Number(value)); return brandPromoDurationOptions.includes(duration) ? duration : fallback; }
const wenwuMode = { value: "wenwu", label: "文武双全", maxSeconds: 30, inputs: Array.from({ length: 9 }, (_, index) => "参考图 " + (index + 1)) };
const runningHubVideoMode = node => isWenwu(node) ? wenwuMode : ({ value: "reference", label: "多图参考生视频", maxSeconds: 15, inputs: ["参考图 1", "参考图 2", "参考图 3", "参考图 4", "参考图 5", "参考图 6"] });
function runningHubVideoDimensions(node) {
  if (isWenwu(node)) return wenwuDimensions(node);
  const aspect = runningHubVideoAspects.includes(node?.videoAspect) ? node.videoAspect : "16:9";
  const [ratioWidth, ratioHeight] = aspect.split(":").map(Number);
  const megapixels = runningHubVideoMegapixelOptions.some(option => option.value === Number(node?.videoMegapixels)) ? Number(node.videoMegapixels) : 0.9;
  if (aspect === "16:9" && runningHubVideo16x9Dimensions[megapixels]) return runningHubVideo16x9Dimensions[megapixels];
  if (aspect === "9:16" && runningHubVideo9x16Dimensions[megapixels]) return runningHubVideo9x16Dimensions[megapixels];
  const area = megapixels * 1_000_000; const ratio = ratioWidth / ratioHeight;
  const round32 = value => Math.max(32, Math.round(value / 32) * 32);
  return { width: round32(Math.sqrt(area * ratio)), height: round32(Math.sqrt(area / ratio)) };
}
function normalizeRunningHubVideo(node, connectedImageSlots = 0) {
  const mode = runningHubVideoMode(node);
  const inputSlots = mode.inputs.length;
  const promptSlots = Math.min(6, Math.max(1, Number(node?.promptSlots) || 1));
  const next = { ...node, mediaType: "video", provider: "runninghub-h3", x: Number.isFinite(Number(node?.x)) ? Number(node.x) : 0, y: Number.isFinite(Number(node?.y)) ? Number(node.y) : 0, videoMode: "reference", videoAspect: runningHubVideoAspects.includes(node?.videoAspect) ? node.videoAspect : "16:9", videoMegapixels: runningHubVideoMegapixelOptions.some(option => option.value === Number(node?.videoMegapixels)) ? Number(node.videoMegapixels) : 0.9, videoSeconds: Math.min(15, Math.max(5, Math.round(Number(node?.videoSeconds) || 6))), promptSlots, inputSlots, videoInputSlotsInitialized: true, localVideoReference: String(node?.localVideoReference || ""), localAudioReference: String(node?.localAudioReference || ""), width: Math.max(380, Number(node?.width) || 420) };
  if (isWenwu(node)) {
    next.videoMode = mode.value;
    next.videoAspect = Object.hasOwn(wenwuAspects, node.videoAspect) ? node.videoAspect : wenwuDefaults.videoAspect;
    next.videoMegapixels = validMegapixels(Number(node.videoMegapixels)) ? Number(node.videoMegapixels) : wenwuDefaults.videoMegapixels;
    next.videoMultiple = validMultiple(Number(node.videoMultiple)) ? Number(node.videoMultiple) : wenwuDefaults.videoMultiple;
    next.videoSeconds = Math.max(5, Math.min(mode.maxSeconds, Math.round(Number(node.videoSeconds) || wenwuDefaults.videoSeconds)));
  }
  delete next.previewSrc;
  delete next.previewRemoteSrc;
  next.height = Math.max(Number(node?.height) || 0, nodeHeight("video-generator", inputSlots, promptSlots));
  next.status = node?.activeJobId ? "running" : "idle";
  return next;
}
function image2ModelForNode(node) { return image2Models.some(item => item.id === node?.image2Model) ? node.image2Model : "gpt-image-2"; }
function image2ModelLabel(modelId) { return image2Models.find(item => item.id === modelId)?.label || "Image2"; }
function image25ModelForNode(node) { return node?.provider === "image2" && image25ModelIds.includes(image2ModelForNode(node)); }
function image25AdvancedQualityForNode(node) { return node?.provider === "image2" && image25AdvancedModelIds.includes(image2ModelForNode(node)); }
function image25ResolutionForNode(node) { return image25ResolutionOptions.some(option => option.value === node?.outputSize) ? node.outputSize : "2K"; }
function image25ApiSize(node, resolution = image25ResolutionForNode(node)) {
  const aspect = sizeMap[node?.aspect] ? node.aspect : fixedGeneratorSettings.aspect;
  return image25Sizes[resolution]?.[aspect] || image25Sizes["2K"][fixedGeneratorSettings.aspect];
}
function generatorOutputModelId(node) { return node?.provider === "moyu" ? node.moyuModel : node?.provider === "midjourney" ? midjourneyImageModels[0].id : node?.provider === "runninghub-krea2" ? "krea2-white-marble" : node?.provider === "runninghub-moss" ? mossWorkflow.model : image2ModelForNode(node); }
function generatorOutputOptions(node) { if (isArkProvider(node?.provider)) return [{ value: "2K", label: "2K · PNG" }]; if (node?.provider === "runninghub-moss") return [{ value: "upscaled", label: "放大结果 · 1 张" }]; return generatorOutputSizeOptions[generatorOutputModelId(node)] || generatorOutputSizeOptions.image2; }
function generatorDefaultOutputSize(node) { return image25ModelForNode(node) ? "2K" : generatorOutputOptions(node).at(-1)?.value || "current"; }
function normalizeGeneratorOutputSize(node) { const options = generatorOutputOptions(node); return options.some(option => option.value === node?.outputSize) ? node.outputSize : generatorDefaultOutputSize(node); }
function generatorOutputOptionLabel(node, option) { return image25ModelForNode(node) ? `${option.value} · ${image25ApiSize(node, option.value).replace("x", " × ")}` : option.label; }
function generatorApiSize(node) {
  if (isArkProvider(node?.provider)) return arkSizes[node.aspect] || arkSizes["3:4"];
  if (node?.provider === "runninghub-moss") return mossAspect(node.aspect);
  if (node?.provider === "midjourney") return sizeMap[node?.aspect] ? node.aspect : fixedGeneratorSettings.aspect;
  if (image25ModelForNode(node)) return image25ApiSize(node);
  if (node?.provider !== "moyu") return sizeMap[node?.aspect]?.api || sizeMap[fixedGeneratorSettings.aspect].api;
  const maximum = { "1:1": "2048x2048", "16:9": "2848x1600", "9:16": "1600x2848" };
  return maximum[node.aspect] || sizeMap[node.aspect]?.api || sizeMap[fixedGeneratorSettings.aspect].api;
}
function krea2Dimensions(node) {
  const normalize = value => Math.min(4096, Math.max(32, Math.round((Number(value) || 32) / 32) * 32));
  return { width: normalize(node?.kreaWidth || 1920), height: normalize(node?.kreaHeight || 1080) };
}
const krea2PresetDimensions = Object.freeze({
  "16:9": [1920, 1088],
  "9:16": [1088, 1920],
  "1:1": [1024, 1024],
  "3:4": [1152, 1536],
  "4:3": [1536, 1152]
});
function krea2PresetForNode(node) {
  const dimensions = krea2Dimensions(node);
  return Object.entries(krea2PresetDimensions).find(([, value]) => value[0] === dimensions.width && value[1] === dimensions.height)?.[0] || "";
}
const generatorProviders = Object.freeze({ "ark-plan": { label: "火山套餐 Seedream", model: arkPlanModels[0].id }, ark: { label: "火山引擎 Seedream", model: arkModels[0].id }, image2: { label: "Image2", model: image2DefaultModel }, moyu: { label: "豆包 Seedream", model: seedreamImageModels[0].id }, midjourney: { label: "Midjourney Fast", model: midjourneyImageModels[0].id }, "runninghub-krea2": runningHubKrea2Provider, "runninghub-moss": runningHubMossProvider });
function generatorModelForNode(node) {
  if (isArkProvider(node?.provider)) return arkModelsForProvider(node.provider).some(item => item.id === node.arkModel) ? node.arkModel : arkModelsForProvider(node.provider)[0].id;
  if (node?.mediaType === "video" || node?.provider === "runninghub-h3") return runningHubVideoProvider.model;
  if (node?.provider === "image2") return image2ModelForNode(node);
  if (node?.provider === "moyu" && seedreamImageModels.some(item => item.id === node.moyuModel)) return node.moyuModel;
  if (node?.provider === "midjourney") return midjourneyImageModels[0].id;
  if (node?.provider === "runninghub-krea2") return runningHubKrea2Provider.model;
  if (node?.provider === "runninghub-moss") return runningHubMossProvider.model;
  return generatorProviders[node?.provider]?.model || generatorProviders.image2.model;
}
function generatorProviderForNode(node) { if (node?.mediaType === "video" || node?.provider === "runninghub-h3") return runningHubVideoProvider; const provider = generatorProviders[node?.provider] || generatorProviders.image2; return { ...provider, model: generatorModelForNode(node) }; }
function generatorModelLabel(modelId, fallback = "Image2") {
  if (image2Models.some(item => item.id === modelId)) return image2ModelLabel(modelId);
  if (modelId === "Krea2 White Marble") return "K2 白玉";
  if (modelId === mossWorkflow.model) return "MOSS";
  return arkPlanModels.find(item => item.id === modelId)?.label || arkModels.find(item => item.id === modelId)?.label || seedreamImageModels.find(item => item.id === modelId)?.label
    || midjourneyImageModels.find(item => item.id === modelId)?.label
    || fallback;
}
function generatorReferenceLimit(node) { if (isArkProvider(node?.provider)) return 10; if (node?.mediaType === "video") return runningHubVideoMode(node).inputs.length; if (["runninghub-krea2", "runninghub-moss"].includes(node?.provider)) return 0; if (node?.provider === "midjourney") return 4; if (node?.provider === "moyu") return 6; return 8; }
const nodeLabels = { speech: "声音克隆", audio: "音频结果", prompt: "提示词", composition: "参数控制", image: "图像", video: "视频", "video-editor": "视频剪辑", "video-preview": "成片预览", generator: "生图", answer: "模型回答", note: "便签", frame: "画板", loading: "生成中" };
const defaultPromptComposition = Object.freeze({ perspective: null, horizon: 50, tilt: 0, depth: null, focalLength: null, cameraHeight: null, cameraDirection: null, cameraAngle: null, shotSize: null, horizonEnabled: false, horizonPending: false, panel: "parameters", visualStyle: null, temperature: null, palette: null, saturation: null, tone: null, contrast: null, texture: null });
const compositionPerspectiveLabels = { "left-near": "左近右远", "right-near": "右近左远", parallel: "平行视角" };
const compositionDepthLabels = { shallow: "浅景深", balanced: "均衡景深", deep: "深景深" };
const compositionFocalLengthLabels = { wide: "广角", standard: "标准", telephoto: "长焦" };
const compositionCameraHeightLabels = { eye: "平视", low: "低机位", high: "高机位" };
const compositionCameraDirectionLabels = { left: "左侧", right: "右侧", top: "上方", bottom: "下方", front: "正前", back: "正后" };
const compositionCameraAngleLabels = { angle45: "45°", angle20: "20°", angle0: "0°" };
const compositionShotSizeLabels = { extremeWide: "大远景", wide: "全景", medium: "中景", close: "近景", closeUp: "特写" };
const compositionVisualStyleLabels = { cinematic: "电影写实", editorial: "时尚写真", documentary: "纪实自然", film: "复古胶片", clear: "日系清透", illustration: "绘画插画", render3d: "3D 渲染" };
const compositionTemperatureLabels = { warm: "暖调", neutral: "中性", cool: "冷调" };
const compositionPaletteLabels = { natural: "自然色", tealOrange: "青橙", blueGreen: "蓝绿", pinkPurple: "粉紫", redBrown: "红棕", mono: "黑白单色" };
const compositionSaturationLabels = { muted: "低饱和", natural: "自然饱和", vivid: "高饱和" };
const compositionToneLabels = { highKey: "高调", balanced: "均衡", lowKey: "低调" };
const compositionContrastLabels = { soft: "柔和", standard: "标准", strong: "强对比" };
const compositionTextureLabels = { clean: "干净通透", grain: "胶片颗粒", softFocus: "柔焦朦胧", crisp: "锐利清晰", faded: "复古褪色" };

const workspace = $("#workspace");
const canvasScene = $("#canvasScene");
const frameLayer = $("#frameLayer");
const nodeLayer = $("#nodeLayer");
const edgeLayer = $("#edgeLayer");
const libraryContent = $("#libraryContent");
const inspectorContent = $("#inspectorContent");
const imageFileInput = $("#imageFileInput");
const videoFileInput = $("#videoFileInput");
const audioFileInput = $("#audioFileInput");
const projectFileInput = $("#projectFileInput");
const settingsDialog = $("#settingsDialog");
const newProjectDialog = $("#newProjectDialog");
const previewDialog = $("#previewDialog");
const previewVideo = $("#previewVideo");
const cropDialog = $("#cropDialog");
const cropCanvas = $("#cropCanvas");
const cropSourceImage = $("#cropSourceImage");
const cropSelection = $("#cropSelection");
const selectionRect = $("#selectionRect");
const activeProjectSessionKey = "image2-canvas-active-project";

let state = null;
let projectMetas = [];
let promptPresets = [];
let globalTheme = localStorage.getItem("image2-canvas-theme") || "light";
let lineMotion = localStorage.getItem("image2-canvas-line-motion") === "static" ? "static" : "dynamic";
let undoStack = [];
let redoStack = [];
const editableHistorySessions = new WeakMap();
let dragSession = null;
let resizeSession = null;
let panSession = null;
let selectionSession = null;
let connectionDraft = null;
let connectionMenu = null;
let connectionMenuDraft = null;
let connectionMenuDragSession = null;
let connectionMenuResizeSession = null;
let canvasContextMenu = null;
let canvasResizeObserver = null;
let observedWorkspaceSize = null;
function clearWorkflowInteractionState() {
  dragSession?.elements?.forEach(item => { if (item.element) { item.element.style.transform = ""; item.element.style.willChange = ""; item.element.classList.remove("is-dragging"); } });
  dragSession = null; resizeSession = null; panSession = null; selectionSession = null; connectionDraft = null;
  workspace?.classList.remove("is-flow-interacting", "is-panning");
  if (selectionRect) selectionRect.hidden = true;
}
function resetInterruptedInteractionState() {
  const hadInteraction = Boolean(dragSession || resizeSession || panSession || selectionSession || connectionDraft || panelResizeSession);
  if (!hadInteraction) {
    spacePressed = false;
    workspace?.classList.remove("is-flow-interacting", "is-panning");
    return;
  }
  dragSession?.elements?.forEach(item => {
    if (!item.element) return;
    item.element.style.transform = "";
    item.element.style.willChange = "";
    item.element.classList.remove("is-dragging");
  });
  if (resizeSession?.element) resizeSession.element.style.willChange = "";
  clearWorkflowInteractionState();
  panelResizeSession = null;
  document.body.classList.remove("is-resizing-panel");
  workspace?.classList.remove("is-flow-interacting", "is-panning");
  if (selectionRect) selectionRect.hidden = true;
  spacePressed = false;
  if (!state) return;
  renderCanvas(); renderCanvasSelection(); syncVideoGeneratorPortPositions(); renderEdges(); renderInspector();
  updateHistoryButtons();
  scheduleSave();
}
let pendingImageUploadNodeId = null;
let suppressReferenceUploadNodeId = null;
let pendingVideoImportNodeId = null;
let pendingVideoReferenceNodeId = null;
let pendingVideoPreviewUploadNodeId = null;
let pendingAudioReferenceNodeId = null;
let pendingAudioReferenceSlot = 1;
let cropSession = null;
let compositionDragSession = null;
let promptLayoutResizeSession = null;
let promptReferenceClickTimer = null;
const promptQuickSelection = new Map();
const promptFormatSelection = new Map();
let selectedEdgeId = null;
let crossProjectSourceProjectId = "";
let panelResizeSession = null;
function workspaceSessionSnapshot() {
  if (!state?.id) return null;
  return {
    projectId: state.id,
    viewport: state.viewport
  };
}
function rememberActiveProject() {
  const snapshot = workspaceSessionSnapshot();
  if (!snapshot) return;
  try { sessionStorage.setItem(activeProjectSessionKey, JSON.stringify(snapshot)); } catch { /* Session storage may be unavailable in private browser profiles. */ }
}
function readActiveProjectSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(activeProjectSessionKey) || "null");
    return saved?.projectId ? saved : null;
  } catch { return null; }
}
function clearActiveProjectSession() {
  try { sessionStorage.removeItem(activeProjectSessionKey); } catch { /* Ignore unavailable session storage. */ }
}
function restoreWorkspaceSession(nextState, saved) {
  if (!saved || saved.projectId !== nextState.id) return;
  const restoreViewport = (target, source, min, max) => {
    if (!target || !source || !Number.isFinite(Number(source.x)) || !Number.isFinite(Number(source.y)) || !Number.isFinite(Number(source.scale))) return;
    target.x = Number(source.x); target.y = Number(source.y); target.scale = Math.min(max, Math.max(min, Number(source.scale)));
  };
  restoreViewport(nextState.viewport, saved.viewport, WORKFLOW_ZOOM_MIN, WORKFLOW_ZOOM_MAX);
}
let workflowClipboard = null;
let workflowPasteSerial = 0;
let spacePressed = false;
let saveTimer = null;
let saveRevision = 0;
let projectSaveQueue = Promise.resolve();
const WORKFLOW_ZOOM_MIN = 0.05;
const WORKFLOW_ZOOM_MAX = 5;
const generationPollFailures = new Map();
let generationElapsedClock = null;
let apiKey = "";
let runningHubApiKey = "";
export function remakeAuthHeaders() {
  return { ...(apiKey && { 'x-image2-api-key': apiKey }), ...(runningHubApiKey && { 'x-runninghub-api-key': runningHubApiKey }) };
}
let isGenerating = false;
let projectSearch = "";
let projectOpeningId = null;
let generatedCleanupPreview = null;
let edgeRenderFrame = 0;
const generationPollers = new Map();

function uid(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function promptMarkupFromPlainText(value) {
  return escapeHtml(String(value ?? "").replace(/\r\n?/g, "\n")).replace(/\n/g, "<br>");
}
function isPromptThemeDefaultColor(color) {
  const normalized = String(color || "").replace(/\s+/g, "").toLowerCase();
  return ["#fff", "#ffffff", "white", "rgb(255,255,255)", "rgba(255,255,255,1)"].includes(normalized);
}
function sanitizePromptMarkup(markup, fallback = "") {
  const source = String(markup || "").trim();
  if (!source) return promptMarkupFromPlainText(fallback);
  const root = new DOMParser().parseFromString(`<div>${source}</div>`, "text/html").body.firstElementChild;
  if (!root) return promptMarkupFromPlainText(fallback);
  const serialize = node => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.nodeValue || "");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.tagName.toLowerCase();
    if (tag === "br") return "<br>";
    const inner = [...node.childNodes].map(serialize).join("");
    if (tag === "div" || tag === "p") return `${inner}${inner && !inner.endsWith("<br>") ? "<br>" : ""}`;
    if (tag !== "span") return inner;
    const styles = [];
    const color = String(node.style.color || "").trim();
    const fontSize = String(node.style.fontSize || "").trim();
    if (!isPromptThemeDefaultColor(color) && /^(#[0-9a-f]{3,8}|rgb\([^)]{1,32}\)|rgba\([^)]{1,40}\)|hsl\([^)]{1,40}\)|hsla\([^)]{1,48}\))$/i.test(color)) styles.push(`color:${color}`);
    if (/^\d{1,3}px$/.test(fontSize)) styles.push(`font-size:${fontSize}`);
    return styles.length ? `<span style="${styles.join(";")}">${inner}</span>` : inner;
  };
  return serialize(root).replace(/(?:<br>)+$/i, "");
}
function icon(name) { return `<i data-lucide="${name}" aria-hidden="true"></i>`; }
function refreshIcons() { if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } }); }
function shortLabel(value, max = 18) {
  const text = String(value ?? "").trim();
  if (!text) return "未命名";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
function projectPreviewSource(project) {
  const images = (project?.nodes || []).filter(node => node?.type === "image" && typeof node.src === "string" && node.src);
  const preferred = images.find(node => node.source === "Image2" || node.source === "豆包 Seedream") || images[0];
  return preferred?.previewSrc || preferred?.src || "";
}

function requestEdgeRender() {
  if (edgeRenderFrame) return;
  edgeRenderFrame = requestAnimationFrame(() => {
    edgeRenderFrame = 0;
    renderEdges();
  });
}
function nodeHeight(type, slots = 4, promptSlots = 1) {
  if (type === "prompt") return 270;
  if (type === "composition") return 590;
  if (type === "image" || type === "loading") return 322;
  if (type === "video-generator") return 650 + (slots > 6 ? 132 : 0) + Math.max(0, Number(promptSlots) - 1) * 30;
  if (type === "video-editor") return 390;
  if (type === "video-preview") return 322;
  if (type === "generator") return 316 + slots * 30 + Math.max(0, promptSlots - 1) * 30;
  if (type === "answer") return 344 + slots * 30 + Math.max(0, promptSlots - 1) * 30;
  return 420;
}
function normalizePromptComposition(value) {
  const source = value && typeof value === "object" ? value : {};
  const perspective = source.perspective === null ? null : ["left-near", "right-near", "parallel"].includes(source.perspective) ? source.perspective : defaultPromptComposition.perspective;
  const horizonEnabled = source.horizonEnabled !== false; const horizonPending = source.horizonPending === true;
  const depth = source.depth === null ? null : ["shallow", "balanced", "deep"].includes(source.depth) ? source.depth : defaultPromptComposition.depth; const focalLength = source.focalLength === null ? null : ["wide", "standard", "telephoto"].includes(source.focalLength) ? source.focalLength : defaultPromptComposition.focalLength; const cameraHeight = source.cameraHeight === null ? null : ["eye", "low", "high"].includes(source.cameraHeight) ? source.cameraHeight : defaultPromptComposition.cameraHeight; const cameraDirection = source.cameraDirection === null ? null : Object.hasOwn(compositionCameraDirectionLabels, source.cameraDirection) ? source.cameraDirection : defaultPromptComposition.cameraDirection; const cameraAngle = source.cameraAngle === null ? null : Object.hasOwn(compositionCameraAngleLabels, source.cameraAngle) ? source.cameraAngle : defaultPromptComposition.cameraAngle; const shotSize = source.shotSize === null ? null : ["extremeWide", "wide", "medium", "close", "closeUp"].includes(source.shotSize) ? source.shotSize : defaultPromptComposition.shotSize;
  const choice = (value, labels) => value === null ? null : Object.hasOwn(labels, value) ? value : null;
  const panel = source.panel === "expression" ? "expression" : "parameters";
  const visualStyle = choice(source.visualStyle, compositionVisualStyleLabels); const temperature = choice(source.temperature, compositionTemperatureLabels); const palette = choice(source.palette, compositionPaletteLabels); const saturation = choice(source.saturation, compositionSaturationLabels); const tone = choice(source.tone, compositionToneLabels); const contrast = choice(source.contrast, compositionContrastLabels); const texture = choice(source.texture, compositionTextureLabels);
  return { perspective, horizon: Math.min(85, Math.max(15, Number.isFinite(Number(source.horizon)) ? Math.round(Number(source.horizon)) : defaultPromptComposition.horizon)), tilt: Math.min(18, Math.max(-18, Number.isFinite(Number(source.tilt)) ? Math.round(Number(source.tilt)) : defaultPromptComposition.tilt)), depth, focalLength, cameraHeight, cameraDirection, cameraAngle, shotSize, horizonEnabled, horizonPending, panel, visualStyle, temperature, palette, saturation, tone, contrast, texture };
}
function normalizePromptLayout(value, width = 320, height = nodeHeight("prompt")) {
  const source = value && typeof value === "object" ? value : {}; const maxTextHeight = Math.max(100, height - 215); const maxHorizonWidth = Math.max(118, width - 120);
  const fallbackTextHeight = Math.max(120, Math.min(260, Math.round(height * .55))); const fallbackHorizonWidth = Math.max(120, Math.round(width * .64));
  return { textHeight: Math.min(maxTextHeight, Math.max(100, Number.isFinite(Number(source.textHeight)) ? Math.round(Number(source.textHeight)) : fallbackTextHeight)), horizonWidth: Math.min(maxHorizonWidth, Math.max(108, Number.isFinite(Number(source.horizonWidth)) ? Math.round(Number(source.horizonWidth)) : fallbackHorizonWidth)) };
}
function promptNodeElement(id) { return nodeLayer.querySelector(`[data-node-id="${CSS.escape(id)}"]`); }
function startPromptLayoutResize(event) {
  const handle = event.currentTarget; const nodeId = handle.dataset.promptTextResize || handle.dataset.promptCompositionWidthResize; const node = findNode(nodeId); if (!node || node.type !== "prompt") return;
  event.preventDefault(); event.stopPropagation(); promptLayoutResizeSession = { kind: handle.dataset.promptTextResize ? "text" : "width", nodeId, handle, startX: event.clientX, startY: event.clientY, start: normalizePromptLayout(node.promptLayout, node.width, node.height), before: snapshot(), moved: false }; handle.setPointerCapture?.(event.pointerId); handle.classList.add("is-adjusting");
}
function movePromptLayoutResize(event) {
  const session = promptLayoutResizeSession; if (!session || event.currentTarget !== session.handle) return; const node = findNode(session.nodeId); if (!node || node.type !== "prompt") return;
  event.preventDefault(); event.stopPropagation(); const scale = Math.max(.01, state.viewport.scale || 1); const next = { ...session.start };
  if (session.kind === "text") next.textHeight = session.start.textHeight + (event.clientY - session.startY) / scale;
  else next.horizonWidth = session.start.horizonWidth + (event.clientX - session.startX) / scale;
  node.promptLayout = normalizePromptLayout(next, node.width, node.height); session.moved = true; const element = promptNodeElement(node.id); if (element) { element.style.setProperty("--prompt-text-height", `${node.promptLayout.textHeight}px`); element.style.setProperty("--prompt-horizon-width", `${node.promptLayout.horizonWidth}px`); }
}
function finishPromptLayoutResize(event) {
  const session = promptLayoutResizeSession; if (!session || event.currentTarget !== session.handle) return; promptLayoutResizeSession = null; session.handle.classList.remove("is-adjusting"); if (session.handle.hasPointerCapture?.(event.pointerId)) session.handle.releasePointerCapture?.(event.pointerId);
  if (!session.moved) return; undoStack.push(session.before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; renderCanvas(); renderInspector(); updateHistoryButtons(); scheduleSave();
}function promptCompositionInstruction(composition) {
  const data = normalizePromptComposition(composition);
  const perspective = data.perspective === "left-near" ? "左侧前景近大、右侧远景缩小，单点透视" : data.perspective === "right-near" ? "右侧前景近大、左侧远景缩小，单点透视" : data.perspective === "parallel" ? "正视平行透视，画面两侧保持平行，无明显近大远小" : "";
  const tilt = data.tilt === 0 ? "水平" : data.tilt > 0 ? "左低右高 " + data.tilt + "°" : "左高右低 " + Math.abs(data.tilt) + "°";
  const depth = data.depth === "shallow" ? "浅景深，主体清晰、背景柔和虚化" : data.depth === "deep" ? "深景深，前中后景均清晰" : data.depth === "balanced" ? "均衡景深，主体与环境保持清晰层次" : "";
  const focalLength = data.focalLength === "wide" ? "广角镜头，扩大空间与环境纵深" : data.focalLength === "telephoto" ? "长焦镜头，压缩空间层次" : data.focalLength === "standard" ? "标准镜头，自然视角" : "";
  const cameraHeight = data.cameraHeight === "low" ? "低机位仰视" : data.cameraHeight === "high" ? "高机位俯视" : data.cameraHeight === "eye" ? "平视机位" : "";
  const cameraDirection = data.cameraDirection === "left" ? "镜头位于主体左侧" : data.cameraDirection === "right" ? "镜头位于主体右侧" : data.cameraDirection === "top" ? "镜头位于主体上方俯拍" : data.cameraDirection === "bottom" ? "镜头位于主体下方仰拍" : data.cameraDirection === "front" ? "镜头位于主体正前方" : data.cameraDirection === "back" ? "镜头位于主体正后方，拍摄背影" : "";
  const cameraAngle = data.cameraAngle === "angle45" ? "拍摄角度 45°" : data.cameraAngle === "angle20" ? "拍摄角度 20°" : data.cameraAngle === "angle0" ? "拍摄角度 0°，正轴视角" : "";
  const shotSize = data.shotSize === "extremeWide" ? "大远景，突出广阔环境与人物尺度" : data.shotSize === "wide" ? "全景，完整呈现人物动作与环境" : data.shotSize === "close" ? "近景，强调人物表情与互动" : data.shotSize === "closeUp" ? "特写，聚焦面部或关键细节" : data.shotSize === "medium" ? "中景，表现人物半身与环境关系" : "";
  const expression = [data.visualStyle && "风格：" + compositionVisualStyleLabels[data.visualStyle], data.temperature && "色温：" + compositionTemperatureLabels[data.temperature], data.palette && "主色：" + compositionPaletteLabels[data.palette], data.saturation && "饱和度：" + compositionSaturationLabels[data.saturation], data.tone && "明暗：" + compositionToneLabels[data.tone], data.contrast && "反差：" + compositionContrastLabels[data.contrast], data.texture && "质感：" + compositionTextureLabels[data.texture]].filter(Boolean);
  const lines = [];
  if (perspective) lines.push("透视：" + perspective + "。");
  if (data.horizonEnabled && !data.horizonPending) lines.push("地平线：位于画面高度 " + data.horizon + "%（" + tilt + "）。");
  const photography = [focalLength, cameraHeight, cameraDirection, cameraAngle, depth].filter(Boolean);
  if (photography.length) lines.push("摄影：" + photography.join("；") + "。");
  if (shotSize) lines.push("景别：" + shotSize + "。");
  if (expression.length) lines.push("表现：" + expression.join("；") + "。");
  return lines.join("\n");
}
function stripPromptCompositionMarkers(content) {
  const openMarker = "(?:【|\\[)(?:构图控制|参数控制)(?:】|\\])";
  const closeMarker = "(?:【|\\[)\\/(?:构图控制|参数控制)(?:】|\\])";
  const markers = new RegExp("(?:^|\\n)\\s*(?:" + openMarker + "|" + closeMarker + ")\\s*(?=\\n|$)", "g");
  return String(content || "").replace(markers, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function upsertPromptCompositionInstruction(content, composition, previousInstruction = "") {
  const openMarker = "(?:【|\\[)(?:构图控制|参数控制)(?:】|\\])";
  const closeMarker = "(?:【|\\[)\\/(?:构图控制|参数控制)(?:】|\\])";
  const block = new RegExp("(?:^|\\n)\\s*" + openMarker + "[\\s\\S]*?" + closeMarker + "(?=\\s*(?:\\n|$))", "g");
  const previous = String(previousInstruction || "").trim();
  const legacyInstruction = /(?:^|\n)(?:透视：[^\n]*。|地平线：[^\n]*。|摄影：[^\n]*。|景别：[^\n]*。)/g;
  const base = stripPromptCompositionMarkers(String(content || "").replace(block, "\n"));
  const withoutPrevious = base.replace(previous, "").replace(legacyInstruction, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const directive = promptCompositionInstruction(composition);
  if (!directive) return withoutPrevious;
  const wrapped = "【参数控制】\n" + directive;
  return withoutPrevious ? withoutPrevious + "\n\n" + wrapped : wrapped;
}
function horizonPositionLabel(value) {
  const percent = Number(value);
  if (percent <= 35) return `上方 ${percent}%`;
  if (percent >= 65) return `下方 ${percent}%`;
  return `居中 ${percent}%`;
}
function horizonTiltLabel(value) {
  const tilt = Number(value);
  if (!tilt) return "水平";
  return tilt > 0 ? `左低右高 ${tilt}°` : `左高右低 ${Math.abs(tilt)}°`;
}
function promptHorizonEndpoints(composition) {
  const data = normalizePromptComposition(composition); const delta = data.tilt / 18 * 20;
  return { left: Math.min(95, Math.max(5, data.horizon + delta)), right: Math.min(95, Math.max(5, data.horizon - delta)) };
}
function promptCompositionFromHorizonEndpoints(left, right) {
  const safeLeft = Math.min(95, Math.max(5, Number(left))); const safeRight = Math.min(95, Math.max(5, Number(right)));
  return { horizon: (safeLeft + safeRight) / 2, tilt: (safeLeft - safeRight) / 40 * 18 };
}
function updateHorizonCanvasPreview(canvas, composition) {
  if (!canvas) return; const endpoints = promptHorizonEndpoints(composition); const line = canvas.querySelector("[data-horizon-visual-line]"); const hit = canvas.querySelector("[data-horizon-drag=middle]"); const left = canvas.querySelector("[data-horizon-drag=left]"); const right = canvas.querySelector("[data-horizon-drag=right]"); const summary = canvas.closest(".composition-horizon-setting")?.querySelector(".composition-summary");
  [line, hit].forEach(element => { if (element) { element.setAttribute("y1", endpoints.left); element.setAttribute("y2", endpoints.right); } }); if (left) left.style.top = `${endpoints.left}%`; if (right) right.style.top = `${endpoints.right}%`; if (summary) summary.textContent = composition.horizonPending ? "待确认" : composition.horizonEnabled === false ? "提示词未启用" : `${horizonPositionLabel(composition.horizon)} · ${horizonTiltLabel(composition.tilt)}`;
}
function startHorizonCompositionDrag(event) {
  const canvas = event.currentTarget; const target = event.target.closest("[data-horizon-drag]"); const node = findNode(canvas.dataset.horizonCanvas); if (!target || !node || node.type !== "composition") return;
  event.preventDefault(); event.stopPropagation(); const rect = canvas.getBoundingClientRect(); const point = Math.min(95, Math.max(5, (event.clientY - rect.top) / rect.height * 100));
  compositionDragSession = { nodeId: node.id, canvas, mode: target.dataset.horizonDrag, startPoint: point, start: normalizePromptComposition(node.composition), before: snapshot(), moved: false };
  canvas.classList.add("is-adjusting"); canvas.setPointerCapture?.(event.pointerId);
}
function moveHorizonCompositionDrag(event) {
  const session = compositionDragSession; if (!session || event.currentTarget !== session.canvas) return; const node = findNode(session.nodeId); if (!node || node.type !== "composition") return;
  event.preventDefault(); event.stopPropagation(); const rect = session.canvas.getBoundingClientRect(); const point = Math.min(95, Math.max(5, (event.clientY - rect.top) / rect.height * 100)); const endpoints = promptHorizonEndpoints(session.start); let next;
  if (session.mode === "middle") next = normalizePromptComposition({ ...session.start, horizonPending: true, horizon: session.start.horizon + point - session.startPoint });
  else { endpoints[session.mode] = point; next = { ...session.start, horizonPending: true, ...promptCompositionFromHorizonEndpoints(endpoints.left, endpoints.right) }; }
  node.composition = normalizePromptComposition(next); session.moved = true; updateHorizonCanvasPreview(session.canvas, node.composition);
}
function finishHorizonCompositionDrag(event) {
  const session = compositionDragSession; if (!session || event.currentTarget !== session.canvas) return; compositionDragSession = null; session.canvas.classList.remove("is-adjusting"); if (session.canvas.hasPointerCapture?.(event.pointerId)) session.canvas.releasePointerCapture?.(event.pointerId);
  const node = findNode(session.nodeId); if (!node || node.type !== "composition") return; if (!session.moved) { if (node.composition.horizonEnabled === false) return; node.composition = normalizePromptComposition({ ...node.composition, horizonEnabled: false, horizonPending: false }); applyCompositionToLinkedPrompts(node.id); } undoStack.push(session.before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; renderCanvas(); renderInspector(); updateHistoryButtons(); scheduleSave();
}
function createPromptNode(x, y, content = "") {
  return { id: uid("prompt"), type: "prompt", name: "画面提示词", x, y, width: 320, height: nodeHeight("prompt"), content, promptPresetId: "", promptQuickParams: normalizePromptQuickParams(null), promptQuickInstruction: "", promptQuickControlsVisible: false, composition: { ...defaultPromptComposition }, promptLayout: normalizePromptLayout(null, 320, nodeHeight("prompt")), disabled: false, createdAt: Date.now() };
}
function createCompositionNode(x, y) {
  return { id: uid("composition"), type: "composition", name: "参数控制", x, y, width: 390, height: nodeHeight("composition"), composition: { ...defaultPromptComposition }, createdAt: Date.now() };
}
function createNote(x, y) {
  return { id: uid("note"), type: "note", name: "便签", content: "", x, y, width: 260, height: 190, createdAt: Date.now() };
}
function linkedPromptsForComposition(compositionId) {
  return state.edges.filter(edge => edge.type === "composition" && edge.source === compositionId && edge.sourcePort === "composition").map(edge => findNode(edge.target)).filter(node => node?.type === "prompt");
}
function applyCompositionToLinkedPrompts(compositionId) {
  const source = findNode(compositionId); if (!source || source.type !== "composition") return;
  const instruction = promptCompositionInstruction(source.composition); linkedPromptsForComposition(compositionId).forEach(prompt => { prompt.content = upsertPromptCompositionInstruction(prompt.content, source.composition, prompt.compositionInstruction); prompt.contentMarkup = promptMarkupFromPlainText(prompt.content); prompt.compositionInstruction = instruction; });
}
function createGeneratorNode(x, y) {
  return { id: uid("image2"), type: "generator", name: image2ModelLabel(image2DefaultModel), provider: "image2", image2Model: image2DefaultModel, moyuModel: seedreamImageModels[0].id, outputSize: "2K", x, y, width: 360, promptSlots: 1, inputSlots: 4, height: nodeHeight("generator", 4, 1), aspect: fixedGeneratorSettings.aspect, quality: "auto", batch: fixedGeneratorSettings.batch, constraints: "不要水印，不要多余文字，不要畸形手指", status: "idle", lastResultIds: [], createdAt: Date.now() };
}
const promptQuickParamOptions = Object.freeze({
  shotSize: { label: "景别", options: [["", "不指定"], ["extremeWide", "大远景，突出广阔环境与人物尺度"], ["wide", "全景，完整呈现人物动作与环境"], ["medium", "中景，人物腰部以上"], ["mediumClose", "中近景，人物胸部以上"], ["close", "近景，强调人物表情与互动"], ["closeUp", "特写，聚焦面部或关键细节"]] },
  cameraDirection: { label: "机位", options: [["", "不指定"], ["front", "正视，镜头位于主体正前方"], ["left", "左侧，镜头位于主体左侧"], ["right", "右侧，镜头位于主体右侧"], ["top", "俯视，镜头位于主体上方俯拍"], ["bottom", "仰视，镜头位于主体下方仰拍"]] },
  cameraAngle: { label: "角度", options: [["", "不指定"], ["angle0", "0°，正轴视角"], ["angle20", "20°，轻微侧倾"], ["angle45", "45°，斜侧构图"], ["angle60", "60°，明显侧向"], ["angle90", "90°，正侧面"]] },
  depth: { label: "景深", options: [["", "不指定"], ["shallow", "浅景深，主体清晰背景虚化"], ["balanced", "均衡景深，主体与环境平衡"], ["deep", "深景深，前后景清晰"]] },
  perspective: { label: "透视", options: [["", "不指定"], ["left-near", "左近右远，左侧更近右侧更远"], ["right-near", "左远右近，左侧更远右侧更近"], ["parallel", "平行视角，画面空间平行"]] },
  motion: { label: "运镜", options: [["", "不指定"], ["static", "固定镜头，画面稳定"], ["push", "推进，镜头向主体靠近"], ["pull", "拉远，镜头远离主体"], ["left", "左移，镜头向左平移"], ["right", "右移，镜头向右平移"], ["up", "上摇，镜头向上转动"], ["down", "下摇，镜头向下转动"], ["follow", "跟拍，镜头跟随主体"], ["orbit", "环绕，镜头围绕主体移动"]] }
});
function normalizePromptQuickParams(value) {
  const source = value && typeof value === "object" ? value : {};
  const valid = (field, fallback = "") => promptQuickParamOptions[field].options.some(([id]) => id === source[field]) ? source[field] : fallback;
  const second = value => value === "" || value === null || value === undefined ? "" : /^\d+$/.test(String(value)) && Number(value) >= 0 && Number(value) <= 15 ? String(Number(value)) : "";
  const start = second(source.secondsStart); const end = second(source.secondsEnd);
  return { secondsStart: start, secondsEnd: end, shotSize: valid("shotSize"), cameraDirection: valid("cameraDirection"), cameraAngle: valid("cameraAngle"), depth: valid("depth"), perspective: valid("perspective"), motion: valid("motion") };
}
function promptQuickParamInstruction(value) {
  const data = normalizePromptQuickParams(value);
  const label = (field, id) => promptQuickParamOptions[field].options.find(([value]) => value === id)?.[1] || "";
  const lines = [];
  if (data.secondsStart !== "" && data.secondsEnd !== "" && Number(data.secondsEnd) > Number(data.secondsStart)) lines.push(`时长；${data.secondsStart}秒-${data.secondsEnd}秒，`);
  if (data.shotSize) lines.push(`景别；${label("shotSize", data.shotSize)}，`);
  if (data.cameraDirection) lines.push(`机位；${label("cameraDirection", data.cameraDirection)}，`);
  if (data.cameraAngle) lines.push(`角度；${label("cameraAngle", data.cameraAngle)}，`);
  if (data.depth) lines.push(`景深；${label("depth", data.depth)}，`);
  if (data.perspective) lines.push(`透视；${label("perspective", data.perspective)}，`);
  if (data.motion) lines.push(`运镜；${label("motion", data.motion)}，`);
  return lines.join("\n");
}
function upsertPromptQuickInstruction(content, quickParams, previousInstruction = "") {
  const block = /(?:^|\n)\s*【快捷镜头】[\s\S]*?【\/快捷镜头】(?=\s*(?:\n|$))/g;
  const base = String(content || "").replace(block, "\n");
  const previous = String(previousInstruction || "").trim();
  const withoutPrevious = previous ? base.replace(previous, "") : base;
  const directive = promptQuickParamInstruction(quickParams);
  const cleaned = withoutPrevious.replace(/\n{3,}/g, "\n\n").trim();
  if (!directive) return cleaned;
  const wrapped = `【快捷镜头】\n${directive}\n【/快捷镜头】`;
  return cleaned ? `${cleaned}\n\n${wrapped}` : wrapped;
}
function stripPromptQuickMarkers(content) {
  return String(content || "").replace(/(?:^|\n)\s*【快捷镜头】([\s\S]*?)【\/快捷镜头】(?=\s*(?:\n|$))/g, (_, inner) => inner.split(/\r?\n/).map(line => line.trim()).filter(Boolean).join(" "));
}
function createVideoNode(x, y) {
  return { id: uid("h3-video"), type: "generator", mediaType: "video", provider: "runninghub-h3", name: "海螺 H3 视频", x, y, videoMode: "reference", videoAspect: "16:9", videoMegapixels: 0.9, videoSeconds: 6, promptSlots: 1, inputSlots: 6, videoInputSlotsInitialized: true, localVideoReference: "", localAudioReference: "", width: 420, height: nodeHeight("video-generator", 6, 1), status: "idle", lastResultIds: [], createdAt: Date.now() };
}
function createVideoPreviewNode(x, y) {
  return { id: uid("video-preview"), type: "video-preview", name: "成片预览", x, y, width: 360, height: nodeHeight("video-preview"), localVideoSrc: "", localVideoName: "", outputType: "mp4", createdAt: Date.now() };
}
function createAnswerNode(x, y) {
  const node = { id: uid("answer"), type: "answer", name: "模型回答", x, y, width: 380, promptSlots: 1, inputSlots: 4, model: answerModelOptions[0].value, deepseekThinking: "enabled", deepseekReasoningEffort: "high", answerSkill: "none", h3Mode: "auto", h3Duration: 6, productAdH3Mode: "auto", productAdDuration: 10, brandPromoH3Mode: "auto", brandPromoDuration: 15, status: "idle", answer: "", error: "", answerExpanded: false, createdAt: Date.now() };
  node.height = answerNodeHeight(node);
  return node;
}
function createReferenceNode(x, y) {
  return { id: uid("ref"), type: "image", name: "参考图", x, y, width: 270, height: nodeHeight("image"), src: "", source: "参考图", ratio: "未上传", createdAt: Date.now() };
}
function createStarterProject(name, theme = "light", sample = false) {
  const prompt = createPromptNode(70, 90, sample ? "古代将军府厨房内，年轻女厨娘林小满端着一碗蛋浆蜜饮，三分之二侧身，神情专注，暖色烛光与清晨天光交织，中景，电影感写实画面，服装与角色参考保持一致" : "");
  const generator = createGeneratorNode(520, 100);
  const nodes = [prompt, generator];
  const edges = [{ id: uid("edge"), source: prompt.id, sourcePort: "prompt", target: generator.id, targetPort: "prompt", type: "prompt" }];
  if (sample) {
    const images = [
      { id: uid("image"), type: "image", name: "林小满 · 角色定妆", src: "/assets/lin-xiaoman.jpg", x: 80, y: 500, width: 270, height: nodeHeight("image"), source: "项目素材", ratio: "9:16", createdAt: Date.now() + 1 },
      { id: uid("image"), type: "image", name: "萧临风 · 角色定妆", src: "/assets/xiao-linfeng.jpg", x: 390, y: 500, width: 270, height: nodeHeight("image"), source: "项目素材", ratio: "9:16", createdAt: Date.now() + 2 },
      { id: uid("image"), type: "image", name: "蛋浆蜜饮 · 道具参考", src: "/assets/dish.jpg", x: 700, y: 520, width: 270, height: nodeHeight("image"), source: "项目素材", ratio: "4:3", createdAt: Date.now() + 3 }
    ];
    nodes.push(...images);
    images.forEach((imageNode, index) => edges.push({ id: uid("edge"), source: imageNode.id, sourcePort: "image", target: generator.id, targetPort: `image-${index}`, type: "image" }));
  }
  const now = Date.now();
  return { version: 2, id: uid("project"), projectName: name, theme, createdAt: now, updatedAt: now, nodes, edges, selectedIds: [], selectedEdgeId: null, viewport: { x: 180, y: 95, scale: 0.72 }, tool: "select", libraryTab: "modules", flowMode: "workflow", panelWidths: { library: 238, inspector: 286 }, recentIds: [], frameCounter: 1 };
}
function normalizeProject(project) {
  if (!project) return createStarterProject("未命名项目", globalTheme);
  if (project.version >= 2 && Array.isArray(project.edges)) {
    const normalized = { ...createStarterProject(project.projectName || "未命名项目", project.theme || globalTheme), ...project };
    normalized.nodes = Array.isArray(normalized.nodes) ? normalized.nodes : [];
    normalized.edges = Array.isArray(normalized.edges) ? normalized.edges.filter(edge => edge && typeof edge.source === "string" && typeof edge.target === "string" && typeof edge.sourcePort === "string" && typeof edge.targetPort === "string" && typeof edge.type === "string") : [];
    normalized.selectedIds = [];
    normalized.selectedEdgeId = null;
    normalized.nodes = normalized.nodes.filter(Boolean).map(node => {
      if(node.type==='speech'||node.type==='audio') return normalizeSpeechNode(node);
      if (node.type === "generator") {
        if (node.mediaType === "video" || node.provider === "runninghub-h3") {
          const connectedImageSlots = normalized.edges.filter(edge => edge.target === node.id && edge.type === "image" && /^image-\d+$/.test(edge.targetPort)).reduce((largest, edge) => Math.max(largest, Number(edge.targetPort.split("-")[1]) + 1 || 0), 0);
          return normalizeRunningHubVideo(node, connectedImageSlots);
        }
        const slots = Math.min(14, Math.max(1, Number(node.inputSlots) || 4));
        const promptSlots = Math.min(6, Math.max(1, Number(node.promptSlots) || 1));
        const provider = ["ark", "ark-plan", "moyu", "midjourney", "runninghub-krea2", "runninghub-moss"].includes(node.provider) ? node.provider : "image2";
        const image2Model = provider === "image2" ? image2ModelForNode(node) : node.image2Model;
        const supportsAdvancedImage25Quality = provider === "image2" && image25AdvancedModelIds.includes(image2Model);
        const qualityOptions = supportsAdvancedImage25Quality ? image25QualityOptions : image2QualityOptions;
        const textOnly = provider === "runninghub-krea2" || provider === "runninghub-moss";
        const generatorNormalized = { ...node, provider, image2Model, moyuModel: seedreamImageModels.some(item => item.id === node.moyuModel) ? node.moyuModel : seedreamImageModels[0].id, width: node.width || 360, promptSlots, inputSlots: provider === "runninghub-krea2" ? 0 : slots, height: Math.max(Number(node.height) || 0, nodeHeight("generator", textOnly ? 0 : slots, promptSlots)), aspect: provider === "runninghub-moss" ? mossAspect(node.aspect) : sizeMap[node.aspect] ? node.aspect : fixedGeneratorSettings.aspect, quality: qualityOptions.some(option => option.value === node.quality) ? node.quality : supportsAdvancedImage25Quality ? "auto" : fixedGeneratorSettings.quality, batch: Math.min(4, Math.max(1, Number(node.batch) || fixedGeneratorSettings.batch)), kreaWidth: krea2Dimensions(node).width, kreaHeight: krea2Dimensions(node).height, status: node.activeJobId ? "running" : "idle" };
        if (provider === "runninghub-moss") generatorNormalized.mossSelectedAspect = mossAspect(node.mossSelectedAspect || node.aspect);
        if (isArkProvider(provider)) { generatorNormalized.arkModel = generatorModelForNode(generatorNormalized); delete generatorNormalized.arkOperation; }
        generatorNormalized.outputSize = normalizeGeneratorOutputSize(generatorNormalized);
        return generatorNormalized;
      }
      if (node.type === "video-editor") {
        const clips = Array.isArray(node.clips) ? node.clips.filter(clip => clip && typeof clip.src === "string" && clip.src).slice(0, 24).map((clip, index) => {
          const start = Math.max(0, Number(clip.start) || 0); const duration = Math.max(0, Number(clip.duration) || 0); const end = Math.max(0, Number(clip.end) || duration);
          return { id: String(clip.id || `clip-${index}`), name: String(clip.name || `视频片段 ${index + 1}`), src: clip.src, start, end: end > start ? end : duration, duration, origin: clip.origin === "linked" ? "linked" : "imported" };
        }) : [];
        return { ...node, name: node.name || "视频剪辑", x: Number.isFinite(Number(node.x)) ? Number(node.x) : 0, y: Number.isFinite(Number(node.y)) ? Number(node.y) : 0, width: Math.max(440, Number(node.width) || 680), height: Math.max(300, Number(node.height) || nodeHeight("video-editor")), inputSlots: 6, clips, selectedClipId: String(node.selectedClipId || ""), timelinePlayhead: Math.max(0, Number(node.timelinePlayhead) || 0), previewPlaying: false, status: ["idle", "rendering", "ready", "error"].includes(node.status) ? node.status : "idle", outputSrc: String(node.outputSrc || ""), outputType: "mp4", lastError: String(node.lastError || "") };
      }
      if (node.type === "video-preview") return { ...node, name: node.name || "成片预览", x: Number.isFinite(Number(node.x)) ? Number(node.x) : 0, y: Number.isFinite(Number(node.y)) ? Number(node.y) : 0, width: Math.max(280, Number(node.width) || 360), height: Math.max(280, Number(node.height) || nodeHeight("video-preview")), localVideoSrc: String(node.localVideoSrc || ""), localVideoName: String(node.localVideoName || ""), outputType: ["mp4", "webm", "mov"].includes(node.outputType) ? node.outputType : "mp4" };
      if (node.type === "answer") {
        const slots = Math.min(8, Math.max(1, Number(node.inputSlots) || 4));
        const answerSkill = normalizedAnswerSkill(node.answerSkill);
        const next = { ...node, name: node.name || "模型回答", width: Math.max(320, Number(node.width) || 380), promptSlots: 1, inputSlots: slots, model: normalizedAnswerModel(node.model), deepseekThinking: normalizedDeepseekThinking(node.deepseekThinking), deepseekReasoningEffort: normalizedDeepseekReasoningEffort(node.deepseekReasoningEffort), answerSkill, h3Mode: normalizedH3AnswerMode(node.h3Mode), h3Duration: normalizedH3Duration(node.h3Duration), productAdH3Mode: normalizedH3AnswerMode(node.productAdH3Mode), productAdDuration: normalizedProductAdDuration(node.productAdDuration, 10), brandPromoH3Mode: normalizedH3AnswerMode(node.brandPromoH3Mode), brandPromoDuration: normalizedBrandPromoDuration(node.brandPromoDuration, 15), status: node.status === "running" ? "running" : "idle", answer: String(node.answer || ""), error: String(node.error || "") };
        next.height = Math.max(Number(node.height) || 0, answerNodeHeight(next));
        return next;
      }
      if (node.type === "image") return { ...node, x: Number.isFinite(Number(node.x)) ? Number(node.x) : 0, y: Number.isFinite(Number(node.y)) ? Number(node.y) : 0, width: node.width || 270, height: node.height || nodeHeight("image"), disabled: Boolean(node.disabled) };
  if (node.type === "video") return { ...node, mediaType: "video", x: Number.isFinite(Number(node.x)) ? Number(node.x) : 0, y: Number.isFinite(Number(node.y)) ? Number(node.y) : 0, width: Math.max(270, Number(node.width) || 270), height: Math.max(322, Number(node.height) || 322), outputType: node.outputType || "mp4", status: "idle" };
  if (node.type === "loading") return { ...node, mediaType: node.mediaType === "video" ? "video" : "image", x: Number.isFinite(Number(node.x)) ? Number(node.x) : 0, y: Number.isFinite(Number(node.y)) ? Number(node.y) : 0, width: Math.max(270, Number(node.width) || 270), height: Math.max(322, Number(node.height) || nodeHeight("loading")) };
      if (node.type === "prompt") { const width = node.width || 320; const height = Math.max(Number(node.height) || 0, nodeHeight("prompt")); const content = stripPromptQuickMarkers(stripPromptCompositionMarkers(node.content)); return { ...node, width, height, content, contentMarkup: sanitizePromptMarkup(node.contentMarkup, content), promptPresetId: String(node.promptPresetId || ""), promptQuickParams: normalizePromptQuickParams(node.promptQuickParams), promptQuickInstruction: String(node.promptQuickInstruction || ""), promptQuickControlsVisible: node.promptQuickControlsVisible === true, compositionInstruction: String(node.compositionInstruction || ""), composition: normalizePromptComposition(node.composition), promptLayout: normalizePromptLayout(node.promptLayout, width, height), disabled: Boolean(node.disabled) }; }
      if (node.type === "composition") return { ...node, name: node.name === "构图控制" ? "参数控制" : node.name || "参数控制", width: Math.max(300, Number(node.width) || 390), height: Math.max(320, Number(node.height) || nodeHeight("composition")), composition: normalizePromptComposition(node.composition) };
      if (node.type === "note") return { ...node, name: node.name || "便签", content: String(node.content || ""), width: Math.max(170, Number(node.width) || 260), height: Math.max(130, Number(node.height) || 190) };
      if (node.type === "frame") return { ...node, name: node.name || "工作流分组", width: node.width || 700, height: node.height || 480 };
      return node;
    });
    const panelWidths = normalized.panelWidths || {}; normalized.panelWidths = { library: Math.min(480, Math.max(190, Number(panelWidths.library) || 238)), inspector: Math.min(520, Math.max(220, Number(panelWidths.inspector) || 286)) };
    normalized.flowMode = "workflow";
    return normalized;
  }
  const migrated = createStarterProject(project.projectName || "迁移项目", project.theme || globalTheme);
  const prompt = migrated.nodes.find(node => node.type === "prompt");
  const generator = migrated.nodes.find(node => node.type === "generator");
  prompt.content = project.prompt || prompt.content;
  generator.aspect = fixedGeneratorSettings.aspect;
  generator.quality = fixedGeneratorSettings.quality;
  generator.batch = fixedGeneratorSettings.batch;
  generator.outputSize = "2K";
  generator.constraints = project.constraints || generator.constraints;
  const legacyImages = (project.nodes || []).filter(node => node.type === "image").map((node, index) => ({ ...node, id: node.id || uid("image"), type: "image", x: node.x ?? 70 + index * 300, y: node.y ?? 520, width: 270, height: nodeHeight("image"), source: node.source || "迁移素材", createdAt: node.createdAt || Date.now() + index }));
  migrated.nodes.push(...legacyImages, ...(project.nodes || []).filter(node => node.type === "frame"));
  legacyImages.slice(0, 8).forEach((imageNode, index) => migrated.edges.push({ id: uid("edge"), source: imageNode.id, sourcePort: "image", target: generator.id, targetPort: `image-${index}`, type: "image" }));
  migrated.viewport = project.viewport || migrated.viewport;
  migrated.recentIds = project.recentIds || [];
  if (Object.hasOwn(project, "scriptFlow")) migrated.scriptFlow = project.scriptFlow;
  return migrated;
}
function projectMeta(project) {
  const cover = projectPreviewSource(project);
  return { id: project.id, projectName: project.projectName, theme: project.theme || "light", createdAt: project.createdAt, updatedAt: project.updatedAt, nodeCount: project.nodes.filter(node => node.type !== "frame").length, imageCount: project.nodes.filter(node => node.type === "image").length, edgeCount: project.edges.length, cover };
}
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("image2-canvas", 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects");
      if (!db.objectStoreNames.contains("project-meta")) db.createObjectStore("project-meta");
      if (!db.objectStoreNames.contains("prompt-presets")) db.createObjectStore("prompt-presets");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function dbGet(storeName, key) {
  const db = await openDatabase();
  try { return await new Promise((resolve, reject) => { const request = db.transaction(storeName, "readonly").objectStore(storeName).get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
  finally { db.close(); }
}
async function dbGetAll(storeName) {
  const db = await openDatabase();
  try { return await new Promise((resolve, reject) => { const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll(); request.onsuccess = () => resolve(request.result || []); request.onerror = () => reject(request.error); }); }
  finally { db.close(); }
}
async function findStoredProject(id) {
  const direct = await dbGet("projects", id);
  if (direct) return direct;
  const matched = (await dbGetAll("projects")).find(project => project?.id === id);
  if (matched) await dbPutBoth(matched);
  return matched || null;
}
async function dbPutBoth(project) {
  const db = await openDatabase();
  try { await new Promise((resolve, reject) => { const transaction = db.transaction(["projects", "project-meta"], "readwrite"); transaction.objectStore("projects").put(project, project.id); transaction.objectStore("project-meta").put(projectMeta(project), project.id); transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); }); }
  finally { db.close(); }
}
async function dbDeleteProject(id) {
  const db = await openDatabase();
  try { await new Promise((resolve, reject) => { const transaction = db.transaction(["projects", "project-meta"], "readwrite"); transaction.objectStore("projects").delete(id); transaction.objectStore("project-meta").delete(id); transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); }); }
  finally { db.close(); }
}
async function dbPut(storeName, value, key) {
  const db = await openDatabase();
  try { await new Promise((resolve, reject) => { const request = db.transaction(storeName, "readwrite").objectStore(storeName).put(value, key); request.onsuccess = resolve; request.onerror = () => reject(request.error); }); }
  finally { db.close(); }
}
async function dbDelete(storeName, key) {
  const db = await openDatabase();
  try { await new Promise((resolve, reject) => { const request = db.transaction(storeName, "readwrite").objectStore(storeName).delete(key); request.onsuccess = resolve; request.onerror = () => reject(request.error); }); }
  finally { db.close(); }
}
async function loadPromptPresets() {
  const records = await dbGetAll("prompt-presets");
  promptPresets = records.filter(item => item?.id && String(item.name || "").trim() && String(item.content || "").trim()).map(item => ({ id: item.id, name: String(item.name).trim(), content: String(item.content), createdAt: Number(item.createdAt) || Date.now(), updatedAt: Number(item.updatedAt) || Number(item.createdAt) || Date.now() })).sort((a, b) => b.updatedAt - a.updatedAt);
}
async function savePromptPreset(nodeId) {
  const node = findNode(nodeId); const content = String(node?.content || "").trim();
  if (!node || node.type !== "prompt" || !content) return toast("请先在提示词节点中写入内容", true);
  const name = window.prompt("预设名称", node.promptPresetId ? promptPresets.find(item => item.id === node.promptPresetId)?.name || "" : "")?.trim();
  if (!name) return;
  const existing = promptPresets.find(item => item.name.toLowerCase() === name.toLowerCase());
  if (existing && existing.id !== node.promptPresetId && !window.confirm(`预设“${existing.name}”已存在，是否覆盖？`)) return;
  const now = Date.now(); const preset = { id: existing?.id || node.promptPresetId || uid("prompt-preset"), name, content, createdAt: existing?.createdAt || now, updatedAt: now };
  await dbPut("prompt-presets", preset, preset.id);
  promptPresets = [preset, ...promptPresets.filter(item => item.id !== preset.id)].sort((a, b) => b.updatedAt - a.updatedAt);
  node.promptPresetId = preset.id; renderCanvas(); renderInspector(); scheduleSave(); toast(`提示词预设“${name}”已保存`);
}
async function deletePromptPreset(nodeId) {
  const node = findNode(nodeId); const preset = promptPresets.find(item => item.id === node?.promptPresetId);
  if (!node || node.type !== "prompt" || !preset) return toast("请先选择要删除的预设", true);
  if (!window.confirm(`删除提示词预设“${preset.name}”？当前节点文字会保留。`)) return;
  await dbDelete("prompt-presets", preset.id);
  promptPresets = promptPresets.filter(item => item.id !== preset.id);
  node.promptPresetId = ""; renderCanvas(); renderInspector(); toast(`提示词预设“${preset.name}”已删除`);
}
async function renamePromptPreset(nodeId) {
  const node = findNode(nodeId); const preset = promptPresets.find(item => item.id === node?.promptPresetId);
  if (!node || node.type !== "prompt" || !preset) return toast("请先选择要重命名的预设", true);
  const name = window.prompt("修改预设名称", preset.name)?.trim();
  if (!name || name === preset.name) return;
  const duplicate = promptPresets.find(item => item.id !== preset.id && item.name.toLowerCase() === name.toLowerCase());
  if (duplicate) return toast(`预设“${duplicate.name}”已存在，请换一个名称`, true);
  const updated = { ...preset, name, updatedAt: Date.now() };
  await dbPut("prompt-presets", updated, updated.id);
  promptPresets = [updated, ...promptPresets.filter(item => item.id !== updated.id)].sort((a, b) => b.updatedAt - a.updatedAt);
  renderCanvas(); renderInspector(); toast(`预设已重命名为“${name}”`);
}
function applyPromptPreset(nodeId, presetId) {
  const node = findNode(nodeId); const preset = promptPresets.find(item => item.id === presetId);
  if (!node || node.type !== "prompt" || !preset) return;
  recordHistory(); node.content = preset.content; node.contentMarkup = promptMarkupFromPlainText(preset.content); node.promptPresetId = preset.id; renderCanvas(); renderInspector(); scheduleSave(); toast(`已载入提示词预设“${preset.name}”`);
}
function generatedImageFilename(source) {
  try {
    const url = new URL(String(source || ""), window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/generated/")) return "";
    const filename = decodeURIComponent(url.pathname.slice("/api/generated/".length));
    return /^job-[a-z0-9-]+-\d+\.(?:png|jpe?g|webp)$/i.test(filename) ? filename : "";
  } catch {
    return "";
  }
}
function generatedImageFilesForProject(project) {
  const files = new Set();
  (project?.nodes || []).filter(node => node?.type === "image").forEach(node => {
    [node.src, node.originalSrc, node.previewSrc, node.layerSource, ...localEditSources(node.localEdit),
      node.layerRefinement?.sourceLayer?.src,
      ...[node.layerDocument, node.layerDraft, node.layerRefinement?.candidate].flatMap(doc => doc ? [doc.originalSrc, ...allLayerSources(Array.isArray(doc.layers)?doc.layers:[]), ...allLayerSources(Array.isArray(doc.initialLayers)?doc.initialLayers:[])] : [])].forEach(source => {
      const filename = generatedImageFilename(source);
      if (filename) files.add(filename);
    });
  });
  return files;
}
async function generatedImageFilesUsedByOtherProjects(projectId) {
  const projects = await dbGetAll("projects");
  const used = new Set();
  projects.filter(project => project?.id && project.id !== projectId).forEach(project => generatedImageFilesForProject(project).forEach(file => used.add(file)));
  return used;
}
async function removeGeneratedImageFiles(filenames) {
  const unique = [...new Set((filenames || []).filter(Boolean))];
  if (!unique.length) return { deleted: 0, missing: 0 };
  return requestJson("/api/generated/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filenames: unique }) }, 60_000);
}
function assertGeneratedMediaDeletion(result, filenames, label = "生成媒体") {
  const requested = new Set((filenames || []).filter(Boolean)).size;
  const deleted = Number(result?.deleted) || 0;
  const missing = Number(result?.missing) || 0;
  if (deleted + missing < requested) throw new Error(`${label}删除未完成：服务端未确认任何文件已删除`);
  return { deleted, missing };
}
function formatStorageSize(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
async function collectAllGeneratedImageReferences() {
  // Wait for pending writes and fail closed if a save failed.
  if (state) await saveProjectNow(true);
  await projectSaveQueue;
  const projects = await dbGetAll("projects");
  return collectMediaReferences([projects, state, ...(state ? [...undoStack, ...redoStack] : []), workflowClipboard], window.location.origin);
}
async function inspectUnusedGeneratedImages(references, action = "preview", previewToken) {
  const result = await requestJson("/api/media/cleanup-unused", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ protocol: mediaCleanupProtocol, action, ...references, previewToken })
  }, 60_000).catch(error => {
    if (error.message.includes("404") || error.message.includes("405") || error.message === "不支持的请求方法") throw new Error("清理服务尚未更新，请在设置中点击「重启本机服务」后刷新页面");
    throw error;
  });
  if (result.protocol !== mediaCleanupProtocol) throw new Error("清理服务版本不匹配，请在设置中点击「重启本机服务」后刷新页面");
  return result;
}
function setGeneratedCleanupDialogState({ copy, summary = "", warning = false, canConfirm = false, busy = false }) {
  $("#generatedCleanupCopy").textContent = copy;
  const summaryElement = $("#generatedCleanupSummary");
  summaryElement.hidden = !summary;
  summaryElement.textContent = summary;
  $("#generatedCleanupWarning").hidden = !warning;
  const confirmButton = $("#confirmGeneratedCleanupButton");
  confirmButton.disabled = !canConfirm || busy;
  confirmButton.innerHTML = busy ? `${icon("loader-circle")} 正在清理…` : `${icon("trash-2")} 删除未使用图片`;
  $("#cancelGeneratedCleanupButton").disabled = busy;
  $("#closeGeneratedCleanupButton").disabled = busy;
  refreshIcons();
}
async function openGeneratedCleanupDialog() {
  generatedCleanupPreview = null;
  const dialog = $("#generatedCleanupDialog");
  setGeneratedCleanupDialogState({ copy: "正在检查全部项目画布中的图片引用…", busy: true });
  dialog.showModal();
  try {
    const references = await collectAllGeneratedImageReferences();
    const preview = await inspectUnusedGeneratedImages(references);
    generatedCleanupPreview = preview;
    const detail = `生成图片 ${preview.byDirectory.generated.unusedCount} 个；上传/图层/合成素材 ${preview.byDirectory.assets.unusedCount} 个。` + (preview.recentCount ? ` ${preview.recentCount} 个最近写入的文件暂时保留，10 分钟后可重新检查。` : "");
    if (!preview.unusedCount) {
      setGeneratedCleanupDialogState({ copy: "当前没有可清理的未使用图片。", summary: `已检查 ${preview.totalImageCount} 个图片文件。${detail}` });
      return;
    }
    setGeneratedCleanupDialogState({
      copy: "以下图片不再被当前浏览器保存的项目及编辑记录引用，可以清理以释放空间。",
      summary: `可清理 ${preview.unusedCount} 个图片文件，预计释放 ${formatStorageSize(preview.reclaimBytes)}。${detail}`,
      warning: true,
      canConfirm: true
    });
  } catch (error) {
    generatedCleanupPreview = null;
    setGeneratedCleanupDialogState({ copy: `检查失败：${error?.message || "本机服务暂时不可用"}` });
  }
}
async function confirmGeneratedCleanup() {
  if (!generatedCleanupPreview?.unusedCount) return;
  setGeneratedCleanupDialogState({ copy: "正在重新核对项目引用并删除未使用图片…", busy: true });
  try {
    const references = await collectAllGeneratedImageReferences();
    const result = await inspectUnusedGeneratedImages(references, "delete", generatedCleanupPreview.previewToken);
    generatedCleanupPreview = null;
    $("#generatedCleanupDialog").close();
    const message = result.deleted ? `已清理 ${result.deleted} 个未使用图片文件，释放 ${formatStorageSize(result.deletedBytes)}` : "没有需要清理的图片";
    toast(message + (result.skipped ? `；${result.skipped} 个文件因引用或内容变化已保留` : "") + (result.failed ? `；${result.failed} 个文件删除失败，请稍后重新检查` : ""), !!result.failed);
  } catch (error) {
    setGeneratedCleanupDialogState({ copy: `清理失败：${error?.message || "未知错误"}` });
    toast(`本地图片清理失败：${error?.message || "未知错误"}`, true);
  }
}
function cleanProjectForSave() {
  if (!state) return null;
  const stableNodes = state.nodes.filter(node => node.type !== "loading").map(node => node.type === "generator" ? { ...node, status: node.activeJobId ? "running" : "idle" } : node);
  const ids = new Set(stableNodes.map(node => node.id));
  return { ...state, nodes: stableNodes, edges: state.edges.filter(edge => ids.has(edge.source) && ids.has(edge.target)), selectedIds: [], selectedEdgeId: null, updatedAt: Date.now() };
}
function snapshot() { return structuredClone(cleanProjectForSave()); }
function recordHistory(before = snapshot()) { undoStack.push(before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; updateHistoryButtons(); }
function restoreSnapshot(next) { state = normalizeProject(structuredClone(next)); applyTheme(state.theme); renderWorkspace(); scheduleSave(); speechController.resume(); state.nodes.filter(node=>node.layerJobId).forEach(node=>void pollLayerJob(node.id,node.layerJobId,state.id)); }
function undo() { if (!undoStack.length || isGenerating) return; redoStack.push(snapshot()); restoreSnapshot(undoStack.pop()); updateHistoryButtons(); }
function redo() { if (!redoStack.length || isGenerating) return; undoStack.push(snapshot()); restoreSnapshot(redoStack.pop()); updateHistoryButtons(); }
function updateHistoryButtons() { $("#undoButton").disabled = !undoStack.length || isGenerating; $("#redoButton").disabled = !redoStack.length || isGenerating; }
function editableHistoryEligible(target) {
  return Boolean(state && target instanceof Element && target.matches("input, textarea, select, [contenteditable=true]") && !target.matches('input[type="file"]') && !target.closest("#settingsDialog, #newProjectDialog, #localEditDialog"));
}
function beginEditableHistory(target) {
  if (!editableHistoryEligible(target) || editableHistorySessions.has(target)) return;
  editableHistorySessions.set(target, { before: snapshot(), changed: false, timer: null });
}
function commitEditableHistory(target) {
  const session = editableHistorySessions.get(target); if (!session) return;
  if (session.timer) clearTimeout(session.timer);
  editableHistorySessions.delete(target);
  if (!session.changed || JSON.stringify(session.before) === JSON.stringify(snapshot())) return;
  recordHistory(session.before);
}
function scheduleEditableHistory(target) {
  beginEditableHistory(target); const session = editableHistorySessions.get(target); if (!session) return;
  session.changed = true; if (session.timer) clearTimeout(session.timer);
  session.timer = setTimeout(() => commitEditableHistory(target), 700);
}
function discardEditableHistory(target) {
  const session = editableHistorySessions.get(target); if (session?.timer) clearTimeout(session.timer);
  editableHistorySessions.delete(target);
}
async function saveProjectNow(reportError = false) {
  if (!state) return;
  clearTimeout(saveTimer); saveTimer = null;
  const cleaned = cleanProjectForSave(); const projectId = cleaned.id; const revision = saveRevision;
  state.updatedAt = cleaned.updatedAt;
  const write = projectSaveQueue.catch(() => undefined).then(() => dbPutBoth(cleaned));
  projectSaveQueue = write;
  try {
    await write;
    const index = projectMetas.findIndex(meta => meta.id === projectId); const meta = projectMeta(cleaned);
    if (index >= 0) projectMetas[index] = meta; else projectMetas.push(meta);
    if (state?.id === projectId && revision === saveRevision) { $("#saveState").innerHTML = `${icon("cloud-check")} 已保存`; refreshIcons(); }
  } catch(error) {
    if (state?.id === projectId && revision === saveRevision) { $("#saveState").innerHTML = `${icon("cloud-off")} 保存失败`; refreshIcons(); }
    if(reportError)throw new Error("项目保存失败，请保留当前窗口并重试："+error.message);
  }
}
function scheduleSave() { if (!state) return; rememberActiveProject(); saveRevision += 1; clearTimeout(saveTimer); $("#saveState").innerHTML = `${icon("cloud-upload")} 保存中`; refreshIcons(); saveTimer = setTimeout(() => { void saveProjectNow(); }, 500); }
async function loadProjectMetas() {
  const [projects, storedMetas] = await Promise.all([dbGetAll("projects"), dbGetAll("project-meta")]);
  const projectsById = new Map(projects.filter(Boolean).map(project => [project.id, project]));
  projectMetas = storedMetas.filter(meta => meta?.id).map(meta => {
    const project = projectsById.get(meta.id);
    const cover = meta.cover || (project ? projectPreviewSource(project) : "");
    return cover === meta.cover ? meta : { ...meta, cover };
  });
  const missingMetaProjects = projects.filter(project => project?.id && !projectMetas.some(meta => meta.id === project.id));
  missingMetaProjects.forEach(project => projectMetas.push(projectMeta(project)));
  const backfillProjects = projects.filter(project => project?.id && projectPreviewSource(project) && !projectMetas.find(meta => meta.id === project.id)?.cover);
  if (!projectMetas.length) {
    const legacy = await dbGet("projects", "current");
    const first = legacy ? normalizeProject(legacy) : createStarterProject("烘焙厨娘 · 角色与场景", "light", true);
    await dbPutBoth(first); projectMetas = [projectMeta(first)];
  } else if (backfillProjects.length) {
    await Promise.all(backfillProjects.map(project => dbPutBoth(project)));
    projectMetas = projectMetas.map(meta => {
      const project = projectsById.get(meta.id);
      if (!project) return meta;
      const cover = meta.cover || projectPreviewSource(project);
      return cover === meta.cover ? meta : { ...meta, cover };
    });
  }
  projectMetas.sort((a, b) => b.updatedAt - a.updatedAt);
}
function applyTheme(theme) { const value = themeLabels[theme] ? theme : "light"; document.documentElement.dataset.theme = value; $$("[data-theme-value]").forEach(button => button.classList.toggle("is-active", button.dataset.themeValue === value)); }
function setTheme(theme) {
  if (!themeLabels[theme]) return;
  if (state) state.theme = theme; else { globalTheme = theme; localStorage.setItem("image2-canvas-theme", theme); }
  applyTheme(theme);
  if (state) { normalizePromptThemeTextColors(); scheduleSave(); }
}
function normalizePromptThemeTextColors() {
  if (!state) return;
  state.nodes.filter(node => node.type === "prompt").forEach(node => {
    const markup = sanitizePromptMarkup(node.contentMarkup, node.content);
    if (markup !== node.contentMarkup) node.contentMarkup = markup;
  });
  $$('[data-prompt-content] span[style]').forEach(span => {
    if (!isPromptThemeDefaultColor(span.style.color)) return;
    span.style.removeProperty("color");
    if (!span.getAttribute("style")) span.removeAttribute("style");
  });
}
function formatDate(timestamp) { return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp)); }
function formatGenerationDuration(durationMs) {
  const milliseconds = Number(durationMs);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "";
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}分${String(seconds).padStart(2, "0")}秒` : `${seconds}秒`;
}
function runningHubGenerationStageLabel(stage) {
  if (stage === "上传参考图") return "正在上传参考图";
  if (stage === "提交工作流") return "正在提交工作流";
  if (stage === "查询任务") return "RunningHub 正在生成";
  return "正在准备任务";
}
function videoResultProfileLabel(node) {
  if (!node) return "";
  const width = Number(node.videoWidth) || 0;
  const height = Number(node.videoHeight) || 0;
  return width && height ? `${node.videoAspect || "视频"} · ${width} × ${height}` : String(node.videoAspect || "");
}
function generatedVideoFilename(source) {
  try {
    const url = new URL(String(source || ""), window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/generated/")) return "";
    const filename = decodeURIComponent(url.pathname.slice("/api/generated/".length));
    return /^job-[a-z0-9-]+-\d+\.(?:mp4|webm|mov|gif)$/i.test(filename) ? filename : "";
  } catch {
    return "";
  }
}
function refreshGenerationElapsedClock() {
  const elements = $$('[data-generation-elapsed]');
  if (!elements.length) {
    if (generationElapsedClock) { clearInterval(generationElapsedClock); generationElapsedClock = null; }
    return;
  }
  elements.forEach(element => {
    const elapsed = formatGenerationDuration(Date.now() - Number(element.dataset.generationElapsed || 0)) || "0秒";
    element.textContent = `已等待 ${elapsed}`;
  });
}
function syncGenerationElapsedClock() {
  refreshGenerationElapsedClock();
  if (!generationElapsedClock && $$('[data-generation-elapsed]').length) generationElapsedClock = setInterval(refreshGenerationElapsedClock, 1000);
}
function renderHome() {
  $("#homeView").hidden = false;
  $("#workspaceView").hidden = true;
  applyTheme(globalTheme);
  const query = projectSearch.trim().toLowerCase();
  const visible = projectMetas.filter(meta => String(meta.projectName || "未命名项目").toLowerCase().includes(query));
  $("#projectCount").textContent = `${visible.length} 个项目`;
  $("#projectGrid").innerHTML = visible.length ? visible.map(meta => `
    <article class="project-card" data-project-id="${meta.id}">
      <button class="project-cover" type="button" data-open-project="${meta.id}" aria-label="打开 ${escapeHtml(meta.projectName)}">
        ${meta.cover ? `<img src="${escapeHtml(meta.cover)}" alt="" loading="lazy" decoding="async">` : `<span class="project-cover-flow"><span></span><span></span><span></span></span>`}
      </button>
      <div class="project-card-body"><div class="project-card-title-row"><h2 class="project-card-title">${escapeHtml(meta.projectName)}</h2><button class="icon-button" type="button" data-rename-project="${meta.id}" aria-label="编辑项目名称" data-tooltip="编辑名称">${icon("pencil")}</button></div>
        <div class="project-meta"><span>${meta.nodeCount} 个模块 · ${meta.edgeCount} 条连接</span><span>${formatDate(meta.updatedAt)}</span></div>
        <div class="project-card-actions"><span class="theme-badge">${themeLabels[meta.theme] || themeLabels.light}</span><div class="card-menu-actions">
          <button class="icon-button" type="button" data-duplicate-project="${meta.id}" aria-label="复制项目" data-tooltip="复制"><i data-lucide="copy"></i></button>
          <button class="icon-button danger-action" type="button" data-delete-project="${meta.id}" aria-label="删除项目" data-tooltip="删除"><i data-lucide="trash-2"></i></button>
        </div></div>
      </div>
    </article>`).join("") : `<div class="empty-projects">${icon("folder-kanban")}<h2>${query ? "没有匹配项目" : "还没有项目"}</h2><p>${query ? "尝试其他名称" : "创建一个节点工作区开始创作"}</p></div>`;
  bindHomeCards(); refreshIcons();
}
function bindHomeCards() {
  const grid = $("#projectGrid");
  grid.onclick = event => {
    const renameButton = event.target.closest("[data-rename-project]");
    if (renameButton) { event.stopPropagation(); return void renameProject(renameButton.dataset.renameProject); }
    const duplicateButton = event.target.closest("[data-duplicate-project]");
    if (duplicateButton) return duplicateProject(duplicateButton.dataset.duplicateProject);
    const deleteButton = event.target.closest("[data-delete-project]");
    if (deleteButton) return deleteProject(deleteButton.dataset.deleteProject);
    const card = event.target.closest("[data-project-id]");
    if (card) openProject(card.dataset.projectId);
  };
}
async function renameProject(id) {
  const project = await dbGet("projects", id);
  if (!project) return toast("项目不存在", true);
  const current = String(project.projectName || "未命名项目");
  const next = window.prompt("项目名称", current)?.trim();
  if (!next || next === current) return;
  project.projectName = next;
  project.updatedAt = Date.now();
  await dbPutBoth(project);
  projectMetas = projectMetas.map(meta => meta.id === id ? projectMeta(project) : meta);
  renderHome();
  toast("项目名称已更新");
}
async function openProject(id) {
  if (!id || projectOpeningId) return;
  projectOpeningId = id;
  const card = document.querySelector(`[data-project-id="${CSS.escape(id)}"]`);
  card?.setAttribute("aria-busy", "true");
  try {
    const project = await findStoredProject(id);
    if (!project) throw new Error("项目索引存在，但项目内容已缺失");
    const nextState = normalizeProject(project);
    if (!nextState?.id || !Array.isArray(nextState.nodes) || !Array.isArray(nextState.edges)) throw new Error("项目数据格式异常");
    restoreWorkspaceSession(nextState, readActiveProjectSession());
    clearWorkflowInteractionState(); state = nextState; selectedEdgeId = null; undoStack = []; redoStack = [];
    setSidebarCollapsed("library", true); setSidebarCollapsed("inspector", true);
    rememberActiveProject();
    $("#homeView").hidden = true; $("#workspaceView").hidden = false;
    applyTheme(state.theme); renderWorkspace();
    checkApiStatus();
    resumeGenerationJobs();
  } catch (error) {
    console.error("打开项目失败", error);
    if (readActiveProjectSession()?.projectId === id) clearActiveProjectSession();
    state = null;
    $("#homeView").hidden = false; $("#workspaceView").hidden = true;
    toast(`打开项目失败：${error?.message || "未知错误"}`, true);
  } finally {
    projectOpeningId = null;
    card?.removeAttribute("aria-busy");
  }
}
async function goHome() { stopAllGenerationPolling(); clearWorkflowInteractionState(); if (state) await saveProjectNow(); state = null; selectedEdgeId = null; clearActiveProjectSession(); await loadProjectMetas(); renderHome(); }
async function createProject(name, theme) {
  const project = createStarterProject(name, theme); await dbPutBoth(project); projectMetas.unshift(projectMeta(project));
  newProjectDialog.close(); $("#newProjectForm").reset(); await openProject(project.id); requestAnimationFrame(fitContent);
}
async function duplicateProject(id) {
  const original = await dbGet("projects", id); if (!original) return toast("原项目不存在", true);
  const copy = structuredClone(original); copy.id = uid("project"); copy.projectName = `${original.projectName} · 副本`; copy.createdAt = Date.now(); copy.updatedAt = Date.now(); copy.selectedIds = [];
  await dbPutBoth(copy); projectMetas.unshift(projectMeta(copy)); renderHome(); toast("项目副本已创建");
}
async function deleteProject(id) {
  const meta = projectMetas.find(item => item.id === id);
  if (!meta) return;
  const project = await dbGet("projects", id);
  const projectFiles = generatedImageFilesForProject(project);
  const sharedFiles = await generatedImageFilesUsedByOtherProjects(id);
  const removableFiles = [...projectFiles].filter(file => !sharedFiles.has(file));
  const cleanupNote = removableFiles.length ? `\n同时清理 ${removableFiles.length} 张仅属于该项目的本地生成图片。` : "";
  if (!window.confirm(`删除项目“${meta.projectName}”？此操作无法撤销。${cleanupNote}`)) return;
  await dbDeleteProject(id); projectMetas = projectMetas.filter(item => item.id !== id); if (readActiveProjectSession()?.projectId === id) clearActiveProjectSession(); renderHome();
  try {
    const cleanup = await removeGeneratedImageFiles(removableFiles);
    const sharedNote = projectFiles.size > removableFiles.length ? "；共享图片已保留" : "";
    toast(`项目已删除${cleanup.deleted ? `，已清理 ${cleanup.deleted} 张本地生成图片` : ""}${sharedNote}`);
  } catch (error) {
    toast(`项目已删除，但本地图片清理失败：${error.message || "未知错误"}`, true);
  }
}
function renderWorkspace() {
  if (!state) return;
  $("#projectName").textContent = state.projectName;
  $$(".library-tabs .tab").forEach(tab => tab.classList.toggle("is-active", tab.dataset.libraryTab === state.libraryTab));
  renderCanvas(); renderLibrary(); renderInspector(); setActiveTool(state.tool || "select"); applyPanelWidths(); updateViewport(); syncVideoGeneratorPortPositions(); renderEdges(); updateHistoryButtons(); refreshIcons();
}
function findNode(id) { return state?.nodes.find(node => node.id === id); }
function selectedNode() { return state?.selectedIds?.length === 1 ? findNode(state.selectedIds[0]) : null; }
function incomingEdge(nodeId, portId) { return state.edges.find(edge => edge.target === nodeId && edge.targetPort === portId); }
function outgoingEdges(nodeId, portId) { return state.edges.filter(edge => edge.source === nodeId && edge.sourcePort === portId); }
function sourceLabelForEdge(edge) { const node = findNode(edge?.source); return node ? `${node.disabled ? "已禁用 · " : ""}${node.name || "未命名"}` : "未连接"; }
function connectionChoicesForDraft(draft) {
  const source = findNode(draft?.nodeId);
  if (!source) return [];
  const generatorChoice = { kind: "generator", title: "新建生图节点", subtitle: "默认 Image2，可切换 Seedream", icon: "sparkles" };
  const videoChoice = { kind: "video", title: "新建视频节点", subtitle: "海螺 H3 · RunningHub", icon: "clapperboard" };
  const videoPreviewChoice = { kind: "video-preview", title: "新建成片预览节点", subtitle: "上传、预览并输出本地视频", icon: "monitor-play" };
  const answerChoice = { kind: "answer", title: "新建模型回答节点", subtitle: "自动连接并用于文本回答", icon: "message-square-text" };
  const speechChoice={kind:'speech',title:'新建声音克隆节点',subtitle:'RunningHub · 音色与情感参考',icon:'mic'};
  if ((source.type === 'speech' || source.standaloneClone) && draft.direction === 'output' && draft.portId.startsWith('clone-result-')) return [videoChoice];
  if(source.type==='speech'&&draft.direction==='input') return [{kind:'prompt',title:'新建提示词节点',subtitle:draft.portId==='direction'?'旧表达要求':'需要朗读的正文',icon:'text-cursor-input'}];
  const compositionChoice = { kind: "composition", title: "新建参数控制节点", subtitle: "自动写入已连接的提示词", icon: "sliders-horizontal" };
  if (source.type === "prompt" && draft.direction === "output" && draft.dataType === "prompt") return [generatorChoice, videoChoice, answerChoice, speechChoice];
  if (source.type === "prompt" && draft.direction === "input" && draft.dataType === "composition") return [compositionChoice];
  if (source.type === "composition" && draft.direction === "output" && draft.dataType === "composition") return [{ kind: "prompt", title: "新建提示词节点", subtitle: "自动接收构图指令", icon: "text-cursor-input" }];
  if ((source.type === "image" || source.type === "loading") && draft.direction === "output" && draft.dataType === "image") return [generatorChoice, videoChoice, answerChoice];
  if ((source.type === "video" || source.type === "video-editor" || source.type === "video-preview") && draft.direction === "output" && draft.dataType === "video") return source.type === "video-editor" ? [videoPreviewChoice] : source.type === "video-preview" ? [videoChoice] : [videoChoice, videoPreviewChoice];
  if (source.type === "generator" && source.mediaType === "video" && draft.direction === "input" && draft.dataType === "video") return [videoPreviewChoice];
  if ((source.type === "generator" || source.type === "answer") && draft.direction === "input" && draft.dataType === "prompt") return [{ kind: "prompt", title: "新建提示词节点", subtitle: "自动连接到此提示词输入", icon: "text-cursor-input" }];
  if ((source.type === "generator" || source.type === "answer") && draft.direction === "input" && draft.dataType === "image") return [{ kind: "reference", title: "新建参考图节点", subtitle: "连接到参考图输入，随后手动上传", icon: "image-plus" }];
  return [];
}
function existingImageChoicesForDraft(draft) {
  if (!state || draft?.dataType !== "image" || draft.direction !== "input") return [];
  return state.nodes
    .filter(node => node.id !== draft.nodeId && node.type === "image" && node.mediaType !== "video" && Boolean(imageSourceFromNode(node)))
    .map(node => {
      const source = imageSourceFromNode(node);
      const preview = node.type === "image" ? nodeCanvasSource(node) : source;
      return { kind: "existing-image", sourceId: node.id, title: node.name || "未命名图片", subtitle: `${node.source || "画布图片"}${node.ratio ? ` · ${node.ratio}` : ""}`, imageSrc: preview || source };
    });
}
function connectExistingImageForDraft(draft, sourceId) {
  const source = findNode(sourceId);
  if (!source || !imageSourceFromNode(source)) return toast("该图片已不可用，请重新选择", true);
  recordHistory();
  connectPorts({ nodeId: source.id, portId: "image", dataType: "image", direction: "output" }, draft, false);
  renderCanvas(); renderInspector(); scheduleSave();
}
function createNodeForDraft(draft, kind, clientX, clientY) {
  if (!draft || !state) return;
  recordHistory();
  let node = null;
  if(kind==='speech') node=createSpeechNode(uid('speech'),screenToScene(clientX,clientY).x-200,screenToScene(clientX,clientY).y-100);
  if (kind === "generator") node = createGeneratorNode(Math.round(screenToScene(clientX, clientY).x - 180), Math.round(screenToScene(clientX, clientY).y - 180));
  if (kind === "video") node = createVideoNode(Math.round(screenToScene(clientX, clientY).x - 195), Math.round(screenToScene(clientX, clientY).y - 235));
  if (kind === "video-preview") node = createVideoPreviewNode(Math.round(screenToScene(clientX, clientY).x - 180), Math.round(screenToScene(clientX, clientY).y - 160));
  if (kind === "answer") node = createAnswerNode(Math.round(screenToScene(clientX, clientY).x - 190), Math.round(screenToScene(clientX, clientY).y - 185));
  if (kind === "prompt") node = createPromptNode(Math.round(screenToScene(clientX, clientY).x - 160), Math.round(screenToScene(clientX, clientY).y - 145), "");
  if (kind === "composition") node = createCompositionNode(Math.round(screenToScene(clientX, clientY).x - 175), Math.round(screenToScene(clientX, clientY).y - 145));
  if (kind === "reference") node = createReferenceNode(Math.round(screenToScene(clientX, clientY).x - 135), Math.round(screenToScene(clientX, clientY).y - 160));
  if (!node) return;
  state.nodes.push(node); state.selectedIds = [node.id]; selectedEdgeId = null;
  if (draft.direction === "output") {
    const targetPort = kind==='speech'?'text':kind === "video" ? (draft.dataType === "audio" ? "audio-reference-1" : draft.dataType === "video" ? "video-reference" : draft.dataType === "prompt" ? "prompt" : "image-0") : (kind === "generator" || kind === "answer") ? (draft.dataType === "prompt" ? "prompt" : "image-0") : kind === "video-preview" && draft.dataType === "video" ? "video" : kind === "prompt" && draft.dataType === "composition" ? "composition" : null;
    if (targetPort) connectPorts(draft, { nodeId: node.id, portId: targetPort, dataType: draft.dataType, direction: "input" }, false);
  } else {
    const outputPort = kind === "speech" ? "audio" : kind === "prompt" ? "prompt" : kind === "composition" ? "composition" : kind === "video-preview" ? "video-output" : kind === "video" ? "video" : "image";
    connectPorts({ nodeId: node.id, portId: outputPort, dataType: draft.dataType, direction: "output" }, draft, false);
  }
  renderCanvas(); renderInspector(); scheduleSave();

}
function closeConnectionMenu() {
  if (connectionMenu) connectionMenu.remove();
  connectionMenu = null; connectionMenuDraft = null;
  connectionMenuDragSession = null;
  connectionMenuResizeSession = null;
  window.removeEventListener("pointermove", moveConnectionMenu);
  window.removeEventListener("pointerup", finishConnectionMenuDrag);
  window.removeEventListener("pointercancel", finishConnectionMenuDrag);
  window.removeEventListener("pointermove", moveConnectionMenuResize);
  window.removeEventListener("pointerup", finishConnectionMenuResize);
  window.removeEventListener("pointercancel", finishConnectionMenuResize);
  window.removeEventListener("pointerdown", handleConnectionMenuOutside);
}
function handleConnectionMenuOutside(event) { if (connectionMenu && !connectionMenu.contains(event.target)) closeConnectionMenu(); }
function startConnectionMenuDrag(event) {
  if (!connectionMenu || event.button !== 0 || event.target.closest("button, input, select, textarea")) return;
  const rect = connectionMenu.getBoundingClientRect();
  connectionMenuDragSession = { startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top };
  event.preventDefault(); event.stopPropagation();
  window.addEventListener("pointermove", moveConnectionMenu);
  window.addEventListener("pointerup", finishConnectionMenuDrag);
  window.addEventListener("pointercancel", finishConnectionMenuDrag);
}
function moveConnectionMenu(event) {
  if (!connectionMenu || !connectionMenuDragSession) return;
  const margin = 12; const rect = connectionMenu.getBoundingClientRect();
  const left = Math.min(window.innerWidth - rect.width - margin, Math.max(margin, connectionMenuDragSession.left + event.clientX - connectionMenuDragSession.startX));
  const top = Math.min(window.innerHeight - rect.height - margin, Math.max(margin, connectionMenuDragSession.top + event.clientY - connectionMenuDragSession.startY));
  connectionMenu.style.left = `${left}px`; connectionMenu.style.top = `${top}px`;
}
function finishConnectionMenuDrag() {
  connectionMenuDragSession = null;
  window.removeEventListener("pointermove", moveConnectionMenu);
  window.removeEventListener("pointerup", finishConnectionMenuDrag);
  window.removeEventListener("pointercancel", finishConnectionMenuDrag);
}
function startConnectionMenuResize(event) {
  if (!connectionMenu || event.button !== 0) return;
  const rect = connectionMenu.getBoundingClientRect();
  connectionMenuResizeSession = { startX: event.clientX, startY: event.clientY, width: rect.width, height: rect.height };
  event.preventDefault(); event.stopPropagation();
  window.addEventListener("pointermove", moveConnectionMenuResize);
  window.addEventListener("pointerup", finishConnectionMenuResize);
  window.addEventListener("pointercancel", finishConnectionMenuResize);
}
function moveConnectionMenuResize(event) {
  if (!connectionMenu || !connectionMenuResizeSession) return;
  const minWidth = 220; const minHeight = 148; const maxWidth = Math.max(minWidth, window.innerWidth - 24); const maxHeight = Math.max(minHeight, window.innerHeight - 24);
  const width = Math.min(maxWidth, Math.max(minWidth, connectionMenuResizeSession.width + event.clientX - connectionMenuResizeSession.startX));
  const height = Math.min(maxHeight, Math.max(minHeight, connectionMenuResizeSession.height + event.clientY - connectionMenuResizeSession.startY));
  connectionMenu.style.width = `${Math.round(width)}px`; connectionMenu.style.height = `${Math.round(height)}px`;
}
function finishConnectionMenuResize() {
  connectionMenuResizeSession = null;
  window.removeEventListener("pointermove", moveConnectionMenuResize);
  window.removeEventListener("pointerup", finishConnectionMenuResize);
  window.removeEventListener("pointercancel", finishConnectionMenuResize);
}
function positionConnectionMenu(menu, clientX, clientY) {
  const margin = 12; const rect = menu.getBoundingClientRect();
  const left = Math.min(window.innerWidth - rect.width - margin, Math.max(margin, clientX + 10));
  const top = Math.min(window.innerHeight - rect.height - margin, Math.max(margin, clientY + 10));
  menu.style.left = `${left}px`; menu.style.top = `${top}px`;
}
function closeCanvasContextMenu() {
  if (canvasContextMenu) canvasContextMenu.remove();
  canvasContextMenu = null;
  window.removeEventListener("pointerdown", handleCanvasContextMenuOutside);
}
function handleCanvasContextMenuOutside(event) { if (canvasContextMenu && !canvasContextMenu.contains(event.target)) closeCanvasContextMenu(); }
function createCanvasElementAt(kind, clientX, clientY) {
  const point = screenToScene(clientX, clientY); let node;
  if(kind==='speech') node=createSpeechNode(uid('speech'),point.x-200,point.y-100);
  if (kind === "prompt") node = createPromptNode(Math.round(point.x - 160), Math.round(point.y - 145));
  if (kind === "composition") node = createCompositionNode(Math.round(point.x - 175), Math.round(point.y - 145));
  if (kind === "reference") node = createReferenceNode(Math.round(point.x - 135), Math.round(point.y - 160));
  if (kind === "generator") node = createGeneratorNode(Math.round(point.x - 180), Math.round(point.y - 180));
  if (kind === "video") node = createVideoNode(Math.round(point.x - 195), Math.round(point.y - 235));
  if (kind === "video-preview") node = createVideoPreviewNode(Math.round(point.x - 180), Math.round(point.y - 160));
  if (kind === "answer") node = createAnswerNode(Math.round(point.x - 190), Math.round(point.y - 185));
  if (kind === "note") node = createNote(Math.round(point.x - 130), Math.round(point.y - 95));
  if (kind === "frame") node = { id: uid("frame"), type: "frame", name: `工作流分组 ${state.frameCounter++}`, x: Math.round(point.x - 260), y: Math.round(point.y - 170), width: 520, height: 340, createdAt: Date.now() };
  if (!node) return;
  recordHistory(); state.nodes.push(node); state.selectedIds = [node.id]; selectedEdgeId = null; renderWorkspace(); scheduleSave();
}
function showCanvasContextMenu(event) {
  if (!state || event.target.closest(".canvas-status, .mobile-panel-button, input, textarea, [contenteditable=true]")) return;
  event.preventDefault(); closeConnectionMenu(); closeCanvasContextMenu();
  const choices = [
    { kind: "prompt", title: "提示词", icon: "text-cursor-input" },
    { kind: "composition", title: "参数控制", icon: "sliders-horizontal" },
    { kind: "reference", title: "参考图", icon: "image-plus" },
    { kind: "generator", title: "生图", icon: "sparkles" },
    { kind: "video", title: "视频", icon: "clapperboard" },
    { kind: "video-preview", title: "成片预览", icon: "monitor-play" },
    { kind: "answer", title: "模型回答", icon: "message-square-text" },
    {kind:'speech',title:'声音克隆 · IndexTTS2',icon:'mic'},
    { kind: "note", title: "便签", icon: "sticky-note" },
    { kind: "frame", title: "分组画板", icon: "frame" }
  ];
  const menu = document.createElement("div"); menu.className = "canvas-context-menu";
  menu.innerHTML = `<div class="canvas-context-title">在此处创建</div><div class="canvas-context-options"></div>`;
  const list = menu.querySelector(".canvas-context-options");
  choices.forEach(choice => { const button = document.createElement("button"); button.type = "button"; button.className = "canvas-context-option"; button.innerHTML = `<span>${icon(choice.icon)}</span><strong>${escapeHtml(choice.title)}</strong>`; button.addEventListener("click", action => { action.stopPropagation(); closeCanvasContextMenu(); createCanvasElementAt(choice.kind, event.clientX, event.clientY); }); list.append(button); });
  document.body.append(menu); canvasContextMenu = menu; positionConnectionMenu(menu, event.clientX, event.clientY); refreshIcons();
  setTimeout(() => window.addEventListener("pointerdown", handleCanvasContextMenuOutside), 0);
}
function showConnectionMenu(clientX, clientY, draft) {
  closeConnectionMenu();
  const choices = connectionChoicesForDraft(draft);
  const imageChoices = existingImageChoicesForDraft(draft);
  if (!choices.length) return toast("这个端口不能在空白处创建节点", true);
  const menu = document.createElement("div");
  menu.className = `connection-menu ${draft.dataType}`;
  menu.innerHTML = `<div class="connection-menu-title"><span>创建并连接</span><small>${imageChoices.length ? "选择新建模块或画布图片" : choices.length === 1 ? escapeHtml(choices[0].subtitle) : "选择要连接的模块"}</small></div><div class="connection-option-list"></div>${imageChoices.length ? `<div class="connection-menu-section-title"><span>画布已有图片</span><small>${imageChoices.length} 张</small></div><div class="connection-image-list"></div>` : ""}`;
  const list = menu.querySelector(".connection-option-list");
  choices.forEach(choice => {
    const button = document.createElement("button");
    button.className = "connection-option"; button.type = "button";
    button.innerHTML = `<span class="connection-option-icon">${icon(choice.icon)}</span><span class="connection-option-copy"><strong>${escapeHtml(choice.title)}</strong><small>${escapeHtml(choice.subtitle)}</small></span>`;
    button.addEventListener("click", event => { event.stopPropagation(); closeConnectionMenu(); createNodeForDraft(draft, choice.kind, clientX, clientY); });
    list.appendChild(button);
  });
  const imageList = menu.querySelector(".connection-image-list");
  imageChoices.forEach(choice => {
    const button = document.createElement("button");
    button.className = "connection-option connection-image-option"; button.type = "button"; button.setAttribute("aria-label", choice.title); button.title = choice.title;
    button.innerHTML = `<span class="connection-image-thumb"><img src="${escapeHtml(choice.imageSrc)}" alt="" loading="lazy" decoding="async"></span>`;
    button.addEventListener("click", event => { event.stopPropagation(); closeConnectionMenu(); connectExistingImageForDraft(draft, choice.sourceId); });
    imageList.appendChild(button);
  });
  document.body.appendChild(menu); connectionMenu = menu; connectionMenuDraft = draft;
  menu.querySelector(".connection-menu-title")?.addEventListener("pointerdown", startConnectionMenuDrag);
  const resizeHandle = document.createElement("span"); resizeHandle.className = "connection-menu-resize"; resizeHandle.setAttribute("aria-hidden", "true"); resizeHandle.addEventListener("pointerdown", startConnectionMenuResize); menu.appendChild(resizeHandle);
  positionConnectionMenu(menu, clientX, clientY); refreshIcons();
  setTimeout(() => window.addEventListener("pointerdown", handleConnectionMenuOutside), 0);
}
function workflowPanelWidths() {
  if (!state) return { library: 238, inspector: 286 };
  state.panelWidths ||= { library: 238, inspector: 286 };
  state.panelWidths.library = Math.min(480, Math.max(190, Number(state.panelWidths.library) || 238));
  state.panelWidths.inspector = Math.min(520, Math.max(220, Number(state.panelWidths.inspector) || 286));
  return state.panelWidths;
}
function applyPanelWidths() {
  const shell = $("#workspaceView"); if (!shell || !state) return;
  const widths = workflowPanelWidths();
  shell.style.setProperty("--library-width", `${widths.library}px`);
  shell.style.setProperty("--inspector-width", `${widths.inspector}px`);
  shell.style.setProperty("--library-layout-width", shell.classList.contains("is-library-collapsed") ? "0px" : `${widths.library}px`);
  shell.style.setProperty("--inspector-layout-width", shell.classList.contains("is-inspector-collapsed") ? "0px" : `${widths.inspector}px`);
}
function sidebarIsCompact() { return window.matchMedia?.("(max-width: 920px)").matches === true; }
function setSidebarCollapsed(side, collapsed) {
  const shell = $("#workspaceView"); if (!shell) return;
  const className = side === "library" ? "is-library-collapsed" : "is-inspector-collapsed";
  shell.classList.toggle(className, Boolean(collapsed));
  const panel = side === "library" ? $("#libraryPanel") : $("#inspectorPanel");
  const toggle = side === "library" ? $("#toggleLibraryButton") : $("#toggleInspectorButton");
  const show = side === "library" ? $("#showLibraryButton") : $("#showInspectorButton");
  const label = side === "library" ? "左侧栏" : "右侧栏";
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", `${collapsed ? "显示" : "收起"}${label}`);
    toggle.dataset.tooltip = `${collapsed ? "显示" : "收起"}${label}`;
    toggle.innerHTML = icon(collapsed ? (side === "library" ? "panel-left-open" : "panel-right-open") : (side === "library" ? "panel-left-close" : "panel-right-close"));
  }
  if (show) show.hidden = !collapsed;
  if (panel && sidebarIsCompact()) panel.classList.toggle("is-open", !collapsed);
  applyPanelWidths();
  refreshIcons();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!state) return;
    syncVideoGeneratorPortPositions(); renderEdges();
  }));
}
function toggleSidebar(side) {
  const shell = $("#workspaceView"); if (!shell) return;
  if (sidebarIsCompact()) {
    const className = side === "library" ? "is-library-collapsed" : "is-inspector-collapsed";
    if (shell.classList.contains(className)) setSidebarCollapsed(side, false);
    else setSidebarCollapsed(side, true);
    return;
  }
  setSidebarCollapsed(side, !shell.classList.contains(side === "library" ? "is-library-collapsed" : "is-inspector-collapsed"));
}
function startPanelResize(event, side) {
  if (!state || event.button !== 0) return;
  event.preventDefault(); event.stopPropagation();
  const widths = workflowPanelWidths();
  panelResizeSession = { side, startX: event.clientX, startWidth: widths[side] };
  document.body.classList.add("is-resizing-panel");
}
function handlePanelResize(event) {
  if (!panelResizeSession) return false;
  const session = panelResizeSession; const widths = workflowPanelWidths(); const other = session.side === "library" ? widths.inspector : widths.library;
  const delta = event.clientX - session.startX; const proposed = session.side === "library" ? session.startWidth + delta : session.startWidth - delta;
  const max = Math.max(session.side === "library" ? 190 : 220, Math.min(session.side === "library" ? 480 : 520, $("#workspaceView").getBoundingClientRect().width - other - 420));
  widths[session.side] = Math.round(Math.min(max, Math.max(session.side === "library" ? 190 : 220, proposed)));
  applyPanelWidths(); return true;
}
function finishPanelResize() {
  if (!panelResizeSession) return false;
  panelResizeSession = null; document.body.classList.remove("is-resizing-panel"); scheduleSave(); return true;
}function copyWorkflowSelection() {
  const nodes = state.selectedIds.map(findNode).filter(node => node && node.type !== "loading");
  if (!nodes.length) return toast("请选择节点后再复制", true);
  const ids = new Set(nodes.map(node => node.id));
  workflowClipboard = { nodes: structuredClone(nodes), edges: structuredClone(state.edges.filter(edge => ids.has(edge.source) && ids.has(edge.target))) };
  workflowPasteSerial = 0;
  toast(`已复制 ${nodes.length} 个节点`);
}
function pasteWorkflowSelection() {
  if (!workflowClipboard?.nodes?.length) return toast("请先复制节点", true);
  recordHistory(); const offset = 36 + workflowPasteSerial * 18; const idMap = new Map();
  const copies = workflowClipboard.nodes.map((node, index) => {
    const copy = structuredClone(node); const nextId = uid(node.type); idMap.set(node.id, nextId);
    copy.id = nextId; copy.x = Math.round((copy.x || 0) + offset); copy.y = Math.round((copy.y || 0) + offset); copy.createdAt = Date.now() + index;
    if (copy.type === "generator") { copy.status = "idle"; delete copy.activeJobId; delete copy.activePrompt; copy.lastResultIds = []; }
    if (copy.type === "answer") copy.status = "idle";
    return copy;
  });
  state.nodes.push(...copies);
  workflowClipboard.edges.forEach(edge => state.edges.push({ ...edge, id: uid("edge"), source: idMap.get(edge.source), target: idMap.get(edge.target) }));
  state.selectedIds = copies.map(node => node.id); selectedEdgeId = null; workflowPasteSerial += 1;
  renderWorkspace(); scheduleSave(); toast(`已粘贴 ${copies.length} 个节点`);
}

   function formatClipTime(value) { const seconds = Math.max(0, Number(value) || 0); const minutes = Math.floor(seconds / 60); return `${String(minutes).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}.${String(Math.round((seconds % 1) * 100)).padStart(2, "0")}`; }
function videoTimelineEntries(node) {
  const clips = videoEditorClips(node); let cursor = 0;
  const entries = clips.map((clip, index) => {
    const start = Math.max(0, Number(clip.start) || 0); const end = Number(clip.end) > start ? Number(clip.end) : Number(clip.duration) || start;
    const duration = Math.max(0.1, end - start); const entry = { clip, index, timelineStart: cursor, timelineEnd: cursor + duration, duration, sourceStart: start, sourceEnd: end };
    cursor += duration; return entry;
  });
  return { entries, total: Math.max(0.1, cursor) };
}
function videoTimelinePoint(node, clientX, track) {
  const { total } = videoTimelineEntries(node); const rect = track.getBoundingClientRect();
  const ratio = rect.width ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0;
  return Math.round(ratio * total * 100) / 100;
}
function videoTimelineEntryAt(node, time, preferredClipId = "") {
  const { entries, total } = videoTimelineEntries(node); if (!entries.length) return null;
  const playhead = Math.max(0, Math.min(total, Number(time) || 0));
  const preferred = entries.find(item => item.clip.id === preferredClipId);
  if (preferred && playhead >= preferred.timelineStart - .001 && playhead <= preferred.timelineEnd + .001) return preferred;
  return entries.find((item, index) => playhead >= item.timelineStart && (playhead < item.timelineEnd - .001 || index === entries.length - 1)) || entries[entries.length - 1];
}
function videoPreviewFrame(node) {
  const edge = incomingEdge(node?.id, "video"); const editor = findNode(edge?.source); if (!editor || editor.type !== "video-editor") return null;
  const timeline = videoTimelineEntries(editor); const playhead = Math.max(0, Math.min(timeline.total, Number(editor.timelinePlayhead) || 0)); const entry = videoTimelineEntryAt(editor, playhead, editor.selectedClipId);
  if (!entry) return null;
  return { editor, entry, source: entry.clip.src, currentTime: Math.max(0, Math.min(entry.sourceEnd, entry.sourceStart + playhead - entry.timelineStart)), playhead };
}
function updateTimelinePlayheadDom(editor, syncPreview = true) {
  if (!editor) return;
  const timeline = videoTimelineEntries(editor); const percent = timeline.total ? Math.max(0, Math.min(100, (Number(editor.timelinePlayhead) || 0) / timeline.total * 100)) : 0;
  document.querySelectorAll(`[data-video-playhead="${editor.id}"]`).forEach(handle => { handle.style.left = `${percent}%`; });
  document.querySelectorAll(`[data-editor-node="${editor.id}"][data-video-clip]`).forEach(card => card.classList.toggle("is-active", card.dataset.videoClip === editor.selectedClipId));
  if (syncPreview) syncVideoPreviewPlayback(editor.id);
}
function videoPreviewElements(editorId) {
  return state.nodes.filter(node => node.type === "video-preview" && incomingEdge(node.id, "video")?.source === editorId).map(node => document.querySelector(`[data-preview-composite="${node.id}"]`)).filter(Boolean);
}
function captureVideoPreviewFrame(video) {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return "";
  try {
    const maxSize = 960; const ratio = Math.min(1, maxSize / Math.max(video.videoWidth, video.videoHeight)); const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * ratio)); canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height); return canvas.toDataURL("image/jpeg", .78);
  } catch { return ""; }
}
function holdVideoPreviewFrame(editorId) {
  videoPreviewElements(editorId).forEach(video => { const frame = captureVideoPreviewFrame(video); if (frame) { video.poster = frame; video.dataset.previewHold = "1"; } });
}
function revealVideoPreviewFrame(video) {
  if (!video || video.dataset.previewHold !== "1" || video.readyState < 2) return;
  video.poster = ""; delete video.dataset.previewHold;
}
function updateVideoPlayButtonDom(editor) {
  document.querySelectorAll(`[data-video-play="${editor.id}"]`).forEach(button => { button.innerHTML = `${icon(editor.previewPlaying ? "pause" : "play")} ${editor.previewPlaying ? "暂停预览" : "播放预览"}`; button.setAttribute("aria-label", editor.previewPlaying ? "暂停预览" : "播放预览"); });
  refreshIcons();
}
function stopVideoEditorPreview(editor) {
  if (!editor) return;
  editor.previewPlaying = false;
  videoPreviewElements(editor.id).forEach(video => { video.pause(); video.dataset.previewAutoplay = "0"; });
  updateVideoPlayButtonDom(editor);
}
function finishVideoEditorPlayback(editor) {
  if (!editor) return;
  const timeline = videoTimelineEntries(editor); const last = timeline.entries[timeline.entries.length - 1];
  stopVideoEditorPreview(editor);
  if (last) { editor.timelinePlayhead = timeline.total; editor.selectedClipId = last.clip.id; }
  videoPreviewElements(editor.id).forEach(video => {
    video.pause(); video.dataset.previewAutoplay = "0";
    if (last && Number.isFinite(video.duration)) video.currentTime = Math.min(last.sourceEnd, video.duration);
  });
  updateTimelinePlayheadDom(editor, false); renderInspector();
}
function toggleVideoEditorPlayback(editorId) {
  const editor = findNode(editorId); if (!editor || editor.type !== "video-editor") return;
  const videos = videoPreviewElements(editor.id); if (!videos.length) return toast("请先把视频剪辑节点连接到成片预览节点", true);
  if (editor.previewPlaying) return stopVideoEditorPreview(editor);
  const timeline = videoTimelineEntries(editor); if ((Number(editor.timelinePlayhead) || 0) >= timeline.total - .01 && timeline.entries.length) { editor.timelinePlayhead = 0; editor.selectedClipId = timeline.entries[0].clip.id; updateTimelinePlayheadDom(editor, false); }
  editor.previewPlaying = true; updateVideoPlayButtonDom(editor); syncVideoPreviewPlayback(editor.id, true);
}
function syncVideoPreviewPlayback(editorId, autoplay = false) {
  const editor = findNode(editorId); if (!editor) return;
  state.nodes.filter(node => node.type === "video-preview" && incomingEdge(node.id, "video")?.source === editorId).forEach(node => {
    const video = document.querySelector(`[data-preview-composite="${node.id}"]`); const frame = videoPreviewFrame(node); if (!video || !frame) return;
    const sourceUrl = new URL(frame.source, window.location.href).href;
    const currentSource = video.dataset.previewSource || video.currentSrc || video.src;
    const sourceChanged = currentSource !== sourceUrl;
    video.dataset.previewClipId = frame.entry.clip.id; video.dataset.previewEditor = editorId;
    video.dataset.previewSource = sourceUrl;
    if (sourceChanged) {
      const heldFrame = captureVideoPreviewFrame(video) || video.poster;
      if (heldFrame) { video.poster = heldFrame; video.dataset.previewHold = "1"; }
      video.pause(); video.dataset.previewSource = sourceUrl; video.dataset.previewAutoplay = autoplay ? "1" : "0"; video.src = sourceUrl; video.load();
      if (autoplay) video.addEventListener("loadedmetadata", () => { const currentFrame = videoPreviewFrame(node); if (!currentFrame || video.dataset.previewSource !== sourceUrl) return; video.currentTime = currentFrame.currentTime; if (editor.previewPlaying && video.dataset.previewAutoplay === "1") void video.play().catch(() => {}); }, { once: true });
    }
    else if (Number.isFinite(frame.currentTime) && Math.abs(video.currentTime - frame.currentTime) > .2) video.currentTime = frame.currentTime;
    if (!sourceChanged && autoplay) { video.dataset.previewAutoplay = "1"; void video.play().catch(() => { if (editor.previewPlaying) { editor.previewPlaying = false; updateVideoPlayButtonDom(editor); toast("预览视频暂时无法播放", true); } }); }
    if (!sourceChanged && Number.isFinite(frame.currentTime) && Math.abs(video.currentTime - frame.currentTime) <= .2) revealVideoPreviewFrame(video);
  });
}
function setVideoTimelinePlayhead(nodeId, time, clipId = "") {
  const node = findNode(nodeId); if (!node || node.type !== "video-editor") return;
  stopVideoEditorPreview(node); holdVideoPreviewFrame(node.id);
  const { total } = videoTimelineEntries(node); node.timelinePlayhead = Math.max(0, Math.min(total, Number(time) || 0)); node.selectedClipId = clipId || node.selectedClipId || "";
  updateTimelinePlayheadDom(node); renderInspector();
}
function splitVideoClipAtPlayhead(nodeId) {
  const editor = findNode(nodeId); if (!editor || editor.type !== "video-editor") return;
  stopVideoEditorPreview(editor);
  const { entries, total } = videoTimelineEntries(editor); const playhead = Math.max(0, Math.min(total, Number(editor.timelinePlayhead) || 0)); const entry = entries.find(item => playhead > item.timelineStart + .01 && playhead < item.timelineEnd - .01);
  if (!entry) return toast("请把播放指针放在视频片段中间再分割", true);
  const sourceTime = entry.sourceStart + (playhead - entry.timelineStart); const originalEnd = entry.sourceEnd;
  if (sourceTime <= entry.sourceStart + .01 || sourceTime >= originalEnd - .01) return toast("当前位置不能分割", true);
  recordHistory(); const first = entry.clip; first.end = Math.round(sourceTime * 100) / 100;
  const second = { ...first, id: uid("clip"), start: first.end, end: originalEnd, name: `${first.name} · 后半段` };
  editor.clips.splice(entry.index + 1, 0, second); editor.selectedClipId = second.id; resetVideoEditorOutput(editor); renderWorkspace(); scheduleSave(); toast("已在播放指针处切开视频");
}
function reorderVideoClip(nodeId, clipId, targetClipId, before = true) {
  const editor = findNode(nodeId); if (!editor || editor.type !== "video-editor" || clipId === targetClipId) return;
  const from = editor.clips.findIndex(clip => clip.id === clipId); let target = editor.clips.findIndex(clip => clip.id === targetClipId); if (from < 0 || target < 0) return;
  recordHistory(); const [clip] = editor.clips.splice(from, 1); if (from < target) target -= 1; editor.clips.splice(Math.max(0, target + (before ? 0 : 1)), 0, clip); editor.selectedClipId = clipId; resetVideoEditorOutput(editor); renderWorkspace(); scheduleSave();
}
function resetVideoEditorOutput(editor) { editor.status = "idle"; editor.outputSrc = ""; editor.lastError = ""; editor.previewPlaying = false; videoPreviewElements(editor.id).forEach(video => video.pause()); }
function openVideoClipContextMenu(event, nodeId, clipId) {
  event.preventDefault(); event.stopPropagation(); closeConnectionMenu(); closeCanvasContextMenu();
  const menu = document.createElement("div"); menu.className = "canvas-context-menu video-clip-context-menu";
  menu.innerHTML = `<div class="canvas-context-title">视频片段</div><div class="canvas-context-options"><button class="canvas-context-option" type="button" data-video-clip-split>${icon("scissors")}<strong>在播放指针处分割</strong></button><button class="canvas-context-option danger-action" type="button" data-video-clip-delete>${icon("trash-2")}<strong>删除此片段</strong></button></div>`;
  menu.querySelector("[data-video-clip-split]").addEventListener("click", () => { closeCanvasContextMenu(); splitVideoClipAtPlayhead(nodeId); });
  menu.querySelector("[data-video-clip-delete]").addEventListener("click", () => { closeCanvasContextMenu(); removeVideoClip(nodeId, clipId); });
  document.body.append(menu); canvasContextMenu = menu; positionConnectionMenu(menu, event.clientX, event.clientY); refreshIcons(); setTimeout(() => window.addEventListener("pointerdown", handleCanvasContextMenuOutside), 0);
}
function videoEditorConnectedClips(node) {
  const edges = state.edges.filter(edge => edge.target === node.id && edge.type === "video" && /^video-\d+$/.test(edge.targetPort));
  return edges.map((edge, index) => {
    const source = findNode(edge.source); const src = source?.originalSrc || source?.src || "";
    return { id: `edge-${edge.id}`, name: source?.name || `连接视频 ${index + 1}`, src, start: 0, end: Number(source?.duration) || 0, duration: Number(source?.duration) || 0, origin: "linked" };
  }).filter(clip => clip.src);
}
function syncVideoEditorClips(node) {
  if (!node || node.type !== "video-editor") return [];
  const linked = videoEditorConnectedClips(node); const byId = new Map((node.clips || []).map(clip => [clip.id, clip]));
  const linkedById = new Map(linked.map(clip => [clip.id, clip]));
  const existing = (node.clips || []).filter(clip => clip.origin !== "linked" || linkedById.has(clip.id)).map(clip => {
    if (clip.origin !== "linked") return clip;
    const incoming = linkedById.get(clip.id) || {}; const duration = Number(incoming.duration) || Number(clip.duration) || 0;
    return { ...clip, ...incoming, duration, start: Number(clip.start) || 0, end: Number(clip.end) || Number(incoming.end) || duration };
  });
  const known = new Set(existing.map(clip => clip.id));
  node.clips = [...existing, ...linked.filter(clip => !known.has(clip.id)).map(clip => ({ ...clip, ...(byId.get(clip.id) || {}) }))];
  return node.clips;
}
function syncAllVideoEditorClips() { state?.nodes.filter(node => node.type === "video-editor").forEach(syncVideoEditorClips); }
function videoEditorClips(node) { return (node?.clips || []).filter(clip => clip?.src); }
function videoPreviewSource(node, seen = new Set()) {
  if (!node || seen.has(node.id)) return "";
  seen.add(node.id);
  const edge = incomingEdge(node.id, "video");
  if (edge) return videoSourceFromNode(findNode(edge.source), seen);
  return String(node.localVideoSrc || "");
}
function portPoint(node, portId) {
  if (!node) return { x: 0, y: 0 };
  if (node.type === 'speech' && portId.startsWith('clone-result-')) {
    const button = nodeLayer.querySelector('.clone-reference-output [data-node-id="'+CSS.escape(node.id)+'"][data-port-id="'+CSS.escape(portId)+'"]');
    if (button) {
      const rect = button.getBoundingClientRect(), history = button.closest('.clone-history').getBoundingClientRect(), body = button.closest('.speech-body').getBoundingClientRect();
      const y = Math.min(body.bottom, Math.max(body.top, Math.min(history.bottom, Math.max(history.top, rect.top + rect.height / 2))));
      return screenToScene(rect.right - 10 * state.viewport.scale, y);
    }
    return { x: node.x + node.width, y: node.y + 72 };
  }
  if(node.type==='speech') return {x:node.x+(portId==='audio'?node.width:0),y:node.y+(portId==='text'?110:portId==='direction'?235:72)};
  if(node.type==='audio') return {x:node.x+(node.standaloneClone && portId.startsWith('clone-result-') ? node.width : 0),y:node.y+72};
  if (node.type === "prompt") return portId === "composition" ? { x: node.x, y: node.y + 104 } : { x: node.x + node.width, y: node.y + 72 };
  if (node.type === "composition") return { x: node.x + node.width, y: node.y + 72 };
  if (node.type === "image" || node.type === "loading" || node.type === "video") return portId === "result" ? { x: node.x, y: node.y + 70 } : { x: node.x + node.width, y: node.y + 70 };
  if (node.type === "video-editor") {
    if (portId === "video") return { x: node.x + node.width, y: node.y + 70 };
    const index = Number(portId.split("-")[1]) || 0; return { x: node.x, y: node.y + 104 + index * 28 };
  }
  if (node.type === "video-preview") return portId === "video-output" ? { x: node.x + node.width, y: node.y + 70 } : { x: node.x, y: node.y + 70 };
  if (node.type === "generator") {
    if (portId === "image" || portId === "video") return { x: node.x + node.width, y: node.y + 76 };
    if (node.mediaType === "video") {
      const portElement = nodeLayer.querySelector(`[data-node-id="${CSS.escape(node.id)}"] [data-port-id="${CSS.escape(portId)}"]`);
      if (portElement) {
        const bounds = portElement.getBoundingClientRect();
        return screenToScene(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      }
      if (portId === "prompt" || /^prompt-\d+$/.test(portId)) { const index = portId === "prompt" ? 0 : Number(portId.split("-")[1]) || 0; return { x: node.x, y: node.y + videoGeneratorPromptPortTop(index) }; }
      if (/^image-\d+$/.test(portId)) return { x: node.x, y: node.y + videoGeneratorImagePortTop(node, Number(portId.split("-")[1]) || 0) };
      if (portId === "video-reference") return { x: node.x, y: node.y + videoGeneratorVideoPortTop(node) };
    }
    if (portId === "prompt" || /^prompt-\d+$/.test(portId)) { const index = portId === "prompt" ? 0 : Number(portId.split("-")[1]) || 0; return { x: node.x, y: node.y + generatorPromptPortTop(index) }; }
    const index = Number(portId.split("-")[1]) || 0;
    return { x: node.x, y: node.y + generatorImagePortTop(node, index) };
  }
  if (node.type === "answer") {
    if (portId === "prompt" || /^prompt-\d+$/.test(portId)) {
      const index = portId === "prompt" ? 0 : Number(portId.split("-")[1]) || 0;
      return { x: node.x, y: node.y + answerPromptPortTop(index) };
    }
    const index = Number(portId.split("-")[1]) || 0;
    return { x: node.x, y: node.y + answerImagePortTop(node, index) };
  }
  return { x: node.x, y: node.y + 40 };
}
function edgePath(start, end) { const distance = Math.max(70, Math.abs(end.x - start.x) * 0.48); return `M ${start.x} ${start.y} C ${start.x + distance} ${start.y}, ${end.x - distance} ${end.y}, ${end.x} ${end.y}`; }
function renderEdges() {
  if (!state || !edgeLayer) return;
  const specs = state.edges.flatMap(edge => {
    const source = findNode(edge.source); const target = findNode(edge.target); if (!source || !target) return [];
    if (target.type === "generator" && target.provider === "runninghub-moss" && edge.type === "image" && /^image-\d+$/.test(edge.targetPort)) return [];
    const start = portPoint(source, edge.sourcePort); const end = portPoint(target, edge.targetPort);
    return [{ id: edge.id, d: edgePath(start, end), className: `workflow-edge ${edge.type}${selectedEdgeId === edge.id ? " is-selected" : ""}` }];
  });
  const existing = new Map([...edgeLayer.querySelectorAll("[data-edge-group]")].map(group => [group.dataset.edgeGroup, group]));
  specs.forEach(spec => {
    let group = existing.get(spec.id);
    if (!group) {
      group = document.createElementNS("http://www.w3.org/2000/svg", "g"); group.dataset.edgeGroup = spec.id;
      const visual = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "path"); hit.dataset.edgeId = spec.id;
      hit.addEventListener("pointerdown", event => { event.stopPropagation(); selectedEdgeId = hit.dataset.edgeId; state.selectedIds = []; renderEdges(); renderCanvasSelection(); renderInspector(); });
      hit.addEventListener("dblclick", event => { event.preventDefault(); event.stopPropagation(); selectedEdgeId = hit.dataset.edgeId; state.selectedIds = []; deleteSelection(); toast("已删除连接"); });
      group.append(visual, hit); edgeLayer.append(group);
    }
    existing.delete(spec.id);
    const [visual, hit] = group.children;
    visual.setAttribute("class", spec.className); visual.setAttribute("d", spec.d);
    hit.setAttribute("class", "edge-hit"); hit.setAttribute("d", spec.d);
  });
  existing.forEach(group => group.remove());
  let draft = edgeLayer.querySelector("[data-edge-draft]");
  if (connectionDraft) {
    const node = findNode(connectionDraft.nodeId); const anchor = portPoint(node, connectionDraft.portId);
    const start = connectionDraft.direction === "output" ? anchor : connectionDraft.current;
    const end = connectionDraft.direction === "output" ? connectionDraft.current : anchor;
    if (!draft) { draft = document.createElementNS("http://www.w3.org/2000/svg", "path"); draft.dataset.edgeDraft = "true"; edgeLayer.append(draft); }
    draft.setAttribute("class", `workflow-edge ${connectionDraft.dataType}`); draft.setAttribute("d", edgePath(start, end));
  } else draft?.remove();
}
function canvasNodeElement(id) { const selector = `[data-node-id="${CSS.escape(id)}"]`; return frameLayer.querySelector(selector) || nodeLayer.querySelector(selector); }
function updateAnswerNodeDom(node) {
  const element = canvasNodeElement(node.id);
  if (!element) return false;
  const runButton = element.querySelector(`[data-run-answer="${CSS.escape(node.id)}"]`);
  const modelSelect = element.querySelector(`[data-answer-model="${CSS.escape(node.id)}"]`);
  const response = element.querySelector(`[data-answer-selectable="${CSS.escape(node.id)}"]`);
  if (!runButton || !response) return false;
  const { answerText, runLabel } = answerNodeText(node);
  if (modelSelect && Array.from(modelSelect.options).some(option => option.value === node.model)) modelSelect.value = node.model;
  runButton.disabled = node.status === "running";
  runButton.innerHTML = `${icon(node.status === "running" ? "loader-circle" : "send-horizontal")} ${escapeHtml(runLabel)}`;
  response.textContent = answerText;
  response.classList.toggle("is-error", Boolean(node.error));
  response.classList.toggle("is-ready", Boolean(!node.error && node.answer));
  return true;
}
function updateAnswerModelDom(node) {
  const element = canvasNodeElement(node.id);
  if (!element) return false;
  const inputs = element.querySelector(".answer-inputs");
  if (!inputs) return false;
  const template = document.createElement("template");
  template.innerHTML = renderAnswerNodeHtml(node, "", "");
  const nextSettings = template.content.querySelector(".answer-deepseek-settings");
  const currentSettings = element.querySelector(".answer-deepseek-settings");
  currentSettings?.remove();
  if (nextSettings) { inputs.after(nextSettings); bindAnswerDeepseekControls(nextSettings); }
  element.style.height = `${node.height}px`;
  updateAnswerNodeDom(node);
  renderEdges();
  return true;
}
function bindAnswerDeepseekControls(root) {
  root.querySelectorAll('[data-answer-deepseek-thinking]').forEach(control => control.addEventListener("change", event => {
    event.stopPropagation(); const node = findNode(control.dataset.answerDeepseekThinking); if (!node || node.type !== "answer") return;
    recordHistory(); node.deepseekThinking = normalizedDeepseekThinking(event.target.value);
    const effort = root.querySelector(`[data-answer-deepseek-effort="${CSS.escape(node.id)}"]`);
    if (effort) effort.disabled = node.deepseekThinking === "disabled";
    renderInspector(); scheduleSave();
  }));
  root.querySelectorAll('[data-answer-deepseek-effort]').forEach(control => control.addEventListener("change", event => {
    event.stopPropagation(); const node = findNode(control.dataset.answerDeepseekEffort); if (!node || node.type !== "answer") return;
    recordHistory(); node.deepseekReasoningEffort = normalizedDeepseekReasoningEffort(event.target.value); renderInspector(); scheduleSave();
  }));
}
function renderCanvas() {
  syncAllVideoEditorClips();
  const frames = state.nodes.filter(node => node.type === "frame").sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const nodes = state.nodes.filter(node => node.type !== "frame").sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  frameLayer.innerHTML = frames.map(renderNodeHtml).join(""); nodeLayer.innerHTML = nodes.map(renderNodeHtml).join(""); syncVideoGeneratorPortPositions(); renderEdges(); bindNodeEvents(); syncGenerationElapsedClock();
}
function frameContainedNodes(frame) {
  return state.nodes.filter(item => item.type !== "frame" && item.id !== frame.id && item.x + item.width / 2 >= frame.x && item.x + item.width / 2 <= frame.x + frame.width && item.y + item.height / 2 >= frame.y && item.y + item.height / 2 <= frame.y + frame.height);
}
function updateFrameMetaDom(frame) {
  const element = canvasNodeElement(frame.id);
  const meta = element?.querySelector(".frame-meta");
  if (meta) meta.textContent = `${frameContainedNodes(frame).length} 个节点 · 拖动画板可整体移动`;
}
function resizeHandleHtml(node) {
  const southWest = node.type === "frame" ? `<span class="node-resize-handle node-resize-handle-sw node-interactive" data-node-resize="${node.id}" data-node-resize-corner="sw" aria-label="向左下调整画板大小"></span>` : "";
  return `${southWest}<span class="node-resize-handle node-interactive" data-node-resize="${node.id}" data-node-resize-corner="se" aria-label="调整节点大小"></span>`;
}
function renderNodeHtml(node) {
  const selected = state.selectedIds.includes(node.id) ? " is-selected" : "";
  const style = `left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px`;
  if (node.type === "frame") {
    const count = frameContainedNodes(node).length;
    return `<div class="canvas-node frame-node${selected}" data-node-id="${node.id}" style="${style}"><div class="frame-body"><span class="frame-title">${escapeHtml(node.name)}</span><span class="frame-meta">${count} 个节点 · 拖动画板可整体移动</span>${resizeHandleHtml(node)}</div></div>`;
  }
  if(node.type==='speech'||node.type==='audio') return speechController.render(node,selected,style);
  if (node.type === "prompt") return renderPromptNodeHtml(node, selected, style);
    if (node.type === "composition") return renderCompositionNodeHtml(node, selected, style);
  if (node.type === "note") return renderNoteHtml(node, selected, style);
  if (node.type === "video") return renderVideoNodeHtml(node, selected, style);
  if (node.type === "video-editor") return renderVideoEditorNodeHtml(node, selected, style);
  if (node.type === "video-preview") return renderVideoPreviewNodeHtml(node, selected, style);
  if (node.type === "generator") return renderGeneratorNodeHtml(node, selected, style);
  if (node.type === "answer") return renderAnswerNodeHtml(node, selected, style);
  return renderImageNodeHtml(node, selected, style);
}
function nodeHeaderHtml(node, iconName, actions = "", showMenu = true, dragHandle = false) {
  const menu = showMenu ? `<button class="icon-button node-menu node-interactive" type="button" data-node-menu="${node.id}" aria-label="打开节点属性">${icon("ellipsis")}</button>` : "";
  return `<header class="node-header${dragHandle ? " node-drag-handle" : ""}"${dragHandle ? ` data-node-drag-handle="${node.id}" data-node-id="${node.id}"` : ""}><div class="node-header-title"><span class="node-type-icon">${icon(iconName)}</span><strong data-node-title="${node.id}" title="双击编辑名称">${escapeHtml(node.name)}</strong></div><div class="node-header-actions">${actions}<button class="icon-button node-rename node-interactive" type="button" data-node-rename="${node.id}" aria-label="编辑名称" data-tooltip="编辑名称">${icon("pencil")}</button>${menu}</div></header>`;
}
function startNodeTitleEdit(nodeId) {
  const node = findNode(nodeId);
  const element = canvasNodeElement(nodeId);
  const title = element?.querySelector("[data-node-title]");
  if (!node || !title || title.dataset.editing) return;
  title.dataset.editing = "1";
  const input = document.createElement("input");
  input.className = "node-title-input node-interactive";
  input.value = node.name;
  input.maxLength = 80;
  input.setAttribute("aria-label", "编辑模块名称");
  title.replaceWith(input);
  input.focus();
  input.select();
  const commit = () => {
    if (!input.isConnected) return;
    const value = input.value.trim();
    if (value && value !== node.name) { recordHistory(); node.name = value; renderCanvas(); renderLibrary(); renderInspector(); scheduleSave(); }
    else renderCanvas();
  };
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", event => { event.stopPropagation(); if (event.key === "Enter") input.blur(); if (event.key === "Escape") { input.value = node.name; input.blur(); } });
  input.addEventListener("pointerdown", event => event.stopPropagation());
}
function portHtml(node, portId, dataType, direction, label, top) {
  const connected = direction === "input" && incomingEdge(node.id, portId);
  return `<span class="node-port-wrap ${direction}${connected ? " is-connected" : ""}" style="top:${top}px"><button class="node-port ${dataType}" type="button" data-node-id="${node.id}" data-port-id="${portId}" data-data-type="${dataType}" data-direction="${direction}" aria-label="${escapeHtml(label)}"></button></span>`;
}
function compositionChoiceButtons(node, field, labels, current) {
  return Object.entries(labels).map(entry => '<button class="composition-camera-option node-interactive' + (entry[0] === current ? ' is-active' : '') + '" type="button" data-composition-field="' + field + '" data-composition-value="' + entry[0] + '" data-composition-node="' + node.id + '">' + entry[1] + '</button>').join("");
}
function compositionExpressionHtml(node, composition) {
  const group = (title, field, labels, extraClass = "") => '<div class="composition-expression-group ' + extraClass + '"><label>' + title + '</label><div>' + compositionChoiceButtons(node, field, labels, composition[field]) + '</div></div>';
  return '<section class="composition-expression-controls" aria-label="表现控制"><div class="composition-expression-heading"><strong>画面表现</strong><span>自动写入已连接提示词</span></div>' + group("视觉风格", "visualStyle", compositionVisualStyleLabels, "is-style") + '<div class="composition-expression-grid">' + group("色温", "temperature", compositionTemperatureLabels) + group("主色倾向", "palette", compositionPaletteLabels, "is-palette") + group("饱和度", "saturation", compositionSaturationLabels) + group("明暗", "tone", compositionToneLabels) + group("反差", "contrast", compositionContrastLabels) + group("质感", "texture", compositionTextureLabels, "is-texture") + '</div></section>';
}
function compositionControlsHtml(node) {
  const composition = normalizePromptComposition(node.composition);
  const isExpression = composition.panel === "expression";
  const tabs = '<div class="composition-tabs" role="tablist"><button class="composition-tab node-interactive' + (!isExpression ? ' is-active' : '') + '" type="button" data-composition-panel="parameters" data-composition-node="' + node.id + '">参数</button><button class="composition-tab node-interactive' + (isExpression ? ' is-active' : '') + '" type="button" data-composition-panel="expression" data-composition-node="' + node.id + '">表现</button></div>';
  if (isExpression) return '<section class="prompt-composition composition-controls" aria-label="表现控制"><div class="prompt-composition-heading"><strong>表现</strong><span>自动写入已连接提示词</span></div>' + tabs + compositionExpressionHtml(node, composition) + '</section>';
  const endpoints = promptHorizonEndpoints(composition);
  const perspectives = ["left-near", "parallel", "right-near"].map(value => '<button class="composition-perspective node-interactive' + (composition.perspective === value ? ' is-active' : '') + '" type="button" data-composition-perspective="' + value + '" data-composition-node="' + node.id + '" aria-label="' + compositionPerspectiveLabels[value] + '" data-tooltip="' + compositionPerspectiveLabels[value] + '"><span class="composition-perspective-art ' + value + '" aria-hidden="true"></span><span>' + compositionPerspectiveLabels[value] + '</span></button>').join("");
  const depth = compositionChoiceButtons(node, "depth", compositionDepthLabels, composition.depth);
  const focalLength = compositionChoiceButtons(node, "focalLength", compositionFocalLengthLabels, composition.focalLength);
  const cameraHeight = compositionChoiceButtons(node, "cameraHeight", compositionCameraHeightLabels, composition.cameraHeight);
  const cameraDirection = compositionChoiceButtons(node, "cameraDirection", compositionCameraDirectionLabels, composition.cameraDirection);
  const cameraAngle = compositionChoiceButtons(node, "cameraAngle", compositionCameraAngleLabels, composition.cameraAngle);
  const shotSize = compositionChoiceButtons(node, "shotSize", compositionShotSizeLabels, composition.shotSize);
  return '<section class="prompt-composition composition-controls" aria-label="参数控制"><div class="prompt-composition-heading"><strong>参数</strong><span>自动写入已连接提示词</span></div>' + tabs + '<div class="composition-control-layout"><div class="composition-setting composition-horizon-setting"><label><span>地平线</span><span class="composition-summary">' + (composition.horizonPending ? "待确认" : composition.horizonEnabled === false ? "提示词未启用" : horizonPositionLabel(composition.horizon) + ' · ' + horizonTiltLabel(composition.tilt)) + '</span></label><div class="horizon-canvas node-interactive" data-horizon-canvas="' + node.id + '" aria-label="单击取消地平线提示词，拖动后点击确认写入"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line class="horizon-guide" x1="5" x2="95" y1="50" y2="50"></line><line class="horizon-visual-line" data-horizon-visual-line x1="8" x2="92" y1="' + endpoints.left + '" y2="' + endpoints.right + '"></line><line class="horizon-hit-line" data-horizon-drag="middle" x1="8" x2="92" y1="' + endpoints.left + '" y2="' + endpoints.right + '"></line></svg><span class="horizon-handle" data-horizon-drag="left" style="top:' + endpoints.left + '%" aria-hidden="true"></span><span class="horizon-handle" data-horizon-drag="right" style="top:' + endpoints.right + '%" aria-hidden="true"></span></div><button class="horizon-confirm-button node-interactive" type="button" data-confirm-horizon="' + node.id + '"' + (composition.horizonPending ? "" : " disabled") + '>确认地平线</button></div><div class="composition-setting composition-perspective-setting"><label>透视</label><div class="composition-perspectives">' + perspectives + '</div></div></div><section class="composition-camera-controls" aria-label="摄影控制"><div class="composition-camera-heading"><strong>摄影</strong><span>自动写入已连接提示词</span></div><div class="composition-camera-grid"><div class="composition-camera-group"><label>景深</label><div>' + depth + '</div></div><div class="composition-camera-group"><label>焦段</label><div>' + focalLength + '</div></div><div class="composition-camera-group"><label>高度</label><div>' + cameraHeight + '</div></div></div><div class="composition-camera-direction"><label>机位方向</label><div>' + cameraDirection + '</div></div><div class="composition-camera-angle"><label>机位角度</label><div>' + cameraAngle + '</div></div><div class="composition-shot-size"><label>景别</label><div>' + shotSize + '</div></div></section></section>';
}
function promptReferenceNodes(node) {
  if (!node || node.type !== "prompt") return [];
  const seen = new Set(); const result = [];
  const targets = state.edges.filter(edge => edge.type === "prompt" && edge.source === node.id).map(edge => findNode(edge.target)).filter(target => target && (target.type === "generator" || target.type === "answer"));
  targets.forEach(target => {
    state.edges.filter(edge => edge.type === "image" && edge.target === target.id && /^image(?:-|$)/.test(String(edge.targetPort || ""))).sort((a, b) => {
      const aIndex = Number(String(a.targetPort || "").split("-")[1]); const bIndex = Number(String(b.targetPort || "").split("-")[1]);
      return (Number.isFinite(aIndex) ? aIndex : 0) - (Number.isFinite(bIndex) ? bIndex : 0);
    }).forEach(edge => {
      const source = findNode(edge.source); if (!source || source.disabled || !imageSourceFromNode(source) || seen.has(source.id)) return;
      seen.add(source.id); result.push(source);
    });
  });
  return result;
}
function promptQuickSelect(node, field) {
  const params = normalizePromptQuickParams(node.promptQuickParams); const config = promptQuickParamOptions[field];
  return promptQuickDropdown(node, field, params[field], config.options, config.label);
}
function promptQuickDropdown(node, field, current, options, label) {
  const currentLabel = options.find(([value]) => value === current)?.[1] || options[0]?.[1] || "未指定";
  const menu = options.map(([value, optionLabel]) => `<button type="button" class="prompt-quick-option node-interactive" data-prompt-quick-option data-prompt-quick-field="${escapeHtml(field)}" data-prompt-quick-node="${node.id}" data-prompt-quick-value="${escapeHtml(value)}">${escapeHtml(optionLabel)}</button>`).join("");
  return `<div class="prompt-quick-field"><span>${escapeHtml(label)}</span><details class="prompt-quick-dropdown node-interactive" data-prompt-quick-node="${node.id}" data-prompt-quick-field="${escapeHtml(field)}"><summary class="prompt-quick-trigger" data-prompt-quick-trigger data-prompt-quick-node="${node.id}" data-prompt-quick-label data-prompt-quick-value="${escapeHtml(current)}">${escapeHtml(currentLabel)}</summary><div class="prompt-quick-menu">${menu}</div></details></div>`;
}
function promptQuickSeconds(node) {
  const params = normalizePromptQuickParams(node.promptQuickParams); const options = [["", "未指定"], ...Array.from({ length: 16 }, (_, index) => [String(index), `${index}秒`])];
  return `<div class="prompt-quick-field prompt-quick-seconds"><span>秒数</span><div>${promptQuickDropdown(node, "secondsStart", params.secondsStart, options, "开始") }<b>-</b>${promptQuickDropdown(node, "secondsEnd", params.secondsEnd, options, "结束")}</div></div>`;
}
function promptEditorElement(nodeId) {
  return nodeLayer.querySelector(`[data-prompt-content="${CSS.escape(nodeId)}"]`);
}
function promptEditorText(editor) {
  return String(editor?.innerText || "").replace(/\u00a0/g, " ").replace(/\r\n?/g, "\n").replace(/\n+$/, "");
}
function promptTextLength(node) {
  if (node.nodeType === Node.TEXT_NODE) return (node.nodeValue || "").length;
  if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === "br") return 1;
  return [...(node.childNodes || [])].reduce((total, child) => total + promptTextLength(child), 0);
}
function promptOffsetAt(root, target, childOffset = 0) {
  let result = 0;
  let resolved = false;
  const visit = node => {
    if (resolved) return;
    if (node === target) {
      if (node.nodeType === Node.TEXT_NODE) result += Math.max(0, Math.min(childOffset, (node.nodeValue || "").length));
      else result += [...node.childNodes].slice(0, childOffset).reduce((total, child) => total + promptTextLength(child), 0);
      resolved = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) { result += (node.nodeValue || "").length; return; }
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === "br") { result += 1; return; }
    for (const child of node.childNodes || []) visit(child);
  };
  visit(root);
  return resolved ? result : promptTextLength(root);
}
function promptSelectionOffsets(editor, range = null) {
  const current = range || window.getSelection?.()?.getRangeAt?.(0); if (!editor || !current || !editor.contains(current.commonAncestorContainer)) return null;
  return { start: promptOffsetAt(editor, current.startContainer, current.startOffset), end: promptOffsetAt(editor, current.endContainer, current.endOffset) };
}
function promptTextPoint(root, offset) {
  let remaining = Math.max(0, Number(offset) || 0); let lastText = null;
  const visit = node => {
    if (node.nodeType === Node.TEXT_NODE) { lastText = node; if (remaining <= (node.nodeValue || "").length) return { node, offset: remaining }; remaining -= (node.nodeValue || "").length; return null; }
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === "br") { if (remaining <= 1) return { node: node.parentNode, offset: [...node.parentNode.childNodes].indexOf(node) }; remaining -= 1; return null; }
    for (const child of node.childNodes || []) { const point = visit(child); if (point) return point; }
    return null;
  };
  return visit(root) || (lastText ? { node: lastText, offset: (lastText.nodeValue || "").length } : { node: root, offset: root.childNodes.length });
}
function setPromptSelection(editor, start, end = start) {
  if (!editor) return false;
  const selection = window.getSelection?.(); if (!selection) return false;
  const range = document.createRange(); const startPoint = promptTextPoint(editor, start); const endPoint = promptTextPoint(editor, end);
  try { range.setStart(startPoint.node, startPoint.offset); range.setEnd(endPoint.node, endPoint.offset); selection.removeAllRanges(); selection.addRange(range); editor.focus({ preventScroll: true }); return true; } catch { return false; }
}
function syncPromptEditorNode(editor, node) {
  if (!editor || !node) return;
  node.content = promptEditorText(editor); node.contentMarkup = sanitizePromptMarkup(editor.innerHTML, node.content); node.promptPresetId = "";
}
function rememberPromptFormatSelection(nodeId) {
  const editor = promptEditorElement(nodeId); const selection = window.getSelection?.();
  if (!editor || !selection?.rangeCount) { promptFormatSelection.delete(nodeId); return false; }
  const range = selection.getRangeAt(0);
  if (range.collapsed || !editor.contains(range.commonAncestorContainer)) { promptFormatSelection.delete(nodeId); return false; }
  promptFormatSelection.set(nodeId, range.cloneRange());
  const offsets = promptSelectionOffsets(editor, range); if (offsets) promptQuickSelection.set(nodeId, offsets);
  return true;
}
function clearPromptInlineStyle(root, property) {
  root.querySelectorAll?.("[style]").forEach(element => {
    element.style[property] = "";
    if (!element.getAttribute("style")) element.removeAttribute("style");
  });
}
function updatePromptEditorAfterChange(editor, node, selection = null) {
  syncPromptEditorNode(editor, node); if (selection) { promptQuickSelection.set(node.id, selection); setPromptSelection(editor, selection.start, selection.end); } else promptQuickSelection.delete(node.id); scheduleSave();
}
function applyPromptInlineStyle(nodeId, property, value) {
  const node = findNode(nodeId); const editor = promptEditorElement(nodeId); let range = promptFormatSelection.get(nodeId)?.cloneRange();
  if (!node || node.type !== "prompt" || !editor) return;
  if (!range || range.collapsed || !editor.contains(range.commonAncestorContainer)) {
    const selection = promptQuickRememberedSelection(nodeId);
    if (!selection || selection.start === selection.end || !setPromptSelection(editor, selection.start, selection.end)) return toast("请先选择要调整的文字", true);
    range = window.getSelection?.()?.getRangeAt?.(0)?.cloneRange();
  }
  if (!range || range.collapsed) return toast("请先选择要调整的文字", true);
  const before = snapshot(); const wrapper = document.createElement("span"); const contents = range.extractContents(); clearPromptInlineStyle(contents, property); if (property === "color" && !isPromptThemeDefaultColor(value)) wrapper.style[property] = value; else if (property !== "color") wrapper.style[property] = value; wrapper.append(contents); range.insertNode(wrapper);
  const appliedRange = document.createRange(); appliedRange.selectNodeContents(wrapper); const current = window.getSelection?.(); current?.removeAllRanges(); current?.addRange(appliedRange);
  const nextSelection = promptSelectionOffsets(editor, appliedRange); updatePromptEditorAfterChange(editor, node, nextSelection); rememberPromptFormatSelection(nodeId); undoStack.push(before); if (undoStack.length > 18) undoStack.shift(); redoStack = [];
}
function insertPromptReferenceToken(nodeId, index) {
  const node = findNode(nodeId); if (!node || node.type !== "prompt") return;
  const editor = promptEditorElement(nodeId); const value = String(node.content || ""); const selection = promptQuickRememberedSelection(nodeId); const start = Math.max(0, Math.min(value.length, Number(selection.start) || 0)); const end = Math.max(start, Math.min(value.length, Number(selection.end) || start)); const token = `图${Number(index) + 1}；\n`;
  if (editor && setPromptSelection(editor, start, end)) { document.execCommand("insertText", false, token); updatePromptEditorAfterChange(editor, node); } else { node.content = `${value.slice(0, start)}${token}${value.slice(end)}`; node.contentMarkup = promptMarkupFromPlainText(node.content); node.promptPresetId = ""; scheduleSave(); }
}
function promptQuickCurrentSelection(nodeId) {
  const editor = promptEditorElement(nodeId); const selection = promptSelectionOffsets(editor); if (selection) return selection;
  const value = String(findNode(nodeId)?.content || ""); return { start: value.length, end: value.length };
}
function rememberPromptQuickSelection(nodeId) {
  promptQuickSelection.set(nodeId, promptQuickCurrentSelection(nodeId));
}
function promptQuickRememberedSelection(nodeId) {
  return promptQuickSelection.get(nodeId) || promptQuickCurrentSelection(nodeId);
}
function insertPromptQuickText(node, text, range = null) {
  if (!node || node.type !== "prompt" || !String(text || "")) return;
  const editor = promptEditorElement(node.id); const value = String(node.content || ""); const selection = range || promptQuickRememberedSelection(node.id); const start = Math.max(0, Math.min(value.length, Number(selection.start) || 0)); const end = Math.max(start, Math.min(value.length, Number(selection.end) || start));
  if (editor && setPromptSelection(editor, start, end)) { document.execCommand("insertText", false, text); updatePromptEditorAfterChange(editor, node); } else { node.content = `${value.slice(0, start)}${text}${value.slice(end)}`; node.contentMarkup = promptMarkupFromPlainText(node.content); node.promptPresetId = ""; promptQuickSelection.delete(node.id); }
}
function pastePromptPlainText(editor, event) {
  const text = event.clipboardData?.getData("text/plain");
  if (text == null || !editor || !text.length) return false;
  const node = findNode(editor.dataset.promptContent); const selection = window.getSelection?.();
  if (!node || node.type !== "prompt" || !selection?.rangeCount) return false;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;
  event.preventDefault();
  const wrapper = document.createElement("span");
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
  lines.forEach((line, index) => { if (line) wrapper.append(document.createTextNode(line)); if (index < lines.length - 1) wrapper.append(document.createElement("br")); });
  range.deleteContents(); range.insertNode(wrapper);
  const caret = document.createRange(); caret.setStartAfter(wrapper); caret.collapse(true); selection.removeAllRanges(); selection.addRange(caret);
  syncPromptEditorNode(editor, node); rememberPromptQuickSelection(node.id); rememberPromptFormatSelection(node.id); scheduleEditableHistory(editor); scheduleSave();
  return true;
}
function promptQuickLabel(field, value) {
  return promptQuickParamOptions[field]?.options.find(([id]) => id === value)?.[1] || "";
}
function disconnectPromptReference(nodeId, sourceId) {
  const beforeState = snapshot(); const promptTargets = new Set(state.edges.filter(edge => edge.type === "prompt" && edge.source === nodeId).map(edge => edge.target)); const before = state.edges.length;
  state.edges = state.edges.filter(edge => !(edge.type === "image" && edge.source === sourceId && promptTargets.has(edge.target)));
  if (state.edges.length === before) return;
  undoStack.push(beforeState); if (undoStack.length > 18) undoStack.shift(); redoStack = []; renderCanvas(); renderInspector(); updateHistoryButtons(); scheduleSave(); toast("已取消该参考图链接");
}
function applyPromptQuickField(control, value) {
  const node = findNode(control.dataset.promptQuickNode); if (!node || node.type !== "prompt") return false;
  const field = control.dataset.promptQuickField; const before = snapshot(); const next = normalizePromptQuickParams({ ...node.promptQuickParams, [field]: value });
  if (field === "secondsStart") { node.promptQuickParams = next; node.promptQuickPendingSelection = promptQuickRememberedSelection(node.id); }
  else if (field === "secondsEnd") {
    if (next.secondsStart !== "" && next.secondsEnd !== "" && Number(next.secondsEnd) <= Number(next.secondsStart)) { control.value = ""; node.promptQuickParams = normalizePromptQuickParams({ ...node.promptQuickParams, secondsEnd: "" }); toast("结束秒数必须大于开始秒数", true); return false; }
    node.promptQuickParams = next; const range = node.promptQuickPendingSelection || promptQuickCurrentSelection(node.id); if (next.secondsStart !== "" && next.secondsEnd !== "") insertPromptQuickText(node, `${next.secondsStart}秒-${next.secondsEnd}秒，`, range); node.promptQuickPendingSelection = null;
  } else { node.promptQuickParams = next; if (next[field]) insertPromptQuickText(node, `${promptQuickParamOptions[field].label}；${promptQuickLabel(field, next[field])}，`); }
  undoStack.push(before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; scheduleSave(); return true;
}
function renderPromptNodeHtml(node, selected, style) {
  const disabled = Boolean(node.disabled); const toggleLabel = disabled ? "启用提示词节点" : "禁用提示词节点";
  const quickControlsVisible = node.promptQuickControlsVisible !== false; const quickToggleLabel = quickControlsVisible ? "隐藏快捷镜头" : "显示快捷镜头";
  const toggle = '<button class="icon-button prompt-toggle node-interactive' + (disabled ? ' is-disabled' : '') + '" type="button" data-toggle-prompt="' + node.id + '" aria-label="' + toggleLabel + '" title="' + toggleLabel + '">' + icon(disabled ? "power" : "ban") + '</button><button class="icon-button prompt-quick-toggle node-interactive' + (quickControlsVisible ? '' : ' is-hidden') + '" type="button" data-toggle-prompt-quick="' + node.id + '" aria-label="' + quickToggleLabel + '" title="' + quickToggleLabel + '">' + icon(quickControlsVisible ? "eye-off" : "eye") + '</button>';
  const presetOptions = '<option value="">选择提示词预设</option>' + promptPresets.map(preset => '<option value="' + escapeHtml(preset.id) + '"' + (node.promptPresetId === preset.id ? ' selected' : '') + '>' + escapeHtml(preset.name) + '</option>').join("");
  const presetActions = '<div class="prompt-preset-actions"><select class="node-select node-interactive prompt-preset-select" data-prompt-preset="' + node.id + '" aria-label="选择提示词预设">' + presetOptions + '</select><button class="button button-quiet node-interactive" type="button" data-save-prompt-preset="' + node.id + '">保存</button><button class="icon-button node-interactive" type="button" data-rename-prompt-preset="' + node.id + '" aria-label="修改预设名称" data-tooltip="修改预设名称"' + (node.promptPresetId ? '' : ' disabled') + '>' + icon("pencil") + '</button><button class="button button-quiet node-interactive danger-action" type="button" data-delete-prompt-preset="' + node.id + '"' + (node.promptPresetId ? '' : ' disabled') + '>删除</button></div>';
  const references = promptReferenceNodes(node); const referenceStrip = references.length ? `<div class="prompt-reference-strip" aria-label="已连接参考图">${references.map((reference, index) => `<figure class="prompt-reference-thumb node-interactive" data-prompt-reference-node="${node.id}" data-prompt-reference-source="${reference.id}" data-prompt-reference-index="${index}" title="单击插入图${index + 1}，双击取消链接"><img src="${escapeHtml(nodeDisplaySource(reference))}" alt="参考图 ${index + 1}" loading="lazy" decoding="async" draggable="false"><figcaption>${index + 1}</figcaption></figure>`).join("")}</div>` : '<div class="prompt-reference-strip is-empty" aria-hidden="true"></div>';
  const quickToolbar = quickControlsVisible ? `<aside class="prompt-quick-toolbar" aria-label="提示词快捷参数"><div class="prompt-quick-heading"><span>快捷镜头</span><button class="icon-button prompt-quick-heading-toggle node-interactive" type="button" data-toggle-prompt-quick="${node.id}" aria-label="${quickToggleLabel}" title="${quickToggleLabel}">${icon("eye-off")}</button></div>${promptQuickSeconds(node)}${Object.keys(promptQuickParamOptions).map(field => promptQuickSelect(node, field)).join("")}<div class="prompt-preset-toolbar">${presetActions}</div></aside>` : "";
  return `<article class="canvas-node prompt-node${disabled ? " is-disabled" : ""}${selected}${quickControlsVisible ? "" : " is-quick-collapsed"}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, "text-cursor-input", toggle, false)}<div class="node-body"><div class="prompt-reference-strip-wrap">${referenceStrip}</div><div class="prompt-work-area${quickControlsVisible ? "" : " is-quick-hidden"}"><div class="prompt-editor"><div class="node-textarea prompt-content-editor node-interactive" data-prompt-content="${node.id}" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="写下主体、光线、材质和画面文字…">${sanitizePromptMarkup(node.contentMarkup, node.content || "")}</div></div>${quickToolbar}</div></div></div>${resizeHandleHtml(node)}${portHtml(node, "composition", "composition", "input", "参数控制", 104)}${portHtml(node, "prompt", "prompt", "output", "Prompt", 72)}</article>`;
}
function normalizeImportedIdentity(project) {
  const idMap = new Map();
  const nodes = project.nodes.map(node => {
    const oldId = String(node.id || "");
    const nextId = uid(node.type || "node");
    if (oldId && !idMap.has(oldId)) idMap.set(oldId, nextId);
    return { ...node, id: nextId };
  });
  const edges = project.edges.map(edge => ({ ...edge, id: uid("edge"), source: idMap.get(String(edge.source || "")) || "", target: idMap.get(String(edge.target || "")) || "" })).filter(edge => edge.source && edge.target);
  return { ...project, nodes, edges, selectedIds: [], selectedEdgeId: null };
}
function renderCompositionNodeHtml(node, selected, style) {
  return '<article class="canvas-node composition-node' + selected + '" data-node-id="' + node.id + '" style="' + style + '"><div class="node-card">' + nodeHeaderHtml(node, "sliders-horizontal") + '<div class="node-body composition-body">' + compositionControlsHtml(node) + '</div></div>' + resizeHandleHtml(node) + portHtml(node, "composition", "composition", "output", "构图", 72) + '</article>';
}
function renderNoteHtml(node, selected, style) {
  return `<article class="canvas-node note-item${selected}" data-node-id="${node.id}" style="${style}"><div class="note-card"><header class="note-header"><span>${icon("sticky-note")}</span><strong>便签</strong></header><textarea class="note-textarea node-interactive" data-note-content="${node.id}" placeholder="记录你的想法…">${escapeHtml(node.content || "")}</textarea></div>${resizeHandleHtml(node)}</article>`;
}
function nodeCanvasSource(node) { return node?.localEdit?.result?.url&&node.localEdit.result.url===node.src ? node.src : node?.previewSrc || node?.src || node?.originalSrc || ""; }
function renderImageNodeHtml(node, selected, style) {
  const loading = node.type === "loading";
  const loadingMediaType = loading && node.mediaType === "video" ? "video" : "image";
  const disabled = Boolean(node.disabled);
  const hasSource = Boolean(node.src);
  const isVideoLoading = loading && loadingMediaType === "video";
  const elapsed = formatGenerationDuration(Date.now() - Number(node.generationStartedAt || 0)) || "0秒";
  const loadingStage = runningHubGenerationStageLabel(node.generationStage);
  const localAction=!loading&&hasSource&&node.mediaType!=='video'?'<button class="icon-button node-interactive" type="button" data-local-edit="'+node.id+'" aria-label="局部修改" data-tooltip="局部修改">'+icon('paintbrush')+'</button>':'';
  const layerAction = !loading && hasSource ? `<button class="icon-button node-interactive" type="button" data-layer-edit="${node.id}" aria-label="${node.layerJobId ? '查看拆层进度' : node.layerDocument ? '编辑图层' : '分层编辑'}" data-tooltip="${node.layerJobId ? '查看拆层进度' : node.layerDocument ? '编辑图层' : '分层编辑'}">${icon(node.layerJobId ? 'loader-circle' : 'layers')}</button>` : '';
  const actions = loading ? "" : hasSource ? `${localAction}${layerAction}<button class="icon-button node-interactive" type="button" data-crop-node="${node.id}" aria-label="裁剪参考图" data-tooltip="裁剪参考图">${icon("crop")}</button><button class="icon-button node-interactive" type="button" data-download-node="${node.id}" aria-label="下载图片" data-tooltip="下载图片">${icon("download")}</button>` : `<button class="icon-button node-interactive" type="button" data-upload-node="${node.id}" aria-label="上传图像" data-tooltip="上传图像">${icon("image-plus")}</button>`;
  const toggle = loading ? "" : `<button class="icon-button image-toggle node-interactive${disabled ? " is-disabled" : ""}" type="button" data-toggle-image="${node.id}" aria-label="${disabled ? "启用参考图节点" : "禁用参考图节点"}" title="${disabled ? "启用参考图节点" : "禁用参考图节点"}">${icon(disabled ? "power" : "ban")}</button>`;
  const dimensions = Number(node.imageWidth) > 0 && Number(node.imageHeight) > 0 ? `${node.imageWidth} × ${node.imageHeight}` : "";
  const candidateActions = node.midjourneyCandidate && hasSource
    ? `<div class="midjourney-candidate-actions"><span>选择单图</span>${(node.midjourneySlots || []).map(slot => `<button class="node-interactive" type="button" data-midjourney-upscale="${node.id}" data-midjourney-slot="${slot}"${node.midjourneyActionJobId ? " disabled" : ""}>U${slot}</button>`).join("")}</div>`
    : "";
  const preview = loading
    ? isVideoLoading
      ? `<div class="loading-preview video-loading-preview"><div>${icon("loader-circle")}<span>${escapeHtml(node.source || "海螺 H3 视频")} 生成中</span><strong data-generation-elapsed="${Number(node.generationStartedAt) || Date.now()}">已等待 ${escapeHtml(elapsed)}</strong><small>${escapeHtml(loadingStage)}</small></div></div>`
      : `<div class="loading-preview">${icon("loader-circle")}<span>${escapeHtml(node.source || "生图")} 生成中</span></div>`
    : hasSource ? `<img class="image-preview node-interactive" data-preview-node="${node.id}" src="${escapeHtml(nodeCanvasSource(node))}" alt="${escapeHtml(node.name)}" loading="lazy" draggable="false" decoding="async">` : `<button class="reference-placeholder node-interactive" type="button" data-upload-node="${node.id}" data-reference-drag-node="${node.id}">${icon("image-plus")}<strong>上传图像</strong><small>点击选择本地文件</small></button>`;
  return `<article class="canvas-node image-node${loading ? " loading-node" : ""}${disabled ? " is-disabled" : ""}${selected}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, loading ? "loader-circle" : "image", `${actions}${toggle}`, false)}<div class="node-body">
    ${preview}
    ${candidateActions}${node.layerDocument || node.layerJobId ? `<span class="layered-image-badge">${node.layerJobId ? '拆层处理中 · 可关闭窗口后恢复' : `${leafLayers(node.layerDocument.layers||[]).length} 个图层${node.layerDraft ? ' · 有编辑草稿' : ''}`}</span>` : ''}
    <div class="image-node-meta"><strong>${escapeHtml(node.source || "参考图")}</strong><span>${escapeHtml(dimensions || node.ratio || (hasSource ? "图片" : "未上传"))}</span></div>
    </div></div>${resizeHandleHtml(node)}${(node.generated || node.source === "Image2" || node.source === "豆包 Seedream" || loading) ? portHtml(node, "result", loadingMediaType, "input", "Result", 70) : ""}${portHtml(node, loadingMediaType, loadingMediaType, "output", loadingMediaType === "video" ? "Video" : "Image", 70)}</article>`;
}
function generatorPromptPortId(index) { return index === 0 ? "prompt" : `prompt-${index}`; }
// The generator input list begins below the model and image-setting controls.
// Keep connector centers on their corresponding list rows so edges never cross the controls.
function generatorInputPortTop(index) { return 189 + index * 30; }
function generatorPromptPortTop(index) { return generatorInputPortTop(index); }
function generatorImagePortTop(node, index) { return generatorInputPortTop(node.promptSlots + index); }
function videoGeneratorPromptPortTop(index) { return 324 + index * 30; }
function videoGeneratorImagePortTop(node, index) { return 354 + Math.max(0, node.promptSlots - 1) * 30 + index * 30; }
function videoGeneratorVideoPortTop(node) { return 354 + 30 * node.inputSlots + Math.max(0, node.promptSlots - 1) * 30; }
function syncVideoGeneratorPortPositions() {
  $$(".video-generator-node").forEach(element => {
    const node = findNode(element.dataset.nodeId); if (!node) return;
    const elementRect = element.getBoundingClientRect();
    const scale = Math.max(0.01, Number(state?.viewport?.scale) || 1);
    element.querySelectorAll(":scope > .node-port-wrap.input").forEach(wrap => {
      const portId = wrap.querySelector(".node-port")?.dataset.portId || "";
      const row = element.querySelector(`.generator-inputs .input-slot[data-video-input-port="${CSS.escape(portId)}"]`); if (!row) return;
      const rowRect = row.getBoundingClientRect();
      wrap.style.top = `${(rowRect.top - elementRect.top + rowRect.height / 2) / scale}px`;
    });
  });
}
function renderGeneratorNodeHtml(node, selected, style) {
  if (node.mediaType === "video") return renderVideoGeneratorNodeHtml(node, selected, style);
  const provider = generatorProviderForNode(node);
  const isMoyu = node.provider === "moyu";
  const isArk = isArkProvider(node.provider);
  const isMidjourney = node.provider === "midjourney";
  const isRunningHubKrea2 = node.provider === "runninghub-krea2";
  const isRunningHubMoss = node.provider === "runninghub-moss";
  const visibleImageSlots = isRunningHubMoss ? 0 : node.inputSlots;
  const isImage25 = image25ModelForNode(node);
  const supportsAdvancedImage25Quality = image25AdvancedQualityForNode(node);
  const qualityOptions = supportsAdvancedImage25Quality ? image25QualityOptions : image2QualityOptions;
  const outputOptions = generatorOutputOptions(node);
  const outputSize = normalizeGeneratorOutputSize(node);
  const outputSizeControl = outputOptions.length > 1
    ? `<select class="node-select node-interactive" data-generator-field="outputSize" data-node-id="${node.id}" aria-label="输出尺寸">${outputOptions.map(option => `<option value="${option.value}"${outputSize === option.value ? " selected" : ""}>${generatorOutputOptionLabel(node, option)}</option>`).join("")}</select>`
    : `<div class="node-static-field">${escapeHtml(outputOptions[0]?.label || "当前最大")}</div>`;
  const batchControl = isArk || isRunningHubMoss ? `<div class="node-static-field">1 张</div>` : isMidjourney ? `<div class="node-static-field">四宫格</div>` : `<select class="node-select node-interactive" data-generator-field="batch" data-node-id="${node.id}" aria-label="生成张数">${[1,2,3,4].map(value => `<option value="${value}"${Number(node.batch) === value ? " selected" : ""}>${value}</option>`).join("")}</select>`;
  const outputControl = isMidjourney ? `<div class="node-static-field">结果节点 U1-U4</div>` : isRunningHubKrea2 ? `<div class="node-static-field">自定义尺寸</div>` : outputSizeControl;
  const krea2Preset = krea2PresetForNode(node);
  const krea2SizeControl = isRunningHubKrea2 ? `<div class="node-field"><label>尺寸预设</label><select class="node-select node-interactive" data-generator-field="kreaPreset" data-node-id="${node.id}" aria-label="K2 白玉尺寸预设"><option value="">${krea2Preset ? "预设尺寸" : "自定义尺寸"}</option>${Object.keys(krea2PresetDimensions).map(value => `<option value="${value}"${krea2Preset === value ? " selected" : ""}>${value}</option>`).join("")}</select></div><div class="node-field-row generator-custom-size"><div class="node-field"><label>宽度</label><input class="node-input node-interactive" type="number" min="32" max="4096" step="32" data-generator-field="kreaWidth" data-node-id="${node.id}" value="${krea2Dimensions(node).width}" aria-label="K2 白玉宽度"></div><div class="node-field"><label>高度</label><input class="node-input node-interactive" type="number" min="32" max="4096" step="32" data-generator-field="kreaHeight" data-node-id="${node.id}" value="${krea2Dimensions(node).height}" aria-label="K2 白玉高度"></div></div>` : "";
  const promptSlots = Array.from({ length: node.promptSlots }, (_, index) => { const edge = incomingEdge(node.id, generatorPromptPortId(index)); const promptNode = findNode(edge?.source); const label = edge ? sourceLabelForEdge(edge) : "未连接"; return `<div class="input-slot${edge ? " is-connected" : ""}${promptNode?.disabled ? " is-disabled" : ""}"><span>${index ? `提示词 ${index + 1}` : "提示词"}</span><span>${escapeHtml(label)}</span></div>`; }).join("");
  const slots = Array.from({ length: visibleImageSlots }, (_, index) => { const edge = incomingEdge(node.id, `image-${index}`); const imageNode = findNode(edge?.source); return `<div class="input-slot${edge ? " is-connected" : ""}${imageNode?.disabled ? " is-disabled" : ""}"><span>参考图 ${index + 1}</span><span>${edge ? escapeHtml(sourceLabelForEdge(edge)) : "未连接"}</span></div>`; }).join("");
  const statusLabel = node.status === "running" ? "生成中" : node.lastResultIds?.length ? `${node.lastResultIds.length} 个结果` : "待运行";
  const isRunning = node.status === "running";
  const canCancel = isRunning && (isRunningHubKrea2 || isRunningHubMoss);
  const runLabel = canCancel ? `停止 ${provider.label}` : isRunning ? `${provider.label} 处理中` : `运行 ${provider.label}`;
    return `<article class="canvas-node generator-node${selected}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, "sparkles")}<div class="node-body generator-body">
    <div class="node-field generator-provider-field"><label>生图模型</label><select class="node-select node-interactive" data-generator-field="providerModel" data-node-id="${node.id}" aria-label="生图模型">${image2Models.filter(item => !item.legacyOnly || (node.provider === "image2" && image2ModelForNode(node) === item.id)).map(item => `<option value="${item.id}"${node.provider === "image2" && image2ModelForNode(node) === item.id ? " selected" : ""}${item.legacyOnly ? " disabled" : ""}>${item.label}</option>`).join("")}${seedreamImageModels.map(item => `<option value="${item.id}"${node.provider === "moyu" && node.moyuModel === item.id ? " selected" : ""}>豆包 · ${item.label}</option>`).join("")}${arkModels.map(item => `<option value="ark:${item.id}"${node.provider === "ark" && generatorModelForNode(node) === item.id ? " selected" : ""}>火山官方 · ${item.label}</option>`).join("")}${arkPlanModels.map(item => `<option value="ark-plan:${item.id}"${node.provider === "ark-plan" && generatorModelForNode(node) === item.id ? " selected" : ""}>火山套餐 · ${item.label}</option>`).join("")}${midjourneyImageModels.map(item => `<option value="${item.id}"${isMidjourney ? " selected" : ""}>Midjourney · ${item.label}</option>`).join("")}<option value="runninghub-krea2"${isRunningHubKrea2 ? " selected" : ""}>RunningHub · K2 白玉</option><option value="runninghub-moss"${isRunningHubMoss ? " selected" : ""}>RunningHub · MOSS</option></select></div>
    <div class="node-field-row"><div class="node-field"><label>比例</label>${isRunningHubKrea2 ? `<div class="node-static-field">自定义</div>` : `<select class="node-select node-interactive" data-generator-field="aspect" data-node-id="${node.id}" aria-label="图像比例">${(isRunningHubMoss ? mossAspects : Object.keys(sizeMap)).map(value => `<option value="${value}"${node.aspect === value ? " selected" : ""}>${value}</option>`).join("")}</select>`}</div>
    <div class="node-field"><label>品质</label>${isArk || isMoyu || isMidjourney || isRunningHubKrea2 || isRunningHubMoss ? `<div class="node-static-field">模型默认</div>` : `<select class="node-select node-interactive" data-generator-field="quality" data-node-id="${node.id}" aria-label="图像品质">${qualityOptions.map(option => `<option value="${option.value}"${node.quality === option.value ? " selected" : ""}>${option.label}</option>`).join("")}</select>`}</div>
    <div class="node-field${isImage25 ? " generator-batch-field" : ""}"><label>${isMidjourney ? "候选图" : "张数"}</label>${batchControl}</div>
    <div class="node-field${isImage25 ? " generator-resolution-field" : ""}"><label>${isMidjourney ? "单图输出" : "输出尺寸"}</label>${outputControl}</div></div>${krea2SizeControl}
    <div class="generator-inputs">${promptSlots}${slots}</div><div class="generator-add-inputs"><button class="add-input-button node-interactive" type="button" data-add-prompt-input="${node.id}"${node.promptSlots >= 6 ? " disabled" : ""}>${icon("plus")} 添加提示词输入</button>${isRunningHubMoss ? "" : `<button class="add-input-button node-interactive" type="button" data-add-input="${node.id}"${node.inputSlots >= generatorReferenceLimit(node) ? " disabled" : ""}>${icon("image-plus")} 添加图片输入</button>`}</div>
    <button class="run-node-button node-interactive${canCancel ? " is-cancel" : ""}" type="button" data-run-node="${node.id}"${isRunning && !canCancel ? " disabled" : ""}>${icon(canCancel ? "square" : isRunning ? "loader-circle" : "play")} ${escapeHtml(runLabel)}</button>
    <div class="node-run-state"><span>${escapeHtml(provider.model)}</span><span class="${node.lastResultIds?.length ? "is-ready" : ""}">${statusLabel}</span></div>
    </div></div>${resizeHandleHtml(node)}${Array.from({ length: node.promptSlots }, (_, index) => portHtml(node, generatorPromptPortId(index), "prompt", "input", index ? `提示词 ${index + 1}` : "提示词", generatorPromptPortTop(index))).join("")}${Array.from({ length: visibleImageSlots }, (_, index) => portHtml(node, `image-${index}`, "image", "input", `参考图 ${index + 1}`, generatorImagePortTop(node, index))).join("")}${portHtml(node, "image", "image", "output", "Image", 76)}</article>`;
}
function renderVideoNodeHtml(node, selected, style) {
  const hasSource = Boolean(node.src);
  const generationDuration = formatGenerationDuration(node.generationDurationMs);
  const profileLabel = videoResultProfileLabel(node);
  const videoPreload = selected.includes("is-selected") ? "metadata" : "none";
  const actions = hasSource ? `<button class="icon-button node-interactive" type="button" data-download-node="${node.id}" aria-label="下载视频" data-tooltip="下载视频">${icon("download")}</button>` : "";
  const preview = hasSource
    ? `<video class="video-preview node-interactive" data-preview-video="${node.id}" src="${escapeHtml(nodeCanvasSource(node))}" controls playsinline preload="${videoPreload}"></video>`
    : `<div class="loading-preview">${icon("video")}<span>视频结果不可用</span></div>`;
  const resultMeta = generationDuration
    ? `<span class="video-result-meta"><span>${escapeHtml(node.outputType || "mp4")}${profileLabel ? ` · ${escapeHtml(profileLabel)}` : ""}</span><span class="video-generation-time" title="包含云端排队、生成、回传和本地保存">生成耗时 ${escapeHtml(generationDuration)}</span></span>`
    : `<span>${escapeHtml(node.outputType || "mp4")}${profileLabel ? ` · ${escapeHtml(profileLabel)}` : ""}</span>`;
  return `<article class="canvas-node image-node video-node${selected}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, "clapperboard", actions)}<div class="node-body">${preview}<div class="image-node-meta"><strong>${escapeHtml(node.source || "海螺 H3 视频")}</strong>${resultMeta}</div></div></div>${resizeHandleHtml(node)}${portHtml(node, "result", "video", "input", "Result", 70)}${portHtml(node, "video", "video", "output", "Video", 70)}</article>`;
}
function renderVideoEditorNodeHtml(node, selected, style) {
  const clips = videoEditorClips(node); const timeline = videoTimelineEntries(node); const playhead = Math.max(0, Math.min(timeline.total, Number(node.timelinePlayhead) || 0));
  const status = node.lastError ? "上次导出失败" : clips.length ? `${clips.length} 个片段 · ${formatClipTime(timeline.total)}` : "导入或连接视频";
  const rulerLabels = Array.from({ length: 4 }, (_, index) => formatClipTime(timeline.total * index / 3));
  const clipHtml = timeline.entries.map(entry => {
    const clip = entry.clip; const active = node.selectedClipId === clip.id ? " is-active" : "";
    return `<article class="video-clip-card node-interactive${active}" data-video-clip="${escapeHtml(clip.id)}" data-editor-node="${node.id}" draggable="true" style="--clip-flex:${Math.max(.5, entry.duration)}"><div class="video-clip-segment"><video class="video-clip-thumb" src="${escapeHtml(clip.src)}" muted playsinline preload="metadata" data-clip-probe-node="${node.id}" data-clip-probe="${escapeHtml(clip.id)}"></video><div class="video-clip-copy"><strong title="${escapeHtml(clip.name)}">${escapeHtml(clip.name)}</strong><small>${clip.origin === "linked" ? "画布视频" : "本地导入"} · ${formatClipTime(entry.duration)}</small><span>${formatClipTime(entry.sourceStart)} - ${formatClipTime(entry.sourceEnd)}</span></div></div></article>`;
  }).join("");
  const trackWidth = Math.max(560, clips.length * 150, timeline.total * 42);
  const playheadPercent = timeline.total ? (playhead / timeline.total) * 100 : 0;
  return `<article class="canvas-node video-editor-node${selected}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, "scissors", "", true, true)}<div class="node-body video-editor-body"><div class="video-editor-toolbar"><div><strong>视频轨道</strong><span>${clips.length} 段 · ${formatClipTime(timeline.total)}</span></div><div class="video-editor-toolbar-actions"><button class="add-input-button node-interactive" type="button" data-video-play="${node.id}"${!clips.length ? " disabled" : ""}>${icon(node.previewPlaying ? "pause" : "play")} ${node.previewPlaying ? "暂停预览" : "播放预览"}</button><button class="add-input-button node-interactive" type="button" data-video-split="${node.id}"${!clips.length ? " disabled" : ""}>${icon("scissors")} 分割</button><button class="add-input-button node-interactive" type="button" data-import-video="${node.id}">${icon("video")} 导入视频</button></div></div><div class="video-editor-timeline"><div class="video-editor-ruler" style="min-width:${trackWidth}px">${rulerLabels.map(label => `<span>${label}</span>`).join("")}</div><div class="video-editor-track-scroll"><div class="video-editor-track" data-video-timeline="${node.id}" style="width:${trackWidth}px"><div class="video-editor-clips">${clipHtml || `<div class="video-editor-empty">${icon("film")}<span>点击“导入视频”，或把画布的视频结果连接到左侧端口</span></div>`}</div><button class="video-timeline-playhead node-interactive" type="button" data-video-playhead="${node.id}" style="left:${playheadPercent}%" aria-label="播放指针"><span></span></button></div></div></div><div class="node-run-state"><span>播放控制在此处 · 右键片段删除</span><span class=""${node.lastError ? ` title="${escapeHtml(node.lastError)}"` : ""}>${escapeHtml(status)}</span></div></div></div>${resizeHandleHtml(node)}${Array.from({ length: node.inputSlots }, (_, index) => portHtml(node, `video-${index}`, "video", "input", `视频 ${index + 1}`, 104 + index * 28)).join("")}${portHtml(node, "video", "video", "output", "成片视频", 70)}</article>`;
}
function renderVideoPreviewNodeHtml(node, selected, style) {
  const frame = videoPreviewFrame(node); const source = videoPreviewSource(node); const connected = Boolean(incomingEdge(node.id, "video"));
  const actions = `<button class="icon-button node-interactive" type="button" data-upload-preview-video="${node.id}" aria-label="上传本地视频" data-tooltip="上传本地视频">${icon("upload")}</button>${source || frame ? `<button class="icon-button node-interactive" type="button" data-export-preview="${node.id}" aria-label="下载视频" data-tooltip="下载视频">${icon("download")}</button>` : ""}`;
  const preview = frame ? `<video class="video-preview node-interactive" data-preview-composite="${node.id}" data-preview-editor="${frame.editor.id}" data-preview-clip-id="${escapeHtml(frame.entry.clip.id)}" src="${escapeHtml(frame.source)}" playsinline preload="metadata"></video>` : source ? `<video class="video-preview node-interactive" data-preview-video="${node.id}" src="${escapeHtml(source)}" controls playsinline preload="metadata"></video>` : `<button class="video-preview-empty node-interactive" type="button" data-upload-preview-video="${node.id}">${icon("upload")}<strong>${connected ? "等待视频片段" : "上传本地视频"}</strong><span>${connected ? "已连接的节点还没有可用视频" : "支持 MP4、WebM 和 MOV，可作为 H3 参考视频输出"}</span></button>`;
  const sourceLabel = connected ? frame ? "跟随时间轴" : source ? "已连接 · 可输出" : "等待视频" : source ? (node.localVideoName || "本地视频") : "未上传";
  return `<article class="canvas-node video-preview-node${selected}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, "monitor-play", actions)}<div class="node-body">${preview}<div class="image-node-meta"><strong>${connected ? "成片预览" : "本地视频"}</strong><span>${escapeHtml(sourceLabel)}</span></div></div></div>${resizeHandleHtml(node)}${portHtml(node, "video", "video", "input", "成片视频", 70)}${portHtml(node, "video-output", "video", "output", "参考视频输出", 70)}</article>`;
}
function videoReferenceAudio(node, slot) {
  const port = 'audio-reference-' + slot;
  const edge = incomingEdge(node.id, port);
  if (!edge) return { src: (slot === 2 ? node.secondAudioReference : node.localAudioReference) || '', linked: false };
  const source = findNode(edge.source);
  const index = source?.versions?.findIndex(v => 'clone-result-' + v.id === edge.sourcePort) ?? -1;
  const version = source?.versions?.[index];
  return { src: source?.disabled ? '' : version?.src || '', linked: true, name: source?.disabled ? '来源已禁用' : version ? (source.standaloneClone && source.name) || version.name || '结果 ' + (index + 1) : '录音记录缺失' };
}
function renderVideoGeneratorNodeHtml(node, selected, style) {
  const dimensions = runningHubVideoDimensions(node);
  const mode = runningHubVideoMode(node);
  const megapixels = Number(node.videoMegapixels) || .9;
  const shortName = source => decodeURIComponent(String(source || "").split("/").pop() || "").replace(/^\w+-\w+-/, "") || "本地参考素材";
  const inputSlot = (portId, dataType, inputLabel, value, connected, disabled) => `<div class="input-slot${connected ? " is-connected" : ""}${disabled ? " is-disabled" : ""}" data-video-input-port="${escapeHtml(portId)}"><span>${escapeHtml(inputLabel)}</span><span>${escapeHtml(value)}</span></div>`;
  const promptSlots = Array.from({ length: node.promptSlots }, (_, index) => { const edge = incomingEdge(node.id, generatorPromptPortId(index)); const promptNode = findNode(edge?.source); const inputLabel = index ? `Prompt ${index + 1}` : "Prompt"; return inputSlot(generatorPromptPortId(index), "prompt", inputLabel, edge ? sourceLabelForEdge(edge) : "未连接", Boolean(edge), promptNode?.disabled); }).join("");
  const imageSlots = Array.from({ length: node.inputSlots }, (_, index) => { const edge = incomingEdge(node.id, `image-${index}`); const imageNode = findNode(edge?.source); const inputLabel = mode.inputs[index] || `参考图 ${index + 1}`; return inputSlot(`image-${index}`, "image", inputLabel, edge ? sourceLabelForEdge(edge) : "未连接", Boolean(edge), imageNode?.disabled); }).join("");
  const videoEdge = incomingEdge(node.id, "video-reference");
  const videoLabel = videoEdge ? sourceLabelForEdge(videoEdge) : node.localVideoReference ? shortName(node.localVideoReference) : "未连接";
  const wenwu = isWenwu(node);
  const aspects = wenwu ? Object.keys(wenwuAspects) : runningHubVideoAspects;
  const audioSlots = wenwu ? [1, 2] : [1];
  const audioRows = audioSlots.map(slot => {
    const audio = videoReferenceAudio(node, slot), label = wenwu ? '参考音频 ' + slot : '参考音频';
    return inputSlot('audio-reference-' + slot, 'audio', label, audio.linked ? audio.name : audio.src ? shortName(audio.src) : '可连线或上传', Boolean(audio.src));
  }).join('');
  const statusLabel = node.status === "running" ? "生成中" : node.lastError ? "上次生成失败" : node.lastResultIds?.length ? `${node.lastResultIds.length} 个视频` : "待运行";
  return `<article class="canvas-node generator-node video-generator-node${selected}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, "clapperboard", "", true, true)}<div class="node-body generator-body">
    <div class="video-provider-badge"><span>${escapeHtml(runningHubVideoProvider.label)}</span><small>工作流 ${wenwu ? wenwuId : runningHubReferenceWorkflowId} · plus</small></div>
    <select class="node-select node-interactive" data-video-field="mode" data-node-id="${node.id}" aria-label="视频工作流"${node.status === "running" ? " disabled" : ""}><option value="reference"${wenwu ? "" : " selected"}>多图参考生视频 · 6 张参考图</option><option value="wenwu"${wenwu ? " selected" : ""}>文武双全 · 9 张参考图</option></select>
    <div class="node-field-row"><div class="node-field"><label>比例</label><select class="node-select node-interactive" data-video-field="aspect" data-node-id="${node.id}" aria-label="视频比例">${aspects.map(value => `<option value="${value}"${node.videoAspect === value ? " selected" : ""}>${value}</option>`).join("")}</select></div><div class="node-field"><label>${wenwu ? "百万像素 (MP)" : "像素"}</label>${wenwu ? `<input class="node-select node-interactive" type="number" min="0.1" max="16" step="any" data-video-field="megapixels" data-node-id="${node.id}" aria-label="视频百万像素" value="${megapixels}">` : `<select class="node-select node-interactive" data-video-field="megapixels" data-node-id="${node.id}" aria-label="视频像素">${runningHubVideoMegapixelOptions.map(option => `<option value="${option.value}"${megapixels === option.value ? " selected" : ""}>${option.label}</option>`).join("")}</select>`}</div></div>
    <div class="node-field-row"><div class="node-field"><label>秒数</label><select class="node-select node-interactive" data-video-field="seconds" data-node-id="${node.id}" aria-label="视频秒数">${Array.from({ length: mode.maxSeconds - 5 + 1 }, (_, index) => index + 5).map(value => `<option value="${value}"${Number(node.videoSeconds) === value ? " selected" : ""}>${value} 秒</option>`).join("")}</select></div><div class="node-field">${wenwu ? `<label>对齐倍数</label><input class="node-select node-interactive" type="number" min="8" max="128" step="4" value="${node.videoMultiple}" data-video-field="multiple" data-node-id="${node.id}" aria-label="视频对齐倍数">` : `<label>实例</label><div class="node-static-field">API plus · 48G</div>`}</div></div>
    <div class="video-resolution-summary"><span>${wenwu ? megapixels : megapixels.toFixed(1)} MP · ${wenwu ? node.videoMultiple : 32} 对齐</span><strong>${dimensions.width} × ${dimensions.height}</strong></div>
    <div class="generator-inputs">${promptSlots}${imageSlots}${inputSlot("video-reference", "video", "参考视频", videoLabel, Boolean(videoEdge || node.localVideoReference))}${audioRows}</div>
    <div class="generator-add-inputs"><button class="add-input-button node-interactive" type="button" data-add-prompt-input="${node.id}"${node.promptSlots >= 6 ? " disabled" : ""}>${icon("plus")} 添加提示词输入</button><button class="add-input-button node-interactive" type="button" data-upload-video-reference="${node.id}">${icon("video")} 上传参考视频</button><button class="add-input-button node-interactive" type="button" data-upload-audio-reference="${node.id}">${icon("audio-lines")} 上传参考音频${wenwu ? " 1" : ""}</button>${wenwu ? `<button class="add-input-button node-interactive" type="button" data-audio-slot="2" data-upload-audio-reference="${node.id}">${icon("audio-lines")} 上传参考音频 2</button>` : ""}</div>
    <div class="video-reference-note">${wenwu ? "可连接最多 9 张图，上传或连接 1 段视频，上传或连接 2 段参考音频。" : "六张图像参考和可选视频/音频素材会上传至 RunningHub；运行中可停止远程任务。"}</div>
    <button class="run-node-button node-interactive${node.status === "running" ? " is-cancel" : ""}" type="button" data-run-node="${node.id}">${icon(node.status === "running" ? "square" : "play")} ${node.status === "running" ? "停止海螺 H3" : "运行海螺 H3"}</button>
    <div class="node-run-state"><span>${escapeHtml(runningHubVideoProvider.model)}</span><span class="${node.lastResultIds?.length ? "is-ready" : ""}"${node.lastError ? ` title="${escapeHtml(node.lastError)}"` : ""}>${statusLabel}</span></div>
    </div></div>${resizeHandleHtml(node)}${Array.from({ length: node.promptSlots }, (_, index) => portHtml(node, generatorPromptPortId(index), "prompt", "input", index ? `Prompt ${index + 1}` : "Prompt", 0)).join("")}${Array.from({ length: node.inputSlots }, (_, index) => portHtml(node, `image-${index}`, "image", "input", mode.inputs[index] || `参考图 ${index + 1}`, 0)).join("")}${portHtml(node, "video-reference", "video", "input", "参考视频", 0)}${audioSlots.map(slot => portHtml(node, "audio-reference-" + slot, "audio", "input", "参考音频 " + slot, 0)).join("")}${portHtml(node, "video", "video", "output", "Video", 76)}</article>`;
}
function answerPromptPortId(index) { return index === 0 ? "prompt" : `prompt-${index}`; }
// Keep model input connectors centered on the rows rendered by .answer-inputs.
function answerInputPortTop(index) { return 133 + index * 30; }
function answerPromptPortTop(index) { return answerInputPortTop(index); }
function answerImagePortTop(node, index) { return answerInputPortTop(node.promptSlots + index); }
function answerNodeText(node) {
  const usingH3Skill = node.answerSkill === "minimax-h3";
  const usingNuyoahSkill = node.answerSkill === "nuyoah-reverse";
  const usingMinimalistProductAdSkill = node.answerSkill === "minimalist-product-ad";
  const usingBrandPromoVideoSkill = node.answerSkill === "brand-promo-video";
  const runningText = usingH3Skill ? "正在生成 MiniMax H3 提示词…" : usingNuyoahSkill ? "正在反推图片提示词…" : usingMinimalistProductAdSkill ? "正在编写产品广告提示词…" : usingBrandPromoVideoSkill ? "正在编写品牌宣传提示词…" : "模型正在回答…";
  const emptyText = usingH3Skill ? "连接提示词和参考图后，将输出可直接用于 MiniMax H3 的视频提示词。" : usingNuyoahSkill ? "连接参考图后，将输出结构拆解、参考色卡和可直接复制的中文提示词。" : usingMinimalistProductAdSkill ? "连接产品图和产品需求后，将直接输出英文 H3 产品广告提示词。" : usingBrandPromoVideoSkill ? "连接品牌素材和宣传需求后，将直接输出英文 H3 宣传片提示词。" : "连接提示词后，模型回答会显示在这里。";
  const runLabel = node.status === "running" ? (usingH3Skill ? "生成中" : usingNuyoahSkill ? "反推中" : usingMinimalistProductAdSkill || usingBrandPromoVideoSkill ? "生成中" : "回答中") : (usingH3Skill ? "生成 H3 提示词" : usingNuyoahSkill ? "反推图片提示词" : usingMinimalistProductAdSkill ? "生成广告提示词" : usingBrandPromoVideoSkill ? "生成宣传片提示词" : "请求回答");
  const answerText = node.status === "running" ? runningText : node.error ? node.error : node.answer || emptyText;
  return { runLabel, answerText };
}
function renderAnswerNodeHtml(node, selected, style) {
  const promptSlots = Array.from({ length: node.promptSlots }, (_, index) => { const edge = incomingEdge(node.id, answerPromptPortId(index)); const promptNode = findNode(edge?.source); const label = edge ? sourceLabelForEdge(edge) : "未连接"; return `<div class="input-slot${edge ? " is-connected" : ""}${promptNode?.disabled ? " is-disabled" : ""}"><span>${index ? `提示词 ${index + 1}` : "提示词"}</span><span>${escapeHtml(label)}</span></div>`; }).join("");
  const imageSlots = Array.from({ length: node.inputSlots }, (_, index) => { const edge = incomingEdge(node.id, `image-${index}`); const imageNode = findNode(edge?.source); return `<div class="input-slot${edge ? " is-connected" : ""}${imageNode?.disabled ? " is-disabled" : ""}"><span>参考图 ${index + 1}</span><span>${edge ? escapeHtml(sourceLabelForEdge(edge)) : "未连接"}</span></div>`; }).join("");
  const modelOption = answerModelOption(node.model);
  const modelOptions = answerModelOptions.map(item => `<option value="${item.value}"${node.model === item.value ? " selected" : ""}>${item.label}</option>`).join("");
  const usingH3Skill = node.answerSkill === "minimax-h3";
  const usingNuyoahSkill = node.answerSkill === "nuyoah-reverse";
  const usingMinimalistProductAdSkill = node.answerSkill === "minimalist-product-ad";
  const usingBrandPromoVideoSkill = node.answerSkill === "brand-promo-video";
  const productAdH3Mode = normalizedH3AnswerMode(node.productAdH3Mode);
  const productAdDuration = normalizedProductAdDuration(node.productAdDuration, 10);
  const brandPromoH3Mode = normalizedH3AnswerMode(node.brandPromoH3Mode);
  const brandPromoDuration = normalizedBrandPromoDuration(node.brandPromoDuration, 15);
  const usingDeepseek = answerModelIsDeepseek(node.model);
  const deepseekSettings = usingDeepseek ? `<div class="answer-deepseek-settings"><div class="node-field-row"><div class="node-field"><label>思考模式</label><select class="node-select node-interactive" data-answer-deepseek-thinking="${node.id}" aria-label="DeepSeek 思考模式"><option value="enabled"${node.deepseekThinking === "enabled" ? " selected" : ""}>开启</option><option value="disabled"${node.deepseekThinking === "disabled" ? " selected" : ""}>关闭</option></select></div><div class="node-field"><label>思考强度</label><select class="node-select node-interactive" data-answer-deepseek-effort="${node.id}" aria-label="DeepSeek 思考强度"${node.deepseekThinking === "disabled" ? " disabled" : ""}><option value="low"${node.deepseekReasoningEffort === "low" ? " selected" : ""}>Low</option><option value="high"${node.deepseekReasoningEffort === "high" ? " selected" : ""}>High</option><option value="max"${node.deepseekReasoningEffort === "max" ? " selected" : ""}>Max</option></select></div></div><p class="field-note">${modelOption.vision ? "当前模型支持图像识别、截图文字和图表分析。" : "当前模型为纯文本；连接参考图时请切换到 DeepSeek V4.1 Flash。"}</p></div>` : "";
  const skillSelect = `<div class="node-field answer-skill-field"><label>提示词 Skill</label><select class="node-select node-interactive" data-answer-skill="${node.id}" aria-label="回答 Skill">${answerSkillOptions.map(item => `<option value="${item.value}"${node.answerSkill === item.value ? " selected" : ""}>${item.label}</option>`).join("")}</select></div>`;
  const durationOptions = (options, duration) => options.map(seconds => `<option value="${seconds}"${duration === seconds ? " selected" : ""}>${seconds} 秒</option>`).join("");
  const skillSettings = usingH3Skill ? `${skillSelect}<div class="node-field-row answer-h3-settings"><div class="node-field"><label>H3 模式</label><select class="node-select node-interactive" data-answer-h3-mode="${node.id}" aria-label="MiniMax H3 模式">${h3AnswerModeOptions.map(item => `<option value="${item.value}"${node.h3Mode === item.value ? " selected" : ""}>${item.label}</option>`).join("")}</select></div><div class="node-field"><label>视频时长</label><select class="node-select node-interactive" data-answer-h3-duration="${node.id}" aria-label="MiniMax H3 视频时长">${durationOptions(h3DurationOptions, node.h3Duration)}</select></div></div><p class="field-note">自动识别：无图为文生视频，1 图为首帧，2 图为首尾帧，3 图及以上为全能多参考。</p>` : usingNuyoahSkill ? `${skillSelect}<p class="field-note">连接至少一张参考图即可反推；输出不会加入署名、水印或额外文字。</p>` : usingMinimalistProductAdSkill ? `${skillSelect}<div class="node-field-row answer-h3-settings"><div class="node-field"><label>H3 模式</label><select class="node-select node-interactive" data-answer-product-ad-h3-mode="${node.id}" aria-label="极简产品广告 H3 模式">${h3AnswerModeOptions.map(item => `<option value="${item.value}"${productAdH3Mode === item.value ? " selected" : ""}>${item.label}</option>`).join("")}</select></div><div class="node-field"><label>视频时长</label><select class="node-select node-interactive" data-answer-product-ad-duration="${node.id}" aria-label="极简产品广告视频时长">${durationOptions(productAdDurationOptions, productAdDuration)}</select></div></div><p class="field-note">自动识别：无图为文生视频，1 图为首帧，2 图为首尾帧，3 图及以上为全能多参考。手动选择全能多参考时，单张图也会按 Ref2VA 结构输出，但不会新增参考图。</p>` : usingBrandPromoVideoSkill ? `${skillSelect}<div class="node-field-row answer-h3-settings"><div class="node-field"><label>H3 模式</label><select class="node-select node-interactive" data-answer-brand-promo-h3-mode="${node.id}" aria-label="品牌宣传短片 H3 模式">${h3AnswerModeOptions.map(item => `<option value="${item.value}"${brandPromoH3Mode === item.value ? " selected" : ""}>${item.label}</option>`).join("")}</select></div><div class="node-field"><label>视频时长</label><select class="node-select node-interactive" data-answer-brand-promo-duration="${node.id}" aria-label="品牌宣传短片视频时长">${durationOptions(brandPromoDurationOptions, brandPromoDuration)}</select></div></div><p class="field-note">自动识别：无图为文生视频，1 图为首帧，2 图为首尾帧，3 图及以上为全能多参考。手动选择全能多参考时，单张图也会按 Ref2VA 结构输出，但不会新增参考图。</p>` : skillSelect;
  const { answerText, runLabel } = answerNodeText(node);
  const responseClass = node.error ? " is-error" : node.answer ? " is-ready" : "";
  const expandLabel = node.answerExpanded ? "收起回答" : "展开回答";
  return `<article class="canvas-node answer-node${selected}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, "message-square-text")}<div class="node-body answer-body"><div class="node-field answer-model-field"><label>模型</label><select class="node-select node-interactive" data-answer-model="${node.id}" aria-label="回答模型">${modelOptions}</select></div><div class="answer-inputs">${promptSlots}${imageSlots}</div>${deepseekSettings}${skillSettings}<div class="answer-add-inputs"><button class="add-input-button node-interactive" type="button" data-add-answer-prompt-input="${node.id}"${node.promptSlots >= 6 ? " disabled" : ""}>${icon("plus")} 添加提示词输入</button><button class="add-input-button node-interactive" type="button" data-add-answer-image-input="${node.id}"${node.inputSlots >= 8 ? " disabled" : ""}>${icon("image-plus")} 添加参考图输入</button></div><button class="run-node-button node-interactive" type="button" data-run-answer="${node.id}"${node.status === "running" ? " disabled" : ""}>${icon(node.status === "running" ? "loader-circle" : "send-horizontal")} ${runLabel}</button><div class="answer-response-wrap${node.answerExpanded ? " is-expanded" : ""}"><div class="answer-response-heading"><span>回答内容</span><span class="answer-response-actions"><button class="answer-response-toggle node-interactive" type="button" data-copy-answer="${node.id}" aria-label="复制回答" data-tooltip="复制回答">${icon("copy")}</button><button class="answer-response-toggle node-interactive" type="button" data-toggle-answer-response="${node.id}" aria-label="${expandLabel}">${icon(node.answerExpanded ? "chevron-up" : "chevron-down")} ${expandLabel}</button></span></div><div class="answer-response node-interactive${responseClass}" data-answer-selectable="${node.id}">${escapeHtml(answerText)}</div></div></div></div>${resizeHandleHtml(node)}${Array.from({ length: node.promptSlots }, (_, index) => portHtml(node, answerPromptPortId(index), "prompt", "input", index ? `提示词 ${index + 1}` : "提示词", answerPromptPortTop(index))).join("")}${Array.from({ length: node.inputSlots }, (_, index) => portHtml(node, `image-${index}`, "image", "input", `参考图 ${index + 1}`, answerImagePortTop(node, index))).join("")}</article>`;
}

function bindNodeEvents() {
  speechController.bind(nodeLayer);
  $$('[data-answer-selectable]').forEach(element => { element.tabIndex = 0; });
  $$(".canvas-node").forEach(element => element.addEventListener("pointerdown", handleNodePointerDown));
  $$('[data-node-drag-handle]').forEach(handle => handle.addEventListener("pointerdown", event => { if (event.target.closest(".node-interactive, .node-port")) return; event.preventDefault(); event.stopPropagation(); startNodeDrag(event, handle.dataset.nodeDragHandle); }));
  $$('[data-node-resize]').forEach(handle => handle.addEventListener("pointerdown", startResize));
  $$('[data-preview-node], [data-reference-drag-node]').forEach(element => element.addEventListener("pointerdown", event => startNodeDrag(event, element.dataset.previewNode || element.dataset.referenceDragNode)));
  $$('[data-download-node]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); const node = findNode(button.dataset.downloadNode); if (node) downloadNode(node); }));
  $$('[data-crop-node]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); openCropDialog(button.dataset.cropNode); }));
  $$('[data-layer-edit]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); void openNodeLayerEditor(button.dataset.layerEdit); }));
  $$('[data-local-edit]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();void openNodeLocalEditor(button.dataset.localEdit);}));
  $$('[data-midjourney-upscale]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); void upscaleMidjourneyCandidate(button.dataset.midjourneyUpscale, Number(button.dataset.midjourneySlot)); }));
  $$('[data-import-video]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); pendingVideoImportNodeId = button.dataset.importVideo; pendingVideoReferenceNodeId = null; pendingVideoPreviewUploadNodeId = null; videoFileInput.value = ""; videoFileInput.click(); }));
  $$('[data-upload-preview-video]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); pendingVideoPreviewUploadNodeId = button.dataset.uploadPreviewVideo; pendingVideoImportNodeId = null; pendingVideoReferenceNodeId = null; videoFileInput.value = ""; videoFileInput.click(); }));
  $$('[data-upload-video-reference]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); pendingVideoReferenceNodeId = button.dataset.uploadVideoReference; pendingVideoImportNodeId = null; pendingVideoPreviewUploadNodeId = null; videoFileInput.value = ""; videoFileInput.click(); }));
  $$('[data-upload-audio-reference]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); pendingAudioReferenceNodeId = button.dataset.uploadAudioReference; pendingAudioReferenceSlot = Number(button.dataset.audioSlot) || 1; audioFileInput.value = ""; audioFileInput.click(); }));
  $$('[data-compose-video]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); composeVideoEditor(button.dataset.composeVideo); }));
  $$('[data-clip-field]').forEach(input => { input.addEventListener("pointerdown", event => event.stopPropagation()); input.addEventListener("change", event => updateVideoClip(input.dataset.editorNode, input.dataset.clipId, input.dataset.clipField, event.target.value)); });
  $$('[data-video-play]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); toggleVideoEditorPlayback(button.dataset.videoPlay); }));
  $$('[data-video-split]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); splitVideoClipAtPlayhead(button.dataset.videoSplit); }));
  $$('[data-video-timeline]').forEach(track => track.addEventListener("click", event => {
    if (event.target.closest("[data-video-playhead]")) return;
    const node = findNode(track.dataset.videoTimeline); if (!node) return;
    const time = videoTimelinePoint(node, event.clientX, track); const entry = videoTimelineEntryAt(node, time);
    setVideoTimelinePlayhead(node.id, time, entry?.clip.id || "");
  }));
  $$('[data-video-playhead]').forEach(handle => handle.addEventListener("pointerdown", event => {
    event.preventDefault(); event.stopPropagation(); const node = findNode(handle.dataset.videoPlayhead); const track = handle.closest("[data-video-timeline]"); if (!node || !track) return; stopVideoEditorPreview(node); holdVideoPreviewFrame(node.id);
    const update = moveEvent => { const time = videoTimelinePoint(node, moveEvent.clientX, track); node.timelinePlayhead = time; const entry = videoTimelineEntryAt(node, time); node.selectedClipId = entry?.clip.id || node.selectedClipId || ""; updateTimelinePlayheadDom(node); };
    const finish = moveEvent => { update(moveEvent); document.removeEventListener("pointermove", update); document.removeEventListener("pointerup", finish); renderInspector(); scheduleSave(); };
    document.addEventListener("pointermove", update); document.addEventListener("pointerup", finish, { once: true });
  }));
  $$('[data-video-clip]').forEach(card => {
    card.addEventListener("click", event => { event.stopPropagation(); const node = findNode(card.dataset.editorNode); const track = card.closest("[data-video-timeline]"); if (!node || !track) return; const time = videoTimelinePoint(node, event.clientX, track); setVideoTimelinePlayhead(node.id, time, card.dataset.videoClip); });
    card.addEventListener("contextmenu", event => openVideoClipContextMenu(event, card.dataset.editorNode, card.dataset.videoClip));
    card.addEventListener("dragstart", event => { event.stopPropagation(); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", JSON.stringify({ nodeId: card.dataset.editorNode, clipId: card.dataset.videoClip })); card.classList.add("is-dragging"); });
    card.addEventListener("dragend", () => { card.classList.remove("is-dragging"); $$(".video-clip-card").forEach(item => item.classList.remove("drop-before", "drop-after")); });
    card.addEventListener("dragover", event => { event.preventDefault(); event.stopPropagation(); const rect = card.getBoundingClientRect(); card.classList.toggle("drop-before", event.clientX < rect.left + rect.width / 2); card.classList.toggle("drop-after", event.clientX >= rect.left + rect.width / 2); });
    card.addEventListener("dragleave", () => card.classList.remove("drop-before", "drop-after"));
    card.addEventListener("drop", event => { event.preventDefault(); event.stopPropagation(); let payload; try { payload = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { payload = null; } const rect = card.getBoundingClientRect(); if (payload?.nodeId === card.dataset.editorNode) reorderVideoClip(payload.nodeId, payload.clipId, card.dataset.videoClip, event.clientX < rect.left + rect.width / 2); card.classList.remove("drop-before", "drop-after"); });
  });
  $$('[data-clip-probe]').forEach(video => video.addEventListener("loadedmetadata", () => probeVideoClip(video.dataset.clipProbeNode, video.dataset.clipProbe, video.duration)));
  $$('[data-preview-composite]').forEach(video => {
    video.addEventListener("loadedmetadata", () => { const node = findNode(video.dataset.previewComposite); const frame = videoPreviewFrame(node); if (!frame) return; video.currentTime = frame.currentTime; if (frame.currentTime <= .01) revealVideoPreviewFrame(video); });
    video.addEventListener("seeked", () => revealVideoPreviewFrame(video));
    video.addEventListener("timeupdate", () => handleVideoPreviewTimeUpdate(video));
    video.addEventListener("ended", () => { const node = findNode(video.dataset.previewComposite); const frame = videoPreviewFrame(node); if (!frame || !frame.editor.previewPlaying) return; if (frame.entry.index < videoTimelineEntries(frame.editor).entries.length - 1) advanceVideoPreview(video, frame.editor); else finishVideoEditorPlayback(frame.editor); });
  });
  $$('[data-export-preview]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); void exportVideoPreview(button.dataset.exportPreview); }));

  $$('[data-node-menu]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); selectNode(button.dataset.nodeMenu); }));
  $$("[data-node-rename]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); startNodeTitleEdit(button.dataset.nodeRename); }));
  $$("[data-node-title]").forEach(title => title.addEventListener("dblclick", event => { event.stopPropagation(); startNodeTitleEdit(title.dataset.nodeTitle); }));
  $$('[data-toggle-prompt]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); const node = findNode(button.dataset.togglePrompt); if (!node || node.type !== "prompt") return; recordHistory(); node.disabled = !node.disabled; renderCanvas(); renderInspector(); scheduleSave(); toast(node.disabled ? "提示词节点已禁用" : "提示词节点已启用"); }));
  $$('[data-toggle-prompt-quick]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); const node = findNode(button.dataset.togglePromptQuick); if (!node || node.type !== "prompt") return; recordHistory(); node.promptQuickControlsVisible = node.promptQuickControlsVisible === false; renderCanvas(); renderInspector(); scheduleSave(); toast(node.promptQuickControlsVisible ? "已显示快捷镜头" : "已隐藏快捷镜头"); }));
  $$('[data-toggle-image]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); const node = findNode(button.dataset.toggleImage); if (!node || node.type !== "image") return; recordHistory(); node.disabled = !node.disabled; renderCanvas(); renderInspector(); scheduleSave(); toast(node.disabled ? "参考图节点已禁用" : "参考图节点已启用"); }));
  $$('[data-save-prompt-preset]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); void savePromptPreset(button.dataset.savePromptPreset); }));
  $$('[data-rename-prompt-preset]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); void renamePromptPreset(button.dataset.renamePromptPreset); }));
  $$('[data-delete-prompt-preset]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); void deletePromptPreset(button.dataset.deletePromptPreset); }));
  $$('[data-prompt-preset]').forEach(select => select.addEventListener("change", event => { event.stopPropagation(); if (event.target.value) applyPromptPreset(select.dataset.promptPreset, event.target.value); }));
  $$('[data-prompt-quick-trigger]').forEach(trigger => trigger.addEventListener("pointerdown", event => {
    event.stopPropagation(); rememberPromptQuickSelection(trigger.dataset.promptQuickNode);
  }));
  $$('[data-prompt-quick-option]').forEach(option => option.addEventListener("click", event => {
    event.preventDefault(); event.stopPropagation(); const dropdown = option.closest("details"); const control = option; const node = findNode(control.dataset.promptQuickNode); if (!node) return;
    if (applyPromptQuickField(control, control.dataset.promptQuickValue)) {
      const trigger = dropdown?.querySelector("[data-prompt-quick-label]"); const label = promptQuickParamOptions[control.dataset.promptQuickField]?.options.find(([id]) => id === control.dataset.promptQuickValue)?.[1] || (control.dataset.promptQuickField === "secondsStart" || control.dataset.promptQuickField === "secondsEnd" ? (control.dataset.promptQuickValue === "" ? "未指定" : `${control.dataset.promptQuickValue}秒`) : "未指定");
      if (trigger) { trigger.textContent = label; trigger.dataset.promptQuickValue = control.dataset.promptQuickValue; } if (dropdown) dropdown.open = false;
    }
  }));
  $$('[data-prompt-reference-node]').forEach(thumb => {
    thumb.addEventListener("pointerdown", () => rememberPromptQuickSelection(thumb.dataset.promptReferenceNode));
    thumb.addEventListener("click", event => { event.stopPropagation(); if (promptReferenceClickTimer) clearTimeout(promptReferenceClickTimer); promptReferenceClickTimer = setTimeout(() => { promptReferenceClickTimer = null; insertPromptReferenceToken(thumb.dataset.promptReferenceNode, thumb.dataset.promptReferenceIndex); }, 190); });
    thumb.addEventListener("dblclick", event => { event.preventDefault(); event.stopPropagation(); if (promptReferenceClickTimer) clearTimeout(promptReferenceClickTimer); promptReferenceClickTimer = null; disconnectPromptReference(thumb.dataset.promptReferenceNode, thumb.dataset.promptReferenceSource); });
  });
  $$('[data-prompt-content]').forEach(editor => {
    ["keyup", "mouseup", "focus", "select"].forEach(eventName => editor.addEventListener(eventName, () => { rememberPromptQuickSelection(editor.dataset.promptContent); rememberPromptFormatSelection(editor.dataset.promptContent); }));
    editor.addEventListener("paste", event => { if (pastePromptPlainText(event.currentTarget, event)) event.stopPropagation(); });
    editor.addEventListener("input", event => { const node = findNode(editor.dataset.promptContent); if (node) { syncPromptEditorNode(event.currentTarget, node); rememberPromptQuickSelection(node.id); rememberPromptFormatSelection(node.id); scheduleSave(); } });
  });
$$('[data-note-content]').forEach(textarea => textarea.addEventListener("input", event => { const note = findNode(textarea.dataset.noteContent); if (note?.type === "note") { note.content = event.target.value; scheduleSave(); } }));
  $$('[data-composition-perspective]').forEach(button => button.addEventListener("click", event => {
    event.stopPropagation(); const node = findNode(button.dataset.compositionNode); if (!node || node.type !== "composition") return;
    recordHistory(); const composition = normalizePromptComposition(node.composition); const value = composition.perspective === button.dataset.compositionPerspective ? null : button.dataset.compositionPerspective; node.composition = normalizePromptComposition({ ...composition, perspective: value }); applyCompositionToLinkedPrompts(node.id); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$('[data-horizon-canvas]').forEach(canvas => { canvas.addEventListener("pointerdown", startHorizonCompositionDrag); canvas.addEventListener("pointermove", moveHorizonCompositionDrag); canvas.addEventListener("pointerup", finishHorizonCompositionDrag); canvas.addEventListener("pointercancel", finishHorizonCompositionDrag); });
$$('[data-confirm-horizon]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); const node = findNode(button.dataset.confirmHorizon); if (!node || node.type !== "composition") return; const composition = normalizePromptComposition(node.composition); if (!composition.horizonPending) return; recordHistory(); node.composition = normalizePromptComposition({ ...composition, horizonEnabled: true, horizonPending: false }); applyCompositionToLinkedPrompts(node.id); renderCanvas(); renderInspector(); scheduleSave(); toast("地平线已写入提示词"); }));
  $$('[data-composition-panel]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); const node = findNode(button.dataset.compositionNode); if (!node || node.type !== "composition") return; const composition = normalizePromptComposition(node.composition); const panel = button.dataset.compositionPanel === "expression" ? "expression" : "parameters"; if (composition.panel === panel) return; node.composition = normalizePromptComposition({ ...composition, panel }); renderCanvas(); renderInspector(); scheduleSave(); }));  $$('[data-composition-field]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); const node = findNode(button.dataset.compositionNode); if (!node || node.type !== "composition") return; recordHistory(); const field = button.dataset.compositionField; const composition = normalizePromptComposition(node.composition); const value = composition[field] === button.dataset.compositionValue ? null : button.dataset.compositionValue; node.composition = normalizePromptComposition({ ...composition, [field]: value }); applyCompositionToLinkedPrompts(node.id); renderCanvas(); renderInspector(); scheduleSave(); })); $$('[data-prompt-text-resize], [data-prompt-composition-width-resize]').forEach(handle => { handle.addEventListener("pointerdown", startPromptLayoutResize); handle.addEventListener("pointermove", movePromptLayoutResize); handle.addEventListener("pointerup", finishPromptLayoutResize); handle.addEventListener("pointercancel", finishPromptLayoutResize); });
  $$('[data-preview-node]').forEach(image => image.addEventListener("dblclick", event => { event.stopPropagation(); const node = findNode(image.dataset.previewNode); if (node) openPreview(node); }));
  $$('[data-preview-video]').forEach(video => video.addEventListener("dblclick", event => { event.stopPropagation(); const node = findNode(video.dataset.previewVideo); if (node) openVideoPreview(node); }));
  $$('[data-video-field]').forEach(control => control.addEventListener("change", event => {
    const node = findNode(control.dataset.nodeId); if (!node || node.mediaType !== "video") return;
    const field = control.dataset.videoField;
    if (node.status === "running") { renderCanvas(); return toast("请等待本次视频生成结束再调整参数", true); }
    if (field === 'mode' && control.value === 'reference' && incomingEdge(node.id, 'audio-reference-2')) {
      renderCanvas(); return toast('请先断开参考音频 2，再切换到单音频工作流', true);
    }
    if (field === "mode" && control.value === "reference" && state.edges.some(edge => edge.target === node.id && /^image-[678]$/.test(edge.targetPort))) {
      renderCanvas(); return toast("请先断开参考图 7 至 9 的连线，再切换到六图工作流", true);
    }
    if (isWenwu(node) && ((field === "megapixels" && !validMegapixels(control.valueAsNumber)) || (field === "multiple" && !validMultiple(control.valueAsNumber)))) {
      renderCanvas(); return toast("百万像素可填 0.1 至 16，对齐倍数可填 8 至 128 的 4 的倍数", true);
    }
    recordHistory();
    if (field === "seconds") node.videoSeconds = Math.min(runningHubVideoMode(node).maxSeconds, Math.max(5, Number(event.target.value) || 6));
    else if (field === "mode") {
      const mode = control.value === "wenwu" ? "wenwu" : "reference";
      node.videoSettingsByMode ||= {};
      node.videoSettingsByMode[node.videoMode] = { videoAspect: node.videoAspect, videoMegapixels: node.videoMegapixels, videoSeconds: node.videoSeconds, videoMultiple: node.videoMultiple };
      const previous = node.videoSettingsByMode[mode];
      Object.assign(node, previous || (mode === "wenwu" ? wenwuDefaults : { videoAspect: "16:9", videoMegapixels: 0.9, videoSeconds: 6 }));
      node.videoMode = mode;
      node.inputSlots = runningHubVideoMode(node).inputs.length;
      node.height = Math.max(node.height, nodeHeight("video-generator", node.inputSlots, node.promptSlots));
    }
    else if (isWenwu(node) && field === "aspect") node.videoAspect = control.value;
    else if (isWenwu(node) && field === "megapixels") node.videoMegapixels = control.valueAsNumber;
    else if (isWenwu(node) && field === "multiple") node.videoMultiple = control.valueAsNumber;
    else if (field === "aspect") node.videoAspect = runningHubVideoAspects.includes(event.target.value) ? event.target.value : "16:9";
    else if (field === "megapixels") node.videoMegapixels = runningHubVideoMegapixelOptions.some(item => item.value === Number(event.target.value)) ? Number(event.target.value) : .9;
    renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$('[data-generator-field]').forEach(control => control.addEventListener("change", event => {
    const node = findNode(control.dataset.nodeId); if (!node) return;
    if (node.activeJobId && (isArkProvider(node.provider) || /^ark(?:-plan)?:/.test(String(event.target.value)))) { renderCanvas(); return toast("请等待当前生成任务完成后再切换参数", true); }
    recordHistory();
    const field = control.dataset.generatorField;
    if (field === "providerModel") {
      const selection = event.target.value;
      const wasMoss = node.provider === "runninghub-moss";
      if (wasMoss) node.mossSelectedAspect = mossAspect(node.aspect);
      node.provider = selection.startsWith("ark-plan:") ? "ark-plan" : selection.startsWith("ark:") ? "ark" : image2Models.some(item => item.id === selection) ? "image2" : ["runninghub-krea2", "runninghub-moss"].includes(selection) ? selection : midjourneyImageModels.some(item => item.id === selection) ? "midjourney" : "moyu";
      if (node.provider === "image2") {
        node.image2Model = selection;
        node.quality = image25AdvancedQualityForNode(node) ? "auto" : fixedGeneratorSettings.quality;
      }
      if (isArkProvider(node.provider)) { node.arkModel = selection.slice(selection.indexOf(":") + 1); delete node.arkOperation; }
      if (node.provider === "moyu") node.moyuModel = seedreamImageModels.some(item => item.id === selection) ? selection : seedreamImageModels[0].id;
      if (node.provider === "runninghub-moss") {
        if (!wasMoss) node.previousImageAspect = sizeMap[node.aspect] ? node.aspect : fixedGeneratorSettings.aspect;
        node.aspect = mossAspect(node.mossSelectedAspect || node.aspect);
      } else node.aspect = wasMoss ? (sizeMap[node.previousImageAspect] ? node.previousImageAspect : fixedGeneratorSettings.aspect) : sizeMap[node.aspect] ? node.aspect : fixedGeneratorSettings.aspect;
      node.outputSize = normalizeGeneratorOutputSize(node);
      const provider = generatorProviderForNode(node);
      if (["GPT Image 2", ...image2Models.map(item => item.label), "豆包 Seedream", "Midjourney Fast", "K2 白玉", "MOSS", "生图", "火山引擎 Seedream", "火山套餐 Seedream"].includes(node.name)) node.name = isArkProvider(node.provider) ? provider.label : node.provider === "moyu" ? "豆包 Seedream" : node.provider === "midjourney" ? "Midjourney Fast" : node.provider === "runninghub-krea2" ? "K2 白玉" : node.provider === "runninghub-moss" ? "MOSS" : image2ModelLabel(node.image2Model);
      toast(`已切换为 ${provider.label} · ${provider.model}`);
    } else if (field === "kreaPreset") {
      const preset = krea2PresetDimensions[event.target.value];
      if (preset) { node.kreaWidth = preset[0]; node.kreaHeight = preset[1]; }
    } else if (field === "kreaWidth" || field === "kreaHeight") {
      const dimensions = krea2Dimensions(node); const value = Math.min(4096, Math.max(32, Math.round((Number(event.target.value) || dimensions[field === "kreaWidth" ? "width" : "height"]) / 32) * 32));
      node[field] = value; event.target.value = String(value);
    } else { node[field] = field === "batch" ? Number(event.target.value) : event.target.value; if (field === "aspect" && node.provider === "runninghub-moss") node.mossSelectedAspect = mossAspect(node.aspect); }
    renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$('[data-add-prompt-input]').forEach(button => button.addEventListener("click", event => {
    event.stopPropagation(); const node = findNode(button.dataset.addPromptInput); if (!node || node.type !== "generator" || node.promptSlots >= 6) return;
    recordHistory(); node.promptSlots += 1; node.height = node.mediaType === "video" ? nodeHeight("video-generator", node.inputSlots, node.promptSlots) : nodeHeight("generator", node.inputSlots, node.promptSlots); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$('[data-add-input]').forEach(button => button.addEventListener("click", event => {
    event.stopPropagation(); const node = findNode(button.dataset.addInput); if (!node || node.inputSlots >= generatorReferenceLimit(node)) return;
    recordHistory(); node.inputSlots += 1; node.height = node.mediaType === "video" ? nodeHeight("video-generator", node.inputSlots, node.promptSlots) : nodeHeight("generator", node.inputSlots, node.promptSlots); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$('[data-run-node]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); runGeneratorNode(button.dataset.runNode); }));
  $$('[data-add-answer-prompt-input]').forEach(button => button.addEventListener("click", event => {
    event.stopPropagation(); const node = findNode(button.dataset.addAnswerPromptInput); if (!node || node.type !== "answer" || node.promptSlots >= 6) return;
    recordHistory(); node.promptSlots += 1; node.height = nodeHeight("answer", node.inputSlots, node.promptSlots); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$('[data-add-answer-image-input]').forEach(button => button.addEventListener("click", event => {
    event.stopPropagation(); const node = findNode(button.dataset.addAnswerImageInput); if (!node || node.type !== "answer" || node.inputSlots >= 8) return;
    recordHistory(); node.inputSlots += 1; node.height = Math.max(Number(node.height) || 0, answerNodeHeight(node)); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$('[data-copy-answer]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); copyAnswerText(button.dataset.copyAnswer); }));
  $$('[data-toggle-answer-response]').forEach(button => button.addEventListener("click", event => {
    event.stopPropagation(); const node = findNode(button.dataset.toggleAnswerResponse); if (!node || node.type !== "answer") return;
    recordHistory(); node.answerExpanded = !node.answerExpanded; renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$("[data-run-answer]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); runAnswerNode(button.dataset.runAnswer); }));
  $$('[data-answer-model]').forEach(control => control.addEventListener("change", event => {
    const node = findNode(control.dataset.answerModel); if (!node || node.type !== "answer") return;
    recordHistory(); node.model = normalizedAnswerModel(event.target.value); node.height = Math.max(320, Math.max(Number(node.height) || 0, answerNodeHeight(node)));
    if (!updateAnswerModelDom(node)) renderCanvas();
    renderInspector(); scheduleSave();
  }));
  $$(".answer-deepseek-settings").forEach(bindAnswerDeepseekControls);
  $$("[data-answer-skill]").forEach(control => control.addEventListener("change", event => {
    event.stopPropagation(); const node = findNode(control.dataset.answerSkill); if (!node || node.type !== "answer") return;
    recordHistory(); const previousExtraHeight = answerSkillExtraHeight(node.answerSkill); node.answerSkill = normalizedAnswerSkill(event.target.value); const nextExtraHeight = answerSkillExtraHeight(node.answerSkill); node.height = Math.max(answerNodeHeight(node), (Number(node.height) || answerNodeHeight(node)) + nextExtraHeight - previousExtraHeight); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$("[data-answer-h3-mode]").forEach(control => control.addEventListener("change", event => {
    event.stopPropagation(); const node = findNode(control.dataset.answerH3Mode); if (!node || node.type !== "answer") return;
    recordHistory(); node.h3Mode = normalizedH3AnswerMode(event.target.value); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$("[data-answer-product-ad-h3-mode]").forEach(control => control.addEventListener("change", event => {
    event.stopPropagation(); const node = findNode(control.dataset.answerProductAdH3Mode); if (!node || node.type !== "answer") return;
    recordHistory(); node.productAdH3Mode = normalizedH3AnswerMode(event.target.value); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$("[data-answer-brand-promo-h3-mode]").forEach(control => control.addEventListener("change", event => {
    event.stopPropagation(); const node = findNode(control.dataset.answerBrandPromoH3Mode); if (!node || node.type !== "answer") return;
    recordHistory(); node.brandPromoH3Mode = normalizedH3AnswerMode(event.target.value); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$("[data-answer-h3-duration]").forEach(control => control.addEventListener("change", event => {
    event.stopPropagation(); const node = findNode(control.dataset.answerH3Duration); if (!node || node.type !== "answer") return;
    recordHistory(); node.h3Duration = normalizedH3Duration(event.target.value); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$("[data-answer-product-ad-duration]").forEach(control => control.addEventListener("change", event => {
    event.stopPropagation(); const node = findNode(control.dataset.answerProductAdDuration); if (!node || node.type !== "answer") return;
    recordHistory(); node.productAdDuration = normalizedProductAdDuration(event.target.value, 10); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$("[data-answer-brand-promo-duration]").forEach(control => control.addEventListener("change", event => {
    event.stopPropagation(); const node = findNode(control.dataset.answerBrandPromoDuration); if (!node || node.type !== "answer") return;
    recordHistory(); node.brandPromoDuration = normalizedBrandPromoDuration(event.target.value, 15); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$("[data-upload-node]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); const nodeId = button.dataset.uploadNode; if (suppressReferenceUploadNodeId === nodeId) { suppressReferenceUploadNodeId = null; return; } triggerReferenceUpload(nodeId); }));
  $$(".node-port").forEach(port => port.addEventListener("pointerdown", startConnection));
  refreshIcons();
}
function renderCanvasSelection() { $$(".canvas-node").forEach(element => element.classList.toggle("is-selected", state.selectedIds.includes(element.dataset.nodeId))); }
function selectNode(id, additive = false) {
  if (!findNode(id)) return; selectedEdgeId = null;
  if (additive) state.selectedIds = state.selectedIds.includes(id) ? state.selectedIds.filter(item => item !== id) : [...state.selectedIds, id]; else state.selectedIds = [id];
  renderCanvasSelection(); renderEdges(); renderLibrary(); renderInspector();
}
function setActiveTool(tool) { if (!state) return; state.tool = tool; $$('[data-tool]').forEach(button => button.classList.toggle("is-active", button.dataset.tool === tool)); workspace.style.cursor = tool === "hand" ? "grab" : "default"; }
function screenToScene(clientX, clientY) { const rect = workspace.getBoundingClientRect(); return { x: (clientX - rect.left - state.viewport.x) / state.viewport.scale, y: (clientY - rect.top - state.viewport.y) / state.viewport.scale }; }
function sceneCenter() { const rect = workspace.getBoundingClientRect(); return screenToScene(rect.left + rect.width / 2, rect.top + rect.height / 2); }
function workspacePoint(clientX, clientY) { const rect = workspace.getBoundingClientRect(); return { x: clientX - rect.left, y: clientY - rect.top }; }
function rectFromScenePoints(a, b) { return { left: Math.min(a.x, b.x), top: Math.min(a.y, b.y), right: Math.max(a.x, b.x), bottom: Math.max(a.y, b.y) }; }
function rectIntersectsNode(rect, node) { return node.x < rect.right && node.x + node.width > rect.left && node.y < rect.bottom && node.y + node.height > rect.top; }
function clearNativeTextSelection() { window.getSelection?.()?.removeAllRanges(); }
function allowsCanvasTextSelection(target) { const element = target instanceof Element ? target : target?.parentElement; return Boolean(element?.closest("input, textarea, [contenteditable=true], .answer-response")); }
function selectedAnswerResponse() { const active = document.activeElement instanceof Element ? document.activeElement.closest(".answer-response") : null; if (active) return active; const selection = window.getSelection(); const anchor = selection?.anchorNode; const element = anchor instanceof Element ? anchor : anchor?.parentElement; return element?.closest(".answer-response") || null; }
function selectAnswerResponse(response) { const selection = window.getSelection(); if (!response || !selection) return; const range = document.createRange(); range.selectNodeContents(response); selection.removeAllRanges(); selection.addRange(range); }
function beginSelectionBox(event) {
  if (!state || event.button !== 0) return;
  event.preventDefault(); event.stopPropagation(); clearNativeTextSelection();
  selectionSession = { additive: event.shiftKey, moved: false, startScene: screenToScene(event.clientX, event.clientY), startWorkspace: workspacePoint(event.clientX, event.clientY), currentScene: null, currentWorkspace: null, before: [...state.selectedIds] };
  selectedEdgeId = null;
  renderEdges(); renderInspector();
  selectionRect.hidden = false;
  selectionRect.style.left = `${selectionSession.startWorkspace.x}px`;
  selectionRect.style.top = `${selectionSession.startWorkspace.y}px`;
  selectionRect.style.width = "0px";
  selectionRect.style.height = "0px";
}
function updateSelectionBox(event) {
  if (!selectionSession) return;
  const workspacePos = workspacePoint(event.clientX, event.clientY);
  const scenePos = screenToScene(event.clientX, event.clientY);
  selectionSession.currentWorkspace = workspacePos;
  selectionSession.currentScene = scenePos;
  const left = Math.min(selectionSession.startWorkspace.x, workspacePos.x);
  const top = Math.min(selectionSession.startWorkspace.y, workspacePos.y);
  const width = Math.abs(workspacePos.x - selectionSession.startWorkspace.x);
  const height = Math.abs(workspacePos.y - selectionSession.startWorkspace.y);
  selectionSession.moved = width > 4 || height > 4;
  selectionRect.style.left = `${left}px`;
  selectionRect.style.top = `${top}px`;
  selectionRect.style.width = `${width}px`;
  selectionRect.style.height = `${height}px`;
}
function finishSelectionBox() {
  if (!selectionSession) return;
  const session = selectionSession;
  selectionSession = null;
  selectionRect.hidden = true;
  if (!state) return;
  const sceneEnd = session.currentScene || session.startScene;
  const rect = rectFromScenePoints(session.startScene, sceneEnd);
  const hitIds = state.nodes.filter(node => node.type !== "loading" && rectIntersectsNode(rect, node)).map(node => node.id);
  if (session.moved) state.selectedIds = session.additive ? [...new Set([...session.before, ...hitIds])] : hitIds;
  else if (!session.additive) state.selectedIds = [];
  selectedEdgeId = null;
  clearNativeTextSelection();
  renderCanvasSelection(); renderEdges(); renderLibrary(); renderInspector();
}
function handleNodePointerDown(event) {
  if (event.target.closest(".node-interactive, .node-port")) return;
  startNodeDrag(event, event.currentTarget.dataset.nodeId);
}
function startNodeDrag(event, nodeId) {
  const node = findNode(nodeId);
  if (!node) return;
  if (state.tool === "hand" || spacePressed || event.button === 1) return startPan(event);
  event.preventDefault(); event.stopPropagation(); clearNativeTextSelection();
  const alreadySelected = state.selectedIds.includes(nodeId);
  if (event.shiftKey) selectNode(nodeId, true);
  else if (!alreadySelected || state.selectedIds.length <= 1) selectNode(nodeId, false);
  const point = screenToScene(event.clientX, event.clientY);
  const movingIds = node.type === "frame" ? [...new Set([node.id, ...frameContainedNodes(node).map(item => item.id)])] : (alreadySelected ? [...state.selectedIds] : state.selectedIds);
  const elements = movingIds.map(id => ({ id, element: canvasNodeElement(id) })).filter(item => item.element);
  dragSession = { start: point, moved: false, before: snapshot(), origins: movingIds.map(id => { const item = findNode(id); return { id, x: item.x, y: item.y }; }), elements, elementById: new Map(elements.map(item => [item.id, item.element])) };
  workspace.classList.add("is-flow-interacting"); dragSession.elements.forEach(item => { item.element.classList.add("is-dragging"); item.element.style.willChange = "transform"; });
}
function resizeMinimum(node) {
  if(node.type==='speech') return {width:340,height:560};
  if(node.type==='audio') return {width:340,height:300};
  if (node.type === "frame") return { width: 320, height: 220 };
  if (node.type === "generator") {
    const element = canvasNodeElement(node.id);
    const button = element?.querySelector(".run-node-button");
    const scale = Math.max(0.01, Number(state?.viewport?.scale) || 1);
    const elementRect = element?.getBoundingClientRect();
    // Keep the action button visible while allowing the lower status line to be clipped when shrinking.
    const contentHeight = element && button && elementRect
      ? (button.getBoundingClientRect().bottom - elementRect.top) / scale + 12
      : 0;
    return { width: 300, height: Math.max(250, Math.ceil(contentHeight)) };
  }
  if (node.type === "video-editor") return { width: 440, height: 300 };
  if (node.type === "video-preview") return { width: 280, height: 280 };
  if (node.type === "answer") return { width: 320, height: 400 };
  if (node.type === "prompt") return { width: 240, height: 180 };
  if (node.type === "composition") return { width: 300, height: 365 };
  if (node.type === "note") return { width: 170, height: 130 };
  return { width: 210, height: 240 };
}
function startResize(event) {
  event.preventDefault(); event.stopPropagation(); const node = findNode(event.currentTarget.dataset.nodeResize); if (!node) return;
  selectNode(node.id); const point = screenToScene(event.clientX, event.clientY); const corner = event.currentTarget.dataset.nodeResizeCorner || "se"; resizeSession = { nodeId: node.id, corner, start: point, moved: false, before: snapshot(), origin: { x: node.x, y: node.y, width: node.width, height: node.height }, element: canvasNodeElement(node.id) };
  workspace.classList.add("is-flow-interacting"); if (resizeSession.element) resizeSession.element.style.willChange = "width, height";
}
function startPan(event) { event.preventDefault(); clearNativeTextSelection(); panSession = { clientX: event.clientX, clientY: event.clientY, x: state.viewport.x, y: state.viewport.y, moved: false, clearSelectionOnClick: event.button === 0 && state.tool !== "hand" && !spacePressed }; workspace.classList.add("is-panning", "is-flow-interacting"); }
function startConnection(event) {
  closeConnectionMenu();
  event.stopPropagation(); event.preventDefault(); const port = event.currentTarget;
  connectionDraft = { nodeId: port.dataset.nodeId, portId: port.dataset.portId, dataType: port.dataset.dataType, direction: port.dataset.direction, current: screenToScene(event.clientX, event.clientY) }; workspace.classList.add("is-flow-interacting");
  $$(".node-port").forEach(item => { const wrap = item.closest(".node-port-wrap"); const compatible = item.dataset.direction !== connectionDraft.direction && item.dataset.dataType === connectionDraft.dataType && item.dataset.nodeId !== connectionDraft.nodeId; wrap.classList.toggle("is-compatible", compatible); });
  renderEdges();
}
function finishConnection(event) {
  if (!connectionDraft) return;
  const draft = connectionDraft;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".node-port");
  connectionDraft = null; $$(".node-port-wrap").forEach(wrap => wrap.classList.remove("is-compatible")); renderEdges();
  if (target) { connectPorts(draft, { nodeId: target.dataset.nodeId, portId: target.dataset.portId, dataType: target.dataset.dataType, direction: target.dataset.direction }); renderCanvas(); renderInspector(); return; }
  showConnectionMenu(event.clientX, event.clientY, draft);
}
function connectPorts(first, second, trackHistory = true) {
  if (first.direction === second.direction || first.dataType !== second.dataType || first.nodeId === second.nodeId) return toast("端口类型不匹配", true);
  const output = first.direction === "output" ? first : second; const input = first.direction === "input" ? first : second;
  if (output.portId.startsWith('clone-result-') && !['audio-reference-1','audio-reference-2'].includes(input.portId)) return toast('请连接到视频节点的参考音频输入', true);
  if (input.portId.startsWith('audio-reference-') && !output.portId.startsWith('clone-result-')) return toast('请从具体的声音克隆结果拖线', true);
  if (state.edges.some(edge => edge.source === output.nodeId && edge.sourcePort === output.portId && edge.target === input.nodeId && edge.targetPort === input.portId)) return;
  if (trackHistory) recordHistory(); state.edges = state.edges.filter(edge => !(edge.target === input.nodeId && edge.targetPort === input.portId));
  state.edges.push({ id: uid("edge"), source: output.nodeId, sourcePort: output.portId, target: input.nodeId, targetPort: input.portId, type: output.dataType }); if (output.dataType === "composition") applyCompositionToLinkedPrompts(output.nodeId); syncAllVideoEditorClips(); selectedEdgeId = null; scheduleSave();
}
function handlePointerMove(event) {
  if (handlePanelResize(event)) return;
  if (connectionDraft) { connectionDraft.current = screenToScene(event.clientX, event.clientY); requestEdgeRender(); return; }
  if (selectionSession) { updateSelectionBox(event); return; }
  if (panSession) { const dx = event.clientX - panSession.clientX; const dy = event.clientY - panSession.clientY; if (Math.abs(dx) + Math.abs(dy) > 1) panSession.moved = true; state.viewport.x = panSession.x + dx; state.viewport.y = panSession.y + dy; updateViewport(); return; }
  if (resizeSession) {
    const node = findNode(resizeSession.nodeId); if (!node) return; const point = screenToScene(event.clientX, event.clientY); const min = resizeMinimum(node);
    const deltaX = point.x - resizeSession.start.x; const deltaY = point.y - resizeSession.start.y;
    if (resizeSession.corner === "sw") { node.width = Math.max(min.width, Math.round(resizeSession.origin.width - deltaX)); node.x = resizeSession.origin.x + resizeSession.origin.width - node.width; } else { node.width = Math.max(min.width, Math.round(resizeSession.origin.width + deltaX)); node.x = resizeSession.origin.x; }
    node.height = Math.max(min.height, Math.round(resizeSession.origin.height + deltaY)); resizeSession.moved = node.x !== resizeSession.origin.x || node.width !== resizeSession.origin.width || node.height !== resizeSession.origin.height;
    const element = resizeSession.element; if (element) { element.style.left = `${node.x}px`; element.style.width = `${node.width}px`; element.style.height = `${node.height}px`; }
    requestEdgeRender(); return;
  }
  if (!dragSession) return;
  const point = screenToScene(event.clientX, event.clientY); const dx = point.x - dragSession.start.x; const dy = point.y - dragSession.start.y;
  if (Math.abs(dx) + Math.abs(dy) > 1) dragSession.moved = true;
  dragSession.origins.forEach(origin => { const node = findNode(origin.id); if (!node) return; node.x = Math.round(origin.x + dx); node.y = Math.round(origin.y + dy); const entry = { element: dragSession.elementById.get(origin.id) }; if (entry.element) entry.element.style.transform = `translate3d(${node.x - origin.x}px, ${node.y - origin.y}px, 0)`; });
  requestEdgeRender();
}
function handlePointerUp(event) {
  if (finishPanelResize()) return;
  workspace.classList.remove("is-flow-interacting");
  if (connectionDraft) finishConnection(event);
  if (selectionSession) finishSelectionBox();
  if (panSession) { const session = panSession; panSession = null; workspace.classList.remove("is-panning"); if (session.moved) scheduleSave(); else if (session.clearSelectionOnClick && (state.selectedIds.length || selectedEdgeId)) { state.selectedIds = []; selectedEdgeId = null; renderCanvasSelection(); renderEdges(); renderLibrary(); renderInspector(); } }
  if (resizeSession) {
    if (resizeSession.element) resizeSession.element.style.willChange = "";
    if (resizeSession.moved) { undoStack.push(resizeSession.before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; scheduleSave(); }
    // The resized node is already updated in-place while dragging. Rebuilding the canvas
    // here recreates every video element and makes unrelated previews reload.
    resizeSession = null; requestEdgeRender(); renderInspector(); updateHistoryButtons();
  }
  if (dragSession) {
    const movedImageNodeId = dragSession.moved ? dragSession.origins.find(origin => findNode(origin.id)?.type === "image")?.id : null;
    dragSession.elements.forEach(item => { const node = findNode(item.id); if (item.element && node) { item.element.style.left = `${node.x}px`; item.element.style.top = `${node.y}px`; item.element.style.transform = ""; item.element.style.willChange = ""; item.element.classList.remove("is-dragging"); } });
    if (dragSession.moved) { undoStack.push(dragSession.before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; scheduleSave(); }
    const movedFrame = dragSession.origins.some(origin => findNode(origin.id)?.type === "frame");
    const movedFrames = dragSession.origins.map(origin => findNode(origin.id)).filter(node => node?.type === "frame");
    dragSession = null;
    if (movedImageNodeId) {
      suppressReferenceUploadNodeId = movedImageNodeId;
      setTimeout(() => { if (suppressReferenceUploadNodeId === movedImageNodeId) suppressReferenceUploadNodeId = null; }, 0);
    }
    // Moving a frame already updates its children in-place. Refresh only the count label;
    // rebuilding the canvas would recreate every video element in the group.
    if (movedFrame) movedFrames.forEach(updateFrameMetaDom);
    renderLibrary(); renderInspector(); updateHistoryButtons();
  }
}
function nativeWheelScrollTarget(target) {
  let element = target instanceof Element ? target : target?.parentElement;
  while (element && element !== workspace) {
    const style = window.getComputedStyle(element);
    const overflowX = ["auto", "scroll", "overlay"].includes(style.overflowX);
    const overflowY = ["auto", "scroll", "overlay"].includes(style.overflowY);
    const canScrollX = overflowX && element.scrollWidth > element.clientWidth + 1;
    const canScrollY = overflowY && element.scrollHeight > element.clientHeight + 1;
    if (canScrollX || canScrollY) return { canScrollX, canScrollY };
    element = element.parentElement;
  }
  return null;
}
function shouldUseNativeWheelScroll(event) {
  const target = nativeWheelScrollTarget(event.target);
  if (!target) return false;
  const hasHorizontalDelta = Math.abs(Number(event.deltaX) || 0) > 0;
  const hasVerticalDelta = Math.abs(Number(event.deltaY) || 0) > 0;
  return (hasHorizontalDelta && target.canScrollX) || (hasVerticalDelta && target.canScrollY) || (!hasHorizontalDelta && !hasVerticalDelta);
}
function handleWheel(event) {
  if (shouldUseNativeWheelScroll(event)) return;
  event.preventDefault(); const rect = workspace.getBoundingClientRect(); const mouseX = event.clientX - rect.left; const mouseY = event.clientY - rect.top;
  const beforeX = (mouseX - state.viewport.x) / state.viewport.scale; const beforeY = (mouseY - state.viewport.y) / state.viewport.scale;
  const nextScale = Math.min(WORKFLOW_ZOOM_MAX, Math.max(WORKFLOW_ZOOM_MIN, state.viewport.scale * Math.exp(-event.deltaY * 0.0015)));
  state.viewport.x = mouseX - beforeX * nextScale; state.viewport.y = mouseY - beforeY * nextScale; state.viewport.scale = nextScale; updateViewport(); scheduleSave();
}
function updateViewport() { if (!state) return; canvasScene.style.transform = `translate(${state.viewport.x}px, ${state.viewport.y}px) scale(${state.viewport.scale})`; canvasScene.getBoundingClientRect(); $("#zoomButton").textContent = `${Math.round(state.viewport.scale * 100)}%`; }
function syncViewportAfterWorkspaceResize(rect) {

  if (!rect || rect.width <= 0 || rect.height <= 0) { observedWorkspaceSize = null; return; }
  const previous = observedWorkspaceSize;
  observedWorkspaceSize = { width: rect.width, height: rect.height };
  if (!state || !previous) return;
  const dx = rect.width - previous.width;
  const dy = rect.height - previous.height;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
  state.viewport.x += dx / 2; state.viewport.y += dy / 2;
  updateViewport(); syncVideoGeneratorPortPositions(); requestEdgeRender();
  scheduleSave();
}
function initCanvasResizeObserver() {
  if (canvasResizeObserver || typeof ResizeObserver !== "function") return;
  canvasResizeObserver = new ResizeObserver(() => syncViewportAfterWorkspaceResize(workspace.getBoundingClientRect()));
  canvasResizeObserver.observe(workspace);
}
function fitContent() {

  if (!state?.nodes.length) return; const rect = workspace.getBoundingClientRect();
  const minX = Math.min(...state.nodes.map(node => node.x)); const minY = Math.min(...state.nodes.map(node => node.y));
  const maxX = Math.max(...state.nodes.map(node => node.x + node.width)); const maxY = Math.max(...state.nodes.map(node => node.y + node.height));
  const width = Math.max(100, maxX - minX); const height = Math.max(100, maxY - minY);
  const scale = Math.min(1, Math.max(WORKFLOW_ZOOM_MIN, Math.min((rect.width - 150) / width, (rect.height - 135) / height)));
  state.viewport.scale = scale; state.viewport.x = rect.width / 2 - (minX + width / 2) * scale; state.viewport.y = rect.height / 2 - (minY + height / 2) * scale - 15; updateViewport(); scheduleSave();
}function addNode(type) {
  const center = sceneCenter(); recordHistory(); let node;
  if(type==='speech') node=createSpeechNode(uid('speech'),center.x-200,center.y-250);
  if (type === "prompt") node = createPromptNode(Math.round(center.x - 160), Math.round(center.y - 145));
  if (type === "generator") node = createGeneratorNode(Math.round(center.x - 180), Math.round(center.y - 180));
  if (type === "video") node = createVideoNode(Math.round(center.x - 195), Math.round(center.y - 235));
  if (type === "video-preview") node = createVideoPreviewNode(Math.round(center.x - 180), Math.round(center.y - 160));
  if (type === "answer") node = createAnswerNode(Math.round(center.x - 190), Math.round(center.y - 185));
  if (type === "composition") node = createCompositionNode(Math.round(center.x - 175), Math.round(center.y - 145));
  if (type === "note") node = createNote(Math.round(center.x - 130), Math.round(center.y - 95));
  if (!node) return; state.nodes.push(node); state.selectedIds = [node.id]; selectedEdgeId = null; renderWorkspace(); scheduleSave();
}
function addFrame() {
  const center = sceneCenter(); recordHistory(); const node = { id: uid("frame"), type: "frame", name: `工作流分组 ${state.frameCounter++}`, x: Math.round(center.x - 350), y: Math.round(center.y - 240), width: 700, height: 480, createdAt: Date.now() };
  state.nodes.push(node); state.selectedIds = [node.id]; renderWorkspace(); scheduleSave();
}
async function deleteGeneratedImageNodeWithFile(nodeId) {
  const node = findNode(nodeId); const filename = node?.type === "image" ? generatedImageFilename(node.src) : "";
  if (!node || !filename) return toast("该节点不是本地生成图片，普通删除不会清理磁盘文件", true);
  const sameProjectFiles = generatedImageFilesForProject({ nodes: state.nodes.filter(item => item.id !== nodeId) });
  const sharedFiles = await generatedImageFilesUsedByOtherProjects(state.id);
  const canDeleteFile = !sameProjectFiles.has(filename) && !sharedFiles.has(filename);
  const fileNote = canDeleteFile ? "并删除对应的本地生成图片。此操作不可撤销。" : "。该图片仍被当前项目或其他项目使用，磁盘文件会保留。";
  if (!window.confirm(`删除画布节点“${node.name}”${fileNote}`)) return;
  if (canDeleteFile) {
    try { await removeGeneratedImageFiles([filename]); }
    catch (error) { return toast(`本地图片删除失败，已保留画布节点：${error.message || "未知错误"}`, true); }
  }
  state.nodes = state.nodes.filter(item => item.id !== nodeId); state.edges = state.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId); state.recentIds = state.recentIds.filter(id => id !== nodeId); state.selectedIds = []; selectedEdgeId = null;
  // Restoring the node without its deleted file would create a broken image reference.
  undoStack = []; redoStack = []; updateHistoryButtons(); renderWorkspace(); scheduleSave();
  toast(canDeleteFile ? "已同步删除画布节点和本地生成图片" : "已删除画布节点；共享本地图片已保留");
}
function selectedGeneratedImageNodes() {
  return state.selectedIds.map(findNode).filter(node => node?.type === "image" && generatedImageFilename(node.src));
}
async function deleteSelectedGeneratedImageNodesWithFiles() {
  const nodes = selectedGeneratedImageNodes();
  if (!nodes.length) return toast("所选模块中没有本地生成图片", true);
  const nodeIds = new Set(nodes.map(node => node.id));
  const filenames = [...new Set(nodes.map(node => generatedImageFilename(node.src)).filter(Boolean))];
  const sameProjectFiles = generatedImageFilesForProject({ nodes: state.nodes.filter(node => !nodeIds.has(node.id)) });
  const sharedFiles = await generatedImageFilesUsedByOtherProjects(state.id);
  const deletableFiles = filenames.filter(filename => !sameProjectFiles.has(filename) && !sharedFiles.has(filename));
  const retainedCount = filenames.length - deletableFiles.length;
  const fileNote = deletableFiles.length ? `其中 ${deletableFiles.length} 个本地生成文件会同步删除` : "本地文件仍被其他画布节点或项目使用，会保留";
  const sharedNote = retainedCount ? `；${retainedCount} 个仍被引用的文件会保留` : "";
  if (!window.confirm(`删除所选 ${nodes.length} 个本地生成图片节点？${fileNote}${sharedNote}。此操作不可撤销。`)) return;
  if (deletableFiles.length) {
    try { await removeGeneratedImageFiles(deletableFiles); }
    catch (error) { return toast(`本地图片删除失败，已保留画布节点：${error.message || "未知错误"}`, true); }
  }
  state.nodes = state.nodes.filter(node => !nodeIds.has(node.id)); state.edges = state.edges.filter(edge => !nodeIds.has(edge.source) && !nodeIds.has(edge.target)); state.recentIds = state.recentIds.filter(id => !nodeIds.has(id)); state.selectedIds = state.selectedIds.filter(id => !nodeIds.has(id)); selectedEdgeId = null;
  // Restoring a batch after its files were removed would leave broken image references.
  undoStack = []; redoStack = []; updateHistoryButtons(); renderWorkspace(); scheduleSave();
  toast(deletableFiles.length ? `已删除 ${nodes.length} 个图片节点，并同步清理 ${deletableFiles.length} 个生成文件` : `已删除 ${nodes.length} 个图片节点；仍被引用的生成文件已保留`);
}
function deleteSelection() {
  if (selectedEdgeId) { recordHistory(); state.edges = state.edges.filter(edge => edge.id !== selectedEdgeId); selectedEdgeId = null; renderCanvas(); renderInspector(); scheduleSave(); return; }
  if (!state.selectedIds.length) return; recordHistory(); const ids = new Set(state.selectedIds);
  state.nodes = state.nodes.filter(node => !ids.has(node.id)); state.edges = state.edges.filter(edge => !ids.has(edge.source) && !ids.has(edge.target)); state.recentIds = state.recentIds.filter(id => !ids.has(id)); state.selectedIds = []; renderWorkspace(); scheduleSave();
}
function duplicateSelected() {
  const nodes = state.selectedIds.map(findNode).filter(Boolean); if (!nodes.length) return; recordHistory();
  const copies = nodes.map(node => ({ ...structuredClone(node), id: uid(node.type), name: `${node.name} · 副本`, x: node.x + 32, y: node.y + 32, createdAt: Date.now() }));
  state.nodes.push(...copies); state.selectedIds = copies.map(node => node.id); renderWorkspace(); scheduleSave();
}
function renderLibrary() {

  if (state.libraryTab === "assets") return renderAssetsLibrary(); if (state.libraryTab === "history") return renderHistoryLibrary();
  const counts = type => state.nodes.filter(node => node.type === type).length;
  libraryContent.innerHTML = `<div class="section-label"><span>创建模块</span><span>${state.nodes.filter(node => node.type !== "frame").length}</span></div><div class="module-list">
    <button class="module-item" type="button" data-library-add="prompt"><span class="module-icon prompt">${icon("text-cursor-input")}</span><span class="module-copy"><strong>提示词</strong><small>输出 Prompt 文本</small></span></button><button class="module-item" type="button" data-library-add="composition"><span class="module-icon composition">${icon("sliders-horizontal")}</span><span class="module-copy"><strong>参数控制</strong><small>透视、地平线与摄影参数</small></span></button>
    <button class="module-item" type="button" data-library-image><span class="module-icon image">${icon("image-plus")}</span><span class="module-copy"><strong>参考图</strong><small>输出 Image 图像</small></span></button>
    <button class="module-item" type="button" data-library-add="generator"><span class="module-icon generator">${icon("sparkles")}</span><span class="module-copy"><strong>生图</strong><small>Image2 / Seedream / Midjourney</small></span></button>
    <button class="module-item" type="button" data-library-add="video"><span class="module-icon video">${icon("clapperboard")}</span><span class="module-copy"><strong>视频</strong><small>海螺 H3 · API plus · MP4</small></span></button>
    <button class="module-item" type="button" data-library-add="video-preview"><span class="module-icon video">${icon("monitor-play")}</span><span class="module-copy"><strong>成片预览</strong><small>上传、预览并输出本地视频</small></span></button>
    <button class="module-item" type="button" data-library-add="answer"><span class="module-icon answer">${icon("message-square-text")}</span><span class="module-copy"><strong>模型回答</strong><small>最多 6 条提示词 · 8 张参考图</small></span></button>
<button class="module-item" type="button" data-library-add="speech"><span class="module-icon speech">♫</span><span class="module-copy"><strong>声音克隆 · IndexTTS2</strong><small>RunningHub · 参考音频与历史结果</small></span></button>
    </div><div class="section-label"><span>当前结构</span><span>${state.edges.length} 条连接</span></div><div class="summary-row"><span>提示词模块</span><strong>${counts("prompt")}</strong></div><div class="summary-row"><span>参数控制</span><strong>${counts("composition")}</strong></div><div class="summary-row"><span>图像模块</span><strong>${counts("image")}</strong></div><div class="summary-row"><span>生图模块</span><strong>${counts("generator")}</strong></div><div class="summary-row"><span>模型回答</span><strong>${counts("answer")}</strong></div>`;
  $$('[data-library-add]').forEach(button => button.addEventListener("click", () => addNode(button.dataset.libraryAdd))); $("[data-library-image]")?.addEventListener("click", () => imageFileInput.click()); refreshIcons();
}
function assetRowHtml(node) { const selected = state.selectedIds.includes(node.id); const thumb = node.src ? node.type === "video" ? `<video class="asset-thumb" src="${escapeHtml(nodeDisplaySource(node))}" muted preload="${selected ? "metadata" : "none"}"></video>` : `<img class="asset-thumb" src="${escapeHtml(nodeDisplaySource(node))}" alt="" loading="lazy" decoding="async">` : `<span class="asset-thumb asset-thumb-empty">${icon("image-plus")}</span>`; const outputType = node.type === "video" ? (node.outputType || "mp4") : (node.ratio || (node.src ? "图片" : "未上传")); return `<button class="asset-row${selected ? " is-selected" : ""}" type="button" data-select-node="${node.id}">${thumb}<span class="asset-copy"><strong>${escapeHtml(node.name)}</strong><small>${escapeHtml(node.source || "素材")} · ${escapeHtml(outputType)}</small></span><span class="asset-kind">${outgoingEdges(node.id, node.type === "video" ? "video" : "image").length} 链接</span></button>`; }
function renderAssetsLibrary() { const images = state.nodes.filter(node => ["image", "video"].includes(node.type)); libraryContent.innerHTML = `<div class="section-label"><span>素材与视频</span><span>${images.length}</span></div>${images.map(assetRowHtml).join("") || emptyHtml("images", "尚未导入图像或视频")}`; bindLibraryRows(); }
function renderHistoryLibrary() { const recent = state.recentIds.map(findNode).filter(node => node && ["image", "video"].includes(node.type)); libraryContent.innerHTML = `<div class="section-label"><span>生成结果</span><span>${recent.length}</span></div>${recent.map(assetRowHtml).join("") || emptyHtml("history", "还没有运行记录")}`; bindLibraryRows(); }
function emptyHtml(iconName, message) { return `<div class="empty-state">${icon(iconName)}<p>${escapeHtml(message)}</p></div>`; }
function bindLibraryRows() { $$('[data-select-node]').forEach(button => button.addEventListener("click", () => { selectNode(button.dataset.selectNode); focusNode(button.dataset.selectNode); $("#libraryPanel").classList.remove("is-open"); })); refreshIcons(); }
function focusNode(id) { const node = findNode(id); if (!node) return; const rect = workspace.getBoundingClientRect(); state.viewport.x = rect.width / 2 - (node.x + node.width / 2) * state.viewport.scale; state.viewport.y = rect.height / 2 - (node.y + node.height / 2) * state.viewport.scale; updateViewport(); }
function imageUniformScaleValue(nodes = state?.nodes || []) {
  const images = nodes.filter(node => node?.type === "image");
  if (!images.length) return 50;
  const averageWidth = images.reduce((total, node) => total + (Number(node.width) || 270), 0) / images.length;
  return Math.round(Math.min(100, Math.max(0, (averageWidth - 180) / 320 * 100)));
}
function imageUniformScaleDimensions(value) {
  const normalized = Math.min(100, Math.max(0, Number(value) || 0));
  const width = Math.round(180 + normalized / 100 * 320);
  return { width, height: Math.round(width * nodeHeight("image") / 270) };
}
function imageUniformScaleControl() {
  const images = state.nodes.filter(node => node.type === "image");
  const value = imageUniformScaleValue(images); const dimensions = imageUniformScaleDimensions(value);
  return `<section class="control-section image-uniform-scale-control"><div class="control-title">参考图统一比例 <span>快捷操作</span></div><p class="field-note">统一所有参考图节点的显示大小；不会影响单个节点后续手动拉伸。</p><div class="image-uniform-scale-row"><input type="range" min="0" max="100" value="${value}" data-image-uniform-scale aria-label="参考图统一比例"><output data-image-uniform-scale-value>${value}</output></div><div class="summary-row"><span>统一尺寸</span><strong data-image-uniform-scale-size>${dimensions.width} × ${dimensions.height}</strong></div><button class="button button-quiet" type="button" data-confirm-image-uniform-scale${images.length ? "" : " disabled"}>${icon("check")} 确认统一比例</button></section>`;
}
function crossProjectImageSource(node) { return node?.previewSrc || node?.src || node?.originalSrc || ""; }
function crossProjectImageOriginalSource(node) { return node?.originalSrc || node?.src || node?.previewSrc || ""; }
function crossProjectImageLibraryHtml() {
  return `<section class="control-section cross-project-images-control"><div class="control-title">其他项目图片 <span>点击获取</span></div><label class="field-label" for="crossProjectSelect">来源项目</label><select class="select-input" id="crossProjectSelect"><option value="">正在读取项目…</option></select><div class="cross-project-image-list" id="crossProjectImageList"><p class="field-note">选择项目后，这里会显示可复用的图片。</p></div></section>`;
}
async function bindCrossProjectImageLibrary() {
  const select = $("#crossProjectSelect"); const list = $("#crossProjectImageList");
  if (!select || !list || !state?.id) return;
  try {
    const projects = (await dbGetAll("projects")).filter(project => project?.id && project.id !== state.id).sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
    if (!projects.length) {
      select.innerHTML = `<option value="">暂无其他项目</option>`;
      list.innerHTML = `<p class="field-note">新建其他项目并添加图片后，可在这里复用。</p>`;
      return;
    }
    select.innerHTML = `<option value="">选择一个项目</option>${projects.map(project => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.projectName || "未命名项目")}</option>`).join("")}`;
    if (crossProjectSourceProjectId && projects.some(project => project.id === crossProjectSourceProjectId)) select.value = crossProjectSourceProjectId;
    const renderImages = () => {
      crossProjectSourceProjectId = select.value || "";
      const project = projects.find(item => item.id === select.value);
      if (!project) { list.innerHTML = `<p class="field-note">选择项目后，这里会显示可复用的图片。</p>`; return; }
      const images = (project?.nodes || []).filter(node => node?.type === "image" && crossProjectImageSource(node));
      list.innerHTML = images.length ? images.map(node => `<button class="cross-project-image" type="button" data-cross-project-image="${escapeHtml(node.id)}" title="${escapeHtml(node.name || "参考图")} · 点击添加到当前画布"><img src="${escapeHtml(crossProjectImageSource(node))}" alt="" loading="lazy" decoding="async"><span>${escapeHtml(node.name || "参考图")}</span></button>`).join("") : `<p class="field-note">该项目暂无可复用图片。</p>`;
      list.querySelectorAll("[data-cross-project-image]").forEach(button => button.addEventListener("click", () => {
        const sourceNode = project?.nodes?.find(item => item.id === button.dataset.crossProjectImage);
        if (sourceNode) addCrossProjectImageNode(project, sourceNode);
      }));
      refreshIcons();
    };
    select.addEventListener("change", renderImages);
    renderImages();
  } catch (error) {
    select.innerHTML = `<option value="">读取失败</option>`;
    list.innerHTML = `<p class="field-note">无法读取其他项目图片：${escapeHtml(error?.message || "本地项目数据暂时不可用")}</p>`;
  }
}
function addCrossProjectImageNode(project, sourceNode) {
  const source = crossProjectImageOriginalSource(sourceNode); if (!state || !project || !source) return;
  const center = sceneCenter(); recordHistory();
  const node = createReferenceNode(Math.round(center.x - 135), Math.round(center.y - 160));
  node.name = sourceNode.name || "参考图";
  node.src = source;
  node.originalSrc = source;
  node.previewSrc = crossProjectImageSource(sourceNode);
  node.source = `来自项目：${project.projectName || "未命名项目"}`;
  node.ratio = sourceNode.ratio || node.ratio;
  node.sharedFromProjectId = project.id;
  node.sharedFromProjectName = project.projectName || "未命名项目";
  node.sharedFromNodeId = sourceNode.id;
  node.sharedFromNodeName = sourceNode.name || "参考图";
  state.nodes.push(node);
  renderWorkspace(); scheduleSave(); toast(`已从“${project.projectName || "未命名项目"}”获取图片`);
}
function applyImageUniformScale(value) {
  const images = state.nodes.filter(node => node.type === "image"); if (!images.length) return;
  const dimensions = imageUniformScaleDimensions(value); recordHistory(); images.forEach(node => { node.width = dimensions.width; node.height = dimensions.height; }); renderWorkspace(); scheduleSave(); toast(`已统一 ${images.length} 个参考图节点：${dimensions.width} × ${dimensions.height}`);
}
function bindImageUniformScaleControl() {
  const slider = $(`[data-image-uniform-scale]`); const output = $(`[data-image-uniform-scale-value]`); const size = $(`[data-image-uniform-scale-size]`);
  slider?.addEventListener("input", event => { const value = Math.min(100, Math.max(0, Number(event.target.value) || 0)); const dimensions = imageUniformScaleDimensions(value); if (output) output.textContent = String(value); if (size) size.textContent = `${dimensions.width} × ${dimensions.height}`; });
  $(`[data-confirm-image-uniform-scale]`)?.addEventListener("click", event => { event.stopPropagation(); applyImageUniformScale(slider?.value); });
}
function renderInspector() {

  if (selectedEdgeId) return renderEdgeInspector(); const selectedNodes = state.selectedIds.map(findNode).filter(Boolean); if (selectedNodes.length > 1) return renderMultiSelectionInspector(selectedNodes); const node = selectedNode(); if (node) return renderNodeInspector(node);
  $("#inspectorEyebrow").textContent = "PROJECT"; $("#inspectorTitle").textContent = "自由画布概览";
  inspectorContent.innerHTML = `${crossProjectImageLibraryHtml()}
    ${imageUniformScaleControl()}
    <section class="control-section"><div class="control-title">界面基调 <span>${themeLabels[state.theme]}</span></div><div class="settings-theme-switch">${themeButtonsHtml()}</div></section>`;
  bindInspectorThemeButtons(); bindImageUniformScaleControl(); void bindCrossProjectImageLibrary(); refreshIcons();
}
function renderMultiSelectionInspector(nodes) {
  const generatedImages = nodes.filter(node => node.type === "image" && generatedImageFilename(node.src));
  $("#inspectorEyebrow").textContent = "MULTI SELECT"; $("#inspectorTitle").textContent = `已选择 ${nodes.length} 个模块`;
  inspectorContent.innerHTML = `<section class="control-section"><div class="control-title">批量操作</div><div class="summary-row"><span>已选模块</span><strong>${nodes.length}</strong></div><div class="summary-row"><span>本地生成图片</span><strong>${generatedImages.length}</strong></div>${generatedImages.length ? `<p class="field-note">同步删除会保留仍被未选节点或其他项目引用的生成文件。</p>` : `<p class="field-note">当前选择中没有可同步清理的本地生成图片。</p>`}</section><section class="control-section"><div class="action-list">${generatedImages.length ? `<button class="action-row danger-action" type="button" id="deleteSelectedGeneratedFilesButton">${icon("trash-2")}<strong>同步删除已选生成图片</strong><small>删除 ${generatedImages.length} 个图片节点及未被引用的本地文件</small></button>` : ""}<button class="action-row danger-action" type="button" id="deleteSelectedNodesButton">${icon("trash-2")}<strong>删除所选模块</strong><small>仅删除画布节点，保留本地文件</small></button></div></section>`;
  $("#deleteSelectedGeneratedFilesButton")?.addEventListener("click", () => void deleteSelectedGeneratedImageNodesWithFiles());
  $("#deleteSelectedNodesButton").addEventListener("click", deleteSelection); refreshIcons();
}
function themeButtonsHtml() { return Object.entries(themeLabels).map(([value, label]) => `<button type="button" data-theme-value="${value}" class="${state?.theme === value ? "is-active" : ""}">${icon(value === "dark" ? "moon-star" : value === "light" ? "sun" : "gem")} ${label}</button>`).join(""); }
function bindInspectorThemeButtons() { $$("#inspectorContent [data-theme-value]").forEach(button => button.addEventListener("click", () => { setTheme(button.dataset.themeValue); renderInspector(); })); }
function renderEdgeInspector() {
  const edge = state.edges.find(item => item.id === selectedEdgeId); if (!edge) { selectedEdgeId = null; return renderInspector(); }
  $("#inspectorEyebrow").textContent = "CONNECTION"; $("#inspectorTitle").textContent = "连接属性";
  inspectorContent.innerHTML = `<section class="control-section"><div class="edge-summary"><span class="edge-swatch ${edge.type === "prompt" ? "prompt" : edge.type === "video" ? "video" : ""}"></span><span>${edge.type === "prompt" ? "Prompt 文本" : edge.type === "video" ? "Video 视频" : "Image 图像"}</span></div><div class="summary-row"><span>来源</span><strong>${escapeHtml(findNode(edge.source)?.name || "-")}</strong></div><div class="summary-row"><span>目标</span><strong>${escapeHtml(findNode(edge.target)?.name || "-")}</strong></div><div class="summary-row"><span>输入端口</span><strong>${escapeHtml(edge.targetPort)}</strong></div></section><section class="control-section"><button class="button button-quiet danger-action" id="deleteEdgeButton" type="button">${icon("unlink")} 删除连接</button></section>`;
  $("#deleteEdgeButton").addEventListener("click", deleteSelection); refreshIcons();
}
function renderNodeInspector(node) {
  $("#inspectorEyebrow").textContent = node.type === "video-editor" ? "VIDEO EDIT" : node.type === "video-preview" ? "VIDEO PREVIEW" : node.mediaType === "video" ? "VIDEO" : node.type.toUpperCase(); $("#inspectorTitle").textContent = `${nodeLabels[node.type] || "模块"}属性`;
  const incoming = state.edges.filter(edge => edge.target === node.id).length; const outgoing = state.edges.filter(edge => edge.source === node.id).length; let specific = "";
  if (node.type === "image") specific = `${node.src ? `<img class="image-preview" src="${escapeHtml(nodeCanvasSource(node))}" alt="${escapeHtml(node.name)}" loading="lazy" decoding="async">` : `<button class="reference-placeholder node-interactive" type="button" data-upload-node="${node.id}">${icon("image-plus")}<strong>上传图像</strong><small>点击选择本地文件</small></button>`}<div class="summary-row"><span>输入连接</span><strong>${incoming}</strong></div><div class="summary-row"><span>输出连接</span><strong>${outgoing}</strong></div>`;
  if (node.type === "prompt") specific = `<div class="summary-row"><span>字符数</span><strong>${(node.content || "").length}</strong></div><div class="summary-row"><span>输出连接</span><strong>${outgoing}</strong></div>`;
  if (node.type === "video-editor") specific = `<div class="summary-row"><span>视频片段</span><strong>${videoEditorClips(node).length} 段</strong></div><div class="summary-row"><span>输入连接</span><strong>${incoming}</strong></div><div class="summary-row"><span>预览状态</span><strong>${videoEditorClips(node).length ? "跟随时间轴" : "未连接"}</strong></div><p class="field-note">点击或拖动播放指针定位；点击“分割”切开片段，右键片段可删除，拖动片段可调整顺序。</p>`;
  if (node.type === "video-preview") specific = `<div class="summary-row"><span>输入连接</span><strong>${incoming}</strong></div><div class="summary-row"><span>输出连接</span><strong>${outgoing}</strong></div><div class="summary-row"><span>视频来源</span><strong>${incoming ? "画布连接" : node.localVideoSrc ? "本地上传" : "未上传"}</strong></div><div class="summary-row"><span>参考输出</span><strong>${videoPreviewSource(node) ? "可连接 H3" : "暂无视频"}</strong></div>`;
  if (node.type === "generator" && node.mediaType !== "video") { const imageInputs = state.edges.filter(edge => edge.target === node.id && edge.type === "image").length; const provider = generatorProviderForNode(node); specific = `<div class="summary-row"><span>模型</span><strong>${provider.model}</strong></div><div class="summary-row"><span>提示词</span><strong>${incomingEdge(node.id, "prompt") ? "已连接" : "未连接"}</strong></div><div class="summary-row"><span>参考图</span><strong>${imageInputs}/${node.inputSlots}</strong></div><div class="summary-row"><span>输出结果</span><strong>${node.lastResultIds?.length || 0}</strong></div>`; }
  if (node.mediaType === "video") { const dimensions = runningHubVideoDimensions(node); specific = `<div class="summary-row"><span>模型</span><strong>${runningHubVideoProvider.model}</strong></div><div class="summary-row"><span>生成方式</span><strong>${runningHubVideoMode(node).label}</strong></div><div class="summary-row"><span>提示词</span><strong>${incomingEdge(node.id, "prompt") ? "已连接" : "未连接"}</strong></div><div class="summary-row"><span>像素</span><strong>${Number(node.videoMegapixels || 0.9).toFixed(1)} MP</strong></div><div class="summary-row"><span>尺寸</span><strong>${dimensions.width} × ${dimensions.height}</strong></div><div class="summary-row"><span>时长</span><strong>${node.videoSeconds} 秒</strong></div><div class="summary-row"><span>输出结果</span><strong>${node.lastResultIds?.length || 0}</strong></div>${node.lastError ? `<div class="summary-row"><span>最近错误</span><strong>${escapeHtml(node.lastError)}</strong></div>` : ""}`; }
  if (node.type === "frame") { const contained = frameContainedNodes(node).length; specific = `<div class="summary-row"><span>包含节点</span><strong>${contained}</strong></div><div class="summary-row"><span>画板尺寸</span><strong>${Math.round(node.width)} × ${Math.round(node.height)}</strong></div><p class="field-note">把节点拖入虚线范围后，拖动画板边框即可整体移动这些节点。右下角手柄可以调整画板大小。</p>`; }
  inspectorContent.innerHTML = `<section class="control-section"><div class="control-title">名称</div><input class="text-input" id="nodeNameInput" value="${escapeHtml(node.name)}"></section><section class="control-section">${specific}</section><section class="control-section"><div class="action-list">${node.type === "generator" ? `<button class="action-row" type="button" data-inspector-action="run">${icon("play")}<strong>运行此节点</strong><small>${node.mediaType === "video" ? "MP4 视频" : `${node.batch} 张`}</small></button>` : ""}${node.type === "video-editor" ? `<button class="action-row" type="button" data-inspector-action="import-video">${icon("video")}<strong>导入视频</strong><small>保存到本机 E 盘</small></button>` : ""}${node.type === "video-preview" ? `<button class="action-row" type="button" data-inspector-action="upload-preview-video">${icon("upload")}<strong>上传本地视频</strong><small>保存并提供参考视频输出</small></button>` : ""}${node.type === "image" ? (node.src ? `<button class="action-row" type="button" data-inspector-action="download">${icon("download")}<strong>下载图片</strong><small>原始文件</small></button>` : `<button class="action-row" type="button" data-inspector-action="upload">${icon("image-plus")}<strong>上传图像</strong><small>本地参考图</small></button>`) : ""}${(node.type === "video" && node.src) || (node.type === "video-preview" && (videoPreviewSource(node) || videoPreviewFrame(node))) ? `<button class="action-row" type="button" data-inspector-action="download">${icon("download")}<strong>${node.type === "video-preview" && videoPreviewFrame(node) && !videoPreviewSource(node) ? "导出并下载视频" : "下载视频"}</strong><small>${node.type === "video-preview" && videoPreviewFrame(node) && !videoPreviewSource(node) ? "按需生成 MP4" : escapeHtml(node.outputType || "mp4")}</small></button>` : ""}${node.type === "image" && generatedImageFilename(node.src) ? `<button class="action-row danger-action" type="button" data-inspector-action="delete-generated-file">${icon("trash-2")}<strong>同步删除生成文件</strong><small>删除画布节点与本地图片，不可撤销</small></button>` : ""}${node.type === "video" && generatedVideoFilename(node.src) ? `<button class="action-row danger-action" type="button" data-inspector-action="delete-generated-video-file">${icon("trash-2")}<strong>同步删除生成文件</strong><small>删除画布节点与本地视频，不可撤销</small></button>` : ""}<button class="action-row" type="button" data-inspector-action="duplicate">${icon("copy")}<strong>复制模块</strong><small>保留当前参数</small></button><button class="action-row danger-action" type="button" data-inspector-action="delete">${icon("trash-2")}<strong>删除模块</strong><small>仅删除画布节点，保留本地文件</small></button></div></section>`;
  $("#nodeNameInput").addEventListener("change", event => { const value = event.target.value.trim(); if (!value || value === node.name) return; recordHistory(); node.name = value; renderCanvas(); renderLibrary(); scheduleSave(); });
  $$("#inspectorContent [data-upload-node]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); triggerReferenceUpload(button.dataset.uploadNode); }));
   $$('[data-inspector-action]').forEach(button => button.addEventListener("click", () => { const action = button.dataset.inspectorAction; if (action === "run") runGeneratorNode(node.id); if (action === "upload") triggerReferenceUpload(node.id); if (action === "import-video") { pendingVideoImportNodeId = node.id; pendingVideoReferenceNodeId = null; pendingVideoPreviewUploadNodeId = null; videoFileInput.value = ""; videoFileInput.click(); } if (action === "upload-preview-video") { pendingVideoPreviewUploadNodeId = node.id; pendingVideoImportNodeId = null; pendingVideoReferenceNodeId = null; videoFileInput.value = ""; videoFileInput.click(); } if (action === "download") { if (node.type === "video-preview") void exportVideoPreview(node.id); else downloadNode(node); } if (action === "delete-generated-file") void deleteGeneratedImageNodeWithFile(node.id); if (action === "delete-generated-video-file") void deleteGeneratedVideoNodeWithFile(node.id); if (action === "duplicate") duplicateSelected(); if (action === "delete") deleteSelection(); }));
  refreshIcons();
}
async function handleCanvasPaste(event) {
  if (document.querySelector('#layerEditor[open], #localEditDialog[open]')) return;
  const target = event.target instanceof Element ? event.target : null;
  const isEditable = Boolean(target?.closest("input, textarea, select, [contenteditable=true]"));
  if (!state || isEditable) return;
  const clipboardFiles = [...(event.clipboardData?.files || [])];
  const videoFiles = [...(event.clipboardData?.items || [])]
    .filter(item => item.kind === "file" && isSupportedVideoFile(item.getAsFile?.()))
    .map(item => item.getAsFile())
    .filter(Boolean);
  const pastedVideos = [...new Map([...clipboardFiles, ...videoFiles].map(file => [`${file.name}:${file.size}:${file.lastModified}`, file])).values()]
    .filter(isSupportedVideoFile)
    .slice(0, 24);
  if (pastedVideos.length) {
    event.preventDefault();
    try { await importVideosAsPreviewNodes(pastedVideos, { source: "剪贴板", placeAtViewport: true }); }
    catch (error) { toast(`粘贴视频失败：${error?.message || "无法保存视频"}`, true); }
    return;
  }
  const imageFiles = [...(event.clipboardData?.items || [])]
    .filter(item => item.kind === "file" && /^image\/(png|jpeg|webp)$/i.test(item.type))
    .map(item => item.getAsFile())
    .filter(Boolean);
  if (imageFiles.length) {
    event.preventDefault();
    try { await importImages(imageFiles, { source: "剪贴板", placeAtViewport: true }); }
    catch (error) { toast(`粘贴图片失败：${error?.message || "无法保存图片"}`, true); }
    return;
  }
  event.preventDefault();
  pasteWorkflowSelection();
}
async function importImages(files, options = {}) {
  const accepted = [...files].filter(file => /^image\/(png|jpeg|webp)$/i.test(file.type)); if (!accepted.length) return;
  recordHistory(); const center = sceneCenter(); const nodes = []; const anchor = state.nodes.find(node => node.type === "generator"); const baseX = options.placeAtViewport ? center.x - 135 : anchor ? anchor.x - 320 : center.x - 135; const baseY = options.placeAtViewport ? center.y - 160 : anchor ? anchor.y + anchor.height + 70 : center.y - 160;
  for (let index = 0; index < accepted.length; index += 1) {
    const file = accepted[index]; const stored = await persistImportedImage(file); const dimensions = stored.dimensions;
    nodes.push({ id: uid("image"), type: "image", name: (file.name || `剪贴图 ${index + 1}`).replace(/\.[^.]+$/, ""), src: stored.url, previewSrc: stored.previewUrl || stored.url, originalSrc: stored.url, x: Math.round(baseX - Math.floor(index / 4) * 300), y: Math.round(baseY + (index % 4) * 350), width: 270, height: nodeHeight("image"), source: options.source || "导入素材", ratio: String(dimensions.width) + ":" + String(dimensions.height), createdAt: Date.now() + index });
  }
  state.nodes.push(...nodes); state.selectedIds = nodes.map(node => node.id); selectedEdgeId = null; renderWorkspace(); scheduleSave(); toast(`已创建 ${nodes.length} 个图像模块`);
}
function isSupportedVideoFile(file) {
  return /^video\/(mp4|webm|quicktime)$/i.test(file?.type || "") || /\.(mp4|webm|mov)$/i.test(file?.name || "");
}
async function importVideosAsPreviewNodes(files, options = {}) {
  const accepted = [...files].filter(isSupportedVideoFile).slice(0, 24);
  if (!accepted.length) return 0;
  const point = Number.isFinite(options.clientX) && Number.isFinite(options.clientY) ? screenToScene(options.clientX, options.clientY) : sceneCenter();
  const uploaded = [];
  let failed = 0;
  for (const file of accepted) {
    try {
      const result = await requestJson("/api/video-assets", { method: "POST", headers: { "Content-Type": file.type || "video/mp4", "x-file-name": encodeURIComponent(file.name || "本地视频.mp4") }, body: file }, 10 * 60_000);
      uploaded.push({ file, result });
    } catch {
      failed += 1;
    }
  }
  if (!uploaded.length) { toast("视频导入失败，请确认文件格式和本机服务", true); return 0; }
  recordHistory();
  const nodes = uploaded.map(({ file, result }, index) => {
    const node = createVideoPreviewNode(Math.round(point.x - 180 + (index % 3) * 390), Math.round(point.y - 160 + Math.floor(index / 3) * 350));
    const filename = String(result.filename || file.name || "本地视频.mp4");
    const extension = filename.split(".").pop()?.toLowerCase();
    node.name = (file.name || "本地视频").replace(/\.[^.]+$/, "");
    node.localVideoSrc = result.url;
    node.localVideoName = result.name || file.name || "本地视频";
    node.outputType = ["mp4", "webm", "mov"].includes(extension) ? extension : "mp4";
    node.createdAt += index;
    return node;
  });
  state.nodes.push(...nodes); state.selectedIds = nodes.map(node => node.id); selectedEdgeId = null; renderWorkspace(); scheduleSave();
  const converted = uploaded.filter(({ result }) => result.transcoded).length;
  const conversionNote = converted ? `，${converted} 个 HEVC 视频已转为 H.264` : "";
  toast(failed ? `已创建 ${nodes.length} 个成片预览节点${conversionNote}，${failed} 个视频导入失败` : `已创建 ${nodes.length} 个成片预览节点${conversionNote}`, Boolean(failed));
  return nodes.length;
}
function triggerReferenceUpload(nodeId) {
  pendingImageUploadNodeId = nodeId;
  imageFileInput.value = "";
  imageFileInput.click();
}
async function uploadImageIntoNode(nodeId, file) {
  const node = findNode(nodeId);
  if (!node || node.type !== "image" || !file) return;
  const stored = await persistImportedImage(file);
  const dimensions = stored.dimensions;
  recordHistory();
  node.src = stored.url; node.previewSrc = stored.previewUrl || stored.url; node.originalSrc = stored.url;
  node.name = node.name === "参考图" || !node.name ? file.name.replace(/\.[^.]+$/, "") : node.name;
  node.ratio = `${dimensions.width}:${dimensions.height}`;
  if (node.source === "参考图" || !node.source) node.source = "参考图";
  selectedEdgeId = null;
  renderWorkspace();
  scheduleSave();
  toast("参考图已上传");
}
async function importVideosIntoEditor(nodeId, files) {
  const editor = findNode(nodeId);
  const accepted = [...files].filter(file => /^video\/(mp4|webm|quicktime)$/i.test(file.type) || /\.(mp4|webm|mov)$/i.test(file.name || ""));
  if (!editor || editor.type !== "video-editor" || !accepted.length) return;
  try {
    const imported = [];
    let converted = 0;
    for (const file of accepted.slice(0, 24)) {
      const result = await requestJson("/api/video-assets", { method: "POST", headers: { "Content-Type": file.type || "video/mp4", "x-file-name": encodeURIComponent(file.name || "导入视频.mp4") }, body: file }, 10 * 60_000);
      if (result.transcoded) converted += 1;
      imported.push({ id: uid("clip"), name: (file.name || "导入视频").replace(/\.[^.]+$/, ""), src: result.url, start: 0, end: 0, duration: 0, origin: "imported" });
    }
    if (!imported.length) return;
    recordHistory(); editor.clips.push(...imported); editor.status = "idle"; editor.outputSrc = ""; editor.lastError = ""; state.selectedIds = [editor.id];
    renderWorkspace(); scheduleSave(); toast(`已导入 ${imported.length} 条视频${converted ? `，${converted} 条 HEVC 视频已转为 H.264` : ""}`);
  } catch (error) { toast(error?.message || "视频导入失败", true); }
}
async function deleteGeneratedVideoNodeWithFile(nodeId) {
  const node = findNode(nodeId); const filename = node?.type === "video" ? generatedVideoFilename(node.src) : "";
  if (!node || !filename) return toast("该节点不是本地生成视频，普通删除不会清理磁盘文件", true);
  const sameProjectFiles = new Set();
  state.nodes.filter(item => item.id !== nodeId).forEach(item => [item.src, item.originalSrc, item.previewSrc].forEach(source => { const value = generatedVideoFilename(source); if (value) sameProjectFiles.add(value); }));
  const projects = await dbGetAll("projects"); const sharedFiles = new Set();
  projects.filter(project => project?.id && project.id !== state.id).forEach(project => (project.nodes || []).forEach(item => [item.src, item.originalSrc, item.previewSrc].forEach(source => { const value = generatedVideoFilename(source); if (value) sharedFiles.add(value); })));
  const canDeleteFile = !sameProjectFiles.has(filename) && !sharedFiles.has(filename);
  const fileNote = canDeleteFile ? "并删除对应的本地生成视频。此操作不可撤销。" : "。该视频仍被当前项目或其他项目使用，磁盘文件会保留。";
  if (!window.confirm(`删除画布节点“${node.name}”${fileNote}`)) return;
  if (canDeleteFile) {
    try { assertGeneratedMediaDeletion(await removeGeneratedImageFiles([filename]), [filename], "本地生成视频"); }
    catch (error) { return toast(`本地视频删除失败，已保留画布节点：${error.message || "未知错误"}`, true); }
  }
  state.nodes = state.nodes.filter(item => item.id !== nodeId); state.edges = state.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId); state.recentIds = state.recentIds.filter(id => id !== nodeId); state.selectedIds = []; selectedEdgeId = null;
  undoStack = []; redoStack = []; updateHistoryButtons(); renderWorkspace(); scheduleSave();
  toast(canDeleteFile ? "已同步删除画布节点和本地生成视频" : "已删除画布节点；共享本地视频已保留");
}
async function uploadVideoReferenceIntoNode(nodeId, file) {
  const node = findNode(nodeId); if (!node || node.mediaType !== "video" || !file) return;
  const result = await requestJson("/api/video-assets", { method: "POST", headers: { "Content-Type": file.type || "video/mp4", "x-file-name": encodeURIComponent(file.name || "参考视频.mp4") }, body: file }, 10 * 60_000);
  recordHistory(); node.localVideoReference = result.url; renderWorkspace(); scheduleSave(); toast(result.transcoded ? "参考视频已上传并转为 H.264" : "参考视频已上传");
}
async function uploadVideoIntoPreview(nodeId, file) {
  const node = findNode(nodeId); if (!node || node.type !== "video-preview" || !file) return;
  const result = await requestJson("/api/video-assets", { method: "POST", headers: { "Content-Type": file.type || "video/mp4", "x-file-name": encodeURIComponent(file.name || "本地视频.mp4") }, body: file }, 10 * 60_000);
  recordHistory();
  state.edges = state.edges.filter(edge => !(edge.target === node.id && edge.targetPort === "video"));
  node.localVideoSrc = result.url; node.localVideoName = result.name || file.name || "本地视频"; node.outputType = String(result.filename || file.name || "").split(".").pop()?.toLowerCase() || "mp4";
  state.selectedIds = [node.id]; selectedEdgeId = null; renderWorkspace(); scheduleSave(); toast(result.transcoded ? "本地视频已上传并转为 H.264，可连接到 H3 参考视频" : "本地视频已上传，可连接到 H3 参考视频");
}
async function uploadAudioReferenceIntoNode(nodeId, file, slot) {
  const node = findNode(nodeId); if (!node || node.mediaType !== "video" || !file) return;
  const result = await requestJson("/api/audio-assets", { method: "POST", headers: { "Content-Type": file.type || "audio/mpeg", "x-file-name": encodeURIComponent(file.name || "参考音频.mp3") }, body: file }, 10 * 60_000);
  recordHistory();
  state.edges = state.edges.filter(edge => !(edge.target === nodeId && edge.targetPort === 'audio-reference-' + slot));
  if (slot === 2) node.secondAudioReference = result.url;
  else node.localAudioReference = result.url; renderWorkspace(); scheduleSave(); toast("参考音频已上传");
}
function updateVideoClip(nodeId, clipId, field, value) {
  const editor = findNode(nodeId); const clip = editor?.clips?.find(item => item.id === clipId); if (!editor || !clip || !["start", "end"].includes(field)) return;
  const next = Math.max(0, Math.round((Number(value) || 0) * 10) / 10); const other = Number(field === "start" ? clip.end : clip.start) || 0;
  if (field === "start" && other && next >= other) return toast("开始时间需要小于结束时间", true);
  if (field === "end" && next && next <= other) return toast("结束时间需要大于开始时间", true);
  recordHistory(); clip[field] = next; editor.status = "idle"; editor.outputSrc = ""; editor.lastError = ""; renderCanvas(); renderInspector(); scheduleSave();
}
function moveVideoClip(nodeId, clipId, direction) {
  const editor = findNode(nodeId); if (!editor || editor.type !== "video-editor") return;
  const index = editor.clips.findIndex(item => item.id === clipId); const next = direction === "left" ? index - 1 : index + 1;
  if (index < 0 || next < 0 || next >= editor.clips.length) return;
  recordHistory(); [editor.clips[index], editor.clips[next]] = [editor.clips[next], editor.clips[index]]; editor.status = "idle"; editor.outputSrc = ""; editor.lastError = ""; renderCanvas(); renderInspector(); scheduleSave();
}
function removeVideoClip(nodeId, clipId) {
  const editor = findNode(nodeId); if (!editor || editor.type !== "video-editor") return;
  const linked = clipId.startsWith("edge-");
  recordHistory(); editor.clips = editor.clips.filter(clip => clip.id !== clipId); if (linked) { const edgeId = clipId.slice("edge-".length); state.edges = state.edges.filter(edge => edge.id !== edgeId); }
  if (editor.selectedClipId === clipId) editor.selectedClipId = ""; resetVideoEditorOutput(editor); renderWorkspace(); scheduleSave();
}
function probeVideoClip(nodeId, clipId, duration) {
  const editor = findNode(nodeId); const clip = editor?.clips?.find(item => item.id === clipId); const next = Math.round((Number(duration) || 0) * 10) / 10;
  if (!editor || !clip || !next || Math.abs((Number(clip.duration) || 0) - next) < .05) return;
  clip.duration = next; if (!Number(clip.end) || Number(clip.end) > next) clip.end = next; renderCanvas(); renderInspector(); scheduleSave();
}
async function composeVideoEditor(nodeId) {
  const editor = findNode(nodeId); const clips = videoEditorClips(editor); if (!editor || !clips.length || editor.status === "rendering") return;
  editor.status = "rendering"; editor.lastError = ""; renderCanvas(); renderInspector();
  try {
    const response = await requestJson("/api/video-compose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clips: clips.map(clip => ({ src: clip.src, start: Number(clip.start) || 0, end: Number(clip.end) || 0 })) }) }, 30 * 60_000);
    recordHistory(); editor.outputSrc = response.url; editor.outputType = "mp4"; editor.status = "ready"; editor.lastError = ""; renderWorkspace(); scheduleSave(); toast("视频已导出"); return response;
  } catch (error) { editor.status = "error"; editor.lastError = error?.message || "视频合成失败"; renderCanvas(); renderInspector(); toast(editor.lastError, true); }
}
function handleVideoPreviewTimeUpdate(video) {
  const node = findNode(video.dataset.previewComposite); const frame = videoPreviewFrame(node); if (!frame) return;
  if (video.dataset.previewClipId !== frame.entry.clip.id) return;
  const local = Math.max(0, Math.min(frame.entry.duration, video.currentTime - frame.entry.sourceStart)); frame.editor.timelinePlayhead = frame.entry.timelineStart + local; frame.editor.selectedClipId = frame.entry.clip.id; updateTimelinePlayheadDom(frame.editor, false);
  if (frame.editor.previewPlaying && video.currentTime >= frame.entry.sourceEnd - .08) { if (frame.entry.index < videoTimelineEntries(frame.editor).entries.length - 1) advanceVideoPreview(video, frame.editor); else finishVideoEditorPlayback(frame.editor); }
}
function advanceVideoPreview(video, editor) {
  if (!editor.previewPlaying) return;
  const timeline = videoTimelineEntries(editor); const currentIndex = timeline.entries.findIndex(entry => entry.clip.id === editor.selectedClipId); const next = currentIndex >= 0 ? timeline.entries[currentIndex + 1] : null; if (!next) return;
  editor.timelinePlayhead = next.timelineStart; editor.selectedClipId = next.clip.id; updateTimelinePlayheadDom(editor, false); syncVideoPreviewPlayback(editor.id, true);
}
async function exportVideoPreview(nodeId) {
  const preview = findNode(nodeId); const source = videoPreviewSource(preview); if (source) return downloadNode(preview);
  const frame = videoPreviewFrame(preview); if (!frame) return toast("请先上传或连接可用视频", true);
  const response = await composeVideoEditor(frame.editor.id); if (response?.url) downloadNode({ ...preview, type: "video-preview" });
}
function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
function createPreviewDataUrl(source, maxSize = 720, quality = .82) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let objectUrl = "";
    image.onload = () => {
      const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
      const width = Math.max(1, Math.round(image.naturalWidth * ratio));
      const height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d"); context.fillStyle = "#ffffff"; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => { if (objectUrl) URL.revokeObjectURL(objectUrl); reject(new Error("图片预览生成失败")); };
    if (source instanceof Blob) { objectUrl = URL.createObjectURL(source); image.src = objectUrl; } else image.src = source;
  });
}
async function storeLocalAsset(dataUrl, previewDataUrl) {
  return requestJson("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl, previewDataUrl }) }, 90_000);
}
async function persistImportedImage(file) {
  if (file.size > 36 * 1024 * 1024) throw new Error("图片超过 36MB，请先压缩后再上传");
  const dataUrl = await fileToDataUrl(file);
  const pair = await Promise.all([readImageDimensions(dataUrl), createPreviewDataUrl(file)]);
  const asset = await storeLocalAsset(dataUrl, pair[1]);
  return { ...asset, dimensions: pair[0] };
}
async function persistDataUrlImage(dataUrl) {
  const pair = await Promise.all([readImageDimensions(dataUrl), createPreviewDataUrl(dataUrl)]);
  const asset = await storeLocalAsset(dataUrl, pair[1]);
  return { ...asset, dimensions: pair[0] };
}
function readImageDimensions(dataUrl) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight }); image.onerror = reject; image.src = dataUrl; }); }
async function sourceToDataUrl(src) {
  if (src.startsWith("data:")) return src; const response = await fetch(src); if (!response.ok) throw new Error("参考图读取失败");
  const blob = await response.blob();
  return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
}
async function sourceToCompressedDataUrl(src, maxSize, quality, providerLabel) {
  const dataUrl = await sourceToDataUrl(src);
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error(`${providerLabel}参考图读取失败`);
  const blob = await response.blob();
  return createPreviewDataUrl(blob, maxSize, quality);
}
async function sourceToClaudeDataUrl(src) { return sourceToCompressedDataUrl(src, 1400, .8, "Claude "); }
async function sourceToAstraDataUrl(src) { return sourceToCompressedDataUrl(src, 1600, .82, "GPT-6 Astra "); }
async function sourceToKimiPlanDataUrl(src) {
  // Send an optimized copy only; never replace the original canvas image.
  let data = await sourceToCompressedDataUrl(src, 2560, .9, "Kimi K3.1 Pro ");
  if (data.length > 4 * 1024 * 1024) data = await sourceToCompressedDataUrl(src, 1600, .8, "Kimi K3.1 Pro ");
  if (data.length > 4 * 1024 * 1024) throw new Error("Kimi 参考图处理后仍过大，请缩小图片后重试");
  return data;
}
function nodeDisplaySource(node) { return node?.previewSrc || node?.src || ""; }
function imageSourceFromNode(node) {
  if (!node || node.disabled) return ""; if (node.type === "image") return node.originalSrc || node.src || "";
  if (node.type === "generator") { const result = node.lastResultIds?.map(findNode).find(item => item?.src); return result?.src || ""; }
  return "";
}
function videoSourceFromNode(node, seen = new Set()) {
  if (!node || node.disabled || seen.has(node.id)) return "";
  if (node.type === "video-preview") return videoPreviewSource(node, seen);
  seen.add(node.id);
  if (node.type === "video" || node.type === "loading") return node.originalSrc || node.src || "";
  if (node.type === "generator") { const result = node.lastResultIds?.map(findNode).find(item => item?.mediaType === "video" && item.src); return result?.src || ""; }
  if (node.type === "video-editor") return node.outputSrc || "";
  return "";
}
async function requestJson(url, options = {}, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || result.message || `请求失败 (${response.status})`);
    return result;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("请求超时，请确认本机桌面应用仍在运行");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
async function openGeneratedFolder() {
  const node = selectedNode();
  const video = ["video", "video-editor", "video-preview"].includes(node?.type) || node?.mediaType === "video";
  try {
    await requestJson("/api/generated/open-folder?kind=" + (video ? "video" : "image"), { method: "POST" }, 10_000);
    toast(video ? "已请求 Windows 打开生成视频文件夹" : "已请求 Windows 打开生成图片文件夹");
  } catch (error) {
    toast(error?.message || "无法打开生成文件夹", true);
  }
}
function stopGenerationPolling(jobId, resetFailures = true) {
  const timer = generationPollers.get(jobId);
  if (timer) clearTimeout(timer);
  generationPollers.delete(jobId);
  if (resetFailures) generationPollFailures.delete(jobId);
}
function stopAllGenerationPolling() { [...generationPollers.keys()].forEach(stopGenerationPolling); }
function removeGenerationPlaceholders(jobId) {
  const ids = new Set(state.nodes.filter(node => node.type === "loading" && node.generationJobId === jobId).map(node => node.id));
  if (!ids.size) return;
  state.nodes = state.nodes.filter(node => !ids.has(node.id));
  state.edges = state.edges.filter(edge => !ids.has(edge.target));
}
function ensureGenerationPlaceholders(generator, jobId, imageCount = generator.batch, modelId = generatorModelForNode(generator), generationStartedAt = Date.now()) {
  const existing = state.nodes.filter(node => node.type === "loading" && node.generationJobId === jobId);
  if (existing.length) {
    existing.forEach(node => { if (!Number.isFinite(Number(node.generationStartedAt))) node.generationStartedAt = Number(generationStartedAt) || Date.now(); });
    return existing;
  }
  const isVideo = generator.mediaType === "video" || generator.provider === "runninghub-h3";
  const count = isVideo ? 1 : Math.min(4, Math.max(1, Number(imageCount) || Number(generator.batch) || 1));
  const columns = count > 1 ? 2 : 1;
  const provider = generatorProviderForNode(generator);
  const modelLabel = generatorModelLabel(modelId, provider.label);
  const placeholders = Array.from({ length: count }, (_, index) => ({ id: uid("result"), type: "loading", mediaType: isVideo ? "video" : "image", generationJobId: jobId, generationStartedAt: Number(generationStartedAt) || Date.now(), generationStage: isVideo ? "" : undefined, name: `${modelLabel} 结果 ${index + 1}`, x: generator.x + generator.width + 190 + (index % columns) * 310, y: generator.y + Math.floor(index / columns) * 360, width: 270, height: nodeHeight("loading"), source: provider.label, model: modelId, modelLabel, ratio: isVideo ? `${runningHubVideoDimensions(generator).width}:${runningHubVideoDimensions(generator).height}` : generator.aspect, outputType: isVideo ? "mp4" : "png", createdAt: Date.now() + index }));
  state.nodes.push(...placeholders);
  placeholders.forEach(node => state.edges.push({ id: uid("edge"), source: generator.id, sourcePort: isVideo ? "video" : "image", target: node.id, targetPort: "result", type: isVideo ? "video" : "image" }));
  return placeholders;
}
function finishGenerationJob(generatorId, job) {
  const generator = findNode(generatorId);
  if (!generator || generator.activeJobId !== job.id) return;
  const placeholders = ensureGenerationPlaceholders(generator, job.id, job.imageCount, job.model, job.startedAt || job.createdAt);
  const provider = job.provider === "moyu"
    ? { ...generatorProviders[job.provider], model: job.model || generatorProviders[job.provider].model }
    : generatorProviderForNode(generator);
  const modelLabel = generatorModelLabel(job.model || provider.model, provider.label);
  if (job.status === "succeeded") {
    const createdIds = [];
    const isVideo = generator.mediaType === "video" || job.provider === "runninghub-h3";
    const generationDurationMs = Number.isFinite(Number(job.durationMs))
      ? Number(job.durationMs)
      : Math.max(0, Number(job.finishedAt || 0) - Number(job.startedAt || 0));
    const outputs = isVideo ? (job.media || []) : (job.images || []);
    outputs.forEach((image, index) => {
      const placeholder = placeholders[index];
      if (!placeholder) return;
      const node = findNode(placeholder.id);
      const isMjCandidate = job.provider === "midjourney" && job.midjourney?.kind === "grid";
      const mjSlot = job.midjourney?.kind === "upscale" ? Number(job.midjourney.slot) : 0;
      Object.assign(node, { type: isVideo ? "video" : "image", mediaType: isVideo ? "video" : "image", generationJobId: undefined, generationStage: undefined, name: `${modelLabel}${mjSlot ? ` · U${mjSlot}` : ""} · ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} · ${index + 1}`, src: image.url, source: provider.label, model: job.model || provider.model, modelLabel, outputType: image.outputType || (isVideo ? "mp4" : "png"), imageWidth: image.width || undefined, imageHeight: image.height || undefined, midjourneyCandidate: isMjCandidate, midjourneyJobId: isMjCandidate ? job.id : undefined, midjourneySlots: isMjCandidate ? job.midjourney.slots || [] : undefined, videoAspect: isVideo ? generator.videoAspect : undefined, videoMegapixels: isVideo ? generator.videoMegapixels : undefined, videoWidth: isVideo ? image.width : undefined, videoHeight: isVideo ? image.height : undefined, generationDurationMs: isVideo ? generationDurationMs : undefined, generated: true, prompt: generator.activePrompt || "", revisedPrompt: image.revisedPrompt || "" });
      createdIds.push(node.id);
    });
    const unused = placeholders.filter(node => !createdIds.includes(node.id));
    if (unused.length) { const unusedIds = new Set(unused.map(node => node.id)); state.nodes = state.nodes.filter(node => !unusedIds.has(node.id)); state.edges = state.edges.filter(edge => !unusedIds.has(edge.target)); }
    generator.lastResultIds = createdIds;
    delete generator.lastError;
    generator.status = "idle";
    delete generator.activeJobId;
    delete generator.activePrompt;
    state.selectedIds = createdIds;
    state.recentIds = [...createdIds, ...state.recentIds].slice(0, 60);
    state.libraryTab = "history";
    toast(`${provider.label} 已完成 ${createdIds.length} 个${isVideo ? "视频" : "图片"}`);
  } else {
    removeGenerationPlaceholders(job.id);
    generator.status = "idle";
    delete generator.activeJobId;
    delete generator.activePrompt;
    generator.lastError = job.error || "生成失败";
    toast(generator.lastError, true);
  }
  stopGenerationPolling(job.id);
  renderWorkspace();
  scheduleSave();
}
async function pollGenerationJob(generatorId, jobId) {
  stopGenerationPolling(jobId, false);
  if (!state || !findNode(generatorId)?.activeJobId || findNode(generatorId).activeJobId !== jobId) return;
  let delay = 2_000;
  try {
    const result = await requestJson(`/api/jobs/${encodeURIComponent(jobId)}`, {}, 15_000);
    const job = result.job;
    const generator = findNode(generatorId);
    if (!generator || generator.activeJobId !== jobId) return;
    if (job.status === "succeeded" || job.status === "failed" || job.status === "canceled") return finishGenerationJob(generatorId, job);
    generationPollFailures.delete(jobId);
    const hadPlaceholders = state.nodes.some(node => node.type === "loading" && node.generationJobId === jobId);
    const placeholders = ensureGenerationPlaceholders(generator, jobId, job.imageCount, job.model, job.startedAt || job.createdAt);
    const stage = runningHubGenerationStageLabel(job.runningHub?.stage);
    const stageChanged = placeholders.some(node => node.mediaType === "video" && node.generationStage !== stage);
    placeholders.forEach(node => { if (node.mediaType === "video") node.generationStage = stage; });
    if (!hadPlaceholders || stageChanged) { renderCanvas(); requestEdgeRender(); renderLibrary(); renderInspector(); refreshIcons(); }
  } catch {
    // The local service may be restarting. Preserve task state and back off until it returns.
    const failures = (generationPollFailures.get(jobId) || 0) + 1;
    generationPollFailures.set(jobId, failures);
    delay = Math.min(12_000, 2_000 * 2 ** Math.min(failures, 3));
  }
  generationPollers.set(jobId, setTimeout(() => pollGenerationJob(generatorId, jobId), delay));
}
function ensureMidjourneyUpscalePlaceholder(candidate, job) {
  const existing = state.nodes.find(node => node.type === "loading" && node.midjourneyActionJobId === job.id);
  if (existing) return existing;
  const slot = Number(job.midjourney?.slot || candidate.midjourneyActionSlot || 1);
  const placeholder = { id: uid("result"), type: "loading", mediaType: "image", generationJobId: job.id, midjourneyActionJobId: job.id, generationStartedAt: Number(job.createdAt) || Date.now(), name: `Midjourney Fast · U${slot} 单图`, x: candidate.x + candidate.width + 190, y: candidate.y, width: 270, height: nodeHeight("loading"), source: "Midjourney Fast", model: "mj_fast_imagine", modelLabel: "Midjourney Fast", ratio: candidate.ratio || "图片", outputType: "png", createdAt: Date.now() };
  state.nodes.push(placeholder);
  state.edges.push({ id: uid("edge"), source: candidate.id, sourcePort: "image", target: placeholder.id, targetPort: "result", type: "image" });
  return placeholder;
}
function finishMidjourneyUpscale(candidateId, job) {
  const candidate = findNode(candidateId);
  const placeholder = state.nodes.find(node => node.type === "loading" && node.midjourneyActionJobId === job.id);
  if (!candidate || !placeholder) return stopGenerationPolling(job.id);
  if (job.status === "succeeded" && job.images?.[0]?.url) {
    const image = job.images[0]; const slot = Number(job.midjourney?.slot || candidate.midjourneyActionSlot || 1);
    Object.assign(placeholder, { type: "image", mediaType: "image", generationJobId: undefined, midjourneyActionJobId: undefined, name: `Midjourney Fast · U${slot}`, src: image.url, source: "Midjourney Fast", model: job.model || "mj_fast_imagine", modelLabel: "Midjourney Fast", outputType: image.outputType || "png", imageWidth: image.width || undefined, imageHeight: image.height || undefined, generated: true, prompt: candidate.prompt || "", revisedPrompt: image.revisedPrompt || "" });
    candidate.midjourneyUpscaledSlots = [...new Set([...(candidate.midjourneyUpscaledSlots || []), slot])];
    state.selectedIds = [placeholder.id]; state.recentIds = [placeholder.id, ...state.recentIds].slice(0, 60); state.libraryTab = "history";
    toast(`Midjourney U${slot} 单图已完成`);
  } else {
    const ids = new Set([placeholder.id]); state.nodes = state.nodes.filter(node => !ids.has(node.id)); state.edges = state.edges.filter(edge => !ids.has(edge.target));
    toast(job.error || "Midjourney 单图生成失败", true);
  }
  delete candidate.midjourneyActionJobId; delete candidate.midjourneyActionSlot;
  stopGenerationPolling(job.id); renderWorkspace(); scheduleSave();
}
async function pollMidjourneyUpscale(candidateId, jobId) {
  stopGenerationPolling(jobId, false);
  const candidate = findNode(candidateId); if (!state || !candidate || candidate.midjourneyActionJobId !== jobId) return;
  let delay = 2_000;
  try {
    const { job } = await requestJson(`/api/jobs/${encodeURIComponent(jobId)}`, {}, 15_000);
    if (job.status === "succeeded" || job.status === "failed") return finishMidjourneyUpscale(candidateId, job);
    generationPollFailures.delete(jobId);
  } catch {
    const failures = (generationPollFailures.get(jobId) || 0) + 1; generationPollFailures.set(jobId, failures); delay = Math.min(12_000, 2_000 * 2 ** Math.min(failures, 3));
  }
  generationPollers.set(jobId, setTimeout(() => pollMidjourneyUpscale(candidateId, jobId), delay));
}
async function upscaleMidjourneyCandidate(candidateId, slot) {
  const candidate = findNode(candidateId);
  if (!candidate?.midjourneyCandidate || !candidate.midjourneyJobId || candidate.midjourneyActionJobId) return;
  if (!(candidate.midjourneySlots || []).includes(slot)) return toast(`U${slot} 当前不可用`, true);
  recordHistory(); candidate.midjourneyActionJobId = "pending"; candidate.midjourneyActionSlot = slot; renderWorkspace(); scheduleSave();
  try {
    const result = await requestJson(`/api/jobs/${encodeURIComponent(candidate.midjourneyJobId)}/midjourney/upscale`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot }) }, 75_000);
    const job = result.job; if (!job?.id) throw new Error("本机服务未返回 Midjourney 单图任务");
    candidate.midjourneyActionJobId = job.id; ensureMidjourneyUpscalePlaceholder(candidate, job); state.selectedIds = []; toast(`已提交 U${slot} 单图任务`); renderWorkspace(); scheduleSave(); void pollMidjourneyUpscale(candidate.id, job.id);
  } catch (error) {
    delete candidate.midjourneyActionJobId; delete candidate.midjourneyActionSlot; toast(error?.message || "Midjourney 单图任务创建失败", true); renderWorkspace(); scheduleSave();
  }
}
function resumeGenerationJobs() {
  speechController.resume();
  if (!state) return;
  state.nodes.filter(node => node.layerJobId).forEach(node => void pollLayerJob(node.id, node.layerJobId, state.id));
  const active = state.nodes.filter(node => node.type === "generator" && node.activeJobId);
  active.forEach(generator => {
    generator.status = "running";
    pollGenerationJob(generator.id, generator.activeJobId);
  });
  state.nodes.filter(node => node.midjourneyCandidate && node.midjourneyActionJobId && node.midjourneyActionJobId !== "pending").forEach(node => pollMidjourneyUpscale(node.id, node.midjourneyActionJobId));
}
async function runGeneratorNode(nodeId) {
  const generator = findNode(nodeId); if (!generator || generator.type !== "generator" || isGenerating) return;
  if (generator.activeJobId && generator.mediaType !== "video") return ["runninghub-krea2", "runninghub-moss"].includes(generator.provider) ? cancelGeneratorNode(generator) : undefined;
  if (generator.mediaType === "video" || generator.provider === "runninghub-h3") return runVideoGeneratorNode(generator);
  const promptEdges = state.edges.filter(edge => edge.target === nodeId && edge.type === "prompt" && (edge.targetPort === "prompt" || /^prompt-\d+$/.test(edge.targetPort))).sort((a, b) => (a.targetPort === "prompt" ? 0 : Number(a.targetPort.split("-")[1]) || 0) - (b.targetPort === "prompt" ? 0 : Number(b.targetPort.split("-")[1]) || 0));
  const prompt = promptEdges.map(edge => findNode(edge.source)).filter(node => node?.type === "prompt" && !node.disabled).map(node => node.content?.trim()).filter(Boolean).join("\n\n");
  if (!prompt) { selectNode(nodeId); return toast("请连接至少一个有内容且已启用的提示词模块", true); }
  const imageEdges = state.edges.filter(edge => edge.target === nodeId && edge.type === "image" && edge.targetPort.startsWith("image-") && !findNode(edge.source)?.disabled).sort((a, b) => Number(a.targetPort.split("-")[1]) - Number(b.targetPort.split("-")[1]));
  const allReferenceSources = imageEdges.map(edge => imageSourceFromNode(findNode(edge.source))).filter(Boolean);
  if (isArkProvider(generator.provider) && (allReferenceSources.length > generatorReferenceLimit(generator) || allReferenceSources.length !== imageEdges.length)) return toast("请检查参考图：最多 10 张，且连接的图片必须可用", true);
  const referenceSources = allReferenceSources.slice(0, generatorReferenceLimit(generator));
  const provider = generatorProviderForNode(generator);
  const usesMoyu = generator.provider === "moyu";
  const usesArk = isArkProvider(generator.provider);
  const usesProviderKey = usesArk || usesMoyu || generator.provider === "midjourney" || generator.provider === "runninghub-krea2" || generator.provider === "runninghub-moss";
  if (!usesProviderKey && !$("#apiState").classList.contains("is-ready") && !apiKey) { openSettings(); return toast("请先连接 Image2 API", true); }
  if (usesArk) {
    try {
      const status = await requestJson("/api/status", {}, 10_000);
      const channel = generator.provider === "ark-plan" ? status.arkPlan : status.ark;
      if (channel?.protocol !== (generator.provider === "ark-plan" ? arkPlanProtocol : arkProtocol)) return toast("请先在设置中重启本机服务，以加载火山引擎接入", true);
      if (!channel.ready) { openSettings(); return toast(generator.provider === "ark-plan" ? "请先在设置中保存火山 Agent Plan 套餐密钥" : "请先在设置中保存火山引擎官方 API Key", true); }
    } catch { return toast("本机服务不可用，无法检查火山引擎设置", true); }
  }
  if (image25ModelForNode(generator)) {
    try {
      const headers = apiKey ? { "x-image2-api-key": apiKey } : {};
      const status = await requestJson("/api/status", { headers }, 10_000);
      if (status.image25SizeProtocol !== image25SizeProtocol) return toast("本机生图服务需要重启，重启后才能按所选比例生成 Image 2.5 图片", true);
    } catch { return toast("本机服务不可用，无法确认 Image 2.5 比例支持", true); }
  }
  if (generator.provider === "midjourney") {
    try {
      const status = await requestJson("/api/status", {}, 10_000);
      if (!status.midjourney?.ready) { openSettings(); return toast("请先在设置中保存 Midjourney Fast API Key", true); }
    } catch { return toast("本机服务不可用，无法检查 Midjourney 设置", true); }
  }
  if (generator.provider === "runninghub-krea2" || generator.provider === "runninghub-moss") {
    try {
      const status = await requestJson("/api/status", {}, 10_000);
      if (!status.runninghub?.ready) { openSettings(); return toast("请先在设置中保存 RunningHub API Key", true); }
      if (generator.provider === "runninghub-moss" && status.runninghub?.mossWorkflowId !== mossWorkflow.id) return toast("请先在设置中重启本机服务，以加载 MOSS 工作流", true);
    } catch { return toast("本机服务不可用，无法检查 RunningHub 设置", true); }
  }
  isGenerating = true;
  recordHistory();
  generator.status = "running";
  generator.activePrompt = prompt;
  renderWorkspace();
  try {
    const references = await Promise.all(referenceSources.map(sourceToDataUrl));
    const constraints = generator.constraints?.trim();
    const fullPrompt = constraints ? `${prompt}\n\n必须遵守的限制：${constraints}` : prompt;
    if (usesArk) buildArkPayload({ provider: generator.provider, model: generatorModelForNode(generator), prompt: fullPrompt, aspect: generator.aspect, n: 1, references });
    const externalSize = generatorApiSize(generator);
    const requestHeaders = { "Content-Type": "application/json", ...(!usesProviderKey && apiKey ? { "x-image2-api-key": apiKey } : {}), ...(["runninghub-krea2", "runninghub-moss"].includes(generator.provider) && runningHubApiKey ? { "x-runninghub-api-key": runningHubApiKey } : {}) };
    const dimensions = generator.provider === "runninghub-krea2" ? krea2Dimensions(generator) : null;
    const result = await requestJson("/api/generate", { method: "POST", headers: requestHeaders, body: JSON.stringify({ provider: generator.provider || "image2", model: generator.provider === "image2" || usesProviderKey ? generatorModelForNode(generator) : undefined, prompt: fullPrompt, size: generator.provider === "image2" || usesProviderKey ? externalSize : sizeMap[generator.aspect].api, aspect: generator.aspect, width: dimensions?.width, height: dimensions?.height, outputSize: normalizeGeneratorOutputSize(generator), quality: generator.quality, n: usesArk || generator.provider === "midjourney" || generator.provider === "runninghub-moss" ? 1 : generator.batch, references: ["runninghub-krea2", "runninghub-moss"].includes(generator.provider) ? [] : references }) }, 75_000);
    const job = result.job;
    if (!job?.id) throw new Error("本机服务未返回生成任务");
    generator.activeJobId = job.id;
    ensureGenerationPlaceholders(generator, job.id, job.imageCount, job.model, job.createdAt);
    state.selectedIds = [];
    toast(generator.provider === "midjourney" ? `${provider.label} 正在生成四宫格候选图` : `${provider.label} 已进入本机任务队列，正在生成 ${job.imageCount} 张图片`);
    renderWorkspace();
    scheduleSave();
    pollGenerationJob(generator.id, job.id);
  } catch (error) {
    generator.status = "idle";
    delete generator.activePrompt;
    toast(error.message || "生成任务创建失败", true);
    renderWorkspace();
    scheduleSave();
  } finally {
    isGenerating = false;
    updateHistoryButtons();
  }
}
async function copyAnswerText(nodeId) {
  const answer = String(findNode(nodeId)?.answer || "").trim();
  if (!answer) return toast("暂无可复制的模型回答", true);
  const fallback = () => { const field = document.createElement("textarea"); field.value = answer; field.style.position = "fixed"; field.style.opacity = "0"; document.body.append(field); field.select(); const copied = document.execCommand("copy"); field.remove(); return copied; };
  let copied = false;
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(answer); copied = true; } } catch { copied = false; }
  if (!copied) copied = fallback();
  toast(copied ? "模型回答已复制" : "复制失败，请手动选择文本复制", !copied);
}

function resolveH3AnswerMode(node, referenceCount) {
  const selected = normalizedH3AnswerMode(node?.h3Mode);
  if (selected !== "auto") return selected;
  if (!referenceCount) return "t2va";
  if (referenceCount === 1) return "i2va";
  if (referenceCount === 2) return "fl2va";
  return "ref2va";
}
async function runAnswerNode(nodeId) {
  const node = findNode(nodeId);
  if (!node || node.type !== "answer" || node.status === "running") return;
  const promptEdges = state.edges.filter(edge => edge.target === nodeId && edge.type === "prompt" && (edge.targetPort === "prompt" || edge.targetPort.startsWith("prompt-"))).sort((a, b) => { const aIndex = a.targetPort === "prompt" ? 0 : Number(a.targetPort.split("-")[1]) || 0; const bIndex = b.targetPort === "prompt" ? 0 : Number(b.targetPort.split("-")[1]) || 0; return aIndex - bIndex; });
  const prompt = promptEdges.map(edge => { const source = findNode(edge.source); return source?.type === "prompt" && !source.disabled ? source.content?.trim() : ""; }).filter(Boolean).join("\n\n");
  const nuyoahEnabled = node.answerSkill === "nuyoah-reverse";
  if (!prompt && !nuyoahEnabled) { selectNode(nodeId); return toast("请连接至少一个有内容且已启用的提示词模块", true); }
  const usesDeepseek = answerModelIsDeepseek(node.model);
  const usesClaude = answerModelIsClaude(node.model);
  const usesKimi = answerModelIsKimi(node.model);
  const usesKimiPlan = node.model === "kimi-k3.1-pro";
  const usesGeminiNeon = node.model === "gemini-4-neon";
  const usesAstra = node.model === "gpt-6-astra";
  const kimiModel = usesKimi ? normalizedKimiAnswerModel(node.model) : "";
  try {
    const status = await requestJson("/api/status", {}, 8_000);
    if (usesKimiPlan) {
      if (status.arkPlanAnswer?.protocol !== "kimi-ark-plan-v1") return toast("请先在设置中重启本机服务，以加载火山套餐 Kimi K3.1 Pro", true);
      if (!status.arkPlanAnswer.ready) { openSettings(); setTimeout(() => { const input = $("#arkPlanApiKeyInput"); input?.scrollIntoView({block:"center"}); input?.focus(); }, 50); return toast("请先在设置中保存火山 Agent Plan 套餐密钥", true); }
    }
    const kimiGateway = kimiModel === "kimi-k3-moyu" ? "moyu" : "moonshot";
    const kimiReady = status.kimi?.providers?.[kimiGateway]?.ready;
    if (usesGeminiNeon && !status.geminiNeon?.ready) { openSettings("gemini-neon"); return toast("请先在设置中保存 Gemini 4 Neon API Key", true); }
    if (!usesKimiPlan && !usesGeminiNeon && (usesDeepseek ? !status.deepseek?.ready : usesClaude ? !status.claude?.ready : usesKimi ? !kimiReady : !status.ready && !apiKey)) { openSettings(usesKimi ? "kimi" : ""); return toast(usesDeepseek ? "请先在设置中保存 DeepSeek API Key" : usesClaude ? "请先在设置中保存 Claude API Key" : usesKimi ? `请先在设置中保存 ${kimiGateway === "moyu" ? "魔芋 AI" : "Moonshot 官方"} Kimi API Key` : "请先连接 API", true); }
  } catch { openSettings(); return toast("本机服务不可用，无法检查模型配置", true); }
  if (usesDeepseek) {
    try {
      const health = await requestJson("/api/providers/deepseek/health", {}, 15_000);
      if (!health.ready || !Array.isArray(health.models) || !health.models.includes(node.model)) {
        const available = Array.isArray(health.models) && health.models.length ? `当前可用模型：${health.models.join("、")}` : "网关没有返回可用模型";
        selectNode(nodeId); return toast(`当前 DeepSeek 模型不可用，${available}`, true);
      }
    } catch (error) {
      selectNode(nodeId); return toast(error?.message || "DeepSeek 网关不可用，请检查设置", true);
    }
  }
  if (usesKimi) {
    try {
      const health = await requestJson(`/api/providers/kimi/health?model=${encodeURIComponent(kimiModel)}`, {}, 15_000);
      if (!health.ready || health.apiModel !== "kimi-k3") { selectNode(nodeId); return toast(`${kimiGateway === "moyu" ? "魔芋 AI" : "Moonshot 官方"} 网关没有返回可用的 Kimi K3`, true); }
    } catch (error) {
      selectNode(nodeId); return toast(error?.message || `${kimiGateway === "moyu" ? "魔芋 AI" : "Moonshot 官方"} Kimi 网关不可用，请检查设置`, true);
    }
  }
  const imageEdges = state.edges.filter(edge => edge.target === nodeId && edge.type === "image" && edge.targetPort.startsWith("image-") && !findNode(edge.source)?.disabled).sort((a, b) => Number(a.targetPort.split("-")[1]) - Number(b.targetPort.split("-")[1]));
  const sources = imageEdges.map(edge => imageSourceFromNode(findNode(edge.source))).filter(Boolean).slice(0, 8);
  if (usesGeminiNeon && sources.length) { selectNode(nodeId); return toast("当前网关的 Gemini 4 Neon 尚未通过图片输入验证，请断开参考图后使用文本问答", true); }
  if (nuyoahEnabled && !sources.length) { selectNode(nodeId); return toast("南鸢图片反推需要至少连接一张参考图", true); }
  if (usesDeepseek && sources.length && node.model !== deepseekVisionAnswerModel) { selectNode(nodeId); return toast("当前 DeepSeek 模型不支持图片输入，请切换到 V4.1 Flash", true); }
  recordHistory(); node.status = "running"; node.error = ""; if (!updateAnswerNodeDom(node)) renderCanvas(); renderInspector();
  try {
    const originalReferences = await Promise.all(sources.map(sourceToDataUrl));
    const referenceMetadata = nuyoahEnabled ? await Promise.all(originalReferences.map(async dataUrl => { try { return await readImageDimensions(dataUrl); } catch { return null; } })) : undefined;
    const references = usesKimiPlan ? await Promise.all(originalReferences.map(sourceToKimiPlanDataUrl)) : usesClaude ? await Promise.all(originalReferences.map(sourceToClaudeDataUrl)) : usesAstra || usesGeminiNeon ? await Promise.all(originalReferences.map(sourceToAstraDataUrl)) : originalReferences;
    const h3Enabled = node.answerSkill === "minimax-h3";
    const h3Mode = h3Enabled ? resolveH3AnswerMode(node, references.length) : node.answerSkill === "minimalist-product-ad" ? resolveH3AnswerMode({ h3Mode: node.productAdH3Mode }, references.length) : node.answerSkill === "brand-promo-video" ? resolveH3AnswerMode({ h3Mode: node.brandPromoH3Mode }, references.length) : undefined;
    const adDurationSeconds = node.answerSkill === "minimalist-product-ad" ? normalizedProductAdDuration(node.productAdDuration, 10) : node.answerSkill === "brand-promo-video" ? normalizedBrandPromoDuration(node.brandPromoDuration, 15) : undefined;
    const result = await requestJson("/api/respond", { method: "POST", headers: { "Content-Type": "application/json", ...(!usesDeepseek && !usesClaude && !usesKimi && !usesKimiPlan && !usesGeminiNeon && apiKey ? { "x-image2-api-key": apiKey } : {}) }, body: JSON.stringify({ prompt: prompt || "请对连接的参考图进行完整图片反推。", model: usesKimi ? kimiModel : node.model, references, referenceMetadata, skill: node.answerSkill, h3Mode, durationSeconds: h3Enabled ? normalizedH3Duration(node.h3Duration) : undefined, adDurationSeconds, deepseekThinking: usesDeepseek ? node.deepseekThinking : undefined, deepseekReasoningEffort: usesDeepseek ? node.deepseekReasoningEffort : undefined, kimiReasoningEffort: usesKimiPlan ? "high" : usesKimi ? "max" : undefined }) }, 240_000);
    node.answer = String(result.answer || ""); node.model = result.model || node.model; node.status = "idle";
    toast("模型回答已完成");
  } catch (error) {
    node.status = "idle"; node.error = error?.message || "模型回答失败";
    toast(node.error, true);
  } finally {
    if (!updateAnswerNodeDom(node)) renderCanvas(); renderInspector(); scheduleSave(); updateHistoryButtons();
  }
}function setCropSelection(selection) {
  if (!cropSession) return; cropSession.selection = selection; cropSelection.hidden = false;
  cropSelection.style.left = `${selection.x * 100}%`; cropSelection.style.top = `${selection.y * 100}%`; cropSelection.style.width = `${selection.width * 100}%`; cropSelection.style.height = `${selection.height * 100}%`;
}
function resetCropSelection() { if (cropSession) setCropSelection({ x: .15, y: .15, width: .7, height: .7 }); }
async function openNodeLocalEditor(nodeId){
  const node=findNode(nodeId),projectId=state?.id;if(!node||node.type!=='image'||!node.src)return;
  if(node.layerJobId)return toast('请等待当前拆层任务完成后再编辑',true);
  const current=()=>{if(state?.id!==projectId||!findNode(nodeId))throw Error('原项目或节点已关闭，请重新打开');return findNode(nodeId);};
  const source=()=>{const n=current();return n.originalSrc||n.src;};
  try{const editor=await getLocalEditor();await editor.openLocalEditor({name:node.name,source:source(),session:node.localEdit,layered:!!node.layerDocument,currentSource:source,onPersist:persistDataUrlImage,
    onSession:async(session,durable)=>{const n=current(),old=n.localEdit;n.localEdit=session;if(durable){try{await saveProjectNow(true);}catch(e){if(old)n.localEdit=old;else delete n.localEdit;throw e;}}else scheduleSave();},
    onCommit:async({session,asset})=>{
      const [dimensions,originalDimensions]=await Promise.all([readImageDimensions(asset.url),readImageDimensions(session.source)]),n=current();
      if(source()!==session.source)throw Error('原图已变化，请开始新一轮修改，当前对比记录保留');
      if(dimensions.width!==originalDimensions.width||dimensions.height!==originalDimensions.height)throw Error('修改结果像素尺寸与原图不一致，未应用，请恢复预览后重试');
      const layerDocument=n.layerDocument?applyLocalEditToLayers(n.layerDocument,asset.url,dimensions.width,dimensions.height):null;
      const layerDraft=n.layerDraft?applyLocalEditToLayers(n.layerDraft,asset.url,dimensions.width,dimensions.height):null;
      const before=snapshot(),backup=structuredClone(n),next=structuredClone(session);
      next.status='applied';next.appliedToNode=true;
      if(!next.history?.some(h=>h.before===session.source&&h.after===asset.url))next.history=[...(next.history||[]),{before:session.source,after:asset.url,model:session.model,createdAt:Date.now()}];
      Object.assign(n,{src:asset.url,originalSrc:asset.url,previewSrc:asset.url,imageWidth:dimensions.width,imageHeight:dimensions.height,ratio:dimensions.width+':'+dimensions.height,outputType:'png',localEdit:next});
      if(layerDocument)n.layerDocument=layerDocument;if(layerDraft)n.layerDraft=layerDraft;
      try{await saveProjectNow(true);}catch(e){Object.keys(n).forEach(k=>delete n[k]);Object.assign(n,backup);throw e;}
      recordHistory(before);renderWorkspace();return next;
    },onClose:()=>{if(state?.id===projectId)renderWorkspace();}});
  }catch(error){toast(error.message||'无法打开局部修改',true);}
}
async function openNodeLayerEditor(nodeId) {
  const node=findNode(nodeId),projectId=state?.id;
  if(!node||node.type!=='image'||!node.src)return;
  if(node.layerJobId){void pollLayerJob(node.id,node.layerJobId,projectId);return toast(node.layerError?'正在重新检查拆层结果：'+node.layerError:'拆层仍在处理中，完成后会自动回填一个分层节点',!!node.layerError);}
  try{
    const editor=await getLayerEditor();
    await editor.openLayerEditor({name:node.name,source:node.layerSource||imageSourceFromNode(node),doc:node.layerDraft||node.layerDocument,hasDraft:!!node.layerDraft,model:node.layerModel,refinement:node.layerRefinement,
      onPersist:persistDataUrlImage,
      onFlush:async()=>{if(state?.id!==projectId||!findNode(nodeId))throw new Error('原项目已关闭，请重新打开后操作');await saveProjectNow(true);},
      onRefinement:async session=>{if(state?.id!==projectId||!findNode(nodeId))throw new Error('原项目已关闭，请重新打开后操作');const current=findNode(nodeId);if(session)current.layerRefinement=session;else delete current.layerRefinement;await saveProjectNow(true);},
      onDraft:doc=>{if(state?.id!==projectId||!findNode(nodeId))return;findNode(nodeId).layerDraft=doc;scheduleSave();},
      onUpload:async file=>{if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw new Error('请选择 PNG、JPG 或 WebP');if(file.size>30*1024*1024)throw new Error('图层素材不能超过 30 MB');return persistDataUrlImage(await fileToDataUrl(file));},
      onSave:async doc=>{
        const stored=await persistDataUrlImage(await editor.renderLayerComposite(doc));
        if(state?.id!==projectId||!findNode(nodeId))throw new Error('原项目已关闭，请重新打开后保存');
        recordHistory();const current=findNode(nodeId);current.layerDocument=doc;delete current.layerDraft;current.src=stored.url;current.originalSrc=stored.url;current.previewSrc=stored.url;current.imageWidth=doc.width;current.imageHeight=doc.height;current.source='分层作品 · '+leafLayers(doc.layers).length+' 层';renderWorkspace();await saveProjectNow(true);
      },
      onStart:async({model,prompt})=>{
        const status=await requestJson('/api/layers/status',{},10000);
        if(status.protocol!=='seedream-layer-document-v1')throw new Error('请先在设置中重启本机服务以加载拆层功能');
        if(!status.ready)throw new Error('请先在设置中保存火山 Agent Plan 套餐密钥');
        const source=node.layerSource||imageSourceFromNode(node);let image=await sourceToDataUrl(source);
        if(!/^data:image\/(png|jpeg);/.test(image)){const converted=new Image();await new Promise((resolve,reject)=>{converted.onload=resolve;converted.onerror=reject;converted.src=image;});const c=document.createElement('canvas');c.width=converted.naturalWidth;c.height=converted.naturalHeight;c.getContext('2d').drawImage(converted,0,0);image=c.toDataURL('image/png');}
        if(state?.id!==projectId)throw new Error('项目已切换，请重新操作');
        const {job}=await requestJson('/api/layers/decompose',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:'ark-plan',model,image,prompt})},60000);
        recordHistory();const result={id:uid('image'),type:'image',name:node.name+' · 分层',src:source,originalSrc:source,previewSrc:node.previewSrc||source,layerSource:source,layerJobId:job.id,layerModel:model,x:node.x+node.width+60,y:node.y,width:Math.max(360,node.width),height:Math.max(300,node.height),source:'分层处理中',createdAt:Date.now()};
        state.nodes.push(result);state.selectedIds=[result.id];renderWorkspace();await saveProjectNow();void pollLayerJob(result.id,job.id,projectId);toast('拆层任务已提交，只会生成一个分层作品节点');
      }
    });
  }catch(error){toast(error.message||'无法打开分层编辑',true);}
}
async function pollLayerJob(nodeId,jobId,projectId) {
  const pollKey=projectId+':'+nodeId+':'+jobId;
  if(layerJobPollers.has(pollKey))return;
  if(state?.id!==projectId||findNode(nodeId)?.layerJobId!==jobId)return;
  layerJobPollers.set(pollKey,true);let terminal=false;
  try{
    const response=await fetch('/api/jobs/'+encodeURIComponent(jobId),{signal:AbortSignal.timeout(15000)});
    const result=await response.json();
    if(!response.ok){terminal=response.status===404;throw new Error(result.error||'拆层状态读取失败');}
    const {job}=result;
    if(state?.id!==projectId||findNode(nodeId)?.layerJobId!==jobId)return;
    const node=findNode(nodeId);
    if(job.status==='succeeded'){
      terminal=true;
      if(!job.layerDocument)throw new Error('服务未返回分层文档，请更新本机服务');
      const doc=structuredClone(job.layerDocument);doc.originalSrc=node.layerSource;doc.name=node.name;
      const editor=await getLayerEditor(),stored=await persistDataUrlImage(await editor.renderLayerComposite(doc));
      if(state?.id!==projectId||findNode(nodeId)?.layerJobId!==jobId)return;
      recordHistory();Object.assign(findNode(nodeId),{layerDocument:doc,src:stored.url,originalSrc:stored.url,previewSrc:stored.url,imageWidth:doc.width,imageHeight:doc.height,source:'分层作品 · '+doc.layers.length+' 层'});delete findNode(nodeId).layerJobId;terminal=true;renderWorkspace();await saveProjectNow();toast('拆层完成，点击图层按钮即可自由编辑');
    }else if(['failed','canceled'].includes(job.status)){node.layerError=job.error||'拆层失败';node.source='拆层失败 · 原图保留';delete node.layerJobId;terminal=true;renderWorkspace();await saveProjectNow();toast(node.layerError,true);}
  }catch(error){const node=findNode(nodeId);if(state?.id===projectId&&node?.layerJobId===jobId){const first=node.layerError!==error.message;node.layerError=error.message;node.source='拆层结果待恢复 · 点击图层按钮重试';scheduleSave();if(first){renderWorkspace();toast(error.message,true);}}}
  finally{layerJobPollers.delete(pollKey);if(!terminal&&state?.id===projectId&&findNode(nodeId)?.layerJobId===jobId){const timer=setTimeout(()=>{layerJobPollers.delete(pollKey);void pollLayerJob(nodeId,jobId,projectId);},5000);layerJobPollers.set(pollKey,timer);}}
}
function openCropDialog(nodeId) {
  const node = findNode(nodeId); const originalSource = node?.originalSrc || node?.src; if (!originalSource) return toast("请先上传或生成一张图片", true);
  cropSession = { nodeId, originalSource, selection: { x: .15, y: .15, width: .7, height: .7 }, start: null }; cropSourceImage.src = originalSource; cropSelection.hidden = true;
  if (!cropDialog.open) cropDialog.showModal();
  if (cropSourceImage.complete) requestAnimationFrame(resetCropSelection);
}
function closeCropDialog() {
  cropSession = null; cropSelection.hidden = true; cropSourceImage.removeAttribute("src"); if (cropDialog.open) cropDialog.close();
}
function cropPoint(event) {
  const rect = cropSourceImage.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)) };
}
function startCropSelection(event) {
  if (!cropSession || !cropSourceImage.complete) return; event.preventDefault(); const point = cropPoint(event); cropSession.start = point; setCropSelection({ x: point.x, y: point.y, width: 0, height: 0 }); cropCanvas.setPointerCapture?.(event.pointerId);
}
function moveCropSelection(event) {
  if (!cropSession?.start) return; const point = cropPoint(event); const x = Math.min(cropSession.start.x, point.x); const y = Math.min(cropSession.start.y, point.y); setCropSelection({ x, y, width: Math.abs(point.x - cropSession.start.x), height: Math.abs(point.y - cropSession.start.y) });
}
function endCropSelection(event) {
  if (!cropSession?.start) return; moveCropSelection(event); cropSession.start = null; if (cropSession.selection.width < .02 || cropSession.selection.height < .02) resetCropSelection();
}
function cropRatioLabel(width, height) { const gcd = (a, b) => b ? gcd(b, a % b) : a; const divisor = gcd(Math.max(1, Math.round(width)), Math.max(1, Math.round(height))); return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`; }
async function confirmCrop() {
  const sourceNode = findNode(cropSession?.nodeId); const selection = cropSession?.selection; if (!cropSession?.originalSource || !sourceNode || !selection || !cropSourceImage.naturalWidth) return toast("图片尚未准备完成", true);
  try {
    const sourceWidth = cropSourceImage.naturalWidth; const sourceHeight = cropSourceImage.naturalHeight;
    const sx = Math.min(sourceWidth - 1, Math.max(0, Math.round(selection.x * sourceWidth))); const sy = Math.min(sourceHeight - 1, Math.max(0, Math.round(selection.y * sourceHeight)));
    const sw = Math.min(sourceWidth - sx, Math.max(1, Math.round(selection.width * sourceWidth))); const sh = Math.min(sourceHeight - sy, Math.max(1, Math.round(selection.height * sourceHeight)));
    const canvas = document.createElement("canvas"); canvas.width = sw; canvas.height = sh;
    const context = canvas.getContext("2d", { alpha: true, colorSpace: "srgb" }); context.imageSmoothingEnabled = false; context.drawImage(cropSourceImage, sx, sy, sw, sh, 0, 0, sw, sh);
    const cropped = canvas.toDataURL("image/png"); const stored = await persistDataUrlImage(cropped); recordHistory(); const node = { id: uid("image"), type: "image", name: `${sourceNode.name} · 裁剪`, x: Math.round(sourceNode.x + sourceNode.width + 46), y: Math.round(sourceNode.y + 36), width: 270, height: nodeHeight("image"), src: stored.url, previewSrc: stored.previewUrl || stored.url, originalSrc: stored.url, source: `${sourceNode.source || "参考图"} · 裁剪`, ratio: cropRatioLabel(sw, sh), createdAt: Date.now() };
    state.nodes.push(node); state.selectedIds = [node.id]; selectedEdgeId = null; closeCropDialog(); renderWorkspace(); scheduleSave(); toast("已创建裁剪参考图节点");
  } catch (error) { toast("裁剪失败，请使用本地上传或本机生成的图片", true); }
}

function openPreview(node) { const source = node?.originalSrc || node?.src; if (!source) return; $("#previewImage").hidden = false; previewVideo.hidden = true; previewVideo.pause(); previewVideo.removeAttribute("src"); $("#previewImage").src = source; previewDialog.showModal(); }
function openVideoPreview(node) { const source = node?.type === "video-preview" ? videoPreviewSource(node) : node?.originalSrc || node?.src; if (!source) return; $("#previewImage").hidden = true; previewVideo.hidden = false; previewVideo.src = source; previewVideo.load(); previewDialog.showModal(); }
async function downloadNode(node) {
  try {
    const source = node?.type === "video-preview" ? videoPreviewSource(node) : node?.originalSrc || node?.src;
    const isVideo = node?.type === "video" || node?.type === "video-preview";
    if (!source) throw new Error(`${isVideo ? "视频" : "图片"}地址为空`);
    let href = source;
    let objectUrl = "";
    if (href.startsWith("data:")) {
      const [meta, encoded] = href.split(",", 2);
      const mime = meta.match(/^data:([^;]+)/)?.[1] || (isVideo ? "video/mp4" : "image/png");
      const binary = atob(encoded || "");
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
      href = objectUrl;
    }
    const sourceExtension = node?.outputType || source.match(/^data:(?:image|video)\/(mp4|webm|quicktime|png|jpeg|webp)/i)?.[1] || source.match(/\.(mp4|webm|mov|png|jpe?g|webp)(?:[?#]|$)/i)?.[1] || (isVideo ? "mp4" : "png");
    const extension = sourceExtension.toLowerCase() === "jpeg" ? "jpg" : sourceExtension.toLowerCase() === "quicktime" ? "mov" : sourceExtension.toLowerCase();
    const link = document.createElement("a");
    link.href = href;
    link.download = `${node.name.replace(/[\\/:*?"<>|]/g, "-")}.${extension}`;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    toast(`${isVideo ? "视频" : "图片"}下载已开始`);
  } catch { toast(`${node?.type === "video" || node?.type === "video-preview" ? "视频" : "图片"}下载失败`, true); }
}
function exportProject() { const blob = new Blob([JSON.stringify(cleanProjectForSave(), null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${state.projectName.replace(/[\\/:*?"<>|]/g, "-")}.image2.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function importProject(file) {
  try { const parsed = JSON.parse(await file.text()); if (!Array.isArray(parsed.nodes)) throw new Error("项目文件缺少节点数据"); const imported = normalizeImportedIdentity(normalizeProject(parsed)); imported.id = uid("project"); imported.projectName = `${imported.projectName || "导入项目"} · 导入`; imported.createdAt = Date.now(); imported.updatedAt = Date.now(); await dbPutBoth(imported); projectMetas.unshift(projectMeta(imported)); await openProject(imported.id); toast("项目已作为新项目导入"); }
  catch (error) { toast(error.message || "项目文件无法读取", true); }
}
function toast(message, isError = false) { const element = document.createElement("div"); element.className = `toast${isError ? " is-error" : ""}`; element.innerHTML = `${icon(isError ? "circle-alert" : "circle-check")}<span>${escapeHtml(message)}</span>`; $("#toastRegion").appendChild(element); refreshIcons(); setTimeout(() => element.remove(), 4300); }
let connectionCheck = 0;
function setConnectionLight(status, label) {
  const light = $("#apiState");
  light.classList.toggle("is-ready", status === "ready");
  light.classList.toggle("is-error", status === "error");
  light.title = label;
  light.setAttribute("aria-label", label);
}
async function checkApiStatus() {
  const check = ++connectionCheck;
  setConnectionLight("checking", "Image2 正在检查连接");
  const headers = apiKey ? { "x-image2-api-key": apiKey } : {};
  try {
    const status = await requestJson("/api/status", { headers }, 10_000);
    if (check !== connectionCheck) return;
    $("#apiBase").value = status.baseUrl || "https://rehdasu.cn/v1";
    if (!status.ready && !apiKey) return setConnectionLight("error", "Image2 需要 API Key");
    const health = await requestJson("/api/health", { headers }, 20_000);
    if (check !== connectionCheck) return;
    setConnectionLight(health.ready ? "ready" : "error", health.ready ? "Image2 连接正常" : "Image2 模型不可用");
  } catch {
    if (check === connectionCheck) setConnectionLight("error", "Image2 连接异常");
  }
}
async function restartImage2Service() {
  const restartButton = $("#restartServiceButton");
  if (!restartButton || restartButton.disabled) return;
  restartButton.disabled = true;
  ++connectionCheck;
  setConnectionLight("checking", "正在重启本机服务");
  try {
    await requestJson("/api/restart", { method: "POST" }, 8_000);
    const startedAt = Date.now(); let ready = false;
    while (Date.now() - startedAt < 15_000) {
      await new Promise(resolve => setTimeout(resolve, 600));
      try { await requestJson("/api/status", {}, 1_500); ready = true; break; } catch { /* 服务切换期间短暂不可用 */ }
    }
    if (!ready) throw new Error("本机服务未能在规定时间内恢复");
    await checkApiStatus(); toast("本机服务已重启");
  } catch (error) {
    setConnectionLight("error", "本机服务重启失败"); toast(error.message || "生图服务恢复失败", true);
  } finally { restartButton.disabled = false; }
}
async function runVideoGeneratorNode(generator) {
  if (generator.status === "running" && generator.activeJobId) return cancelVideoGeneratorNode(generator);
  const promptEdges = state.edges.filter(edge => edge.target === generator.id && edge.type === "prompt" && (edge.targetPort === "prompt" || /^prompt-\d+$/.test(edge.targetPort))).sort((a, b) => (a.targetPort === "prompt" ? 0 : Number(a.targetPort.split("-")[1]) || 0) - (b.targetPort === "prompt" ? 0 : Number(b.targetPort.split("-")[1]) || 0));
  const prompt = promptEdges.map(edge => findNode(edge.source)).filter(node => node?.type === "prompt" && !node.disabled).map(node => node.content?.trim()).filter(Boolean).join("\n\n");
  if (!prompt) { selectNode(generator.id); return toast("请连接至少一个有内容且已启用的提示词模块", true); }
  const imageEdges = state.edges.filter(edge => edge.target === generator.id && edge.type === "image" && /^image-\d+$/.test(edge.targetPort) && !findNode(edge.source)?.disabled).sort((a, b) => Number(a.targetPort.split("-")[1]) - Number(b.targetPort.split("-")[1]));
  const mode = runningHubVideoMode(generator);
  const requiredReferences = isWenwu(generator) ? 0 : 1;
  if (imageEdges.length < requiredReferences) { selectNode(generator.id); return toast(`${mode.label}至少需要连接 ${requiredReferences} 张参考图`, true); }
  const audio1 = videoReferenceAudio(generator, 1);
  const audio2 = isWenwu(generator) ? videoReferenceAudio(generator, 2) : { src: '', linked: false };
  const linkedAudio = [audio1, audio2].filter(audio => audio.linked);
  if (linkedAudio.some(audio => !audio.src)) return toast('请检查已连接的声音克隆结果，再生成视频', true);
  if (linkedAudio.length || isWenwu(generator) || !runningHubApiKey) {
    try {
      const status = await requestJson("/api/status", {}, 10_000);
      if (isWenwu(generator) && generator.videoSeconds > (status.runninghub?.wenwuMaxSeconds ?? 15)) return toast("请在设置中点击「重启本机服务」，再提交超过 15 秒的视频", true);
      if (linkedAudio.length && !status.runninghub?.cloneAudioReferences) return toast('请在设置中点击「重启本机服务」，以启用克隆音频连线', true);
      if (isWenwu(generator) && status.runninghub?.wenwuWorkflowId !== wenwuId) return toast("请在设置中点击「重启本机服务」，再运行文武双全", true);
      if (!runningHubApiKey && !status.runninghub?.ready) { openSettings(); return toast("请先在设置中保存 RunningHub API Key", true); }
    }
    catch { return toast("本机服务不可用，无法检查 RunningHub 设置", true); }
  }
  isGenerating = true; recordHistory(); generator.status = "running"; generator.activePrompt = prompt; delete generator.lastError; renderWorkspace();
  try {
    const dimensions = runningHubVideoDimensions(generator);
    const referenceSources = imageEdges.map(edge => imageSourceFromNode(findNode(edge.source))).filter(Boolean).slice(0, generatorReferenceLimit(generator));
    const references = await Promise.all(referenceSources.map(sourceToDataUrl));
    const videoEdge = state.edges.find(edge => edge.target === generator.id && edge.targetPort === "video-reference" && edge.type === "video");
    const linkedVideoReference = videoEdge ? videoSourceFromNode(findNode(videoEdge.source)) : "";
    if (videoEdge && !linkedVideoReference) throw new Error("已连接的参考视频节点没有可用视频，请先上传或导出视频");
    const result = await requestJson("/api/generate", { method: "POST", headers: { "Content-Type": "application/json", ...(runningHubApiKey ? { "x-runninghub-api-key": runningHubApiKey } : {}) }, body: JSON.stringify({ provider: "runninghub-h3", prompt, aspect: generator.videoAspect, megapixels: generator.videoMegapixels, seconds: generator.videoSeconds, videoMode: mode.value, multiple: generator.videoMultiple, secondAudioReference: audio2.src || undefined, references, videoReference: linkedVideoReference || generator.localVideoReference || "", audioReference: audio1.src }) }, 75_000);
    const job = result.job; if (!job?.id) throw new Error("本机服务未返回视频任务");
    generator.activeJobId = job.id; ensureGenerationPlaceholders(generator, job.id, 1, job.model, job.createdAt); state.selectedIds = []; toast(`${runningHubVideoProvider.label} 已进入任务队列，正在生成视频`); renderWorkspace(); scheduleSave(); pollGenerationJob(generator.id, job.id);
  } catch (error) { generator.status = "idle"; delete generator.activePrompt; toast(error.message || "视频任务创建失败", true); renderWorkspace(); scheduleSave(); }
  finally { isGenerating = false; updateHistoryButtons(); }
}
async function cancelVideoGeneratorNode(generator) {
  const jobId = generator?.activeJobId;
  if (!jobId) return;
  try {
    const result = await requestJson(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST" }, 45_000);
    if (result.job) finishGenerationJob(generator.id, result.job);
    else toast("视频任务已停止");
  } catch (error) {
    toast(error?.message || "停止视频任务失败", true);
  }
}
async function cancelGeneratorNode(generator) {
  const jobId = generator?.activeJobId;
  if (!jobId) return;
  const label = generatorProviderForNode(generator).label;
  try {
    const result = await requestJson(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST" }, 45_000);
    if (result.job) finishGenerationJob(generator.id, result.job);
    else toast(`${label}任务已停止`);
  } catch (error) {
    toast(error?.message || `停止${label}任务失败`, true);
  }
}
async function refreshSeedreamSettingsStatus() {
  const statusElement = $("#seedreamKeyStatus"); if (!statusElement) return;
  try {
    const result = await requestJson("/api/status", {}, 5_000);
    const planStatus = $("#arkPlanKeyStatus"); if (planStatus) planStatus.textContent = result.arkPlan?.ready ? "套餐密钥已配置 · Agent Plan · 使用套餐额度，与普通官方渠道独立" : result.arkPlan ? "尚未配置 Agent Plan 套餐密钥，不使用普通官方密钥代替。" : "请先在设置中重启本机服务以加载套餐渠道。";
    const arkStatus = $("#arkKeyStatus"); if (arkStatus) arkStatus.textContent = result.ark?.ready ? "火山引擎官方密钥已配置 · Flash / Pro · 最多 10 张参考图" : result.ark ? "尚未配置火山引擎官方密钥，与现有 Seedream 网关独立。" : "请先在设置中重启本机服务以启用火山引擎。";
    statusElement.textContent = result.seedream?.ready ? `已配置 · ${result.seedream.model}` : "尚未配置，保存密钥后即可在生图节点中选择 Seedream。";
  } catch { statusElement.textContent = "本机服务暂时不可用，保存后会在服务恢复时生效。"; }
}
async function refreshMidjourneySettingsStatus() {
  const statusElement = $("#midjourneyKeyStatus"); if (!statusElement) return;
  try {
    const result = await requestJson("/api/status", {}, 5_000);
    statusElement.textContent = result.midjourney?.ready ? `已配置 · ${result.midjourney.model}` : "尚未配置，保存密钥后即可在生图节点中选择 Midjourney Fast。";
  } catch { statusElement.textContent = "本机服务暂时不可用，保存后会在服务恢复时生效。"; }
}
async function refreshRunningHubSettingsStatus() {
  const statusElement = $("#runningHubKeyStatus"); if (!statusElement) return;
  try { const result = await requestJson("/api/status", {}, 5_000); statusElement.textContent = result.runninghub?.ready ? `已配置 · 工作流 ${result.runninghub.workflowId} · ${result.runninghub.instanceType}` : "尚未配置，保存密钥后即可运行海螺 H3 视频。"; }
  catch { statusElement.textContent = "本机服务暂时不可用，保存后会在服务恢复时生效。"; }
}
async function refreshDeepseekSettingsStatus() {
  const statusElement = $("#deepseekKeyStatus"); if (!statusElement) return;
  try { const result = await requestJson("/api/providers/deepseek/health", {}, 15_000); statusElement.textContent = result.ready ? `已配置 · ${result.model} · 可用：${result.models.join("、")}` : "DeepSeek 网关暂未返回可用模型，请检查密钥或网关。"; }
  catch (error) { statusElement.textContent = error?.message || "DeepSeek 网关暂时不可用，保存后会在服务恢复时生效。"; }
}
async function refreshGeminiNeonSettingsStatus() {
  const statusElement = $("#geminiNeonKeyStatus"); if (!statusElement) return;
  try {
    const result = await requestJson("/api/providers/gemini-neon/health", {}, 15_000);
    statusElement.textContent = result.ready ? `已配置 · ${result.model} · ${result.baseUrl}` : "尚未配置或网关暂未返回该模型，请检查密钥和服务。";
  } catch (error) { statusElement.textContent = error?.status === 401 ? "尚未配置 API Key。" : (error?.message || "Gemini 4 Neon 网关暂时不可用。"); }
}
async function refreshClaudeSettingsStatus() {
  const statusElement = $("#claudeKeyStatus"); if (!statusElement) return;
  try { const result = await requestJson("/api/status", {}, 5_000); statusElement.textContent = result.claude?.ready ? `已配置 · ${result.claude.model}` : "尚未配置，保存密钥后即可在模型回答节点中选择 Claude Sonnet 4.6。"; }
  catch { statusElement.textContent = "本机服务暂时不可用，保存后会在服务恢复时生效。"; }
}
async function refreshKimiProviderStatus(model, statusId, label) {
  const statusElement = $(statusId); if (!statusElement) return;
  try {
    const result = await requestJson(`/api/providers/kimi/health?model=${encodeURIComponent(model)}`, {}, 15_000);
    statusElement.textContent = result.ready && result.apiModel === "kimi-k3" ? `已配置 · ${result.apiModel} · ${label}` : `${label} 网关暂未返回可用的 Kimi K3`;
  } catch (error) { statusElement.textContent = error?.status === 401 ? `尚未配置 · ${label}` : (error?.message || `${label} 网关暂时不可用，保存后会在服务恢复时生效。`); }
}
async function refreshKimiSettingsStatus() {
  await Promise.all([
    refreshKimiProviderStatus("kimi-k3-moyu", "#kimiMoyuKeyStatus", "魔芋 AI"),
    refreshKimiProviderStatus("kimi-k3-moonshot", "#kimiMoonshotKeyStatus", "Moonshot 官方")
  ]);
}
function applyLineMotionPreference(value = lineMotion) { lineMotion = value === "static" ? "static" : "dynamic"; document.documentElement.dataset.edgeMotion = lineMotion; $$("#lineMotionSwitch [data-line-motion]").forEach(button => button.classList.toggle("is-active", button.dataset.lineMotion === lineMotion)); }
function setLineMotion(value) { applyLineMotionPreference(value); localStorage.setItem("image2-canvas-line-motion", lineMotion); }
function openSettings(focusProvider = "") { const theme = state?.theme || globalTheme; $$("#settingsThemeSwitch [data-theme-value]").forEach(button => button.classList.toggle("is-active", button.dataset.themeValue === theme)); applyLineMotionPreference(); const planInput = $("#arkPlanApiKeyInput"); if (planInput) planInput.value = ""; const arkInput = $("#arkApiKeyInput"); if (arkInput) arkInput.value = ""; const input = $("#seedreamApiKeyInput"); if (input) input.value = ""; const midjourneyInput = $("#midjourneyApiKeyInput"); if (midjourneyInput) midjourneyInput.value = ""; const runningHubInput = $("#runningHubApiKeyInput"); if (runningHubInput) runningHubInput.value = ""; const deepseekInput = $("#deepseekApiKeyInput"); if (deepseekInput) deepseekInput.value = ""; const geminiNeonInput = $("#geminiNeonApiKeyInput"); if (geminiNeonInput) geminiNeonInput.value = ""; const claudeInput = $("#claudeApiKeyInput"); if (claudeInput) claudeInput.value = ""; const kimiMoyuInput = $("#kimiMoyuApiKeyInput"); if (kimiMoyuInput) kimiMoyuInput.value = ""; const kimiMoonshotInput = $("#kimiMoonshotApiKeyInput"); if (kimiMoonshotInput) kimiMoonshotInput.value = ""; settingsDialog.showModal(); void refreshSeedreamSettingsStatus(); void refreshMidjourneySettingsStatus(); void refreshRunningHubSettingsStatus(); void refreshDeepseekSettingsStatus(); void refreshGeminiNeonSettingsStatus(); void refreshClaudeSettingsStatus(); void refreshKimiSettingsStatus(); if (focusProvider === "kimi") setTimeout(() => { const target = $("#kimiMoyuApiKeyInput"); target?.scrollIntoView({ block: "center" }); target?.focus(); }, 50); if (focusProvider === "gemini-neon") setTimeout(() => { const target = $("#geminiNeonApiKeyInput"); target?.scrollIntoView({ block: "center" }); target?.focus(); }, 50); }
function bindStaticEvents() {
  initCanvasResizeObserver();
  $("#newProjectButton").addEventListener("click", () => {
    $("#newProjectName").value = ""; const radio = $(`#newProjectThemes input[value="${globalTheme}"]`); if (radio) radio.checked = true;
    newProjectDialog.showModal(); setTimeout(() => $("#newProjectName").focus(), 50);
  });
  function closeNewProjectDialog() { newProjectDialog.close(); $("#newProjectForm").reset(); }
  $("#closeNewProjectButton").addEventListener("click", closeNewProjectDialog);
  $("#cancelNewProjectButton").addEventListener("click", closeNewProjectDialog);
  newProjectDialog.addEventListener("cancel", () => { $("#newProjectForm").reset(); });
  $("#newProjectForm").addEventListener("submit", event => { event.preventDefault(); const name = $("#newProjectName").value.trim(); const theme = $("#newProjectThemes input:checked")?.value || globalTheme; if (name) createProject(name, theme); });
  $("#projectSearch").addEventListener("input", event => { projectSearch = event.target.value; renderHome(); });
  $("#cleanupUnusedGeneratedButton").addEventListener("click", () => void openGeneratedCleanupDialog());
  $("#closeGeneratedCleanupButton").addEventListener("click", () => $("#generatedCleanupDialog").close());
  $("#cancelGeneratedCleanupButton").addEventListener("click", () => $("#generatedCleanupDialog").close());
  $("#confirmGeneratedCleanupButton").addEventListener("click", () => void confirmGeneratedCleanup());
  $("#restartServiceButton").addEventListener("click", restartImage2Service);
  $$("#homeThemeSwitch [data-theme-value]").forEach(button => button.addEventListener("click", () => setTheme(button.dataset.themeValue)));
  $("#homeSettingsButton").addEventListener("click", openSettings);
  $("#backHomeButton").addEventListener("click", goHome);

  workspace.addEventListener("pointerdown", event => {
    closeConnectionMenu();

    if (event.target.closest(".canvas-status, .mobile-panel-button")) return;
    if (event.target.closest(".canvas-node, .node-port, .node-interactive")) return;
    if (event.button === 2) return;
    // Left-drag pans the empty canvas; Shift keeps the existing box-selection workflow available.
    if (event.shiftKey && state.tool !== "hand" && !spacePressed && event.button === 0) return beginSelectionBox(event);
    if (state.tool === "hand" || spacePressed || [0, 1].includes(event.button)) return startPan(event);
  });
  workspace.addEventListener("selectstart", event => { if (!allowsCanvasTextSelection(event.target)) event.preventDefault(); });
  workspace.addEventListener("wheel", event => { if (state) handleWheel(event); }, { passive: false });
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", resetInterruptedInteractionState);
  $("#undoButton").addEventListener("click", undo);
  $("#redoButton").addEventListener("click", redo);
  $("#fitButton").addEventListener("click", fitContent);
  $("#zoomButton").addEventListener("click", () => { state.viewport.scale = 1; updateViewport(); scheduleSave(); });
  for (const button of $$("[data-home-mode]")) {
    button.addEventListener("click", () => {
      const templates = button.dataset.homeMode === "templates";
      $("#homeProjects").hidden = templates;
      $("#homeTemplates").hidden = !templates;
      for (const option of $$("[data-home-mode]")) {
        option.classList.toggle("is-active", option === button);
        option.setAttribute("aria-pressed", String(option === button));
      }
    });
  }
  $("#importButton").addEventListener("click", () => imageFileInput.click());
  imageFileInput.addEventListener("change", async event => { const files = [...event.target.files || []]; const pending = pendingImageUploadNodeId; pendingImageUploadNodeId = null; if (pending) { if (files[0]) await uploadImageIntoNode(pending, files[0]); event.target.value = ""; return; } await importImages(event.target.files); event.target.value = ""; });
  videoFileInput.addEventListener("change", async event => {
    const files = [...event.target.files || []];
    const referenceNodeId = pendingVideoReferenceNodeId;
    const previewNodeId = pendingVideoPreviewUploadNodeId;
    const nodeId = pendingVideoImportNodeId;
    pendingVideoReferenceNodeId = null;
    pendingVideoPreviewUploadNodeId = null;
    pendingVideoImportNodeId = null;
    if (referenceNodeId && files[0]) { try { await uploadVideoReferenceIntoNode(referenceNodeId, files[0]); } catch (error) { toast(error?.message || "参考视频上传失败", true); } event.target.value = ""; return; }
    if (previewNodeId && files[0]) { try { await uploadVideoIntoPreview(previewNodeId, files[0]); } catch (error) { toast(error?.message || "本地视频上传失败", true); } event.target.value = ""; return; }
    if (nodeId && files.length) await importVideosIntoEditor(nodeId, files);
    event.target.value = "";
  });
  audioFileInput.addEventListener("change", async event => {
    const nodeId = pendingAudioReferenceNodeId;
    pendingAudioReferenceNodeId = null;
    if (nodeId && event.target.files?.[0]) { try { await uploadAudioReferenceIntoNode(nodeId, event.target.files[0], pendingAudioReferenceSlot); } catch (error) { toast(error?.message || "参考音频上传失败", true); } }
    event.target.value = "";
  });
  $$(".library-tabs .tab").forEach(tab => tab.addEventListener("click", () => { state.libraryTab = tab.dataset.libraryTab; renderLibrary(); scheduleSave(); }));

  $("#exportProjectButton").addEventListener("click", exportProject);
  $("#importProjectButton").addEventListener("click", () => projectFileInput.click());
  projectFileInput.addEventListener("change", async event => { if (event.target.files[0]) await importProject(event.target.files[0]); event.target.value = ""; });

  $("#settingsButton").addEventListener("click", openSettings);
  $$("#lineMotionSwitch [data-line-motion]").forEach(button => button.addEventListener("click", () => setLineMotion(button.dataset.lineMotion)));
  $("#revealKeyButton").addEventListener("click", () => { const input = $("#apiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $("#revealArkPlanKeyButton").addEventListener("click", () => { const input = $("#arkPlanApiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $("#revealArkKeyButton").addEventListener("click", () => { const input = $("#arkApiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $("#revealSeedreamKeyButton").addEventListener("click", () => { const input = $("#seedreamApiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $("#revealMidjourneyKeyButton").addEventListener("click", () => { const input = $("#midjourneyApiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $("#revealRunningHubKeyButton").addEventListener("click", () => { const input = $("#runningHubApiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $("#revealDeepseekKeyButton").addEventListener("click", () => { const input = $("#deepseekApiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $("#revealGeminiNeonKeyButton").addEventListener("click", () => { const input = $("#geminiNeonApiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $("#revealClaudeKeyButton").addEventListener("click", () => { const input = $("#claudeApiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $("#revealKimiMoyuKeyButton").addEventListener("click", () => { const input = $("#kimiMoyuApiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $("#revealKimiMoonshotKeyButton").addEventListener("click", () => { const input = $("#kimiMoonshotApiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $$("#settingsThemeSwitch [data-theme-value]").forEach(button => button.addEventListener("click", () => { setTheme(button.dataset.themeValue); $$("#settingsThemeSwitch [data-theme-value]").forEach(item => item.classList.toggle("is-active", item.dataset.themeValue === button.dataset.themeValue)); }));
  $("#saveSettingsButton").addEventListener("click", async event => {
    event.preventDefault();
    apiKey = $("#apiKeyInput").value.trim();
    const planKey = $("#arkPlanApiKeyInput").value.trim();
    if (planKey) {
      try { await requestJson("/api/providers/ark-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: planKey }) }, 10_000); $("#arkPlanApiKeyInput").value = ""; }
      catch (error) { return toast(error.message || "火山套餐密钥保存失败", true); }
    }
    const arkKey = $("#arkApiKeyInput").value.trim();
    if (arkKey) {
      try { await requestJson("/api/providers/ark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: arkKey }) }, 10_000); $("#arkApiKeyInput").value = ""; }
      catch (error) { return toast(error.message || "火山引擎密钥保存失败", true); }
    }
    const seedreamKey = $("#seedreamApiKeyInput").value.trim();
    const midjourneyKey = $("#midjourneyApiKeyInput").value.trim();
    const runningHubKey = $("#runningHubApiKeyInput").value.trim();
    const deepseekKey = $("#deepseekApiKeyInput").value.trim();
    const geminiNeonKey = $("#geminiNeonApiKeyInput").value.trim();
    const claudeKey = $("#claudeApiKeyInput").value.trim();
    const kimiMoyuKey = $("#kimiMoyuApiKeyInput").value.trim();
    const kimiMoonshotKey = $("#kimiMoonshotApiKeyInput").value.trim();
    if (seedreamKey) {
      try { await requestJson("/api/providers/seedream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: seedreamKey }) }, 10_000); }
      catch (error) { return toast(error.message || "Seedream 密钥保存失败", true); }
    }
    if (midjourneyKey) {
      try { await requestJson("/api/providers/midjourney", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: midjourneyKey }) }, 10_000); }
      catch (error) { return toast(error.message || "Midjourney 密钥保存失败", true); }
    }
    if (runningHubKey) {
      try { await requestJson("/api/providers/runninghub", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: runningHubKey }) }, 10_000); }
      catch (error) { return toast(error.message || "RunningHub 密钥保存失败", true); }
    }
    if (deepseekKey) {
      try { await requestJson("/api/providers/deepseek", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: deepseekKey }) }, 10_000); }
      catch (error) { return toast(error.message || "DeepSeek 密钥保存失败", true); }
    }
    if (geminiNeonKey) {
      try { await requestJson("/api/providers/gemini-neon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: geminiNeonKey }) }, 10_000); $("#geminiNeonApiKeyInput").value = ""; }
      catch (error) { return toast(error.message || "Gemini 4 Neon 密钥保存失败", true); }
    }
    if (claudeKey) {
      try { await requestJson("/api/providers/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: claudeKey }) }, 10_000); }
      catch (error) { return toast(error.message || "Claude 密钥保存失败", true); }
    }
    if (kimiMoyuKey || kimiMoonshotKey) {
      try { await requestJson("/api/providers/kimi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moyuApiKey: kimiMoyuKey, moonshotApiKey: kimiMoonshotKey }) }, 10_000); }
      catch (error) { return toast(error.message || "Kimi 密钥保存失败", true); }
    }
    settingsDialog.close(); checkApiStatus(); toast(geminiNeonKey ? "Gemini 4 Neon 密钥已安全保存" : kimiMoyuKey || kimiMoonshotKey ? "Kimi K3 双网关密钥已安全保存" : claudeKey ? "Claude 密钥已安全保存" : deepseekKey ? "DeepSeek 密钥已安全保存" : runningHubKey ? "RunningHub 密钥已安全保存" : midjourneyKey ? "Midjourney 密钥已安全保存" : seedreamKey ? "Seedream 密钥已安全保存" : (apiKey ? "临时 Image2 API Key 已启用" : "设置已保存"));
  });
  $("#projectName").addEventListener("click", () => { const next = window.prompt("项目名称", state.projectName)?.trim(); if (!next || next === state.projectName) return; recordHistory(); state.projectName = next; renderWorkspace(); scheduleSave(); });
  $("#previewCloseButton").addEventListener("click", () => { previewVideo.pause(); previewVideo.removeAttribute("src"); previewDialog.close(); });
  $("#closeCropButton").addEventListener("click", closeCropDialog);
  $("#cancelCropButton").addEventListener("click", closeCropDialog);
  $("#confirmCropButton").addEventListener("click", confirmCrop);
  cropSourceImage.addEventListener("load", () => { if (cropSession) requestAnimationFrame(resetCropSelection); });
  cropCanvas.addEventListener("pointerdown", startCropSelection);
  cropCanvas.addEventListener("pointermove", moveCropSelection);
  cropCanvas.addEventListener("pointerup", endCropSelection);
  cropCanvas.addEventListener("pointercancel", endCropSelection);
  cropDialog.addEventListener("cancel", event => { event.preventDefault(); closeCropDialog(); });
  cropDialog.addEventListener("click", event => { if (event.target === cropDialog) closeCropDialog(); });
  previewDialog.addEventListener("click", event => { if (event.target === previewDialog) { previewVideo.pause(); previewVideo.removeAttribute("src"); previewDialog.close(); } });
  $("#mobileLibraryButton").addEventListener("click", () => toggleSidebar("library"));
  $("#mobileInspectorButton").addEventListener("click", () => toggleSidebar("inspector"));
  $("#closeInspectorButton").addEventListener("click", () => $("#inspectorPanel").classList.remove("is-open"));
  $("#toggleLibraryButton").addEventListener("click", () => toggleSidebar("library"));
  $("#toggleInspectorButton").addEventListener("click", () => toggleSidebar("inspector"));
  $("#showLibraryButton").addEventListener("click", () => setSidebarCollapsed("library", false));
  $("#showInspectorButton").addEventListener("click", () => setSidebarCollapsed("inspector", false));
  $("#openGeneratedFolderButton").addEventListener("click", () => void openGeneratedFolder());

  window.addEventListener("paste", handleCanvasPaste);
  document.addEventListener("focusin", event => { beginEditableHistory(event.target); }, true);
  document.addEventListener("input", event => { scheduleEditableHistory(event.target); }, true);
  document.addEventListener("change", event => { scheduleEditableHistory(event.target); }, true);
  document.addEventListener("focusout", event => { commitEditableHistory(event.target); }, true);
  window.addEventListener("keydown", event => {
    if (document.querySelector('#layerEditor[open], #localEditDialog[open], .speech-dialog[open]')) return;
    const target = event.target instanceof Element ? event.target : null;
    const editableTarget = target?.closest("input, textarea, select, [contenteditable=true]");
    const isEditable = Boolean(editableTarget);
    const historyShortcut = (event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y");
    const clipboardShortcut = (event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "c" || event.key.toLowerCase() === "v");
    const selectAllShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a";

    if (selectAllShortcut && !isEditable) { event.preventDefault(); selectAnswerResponse(selectedAnswerResponse()); return; }
    if (clipboardShortcut && isEditable) return;
    if (clipboardShortcut) { const selection = window.getSelection(); const answerTextSelected = Boolean(selection?.toString().trim() && selection.anchorNode?.parentElement?.closest(".answer-response")); if (event.key.toLowerCase() === "c" && answerTextSelected) return; if (event.key.toLowerCase() === "c") { event.preventDefault(); copyWorkflowSelection(); } return; }
    if (historyShortcut && editableTarget?.matches("[data-prompt-content]")) { commitEditableHistory(editableTarget); event.preventDefault(); if (event.shiftKey || event.key.toLowerCase() === "y") redo(); else undo(); return; }
    if (historyShortcut && isEditable) { discardEditableHistory(editableTarget); return; }
    if (historyShortcut && state && !settingsDialog.open && !newProjectDialog.open) { event.preventDefault(); if (event.shiftKey || event.key.toLowerCase() === "y") redo(); else undo(); return; }
    if (event.key === "Escape") { closeConnectionMenu(); closeCanvasContextMenu(); connectionDraft = null; workspace.classList.remove("is-flow-interacting"); renderEdges(); }
    if (!state || isEditable || settingsDialog.open || newProjectDialog.open) return;
    if (event.code === "Space") { spacePressed = true; workspace.style.cursor = "grab"; event.preventDefault(); }
    if (event.key.toLowerCase() === "v") setActiveTool("select");
    if (event.key.toLowerCase() === "h") setActiveTool("hand");
    if (event.key.toLowerCase() === "f") addFrame();
    if (event.key === "Delete" || event.key === "Backspace") { deleteSelection(); }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { const node = selectedNode(); if (node?.type === "generator") runGeneratorNode(node.id); }
  });
  window.addEventListener("blur", resetInterruptedInteractionState);
  window.addEventListener("keyup", event => { if (event.code === "Space" && state) { spacePressed = false; workspace.style.cursor = state.tool === "hand" ? "grab" : "default"; } });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { resetInterruptedInteractionState(); if (saveTimer) void saveProjectNow(); } });
  workspace.addEventListener("contextmenu", showCanvasContextMenu);
  workspace.addEventListener("dragover", event => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = "copy"; });
  workspace.addEventListener("drop", async event => {
    event.preventDefault();

    const files = [...event.dataTransfer.files || []];
    if (!files.length) return;
    const hasImages = files.some(file => /^image\/(png|jpeg|webp)$/i.test(file.type));
    const hasVideos = files.some(isSupportedVideoFile);
    if (hasImages) await importImages(files);
    if (hasVideos) await importVideosAsPreviewNodes(files, { clientX: event.clientX, clientY: event.clientY });
    if (!hasImages && !hasVideos) toast("画布拖入支持 PNG、JPEG、WebP、MP4、WebM 和 MOV", true);
  });
  $("#libraryResizer").addEventListener("pointerdown", event => startPanelResize(event, "library"));
  $("#inspectorResizer").addEventListener("pointerdown", event => startPanelResize(event, "inspector"));
}
async function init() {
  applyLineMotionPreference();
  bindStaticEvents();
  await loadPromptPresets();
  await loadProjectMetas();
  const savedSession = readActiveProjectSession();
  if (savedSession?.projectId && projectMetas.some(meta => meta.id === savedSession.projectId)) await openProject(savedSession.projectId);
  else { if (savedSession) clearActiveProjectSession(); renderHome(); }
  await checkApiStatus();
}
const speechController=createSpeechController({renameCard:startNodeTitleEdit,deleteCard:id=>{selectNode(id);deleteSelection();},revealExtracted:node=>{selectedEdgeId=null;focusNode(node.id);},redrawEdges:requestEdgeRender,getState:()=>state,findNode,recordHistory,save:()=>saveProjectNow(true),scheduleSave,render:()=>renderWorkspace(),toast,uid,escapeHtml,header:nodeHeaderHtml,port:portHtml,resize:resizeHandleHtml,openSettings});
init();











