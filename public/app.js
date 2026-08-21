const $ = selector => document.querySelector(selector);
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
const geminiImageModels = Object.freeze([
  { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image" },
  { id: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image" }
]);
const seedreamImageModels = Object.freeze([
  { id: "doubao-seedream-5-0-pro-260628", label: "Seedream 5.0 Pro" }
]);
const midjourneyImageModels = Object.freeze([
  { id: "mj_fast_imagine", label: "Midjourney Fast" }
]);
const generatorOutputSizeOptions = Object.freeze({
  image2: [{ value: "current", label: "当前最大" }],
  "gemini-3-pro-image-preview": [{ value: "1K", label: "1K" }, { value: "2K", label: "2K" }, { value: "4K", label: "4K" }],
  "gemini-3.1-flash-image-preview": [{ value: "1K", label: "1K · 网关上限" }],
  "doubao-seedream-5-0-pro-260628": [{ value: "2K", label: "2K · 当前最大" }],
  mj_fast_imagine: [{ value: "current", label: "MJ 模型控制" }]
});
const runningHubVideoAspects = Object.freeze(["auto", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9", "9:21", "5:4", "4:5", "2:1", "1:2"]);
const runningHubVideoQualityOptions = Object.freeze([
  { value: "general", label: "一般", megapixels: 0.6 },
  { value: "standard", label: "标准", megapixels: 1.0 },
  { value: "clear", label: "清晰", megapixels: 2.0 }
]);
const runningHubFirstFrameProfiles = Object.freeze({
  standard: Object.freeze({ quality: "standard", label: "标准", workflowId: "2085564954459066369", dimensions: Object.freeze({ width: 1376, height: 768 }) }),
  clear: Object.freeze({ quality: "clear", label: "清晰", workflowId: "2085580221075517441", dimensions: Object.freeze({ width: 1920, height: 1088 }) })
});
function runningHubFirstFrameProfile(node) { return node?.videoQuality === "clear" ? runningHubFirstFrameProfiles.clear : runningHubFirstFrameProfiles.standard; }
const runningHubVideoProvider = Object.freeze({ label: "海螺 H3 视频", model: "RunningHub · API plus" });
const answerSkillOptions = Object.freeze([
  { value: "none", label: "普通模型问答" },
  { value: "minimax-h3", label: "MiniMax H3 提示词生成器" }
]);
const h3AnswerModeOptions = Object.freeze([
  { value: "auto", label: "自动识别" },
  { value: "t2va", label: "文生视频 · T2VA" },
  { value: "i2va", label: "首帧生视频 · I2VA" },
  { value: "l2va", label: "尾帧生视频 · L2VA" },
  { value: "fl2va", label: "首尾帧生视频 · FL2VA" },
  { value: "ref2va", label: "全能多参考 · Ref2VA" }
]);
function answerNodeHeight(node) { return nodeHeight("answer", node?.inputSlots || 4, 1) + (node?.answerSkill === "minimax-h3" ? 112 : 0); }
function normalizedAnswerSkill(value) { return answerSkillOptions.some(item => item.value === value) ? value : "none"; }
function normalizedH3AnswerMode(value) { return h3AnswerModeOptions.some(item => item.value === value) ? value : "auto"; }
function normalizedH3Duration(value) { return Math.min(15, Math.max(3, Math.round(Number(value) || 6))); }
const runningHubVideoModes = Object.freeze([
  { value: "text-to-video", label: "提示词生视频（待接入）", inputs: [], available: false },
  { value: "first-frame", label: "首帧生视频", inputs: ["首帧"], available: true },
  { value: "last-frame", label: "尾帧生视频（待接入）", inputs: ["尾帧"], available: false },
  { value: "first-last-frame", label: "首尾帧生视频（待接入）", inputs: ["首帧", "尾帧"], available: false },
  { value: "reference", label: "全能参考生视频（待接入）", inputs: ["参考图 1", "参考图 2", "参考图 3", "参考图 4"], available: false }
]);
function runningHubVideoMode(node) {
  return runningHubVideoModes.find(item => item.value === node?.videoMode)
    || runningHubVideoModes.find(item => item.value === "reference");
}
function runningHubVideoQuality(node) { if (node?.videoMode === "first-frame") return runningHubVideoQualityOptions.find(item => item.value === runningHubFirstFrameProfile(node).quality) || runningHubVideoQualityOptions[1]; return runningHubVideoQualityOptions.find(item => item.value === node?.videoQuality) || runningHubVideoQualityOptions[1]; }
function runningHubVideoDimensions(node) {
  if (node?.videoMode === "first-frame") return runningHubFirstFrameProfile(node).dimensions;
  const quality = runningHubVideoQuality(node);
  const aspect = node?.videoAspect === "auto" ? "16:9" : (node?.videoAspect || "16:9");
  const [ratioWidth, ratioHeight] = aspect.split(":").map(Number);
  const base = { general: [1056, 608], standard: [1376, 768], clear: [1920, 1088] }[quality.value] || [1376, 768];
  if (!Number.isFinite(ratioWidth) || !Number.isFinite(ratioHeight) || ratioWidth <= 0 || ratioHeight <= 0 || aspect === "16:9") return { width: base[0], height: base[1] };
  const area = base[0] * base[1]; const ratio = ratioWidth / ratioHeight;
  const round32 = value => Math.max(32, Math.round(value / 32) * 32);
  return { width: round32(Math.sqrt(area * ratio)), height: round32(Math.sqrt(area / ratio)) };
}
function normalizeRunningHubVideo(node, connectedImageSlots = 0) {
  const mode = runningHubVideoMode(node);
  const inputSlots = !mode.inputs.length ? 0 : node?.videoInputSlotsInitialized ? Math.min(mode.inputs.length, Math.max(1, Number(node?.inputSlots) || 1)) : Math.max(1, Math.min(mode.inputs.length, connectedImageSlots || 1));
  const promptSlots = Math.min(6, Math.max(1, Number(node?.promptSlots) || 1));
  const next = { ...node, mediaType: "video", provider: "runninghub-h3", x: Number.isFinite(Number(node?.x)) ? Number(node.x) : 0, y: Number.isFinite(Number(node?.y)) ? Number(node.y) : 0, videoMode: mode.value, videoAspect: mode.value === "first-frame" ? "16:9" : (runningHubVideoAspects.includes(node?.videoAspect) ? node.videoAspect : "16:9"), videoQuality: mode.value === "first-frame" ? (node?.videoQuality === "clear" ? "clear" : "standard") : (runningHubVideoQualityOptions.some(item => item.value === node?.videoQuality) ? node.videoQuality : "standard"), videoSeconds: Math.min(15, Math.max(mode.value === "first-frame" ? 5 : 3, Math.round(Number(node?.videoSeconds) || 6))), promptSlots, inputSlots, videoInputSlotsInitialized: true, width: Math.max(360, Number(node?.width) || 390) };
  next.height = Math.max(Number(node?.height) || 0, nodeHeight("video-generator", inputSlots, promptSlots));
  next.status = node?.activeJobId ? "running" : "idle";
  return next;
}
function generatorOutputModelId(node) { return node?.provider === "gemini" ? node.geminiModel : node?.provider === "moyu" ? node.moyuModel : node?.provider === "midjourney" ? midjourneyImageModels[0].id : "image2"; }
function generatorOutputOptions(node) { return generatorOutputSizeOptions[generatorOutputModelId(node)] || generatorOutputSizeOptions.image2; }
function generatorDefaultOutputSize(node) { return generatorOutputOptions(node).at(-1)?.value || "current"; }
function normalizeGeneratorOutputSize(node) { const options = generatorOutputOptions(node); return options.some(option => option.value === node?.outputSize) ? node.outputSize : generatorDefaultOutputSize(node); }
function generatorApiSize(node) {
  // The Gemini gateway expects an aspect ratio such as "16:9", while Image2 and Seedream expect pixels.
  if (["gemini", "midjourney"].includes(node?.provider)) return sizeMap[node?.aspect] ? node.aspect : fixedGeneratorSettings.aspect;
  if (node?.provider !== "moyu") return sizeMap[node?.aspect]?.api || sizeMap[fixedGeneratorSettings.aspect].api;
  const maximum = { "1:1": "2048x2048", "16:9": "2848x1600", "9:16": "1600x2848" };
  return maximum[node.aspect] || sizeMap[node.aspect]?.api || sizeMap[fixedGeneratorSettings.aspect].api;
}
const generatorProviders = Object.freeze({ image2: { label: "Image2", model: "gpt-image-2" }, gemini: { label: "Gemini", model: geminiImageModels[0].id }, moyu: { label: "豆包 Seedream", model: seedreamImageModels[0].id }, midjourney: { label: "Midjourney Fast", model: midjourneyImageModels[0].id } });
function generatorModelForNode(node) {
  if (node?.mediaType === "video" || node?.provider === "runninghub-h3") return runningHubVideoProvider.model;
  if (node?.provider === "gemini" && geminiImageModels.some(item => item.id === node.geminiModel)) return node.geminiModel;
  if (node?.provider === "moyu" && seedreamImageModels.some(item => item.id === node.moyuModel)) return node.moyuModel;
  if (node?.provider === "midjourney") return midjourneyImageModels[0].id;
  return generatorProviders[node?.provider]?.model || generatorProviders.image2.model;
}
function generatorProviderForNode(node) { if (node?.mediaType === "video" || node?.provider === "runninghub-h3") return runningHubVideoProvider; const provider = generatorProviders[node?.provider] || generatorProviders.image2; return { ...provider, model: generatorModelForNode(node) }; }
function generatorModelLabel(modelId, fallback = "Image2") {
  if (modelId === "gpt-image-2") return "GPT Image 2";
  return geminiImageModels.find(item => item.id === modelId)?.label
    || seedreamImageModels.find(item => item.id === modelId)?.label
    || midjourneyImageModels.find(item => item.id === modelId)?.label
    || fallback;
}
function generatorReferenceLimit(node) { if (node?.mediaType === "video") return runningHubVideoMode(node).inputs.length; if (node?.provider === "midjourney") return 4; if (node?.provider === "moyu") return 6; if (node?.provider === "gemini") return 14; return 8; }
const nodeLabels = { prompt: "提示词", composition: "参数控制", image: "图像", video: "视频", "video-editor": "视频剪辑", "video-preview": "成片预览", generator: "生图", answer: "模型回答", note: "便签", frame: "画板", loading: "生成中" };
const scriptRoleTypes = [
  { id: "male-1", gender: "male", label: "男性 1" },
  { id: "male-2", gender: "male", label: "男性 2" },
  { id: "male-3", gender: "male", label: "男性 3" },
  { id: "female-1", gender: "female", label: "女性 1" },
  { id: "female-2", gender: "female", label: "女性 2" },
  { id: "female-3", gender: "female", label: "女性 3" }
];
const scriptStoryTypeOptions = ["阻碍型", "两难型", "倒计时型", "信息揭露型", "身份危机型", "背叛型", "追逐型", "诱惑型", "灾难型", "资源争夺型", "代价累积型", "身份暴露型", "关系逆转型", "不可言说型"];
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
const nodeLayer = $("#nodeLayer");
const edgeLayer = $("#edgeLayer");
const libraryContent = $("#libraryContent");
const inspectorContent = $("#inspectorContent");
const imageFileInput = $("#imageFileInput");
const videoFileInput = $("#videoFileInput");
const projectFileInput = $("#projectFileInput");
const settingsDialog = $("#settingsDialog");
const newProjectDialog = $("#newProjectDialog");
const previewDialog = $("#previewDialog");
const previewVideo = $("#previewVideo");
const cropDialog = $("#cropDialog");
const cropCanvas = $("#cropCanvas");
const cropSourceImage = $("#cropSourceImage");
const cropSelection = $("#cropSelection");
const dialogueScriptDialog = $("#dialogueScriptDialog");
const selectionRect = $("#selectionRect");
const scriptFlowStage = $("#scriptFlowStage");
const scriptEdgeLayer = $("#scriptEdgeLayer");
const scriptNodeLayer = $("#scriptNodeLayer");
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
let canvasContextMenu = null;
function clearWorkflowInteractionState() {
  dragSession?.elements?.forEach(item => { if (item.element) { item.element.style.transform = ""; item.element.style.willChange = ""; item.element.classList.remove("is-dragging"); } });
  dragSession = null; resizeSession = null; panSession = null; selectionSession = null; connectionDraft = null;
  workspace?.classList.remove("is-flow-interacting", "is-panning");
  if (selectionRect) selectionRect.hidden = true;
}
let pendingImageUploadNodeId = null;
let pendingVideoImportNodeId = null;
let cropSession = null;
let compositionDragSession = null;
let promptLayoutResizeSession = null;
let promptReferenceClickTimer = null;
const promptQuickSelection = new Map();
let selectedEdgeId = null;
let scriptDragSession = null;
let scriptPanSession = null;
let scriptConnectionDraft = null;
let scriptSelectionSession = null;
let scriptPanelResizeSession = null;
let scriptStoryResizeSession = null;
let scriptEmotionPointSession = null;
let scriptEmotionBoardDragSession = null;
let scriptEmotionResizeSession = null;

function workspaceSessionSnapshot() {
  if (!state?.id) return null;
  const scriptViewport = state.scriptFlow?.viewport;
  return {
    projectId: state.id,
    flowMode: state.flowMode === "script" ? "script" : "workflow",
    viewport: state.viewport,
    scriptViewport: scriptViewport && {
      x: Number(scriptViewport.x) || 0,
      y: Number(scriptViewport.y) || 0,
      scale: Number(scriptViewport.scale) || 1
    }
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
  if (saved.flowMode === "script" || saved.flowMode === "workflow") nextState.flowMode = saved.flowMode;
  const restoreViewport = (target, source, min, max) => {
    if (!target || !source || !Number.isFinite(Number(source.x)) || !Number.isFinite(Number(source.y)) || !Number.isFinite(Number(source.scale))) return;
    target.x = Number(source.x); target.y = Number(source.y); target.scale = Math.min(max, Math.max(min, Number(source.scale)));
  };
  restoreViewport(nextState.viewport, saved.viewport, WORKFLOW_ZOOM_MIN, WORKFLOW_ZOOM_MAX);
  restoreViewport(nextState.scriptFlow?.viewport, saved.scriptViewport, SCRIPT_ZOOM_MIN, SCRIPT_ZOOM_MAX);
}
let scriptFrameResizeSession = null;
let scriptCharacterArcPointSession = null;
let scriptCharacterArcResizeSession = null;
let scriptGoalPointSession = null;
let scriptGoalResizeSession = null;
let scriptAssistantResizeSession = null;
let scriptNoteResizeSession = null;
let scriptAssistantPendingIds = new Set();
let characterArcRolePickerId = "";
let characterGoalRolePickerId = "";
let storyTypePickerId = "";
let scriptFloatingPanelSession = null;
let scriptManagerRoleDragSession = null;
let scriptManagerSegmentDragSession = null;
let scriptManagerActResizeSession = null;
let managerSegmentMenuId = "";
let scriptRoleAddGuard = { roleTypeId: "", at: 0 };
let scriptClipboard = null;
let scriptPasteSerial = 0;
let workflowClipboard = null;
let workflowPasteSerial = 0;
let dialogueEditor = null;
let dialoguePanelSession = null;
let dialogueMenuEntryId = "";
let dialogueAnalysisMenuRoleId = "";
let dialogueMarkerDragId = "";
let dialoguePanelIsMaximized = false;
let dialogueDraftUndoStack = [];
let dialogueDraftRedoStack = [];
const dialogueEditableHistorySessions = new WeakMap();
const dialoguePanelLayout = { x: 190, y: 82, width: 860, height: 630 };
const dialogueAnalysisLayout = { width: 272 };
const dialogueAnalysisFields = [{ key: "initial", label: "初始", placeholder: "输入初始状态或背景" }, { key: "event", label: "事件", placeholder: "输入触发的事件" }, { key: "reaction", label: "反应", placeholder: "输入角色直接反应" }, { key: "mind", label: "心理", placeholder: "输入内心想法或动机" }, { key: "decision", label: "决策", placeholder: "输入做出的关键决定" }, { key: "action", label: "行动", placeholder: "输入具体行动" }, { key: "obstacle", label: "阻碍", placeholder: "输入面临的阻碍" }, { key: "method", label: "方法", placeholder: "输入解决方式" }, { key: "change", label: "改变", placeholder: "输入发生的改变" }, { key: "ending", label: "末尾", placeholder: "输入阶段性的结果" }];
let spacePressed = false;
let saveTimer = null;
let saveRevision = 0;
let projectSaveQueue = Promise.resolve();
const WORKFLOW_ZOOM_MIN = 0.05;
const WORKFLOW_ZOOM_MAX = 5;
const SCRIPT_ZOOM_MIN = 0.05;
const SCRIPT_ZOOM_MAX = 5;
const generationPollFailures = new Map();
let generationElapsedClock = null;
let apiKey = "";
let runningHubApiKey = "";
let isGenerating = false;
let projectSearch = "";
let projectOpeningId = null;
let generatedCleanupPreview = null;
let edgeRenderFrame = 0;
let scriptEdgeRenderFrame = 0;
let scriptSelectionFrame = 0;
let pendingScriptSelectionPoint = null;
const generationPollers = new Map();

function uid(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
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
  const preferred = images.find(node => node.source === "Image2" || node.source === "Gemini") || images[0];
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
  if (type === "video-generator") return 470 + Math.max(0, Number(slots) || 0) * 30 + Math.max(0, Number(promptSlots) - 1) * 30;
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
  return { id: uid("prompt"), type: "prompt", name: "画面提示词", x, y, width: 320, height: nodeHeight("prompt"), content, promptPresetId: "", promptQuickParams: normalizePromptQuickParams(null), promptQuickInstruction: "", composition: { ...defaultPromptComposition }, promptLayout: normalizePromptLayout(null, 320, nodeHeight("prompt")), disabled: false, createdAt: Date.now() };
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
  const instruction = promptCompositionInstruction(source.composition); linkedPromptsForComposition(compositionId).forEach(prompt => { prompt.content = upsertPromptCompositionInstruction(prompt.content, source.composition, prompt.compositionInstruction); prompt.compositionInstruction = instruction; });
}
function createGeneratorNode(x, y) {
  return { id: uid("image2"), type: "generator", name: "GPT Image 2", provider: "image2", geminiModel: geminiImageModels[0].id, moyuModel: seedreamImageModels[0].id, outputSize: "current", x, y, width: 360, promptSlots: 1, inputSlots: 4, height: nodeHeight("generator", 4, 1), aspect: fixedGeneratorSettings.aspect, quality: fixedGeneratorSettings.quality, batch: fixedGeneratorSettings.batch, constraints: "不要水印，不要多余文字，不要畸形手指", status: "idle", lastResultIds: [], createdAt: Date.now() };
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
  return { id: uid("h3-video"), type: "generator", mediaType: "video", provider: "runninghub-h3", name: "海螺 H3 视频", x, y, videoMode: "first-frame", videoAspect: "16:9", videoQuality: "standard", videoSeconds: 6, promptSlots: 1, inputSlots: 1, videoInputSlotsInitialized: true, width: 390, height: nodeHeight("video-generator", 1, 1), status: "idle", lastResultIds: [], createdAt: Date.now() };
}
function createVideoEditorNode(x, y) {
  return { id: uid("video-editor"), type: "video-editor", name: "视频剪辑", x, y, width: 680, height: nodeHeight("video-editor"), clips: [], inputSlots: 6, selectedClipId: "", timelinePlayhead: 0, previewPlaying: false, status: "idle", outputSrc: "", outputType: "mp4", createdAt: Date.now() };
}
function createVideoPreviewNode(x, y) {
  return { id: uid("video-preview"), type: "video-preview", name: "成片预览", x, y, width: 360, height: nodeHeight("video-preview"), createdAt: Date.now() };
}
function createAnswerNode(x, y) {
  const node = { id: uid("answer"), type: "answer", name: "模型回答", x, y, width: 380, promptSlots: 1, inputSlots: 4, model: "gpt-5.6", answerSkill: "none", h3Mode: "auto", h3Duration: 6, status: "idle", answer: "", error: "", answerExpanded: false, createdAt: Date.now() };
  node.height = answerNodeHeight(node);
  return node;
}
function createReferenceNode(x, y) {
  return { id: uid("ref"), type: "image", name: "参考图", x, y, width: 270, height: nodeHeight("image"), src: "", source: "参考图", ratio: "未上传", createdAt: Date.now() };
}
function createScriptFlow() {
  return {
    characters: [], relationships: [], storyCards: [], storyLinks: [], storyFrames: [], emotionBoards: [], emotionLinks: [], characterArcs: [], characterGoals: [], aiAssistants: [], scriptNotes: [], selectedIds: [], selectedEdgeId: null,
    viewport: { x: 0, y: 0, scale: 1 }, panelWidths: { library: 238, inspector: 286 }, characterCounter: 1,
    emotionBoard: { visible: false, x: 260, y: 520, width: 720, height: 260, levels: {} },
    characterManager: { visible: false, x: 250, y: 90, width: 880, height: 460, acts: [{ title: "第一幕", subtitle: "铺垫与引入" }, { title: "第二幕", subtitle: "冲突升级与发展" }, { title: "第三幕", subtitle: "高潮与结局" }], actSplits: [33.333, 66.667], paragraphs: [] },
    characterNotes: { visible: false, roleId: "", x: 1170, y: 122, width: 280, height: 390 }
  };
}
function normalizeScriptFlow(flow) {
  const base = createScriptFlow(); const next = { ...base, ...(flow || {}) };
  next.characters = Array.isArray(next.characters) ? next.characters.filter(Boolean).map((role, index) => ({ id: role.id || uid("role"), type: "character", roleType: scriptRoleTypes.some(item => item.id === role.roleType) ? role.roleType : "male-1", gender: role.gender === "female" ? "female" : "male", name: role.name || "", identity: role.identity || "", age: role.age || "", occupation: role.occupation || "", personality: role.personality || "", goal: role.goal || "", bio: role.bio || "", tags: Array.isArray(role.tags) ? role.tags : [], managementPosition: Math.min(96, Math.max(4, Number.isFinite(Number(role.managementPosition)) ? Number(role.managementPosition) : Math.min(88, 12 + index * 16))), x: Number.isFinite(role.x) ? role.x : 220 + index * 150, y: Number.isFinite(role.y) ? role.y : 160, createdAt: role.createdAt || Date.now() + index })) : [];
  next.storyCards = Array.isArray(next.storyCards) ? next.storyCards.filter(Boolean).map((card, index) => ({ id: card.id || uid("story"), type: "story-card", title: card.title || "未命名情节", scene: card.scene || "", time: card.time || "", location: card.location || "", characters: card.characters || "", mood: card.mood || "", goal: card.goal || "", initialSituation: card.initialSituation || "", finalSituation: card.finalSituation || "", storyType: card.storyType || "", storyTypeMode: card.storyTypeMode === "custom" || (card.storyType && !scriptStoryTypeOptions.includes(card.storyType)) ? "custom" : "preset", content: String(card.content || ""), displayNumber: String(card.displayNumber || "").replace(/[^0-9]/g, "").slice(0, 4), dialogueAnalysis: card.dialogueAnalysis && typeof card.dialogueAnalysis === "object" && !Array.isArray(card.dialogueAnalysis) ? card.dialogueAnalysis : {}, dialogueAnalysisHiddenRoles: Array.isArray(card.dialogueAnalysisHiddenRoles) ? card.dialogueAnalysisHiddenRoles.filter(id => typeof id === "string") : [], dialogue: Array.isArray(card.dialogue) ? card.dialogue.filter(Boolean).map(entry => ({ id: entry.id || uid("dialogue"), type: ["speech", "action", "narration"].includes(entry.type) ? entry.type : "speech", roleId: typeof entry.roleId === "string" ? entry.roleId : "", content: String(entry.content || "") })) : [], x: Number.isFinite(card.x) ? card.x : 240 + index * 260, y: Number.isFinite(card.y) ? card.y : 220, width: Math.min(440, Math.max(185, Number(card.width) || 220)), height: Math.min(620, Math.max(250, Number(card.height) || 330)), createdAt: card.createdAt || Date.now() + index })) : [];
  next.storyFrames = Array.isArray(next.storyFrames) ? next.storyFrames.filter(Boolean).map((frame, index) => ({ id: frame.id || uid("script-frame"), type: "story-frame", name: frame.name || `剧本分组 ${index + 1}`, x: Number.isFinite(frame.x) ? frame.x : 180 + index * 40, y: Number.isFinite(frame.y) ? frame.y : 140 + index * 40, width: Math.max(300, Number(frame.width) || 620), height: Math.max(230, Number(frame.height) || 420), createdAt: frame.createdAt || Date.now() + index })) : [];
  const characterIds = new Set(next.characters.map(role => role.id)); const storyIds = new Set(next.storyCards.map(card => card.id)); const frameIds = new Set(next.storyFrames.map(frame => frame.id)); const allIds = new Set([...characterIds, ...storyIds, ...frameIds]);
  next.relationships = Array.isArray(next.relationships) ? next.relationships.filter(link => link && characterIds.has(link.source) && characterIds.has(link.target) && link.source !== link.target).map(link => ({ id: link.id || uid("rel"), source: link.source, target: link.target })) : [];
  next.storyLinks = Array.isArray(next.storyLinks) ? next.storyLinks.filter(link => link && storyIds.has(link.source) && storyIds.has(link.target) && link.source !== link.target).map(link => ({ id: link.id || uid("story-link"), source: link.source, target: link.target })) : [];
  next.selectedIds = Array.isArray(next.selectedIds) ? next.selectedIds : [];
  next.selectedEdgeId = typeof next.selectedEdgeId === "string" ? next.selectedEdgeId : null;
  const viewport = next.viewport || {}; next.viewport = { x: Number.isFinite(viewport.x) ? viewport.x : 0, y: Number.isFinite(viewport.y) ? viewport.y : 0, scale: Math.min(WORKFLOW_ZOOM_MAX, Math.max(WORKFLOW_ZOOM_MIN, Number.isFinite(viewport.scale) ? viewport.scale : 1)) };
  const panelWidths = next.panelWidths || {}; next.panelWidths = { library: Math.min(480, Math.max(190, Number(panelWidths.library) || 238)), inspector: Math.min(520, Math.max(220, Number(panelWidths.inspector) || 286)) };
  const board = next.emotionBoard || {}; next.emotionBoard = { visible: Boolean(board.visible), x: Number.isFinite(board.x) ? board.x : 260, y: Number.isFinite(board.y) ? board.y : 520, width: Math.min(1000, Math.max(420, Number(board.width) || 720)), height: Math.min(520, Math.max(210, Number(board.height) || 260)), levels: board.levels && typeof board.levels === "object" ? board.levels : {} };
  const rawBoards = Array.isArray(next.emotionBoards) && next.emotionBoards.length ? next.emotionBoards : (next.emotionBoard.visible ? [next.emotionBoard] : []);
  next.emotionBoards = rawBoards.filter(Boolean).map((item, index) => ({ id: item.id || uid("emotion"), type: "emotion-board", x: Number.isFinite(item.x) ? item.x : 260 + index * 48, y: Number.isFinite(item.y) ? item.y : 520 + index * 42, width: Math.min(1000, Math.max(420, Number(item.width) || 720)), height: Math.min(520, Math.max(210, Number(item.height) || 260)), levels: item.levels && typeof item.levels === "object" ? item.levels : {}, labels: item.labels && typeof item.labels === "object" ? item.labels : {}, createdAt: item.createdAt || Date.now() + index }));
  const rawCharacterArcs = Array.isArray(next.characterArcs) ? next.characterArcs : [];
  next.characterArcs = rawCharacterArcs.filter(Boolean).map((item, index) => { const stages = item.stages && typeof item.stages === "object" ? item.stages : {}; return { id: item.id || uid("character-arc"), type: "character-arc", roleIds: Array.isArray(item.roleIds) ? item.roleIds.filter(id => characterIds.has(id)) : [], stages: { origin: { label: "原始状态", text: String(stages.origin?.text || ""), position: Math.min(96, Math.max(4, Number(stages.origin?.position) || 18)) }, event: { label: "重大事件", text: String(stages.event?.text || ""), position: Math.min(96, Math.max(4, Number(stages.event?.position) || 50)) }, result: { label: "转化结果", text: String(stages.result?.text || ""), position: Math.min(96, Math.max(4, Number(stages.result?.position) || 82)) } }, x: Number.isFinite(item.x) ? item.x : 260 + index * 44, y: Number.isFinite(item.y) ? item.y : 220 + index * 44, width: Math.min(1200, Math.max(620, Number(item.width) || 820)), height: Math.min(700, Math.max(320, Number(item.height) || 390)), createdAt: item.createdAt || Date.now() + index }; });
  const rawCharacterGoals = Array.isArray(next.characterGoals) ? next.characterGoals : [];
  const normalizeGoalEntries = (entries, prefix) => entries.filter(Boolean).map((entry, entryIndex) => ({
    id: entry.id || uid(prefix),
    text: String(entry.text || ""),
    position: Math.min(96, Math.max(4, Number.isFinite(Number(entry.position)) ? Number(entry.position) : Math.min(92, 12 + entryIndex * 24)))
  }));
  next.characterGoals = rawCharacterGoals.filter(Boolean).map((item, index) => ({
    id: item.id || uid("character-goal"), type: "character-goal",
    roleIds: Array.isArray(item.roleIds) ? item.roleIds.filter(id => characterIds.has(id)) : [],
    surfaceGoals: normalizeGoalEntries(Array.isArray(item.surfaceGoals) ? item.surfaceGoals : [], "surface-goal"),
    coreGoals: normalizeGoalEntries(Array.isArray(item.coreGoals) ? item.coreGoals : [], "core-goal"),
    x: Number.isFinite(item.x) ? item.x : 280 + index * 44,
    y: Number.isFinite(item.y) ? item.y : 240 + index * 44,
    width: Math.max(680, Number(item.width) || 900),
    height: Math.max(360, Number(item.height) || 520),
    createdAt: item.createdAt || Date.now() + index
  }));
  const rawScriptNotes = Array.isArray(next.scriptNotes) ? next.scriptNotes : [];
  next.scriptNotes = rawScriptNotes.filter(Boolean).map((item, index) => ({ id: item.id || uid("script-note"), type: "script-note", content: String(item.content || ""), x: Number.isFinite(item.x) ? item.x : 320 + index * 34, y: Number.isFinite(item.y) ? item.y : 360 + index * 34, width: Math.min(720, Math.max(200, Number(item.width) || 280)), height: Math.min(720, Math.max(160, Number(item.height) || 210)), createdAt: item.createdAt || Date.now() + index }));
  const scriptNoteIds = new Set(next.scriptNotes.map(item => item.id));
  const emotionBoardIds = new Set(next.emotionBoards.map(item => item.id)); const characterArcIds = new Set(next.characterArcs.map(item => item.id)); const characterGoalIds = new Set(next.characterGoals.map(item => item.id));
  const assistantTargets = new Set([...allIds, ...emotionBoardIds, ...characterArcIds, ...characterGoalIds, ...scriptNoteIds, "character-manager"]);
  next.aiAssistants = Array.isArray(next.aiAssistants) ? next.aiAssistants.filter(Boolean).map((item, index) => ({ id: item.id || uid("script-ai"), type: "ai-assistant", targetId: assistantTargets.has(item.targetId) ? item.targetId : "", instruction: String(item.instruction || ""), answer: String(item.answer || ""), error: String(item.error || ""), status: item.status === "running" && scriptAssistantPendingIds.has(item.id) ? "running" : "idle", model: item.model === "gpt-5.5" ? "gpt-5.5" : "gpt-5.6", x: Number.isFinite(item.x) ? item.x : 320 + index * 36, y: Number.isFinite(item.y) ? item.y : 260 + index * 36, width: Math.min(900, Math.max(360, Number(item.width) || 520)), height: Math.min(760, Math.max(320, Number(item.height) || 430)), createdAt: item.createdAt || Date.now() + index })) : [];
  const aiAssistantIds = new Set(next.aiAssistants.map(item => item.id)); next.selectedIds = next.selectedIds.filter(id => allIds.has(id) || emotionBoardIds.has(id) || characterArcIds.has(id) || characterGoalIds.has(id) || scriptNoteIds.has(id) || aiAssistantIds.has(id));
  next.emotionLinks = Array.isArray(next.emotionLinks) ? next.emotionLinks.filter(link => link && emotionBoardIds.has(link.source) && storyIds.has(link.target)).map(link => ({ id: link.id || uid("emotion-link"), source: link.source, target: link.target, createdAt: Number.isFinite(link.createdAt) ? link.createdAt : 0 })) : []; const linkedStoryIds = new Set(); next.emotionLinks = next.emotionLinks.filter(link => { if (linkedStoryIds.has(link.target)) return false; linkedStoryIds.add(link.target); return true; });
  if (!next.emotionLinks.length && !Array.isArray(flow?.emotionLinks) && next.emotionBoard.visible && next.emotionBoards[0]) next.emotionLinks = next.storyCards.map((card, index) => ({ id: uid("emotion-link"), source: next.emotionBoards[0].id, target: card.id, createdAt: index })); const edgeIds = new Set([...next.relationships, ...next.storyLinks, ...next.emotionLinks].map(link => link.id)); next.selectedEdgeId = edgeIds.has(next.selectedEdgeId) ? next.selectedEdgeId : null;
  const manager = next.characterManager || {};
  const acts = Array.isArray(manager.acts) ? manager.acts : [];
  const rawActSplits = Array.isArray(manager.actSplits) ? manager.actSplits : [33.333, 66.667];
  const firstActSplit = Math.min(70, Math.max(15, Number(rawActSplits[0]) || 33.333));
  const secondActSplit = Math.min(85, Math.max(firstActSplit + 15, Number(rawActSplits[1]) || 66.667));
  next.characterManager = {
    visible: Boolean(manager.visible),
    x: Number.isFinite(manager.x) ? manager.x : 250,
    y: Number.isFinite(manager.y) ? manager.y : 90,
    width: Math.max(620, Number(manager.width) || 880),
    height: Math.min(720, Math.max(430, Number(manager.height) || 460)),
    acts: [0, 1, 2].map(index => ({ title: typeof acts[index]?.title === "string" ? acts[index].title : ["第一幕", "第二幕", "第三幕"][index], subtitle: typeof acts[index]?.subtitle === "string" ? acts[index].subtitle : ["铺垫与引入", "冲突升级与发展", "高潮与结局"][index] })),
    actSplits: [firstActSplit, secondActSplit],
    paragraphs: (Array.isArray(manager.paragraphs) ? manager.paragraphs : []).filter(item => item && typeof item === "object").map((item, index) => ({ id: item.id || uid("segment"), title: typeof item.title === "string" ? item.title : "段落 " + (index + 1), content: typeof item.content === "string" ? item.content : "", position: Math.min(94, Math.max(6, Number(item.position) || 10 + index * 18)) }))
  };
  const notes = next.characterNotes || {};
  next.characterNotes = {
    visible: Boolean(notes.visible) && characterIds.has(notes.roleId),
    roleId: characterIds.has(notes.roleId) ? notes.roleId : "",
    x: Number.isFinite(notes.x) ? notes.x : 1170,
    y: Number.isFinite(notes.y) ? notes.y : 122,
    width: Math.min(560, Math.max(240, Number(notes.width) || 280)),
    height: Math.min(720, Math.max(270, Number(notes.height) || 390))
  };
  next.characterCounter = Math.max(Number(next.characterCounter) || 1, next.characters.length + 1); return next;
}
function ensureScriptFlow() { if (!state) return createScriptFlow(); state.scriptFlow = normalizeScriptFlow(state.scriptFlow); return state.scriptFlow; }function createScriptCharacter(roleTypeId, x, y) {
  const roleType = scriptRoleTypes.find(item => item.id === roleTypeId) || scriptRoleTypes[0];
  return { id: uid("role"), type: "character", roleType: roleType.id, gender: roleType.gender, name: "", identity: "", age: "", occupation: "", personality: "", goal: "", bio: "", tags: [], managementPosition: 50, x, y, createdAt: Date.now() };
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
  return { version: 2, id: uid("project"), projectName: name, theme, createdAt: now, updatedAt: now, nodes, edges, selectedIds: [], selectedEdgeId: null, viewport: { x: 180, y: 95, scale: 0.72 }, tool: "select", libraryTab: "modules", flowMode: "workflow", panelWidths: { library: 238, inspector: 286 }, scriptFlow: createScriptFlow(), recentIds: [], frameCounter: 1 };
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
      if (node.type === "generator") {
        if (node.mediaType === "video" || node.provider === "runninghub-h3") {
          const connectedImageSlots = normalized.edges.filter(edge => edge.target === node.id && edge.type === "image" && /^image-\d+$/.test(edge.targetPort)).reduce((largest, edge) => Math.max(largest, Number(edge.targetPort.split("-")[1]) + 1 || 0), 0);
          return normalizeRunningHubVideo(node, connectedImageSlots);
        }
        const slots = Math.min(14, Math.max(1, Number(node.inputSlots) || 4));
        const promptSlots = Math.min(6, Math.max(1, Number(node.promptSlots) || 1));
        const generatorNormalized = { ...node, provider: ["gemini", "moyu", "midjourney"].includes(node.provider) ? node.provider : "image2", geminiModel: geminiImageModels.some(item => item.id === node.geminiModel) ? node.geminiModel : geminiImageModels[0].id, moyuModel: seedreamImageModels.some(item => item.id === node.moyuModel) ? node.moyuModel : seedreamImageModels[0].id, width: node.width || 360, promptSlots, inputSlots: slots, height: Math.max(Number(node.height) || 0, nodeHeight("generator", slots, promptSlots)), aspect: sizeMap[node.aspect] ? node.aspect : fixedGeneratorSettings.aspect, quality: ["low", "medium", "high"].includes(node.quality) ? node.quality : fixedGeneratorSettings.quality, batch: Math.min(4, Math.max(1, Number(node.batch) || fixedGeneratorSettings.batch)), status: node.activeJobId ? "running" : "idle" };
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
      if (node.type === "video-preview") return { ...node, name: node.name || "成片预览", x: Number.isFinite(Number(node.x)) ? Number(node.x) : 0, y: Number.isFinite(Number(node.y)) ? Number(node.y) : 0, width: Math.max(280, Number(node.width) || 360), height: Math.max(280, Number(node.height) || nodeHeight("video-preview")), outputType: "mp4" };
      if (node.type === "answer") {
        const slots = Math.min(8, Math.max(1, Number(node.inputSlots) || 4));
        const answerSkill = normalizedAnswerSkill(node.answerSkill);
        const next = { ...node, name: node.name || "模型回答", width: Math.max(320, Number(node.width) || 380), promptSlots: 1, inputSlots: slots, model: ["gpt-5.5", "gpt-5.6"].includes(node.model) ? node.model : "gpt-5.6", answerSkill, h3Mode: normalizedH3AnswerMode(node.h3Mode), h3Duration: normalizedH3Duration(node.h3Duration), status: node.status === "running" ? "running" : "idle", answer: String(node.answer || ""), error: String(node.error || "") };
        next.height = Math.max(Number(node.height) || 0, answerNodeHeight(next));
        return next;
      }
      if (node.type === "image") return { ...node, x: Number.isFinite(Number(node.x)) ? Number(node.x) : 0, y: Number.isFinite(Number(node.y)) ? Number(node.y) : 0, width: node.width || 270, height: node.height || nodeHeight("image"), disabled: Boolean(node.disabled) };
  if (node.type === "video") return { ...node, mediaType: "video", x: Number.isFinite(Number(node.x)) ? Number(node.x) : 0, y: Number.isFinite(Number(node.y)) ? Number(node.y) : 0, width: Math.max(270, Number(node.width) || 270), height: Math.max(322, Number(node.height) || 322), outputType: node.outputType || "mp4", status: "idle" };
  if (node.type === "loading") return { ...node, mediaType: node.mediaType === "video" ? "video" : "image", x: Number.isFinite(Number(node.x)) ? Number(node.x) : 0, y: Number.isFinite(Number(node.y)) ? Number(node.y) : 0, width: Math.max(270, Number(node.width) || 270), height: Math.max(322, Number(node.height) || nodeHeight("loading")) };
      if (node.type === "prompt") { const width = node.width || 320; const height = Math.max(Number(node.height) || 0, nodeHeight("prompt")); return { ...node, width, height, content: stripPromptQuickMarkers(stripPromptCompositionMarkers(node.content)), promptPresetId: String(node.promptPresetId || ""), promptQuickParams: normalizePromptQuickParams(node.promptQuickParams), promptQuickInstruction: String(node.promptQuickInstruction || ""), compositionInstruction: String(node.compositionInstruction || ""), composition: normalizePromptComposition(node.composition), promptLayout: normalizePromptLayout(node.promptLayout, width, height), disabled: Boolean(node.disabled) }; }
      if (node.type === "composition") return { ...node, name: node.name === "构图控制" ? "参数控制" : node.name || "参数控制", width: Math.max(300, Number(node.width) || 390), height: Math.max(320, Number(node.height) || nodeHeight("composition")), composition: normalizePromptComposition(node.composition) };
      if (node.type === "note") return { ...node, name: node.name || "便签", content: String(node.content || ""), width: Math.max(170, Number(node.width) || 260), height: Math.max(130, Number(node.height) || 190) };
      if (node.type === "frame") return { ...node, name: node.name || "工作流分组", width: node.width || 700, height: node.height || 480 };
      return node;
    });
    const panelWidths = normalized.panelWidths || {}; normalized.panelWidths = { library: Math.min(480, Math.max(190, Number(panelWidths.library) || 238)), inspector: Math.min(520, Math.max(220, Number(panelWidths.inspector) || 286)) }; normalized.scriptFlow = normalizeScriptFlow(normalized.scriptFlow);
    return normalized;
  }
  const migrated = createStarterProject(project.projectName || "迁移项目", project.theme || globalTheme);
  const prompt = migrated.nodes.find(node => node.type === "prompt");
  const generator = migrated.nodes.find(node => node.type === "generator");
  prompt.content = project.prompt || prompt.content;
  generator.aspect = fixedGeneratorSettings.aspect;
  generator.quality = fixedGeneratorSettings.quality;
  generator.batch = fixedGeneratorSettings.batch;
  generator.outputSize = "current";
  generator.constraints = project.constraints || generator.constraints;
  const legacyImages = (project.nodes || []).filter(node => node.type === "image").map((node, index) => ({ ...node, id: node.id || uid("image"), type: "image", x: node.x ?? 70 + index * 300, y: node.y ?? 520, width: 270, height: nodeHeight("image"), source: node.source || "迁移素材", createdAt: node.createdAt || Date.now() + index }));
  migrated.nodes.push(...legacyImages, ...(project.nodes || []).filter(node => node.type === "frame"));
  legacyImages.slice(0, 8).forEach((imageNode, index) => migrated.edges.push({ id: uid("edge"), source: imageNode.id, sourcePort: "image", target: generator.id, targetPort: `image-${index}`, type: "image" }));
  migrated.viewport = project.viewport || migrated.viewport;
  migrated.recentIds = project.recentIds || [];
  migrated.scriptFlow = normalizeScriptFlow(project.scriptFlow);
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
  recordHistory(); node.content = preset.content; node.promptPresetId = preset.id; renderCanvas(); renderInspector(); scheduleSave(); toast(`已载入提示词预设“${preset.name}”`);
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
    [node.src, node.originalSrc, node.previewSrc].forEach(source => {
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
function formatStorageSize(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
async function collectAllGeneratedImageReferences() {
  const projects = await dbGetAll("projects");
  const files = new Set();
  projects.filter(project => project?.id).forEach(project => generatedImageFilesForProject(project).forEach(file => files.add(file)));
  return [...files];
}
async function inspectUnusedGeneratedImages(referencedFilenames, action = "preview") {
  return requestJson("/api/generated/cleanup-unused", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, referencedFilenames })
  }, 60_000);
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
    const referencedFilenames = await collectAllGeneratedImageReferences();
    const preview = await inspectUnusedGeneratedImages(referencedFilenames);
    generatedCleanupPreview = { ...preview, referencedFilenames };
    if (!preview.unusedCount) {
      setGeneratedCleanupDialogState({ copy: "当前没有可清理的未使用生成图片。", summary: `已检查 ${preview.totalImageCount} 张本地生成图片，所有仍被项目画布引用的图片均会保留。` });
      return;
    }
    setGeneratedCleanupDialogState({
      copy: "以下图片没有出现在任何项目画布中，可以清理以释放 E 盘空间。",
      summary: `可清理 ${preview.unusedCount} 张图片，预计释放 ${formatStorageSize(preview.reclaimBytes)}。`,
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
    const referencedFilenames = await collectAllGeneratedImageReferences();
    const result = await inspectUnusedGeneratedImages(referencedFilenames, "delete");
    generatedCleanupPreview = null;
    $("#generatedCleanupDialog").close();
    toast(result.deleted ? `已清理 ${result.deleted} 张未使用生成图片，释放 ${formatStorageSize(result.deletedBytes)}` : "没有需要清理的生成图片");
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
function syncDialogueEditorAfterRestore() {
  if (!dialogueEditor) return;
  const card = ensureScriptFlow().storyCards.find(item => item.id === dialogueEditor.cardId);
  if (!card) return closeStoryDialogue();
  dialogueEditor.entries = structuredClone(card.dialogue || []);
  dialogueEditor.analysis = structuredClone(card.dialogueAnalysis || {});
  dialogueEditor.analysisHiddenRoles = structuredClone(card.dialogueAnalysisHiddenRoles || []);
  renderDialogueEditor();
}
function restoreSnapshot(next) { state = normalizeProject(structuredClone(next)); applyTheme(state.theme); renderWorkspace(); syncDialogueEditorAfterRestore(); scheduleSave(); }
function undo() { if (!undoStack.length || isGenerating) return; redoStack.push(snapshot()); restoreSnapshot(undoStack.pop()); updateHistoryButtons(); }
function redo() { if (!redoStack.length || isGenerating) return; undoStack.push(snapshot()); restoreSnapshot(redoStack.pop()); updateHistoryButtons(); }
function updateHistoryButtons() { $("#undoButton").disabled = !undoStack.length || isGenerating; $("#redoButton").disabled = !redoStack.length || isGenerating; }
function editableHistoryEligible(target) {
  return Boolean(state && target instanceof Element && target.matches("input, textarea, select") && !target.matches('input[type="file"]') && !target.closest("#dialogueScriptDialog, #settingsDialog, #newProjectDialog"));
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
async function saveProjectNow() {
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
  } catch {
    if (state?.id === projectId && revision === saveRevision) { $("#saveState").innerHTML = `${icon("cloud-off")} 保存失败`; refreshIcons(); }
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
  if (state) { state.theme = theme; scheduleSave(); } else { globalTheme = theme; localStorage.setItem("image2-canvas-theme", theme); }
  applyTheme(theme);
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
  const model = String(node.model || "");
  const quality = ["standard", "clear"].includes(node.videoQuality)
    ? node.videoQuality
    : model.includes(runningHubFirstFrameProfiles.clear.workflowId) ? "clear"
      : model.includes(runningHubFirstFrameProfiles.standard.workflowId) ? "standard" : "";
  if (!quality) return "";
  const profile = runningHubFirstFrameProfile({ videoQuality: quality });
  const width = Number(node.videoWidth) || profile.dimensions.width;
  const height = Number(node.videoHeight) || profile.dimensions.height;
  return `${profile.label} · ${width} × ${height}`;
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
      <div class="project-card-body"><h2 class="project-card-title">${escapeHtml(meta.projectName)}</h2>
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
    const duplicateButton = event.target.closest("[data-duplicate-project]");
    if (duplicateButton) return duplicateProject(duplicateButton.dataset.duplicateProject);
    const deleteButton = event.target.closest("[data-delete-project]");
    if (deleteButton) return deleteProject(deleteButton.dataset.deleteProject);
    const card = event.target.closest("[data-project-id]");
    if (card) openProject(card.dataset.projectId);
  };
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
  state.flowMode ||= "workflow";
  ensureScriptFlow();
  $("#projectName").textContent = state.projectName;
  $$(".library-tabs .tab").forEach(tab => tab.classList.toggle("is-active", tab.dataset.libraryTab === state.libraryTab));
  renderCanvas(); renderScriptFlow(); renderLibrary(); renderInspector(); setActiveTool(state.tool || "select"); updateViewport(); updateHistoryButtons(); renderFlowMode(); refreshIcons();
}
function renderFlowMode() {
  if (!state) return;
  const mode = state.flowMode || "workflow";
  $$("[data-flow-mode]").forEach(button => button.classList.toggle("is-active", button.dataset.flowMode === mode));
  const scriptMode = mode === "script";
  $("#workspace").classList.toggle("is-script-mode", scriptMode);
  $("#workspaceView").classList.toggle("is-script-mode", scriptMode);
  $("#scriptFlowStage").hidden = !scriptMode;
  applyPanelWidths();
  if (mode === "script") renderScriptFlow();
}
function setFlowMode(mode) {
  if (!state || state.flowMode === mode) return;
  recordHistory();
  state.flowMode = mode;
  renderWorkspace();
  scheduleSave();
}
function findNode(id) { return state?.nodes.find(node => node.id === id); }
function selectedNode() { return state?.selectedIds?.length === 1 ? findNode(state.selectedIds[0]) : null; }
function incomingEdge(nodeId, portId) { return state.edges.find(edge => edge.target === nodeId && edge.targetPort === portId); }
function outgoingEdges(nodeId, portId) { return state.edges.filter(edge => edge.source === nodeId && edge.sourcePort === portId); }
function sourceLabelForEdge(edge) { const node = findNode(edge?.source); return node ? `${node.disabled ? "已禁用 · " : ""}${node.name || "未命名"}` : "未连接"; }
function connectionChoicesForDraft(draft) {
  const source = findNode(draft?.nodeId);
  if (!source) return [];
  const generatorChoice = { kind: "generator", title: "新建生图节点", subtitle: "默认 Image2，可切换 Gemini", icon: "sparkles" };
  const videoChoice = { kind: "video", title: "新建视频节点", subtitle: "海螺 H3 · RunningHub", icon: "clapperboard" };
  const videoEditorChoice = { kind: "video-editor", title: "新建视频剪辑节点", subtitle: "导入、裁切并调整多条视频顺序", icon: "scissors" };
  const videoPreviewChoice = { kind: "video-preview", title: "新建成片预览节点", subtitle: "播放和下载合成后的 MP4", icon: "monitor-play" };
  const answerChoice = { kind: "answer", title: "新建模型回答节点", subtitle: "自动连接并用于文本回答", icon: "message-square-text" };
  const compositionChoice = { kind: "composition", title: "新建参数控制节点", subtitle: "自动写入已连接的提示词", icon: "sliders-horizontal" };
  if (source.type === "prompt" && draft.direction === "output" && draft.dataType === "prompt") return [generatorChoice, videoChoice, answerChoice];
  if (source.type === "prompt" && draft.direction === "input" && draft.dataType === "composition") return [compositionChoice];
  if (source.type === "composition" && draft.direction === "output" && draft.dataType === "composition") return [{ kind: "prompt", title: "新建提示词节点", subtitle: "自动接收构图指令", icon: "text-cursor-input" }];
  if ((source.type === "image" || source.type === "loading") && draft.direction === "output" && draft.dataType === "image") return [generatorChoice, videoChoice, answerChoice];
  if ((source.type === "video" || source.type === "video-editor") && draft.direction === "output" && draft.dataType === "video") return source.type === "video-editor" ? [videoPreviewChoice] : [videoEditorChoice, videoPreviewChoice];
  if ((source.type === "generator" || source.type === "answer") && draft.direction === "input" && draft.dataType === "prompt") return [{ kind: "prompt", title: "新建提示词节点", subtitle: "自动连接到此提示词输入", icon: "text-cursor-input" }];
  if ((source.type === "generator" || source.type === "answer") && draft.direction === "input" && draft.dataType === "image") return [{ kind: "reference", title: "新建参考图节点", subtitle: "连接到参考图输入，随后手动上传", icon: "image-plus" }];
  return [];
}
function createNodeForDraft(draft, kind, clientX, clientY) {
  if (!draft || !state) return;
  recordHistory();
  let node = null;
  if (kind === "generator") node = createGeneratorNode(Math.round(screenToScene(clientX, clientY).x - 180), Math.round(screenToScene(clientX, clientY).y - 180));
  if (kind === "video") node = createVideoNode(Math.round(screenToScene(clientX, clientY).x - 195), Math.round(screenToScene(clientX, clientY).y - 235));
  if (kind === "video-editor") node = createVideoEditorNode(Math.round(screenToScene(clientX, clientY).x - 340), Math.round(screenToScene(clientX, clientY).y - 195));
  if (kind === "video-preview") node = createVideoPreviewNode(Math.round(screenToScene(clientX, clientY).x - 180), Math.round(screenToScene(clientX, clientY).y - 160));
  if (kind === "answer") node = createAnswerNode(Math.round(screenToScene(clientX, clientY).x - 190), Math.round(screenToScene(clientX, clientY).y - 185));
  if (kind === "prompt") node = createPromptNode(Math.round(screenToScene(clientX, clientY).x - 160), Math.round(screenToScene(clientX, clientY).y - 145), "");
  if (kind === "composition") node = createCompositionNode(Math.round(screenToScene(clientX, clientY).x - 175), Math.round(screenToScene(clientX, clientY).y - 145));
  if (kind === "reference") node = createReferenceNode(Math.round(screenToScene(clientX, clientY).x - 135), Math.round(screenToScene(clientX, clientY).y - 160));
  if (!node) return;
  state.nodes.push(node); state.selectedIds = [node.id]; selectedEdgeId = null;
  if (draft.direction === "output") {
    const targetPort = (kind === "generator" || kind === "video" || kind === "answer") ? (draft.dataType === "prompt" ? "prompt" : "image-0") : kind === "video-editor" && draft.dataType === "video" ? "video-0" : kind === "video-preview" && draft.dataType === "video" ? "video" : kind === "prompt" && draft.dataType === "composition" ? "composition" : null;
    if (targetPort) connectPorts(draft, { nodeId: node.id, portId: targetPort, dataType: draft.dataType, direction: "input" }, false);
  } else {
    const outputPort = kind === "prompt" ? "prompt" : kind === "composition" ? "composition" : kind === "video" || kind === "video-editor" ? "video" : "image";
    connectPorts({ nodeId: node.id, portId: outputPort, dataType: draft.dataType, direction: "output" }, draft, false);
  }
  renderCanvas(); renderInspector(); scheduleSave();

}
function closeConnectionMenu() {
  if (connectionMenu) connectionMenu.remove();
  connectionMenu = null; connectionMenuDraft = null;
  window.removeEventListener("pointerdown", handleConnectionMenuOutside);
}
function handleConnectionMenuOutside(event) { if (connectionMenu && !connectionMenu.contains(event.target)) closeConnectionMenu(); }
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
  if (kind === "prompt") node = createPromptNode(Math.round(point.x - 160), Math.round(point.y - 145));
  if (kind === "composition") node = createCompositionNode(Math.round(point.x - 175), Math.round(point.y - 145));
  if (kind === "reference") node = createReferenceNode(Math.round(point.x - 135), Math.round(point.y - 160));
  if (kind === "generator") node = createGeneratorNode(Math.round(point.x - 180), Math.round(point.y - 180));
  if (kind === "video") node = createVideoNode(Math.round(point.x - 195), Math.round(point.y - 235));
  if (kind === "video-editor") node = createVideoEditorNode(Math.round(point.x - 340), Math.round(point.y - 195));
  if (kind === "video-preview") node = createVideoPreviewNode(Math.round(point.x - 180), Math.round(point.y - 160));
  if (kind === "answer") node = createAnswerNode(Math.round(point.x - 190), Math.round(point.y - 185));
  if (kind === "note") node = createNote(Math.round(point.x - 130), Math.round(point.y - 95));
  if (kind === "frame") node = { id: uid("frame"), type: "frame", name: `工作流分组 ${state.frameCounter++}`, x: Math.round(point.x - 260), y: Math.round(point.y - 170), width: 520, height: 340, createdAt: Date.now() };
  if (!node) return;
  recordHistory(); state.nodes.push(node); state.selectedIds = [node.id]; selectedEdgeId = null; renderWorkspace(); scheduleSave();
}
function showCanvasContextMenu(event) {
  if (!state || state.flowMode === "script" || event.target.closest(".tool-rail, .flow-switch, .canvas-status, .mobile-panel-button, input, textarea, [contenteditable=true]")) return;
  event.preventDefault(); closeConnectionMenu(); closeCanvasContextMenu();
  const choices = [
    { kind: "prompt", title: "提示词", icon: "text-cursor-input" },
    { kind: "composition", title: "参数控制", icon: "sliders-horizontal" },
    { kind: "reference", title: "参考图", icon: "image-plus" },
    { kind: "generator", title: "生图", icon: "sparkles" },
    { kind: "video", title: "视频", icon: "clapperboard" },
    { kind: "video-editor", title: "视频剪辑", icon: "scissors" },
    { kind: "video-preview", title: "成片预览", icon: "monitor-play" },
    { kind: "answer", title: "模型回答", icon: "message-square-text" },
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
  if (!choices.length) return toast("这个端口不能在空白处创建节点", true);
  const menu = document.createElement("div");
  menu.className = `connection-menu ${draft.dataType}`;
  menu.innerHTML = `<div class="connection-menu-title"><span>创建并连接</span><small>${choices.length === 1 ? escapeHtml(choices[0].subtitle) : "选择要连接的模块"}</small></div><div class="connection-option-list"></div>`;
  const list = menu.querySelector(".connection-option-list");
  choices.forEach(choice => {
    const button = document.createElement("button");
    button.className = "connection-option"; button.type = "button";
    button.innerHTML = `<span class="connection-option-icon">${icon(choice.icon)}</span><span class="connection-option-copy"><strong>${escapeHtml(choice.title)}</strong><small>${escapeHtml(choice.subtitle)}</small></span>`;
    button.addEventListener("click", event => { event.stopPropagation(); closeConnectionMenu(); createNodeForDraft(draft, choice.kind, clientX, clientY); });
    list.appendChild(button);
  });
  document.body.appendChild(menu); connectionMenu = menu; connectionMenuDraft = draft;
  positionConnectionMenu(menu, clientX, clientY); refreshIcons();
  setTimeout(() => window.addEventListener("pointerdown", handleConnectionMenuOutside), 0);
}
function scriptRoleType(role) { return scriptRoleTypes.find(item => item.id === role.roleType) || scriptRoleTypes.find(item => item.gender === role.gender) || scriptRoleTypes[0]; }
function scriptAvatarHtml(role, compact = false, connectable = false) {
  const gender = role.gender === "female" ? "female" : "male";
  const tag = connectable ? "button" : "div";
  const connection = connectable ? ` type="button" data-script-link="${role.id}" aria-label="从角色头像拖动连接"` : ' aria-hidden="true"';
  const imageSrc = gender === "female" ? "/assets/script-roles/female-profile.png" : "/assets/script-roles/male-profile.png";
  return `<${tag} class="script-avatar ${gender}${compact ? " is-compact" : ""}${connectable ? " script-avatar-connect" : ""}"${connection}><img class="script-avatar-art" src="${imageSrc}" alt=""></${tag}>`;
}
function scriptViewport() {
  if (!state) return { x: 0, y: 0, scale: 1 };
  const flow = state.scriptFlow || (state.scriptFlow = createScriptFlow());
  flow.viewport ||= { x: 0, y: 0, scale: 1 };
  flow.viewport.scale = Math.min(SCRIPT_ZOOM_MAX, Math.max(SCRIPT_ZOOM_MIN, Number(flow.viewport.scale) || 1));
  flow.viewport.x = Number.isFinite(flow.viewport.x) ? flow.viewport.x : 0;
  flow.viewport.y = Number.isFinite(flow.viewport.y) ? flow.viewport.y : 0;
  return flow.viewport;
}
function updateScriptViewport() {
  if (!state || !scriptFlowStage) return;
  const viewport = scriptViewport();
  const transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`;
  scriptEdgeLayer.style.transform = transform;
  scriptNodeLayer.style.transform = transform;
  if (state.flowMode === "script") $("#zoomButton").textContent = `${Math.round(viewport.scale * 100)}%`;
}
function workflowPanelWidths() {
  if (!state) return { library: 238, inspector: 286 };
  state.panelWidths ||= { library: 238, inspector: 286 };
  state.panelWidths.library = Math.min(480, Math.max(190, Number(state.panelWidths.library) || 238));
  state.panelWidths.inspector = Math.min(520, Math.max(220, Number(state.panelWidths.inspector) || 286));
  return state.panelWidths;
}
function scriptPanelWidths() {
  const flow = ensureScriptFlow();
  flow.panelWidths ||= { library: 238, inspector: 286 };
  flow.panelWidths.library = Math.min(480, Math.max(190, Number(flow.panelWidths.library) || 238));
  flow.panelWidths.inspector = Math.min(520, Math.max(220, Number(flow.panelWidths.inspector) || 286));
  return flow.panelWidths;
}
function activePanelWidths(mode = state?.flowMode) { return mode === "script" ? scriptPanelWidths() : workflowPanelWidths(); }
function applyPanelWidths() {
  const shell = $("#workspaceView"); if (!shell || !state) return;
  const widths = activePanelWidths();
  shell.style.setProperty("--library-width", `${widths.library}px`);
  shell.style.setProperty("--inspector-width", `${widths.inspector}px`);
  if (state.flowMode === "script") {
    shell.style.setProperty("--script-library-scale", Math.min(1.45, Math.max(.84, widths.library / 238)).toFixed(3));
    shell.style.setProperty("--script-inspector-scale", Math.min(1.35, Math.max(.86, widths.inspector / 286)).toFixed(3));
  } else { shell.style.removeProperty("--script-library-scale"); shell.style.removeProperty("--script-inspector-scale"); }
}
function startPanelResize(event, side) {
  if (!state || event.button !== 0) return;
  event.preventDefault(); event.stopPropagation();
  const mode = state.flowMode; const widths = activePanelWidths(mode); scriptPanelResizeSession = { side, mode, startX: event.clientX, startWidth: widths[side] };
  document.body.classList.add("is-resizing-panel");
}
function handlePanelResize(event) {
  if (!scriptPanelResizeSession) return false;
  const session = scriptPanelResizeSession; const widths = activePanelWidths(session.mode); const other = session.side === "library" ? widths.inspector : widths.library;
  const delta = event.clientX - session.startX; const proposed = session.side === "library" ? session.startWidth + delta : session.startWidth - delta;
  const max = Math.max(session.side === "library" ? 190 : 220, Math.min(session.side === "library" ? 480 : 520, $("#workspaceView").getBoundingClientRect().width - other - 420));
  widths[session.side] = Math.round(Math.min(max, Math.max(session.side === "library" ? 190 : 220, proposed)));
  applyPanelWidths(); return true;
}
function finishPanelResize() {
  if (!scriptPanelResizeSession) return false;
  scriptPanelResizeSession = null; document.body.classList.remove("is-resizing-panel"); scheduleSave(); return true;
}function scriptPoint(clientX, clientY) {
  const rect = scriptFlowStage.getBoundingClientRect(); const viewport = scriptViewport();
  return { x: (clientX - rect.left - viewport.x) / viewport.scale, y: (clientY - rect.top - viewport.y) / viewport.scale };
}
function scriptRoleCenter(role) { return { x: role.x + 74, y: role.y + 59 }; }
function scriptStoryCenter(card) { return { x: card.x + card.width / 2, y: card.y + card.height / 2 }; }
function emotionBoardCenter(board) { return { x: board.x + board.width / 2, y: board.y + board.height / 2 }; }
function scriptItemById(flow, id) { if (id === "character-manager" && flow.characterManager?.visible) return { ...flow.characterManager, id: "character-manager", type: "character-manager" }; if (id === "character-notes" && flow.characterNotes?.visible) return { ...flow.characterNotes, id: "character-notes", type: "character-notes" }; return flow.characters.find(item => item.id === id) || flow.storyCards.find(item => item.id === id) || flow.storyFrames.find(item => item.id === id) || (flow.emotionBoards || []).find(item => item.id === id) || (flow.characterArcs || []).find(item => item.id === id) || (flow.characterGoals || []).find(item => item.id === id) || (flow.scriptNotes || []).find(item => item.id === id) || (flow.aiAssistants || []).find(item => item.id === id) || null; }
function scriptItemKind(item) { return item?.type === "story-card" ? "story" : item?.type === "emotion-board" ? "emotion" : item?.type === "story-frame" ? "frame" : item?.type === "character-manager" ? "角色管理" : item?.type === "character-notes" ? "角色功能" : item?.type === "character-arc" ? "character-arc" : item?.type === "character-goal" ? "character-goal" : item?.type === "script-note" ? "便签" : item?.type === "ai-assistant" ? "ai-assistant" : "character"; }
function copyScriptSelection() {
  const flow = ensureScriptFlow();
  const allowed = new Set(["character", "story-card", "story-frame", "emotion-board", "character-arc", "character-goal", "script-note", "ai-assistant"]);
  const items = flow.selectedIds.map(id => scriptItemById(flow, id)).filter(item => item && allowed.has(item.type));
  if (!items.length) return toast("请选择剧本模块后再复制", true);
  const ids = new Set(items.map(item => item.id));
  scriptClipboard = {
    items: structuredClone(items),
    relationships: structuredClone(flow.relationships.filter(link => ids.has(link.source) && ids.has(link.target))),
    storyLinks: structuredClone(flow.storyLinks.filter(link => ids.has(link.source) && ids.has(link.target))),
    emotionLinks: structuredClone((flow.emotionLinks || []).filter(link => ids.has(link.source) && ids.has(link.target)))
  };
  scriptPasteSerial = 0;
  toast(`已复制 ${items.length} 个剧本元素`);
}
function pasteScriptSelection() {
  if (!scriptClipboard?.items?.length) return toast("请先复制剧本模块", true);
  const flow = ensureScriptFlow(); recordHistory(); const offset = 36 + scriptPasteSerial * 18; const idMap = new Map();
  const copies = scriptClipboard.items.map((item, index) => {
    const copy = structuredClone(item); const nextId = uid(item.type === "story-card" ? "story" : item.type === "story-frame" ? "script-frame" : item.type === "emotion-board" ? "emotion" : item.type === "character-arc" ? "character-arc" : item.type === "character-goal" ? "character-goal" : item.type === "script-note" ? "script-note" : item.type === "ai-assistant" ? "script-ai" : "role");
    idMap.set(item.id, nextId); copy.id = nextId; copy.x = Math.round((copy.x || 0) + offset); copy.y = Math.round((copy.y || 0) + offset); copy.createdAt = Date.now() + index;
    if (copy.type === "story-card") copy.displayNumber = "";
    if (copy.type === "emotion-board") copy.levels = {};
    return copy;
  });
  copies.forEach(copy => {
    if (copy.type === "character") flow.characters.push(copy);
    else if (copy.type === "story-card") flow.storyCards.push(copy);
    else if (copy.type === "story-frame") flow.storyFrames.push(copy);
    else if (copy.type === "emotion-board") flow.emotionBoards.push(copy);
    else if (copy.type === "character-arc") { copy.roleIds = copy.roleIds.filter(id => flow.characters.some(role => role.id === id)); flow.characterArcs.push(copy); }
    else if (copy.type === "character-goal") { copy.roleIds = copy.roleIds.filter(id => flow.characters.some(role => role.id === id)); copy.surfaceGoals = (copy.surfaceGoals || []).map(item => ({ ...item, id: uid("surface-goal") })); copy.coreGoals = (copy.coreGoals || []).map(item => ({ ...item, id: uid("core-goal") })); flow.characterGoals.push(copy); }
    else if (copy.type === "script-note") flow.scriptNotes.push(copy);
    else if (copy.type === "ai-assistant") { copy.status = "idle"; copy.error = ""; flow.aiAssistants.push(copy); }
  });
  scriptClipboard.items.filter(item => item.type === "emotion-board").forEach(board => {
    const copy = copies.find(item => item.id === idMap.get(board.id)); if (!copy) return;
    copy.levels = Object.fromEntries(Object.entries(board.levels || {}).filter(([id]) => idMap.has(id)).map(([id, value]) => [idMap.get(id), value]));
  });
  scriptClipboard.relationships.forEach(link => flow.relationships.push({ ...link, id: uid("rel"), source: idMap.get(link.source), target: idMap.get(link.target) }));
  scriptClipboard.storyLinks.forEach(link => flow.storyLinks.push({ ...link, id: uid("story-link"), source: idMap.get(link.source), target: idMap.get(link.target) }));
  scriptClipboard.emotionLinks.forEach(link => flow.emotionLinks.push({ ...link, id: uid("emotion-link"), source: idMap.get(link.source), target: idMap.get(link.target), createdAt: Date.now() }));
  flow.selectedIds = copies.map(item => item.id); flow.selectedEdgeId = null; scriptPasteSerial += 1;

  syncEmotionLevels(flow); renderWorkspace(); scheduleSave(); toast(`已粘贴 ${copies.length} 个剧本元素`);
}
function copyWorkflowSelection() {
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

function characterArcCenter(arc) { return { x: arc.x + arc.width / 2, y: arc.y + arc.height / 2 }; }
function characterGoalCenter(goal) { return { x: goal.x + goal.width / 2, y: goal.y + goal.height / 2 }; }
function scriptItemCenter(item) { return item?.type === "emotion-board" ? emotionBoardCenter(item) : ["story-card", "story-frame", "script-note", "ai-assistant", "character-manager", "character-notes"].includes(item?.type) ? scriptStoryCenter(item) : item?.type === "character-arc" ? characterArcCenter(item) : item?.type === "character-goal" ? characterGoalCenter(item) : scriptRoleCenter(item); }
function scriptItemElement(id) { if (id === "character-manager") return scriptNodeLayer.querySelector("[data-character-manager-panel]"); if (id === "character-notes") return scriptNodeLayer.querySelector("[data-character-notes-panel]"); return scriptNodeLayer.querySelector(`[data-script-character="${CSS.escape(id)}"], [data-story-card="${CSS.escape(id)}"], [data-script-frame="${CSS.escape(id)}"], [data-emotion-board="${CSS.escape(id)}"], [data-character-arc="${CSS.escape(id)}"], [data-character-goal="${CSS.escape(id)}"], [data-script-note="${CSS.escape(id)}"], [data-ai-assistant="${CSS.escape(id)}"]`); }
function scriptItemLabel(item) { return item?.type === "story-card" ? storyCardLabel(item) : item?.type === "emotion-board" ? "情绪曲线" : item?.type === "character-manager" ? "角色管理" : item?.type === "character-notes" ? "角色功能" : item?.type === "character-arc" ? "角色转变" : item?.type === "character-goal" ? "角色目标" : item?.type === "script-note" ? "便签" : item?.type === "story-frame" ? item.name : item?.type === "ai-assistant" ? "AI助手" : scriptCharacterLabel(item) || "-"; }
function scriptRelationshipPath(start, end) { const dx = end.x - start.x; const distance = Math.max(70, Math.abs(dx) * .42); return `M ${start.x} ${start.y} C ${start.x + distance} ${start.y}, ${end.x - distance} ${end.y}, ${end.x} ${end.y}`; }
function storyCardSequence(flow = ensureScriptFlow()) {
  const cards = flow.storyCards || []; const order = new Map();
  (flow.emotionLinks || []).forEach((link, index) => { if (!order.has(link.target)) order.set(link.target, index); });
  return cards.slice().sort((a, b) => { const aOrder = order.has(a.id) ? order.get(a.id) : Number.MAX_SAFE_INTEGER; const bOrder = order.has(b.id) ? order.get(b.id) : Number.MAX_SAFE_INTEGER; return aOrder - bOrder || (a.createdAt || 0) - (b.createdAt || 0); });
}
function emotionBoardCards(flow, board) { const byId = new Map((flow.storyCards || []).map(card => [card.id, card])); return (flow.emotionLinks || []).filter(link => link.source === board.id).map(link => byId.get(link.target)).filter(Boolean); }
function syncEmotionLevels(flow = ensureScriptFlow()) { (flow.emotionBoards || []).forEach(board => { const levels = board.levels || (board.levels = {}); const labels = board.labels || (board.labels = {}); const ids = new Set(emotionBoardCards(flow, board).map(card => card.id)); Object.keys(levels).forEach(id => { if (!ids.has(id)) delete levels[id]; }); Object.keys(labels).forEach(id => { if (!ids.has(id)) delete labels[id]; }); ids.forEach(id => { if (!Number.isFinite(levels[id])) levels[id] = .5; }); }); }
function createScriptFrame(x, y, index) { return { id: uid("script-frame"), type: "story-frame", name: `剧本分组 ${index + 1}`, x, y, width: 620, height: 420, createdAt: Date.now() }; }
function scriptFrameContainedItems(frame, flow = ensureScriptFlow()) { const floatingPanels = [flow.characterManager?.visible ? { ...flow.characterManager, id: "character-manager", type: "character-manager" } : null, flow.characterNotes?.visible ? { ...flow.characterNotes, id: "character-notes", type: "character-notes" } : null].filter(Boolean); return [...flow.characters, ...flow.storyCards, ...(flow.emotionBoards || []), ...(flow.characterArcs || []), ...(flow.characterGoals || []), ...(flow.aiAssistants || []), ...(flow.scriptNotes || []), ...floatingPanels].filter(item => { const panel = ["story-card", "emotion-board", "character-arc", "character-goal", "script-note", "ai-assistant", "character-manager", "character-notes"].includes(item.type); if (["character-manager", "character-notes"].includes(item.type)) return item.x < frame.x + frame.width && item.x + item.width > frame.x && item.y < frame.y + frame.height && item.y + item.height > frame.y; const halfWidth = panel ? item.width / 2 : 74; const halfHeight = panel ? item.height / 2 : 92; return item.x + halfWidth >= frame.x && item.x + halfWidth <= frame.x + frame.width && item.y + halfHeight >= frame.y && item.y + halfHeight <= frame.y + frame.height; }); }
function addScriptFrame() { if (!state) return; const flow = ensureScriptFlow(); const rect = scriptFlowStage.getBoundingClientRect(); const center = scriptPoint(rect.left + rect.width / 2, rect.top + rect.height / 2); recordHistory(); const frame = createScriptFrame(Math.round(center.x - 310), Math.round(center.y - 210), flow.storyFrames.length); flow.storyFrames.push(frame); flow.selectedIds = [frame.id]; flow.selectedEdgeId = null; renderWorkspace(); scheduleSave(); }
function scriptFrameTitleWidth(name = "") { return Math.max(104, Math.min(340, Array.from(name).length * 22 + 28)); } function renderScriptFrame(frame, flow) { const selected = flow.selectedIds.includes(frame.id) ? " is-selected" : ""; const count = scriptFrameContainedItems(frame, flow).length; const titleWidth = scriptFrameTitleWidth(frame.name); return `<section class="script-group-frame${selected}" data-script-frame="${frame.id}" style="left:${frame.x}px;top:${frame.y}px;width:${frame.width}px;height:${frame.height}px"><header><input class="script-frame-name" data-script-frame-name="${frame.id}" value="${escapeHtml(frame.name)}" style="width:${titleWidth}px" aria-label="分组画板名称"><span>${count} 个元素</span></header></section>`; } function renderScriptFrameResizeControls(frame) { return ["sw", "se"].map(corner => { const left = corner === "sw" ? frame.x - 10 : frame.x + frame.width - 10; return `<button class="script-frame-resize" data-script-frame-resize="${frame.id}" data-script-frame-resize-corner="${corner}" style="left:${left}px;top:${frame.y + frame.height - 10}px" aria-label="调整分组画板大小" type="button"></button>`; }).join(""); } function positionScriptFrameResizeControls(frame) { $$(`[data-script-frame-resize="${CSS.escape(frame.id)}"]`).forEach(handle => { const left = handle.dataset.scriptFrameResizeCorner === "sw" ? frame.x - 10 : frame.x + frame.width - 10; handle.style.left = `${left}px`; handle.style.top = `${frame.y + frame.height - 10}px`; }); }function createStoryCard(x, y) { return { id: uid("story"), type: "story-card", title: "未命名情节", scene: "", time: "", location: "", characters: "", mood: "", goal: "", initialSituation: "", finalSituation: "", storyType: "", storyTypeMode: "preset", content: "", dialogue: [], x, y, width: 220, height: 330, createdAt: Date.now() }; }
function addStoryCard() { if (!state) return; const flow = ensureScriptFlow(); const rect = scriptFlowStage.getBoundingClientRect(); const center = scriptPoint(rect.left + rect.width / 2, rect.top + rect.height / 2); const index = flow.storyCards.length; recordHistory(); const card = createStoryCard(Math.round(center.x - 110 + ((index % 3) - 1) * 250), Math.round(center.y - 155 + Math.floor(index / 3) * 365)); flow.storyCards.push(card); flow.selectedIds = [card.id]; flow.selectedEdgeId = null; syncEmotionLevels(flow); renderWorkspace(); scheduleSave(); }
function addEmotionBoard() { if (!state) return; const flow = ensureScriptFlow(); const rect = scriptFlowStage.getBoundingClientRect(); const point = scriptPoint(rect.left + rect.width / 2, rect.top + rect.height * .72); const index = (flow.emotionBoards || []).length; recordHistory(); const board = { id: uid("emotion"), type: "emotion-board", x: Math.round(point.x - 360 + index * 28), y: Math.round(point.y - 130 + index * 28), width: 720, height: 260, levels: {}, labels: {}, createdAt: Date.now() + index }; flow.emotionBoards.push(board); flow.selectedIds = []; flow.selectedEdgeId = null; renderWorkspace(); scheduleSave(); }
function createCharacterArc(x, y, index) {
  return { id: uid("character-arc"), type: "character-arc", roleIds: [], stages: { origin: { label: "原始状态", text: "", position: 18 }, event: { label: "重大事件", text: "", position: 50 }, result: { label: "转化结果", text: "", position: 82 } }, x, y, width: 820, height: 390, createdAt: Date.now() + index };
}
function addCharacterArc() {
  if (!state) return; const flow = ensureScriptFlow(); const rect = scriptFlowStage.getBoundingClientRect(); const point = scriptPoint(rect.left + rect.width / 2, rect.top + rect.height * .5); recordHistory(); const arc = createCharacterArc(Math.round(point.x - 410 + flow.characterArcs.length * 30), Math.round(point.y - 195 + flow.characterArcs.length * 30), flow.characterArcs.length); flow.characterArcs.push(arc); flow.selectedIds = [arc.id]; flow.selectedEdgeId = null; renderWorkspace(); scheduleSave();
}
function createCharacterGoal(x, y, index) {
  return { id: uid("character-goal"), type: "character-goal", roleIds: [], surfaceGoals: [], coreGoals: [], x, y, width: 900, height: 520, createdAt: Date.now() + index };
}
function addCharacterGoal() {
  if (!state) return; const flow = ensureScriptFlow(); const rect = scriptFlowStage.getBoundingClientRect(); const point = scriptPoint(rect.left + rect.width / 2, rect.top + rect.height * .54); recordHistory(); const goal = createCharacterGoal(Math.round(point.x - 450 + (flow.characterGoals || []).length * 32), Math.round(point.y - 260 + (flow.characterGoals || []).length * 32), (flow.characterGoals || []).length); flow.characterGoals.push(goal); flow.selectedIds = [goal.id]; flow.selectedEdgeId = null; renderWorkspace(); scheduleSave();
}
function characterGoalMarkup(goal, flow) {
  const selected = flow.selectedIds.includes(goal.id) ? " is-selected" : ""; const roles = goal.roleIds.map(id => flow.characters.find(role => role.id === id)).filter(Boolean); const pickerOpen = characterGoalRolePickerId === goal.id;
  const chips = roles.length ? roles.map(role => `<span class="character-goal-role-chip ${role.gender}">${scriptAvatarHtml(role, true)}<strong>${escapeHtml(scriptCharacterLabel(role))}</strong><button type="button" class="character-goal-interactive script-interactive" data-character-goal-remove-role="${goal.id}" data-role-id="${role.id}" aria-label="移除 ${escapeHtml(scriptCharacterLabel(role))}">${icon("x")}</button></span>`).join("") : `<span class="character-goal-role-empty">选择画布中的角色</span>`;
  const picker = pickerOpen ? `<div class="character-goal-role-picker" role="menu">${flow.characters.length ? flow.characters.map(role => `<button type="button" class="character-goal-role-option ${role.gender} character-goal-interactive script-interactive" data-character-goal-pick-role="${goal.id}" data-role-id="${role.id}">${scriptAvatarHtml(role, true)}<span><strong>${escapeHtml(scriptCharacterLabel(role))}</strong><small>${escapeHtml(role.identity || (role.gender === "female" ? "女性角色" : "男性角色"))}</small></span></button>`).join("") : `<span class="character-goal-role-picker-empty">画布中还没有角色</span>`}</div>` : "";
  const safePosition = position => Math.min(85, Math.max(15, Number(position) || 50)); const cards = (entries, kind, placeholder) => entries.map(entry => `<article class="character-goal-entry character-goal-entry-${kind}" data-character-goal-entry="${entry.id}" data-character-goal-id="${goal.id}" data-goal-kind="${kind}" style="left:${safePosition(entry.position)}%"><button type="button" class="character-goal-entry-grip character-goal-interactive script-interactive" data-character-goal-point="${goal.id}" data-goal-kind="${kind}" data-goal-entry="${entry.id}" aria-label="横向移动目标">${icon("grip-vertical")}</button><textarea class="character-goal-interactive script-interactive" data-character-goal-text="${goal.id}" data-goal-kind="${kind}" data-goal-entry="${entry.id}" placeholder="${placeholder}">${escapeHtml(entry.text || "")}</textarea><span></span></article>`).join("");
  return `<article class="character-goal-card${selected}" data-character-goal="${goal.id}" style="left:${goal.x}px;top:${goal.y}px;width:${goal.width}px;height:${goal.height}px"><header><div><small>CHARACTER GOALS</small><strong>角色目标</strong></div><span>${roles.length} 位关联角色</span></header><div class="character-goal-roles"><b>关联角色</b><div class="character-goal-role-list">${chips}</div><div class="character-goal-role-picker-wrap"><button type="button" class="character-goal-add-role character-goal-interactive script-interactive" data-character-goal-role-toggle="${goal.id}" aria-expanded="${pickerOpen}" aria-label="添加关联角色">${icon("plus")} 添加角色</button>${picker}</div></div><section class="character-goal-section surface"><div class="character-goal-section-heading"><div><strong>表层目标</strong><span>可多个，随剧情阶段变化</span></div><button type="button" class="character-goal-add-entry character-goal-interactive script-interactive" data-character-goal-add-entry="${goal.id}" data-goal-kind="surface">${icon("plus")} 添加表层目标</button></div><div class="character-goal-track" data-character-goal-track="${goal.id}" data-goal-kind="surface"><i></i>${cards(goal.surfaceGoals, "surface", "输入表层目标")}</div></section><section class="character-goal-section core"><div class="character-goal-section-heading"><div><strong>核心目标</strong><span>贯穿故事的内在驱动力</span></div><button type="button" class="character-goal-add-entry character-goal-interactive script-interactive" data-character-goal-add-entry="${goal.id}" data-goal-kind="core">${icon("plus")} 添加核心目标</button></div><div class="character-goal-track" data-character-goal-track="${goal.id}" data-goal-kind="core"><i></i>${cards(goal.coreGoals, "core", "输入核心目标")}</div></section><span class="character-goal-resize character-goal-interactive script-interactive" data-character-goal-resize="${goal.id}" aria-hidden="true"></span></article>`;
}
function addCharacterGoalRole(goalId, roleId) { const flow = ensureScriptFlow(); const goal = (flow.characterGoals || []).find(item => item.id === goalId); if (!goal || !flow.characters.some(role => role.id === roleId)) return; recordHistory(); goal.roleIds.push(roleId); characterGoalRolePickerId = ""; renderScriptFlow(); renderInspector(); scheduleSave(); }
function removeCharacterGoalRole(goalId, roleId) { const goal = (ensureScriptFlow().characterGoals || []).find(item => item.id === goalId); const index = goal?.roleIds.indexOf(roleId) ?? -1; if (!goal || index < 0) return; recordHistory(); goal.roleIds.splice(index, 1); renderScriptFlow(); renderInspector(); scheduleSave(); }
function addCharacterGoalEntry(goalId, kind) { const goal = (ensureScriptFlow().characterGoals || []).find(item => item.id === goalId); const key = kind === "core" ? "coreGoals" : "surfaceGoals"; if (!goal) return; recordHistory(); const entries = goal[key]; const position = Math.min(84, Math.max(18, entries.length ? 18 + entries.length * Math.max(12, 66 / entries.length) : 18)); entries.push({ id: uid(kind === "core" ? "core-goal" : "surface-goal"), text: "", position }); renderScriptFlow(); scheduleSave(); }
function updateCharacterGoalText(goalId, kind, entryId, value) { const goal = (ensureScriptFlow().characterGoals || []).find(item => item.id === goalId); const entry = goal?.[kind === "core" ? "coreGoals" : "surfaceGoals"]?.find(item => item.id === entryId); if (!entry) return; entry.text = value; scheduleSave(); }
function removeCharacterGoalEntry(goalId, kind, entryId) { const goal = (ensureScriptFlow().characterGoals || []).find(item => item.id === goalId); const key = kind === "core" ? "coreGoals" : "surfaceGoals"; if (!goal || !goal[key].some(item => item.id === entryId)) return; recordHistory(); goal[key] = goal[key].filter(item => item.id !== entryId); renderScriptFlow(); renderInspector(); scheduleSave(); }

function characterArcMarkup(arc, flow) {
  const selected = flow.selectedIds.includes(arc.id) ? " is-selected" : ""; const roles = arc.roleIds.map(id => flow.characters.find(role => role.id === id)).filter(Boolean); const stageOrder = ["origin", "event", "result"]; const canvasRoles = flow.characters;
  const chips = roles.length ? roles.map(role => `<span class="character-arc-role-chip ${role.gender}">${scriptAvatarHtml(role, true)}<strong>${escapeHtml(scriptCharacterLabel(role))}</strong><button type="button" class="character-arc-interactive script-interactive" data-character-arc-remove-role="${arc.id}" data-role-id="${role.id}" aria-label="移除 ${escapeHtml(scriptCharacterLabel(role))}">${icon("x")}</button></span>`).join("") : `<span class="character-arc-role-empty">选择画布中的角色</span>`;
  const pickerOpen = characterArcRolePickerId === arc.id;
  const picker = pickerOpen ? `<div class="character-arc-role-picker" role="menu">${canvasRoles.length ? canvasRoles.map(role => `<button type="button" class="character-arc-role-option ${role.gender} character-arc-interactive script-interactive" data-character-arc-pick-role="${arc.id}" data-role-id="${role.id}">${scriptAvatarHtml(role, true)}<span><strong>${escapeHtml(scriptCharacterLabel(role))}</strong><small>${escapeHtml(role.identity || (role.gender === "female" ? "女性角色" : "男性角色"))}</small></span></button>`).join("") : `<span class="character-arc-role-picker-empty">画布中还没有角色</span>`}</div>` : "";
  const cards = stageOrder.map(key => { const stage = arc.stages[key]; return `<section class="character-arc-stage"><span>${stage.label}</span><textarea class="character-arc-interactive script-interactive" data-character-arc-text="${arc.id}" data-stage-key="${key}" placeholder="输入${stage.label}">${escapeHtml(stage.text || "")}</textarea></section>`; }).join("");
  const points = stageOrder.map(key => { const stage = arc.stages[key]; return `<button type="button" class="character-arc-point character-arc-point-${key} character-arc-interactive script-interactive" data-character-arc-point="${arc.id}" data-stage-key="${key}" style="left:${stage.position}%" aria-label="拖动${stage.label}位置"><span></span><em>${key === "origin" ? "拥有" : key === "event" ? "转折" : "丢弃"}</em></button>`; }).join("");
  return `<article class="character-arc-card${selected}" data-character-arc="${arc.id}" style="left:${arc.x}px;top:${arc.y}px;width:${arc.width}px;height:${arc.height}px"><header><div><small>CHARACTER ARC</small><strong>角色转变</strong></div><span>${roles.length} 位关联角色</span></header><div class="character-arc-roles"><b>关联角色</b><div class="character-arc-role-list">${chips}</div><div class="character-arc-role-picker-wrap"><button type="button" class="character-arc-add-role character-arc-interactive script-interactive" data-character-arc-role-toggle="${arc.id}" aria-expanded="${pickerOpen}" aria-label="添加关联角色">${icon("plus")} 添加角色</button>${picker}</div></div><div class="character-arc-stages">${cards}</div><div class="character-arc-track" data-character-arc-track="${arc.id}"><span class="character-arc-line"></span>${points}</div><span class="character-arc-resize character-arc-interactive script-interactive" data-character-arc-resize="${arc.id}" aria-hidden="true"></span></article>`;
}
function updateCharacterArcStage(arcId, key, value) { const arc = ensureScriptFlow().characterArcs.find(item => item.id === arcId); if (!arc || !arc.stages[key]) return; arc.stages[key].text = value; scheduleSave(); }
function addCharacterArcRole(arcId, roleId) { const flow = ensureScriptFlow(); const arc = flow.characterArcs.find(item => item.id === arcId); if (!arc || !flow.characters.some(role => role.id === roleId)) return; recordHistory(); characterArcRolePickerId = ""; arc.roleIds.push(roleId); renderScriptFlow(); renderInspector(); scheduleSave(); }
function removeCharacterArcRole(arcId, roleId) { const arc = ensureScriptFlow().characterArcs.find(item => item.id === arcId); const index = arc?.roleIds.indexOf(roleId) ?? -1; if (!arc || index < 0) return; recordHistory(); arc.roleIds.splice(index, 1); renderScriptFlow(); renderInspector(); scheduleSave(); }function nextManagementPosition(roles) { const slots = Array.from({ length: 8 }, (_, index) => 8 + index * 12); const used = roles.map(role => Number(role.managementPosition)).filter(Number.isFinite); return slots.find(position => used.every(value => Math.abs(value - position) > 4)) ?? 92; }
function repairManagerRolePositions(flow) { const occupied = []; flow.characters.slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).forEach(role => { const current = Number(role.managementPosition); if (!Number.isFinite(current) || occupied.some(value => Math.abs(value - current) < 2)) role.managementPosition = nextManagementPosition(flow.characters.filter(item => item.id !== role.id && !occupied.includes(item.managementPosition))); occupied.push(role.managementPosition); }); }
function addScriptCharacter(roleTypeId) { if (!state) return; const flow = ensureScriptFlow(); const x = 360; const y = 180; recordHistory(); repairManagerRolePositions(flow); const role = createScriptCharacter(roleTypeId, x, y); role.managementPosition = nextManagementPosition(flow.characters); flow.characters.push(role); flow.selectedIds = [role.id]; flow.selectedEdgeId = null; renderWorkspace(); scheduleSave(); }
window.__image2CanvasAddScriptRole = roleTypeId => { const now = performance.now(); if (scriptRoleAddGuard.roleTypeId === roleTypeId && now - scriptRoleAddGuard.at < 250) return; scriptRoleAddGuard = { roleTypeId, at: now }; addScriptCharacter(roleTypeId); };
function scriptCharacterLabel(role) { return role.name || scriptRoleType(role).label; }
function storyCardLabel(card) { return card.title || "未命名情节"; }
function selectScriptItem(id, additive = false) { const flow = ensureScriptFlow(); if (!scriptItemById(flow, id)) return; flow.selectedIds = additive ? (flow.selectedIds.includes(id) ? flow.selectedIds.filter(item => item !== id) : [...flow.selectedIds, id]) : [id]; flow.selectedEdgeId = null; renderScriptFlow(); renderLibrary(); renderInspector(); scheduleSave(); }
function selectScriptCharacter(id, additive = false) { selectScriptItem(id, additive); }
function storyCardOrder(flow, id) { const link = (flow.emotionLinks || []).find(item => item.target === id); if (link) { const board = (flow.emotionBoards || []).find(item => item.id === link.source); return Math.max(1, emotionBoardCards(flow, board).findIndex(card => card.id === id) + 1); } const unlinked = (flow.storyCards || []).filter(card => !(flow.emotionLinks || []).some(item => item.target === card.id)).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); return Math.max(1, unlinked.findIndex(card => card.id === id) + 1); }
function storyCardNumber(flow, card) { const manual = String(card?.displayNumber || "").replace(/[^0-9]/g, "").slice(0, 4); return manual ? manual.padStart(2, "0") : String(Math.max(1, storyCardOrder(flow, card.id))).padStart(2, "0"); }function storyTypeControl(card) {
  const isCustom = card.storyTypeMode === "custom" || (card.storyType && !scriptStoryTypeOptions.includes(card.storyType));
  const pickerOpen = storyTypePickerId === card.id;
  const value = isCustom ? `<input data-story-field="${card.id}" data-story-key="storyType" value="${escapeHtml(card.storyType || "")}" placeholder="输入自定义类型" aria-label="自定义故事类型">` : `<span class="story-type-value">${escapeHtml(card.storyType || "选择类型")}</span>`;
  const picker = pickerOpen ? `<div class="story-type-picker" role="menu">${scriptStoryTypeOptions.map(type => `<button type="button" data-story-type-pick="${card.id}" data-story-type-value="${escapeHtml(type)}">${escapeHtml(type)}</button>`).join("")}<button type="button" class="is-custom" data-story-type-custom="${card.id}">自定义</button></div>` : "";
  return `<span class="story-type-control${isCustom ? " is-custom" : ""}">${value}<button type="button" class="script-interactive" data-story-type-toggle="${card.id}" aria-expanded="${pickerOpen}" aria-label="选择故事类型" title="选择故事类型">${icon("list")}</button>${picker}</span>`;
}
function renderStoryCard(card, flow) { const selected = flow.selectedIds.includes(card.id) ? " is-selected" : ""; const number = storyCardNumber(flow, card); const pickerOpen = storyTypePickerId === card.id; return `<article class="script-story-card${selected}${pickerOpen ? " has-open-type-picker" : ""}" data-story-card="${card.id}" style="left:${card.x}px;top:${card.y}px;width:${card.width}px;height:${card.height}px" aria-label="故事卡 ${number} ${escapeHtml(storyCardLabel(card))}"><div class="story-card-header"><input class="story-card-number" data-story-number="${card.id}" value="${number}" inputmode="numeric" maxlength="4" aria-label="故事卡编号"><button class="story-dialog-trigger" data-story-dialog-open="${card.id}" type="button" aria-label="双击打开对话脚本">故事卡</button></div><label class="story-card-title story-card-field"><input data-story-field="${card.id}" data-story-key="title" value="${escapeHtml(card.title || "")}" placeholder="情节标题" aria-label="情节标题"></label><div class="story-card-fields"><label class="story-card-field"><span>时间</span><input data-story-field="${card.id}" data-story-key="time" value="${escapeHtml(card.time || "")}" placeholder="如：清晨"></label><label class="story-card-field"><span>地点</span><input data-story-field="${card.id}" data-story-key="location" value="${escapeHtml(card.location || "")}" placeholder="如：海岸小镇"></label><label class="story-card-field"><span>人物</span><input data-story-field="${card.id}" data-story-key="characters" value="${escapeHtml(card.characters || "")}" placeholder="如：林远、舒晴"></label><label class="story-card-field"><span>目标</span><input data-story-field="${card.id}" data-story-key="goal" value="${escapeHtml(card.goal || "")}" placeholder="本段推动什么"></label><label class="story-card-field"><span>阻力</span><input data-story-field="${card.id}" data-story-key="mood" value="${escapeHtml(card.mood || "")}" placeholder="如：紧张、舒缓"></label><label class="story-card-field"><span>局面初</span><input data-story-field="${card.id}" data-story-key="initialSituation" value="${escapeHtml(card.initialSituation || "")}" placeholder="初始局面"></label><label class="story-card-field"><span>局面末</span><input data-story-field="${card.id}" data-story-key="finalSituation" value="${escapeHtml(card.finalSituation || "")}" placeholder="结束局面"></label><label class="story-card-field story-type-field"><span>类型</span>${storyTypeControl(card)}</label></div><label class="story-card-content story-card-field"><span>场景大纲</span><textarea class="script-interactive" data-story-field="${card.id}" data-story-key="content" placeholder="记录场景大纲…" aria-label="场景大纲">${escapeHtml(card.content || "")}</textarea></label><span class="story-card-resize" data-story-resize="${card.id}" aria-hidden="true"></span></article>`; }
function dialogueCard() { if (!dialogueEditor || !state) return null; return ensureScriptFlow().storyCards.find(card => card.id === dialogueEditor.cardId) || null; }
function dialogueDraftSnapshot() {
  if (!dialogueEditor) return null;
  return structuredClone({ roleId: dialogueEditor.roleId, analysisRoleId: dialogueEditor.analysisRoleId, analysis: dialogueEditor.analysis || {}, analysisHiddenRoles: dialogueEditor.analysisHiddenRoles || [], entries: dialogueEditor.entries || [] });
}
function restoreDialogueDraft(snapshot) {
  if (!dialogueEditor || !snapshot) return;
  dialogueEditor.roleId = snapshot.roleId || dialogueEditor.roleId;
  dialogueEditor.analysisRoleId = snapshot.analysisRoleId || "";
  dialogueEditor.analysis = structuredClone(snapshot.analysis || {});
  dialogueEditor.analysisHiddenRoles = structuredClone(snapshot.analysisHiddenRoles || []);
  dialogueEditor.entries = structuredClone(snapshot.entries || []);
  renderDialogueEditor();
}
function recordDialogueDraftHistory(before = dialogueDraftSnapshot()) {
  if (!before) return;
  dialogueDraftUndoStack.push(before); if (dialogueDraftUndoStack.length > 30) dialogueDraftUndoStack.shift(); dialogueDraftRedoStack = [];
}
function undoDialogueDraft() {
  if (!dialogueEditor || !dialogueDraftUndoStack.length) return false;
  dialogueDraftRedoStack.push(dialogueDraftSnapshot()); restoreDialogueDraft(dialogueDraftUndoStack.pop()); return true;
}
function redoDialogueDraft() {
  if (!dialogueEditor || !dialogueDraftRedoStack.length) return false;
  dialogueDraftUndoStack.push(dialogueDraftSnapshot()); restoreDialogueDraft(dialogueDraftRedoStack.pop()); return true;
}
function dialogueEditableHistoryTarget(target) { return Boolean(dialogueEditor && target instanceof Element && target.closest("#dialogueScriptDialog") && target.matches("input, textarea, select")); }
function beginDialogueEditableHistory(target) {
  if (!dialogueEditableHistoryTarget(target) || dialogueEditableHistorySessions.has(target)) return;
  dialogueEditableHistorySessions.set(target, { before: dialogueDraftSnapshot(), changed: false, timer: null });
}
function commitDialogueEditableHistory(target) {
  const session = dialogueEditableHistorySessions.get(target); if (!session) return;
  if (session.timer) clearTimeout(session.timer); dialogueEditableHistorySessions.delete(target);
  if (!session.changed || JSON.stringify(session.before) === JSON.stringify(dialogueDraftSnapshot())) return;
  recordDialogueDraftHistory(session.before);
}
function scheduleDialogueEditableHistory(target) {
  beginDialogueEditableHistory(target); const session = dialogueEditableHistorySessions.get(target); if (!session) return;
  session.changed = true; if (session.timer) clearTimeout(session.timer);
  session.timer = setTimeout(() => commitDialogueEditableHistory(target), 700);
}
function discardDialogueEditableHistory(target) {
  const session = dialogueEditableHistorySessions.get(target); if (session?.timer) clearTimeout(session.timer); dialogueEditableHistorySessions.delete(target);
}function dialogueEntryHtml(entry, roles, side = "left") {
  if (entry.type === "speech") {
    const role = roles.find(item => item.id === entry.roleId); const name = role ? scriptCharacterLabel(role) : "已移除角色";
    const avatar = role ? `<div class="dialogue-message-avatar" data-dialogue-delete="${entry.id}" title="右键删除这句台词">${scriptAvatarHtml(role, true)}</div>` : `<span class="dialogue-missing-avatar" data-dialogue-delete="${entry.id}">${icon("user-round")}</span>`;
    return `<article class="dialogue-message is-${side}" data-dialogue-item="${entry.id}" data-dialogue-draggable="${entry.id}" draggable="true">${avatar}<div><div class="dialogue-message-meta"><strong>${escapeHtml(name)}</strong><button class="dialogue-message-drag" type="button" tabindex="-1" aria-label="拖动${escapeHtml(name)}的台词调整位置" title="拖动调整位置">${icon("grip-vertical")}</button></div><textarea class="dialogue-speech-content" data-dialogue-entry="${entry.id}" aria-label="${escapeHtml(name)}的台词">${escapeHtml(entry.content)}</textarea></div></article>`;
  }
  const marker = entry.type === "action" ? { icon: "box", title: "动作", placeholder: "描述角色动作…" } : { icon: "book-open", title: "旁白", placeholder: "输入旁白内容…" };
  return `<article class="dialogue-marker ${entry.type}" data-dialogue-item="${entry.id}" data-dialogue-draggable="${entry.id}" data-dialogue-delete="${entry.id}" draggable="true"><button class="dialogue-marker-drag" type="button" tabindex="-1" aria-label="拖动${marker.title}调整位置" title="拖动调整位置">${icon("grip-vertical")}</button><span>${icon(marker.icon)}</span><strong>${marker.title}</strong><textarea data-dialogue-entry="${entry.id}" placeholder="${marker.placeholder}" aria-label="${marker.title}内容">${escapeHtml(entry.content)}</textarea></article>`;
}
function dialogueAnalysisRoles(roles) {
  if (!dialogueEditor) return [];
  const roleIds = new Set(dialogueEditor.entries.filter(entry => entry.type === "speech" && entry.roleId).map(entry => entry.roleId));
  if (dialogueEditor.roleId) roleIds.add(dialogueEditor.roleId);
  const hiddenRoleIds = new Set(dialogueEditor.analysisHiddenRoles || []);
  return roles.filter(role => roleIds.has(role.id) && !hiddenRoleIds.has(role.id));
}
function ensureDialogueAnalysis(roleId) {
  if (!dialogueEditor || !roleId) return {};
  dialogueEditor.analysis ||= {};
  dialogueEditor.analysis[roleId] ||= {};
  return dialogueEditor.analysis[roleId];
}
function renderDialogueAnalysis(roles) {
  const tabs = $("#dialogueAnalysisTabs"); const content = $("#dialogueAnalysisContent");
  if (!tabs || !content || !dialogueEditor) return;
  const participantRoles = dialogueAnalysisRoles(roles);
  if (!participantRoles.some(role => role.id === dialogueEditor.analysisRoleId)) dialogueEditor.analysisRoleId = participantRoles[0]?.id || "";
  if (!participantRoles.length) {
    tabs.innerHTML = "";
    content.innerHTML = `<div class="dialogue-analysis-empty">${icon("users-round")}<strong>选择说话角色</strong><span>开始编写台词后，可在这里记录角色在当前故事卡中的人物变化。</span></div>`;
    refreshIcons();
    return;
  }
  const activeRole = participantRoles.find(role => role.id === dialogueEditor.analysisRoleId) || participantRoles[0];
  const analysis = ensureDialogueAnalysis(activeRole.id);
  tabs.innerHTML = participantRoles.map(role => `<button class="dialogue-analysis-role${role.id === activeRole.id ? " is-active" : ""}" data-dialogue-analysis-role="${role.id}" type="button">${scriptAvatarHtml(role, true)}<span>${escapeHtml(scriptCharacterLabel(role))}</span></button>`).join("");
  content.innerHTML = `<section class="dialogue-analysis-card"><div class="dialogue-analysis-role-head">${scriptAvatarHtml(activeRole, true)}<div><strong>${escapeHtml(scriptCharacterLabel(activeRole))}</strong><span>${escapeHtml(activeRole.identity || "当前说话角色")}</span></div></div><div class="dialogue-analysis-fields">${dialogueAnalysisFields.map(field => `<label><span>${field.label}</span><textarea data-dialogue-analysis-field="${field.key}" placeholder="${field.placeholder}" aria-label="${escapeHtml(scriptCharacterLabel(activeRole))}的${field.label}">${escapeHtml(analysis[field.key] || "")}</textarea></label>`).join("")}</div></section>`;
  $$('[data-dialogue-analysis-role]').forEach(button => { button.addEventListener("click", () => { dialogueEditor.analysisRoleId = button.dataset.dialogueAnalysisRole; renderDialogueAnalysis(roles); }); button.addEventListener("contextmenu", event => openDialogueAnalysisMenu(event, button.dataset.dialogueAnalysisRole)); });
  $$('[data-dialogue-analysis-field]').forEach(input => input.addEventListener("input", event => { ensureDialogueAnalysis(dialogueEditor.analysisRoleId)[event.target.dataset.dialogueAnalysisField] = event.target.value; }));
  refreshIcons();
}
function renderDialogueEditor() {
  if (!dialogueEditor) return;
  const card = dialogueCard(); if (!card) return closeStoryDialogue();
  const roles = ensureScriptFlow().characters;
  if (!roles.some(role => role.id === dialogueEditor.roleId)) dialogueEditor.roleId = roles[0]?.id || "";
  $("#dialogueCardLabel").textContent = `故事卡 ${storyCardNumber(ensureScriptFlow(), card)} · ${storyCardLabel(card)}`;
  const selectedRole = roles.find(role => role.id === dialogueEditor.roleId);
  $("#dialogueRolePreview").innerHTML = selectedRole ? `${scriptAvatarHtml(selectedRole, true)}<strong>${escapeHtml(scriptCharacterLabel(selectedRole))}</strong>` : `<span class="dialogue-missing-avatar">${icon("user-round")}</span><strong>请先添加角色</strong>`;
  $("#dialogueRoleSelect").innerHTML = roles.length ? roles.map(role => `<option value="${role.id}"${role.id === dialogueEditor.roleId ? " selected" : ""}>${escapeHtml(scriptCharacterLabel(role))}</option>`).join("") : `<option value="">当前画布没有角色</option>`;
  $("#dialogueRoleSelect").disabled = !roles.length;
  $("#addDialogueSpeechButton").disabled = !roles.length;
  renderDialogueAnalysis(roles);
  const roleSides = new Map(); let previousSide = "right";
  const thread = dialogueEditor.entries.map(entry => {
    if (entry.type !== "speech") return dialogueEntryHtml(entry, roles);
    let side = roleSides.get(entry.roleId);
    if (!side) { side = previousSide === "left" ? "right" : "left"; roleSides.set(entry.roleId, side); }
    previousSide = side;
    return dialogueEntryHtml(entry, roles, side);
  }).join("");
  $("#dialogueThread").innerHTML = dialogueEditor.entries.length ? thread : `<div class="dialogue-empty">${icon("messages-square")}<strong>从第一句台词开始</strong><span>选择角色后输入台词，或在右上添加动作、旁白。</span></div>`;
  $$('[data-dialogue-entry]').forEach(input => input.addEventListener("input", event => { const entry = dialogueEditor?.entries.find(item => item.id === event.target.dataset.dialogueEntry); if (entry) entry.content = event.target.value; }));
  $$('[data-dialogue-delete]').forEach(avatar => avatar.addEventListener("contextmenu", event => openDialogueEntryMenu(event, avatar.dataset.dialogueDelete)));
  $$('[data-dialogue-draggable]').forEach(item => { item.addEventListener("dragstart", startDialogueMarkerDrag); item.addEventListener("dragend", endDialogueMarkerDrag); });
  $$('[data-dialogue-item]').forEach(item => { item.addEventListener("dragover", previewDialogueMarkerDrop); item.addEventListener("dragleave", clearDialogueMarkerDropPreview); item.addEventListener("drop", dropDialogueMarker); });
  refreshIcons();
}
function clearDialogueMarkerDropPreview() { $$('[data-dialogue-item]').forEach(item => item.classList.remove("is-dialogue-drop-before", "is-dialogue-drop-after")); }
function startDialogueMarkerDrag(event) {
  dialogueMarkerDragId = event.currentTarget.dataset.dialogueDraggable || "";
  if (!dialogueMarkerDragId) return;
  event.dataTransfer?.setData("text/plain", dialogueMarkerDragId);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  event.currentTarget.classList.add("is-dialogue-dragging");
}
function endDialogueMarkerDrag(event) { event.currentTarget.classList.remove("is-dialogue-dragging"); dialogueMarkerDragId = ""; clearDialogueMarkerDropPreview(); }
function previewDialogueMarkerDrop(event) {
  if (!dialogueMarkerDragId || event.currentTarget.dataset.dialogueItem === dialogueMarkerDragId) return;
  event.preventDefault(); clearDialogueMarkerDropPreview();
  const box = event.currentTarget.getBoundingClientRect(); event.currentTarget.classList.add(event.clientY > box.top + box.height / 2 ? "is-dialogue-drop-after" : "is-dialogue-drop-before");
}
function dropDialogueMarker(event) {
  if (!dialogueEditor || !dialogueMarkerDragId) return;
  event.preventDefault(); const targetId = event.currentTarget.dataset.dialogueItem; const sourceIndex = dialogueEditor.entries.findIndex(entry => entry.id === dialogueMarkerDragId); let targetIndex = dialogueEditor.entries.findIndex(entry => entry.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) { dialogueMarkerDragId = ""; clearDialogueMarkerDropPreview(); return; }
  const box = event.currentTarget.getBoundingClientRect(); const after = event.clientY > box.top + box.height / 2; recordDialogueDraftHistory(); const [entry] = dialogueEditor.entries.splice(sourceIndex, 1); if (sourceIndex < targetIndex) targetIndex -= 1; if (after) targetIndex += 1; dialogueEditor.entries.splice(targetIndex, 0, entry);
  dialogueMarkerDragId = ""; clearDialogueMarkerDropPreview(); renderDialogueEditor();
}
function applyDialoguePanelLayout() {
  const margin = 14; const maxWidth = Math.max(360, window.innerWidth - margin * 2); const maxHeight = Math.max(340, window.innerHeight - margin * 2);
  dialoguePanelLayout.width = Math.min(Math.max(520, dialoguePanelLayout.width), maxWidth);
  dialoguePanelLayout.height = Math.min(Math.max(440, dialoguePanelLayout.height), maxHeight);
  dialoguePanelLayout.x = Math.min(Math.max(margin, dialoguePanelLayout.x), Math.max(margin, window.innerWidth - dialoguePanelLayout.width - margin));
  dialoguePanelLayout.y = Math.min(Math.max(margin, dialoguePanelLayout.y), Math.max(margin, window.innerHeight - dialoguePanelLayout.height - margin));
  Object.assign(dialogueScriptDialog.style, { left: `${dialoguePanelLayout.x}px`, top: `${dialoguePanelLayout.y}px`, width: `${dialoguePanelLayout.width}px`, height: `${dialoguePanelLayout.height}px` });
  applyDialogueAnalysisLayout();
}
function applyDialogueAnalysisLayout() {
  const body = $("#dialogueScriptBody"); if (!body) return;
  const maxWidth = Math.max(210, dialoguePanelLayout.width - 390);
  dialogueAnalysisLayout.width = Math.min(Math.max(210, dialogueAnalysisLayout.width), maxWidth);
  body.style.setProperty("--dialogue-analysis-width", `${dialogueAnalysisLayout.width}px`);
}
function updateDialogueFullscreenButton() {
  const button = $("#toggleDialogueFullscreenButton"); if (!button) return;
  const label = dialoguePanelIsMaximized ? "退出全屏编辑" : "全屏编辑";
  button.setAttribute("aria-label", label); button.title = label;
  button.innerHTML = icon(dialoguePanelIsMaximized ? "minimize-2" : "maximize-2"); refreshIcons();
}
function toggleDialogueFullscreen() {
  if (!dialogueEditor) return;
  dialoguePanelIsMaximized = !dialoguePanelIsMaximized;
  dialogueScriptDialog.classList.toggle("is-dialogue-fullscreen", dialoguePanelIsMaximized);
  updateDialogueFullscreenButton(); requestAnimationFrame(applyDialogueAnalysisLayout);
}function openStoryDialogue(cardId) {
  const card = ensureScriptFlow().storyCards.find(item => item.id === cardId); if (!card) return;
  dialoguePanelIsMaximized = false; dialogueDraftUndoStack = []; dialogueDraftRedoStack = []; dialogueScriptDialog.classList.remove("is-dialogue-fullscreen");
  dialogueEditor = { cardId, roleId: ensureScriptFlow().characters[0]?.id || "", analysisRoleId: ensureScriptFlow().characters[0]?.id || "", analysis: structuredClone(card.dialogueAnalysis || {}), analysisHiddenRoles: structuredClone(card.dialogueAnalysisHiddenRoles || []), entries: structuredClone(card.dialogue || []) };
  renderDialogueEditor(); if (!dialogueScriptDialog.open) dialogueScriptDialog.show(); requestAnimationFrame(() => { applyDialoguePanelLayout(); updateDialogueFullscreenButton(); });
}
function closeStoryDialogue() { closeDialogueEntryMenu(); closeDialogueAnalysisMenu(); dialoguePanelIsMaximized = false; dialogueDraftUndoStack = []; dialogueDraftRedoStack = []; dialogueScriptDialog.classList.remove("is-dialogue-fullscreen"); dialogueEditor = null; updateDialogueFullscreenButton(); if (dialogueScriptDialog.open) dialogueScriptDialog.close(); }
function openDialogueAnalysisMenu(event, roleId) {
  event.preventDefault(); event.stopPropagation(); dialogueAnalysisMenuRoleId = roleId;
  const menu = $("#dialogueAnalysisMenu"); menu.hidden = false;
  const width = 174; const height = 38; menu.style.left = `${Math.min(event.clientX, window.innerWidth - width - 12)}px`; menu.style.top = `${Math.min(event.clientY, window.innerHeight - height - 12)}px`;
}
function closeDialogueAnalysisMenu() { dialogueAnalysisMenuRoleId = ""; $("#dialogueAnalysisMenu").hidden = true; }
function deleteDialogueAnalysisRole() {
  if (!dialogueEditor || !dialogueAnalysisMenuRoleId) return closeDialogueAnalysisMenu();
  recordDialogueDraftHistory(); dialogueEditor.analysisHiddenRoles = [...new Set([...(dialogueEditor.analysisHiddenRoles || []), dialogueAnalysisMenuRoleId])];
  if (dialogueEditor.analysisRoleId === dialogueAnalysisMenuRoleId) dialogueEditor.analysisRoleId = "";
  closeDialogueAnalysisMenu(); renderDialogueAnalysis(ensureScriptFlow().characters);
}
function openDialogueEntryMenu(event, entryId) {
  event.preventDefault(); event.stopPropagation(); dialogueMenuEntryId = entryId;
  const menu = $("#dialogueEntryMenu"); menu.hidden = false;
  const width = 152; const height = 38; menu.style.left = `${Math.min(event.clientX, window.innerWidth - width - 12)}px`; menu.style.top = `${Math.min(event.clientY, window.innerHeight - height - 12)}px`;
}
function closeDialogueEntryMenu() { dialogueMenuEntryId = ""; $("#dialogueEntryMenu").hidden = true; }
function deleteDialogueEntry() {
  if (!dialogueEditor || !dialogueMenuEntryId) return closeDialogueEntryMenu();
  recordDialogueDraftHistory(); dialogueEditor.entries = dialogueEditor.entries.filter(entry => entry.id !== dialogueMenuEntryId); closeDialogueEntryMenu(); renderDialogueEditor();
}
function startDialoguePanelGesture(event, mode) {
  if (!dialogueEditor || dialoguePanelIsMaximized || (mode === "drag" && event.target.closest("button, select, input, textarea"))) return;
  event.preventDefault(); event.stopPropagation();
  dialoguePanelSession = { mode, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: { ...dialoguePanelLayout } };
  try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* Synthetic pointers do not own capture. */ }
}
function startDialogueAnalysisResize(event) {
  if (!dialogueEditor) return;
  event.preventDefault(); event.stopPropagation();
  dialoguePanelSession = { mode: "analysis", pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: { width: dialogueAnalysisLayout.width } };
  try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* Synthetic pointers do not own capture. */ }
}
function moveDialoguePanelGesture(event) {
  if (!dialoguePanelSession || event.pointerId !== dialoguePanelSession.pointerId) return;
  const session = dialoguePanelSession; const dx = event.clientX - session.startX; const dy = event.clientY - session.startY;
  if (session.mode === "drag") { dialoguePanelLayout.x = session.origin.x + dx; dialoguePanelLayout.y = session.origin.y + dy; applyDialoguePanelLayout(); }
  else if (session.mode === "analysis") { dialogueAnalysisLayout.width = session.origin.width - dx; applyDialogueAnalysisLayout(); }
  else { dialoguePanelLayout.width = session.origin.width + dx; dialoguePanelLayout.height = session.origin.height + dy; applyDialoguePanelLayout(); }
}
function endDialoguePanelGesture(event) { if (!dialoguePanelSession || event.pointerId !== dialoguePanelSession.pointerId) return; dialoguePanelSession = null; }
function addDialogueSpeech() {
  const text = $("#dialogueSpeechInput").value.trim(); if (!text || !dialogueEditor?.roleId) return;
  recordDialogueDraftHistory(); dialogueEditor.entries.push({ id: uid("dialogue"), type: "speech", roleId: dialogueEditor.roleId, content: text });
  $("#dialogueSpeechInput").value = ""; renderDialogueEditor(); requestAnimationFrame(() => { const thread = $("#dialogueThread"); thread.scrollTop = thread.scrollHeight; $("#dialogueSpeechInput").focus(); });
}
function addDialogueMarker(type) {
  if (!dialogueEditor || !["action", "narration"].includes(type)) return;
  recordDialogueDraftHistory(); const entry = { id: uid("dialogue"), type, roleId: "", content: "" }; dialogueEditor.entries.push(entry); renderDialogueEditor();
  requestAnimationFrame(() => { const input = $(`[data-dialogue-entry="${CSS.escape(entry.id)}"]`); input?.focus(); input?.scrollIntoView({ block: "nearest" }); });
}
function saveStoryDialogue() {
  const card = dialogueCard(); if (!card || !dialogueEditor) return;
  recordHistory(); card.dialogue = structuredClone(dialogueEditor.entries); card.dialogueAnalysis = structuredClone(dialogueEditor.analysis || {}); card.dialogueAnalysisHiddenRoles = structuredClone(dialogueEditor.analysisHiddenRoles || []); dialogueDraftUndoStack = []; dialogueDraftRedoStack = []; scheduleSave(); renderScriptFlow(); toast("已保存当前编辑，可继续编辑");
}
function dialogueDownloadName(value = "") { return String(value || "对话脚本").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim() || "对话脚本"; }
function downloadDialogueText() {
  const card = dialogueCard(); if (!card || !dialogueEditor) return;
  const flow = ensureScriptFlow(); const order = storyCardNumber(flow, card);
  const cardTitle = `故事卡 ${order} · ${storyCardLabel(card)}`;
  const roles = flow.characters;
  const entries = dialogueEditor.entries.map(entry => {
    if (entry.type === "speech") { const role = roles.find(item => item.id === entry.roleId); return `${role ? scriptCharacterLabel(role) : "已移除角色"}：${entry.content || ""}`; }
    return `${entry.type === "action" ? "【动作】" : "【旁白】"}${entry.content || ""}`;
  });
  const content = [`项目：${state?.projectName || "造像台"}`, cardTitle, "", ...entries].join("\r\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${dialogueDownloadName(`${state?.projectName || "项目"}-${cardTitle}`)}.txt`; anchor.hidden = true;
  document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast("对话文本已下载");
}function emotionBoardMarkup(flow, board) {
  const cards = emotionBoardCards(flow, board); syncEmotionLevels(flow); const pad = { left: 48, right: 28, top: 76, bottom: 42 }; const plotWidth = Math.max(1, board.width - pad.left - pad.right); const plotHeight = Math.max(1, board.height - pad.top - pad.bottom); const pointAt = (card, index) => ({ x: pad.left + (cards.length < 2 ? plotWidth / 2 : index * plotWidth / (cards.length - 1)), y: pad.top + (1 - board.levels[card.id]) * plotHeight }); const points = cards.map(pointAt); const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" "); const grid = [0, .5, 1].map(level => `<line x1="${pad.left}" x2="${board.width - pad.right}" y1="${pad.top + (1 - level) * plotHeight}" y2="${pad.top + (1 - level) * plotHeight}"></line>`).join(""); const empty = cards.length ? "" : `<text class="emotion-empty" x="${board.width / 2}" y="${board.height / 2 + 8}" text-anchor="middle">从卡片外沿拖线连接故事卡</text>`; return `<article class="script-emotion-board${flow.selectedIds.includes(board.id) ? " is-selected" : ""}" data-emotion-board="${board.id}" style="left:${board.x}px;top:${board.y}px;width:${board.width}px;height:${board.height}px"><header data-emotion-drag="${board.id}"><strong>情绪曲线</strong><span>${cards.length} 个已关联故事卡</span></header><svg viewBox="0 0 ${board.width} ${board.height}" aria-label="情绪曲线图"><g class="emotion-grid">${grid}</g><text x="8" y="${pad.top + 4}">高涨</text><text x="8" y="${pad.top + plotHeight / 2 + 4}">中性</text><text x="8" y="${pad.top + plotHeight}">低落</text>${empty}${points.length ? `<path class="emotion-line" d="${path}"></path>` : ""}${cards.map((card, index) => { const point = points[index]; return `<g class="emotion-point-group"><circle class="emotion-point" data-emotion-point="${card.id}" data-emotion-board-id="${board.id}" cx="${point.x}" cy="${point.y}" r="6"></circle><text x="${point.x}" y="${board.height - 16}" text-anchor="middle">${storyCardNumber(flow, card)}</text></g>`; }).join("")}</svg><span class="emotion-board-resize" data-emotion-resize="${board.id}" aria-hidden="true"></span></article>`;
}
function createCharacterManagerInput(value, placeholder, className, onInput) {
  const input = document.createElement("input"); input.className = className; input.value = value || ""; input.placeholder = placeholder; input.addEventListener("pointerdown", event => event.stopPropagation()); input.addEventListener("input", onInput); input.addEventListener("change", onInput); input.addEventListener("blur", onInput); return input;
}
function updateEmotionBoardLabel(boardId, cardId, value) {
  const board = (ensureScriptFlow().emotionBoards || []).find(item => item.id === boardId); if (!board) return;
  if (!board.labels) board.labels = {}; board.labels[cardId] = value; scheduleSave();
}
function renderEmotionBoardLabels(flow) {
  (flow.emotionBoards || []).forEach(board => {
    const boardElement = scriptNodeLayer.querySelector('[data-emotion-board="' + CSS.escape(board.id) + '"]'); if (!boardElement) return;
    const cards = emotionBoardCards(flow, board); const left = 48; const right = 28; const top = 76; const bottom = 42; const plotWidth = Math.max(1, board.width - left - right); const plotHeight = Math.max(1, board.height - top - bottom);
    cards.forEach((card, index) => {
      const x = left + (cards.length < 2 ? plotWidth / 2 : index * plotWidth / (cards.length - 1)); const y = top + (1 - board.levels[card.id]) * plotHeight;
      const label = document.createElement("div"); label.className = "emotion-point-label"; label.dataset.emotionLabel = card.id; label.dataset.emotionBoardId = board.id; label.contentEditable = "true"; label.spellcheck = false; label.textContent = board.labels?.[card.id] || ""; label.style.left = Math.max(12, Math.min(board.width - 116, Math.round(x - 52))) + "px"; label.style.top = Math.max(84, Math.round(y - 66)) + "px"; label.setAttribute("aria-label", "编辑情绪点剧情标记");
      label.addEventListener("pointerdown", event => event.stopPropagation()); label.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); label.blur(); } }); label.addEventListener("input", event => updateEmotionBoardLabel(board.id, card.id, event.currentTarget.innerText.replace(/\r?\n/g, " ").trim())); label.addEventListener("blur", event => updateEmotionBoardLabel(board.id, card.id, event.currentTarget.innerText.replace(/\r?\n/g, " ").trim())); boardElement.append(label);
    });
  });
}
function applyFloatingPanelBox(element, panel) { element.style.left = panel.x + "px"; element.style.top = panel.y + "px"; element.style.width = panel.width + "px"; element.style.height = panel.height + "px"; }
function toggleCharacterManager() {
  const flow = ensureScriptFlow(); const panel = flow.characterManager;
  if (!panel.visible) { const rect = scriptFlowStage.getBoundingClientRect(); const center = scriptPoint(rect.left + rect.width / 2, rect.top + rect.height * .42); panel.x = Math.round(center.x - panel.width / 2); panel.y = Math.round(center.y - panel.height / 2); }
  panel.visible = !panel.visible; renderScriptFlow(); renderLibrary(); scheduleSave();
}
function openCharacterNotes(roleId) { const flow = ensureScriptFlow(); if (!flow.characters.some(role => role.id === roleId)) return; const wasVisible = flow.characterNotes.visible; flow.characterNotes.roleId = roleId; flow.characterNotes.visible = true; if (!wasVisible) { flow.characterNotes.x = flow.characterManager.x + flow.characterManager.width + 24; flow.characterNotes.y = flow.characterManager.y + 40; } renderScriptFlow(); scheduleSave(); }
function summonCharacterFunction(roleId) { const flow = ensureScriptFlow(); const role = flow.characters.find(item => item.id === roleId); if (!role) return; const manager = flow.characterManager; if (!manager.visible) { const rect = scriptFlowStage.getBoundingClientRect(); const center = scriptPoint(rect.left + rect.width / 2, rect.top + rect.height * .58); manager.x = Math.round(center.x - manager.width / 2); manager.y = Math.round(center.y - manager.height / 2); } manager.visible = true; const notes = flow.characterNotes; notes.roleId = role.id; notes.visible = true; notes.x = Math.round(manager.x + manager.width * (Math.min(96, Math.max(4, Number(role.managementPosition) || 50)) / 100) - notes.width / 2); notes.y = Math.round(manager.y - notes.height - 22); renderScriptFlow(); renderLibrary(); renderInspector(); scheduleSave(); }
function closeCharacterNotes() { ensureScriptFlow().characterNotes.visible = false; renderScriptFlow(); scheduleSave(); }
function applyManagerSegmentPlacement(element, position) {
  if (!element) return; const value = Math.min(100, Math.max(0, Number(position) || 0)); element.style.left = value + "%"; element.classList.toggle("is-edge-start", value <= .1); element.classList.toggle("is-edge-end", value >= 99.9);
}
function arrangeCharacterManagerSegments(manager, activeId, position, timelineWidth) {
  const active = manager.paragraphs.find(item => item.id === activeId); if (!active) return manager.paragraphs;
  active.position = Math.min(100, Math.max(0, position)); const gap = Math.max(16, 182 / Math.max(1, timelineWidth) * 100); const ordered = manager.paragraphs.slice().sort((a, b) => a.position - b.position);
  ordered.forEach((item, index) => { if (!index) { item.position = Math.max(0, item.position); return; } const previous = ordered[index - 1]; if (item.position - previous.position < gap) item.position = Math.min(100, previous.position + gap); });
  for (let index = ordered.length - 2; index >= 0; index -= 1) { const next = ordered[index + 1]; if (next.position - ordered[index].position < gap) ordered[index].position = Math.max(0, next.position - gap); }
  manager.paragraphs = ordered; return ordered;
}
function addCharacterManagerSegment() { const flow = ensureScriptFlow(); const manager = flow.characterManager; const index = manager.paragraphs.length; recordHistory(); manager.paragraphs.push({ id: uid("segment"), title: "段落 " + (index + 1), content: "", position: index * 20 }); renderScriptFlow(); scheduleSave(); }
function removeCharacterManagerSegment(id) { const manager = ensureScriptFlow().characterManager; if (!manager.paragraphs.some(item => item.id === id)) return; recordHistory(); manager.paragraphs = manager.paragraphs.filter(item => item.id !== id); closeManagerSegmentMenu(); renderScriptFlow(); scheduleSave(); }
function openManagerSegmentMenu(event, id) {
  event.preventDefault(); event.stopPropagation(); managerSegmentMenuId = id; let menu = document.getElementById("managerSegmentMenu");
  if (!menu) { menu = document.createElement("div"); menu.id = "managerSegmentMenu"; menu.className = "manager-segment-menu"; menu.hidden = true; const button = document.createElement("button"); button.type = "button"; button.textContent = "删除段落"; button.addEventListener("pointerdown", menuEvent => { menuEvent.preventDefault(); menuEvent.stopPropagation(); if (managerSegmentMenuId) removeCharacterManagerSegment(managerSegmentMenuId); }); menu.append(button); document.body.append(menu); }
  menu.hidden = false; menu.style.left = Math.min(event.clientX, window.innerWidth - 132) + "px"; menu.style.top = Math.min(event.clientY, window.innerHeight - 44) + "px";
}
function closeManagerSegmentMenu() { managerSegmentMenuId = ""; const menu = document.getElementById("managerSegmentMenu"); if (menu) menu.hidden = true; }
function renderCharacterManagementPanels(flow) {
  scriptNodeLayer.querySelectorAll(".character-manager-panel, .character-notes-panel").forEach(element => element.remove());
  const manager = flow.characterManager;
  if (manager.visible) {
    const panel = document.createElement("section"); panel.className = "character-manager-panel"; panel.dataset.characterManagerPanel = "true"; panel.setAttribute("aria-label", "角色管理"); applyFloatingPanelBox(panel, manager);
    const heading = document.createElement("header"); heading.className = "character-manager-heading"; heading.dataset.characterManagerDrag = "true";
    const headingCopy = document.createElement("div"); const eyebrow = document.createElement("span"); eyebrow.className = "eyebrow"; eyebrow.textContent = "CHARACTER MAP"; const title = document.createElement("strong"); title.textContent = "角色管理"; headingCopy.append(eyebrow, title);
    const count = document.createElement("span"); count.textContent = flow.characters.filter(role => flow.relationships.some(link => link.source === role.id || link.target === role.id)).length + " 个已连线角色"; heading.append(headingCopy, count); heading.addEventListener("pointerdown", event => startScriptFloatingPanel(event, "manager", "move")); panel.append(heading);
    const acts = document.createElement("section"); acts.className = "character-manager-acts"; acts.dataset.characterManagerActs = "true"; acts.style.gridTemplateColumns = manager.actSplits[0] + "% " + (manager.actSplits[1] - manager.actSplits[0]) + "% " + (100 - manager.actSplits[1]) + "%";
    manager.acts.forEach((act, index) => { const item = document.createElement("div"); item.className = "character-manager-act"; item.append(createCharacterManagerInput(act.title, "幕标题", "character-manager-act-title", event => { const current = ensureScriptFlow().characterManager.acts[index]; if (current) current.title = event.target.value; scheduleSave(); }), createCharacterManagerInput(act.subtitle, "幕说明", "character-manager-act-subtitle", event => { const current = ensureScriptFlow().characterManager.acts[index]; if (current) current.subtitle = event.target.value; scheduleSave(); })); acts.append(item); }); [0, 1].forEach(index => { const handle = document.createElement("span"); handle.className = "character-manager-act-resize"; handle.dataset.characterManagerActResize = String(index); handle.style.left = manager.actSplits[index] + "%"; handle.addEventListener("pointerdown", startManagerActResize); acts.append(handle); }); panel.append(acts);
    const timeline = document.createElement("section"); timeline.className = "character-manager-timeline"; timeline.dataset.managerTimeline = "true";
    const ruler = document.createElement("div"); ruler.className = "character-manager-ruler"; timeline.append(ruler);
    const labels = document.createElement("div"); labels.className = "character-manager-percentages"; Array.from({ length: 11 }, (_, index) => index * 10 + "%").forEach(text => { const label = document.createElement("span"); label.textContent = text; labels.append(label); }); timeline.append(labels);
    const segments = document.createElement("section"); segments.className = "character-manager-segments"; segments.setAttribute("aria-label", "段落轨道");
    manager.paragraphs.forEach(segment => { const segmentCard = document.createElement("article"); segmentCard.className = "manager-segment-card"; segmentCard.dataset.managerSegment = segment.id; const segmentTitle = document.createElement("div"); segmentTitle.className = "manager-segment-title"; segmentTitle.contentEditable = "true"; segmentTitle.spellcheck = false; segmentTitle.textContent = segment.title; segmentTitle.setAttribute("aria-label", "编辑段落标题"); segmentTitle.addEventListener("pointerdown", event => event.stopPropagation()); segmentTitle.addEventListener("input", event => { const current = ensureScriptFlow().characterManager.paragraphs.find(item => item.id === segment.id); if (current) current.title = event.currentTarget.innerText.replace(/\r?\n/g, " ").trim(); scheduleSave(); }); const segmentContent = document.createElement("div"); segmentContent.className = "manager-segment-content"; segmentContent.contentEditable = "true"; segmentContent.spellcheck = false; segmentContent.textContent = segment.content || ""; segmentContent.setAttribute("aria-label", "编辑段落内容"); segmentContent.setAttribute("data-placeholder", "点击输入段落内容"); segmentContent.addEventListener("pointerdown", event => event.stopPropagation()); segmentContent.addEventListener("input", event => { const current = ensureScriptFlow().characterManager.paragraphs.find(item => item.id === segment.id); if (current) current.content = event.currentTarget.innerText; scheduleSave(); }); segmentCard.append(segmentTitle, segmentContent); segmentCard.addEventListener("contextmenu", event => openManagerSegmentMenu(event, segment.id)); segments.append(segmentCard); }); timeline.append(segments);
    const addSegment = document.createElement("button"); addSegment.type = "button"; addSegment.className = "character-manager-add-segment"; addSegment.setAttribute("aria-label", "新增段落"); addSegment.textContent = "+"; addSegment.addEventListener("pointerdown", event => { event.preventDefault(); event.stopPropagation(); addCharacterManagerSegment(); }); timeline.append(addSegment);
    const managedRoleIds = new Set(flow.relationships.flatMap(link => [link.source, link.target])); const managedRoles = flow.characters.filter(role => managedRoleIds.has(role.id));
    if (!managedRoles.length) { const empty = document.createElement("p"); empty.className = "character-manager-empty"; empty.textContent = "在画布中连接角色后，会自动显示在这里。"; timeline.append(empty); }
    managedRoles.forEach(role => {
      const card = document.createElement("article"); card.className = "manager-role-card " + role.gender; card.dataset.managerRole = role.id; card.style.left = role.managementPosition + "%";
      const avatar = document.createElement("button"); avatar.type = "button"; avatar.className = "manager-role-avatar"; avatar.setAttribute("aria-label", "编辑 " + scriptCharacterLabel(role)); avatar.innerHTML = scriptAvatarHtml(role, true); avatar.addEventListener("pointerdown", event => { if (event.detail === 2) { event.preventDefault(); event.stopPropagation(); summonCharacterFunction(role.id); } }); avatar.addEventListener("dblclick", event => { event.preventDefault(); event.stopPropagation(); summonCharacterFunction(role.id); });
      const stem = document.createElement("span"); stem.className = "manager-role-stem";
      const name = createCharacterManagerInput(role.name, "角色名称", "manager-role-name", event => updateScriptCharacterField(role.id, "name", event.target.value)); name.dataset.managerRoleName = role.id;
      const identity = createCharacterManagerInput(role.identity, "角色定位", "manager-role-identity", event => updateScriptCharacterField(role.id, "identity", event.target.value)); identity.dataset.managerRoleIdentity = role.id;
      card.append(avatar, stem, name, identity); card.addEventListener("pointerdown", startManagerRoleDrag); timeline.append(card);
    });
    panel.append(timeline);
    const resize = document.createElement("span"); resize.className = "character-manager-resize"; resize.dataset.characterManagerResize = "true"; resize.setAttribute("role", "separator"); resize.addEventListener("pointerdown", event => startScriptFloatingPanel(event, "manager", "resize")); panel.append(resize);
    scriptNodeLayer.append(panel);
  }
  const notes = flow.characterNotes; const role = notes.visible ? flow.characters.find(item => item.id === notes.roleId) : null;
  if (!role) return;
  const notePanel = document.createElement("section"); notePanel.className = "character-notes-panel"; notePanel.dataset.characterNotesPanel = "true"; notePanel.setAttribute("aria-label", "角色功能"); applyFloatingPanelBox(notePanel, notes);
  const noteHeading = document.createElement("header"); noteHeading.className = "character-notes-heading"; noteHeading.dataset.characterNotesDrag = "true";
  const noteCopy = document.createElement("div"); const noteEyebrow = document.createElement("span"); noteEyebrow.className = "eyebrow"; noteEyebrow.textContent = "CHARACTER NOTE"; const noteTitle = document.createElement("strong"); noteTitle.textContent = "角色功能"; noteCopy.append(noteEyebrow, noteTitle);
  const close = document.createElement("button"); close.type = "button"; close.className = "character-notes-close"; close.setAttribute("aria-label", "关闭备注"); close.innerHTML = icon("x"); close.addEventListener("pointerdown", event => { event.preventDefault(); event.stopPropagation(); closeCharacterNotes(); }); noteHeading.append(noteCopy, close); noteHeading.addEventListener("pointerdown", event => { if (!event.target.closest("button")) startScriptFloatingPanel(event, "notes", "move"); }); notePanel.append(noteHeading);
  const roleRow = document.createElement("div"); roleRow.className = "character-notes-role"; const avatarWrap = document.createElement("div"); avatarWrap.className = "character-notes-avatar"; avatarWrap.innerHTML = scriptAvatarHtml(role, true); const roleName = createCharacterManagerInput(role.name, "角色名称", "character-notes-name", event => updateScriptCharacterField(role.id, "name", event.target.value)); roleName.dataset.characterNotesName = role.id; const roleIdentity = document.createElement("span"); roleIdentity.dataset.characterNotesIdentity = role.id; roleIdentity.textContent = role.identity || "未填写身份"; roleRow.append(avatarWrap, roleName, roleIdentity); notePanel.append(roleRow);
  const label = document.createElement("label"); label.className = "character-notes-label"; label.textContent = "备注"; notePanel.append(label);
  const bio = document.createElement("textarea"); bio.className = "character-notes-bio"; bio.dataset.characterNotesBio = role.id; bio.placeholder = "记录这个角色的背景、关系、动机或后续调整…"; bio.value = role.bio || ""; bio.addEventListener("pointerdown", event => event.stopPropagation()); bio.addEventListener("input", event => updateScriptCharacterField(role.id, "bio", event.target.value)); notePanel.append(bio);
  const noteResize = document.createElement("span"); noteResize.className = "character-notes-resize"; noteResize.dataset.characterNotesResize = "true"; noteResize.setAttribute("role", "separator"); noteResize.addEventListener("pointerdown", event => startScriptFloatingPanel(event, "notes", "resize")); notePanel.append(noteResize);
  scriptNodeLayer.append(notePanel); refreshIcons();
}
function startScriptFloatingPanel(event, kind, mode) {
  const flow = ensureScriptFlow(); const panel = kind === "manager" ? flow.characterManager : flow.characterNotes; if (!panel) return;
  event.preventDefault(); event.stopPropagation();
  scriptFloatingPanelSession = { kind, mode, start: scriptPoint(event.clientX, event.clientY), origin: { x: panel.x, y: panel.y, width: panel.width, height: panel.height }, before: snapshot(), moved: false, element: event.currentTarget.closest(kind === "manager" ? ".character-manager-panel" : ".character-notes-panel") };
  if (scriptFloatingPanelSession.element) scriptFloatingPanelSession.element.style.willChange = mode === "move" ? "left, top" : "width, height";
}
function startManagerRoleDrag(event) {
  if (event.target.closest('input, [contenteditable="true"]')) return; const flow = ensureScriptFlow(); const card = event.currentTarget.closest(".manager-role-card"); const role = flow.characters.find(item => item.id === card?.dataset.managerRole); if (!role) return;
  event.preventDefault(); event.stopPropagation(); const timeline = event.currentTarget.closest(".character-manager-panel")?.querySelector("[data-manager-timeline]"); if (!timeline) return;
  scriptManagerRoleDragSession = { id: role.id, timeline, before: snapshot(), moved: false, element: event.currentTarget };
}
function startManagerActResize(event) {
  const flow = ensureScriptFlow(); const acts = event.currentTarget.closest("[data-character-manager-acts]"); const index = Number(event.currentTarget.dataset.characterManagerActResize); if (!acts || !Number.isInteger(index)) return;
  event.preventDefault(); event.stopPropagation(); scriptManagerActResizeSession = { index, acts, before: snapshot(), moved: false };
}
function startManagerSegmentDrag(event) {
  if (event.target.closest('input, button, [contenteditable="true"]')) return; const segment = ensureScriptFlow().characterManager.paragraphs.find(item => item.id === event.currentTarget.dataset.managerSegment); if (!segment) return;
  event.preventDefault(); event.stopPropagation(); const timeline = event.currentTarget.closest(".character-manager-panel")?.querySelector("[data-manager-timeline]"); if (!timeline) return;
  scriptManagerSegmentDragSession = { id: segment.id, timeline, before: snapshot(), moved: false, element: event.currentTarget };
}
function handleScriptFloatingPanels(event) {
  if (scriptManagerActResizeSession) {
    const session = scriptManagerActResizeSession; const manager = ensureScriptFlow().characterManager; const rect = session.acts.getBoundingClientRect(); const value = Math.min(85, Math.max(15, Math.round((event.clientX - rect.left) / Math.max(1, rect.width) * 1000) / 10));
    if (session.index === 0) manager.actSplits[0] = Math.min(manager.actSplits[1] - 15, value); else manager.actSplits[1] = Math.max(manager.actSplits[0] + 15, value);
    manager.actSplits[0] = Math.max(15, manager.actSplits[0]); manager.actSplits[1] = Math.min(85, manager.actSplits[1]); session.moved = true; session.acts.style.gridTemplateColumns = manager.actSplits[0] + "% " + (manager.actSplits[1] - manager.actSplits[0]) + "% " + (100 - manager.actSplits[1]) + "%"; session.acts.querySelectorAll("[data-character-manager-act-resize]").forEach(handle => { const index = Number(handle.dataset.characterManagerActResize); handle.style.left = manager.actSplits[index] + "%"; }); return true;
  }
  if (scriptFloatingPanelSession) {
    const session = scriptFloatingPanelSession; const flow = ensureScriptFlow(); const panel = session.kind === "manager" ? flow.characterManager : flow.characterNotes; const point = scriptPoint(event.clientX, event.clientY); const dx = Math.round(point.x - session.start.x); const dy = Math.round(point.y - session.start.y);
    if (session.mode === "move") { panel.x = session.origin.x + dx; panel.y = session.origin.y + dy; } else { const manager = session.kind === "manager"; panel.width = manager ? Math.max(620, session.origin.width + dx) : Math.min(560, Math.max(240, session.origin.width + dx)); panel.height = Math.min(720, Math.max(manager ? 430 : 270, session.origin.height + dy)); }
    session.moved = panel.x !== session.origin.x || panel.y !== session.origin.y || panel.width !== session.origin.width || panel.height !== session.origin.height; if (session.element) applyFloatingPanelBox(session.element, panel); return true;
  }
  if (scriptManagerRoleDragSession) {
    const session = scriptManagerRoleDragSession; const role = ensureScriptFlow().characters.find(item => item.id === session.id); if (!role) return true; const rect = session.timeline.getBoundingClientRect();
    role.managementPosition = Math.min(96, Math.max(4, Math.round((event.clientX - rect.left) / Math.max(1, rect.width) * 1000) / 10)); session.moved = true; if (session.element) session.element.style.left = role.managementPosition + "%"; return true;
  }
  if (scriptManagerSegmentDragSession) {
    const session = scriptManagerSegmentDragSession; const manager = ensureScriptFlow().characterManager; const segment = manager.paragraphs.find(item => item.id === session.id); if (!segment) return true; const rect = session.timeline.getBoundingClientRect();
    const desired = Math.min(100, Math.max(0, Math.round((event.clientX - rect.left) / Math.max(1, rect.width) * 1000) / 10)); const ordered = arrangeCharacterManagerSegments(manager, segment.id, desired, rect.width); session.moved = true; ordered.forEach(item => applyManagerSegmentPlacement(scriptNodeLayer.querySelector('[data-manager-segment="' + CSS.escape(item.id) + '"]'), item.position)); return true;
  }
  return false;
}
function finishScriptFloatingPanels() {
  const finish = session => { if (session.element) session.element.style.willChange = ""; if (session.moved) { undoStack.push(session.before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; scheduleSave(); updateHistoryButtons(); renderScriptFlow(); renderLibrary(); renderInspector(); } return true; };
  if (scriptManagerActResizeSession) { const session = scriptManagerActResizeSession; scriptManagerActResizeSession = null; return finish(session); }
  if (scriptFloatingPanelSession) { const session = scriptFloatingPanelSession; scriptFloatingPanelSession = null; return finish(session); }
  if (scriptManagerRoleDragSession) { const session = scriptManagerRoleDragSession; scriptManagerRoleDragSession = null; return finish(session); }
  if (scriptManagerSegmentDragSession) { const session = scriptManagerSegmentDragSession; scriptManagerSegmentDragSession = null; return finish(session); }
  return false;
}
function scriptAssistantTargets(flow = ensureScriptFlow()) {
  return [
    ...flow.characters.map(item => ({ id: item.id, kind: "角色", label: scriptCharacterLabel(item) })),
    ...flow.storyCards.map(item => ({ id: item.id, kind: "故事卡", label: storyCardLabel(item) })),
    ...(flow.emotionBoards || []).map((item, index) => ({ id: item.id, kind: "情绪曲线", label: `情绪曲线 ${index + 1}` })),
    ...(flow.characterArcs || []).map((item, index) => ({ id: item.id, kind: "角色转变", label: `角色转变 ${index + 1}` })),
    ...(flow.characterGoals || []).map((item, index) => ({ id: item.id, kind: "角色目标", label: `角色目标 ${index + 1}` })),
    ...(flow.scriptNotes || []).map((item, index) => ({ id: item.id, kind: "便签", label: item.content.trim().split(/\r?\n/)[0].slice(0, 24) || `便签 ${index + 1}` })),
    ...flow.storyFrames.map(item => ({ id: item.id, kind: "分组画板", label: item.name || "未命名画板" })),
    { id: "character-manager", kind: "角色管理", label: "角色管理" }
  ];
}
function scriptAssistantTargetLabel(flow, id) { const target = scriptAssistantTargets(flow).find(item => item.id === id); return target ? `${target.kind} · ${target.label}` : "未选择模块"; }
function scriptAssistantContext(flow, targetId) {
  if (targetId === "character-manager") return { type: "角色管理", acts: flow.characterManager?.acts || [], paragraphs: flow.characterManager?.paragraphs || [], characters: flow.characters.map(role => ({ name: scriptCharacterLabel(role), identity: role.identity, age: role.age, occupation: role.occupation, personality: role.personality, goal: role.goal, bio: role.bio })) };
  const item = scriptItemById(flow, targetId); if (!item) return {};
  if (item.type === "character") return { type: "角色", name: scriptCharacterLabel(item), identity: item.identity, age: item.age, occupation: item.occupation, personality: item.personality, goal: item.goal, bio: item.bio, tags: item.tags, relations: flow.relationships.filter(link => link.source === item.id || link.target === item.id).map(link => scriptCharacterLabel(flow.characters.find(role => role.id === (link.source === item.id ? link.target : link.source)) || {})) };
  if (item.type === "story-card") return { type: "故事卡", number: storyCardNumber(flow, item), title: item.title, scene: item.scene, time: item.time, location: item.location, characters: item.characters, goal: item.goal, resistance: item.mood, initialSituation: item.initialSituation, finalSituation: item.finalSituation, storyType: item.storyType, content: item.content, dialogue: item.dialogue };
  if (item.type === "emotion-board") return { type: "情绪曲线", points: emotionBoardCards(flow, item).map(card => ({ number: storyCardNumber(flow, card), title: card.title, label: item.labels?.[card.id] || "", level: item.levels?.[card.id] ?? .5 })) };
  if (item.type === "character-arc") return { type: "角色转变", roles: item.roleIds.map(id => flow.characters.find(role => role.id === id)).filter(Boolean).map(role => ({ name: scriptCharacterLabel(role), identity: role.identity })), stages: item.stages };
  if (item.type === "character-goal") return { type: "角色目标", roles: item.roleIds.map(id => flow.characters.find(role => role.id === id)).filter(Boolean).map(role => ({ name: scriptCharacterLabel(role), identity: role.identity })), surfaceGoals: item.surfaceGoals, coreGoals: item.coreGoals };
  if (item.type === "script-note") return { type: "便签", content: item.content || "" };
  if (item.type === "story-frame") return { type: "分组画板", name: item.name, items: scriptFrameContainedItems(item, flow).filter(child => child.id !== item.id).map(child => ({ type: scriptItemKind(child), label: scriptItemLabel(child) })) };
  return { type: scriptItemKind(item), label: scriptItemLabel(item) };
}
function createScriptAssistant(x, y, index = 0) { return { id: uid("script-ai"), type: "ai-assistant", targetId: "", instruction: "", answer: "", error: "", status: "idle", model: "gpt-5.6", x, y, width: 520, height: 430, createdAt: Date.now() + index }; }
function addScriptAssistant() { if (!state) return; const flow = ensureScriptFlow(); const rect = scriptFlowStage.getBoundingClientRect(); const point = scriptPoint(rect.left + rect.width / 2, rect.top + rect.height / 2); recordHistory(); const assistant = createScriptAssistant(Math.round(point.x - 260 + (flow.aiAssistants || []).length * 30), Math.round(point.y - 215 + (flow.aiAssistants || []).length * 30), (flow.aiAssistants || []).length); flow.aiAssistants.push(assistant); flow.selectedIds = [assistant.id]; flow.selectedEdgeId = null; renderWorkspace(); scheduleSave(); }
function scriptAssistantMarkup(assistant, flow) {
  const selected = flow.selectedIds.includes(assistant.id) ? " is-selected" : ""; const targets = scriptAssistantTargets(flow); const answer = assistant.answer || assistant.error || ""; const busy = assistant.status === "running";
  const options = targets.map(target => `<option value="${escapeHtml(target.id)}"${target.id === assistant.targetId ? " selected" : ""}>${escapeHtml(`${target.kind} · ${target.label}`)}</option>`).join("");
  return `<article class="script-ai-assistant${selected}${assistant.error ? " is-error" : ""}" data-ai-assistant="${assistant.id}" style="left:${assistant.x}px;top:${assistant.y}px;width:${assistant.width}px;height:${assistant.height}px"><header data-script-ai-drag="${assistant.id}"><div><small>AI ASSISTANT</small><strong>${icon("sparkles")} AI助手</strong></div><span>${busy ? "正在生成" : "指定模块"}</span></header><div class="script-ai-assistant-body"><label class="script-ai-target"><span>工作对象</span><select class="script-interactive" data-script-ai-target="${assistant.id}" aria-label="选择 AI 助手工作对象"><option value="">选择画布模块</option>${options}</select></label><label class="script-ai-request"><span>需求</span><textarea class="script-interactive" data-script-ai-request="${assistant.id}" placeholder="例如：梳理这个角色的动机，并给出下一步剧情建议。">${escapeHtml(assistant.instruction)}</textarea></label><div class="script-ai-actions"><select class="script-interactive" data-script-ai-model="${assistant.id}" aria-label="选择模型"><option value="gpt-5.6"${assistant.model === "gpt-5.6" ? " selected" : ""}>GPT-5.6</option><option value="gpt-5.5"${assistant.model === "gpt-5.5" ? " selected" : ""}>GPT-5.5</option></select><button class="button button-primary script-interactive" type="button" data-script-ai-run="${assistant.id}"${busy ? " disabled" : ""}>${icon(busy ? "loader-circle" : "send")} ${busy ? "生成中" : "确认并请求"}</button></div><section class="script-ai-response"><div><span>输出内容</span>${answer ? `<button class="script-interactive" type="button" data-script-ai-copy="${assistant.id}" aria-label="复制输出内容">${icon("copy")}</button>` : ""}</div><textarea readonly data-script-ai-answer="${assistant.id}" placeholder="模型的回答会显示在这里。">${escapeHtml(answer)}</textarea></section></div><span class="script-ai-resize script-interactive" data-script-ai-resize="${assistant.id}" aria-label="调整 AI 助手大小"></span></article>`;
}
function updateScriptAssistantField(id, field, value) { const assistant = (ensureScriptFlow().aiAssistants || []).find(item => item.id === id); if (!assistant) return; assistant[field] = value; scheduleSave(); }
async function copyScriptAssistantOutput(id) { const answer = String((ensureScriptFlow().aiAssistants || []).find(item => item.id === id)?.answer || "").trim(); if (!answer) return toast("暂无可复制的 AI 输出", true); let copied = false; try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(answer); copied = true; } } catch { copied = false; } if (!copied) { const area = document.createElement("textarea"); area.value = answer; area.style.cssText = "position:fixed;opacity:0"; document.body.append(area); area.select(); copied = document.execCommand("copy"); area.remove(); } toast(copied ? "AI 输出已复制" : "复制失败，请手动选择文本复制", !copied); }
async function runScriptAssistant(id) {
  const flow = ensureScriptFlow(); const assistant = (flow.aiAssistants || []).find(item => item.id === id);
  if (!assistant || assistant.status === "running") return;
  if (!assistant.targetId) return toast("请先选择 AI 助手要处理的画布模块", true);
  if (!assistant.instruction.trim()) return toast("请输入希望 AI 完成的内容", true);
  if (!$("#apiState").classList.contains("is-ready") && !apiKey) { openSettings(); return toast("请先连接 API", true); }
  const targetName = scriptAssistantTargetLabel(flow, assistant.targetId);
  const context = scriptAssistantContext(flow, assistant.targetId);
  const prompt = `你是剧本创作 AI 助手。请仅围绕用户指定的画布模块完成请求。\n\n工作对象：${targetName}\n\n模块资料：\n${JSON.stringify(context, null, 2)}\n\n用户需求：\n${assistant.instruction.trim()}\n\n请用清晰的中文作答。未提供的事实不要当作既定内容；新增内容请明确标注为建议。`;
  const currentAssistant = () => (ensureScriptFlow().aiAssistants || []).find(item => item.id === id);
  recordHistory(); scriptAssistantPendingIds.add(id); assistant.status = "running"; assistant.error = ""; renderScriptFlow(); renderInspector();
  try {
    const result = await requestJson("/api/respond", { method: "POST", headers: { "Content-Type": "application/json", ...(apiKey ? { "x-image2-api-key": apiKey } : {}) }, body: JSON.stringify({ prompt, model: assistant.model }) }, 165000);
    const answer = String(result?.answer || "").trim();
    if (!answer) throw new Error("AI 模型未返回可显示的文本，请重试");
    const liveAssistant = currentAssistant();
    if (liveAssistant) { liveAssistant.answer = answer; liveAssistant.model = result.model || liveAssistant.model; liveAssistant.error = ""; liveAssistant.status = "idle"; }
    toast("AI 助手已完成输出");
  } catch (error) {
    const liveAssistant = currentAssistant();
    if (liveAssistant) { liveAssistant.status = "idle"; liveAssistant.error = error?.message || "AI 助手请求失败"; }
    toast(error?.message || "AI 助手请求失败", true);
  } finally {
    scriptAssistantPendingIds.delete(id);
    const liveAssistant = currentAssistant(); if (liveAssistant) liveAssistant.status = "idle";
    renderScriptFlow(); renderInspector(); scheduleSave(); updateHistoryButtons();
  }
}
function startScriptAssistantResize(event) { const id = event.currentTarget.dataset.scriptAiResize; const assistant = (ensureScriptFlow().aiAssistants || []).find(item => item.id === id); if (!assistant) return; event.preventDefault(); event.stopPropagation(); selectScriptItem(id); scriptAssistantResizeSession = { id, start: scriptPoint(event.clientX, event.clientY), origin: { width: assistant.width, height: assistant.height }, before: snapshot(), moved: false, element: scriptItemElement(id) }; if (scriptAssistantResizeSession.element) scriptAssistantResizeSession.element.style.willChange = "width, height"; }
function createScriptNote(x, y, index = 0) { return { id: uid("script-note"), type: "script-note", content: "", x, y, width: 280, height: 210, createdAt: Date.now() + index }; }
function addScriptNote() { if (!state) return; const flow = ensureScriptFlow(); const rect = scriptFlowStage.getBoundingClientRect(); const point = scriptPoint(rect.left + rect.width / 2, rect.top + rect.height / 2); recordHistory(); const note = createScriptNote(Math.round(point.x - 140 + (flow.scriptNotes || []).length * 24), Math.round(point.y - 105 + (flow.scriptNotes || []).length * 24), (flow.scriptNotes || []).length); flow.scriptNotes.push(note); flow.selectedIds = [note.id]; flow.selectedEdgeId = null; renderWorkspace(); scheduleSave(); }
function scriptNoteMarkup(note, flow) { const selected = flow.selectedIds.includes(note.id) ? " is-selected" : ""; return `<article class="script-note-card${selected}" data-script-note="${note.id}" style="left:${note.x}px;top:${note.y}px;width:${note.width}px;height:${note.height}px"><header data-script-note-drag="${note.id}"><span>${icon("sticky-note")}</span><strong>便签</strong></header><textarea class="script-note-text script-interactive" data-script-note-content="${note.id}" placeholder="记录你的想法…">${escapeHtml(note.content || "")}</textarea><span class="script-note-resize script-interactive" data-script-note-resize="${note.id}" aria-label="调整便签大小"></span></article>`; }
function updateScriptNoteContent(id, value) { const note = (ensureScriptFlow().scriptNotes || []).find(item => item.id === id); if (!note) return; note.content = value; const length = document.querySelector(`[data-script-note-length="${CSS.escape(id)}"]`); if (length) length.textContent = `${value.length} 字`; scheduleSave(); }
function startScriptNoteResize(event) { const id = event.currentTarget.dataset.scriptNoteResize; const note = (ensureScriptFlow().scriptNotes || []).find(item => item.id === id); if (!note) return; event.preventDefault(); event.stopPropagation(); selectScriptItem(id); scriptNoteResizeSession = { id, start: scriptPoint(event.clientX, event.clientY), origin: { width: note.width, height: note.height }, before: snapshot(), moved: false, element: scriptItemElement(id) }; if (scriptNoteResizeSession.element) scriptNoteResizeSession.element.style.willChange = "width, height"; }
function renderScriptFlow() { if (!state || !scriptFlowStage) return; const flow = ensureScriptFlow(); syncEmotionLevels(flow); scriptNodeLayer.innerHTML = `${flow.storyFrames.map(frame => renderScriptFrame(frame, flow)).join("")}${(flow.characterArcs || []).map(arc => characterArcMarkup(arc, flow)).join("")}${(flow.characterGoals || []).map(goal => characterGoalMarkup(goal, flow)).join("")}${(flow.aiAssistants || []).map(assistant => scriptAssistantMarkup(assistant, flow)).join("")}${(flow.scriptNotes || []).map(note => scriptNoteMarkup(note, flow)).join("")}${(flow.emotionBoards || []).map(board => emotionBoardMarkup(flow, board)).join("")}${flow.storyCards.map(card => renderStoryCard(card, flow)).join("")}${flow.characters.map(role => { const selected = flow.selectedIds.includes(role.id) ? " is-selected" : ""; return `<article class="script-character-node ${role.gender}${selected}" data-script-character="${role.id}" style="left:${role.x}px;top:${role.y}px" aria-label="${escapeHtml(scriptCharacterLabel(role))}">${scriptAvatarHtml(role, false, true)}<input class="script-name-input script-interactive" data-script-name="${role.id}" value="${escapeHtml(role.name || "")}" placeholder="角色名称" aria-label="角色名称"><input class="script-identity-input script-interactive" data-script-identity="${role.id}" value="${escapeHtml(role.identity || "")}" placeholder="身份 / 关系" aria-label="角色身份"></article>`; }).join("")}${flow.storyFrames.map(frame => renderScriptFrameResizeControls(frame)).join("")}`; renderScriptEdges(); updateScriptViewport(); renderEmotionBoardLabels(flow); bindScriptFlowEvents(); renderCharacterManagementPanels(flow); refreshIcons(); }
function scriptEdgeById(flow, id) { return flow.relationships.find(link => link.id === id) || flow.storyLinks.find(link => link.id === id) || (flow.emotionLinks || []).find(link => link.id === id) || null; }function requestScriptEdgeRender() {
  if (scriptEdgeRenderFrame) return;
  scriptEdgeRenderFrame = requestAnimationFrame(() => { scriptEdgeRenderFrame = 0; renderScriptEdges(); });
}
function renderScriptEdges() {
  if (!state || !scriptEdgeLayer) return;
  const flow = ensureScriptFlow(); const itemsById = new Map([...flow.characters, ...flow.storyCards, ...(flow.emotionBoards || [])].map(item => [item.id, item])); const getItem = id => itemsById.get(id); const specs = [];
  const appendLink = (link, kind, colorClass) => { const source = getItem(link.source); const target = getItem(link.target); if (!source || !target) return; specs.push({ id: link.id, d: scriptRelationshipPath(scriptItemCenter(source), scriptItemCenter(target)), className: `script-relationship-edge ${colorClass}${flow.selectedEdgeId === link.id ? " is-selected" : ""}`, label: kind === "story" ? "故事卡连接" : kind === "emotion" ? "情绪曲线关联" : "角色关系连接" }); };
  flow.relationships.forEach(link => appendLink(link, "role", getItem(link.source)?.gender === "female" ? "female" : "male")); flow.storyLinks.forEach(link => appendLink(link, "story", "story")); (flow.emotionLinks || []).forEach(link => appendLink(link, "emotion", "emotion"));
  const existing = new Map([...scriptEdgeLayer.querySelectorAll("[data-script-edge-group]")].map(group => [group.dataset.scriptEdgeGroup, group]));
  specs.forEach(spec => { let group = existing.get(spec.id); if (!group) { group = document.createElementNS("http://www.w3.org/2000/svg", "g"); group.dataset.scriptEdgeGroup = spec.id; const visual = document.createElementNS("http://www.w3.org/2000/svg", "path"); const hit = document.createElementNS("http://www.w3.org/2000/svg", "path"); hit.dataset.scriptEdge = spec.id; group.append(visual, hit); scriptEdgeLayer.append(group); } existing.delete(spec.id); const [visual, hit] = group.children; visual.setAttribute("class", spec.className); visual.setAttribute("d", spec.d); hit.setAttribute("class", "script-edge-hit"); hit.setAttribute("d", spec.d); hit.setAttribute("aria-label", spec.label); });
  existing.forEach(group => group.remove()); const draftSource = scriptConnectionDraft ? getItem(scriptConnectionDraft.sourceId) : null; let draft = scriptEdgeLayer.querySelector("[data-script-draft-edge]");
  if (draftSource && scriptConnectionDraft) { if (!draft) { draft = document.createElementNS("http://www.w3.org/2000/svg", "path"); draft.dataset.scriptDraftEdge = "true"; scriptEdgeLayer.append(draft); } const draftClass = scriptConnectionDraft.kind === "story" ? "story" : scriptConnectionDraft.kind === "emotion" ? "emotion" : draftSource.gender; draft.setAttribute("class", `script-relationship-edge is-draft ${draftClass}`); draft.setAttribute("d", scriptRelationshipPath(scriptItemCenter(draftSource), scriptConnectionDraft.current)); } else draft?.remove();
}function updateScriptCharacterField(id, field, value) {
  const flow = ensureScriptFlow(); const role = flow.characters.find(item => item.id === id); if (!role) return;
  role[field] = field === "tags" ? value.split(/[,，]/).map(item => item.trim()).filter(Boolean).slice(0, 12) : value;
  const safeId = CSS.escape(id);
  const selectors = ["[data-script-" + field + "=\"" + safeId + "\"]", "[data-manager-role-" + field + "=\"" + safeId + "\"]", "[data-character-notes-" + field + "=\"" + safeId + "\"]"];
  scriptNodeLayer.querySelectorAll(selectors.join(",")).forEach(input => { if ("value" in input && input.value !== value) input.value = value; });
  const noteIdentity = scriptNodeLayer.querySelector("[data-character-notes-identity=\"" + safeId + "\"]");
  if (noteIdentity && field === "identity") noteIdentity.textContent = value || "未填写身份";
  if (field === "name" || field === "identity") {
    const node = scriptNodeLayer.querySelector("[data-script-character=\"" + safeId + "\"]");
    if (node) node.setAttribute("aria-label", scriptCharacterLabel(role));
  }
  scheduleSave();
}
function updateStoryCardField(id, field, value) { const card = ensureScriptFlow().storyCards.find(item => item.id === id); if (!card) return; card[field] = value; scheduleSave(); }
function updateStoryCardNumber(id, value) { const card = ensureScriptFlow().storyCards.find(item => item.id === id); if (!card) return; card.displayNumber = String(value || "").replace(/[^0-9]/g, "").slice(0, 4); scheduleSave(); }
function bindScriptFlowEvents() { const scriptGoalAll = selector => [...document.querySelectorAll(selector)]; scriptGoalAll("[data-script-note]").forEach(element => element.addEventListener("pointerdown", startScriptDrag)); scriptGoalAll("[data-script-note] .script-interactive").forEach(control => control.addEventListener("pointerdown", event => event.stopPropagation())); scriptGoalAll("[data-script-note-drag]").forEach(header => header.addEventListener("pointerdown", event => startScriptDrag(event, header.dataset.scriptNoteDrag))); scriptGoalAll("[data-script-note-resize]").forEach(handle => handle.addEventListener("pointerdown", startScriptNoteResize)); scriptGoalAll("[data-script-note-content]").forEach(input => input.addEventListener("input", event => updateScriptNoteContent(input.dataset.scriptNoteContent, event.target.value))); scriptGoalAll('[data-ai-assistant]').forEach(element => element.addEventListener("pointerdown", startScriptDrag)); scriptGoalAll('[data-ai-assistant] .script-interactive').forEach(control => control.addEventListener("pointerdown", event => event.stopPropagation())); scriptGoalAll('[data-script-ai-drag]').forEach(header => header.addEventListener("pointerdown", event => startScriptDrag(event, header.dataset.scriptAiDrag))); scriptGoalAll('[data-script-ai-resize]').forEach(handle => handle.addEventListener("pointerdown", startScriptAssistantResize)); scriptGoalAll('[data-script-ai-target]').forEach(select => select.addEventListener("change", event => { recordHistory(); updateScriptAssistantField(select.dataset.scriptAiTarget, "targetId", event.target.value); renderScriptFlow(); renderInspector(); })); scriptGoalAll('[data-script-ai-request]').forEach(input => input.addEventListener("input", event => updateScriptAssistantField(input.dataset.scriptAiRequest, "instruction", event.target.value))); scriptGoalAll('[data-script-ai-model]').forEach(select => select.addEventListener("change", event => { recordHistory(); updateScriptAssistantField(select.dataset.scriptAiModel, "model", event.target.value); })); scriptGoalAll('[data-script-ai-run]').forEach(button => button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); runScriptAssistant(button.dataset.scriptAiRun); })); scriptGoalAll('[data-script-ai-copy]').forEach(button => button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); copyScriptAssistantOutput(button.dataset.scriptAiCopy); })); scriptGoalAll('[data-character-goal]').forEach(element => element.addEventListener("pointerdown", startScriptDrag)); scriptGoalAll('[data-character-goal] .script-interactive').forEach(control => control.addEventListener("pointerdown", event => event.stopPropagation())); scriptGoalAll('[data-character-goal-resize]').forEach(handle => handle.addEventListener("pointerdown", startCharacterGoalResize)); scriptGoalAll('[data-character-goal-point]').forEach(handle => handle.addEventListener("pointerdown", startCharacterGoalPointDrag)); scriptGoalAll('[data-character-goal-role-toggle]').forEach(button => button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); characterGoalRolePickerId = characterGoalRolePickerId === button.dataset.characterGoalRoleToggle ? "" : button.dataset.characterGoalRoleToggle; renderScriptFlow(); })); scriptGoalAll('[data-character-goal-pick-role]').forEach(button => button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); addCharacterGoalRole(button.dataset.characterGoalPickRole, button.dataset.roleId); })); scriptGoalAll('[data-character-goal-remove-role]').forEach(button => button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); removeCharacterGoalRole(button.dataset.characterGoalRemoveRole, button.dataset.roleId); })); scriptGoalAll('[data-character-goal-add-entry]').forEach(button => button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); addCharacterGoalEntry(button.dataset.characterGoalAddEntry, button.dataset.goalKind); })); scriptGoalAll('[data-character-goal-text]').forEach(input => { input.addEventListener("pointerdown", event => event.stopPropagation()); input.addEventListener("input", event => updateCharacterGoalText(input.dataset.characterGoalText, input.dataset.goalKind, input.dataset.goalEntry, event.target.value)); }); scriptGoalAll('[data-character-goal-entry]').forEach(entry => entry.addEventListener("contextmenu", event => { event.preventDefault(); event.stopPropagation(); removeCharacterGoalEntry(entry.dataset.characterGoalId, entry.dataset.goalKind, entry.dataset.characterGoalEntry); })); scriptGoalAll('[data-character-arc]').forEach(element => element.addEventListener("pointerdown", startScriptDrag)); scriptGoalAll('[data-character-arc] .script-interactive').forEach(control => control.addEventListener("pointerdown", event => event.stopPropagation())); scriptGoalAll('[data-character-arc-resize]').forEach(handle => handle.addEventListener("pointerdown", startCharacterArcResize)); scriptGoalAll('[data-character-arc-point]').forEach(point => point.addEventListener("pointerdown", startCharacterArcPointDrag)); scriptGoalAll('[data-character-arc-role-toggle]').forEach(button => button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); characterArcRolePickerId = characterArcRolePickerId === button.dataset.characterArcRoleToggle ? "" : button.dataset.characterArcRoleToggle; renderScriptFlow(); })); scriptGoalAll('[data-character-arc-pick-role]').forEach(button => button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); addCharacterArcRole(button.dataset.characterArcPickRole, button.dataset.roleId); })); scriptGoalAll('[data-character-arc-remove-role]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); removeCharacterArcRole(button.dataset.characterArcRemoveRole, button.dataset.roleId); })); scriptGoalAll('[data-character-arc-text]').forEach(input => { input.addEventListener("pointerdown", event => event.stopPropagation()); input.addEventListener("input", event => updateCharacterArcStage(input.dataset.characterArcText, input.dataset.stageKey, event.target.value)); }); scriptGoalAll('[data-script-character]').forEach(element => { element.addEventListener("pointerdown", startScriptDrag); element.addEventListener("dblclick", event => { if (event.target.closest(".script-interactive")) return; event.preventDefault(); event.stopPropagation(); summonCharacterFunction(element.dataset.scriptCharacter); }); }); scriptGoalAll('[data-script-link]').forEach(button => button.addEventListener("pointerdown", startScriptAvatarInteraction)); scriptGoalAll('[data-script-frame]').forEach(element => element.addEventListener("pointerdown", startScriptDrag)); scriptGoalAll('[data-emotion-board]').forEach(element => element.addEventListener("pointerdown", startEmotionBoardInteraction)); scriptGoalAll('[data-story-card]').forEach(element => element.addEventListener("pointerdown", startStoryCardInteraction)); scriptGoalAll('[data-script-frame-resize]').forEach(handle => handle.addEventListener("pointerdown", startScriptFrameResize)); scriptGoalAll('[data-script-frame-name]').forEach(input => { input.addEventListener("pointerdown", event => event.stopPropagation()); input.addEventListener("input", event => { const frame = ensureScriptFlow().storyFrames.find(item => item.id === input.dataset.scriptFrameName); if (frame) { frame.name = event.target.value; event.target.style.width = `${scriptFrameTitleWidth(frame.name)}px`; scheduleSave(); } }); }); scriptGoalAll('[data-story-dialog-open]').forEach(button => { button.addEventListener("pointerdown", event => event.stopPropagation()); button.addEventListener("dblclick", event => { event.preventDefault(); event.stopPropagation(); openStoryDialogue(button.dataset.storyDialogOpen); }); }); scriptGoalAll('[data-emotion-drag]').forEach(header => header.addEventListener("pointerdown", startEmotionBoardDrag)); scriptGoalAll('[data-emotion-resize]').forEach(handle => handle.addEventListener("pointerdown", startEmotionBoardResize)); scriptGoalAll('[data-story-resize]').forEach(handle => handle.addEventListener("pointerdown", startStoryCardResize)); scriptGoalAll('[data-story-number]').forEach(input => { input.addEventListener("pointerdown", event => event.stopPropagation()); input.addEventListener("input", event => updateStoryCardNumber(input.dataset.storyNumber, event.target.value)); }); scriptGoalAll('[data-story-field]').forEach(input => { input.addEventListener("pointerdown", event => event.stopPropagation()); input.addEventListener("input", event => updateStoryCardField(input.dataset.storyField, input.dataset.storyKey, event.target.value)); }); scriptGoalAll('[data-story-type-toggle]').forEach(button => { button.addEventListener("pointerdown", event => event.stopPropagation()); button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); storyTypePickerId = storyTypePickerId === button.dataset.storyTypeToggle ? "" : button.dataset.storyTypeToggle; renderScriptFlow(); }); }); scriptGoalAll('[data-story-type-pick]').forEach(button => { button.addEventListener("pointerdown", event => event.stopPropagation()); button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); const card = ensureScriptFlow().storyCards.find(item => item.id === button.dataset.storyTypePick); if (!card) return; recordHistory(); card.storyTypeMode = "preset"; card.storyType = button.dataset.storyTypeValue; storyTypePickerId = ""; renderScriptFlow(); scheduleSave(); }); }); scriptGoalAll('[data-story-type-custom]').forEach(button => { button.addEventListener("pointerdown", event => event.stopPropagation()); button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); const card = ensureScriptFlow().storyCards.find(item => item.id === button.dataset.storyTypeCustom); if (!card) return; recordHistory(); card.storyTypeMode = "custom"; card.storyType = ""; storyTypePickerId = ""; renderScriptFlow(); scheduleSave(); }); }); scriptGoalAll('[data-emotion-point]').forEach(point => point.addEventListener("pointerdown", startEmotionPointDrag)); scriptGoalAll('[data-script-name], [data-script-identity]').forEach(input => { input.addEventListener("pointerdown", event => event.stopPropagation()); input.addEventListener("input", event => { const field = input.dataset.scriptName ? "name" : "identity"; const id = input.dataset.scriptName || input.dataset.scriptIdentity; updateScriptCharacterField(id, field, event.target.value); renderLibrary(); renderInspector(); }); }); }function moveScriptItem(flow, id, x, y) { if (id === "character-manager") { flow.characterManager.x = x; flow.characterManager.y = y; return flow.characterManager; } if (id === "character-notes") { flow.characterNotes.x = x; flow.characterNotes.y = y; return flow.characterNotes; } const item = scriptItemById(flow, id); if (!item) return null; item.x = x; item.y = y; return item; }
function startScriptDrag(event, itemId = "") { if (!itemId && event.target.closest(".script-interactive")) return; const flow = ensureScriptFlow(); const id = itemId || event.currentTarget.dataset.scriptCharacter || event.currentTarget.dataset.storyCard || event.currentTarget.dataset.scriptFrame || event.currentTarget.dataset.emotionBoard || event.currentTarget.dataset.characterArc || event.currentTarget.dataset.characterGoal || event.currentTarget.dataset.scriptNote || event.currentTarget.dataset.aiAssistant; const item = scriptItemById(flow, id); if (!item) return; event.preventDefault(); event.stopPropagation(); const selected = flow.selectedIds.includes(id); if (event.shiftKey) flow.selectedIds = selected ? flow.selectedIds.filter(itemId => itemId !== id) : [...flow.selectedIds, id]; else if (!selected) flow.selectedIds = [id]; flow.selectedEdgeId = null; let movingIds = flow.selectedIds.includes(id) ? [...flow.selectedIds] : [id]; if (item.type === "story-frame") movingIds = [...new Set([item.id, ...scriptFrameContainedItems(item, flow).map(child => child.id)])]; scriptFlowStage.classList.add("is-interacting"); scriptDragSession = { start: scriptPoint(event.clientX, event.clientY), moved: false, before: snapshot(), origins: movingIds.map(itemId => { const current = scriptItemById(flow, itemId); return current ? { id: current.id, x: current.x, y: current.y } : null; }).filter(Boolean), elements: [] }; renderScriptFlow(); renderLibrary(); renderInspector(); scriptDragSession.elements = movingIds.map(itemId => ({ id: itemId, element: scriptItemElement(itemId) })); scriptDragSession.elements.forEach(entry => { if (entry.element) entry.element.style.willChange = "left, top"; }); }
function startCharacterGoalResize(event) { const id = event.currentTarget.dataset.characterGoalResize; const goal = (ensureScriptFlow().characterGoals || []).find(item => item.id === id); if (!goal) return; event.preventDefault(); event.stopPropagation(); selectScriptItem(id); scriptGoalResizeSession = { id, start: scriptPoint(event.clientX, event.clientY), origin: { width: goal.width, height: goal.height }, before: snapshot(), moved: false, element: scriptItemElement(id) }; if (scriptGoalResizeSession.element) scriptGoalResizeSession.element.style.willChange = "width, height"; }
function startCharacterGoalPointDrag(event) { const goalId = event.currentTarget.dataset.characterGoalPoint; const kind = event.currentTarget.dataset.goalKind; const entryId = event.currentTarget.dataset.goalEntry; const goal = (ensureScriptFlow().characterGoals || []).find(item => item.id === goalId); const track = event.currentTarget.closest("[data-character-goal-track]"); const entry = event.currentTarget.closest("[data-character-goal-entry]"); if (!goal || !track || !entry) return; event.preventDefault(); event.stopPropagation(); const rect = track.getBoundingClientRect(); const current = (goal[kind === "core" ? "coreGoals" : "surfaceGoals"] || []).find(item => item.id === entryId); scriptGoalPointSession = { id: goalId, kind, entryId, track, startClientX: event.clientX, startPosition: Number(current?.position || 50), halfWidthPercent: (entry.getBoundingClientRect().width / Math.max(1, rect.width)) * 50, before: snapshot(), moved: false }; }
function startCharacterArcResize(event) { const id = event.currentTarget.dataset.characterArcResize; const arc = ensureScriptFlow().characterArcs.find(item => item.id === id); if (!arc) return; event.preventDefault(); event.stopPropagation(); selectScriptItem(id); scriptCharacterArcResizeSession = { id, start: scriptPoint(event.clientX, event.clientY), origin: { width: arc.width, height: arc.height }, before: snapshot(), moved: false, element: scriptItemElement(id) }; if (scriptCharacterArcResizeSession.element) scriptCharacterArcResizeSession.element.style.willChange = "width, height"; }
function startCharacterArcPointDrag(event) { const arcId = event.currentTarget.dataset.characterArcPoint; const key = event.currentTarget.dataset.stageKey; const arc = ensureScriptFlow().characterArcs.find(item => item.id === arcId); const track = event.currentTarget.closest("[data-character-arc-track]"); if (!arc || !track || !arc.stages[key]) return; event.preventDefault(); event.stopPropagation(); scriptCharacterArcPointSession = { id: arcId, key, track, before: snapshot(), moved: false }; }function startScriptAvatarInteraction(event) { const avatar = event.currentTarget; const rect = avatar.getBoundingClientRect(); const distance = Math.hypot(event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + rect.height / 2)); const moveRadius = Math.max(0, Math.min(rect.width, rect.height) / 2 - 16); if (distance <= moveRadius) return startScriptDrag(event, avatar.dataset.scriptLink); startScriptConnection(event, "character"); }
function startStoryCardInteraction(event) { if (event.target.closest(".story-card-field, [data-story-resize]")) return; const card = event.currentTarget; const rect = card.getBoundingClientRect(); const edgeDistance = Math.min(event.clientX - rect.left, rect.right - event.clientX, event.clientY - rect.top, rect.bottom - event.clientY); if (edgeDistance <= 14) return startScriptConnection(event, "story"); startScriptDrag(event, card.dataset.storyCard); }
function startEmotionBoardInteraction(event) { if (event.target.closest("[data-emotion-drag], [data-emotion-resize], [data-emotion-point], [data-emotion-label]")) return; const board = event.currentTarget; const rect = board.getBoundingClientRect(); const edgeDistance = Math.min(event.clientX - rect.left, rect.right - event.clientX, event.clientY - rect.top, rect.bottom - event.clientY); if (edgeDistance <= 14) return startScriptConnection(event, "emotion"); startEmotionBoardDrag(event); }
function startScriptConnection(event, kind = "character") { const flow = ensureScriptFlow(); const sourceId = event.currentTarget.dataset.scriptLink || event.currentTarget.dataset.storyCard || event.currentTarget.dataset.emotionBoard; const source = scriptItemById(flow, sourceId); if (!source || scriptItemKind(source) !== kind) return; scriptFlowStage.classList.add("is-interacting"); event.preventDefault(); event.stopPropagation(); flow.selectedIds = kind === "emotion" ? [] : [sourceId]; flow.selectedEdgeId = null; scriptConnectionDraft = { sourceId, kind, current: scriptPoint(event.clientX, event.clientY), before: snapshot() }; renderScriptEdges(); renderLibrary(); renderInspector(); }
function startStoryCardResize(event) { scriptFlowStage.classList.add("is-interacting"); const id = event.currentTarget.dataset.storyResize; const card = ensureScriptFlow().storyCards.find(item => item.id === id); if (!card) return; event.preventDefault(); event.stopPropagation(); scriptStoryResizeSession = { id, start: scriptPoint(event.clientX, event.clientY), origin: { width: card.width, height: card.height }, before: snapshot(), moved: false, element: scriptItemElement(id) }; if (scriptStoryResizeSession.element) scriptStoryResizeSession.element.style.willChange = "width, height"; }
function startEmotionPointDrag(event) { const id = event.currentTarget.dataset.emotionPoint; const boardId = event.currentTarget.dataset.emotionBoardId; const flow = ensureScriptFlow(); const board = (flow.emotionBoards || []).find(item => item.id === boardId); if (!board || !emotionBoardCards(flow, board).some(card => card.id === id)) return; event.preventDefault(); event.stopPropagation(); scriptEmotionPointSession = { id, boardId, before: snapshot(), moved: false }; }
function startScriptFrameResize(event) { const id = event.currentTarget.dataset.scriptFrameResize; const frame = ensureScriptFlow().storyFrames.find(item => item.id === id); if (!frame) return; event.preventDefault(); event.stopPropagation(); scriptFrameResizeSession = { id, corner: event.currentTarget.dataset.scriptFrameResizeCorner || "se", start: scriptPoint(event.clientX, event.clientY), origin: { x: frame.x, y: frame.y, width: frame.width, height: frame.height }, before: snapshot(), moved: false, element: scriptItemElement(id) }; if (scriptFrameResizeSession.element) scriptFrameResizeSession.element.style.willChange = "left, width, height"; }
function startEmotionBoardDrag(event) { const id = event.currentTarget.dataset.emotionDrag || event.currentTarget.dataset.emotionBoard; if (!id) return; return startScriptDrag(event, id); }
function startEmotionBoardResize(event) { const id = event.currentTarget.dataset.emotionResize; const board = (ensureScriptFlow().emotionBoards || []).find(item => item.id === id); if (!board) return; event.preventDefault(); event.stopPropagation(); scriptEmotionResizeSession = { id, start: scriptPoint(event.clientX, event.clientY), origin: { width: board.width, height: board.height }, before: snapshot(), moved: false, element: scriptItemElement(id) }; if (scriptEmotionResizeSession.element) scriptEmotionResizeSession.element.style.willChange = "width, height"; }
function startScriptPan(event) { if (!state || state.flowMode !== "script" || ![0, 1].includes(event.button)) return; scriptFlowStage.classList.add("is-interacting"); event.preventDefault(); const viewport = scriptViewport(); scriptPanSession = { clientX: event.clientX, clientY: event.clientY, x: viewport.x, y: viewport.y, moved: false }; workspace.classList.add("is-panning"); }
function startScriptSelection(event) { if (!state || state.flowMode !== "script" || event.button !== 0) return; const rect = scriptFlowStage.getBoundingClientRect(); const start = { x: event.clientX - rect.left, y: event.clientY - rect.top }; scriptSelectionSession = { start, current: start, before: [...ensureScriptFlow().selectedIds], additive: event.shiftKey, moved: false }; selectionRect.hidden = false; selectionRect.style.left = `${start.x}px`; selectionRect.style.top = `${start.y}px`; selectionRect.style.width = "0px"; selectionRect.style.height = "0px"; }
function updateScriptSelection(event) { if (!scriptSelectionSession) return false; const rect = scriptFlowStage.getBoundingClientRect(); const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }; const session = scriptSelectionSession; const left = Math.min(session.start.x, point.x); const top = Math.min(session.start.y, point.y); const width = Math.abs(point.x - session.start.x); const height = Math.abs(point.y - session.start.y); session.current = point; session.moved = width > 4 || height > 4; selectionRect.style.left = `${left}px`; selectionRect.style.top = `${top}px`; selectionRect.style.width = `${width}px`; selectionRect.style.height = `${height}px`; if (!session.moved) return true; const selection = { left: rect.left + left, right: rect.left + left + width, top: rect.top + top, bottom: rect.top + top + height }; const hitIds = [...scriptNodeLayer.querySelectorAll("[data-script-character], [data-story-card], [data-script-frame], [data-emotion-board], [data-character-arc], [data-character-goal], [data-ai-assistant]")].filter(element => { const box = element.getBoundingClientRect(); return box.left < selection.right && box.right > selection.left && box.top < selection.bottom && box.bottom > selection.top; }).map(element => element.dataset.scriptCharacter || element.dataset.storyCard || element.dataset.scriptFrame || element.dataset.emotionBoard || element.dataset.characterArc || element.dataset.characterGoal || element.dataset.aiAssistant); const flow = ensureScriptFlow(); flow.selectedIds = session.additive ? [...new Set([...session.before, ...hitIds])] : hitIds; flow.selectedEdgeId = null; $('[data-script-character], [data-story-card], [data-script-frame], [data-emotion-board], [data-character-arc], [data-character-goal], [data-ai-assistant]').forEach(element => element.classList.toggle("is-selected", flow.selectedIds.includes(element.dataset.scriptCharacter || element.dataset.storyCard || element.dataset.scriptFrame || element.dataset.emotionBoard || element.dataset.characterArc || element.dataset.characterGoal || element.dataset.aiAssistant))); return true; }
function requestScriptSelectionUpdate(event) {
  pendingScriptSelectionPoint = { clientX: event.clientX, clientY: event.clientY };
  if (scriptSelectionFrame) return true;
  scriptSelectionFrame = requestAnimationFrame(() => {
    scriptSelectionFrame = 0; const point = pendingScriptSelectionPoint; pendingScriptSelectionPoint = null;
    if (point && scriptSelectionSession) updateScriptSelection(point);
  });
  return true;
}
function flushScriptSelectionUpdate() {
  if (!pendingScriptSelectionPoint) return;
  if (scriptSelectionFrame) { cancelAnimationFrame(scriptSelectionFrame); scriptSelectionFrame = 0; }
  const point = pendingScriptSelectionPoint; pendingScriptSelectionPoint = null;
  if (scriptSelectionSession) updateScriptSelection(point);
}
function finishScriptSelection() { flushScriptSelectionUpdate(); if (!scriptSelectionSession) return false; const session = scriptSelectionSession; scriptSelectionSession = null; selectionRect.hidden = true; const flow = ensureScriptFlow(); if (!session.moved && !session.additive) flow.selectedIds = []; flow.selectedEdgeId = null; renderScriptFlow(); renderLibrary(); renderInspector(); scheduleSave(); return true; }function handleScriptPointerMove(event) { if (handleScriptFloatingPanels(event)) return true; if (scriptPanelResizeSession) return handlePanelResize(event); if (scriptGoalResizeSession) { const session = scriptGoalResizeSession; const goal = (ensureScriptFlow().characterGoals || []).find(item => item.id === session.id); if (!goal) return true; const point = scriptPoint(event.clientX, event.clientY); goal.width = Math.max(680, Math.round(session.origin.width + point.x - session.start.x)); goal.height = Math.max(360, Math.round(session.origin.height + point.y - session.start.y)); session.moved = goal.width !== session.origin.width || goal.height !== session.origin.height; if (session.element) { session.element.style.width = `${goal.width}px`; session.element.style.height = `${goal.height}px`; } return true; } if (scriptGoalPointSession) { const session = scriptGoalPointSession; const goal = (ensureScriptFlow().characterGoals || []).find(item => item.id === session.id); const key = session.kind === "core" ? "coreGoals" : "surfaceGoals"; const entry = goal?.[key]?.find(item => item.id === session.entryId); if (!entry) return true; const rect = session.track.getBoundingClientRect(); const min = Math.min(48, Math.max(1, session.halfWidthPercent + .5)); const max = 100 - min; const delta = ((event.clientX - session.startClientX) / Math.max(1, rect.width)) * 100; const value = Math.min(max, Math.max(min, session.startPosition + delta)); entry.position = value; session.moved = Math.abs(value - session.startPosition) > .05; const element = scriptNodeLayer.querySelector(`[data-character-goal-entry="${CSS.escape(session.entryId)}"]`); if (element) element.style.left = `${value}%`; return true; } if (scriptNoteResizeSession) { const session = scriptNoteResizeSession; const note = (ensureScriptFlow().scriptNotes || []).find(item => item.id === session.id); if (!note) return true; const point = scriptPoint(event.clientX, event.clientY); note.width = Math.min(720, Math.max(200, Math.round(session.origin.width + point.x - session.start.x))); note.height = Math.min(720, Math.max(160, Math.round(session.origin.height + point.y - session.start.y))); session.moved = note.width !== session.origin.width || note.height !== session.origin.height; if (session.element) { session.element.style.width = `${note.width}px`; session.element.style.height = `${note.height}px`; } return true; } if (scriptAssistantResizeSession) { const session = scriptAssistantResizeSession; const assistant = (ensureScriptFlow().aiAssistants || []).find(item => item.id === session.id); if (!assistant) return true; const point = scriptPoint(event.clientX, event.clientY); assistant.width = Math.min(900, Math.max(360, Math.round(session.origin.width + point.x - session.start.x))); assistant.height = Math.min(760, Math.max(320, Math.round(session.origin.height + point.y - session.start.y))); session.moved = assistant.width !== session.origin.width || assistant.height !== session.origin.height; if (session.element) { session.element.style.width = `${assistant.width}px`; session.element.style.height = `${assistant.height}px`; } return true; } if (scriptCharacterArcResizeSession) { const session = scriptCharacterArcResizeSession; const arc = ensureScriptFlow().characterArcs.find(item => item.id === session.id); if (!arc) return true; const point = scriptPoint(event.clientX, event.clientY); arc.width = Math.min(1200, Math.max(620, Math.round(session.origin.width + point.x - session.start.x))); arc.height = Math.min(700, Math.max(320, Math.round(session.origin.height + point.y - session.start.y))); session.moved = arc.width !== session.origin.width || arc.height !== session.origin.height; if (session.element) { session.element.style.width = `${arc.width}px`; session.element.style.height = `${arc.height}px`; } return true; } if (scriptCharacterArcPointSession) { const session = scriptCharacterArcPointSession; const arc = ensureScriptFlow().characterArcs.find(item => item.id === session.id); if (!arc) return true; const rect = session.track.getBoundingClientRect(); const value = Math.min(96, Math.max(4, ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100)); arc.stages[session.key].position = value; session.moved = true; const point = scriptNodeLayer.querySelector(`[data-character-arc-point="${CSS.escape(session.id)}"][data-stage-key="${CSS.escape(session.key)}"]`); if (point) point.style.left = `${value}%`; return true; } if (scriptFrameResizeSession) { const session = scriptFrameResizeSession; const frame = ensureScriptFlow().storyFrames.find(item => item.id === session.id); if (!frame) return true; const point = scriptPoint(event.clientX, event.clientY); const dx = Math.round(point.x - session.start.x); const dy = Math.round(point.y - session.start.y); if (session.corner === "sw") { frame.width = Math.max(300, session.origin.width - dx); frame.x = frame.width === 300 ? session.origin.x + session.origin.width - 300 : session.origin.x + dx; frame.height = Math.max(230, session.origin.height + dy); } else { frame.width = Math.max(300, session.origin.width + dx); frame.height = Math.max(230, session.origin.height + dy); } session.moved = frame.x !== session.origin.x || frame.width !== session.origin.width || frame.height !== session.origin.height; if (session.element) { session.element.style.left = `${frame.x}px`; session.element.style.width = `${frame.width}px`; session.element.style.height = `${frame.height}px`; } positionScriptFrameResizeControls(frame); return true; } if (scriptEmotionResizeSession) { const session = scriptEmotionResizeSession; const board = (ensureScriptFlow().emotionBoards || []).find(item => item.id === session.id); if (!board) return true; const point = scriptPoint(event.clientX, event.clientY); board.width = Math.min(1000, Math.max(420, Math.round(session.origin.width + point.x - session.start.x))); board.height = Math.min(520, Math.max(210, Math.round(session.origin.height + point.y - session.start.y))); session.moved = board.width !== session.origin.width || board.height !== session.origin.height; if (session.element) { session.element.style.width = `${board.width}px`; session.element.style.height = `${board.height}px`; } return true; } if (scriptEmotionBoardDragSession) { const session = scriptEmotionBoardDragSession; const board = (ensureScriptFlow().emotionBoards || []).find(item => item.id === session.id); if (!board) return true; const point = scriptPoint(event.clientX, event.clientY); board.x = Math.round(session.origin.x + point.x - session.start.x); board.y = Math.round(session.origin.y + point.y - session.start.y); session.moved = board.x !== session.origin.x || board.y !== session.origin.y; if (session.element) { session.element.style.left = `${board.x}px`; session.element.style.top = `${board.y}px`; } requestScriptEdgeRender(); return true; } if (scriptStoryResizeSession) { const session = scriptStoryResizeSession; const card = ensureScriptFlow().storyCards.find(item => item.id === session.id); if (!card) return true; const point = scriptPoint(event.clientX, event.clientY); card.width = Math.min(440, Math.max(185, Math.round(session.origin.width + point.x - session.start.x))); card.height = Math.min(620, Math.max(250, Math.round(session.origin.height + point.y - session.start.y))); session.moved = card.width !== session.origin.width || card.height !== session.origin.height; if (session.element) { session.element.style.width = `${card.width}px`; session.element.style.height = `${card.height}px`; } requestScriptEdgeRender(); return true; } if (scriptEmotionPointSession) { const flow = ensureScriptFlow(); const session = scriptEmotionPointSession; const board = (flow.emotionBoards || []).find(item => item.id === session.boardId); if (!board) return true; const point = scriptPoint(event.clientX, event.clientY); const top = board.y + 76; const height = Math.max(1, board.height - 118); board.levels[session.id] = Math.min(1, Math.max(0, 1 - (point.y - top) / height)); session.moved = true; const circle = scriptNodeLayer.querySelector(`[data-emotion-point="${CSS.escape(session.id)}"][data-emotion-board-id="${CSS.escape(session.boardId)}"]`); if (circle) circle.setAttribute("cy", String(76 + (1 - board.levels[session.id]) * height)); const label = scriptNodeLayer.querySelector("[data-emotion-label=" + JSON.stringify(session.id) + "][data-emotion-board-id=" + JSON.stringify(session.boardId) + "]"); if (label) label.style.top = Math.max(84, Math.round(76 + (1 - board.levels[session.id]) * height - 66)) + "px"; return true; } if (scriptConnectionDraft) { scriptConnectionDraft.current = scriptPoint(event.clientX, event.clientY); requestScriptEdgeRender(); return true; } if (scriptPanSession) { const viewport = scriptViewport(); const dx = event.clientX - scriptPanSession.clientX; const dy = event.clientY - scriptPanSession.clientY; if (Math.abs(dx) + Math.abs(dy) > 1) scriptPanSession.moved = true; viewport.x = scriptPanSession.x + dx; viewport.y = scriptPanSession.y + dy; updateScriptViewport(); return true; } if (scriptSelectionSession) return requestScriptSelectionUpdate(event); if (!scriptDragSession) return false; const flow = ensureScriptFlow(); const point = scriptPoint(event.clientX, event.clientY); const dx = point.x - scriptDragSession.start.x; const dy = point.y - scriptDragSession.start.y; if (Math.abs(dx) + Math.abs(dy) > 1) scriptDragSession.moved = true; scriptDragSession.origins.forEach(origin => { const item = moveScriptItem(flow, origin.id, Math.round(origin.x + dx), Math.round(origin.y + dy)); if (!item) return; const entry = scriptDragSession.elements.find(candidate => candidate.id === origin.id); if (entry?.element) { entry.element.style.left = `${item.x}px`; entry.element.style.top = `${item.y}px`; } if (item.type === "story-frame") positionScriptFrameResizeControls(item); }); requestScriptEdgeRender(); return true; }
function finishScriptPointerUp(event) { scriptFlowStage.classList.remove("is-interacting"); const flow = ensureScriptFlow(); if (finishScriptFloatingPanels()) return true; if (finishPanelResize()) return true; const finishLooseSession = session => { if (session.element) session.element.style.willChange = ""; if (session.moved) { undoStack.push(session.before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; scheduleSave(); } renderScriptFlow(); renderLibrary(); renderInspector(); updateHistoryButtons(); return true; }; if (scriptGoalResizeSession) { const session = scriptGoalResizeSession; scriptGoalResizeSession = null; return finishLooseSession(session); } if (scriptGoalPointSession) { const session = scriptGoalPointSession; scriptGoalPointSession = null; if (session.moved) { undoStack.push(session.before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; scheduleSave(); } renderScriptFlow(); updateHistoryButtons(); return true; } if (scriptNoteResizeSession) { const session = scriptNoteResizeSession; scriptNoteResizeSession = null; return finishLooseSession(session); } if (scriptAssistantResizeSession) { const session = scriptAssistantResizeSession; scriptAssistantResizeSession = null; return finishLooseSession(session); } if (scriptCharacterArcResizeSession) { const session = scriptCharacterArcResizeSession; scriptCharacterArcResizeSession = null; return finishLooseSession(session); } if (scriptCharacterArcPointSession) { const session = scriptCharacterArcPointSession; scriptCharacterArcPointSession = null; if (session.moved) { undoStack.push(session.before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; scheduleSave(); } renderScriptFlow(); updateHistoryButtons(); return true; } if (scriptFrameResizeSession) { const session = scriptFrameResizeSession; scriptFrameResizeSession = null; return finishLooseSession(session); } if (scriptEmotionResizeSession) { const session = scriptEmotionResizeSession; scriptEmotionResizeSession = null; return finishLooseSession(session); } if (scriptEmotionBoardDragSession) { const session = scriptEmotionBoardDragSession; scriptEmotionBoardDragSession = null; return finishLooseSession(session); } if (scriptStoryResizeSession) { const session = scriptStoryResizeSession; scriptStoryResizeSession = null; if (session.element) session.element.style.willChange = ""; if (session.moved) { undoStack.push(session.before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; scheduleSave(); } renderScriptFlow(); renderLibrary(); renderInspector(); updateHistoryButtons(); return true; } if (scriptEmotionPointSession) { const session = scriptEmotionPointSession; scriptEmotionPointSession = null; if (session.moved) { undoStack.push(session.before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; scheduleSave(); } renderScriptFlow(); updateHistoryButtons(); return true; } if (scriptPanSession) { const session = scriptPanSession; scriptPanSession = null; workspace.classList.remove("is-panning"); if (session.moved) scheduleSave(); else { flow.selectedIds = []; flow.selectedEdgeId = null; renderScriptFlow(); renderLibrary(); renderInspector(); } return true; } if (scriptConnectionDraft) { const draft = scriptConnectionDraft; scriptConnectionDraft = null; const targetElement = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-script-character], [data-story-card], [data-emotion-board]"); const targetId = targetElement?.dataset.scriptCharacter || targetElement?.dataset.storyCard || targetElement?.dataset.emotionBoard; const target = scriptItemById(flow, targetId); const targetKind = scriptItemKind(target); let changed = false; if (target && targetId !== draft.sourceId) { if ((draft.kind === "emotion" && targetKind === "story") || (draft.kind === "story" && targetKind === "emotion")) { const boardId = draft.kind === "emotion" ? draft.sourceId : targetId; const storyId = draft.kind === "story" ? draft.sourceId : targetId; const existing = (flow.emotionLinks || []).find(link => link.source === boardId && link.target === storyId); if (!existing) { flow.emotionLinks = (flow.emotionLinks || []).filter(link => link.target !== storyId); flow.emotionLinks.push({ id: uid("emotion-link"), source: boardId, target: storyId, createdAt: Date.now() }); changed = true; } } else if (targetKind === draft.kind && ["story", "character"].includes(draft.kind)) { const links = draft.kind === "story" ? flow.storyLinks : flow.relationships; const duplicate = draft.kind === "story" ? links.some(link => link.source === draft.sourceId && link.target === targetId) : links.some(link => (link.source === draft.sourceId && link.target === targetId) || (link.source === targetId && link.target === draft.sourceId)); if (!duplicate) { links.push({ id: uid(draft.kind === "story" ? "story-link" : "rel"), source: draft.sourceId, target: targetId }); changed = true; } } } if (changed) { undoStack.push(draft.before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; flow.selectedIds = draft.kind === "emotion" ? [targetId] : targetKind === "emotion" ? [draft.sourceId] : [draft.sourceId, targetId]; flow.selectedEdgeId = null; syncEmotionLevels(flow); scheduleSave(); } renderScriptFlow(); renderLibrary(); renderInspector(); updateHistoryButtons(); return true; } if (finishScriptSelection()) return true; if (scriptDragSession) { const session = scriptDragSession; scriptDragSession = null; session.elements.forEach(item => { if (item.element) item.element.style.willChange = ""; }); if (session.moved) { undoStack.push(session.before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; scheduleSave(); updateHistoryButtons(); } renderScriptFlow(); renderLibrary(); renderInspector(); return true; } return false; }
function duplicateScriptCharacter() { const flow = ensureScriptFlow(); const source = flow.selectedIds.length === 1 ? flow.characters.find(role => role.id === flow.selectedIds[0]) : null; if (!source) return; recordHistory(); const copy = { ...structuredClone(source), id: uid("role"), name: source.name ? `${source.name} · 副本` : "", x: source.x + 48, y: source.y + 48, createdAt: Date.now() }; flow.characters.push(copy); flow.selectedIds = [copy.id]; renderWorkspace(); scheduleSave(); }
function deleteEmotionBoard(id) { const flow = ensureScriptFlow(); if (!(flow.emotionBoards || []).some(board => board.id === id)) return; recordHistory(); flow.emotionBoards = flow.emotionBoards.filter(board => board.id !== id); flow.emotionLinks = (flow.emotionLinks || []).filter(link => link.source !== id); flow.selectedIds = []; flow.selectedEdgeId = null; syncEmotionLevels(flow); renderWorkspace(); scheduleSave(); }
function deleteScriptEdge(id) { const flow = ensureScriptFlow(); if (!scriptEdgeById(flow, id)) return; recordHistory(); flow.relationships = flow.relationships.filter(link => link.id !== id); flow.storyLinks = flow.storyLinks.filter(link => link.id !== id); flow.emotionLinks = (flow.emotionLinks || []).filter(link => link.id !== id); flow.selectedEdgeId = null; syncEmotionLevels(flow); renderWorkspace(); scheduleSave(); }
function deleteScriptSelection() { const flow = ensureScriptFlow(); if (flow.selectedEdgeId) return deleteScriptEdge(flow.selectedEdgeId); if (!flow.selectedIds.length) return; recordHistory(); const ids = new Set(flow.selectedIds); flow.characters = flow.characters.filter(role => !ids.has(role.id)); flow.storyCards = flow.storyCards.filter(card => !ids.has(card.id)); flow.storyFrames = flow.storyFrames.filter(frame => !ids.has(frame.id)); flow.emotionBoards = (flow.emotionBoards || []).filter(board => !ids.has(board.id)); flow.characterArcs = (flow.characterArcs || []).filter(arc => !ids.has(arc.id)); flow.characterGoals = (flow.characterGoals || []).filter(goal => !ids.has(goal.id)); flow.scriptNotes = (flow.scriptNotes || []).filter(note => !ids.has(note.id)); flow.aiAssistants = (flow.aiAssistants || []).filter(assistant => !ids.has(assistant.id)); flow.relationships = flow.relationships.filter(link => !ids.has(link.source) && !ids.has(link.target)); flow.storyLinks = flow.storyLinks.filter(link => !ids.has(link.source) && !ids.has(link.target)); flow.emotionLinks = (flow.emotionLinks || []).filter(link => !ids.has(link.source) && !ids.has(link.target)); flow.selectedIds = []; syncEmotionLevels(flow); renderWorkspace(); scheduleSave(); }
function renderScriptLibrary() {
  const flow = ensureScriptFlow(); $("#libraryPanel .eyebrow").textContent = "SCRIPT FLOW"; $("#libraryPanel h2").textContent = "人物与故事";
  const genderTools = [{ id: "male-1", gender: "male", label: "男性角色" }, { id: "female-1", gender: "female", label: "女性角色" }];
  libraryContent.innerHTML = `<div class="script-tool-section"><div class="section-label"><span>人物工具</span><span>${flow.characters.length}</span></div><div class="script-library-grid script-gender-tools">${genderTools.map(role => `<button class="script-library-role ${role.gender}" type="button" data-add-script-role="${role.id}" onclick="window.__image2CanvasAddScriptRole?.(this.dataset.addScriptRole)">${scriptAvatarHtml(role, true)}<strong>${role.label}</strong></button>`).join("")}</div></div><div class="script-tool-section script-story-section"><div class="section-label"><span>故事元素</span><span>${flow.storyCards.length} 张卡</span></div><div class="script-story-grid"><button class="script-story-tool is-active" type="button" data-add-story-card>${icon("book-open")}<span>故事卡</span></button><button class="script-story-tool is-active" type="button" data-add-emotion>${icon("chart-no-axes-combined")}<span>情绪曲线</span></button><button class="script-story-tool is-active" type="button" data-toggle-character-manager>${icon("users-round")}<span>角色管理</span></button><button class="script-story-tool is-active" type="button" data-add-character-arc>${icon("route")}<span>角色转变</span></button><button class="script-story-tool is-active" type="button" data-add-character-goal>${icon("target")}<span>角色目标</span></button><button class="script-story-tool is-active" type="button" data-add-script-assistant>${icon("sparkles")}<span>AI助手</span></button><button class="script-story-tool is-active" type="button" data-add-script-note>${icon("sticky-note")}<span>便签</span></button><button class="script-story-tool" type="button" disabled>${icon("target")}<span>叙事目标</span></button><button class="script-story-tool" type="button" disabled>${icon("zap")}<span>冲突</span></button></div></div><p class="field-note script-field-note">故事卡外沿可连接下一张故事卡或情绪曲线；点击关联线后可在右侧删除。情绪曲线中的故事卡编号按各自分组的关联顺序自动更新。</p>`;
  $("[data-add-story-card]")?.addEventListener("click", addStoryCard); $("[data-add-emotion]")?.addEventListener("click", addEmotionBoard); $("[data-add-character-arc]")?.addEventListener("click", addCharacterArc); $("[data-add-character-goal]")?.addEventListener("click", addCharacterGoal); $("[data-add-script-assistant]")?.addEventListener("click", addScriptAssistant); $("[data-add-script-note]")?.addEventListener("click", addScriptNote); $("[data-toggle-character-manager]")?.addEventListener("click", toggleCharacterManager); refreshIcons();
}function scriptInspectorField(label, field, value, placeholder, multiline = false) { return `<label class="script-detail-field"><span>${label}</span>${multiline ? `<textarea data-script-detail="${field}" placeholder="${placeholder}">${escapeHtml(value || "")}</textarea>` : `<input type="text" data-script-detail="${field}" value="${escapeHtml(value || "")}" placeholder="${placeholder}">`}</label>`; }
function renderScriptInspector() {
  const flow = ensureScriptFlow(); const selected = flow.selectedIds.length === 1 ? scriptItemById(flow, flow.selectedIds[0]) : null; const selectedEdge = flow.selectedEdgeId ? scriptEdgeById(flow, flow.selectedEdgeId) : null;
  $("#inspectorEyebrow").textContent = "SCRIPT FLOW";
  if (selectedEdge) {
    const source = scriptItemById(flow, selectedEdge.source); const target = scriptItemById(flow, selectedEdge.target); const isStory = flow.storyLinks.some(link => link.id === selectedEdge.id); const isEmotion = (flow.emotionLinks || []).some(link => link.id === selectedEdge.id);
    $("#inspectorTitle").textContent = "连接属性";
    inspectorContent.innerHTML = `<section class="control-section"><div class="control-title">${isEmotion ? "情绪曲线关联" : isStory ? "故事顺序连接" : "角色关系连接"}</div><div class="summary-row"><span>来源</span><strong>${escapeHtml(scriptItemLabel(source))}</strong></div><div class="summary-row"><span>目标</span><strong>${escapeHtml(scriptItemLabel(target))}</strong></div>${isEmotion ? `<p class="field-note">该连接决定此曲线卡显示这张故事卡对应的情绪点。</p>` : isStory ? `<p class="field-note">该连接决定故事卡编号与情绪曲线的排列顺序。</p>` : ""}</section><section class="control-section"><button class="button button-quiet danger-action" id="deleteScriptEdgeButton" type="button">${icon("unlink")} 删除连接</button></section>`;
    $("#deleteScriptEdgeButton").addEventListener("click", () => deleteScriptEdge(selectedEdge.id)); return refreshIcons();
  }
  if (!selected) { $("#inspectorTitle").textContent = "故事概览"; inspectorContent.innerHTML = `<section class="control-section script-overview"><div class="control-title">关系网络 <span>${flow.relationships.length + flow.storyLinks.length + (flow.emotionLinks || []).length} 条</span></div><div class="summary-row"><span>角色数量</span><strong>${flow.characters.length}</strong></div><div class="summary-row"><span>故事卡</span><strong>${flow.storyCards.length}</strong></div><div class="summary-row"><span>情绪曲线</span><strong>${(flow.emotionBoards || []).length ? `${flow.emotionBoards.length} 张曲线卡` : "未创建"}</strong></div><p class="field-note">选择角色或故事卡可编辑内容；点击任意连接线可删除并重新连接。</p></section>`; return refreshIcons(); }
  if (selected.type === "emotion-board") { const cards = emotionBoardCards(flow, selected); $("#inspectorTitle").textContent = "情绪曲线"; inspectorContent.innerHTML = `<section class="control-section"><div class="control-title">曲线分组</div><div class="summary-row"><span>关联故事卡</span><strong>${cards.length} 张</strong></div><div class="summary-row"><span>曲线尺寸</span><strong>${Math.round(selected.width)} × ${Math.round(selected.height)}</strong></div><p class="field-note">拖动曲线卡可调整位置；按 Delete 或 Backspace 可删除整张曲线卡及其关联线。</p></section>`; return refreshIcons(); } if (selected.type === "story-frame") { $("#inspectorTitle").textContent = "分组画板"; inspectorContent.innerHTML = `<section class="control-section"><div class="control-title">分组内容</div><div class="summary-row"><span>包含角色与故事卡</span><strong>${scriptFrameContainedItems(selected, flow).length}</strong></div><div class="summary-row"><span>画板尺寸</span><strong>${Math.round(selected.width)} × ${Math.round(selected.height)}</strong></div><p class="field-note">拖动画板可整体移动其中元素；右下角可调整范围。</p></section><section class="control-section"><button class="button button-quiet danger-action" id="deleteScriptFrameButton" type="button">${icon("trash-2")} 删除分组画板</button></section>`; $("#deleteScriptFrameButton").addEventListener("click", deleteScriptSelection); return refreshIcons(); } if (selected.type === "story-card") { const number = storyCardNumber(flow, selected); $("#inspectorTitle").textContent = `故事卡 ${number}`; inspectorContent.innerHTML = `<section class="control-section"><div class="control-title">顺序与尺寸</div><div class="summary-row"><span>自动编号</span><strong>${number}</strong></div><div class="summary-row"><span>卡片尺寸</span><strong>${Math.round(selected.width)} × ${Math.round(selected.height)}</strong></div><p class="field-note">卡片可自由拖动；外边缘可连故事卡或情绪曲线；右下角可自由调整尺寸。</p></section><section class="control-section"><button class="button button-quiet danger-action" id="deleteStoryCardButton" type="button">${icon("trash-2")} 删除故事卡</button></section>`; $("#deleteStoryCardButton").addEventListener("click", deleteScriptSelection); return refreshIcons(); }
  if (selected.type === "character-arc") { const roles = selected.roleIds.map(id => flow.characters.find(role => role.id === id)).filter(Boolean); $("#inspectorTitle").textContent = "角色转变"; inspectorContent.innerHTML = `<section class="control-section"><div class="control-title">关联角色 <span>${roles.length} 位</span></div>${roles.length ? roles.map(role => `<div class="summary-row"><span>${escapeHtml(scriptCharacterLabel(role))}</span><strong>${escapeHtml(role.identity || "未填写身份")}</strong></div>`).join("") : `<p class="field-note">从模块上方的添加角色中选择画布已有角色。</p>`}<div class="summary-row"><span>模块尺寸</span><strong>${Math.round(selected.width)} × ${Math.round(selected.height)}</strong></div><p class="field-note">拖动底部三个圆点可调整起点、转折与结果的时间位置；右下角可调整模块尺寸。</p></section><section class="control-section"><button class="button button-quiet danger-action" id="deleteCharacterArcButton" type="button">${icon("trash-2")} 删除角色转变</button></section>`; $("#deleteCharacterArcButton").addEventListener("click", deleteScriptSelection); return refreshIcons(); }
  if (selected.type === "character-goal") { const roles = (selected.roleIds || []).map(id => flow.characters.find(role => role.id === id)).filter(Boolean); $("#inspectorTitle").textContent = "角色目标"; inspectorContent.innerHTML = `<section class="control-section"><div class="control-title">关联角色 <span>${roles.length} 位</span></div>${roles.length ? roles.map(role => `<div class="summary-row"><span>${escapeHtml(scriptCharacterLabel(role))}</span><strong>${escapeHtml(role.identity || "未填写身份")}</strong></div>`).join("") : `<p class="field-note">从模块上方的添加角色中选择画布已有角色。</p>`}<div class="summary-row"><span>表层目标</span><strong>${(selected.surfaceGoals || []).length} 条</strong></div><div class="summary-row"><span>核心目标</span><strong>${(selected.coreGoals || []).length} 条</strong></div><div class="summary-row"><span>模块尺寸</span><strong>${Math.round(selected.width)} × ${Math.round(selected.height)}</strong></div><p class="field-note">拖动每个目标卡左侧的握柄可改变横向位置；右键目标卡可删除，右下角可自由调整模块大小。</p></section><section class="control-section"><button class="button button-quiet danger-action" id="deleteCharacterGoalButton" type="button">${icon("trash-2")} 删除角色目标</button></section>`; $("#deleteCharacterGoalButton").addEventListener("click", deleteScriptSelection); return refreshIcons(); }
  if (selected.type === "ai-assistant") { const target = scriptAssistantTargetLabel(flow, selected.targetId); $("#inspectorTitle").textContent = "AI助手"; inspectorContent.innerHTML = `<section class="control-section"><div class="control-title">工作状态</div><div class="summary-row"><span>处理模块</span><strong>${escapeHtml(target)}</strong></div><div class="summary-row"><span>模型</span><strong>${escapeHtml(selected.model === "gpt-5.5" ? "GPT-5.5" : "GPT-5.6")}</strong></div><div class="summary-row"><span>模块尺寸</span><strong>${Math.round(selected.width)} × ${Math.round(selected.height)}</strong></div><p class="field-note">选择目标模块、输入需求后，AI 会围绕该模块内容输出建议。右下角可自由调整大小。</p></section><section class="control-section"><button class="button button-quiet danger-action" id="deleteScriptAssistantButton" type="button">${icon("trash-2")} 删除 AI 助手</button></section>`; $("#deleteScriptAssistantButton").addEventListener("click", deleteScriptSelection); return refreshIcons(); }  if (selected.type === "script-note") { $("#inspectorTitle").textContent = "便签"; inspectorContent.innerHTML = `<section class="control-section"><div class="control-title">便签内容</div><div class="summary-row"><span>文本长度</span><strong data-script-note-length="${selected.id}">${(selected.content || "").length} 字</strong></div><div class="summary-row"><span>便签尺寸</span><strong>${Math.round(selected.width)} × ${Math.round(selected.height)}</strong></div><p class="field-note">直接在便签中记录内容；可自由移动、拉伸、复制粘贴，按 Delete 或 Backspace 删除。</p></section><section class="control-section"><button class="button button-quiet danger-action" id="deleteScriptNoteButton" type="button">${icon("trash-2")} 删除便签</button></section>`; $("#deleteScriptNoteButton").addEventListener("click", deleteScriptSelection); return refreshIcons(); }  $("#inspectorTitle").textContent = "角色功能"; const links = flow.relationships.filter(link => link.source === selected.id || link.target === selected.id).length;
  inspectorContent.innerHTML = `<section class="script-character-summary ${selected.gender}">${scriptAvatarHtml(selected)}<div><strong>${escapeHtml(scriptCharacterLabel(selected))}</strong><span>${escapeHtml(selected.identity || (selected.gender === "female" ? "女性角色" : "男性角色"))} · ${links} 条关系</span></div></section><section class="control-section script-details">${scriptInspectorField("名称", "name", selected.name, "输入角色名称")}${scriptInspectorField("身份", "identity", selected.identity, "如：主角、恋人、反派")}${scriptInspectorField("年龄", "age", selected.age, "如：28 岁")}${scriptInspectorField("职业", "occupation", selected.occupation, "如：摄影师")}${scriptInspectorField("性格", "personality", selected.personality, "如：冷静、执着")}${scriptInspectorField("目标", "goal", selected.goal, "角色想实现的目标")}${scriptInspectorField("人物简介", "bio", selected.bio, "记录成长经历、动机与秘密", true)}${scriptInspectorField("标签", "tags", selected.tags.join("，"), "用逗号分隔，如：主角，坚韧")}</section><section class="control-section"><div class="action-list"><button class="action-row" type="button" id="duplicateScriptRoleButton">${icon("copy")}<strong>复制角色</strong><small>复制资料与标签</small></button><button class="action-row danger-action" type="button" id="deleteScriptRoleButton">${icon("trash-2")}<strong>删除角色</strong><small>同时删除关系线</small></button></div></section>`;
  $$('[data-script-detail]').forEach(input => input.addEventListener("input", event => { updateScriptCharacterField(selected.id, event.target.dataset.scriptDetail, event.target.value); if (["name", "identity"].includes(event.target.dataset.scriptDetail)) { renderScriptFlow(); renderLibrary(); } })); $("#duplicateScriptRoleButton")?.addEventListener("click", duplicateScriptCharacter); $("#deleteScriptRoleButton")?.addEventListener("click", deleteScriptSelection); refreshIcons();
}function formatClipTime(value) { const seconds = Math.max(0, Number(value) || 0); const minutes = Math.floor(seconds / 60); return `${String(minutes).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}.${String(Math.round((seconds % 1) * 100)).padStart(2, "0")}`; }
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
function videoPreviewSource(node) { const edge = incomingEdge(node?.id, "video"); const editor = findNode(edge?.source); return editor?.type === "video-editor" ? editor.outputSrc || "" : ""; }
function portPoint(node, portId) {
  if (!node) return { x: 0, y: 0 };
  if (node.type === "prompt") return portId === "composition" ? { x: node.x, y: node.y + 104 } : { x: node.x + node.width, y: node.y + 72 };
  if (node.type === "composition") return { x: node.x + node.width, y: node.y + 72 };
  if (node.type === "image" || node.type === "loading" || node.type === "video") return portId === "result" ? { x: node.x, y: node.y + 70 } : { x: node.x + node.width, y: node.y + 70 };
  if (node.type === "video-editor") {
    if (portId === "video") return { x: node.x + node.width, y: node.y + 70 };
    const index = Number(portId.split("-")[1]) || 0; return { x: node.x, y: node.y + 104 + index * 28 };
  }
  if (node.type === "video-preview") return { x: node.x, y: node.y + 70 };
  if (node.type === "generator") {
    if (portId === "image" || portId === "video") return { x: node.x + node.width, y: node.y + 76 };
    if (node.mediaType === "video") {
      if (portId === "prompt" || /^prompt-\d+$/.test(portId)) { const index = portId === "prompt" ? 0 : Number(portId.split("-")[1]) || 0; return { x: node.x, y: node.y + 202 + index * 30 }; }
      if (/^image-\d+$/.test(portId)) return { x: node.x, y: node.y + 232 + Math.max(0, node.promptSlots - 1) * 30 + (Number(portId.split("-")[1]) || 0) * 30 };
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
function renderCanvas() {
  syncAllVideoEditorClips();
  const nodes = [...state.nodes].sort((a, b) => { if (a.type === "frame" && b.type !== "frame") return -1; if (b.type === "frame" && a.type !== "frame") return 1; return (a.createdAt || 0) - (b.createdAt || 0); });
  nodeLayer.innerHTML = nodes.map(renderNodeHtml).join(""); renderEdges(); bindNodeEvents(); syncGenerationElapsedClock();
}
function frameContainedNodes(frame) {
  return state.nodes.filter(item => item.type !== "frame" && item.id !== frame.id && item.x + item.width / 2 >= frame.x && item.x + item.width / 2 <= frame.x + frame.width && item.y + item.height / 2 >= frame.y && item.y + item.height / 2 <= frame.y + frame.height);
}
function updateFrameMetaDom(frame) {
  const element = nodeLayer.querySelector(`[data-node-id="${CSS.escape(frame.id)}"]`);
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
  return `<header class="node-header${dragHandle ? " node-drag-handle" : ""}"${dragHandle ? ` data-node-drag-handle="${node.id}" data-node-id="${node.id}"` : ""}><div class="node-header-title"><span class="node-type-icon">${icon(iconName)}</span><strong>${escapeHtml(node.name)}</strong></div><div class="node-header-actions">${actions}${menu}</div></header>`;
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
function insertPromptReferenceToken(nodeId, index) {
  const node = findNode(nodeId); if (!node || node.type !== "prompt") return;
  const textarea = nodeLayer.querySelector(`[data-prompt-content="${CSS.escape(nodeId)}"]`); const value = String(node.content || ""); const selection = promptQuickRememberedSelection(nodeId); const start = Math.max(0, Math.min(value.length, Number(selection.start) || 0)); const end = Math.max(start, Math.min(value.length, Number(selection.end) || start)); const token = `图${Number(index) + 1}；\n`; node.content = `${value.slice(0, start)}${token}${value.slice(end)}`;
  if (textarea) { textarea.value = node.content; const caret = start + token.length; textarea.focus({ preventScroll: true }); textarea.setSelectionRange(caret, caret); }
  node.promptPresetId = ""; scheduleSave();
}
function promptQuickCurrentSelection(nodeId) {
  const textarea = nodeLayer.querySelector(`[data-prompt-content="${CSS.escape(nodeId)}"]`); if (!textarea || document.activeElement !== textarea) return { start: String(textarea?.value || "").length, end: String(textarea?.value || "").length };
  return { start: Number(textarea.selectionStart) || 0, end: Number(textarea.selectionEnd) || 0 };
}
function rememberPromptQuickSelection(nodeId) {
  promptQuickSelection.set(nodeId, promptQuickCurrentSelection(nodeId));
}
function promptQuickRememberedSelection(nodeId) {
  return promptQuickSelection.get(nodeId) || promptQuickCurrentSelection(nodeId);
}
function insertPromptQuickText(node, text, range = null) {
  if (!node || node.type !== "prompt" || !String(text || "")) return;
  const textarea = nodeLayer.querySelector(`[data-prompt-content="${CSS.escape(node.id)}"]`); const value = String(node.content || ""); const selection = range || promptQuickRememberedSelection(node.id); const start = Math.max(0, Math.min(value.length, Number(selection.start) || 0)); const end = Math.max(start, Math.min(value.length, Number(selection.end) || start)); node.content = `${value.slice(0, start)}${text}${value.slice(end)}`;
  if (textarea) { textarea.value = node.content; const caret = start + String(text).length; textarea.focus({ preventScroll: true }); textarea.setSelectionRange(caret, caret); }
  node.promptPresetId = ""; promptQuickSelection.delete(node.id);
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
  const toggle = '<button class="icon-button prompt-toggle node-interactive' + (disabled ? ' is-disabled' : '') + '" type="button" data-toggle-prompt="' + node.id + '" aria-label="' + toggleLabel + '" title="' + toggleLabel + '">' + icon(disabled ? "power" : "ban") + '</button>';
  const presetOptions = '<option value="">选择提示词预设</option>' + promptPresets.map(preset => '<option value="' + escapeHtml(preset.id) + '"' + (node.promptPresetId === preset.id ? ' selected' : '') + '>' + escapeHtml(preset.name) + '</option>').join("");
  const presetActions = '<div class="prompt-preset-actions"><select class="node-select node-interactive prompt-preset-select" data-prompt-preset="' + node.id + '" aria-label="选择提示词预设">' + presetOptions + '</select><button class="button button-quiet node-interactive" type="button" data-save-prompt-preset="' + node.id + '">保存</button><button class="icon-button node-interactive" type="button" data-rename-prompt-preset="' + node.id + '" aria-label="修改预设名称" data-tooltip="修改预设名称"' + (node.promptPresetId ? '' : ' disabled') + '>' + icon("pencil") + '</button><button class="button button-quiet node-interactive danger-action" type="button" data-delete-prompt-preset="' + node.id + '"' + (node.promptPresetId ? '' : ' disabled') + '>删除</button></div>';
  const references = promptReferenceNodes(node); const referenceStrip = references.length ? `<div class="prompt-reference-strip" aria-label="已连接参考图">${references.map((reference, index) => `<figure class="prompt-reference-thumb node-interactive" data-prompt-reference-node="${node.id}" data-prompt-reference-source="${reference.id}" data-prompt-reference-index="${index}" title="单击插入图${index + 1}，双击取消链接"><img src="${escapeHtml(nodeDisplaySource(reference))}" alt="参考图 ${index + 1}" loading="lazy" decoding="async" draggable="false"><figcaption>${index + 1}</figcaption></figure>`).join("")}</div>` : '<div class="prompt-reference-strip is-empty" aria-hidden="true"></div>';
  const quickToolbar = `<aside class="prompt-quick-toolbar" aria-label="提示词快捷参数"><div class="prompt-quick-heading">快捷镜头</div>${promptQuickSeconds(node)}${Object.keys(promptQuickParamOptions).map(field => promptQuickSelect(node, field)).join("")}<div class="prompt-preset-toolbar">${presetActions}</div></aside>`;
  return `<article class="canvas-node prompt-node${disabled ? " is-disabled" : ""}${selected}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, "text-cursor-input", toggle, false)}<div class="node-body"><div class="prompt-reference-strip-wrap">${referenceStrip}</div><div class="prompt-work-area"><div class="prompt-editor"><textarea class="node-textarea node-interactive" data-prompt-content="${node.id}" placeholder="写下主体、光线、材质和画面文字…">${escapeHtml(node.content || "")}</textarea></div>${quickToolbar}</div></div></div>${resizeHandleHtml(node)}${portHtml(node, "composition", "composition", "input", "参数控制", 104)}${portHtml(node, "prompt", "prompt", "output", "Prompt", 72)}</article>`;
}
function renderCompositionNodeHtml(node, selected, style) {
  return '<article class="canvas-node composition-node' + selected + '" data-node-id="' + node.id + '" style="' + style + '"><div class="node-card">' + nodeHeaderHtml(node, "sliders-horizontal") + '<div class="node-body composition-body">' + compositionControlsHtml(node) + '</div></div>' + resizeHandleHtml(node) + portHtml(node, "composition", "composition", "output", "构图", 72) + '</article>';
}
function renderNoteHtml(node, selected, style) {
  return `<article class="canvas-node note-item${selected}" data-node-id="${node.id}" style="${style}"><div class="note-card"><header class="note-header"><span>${icon("sticky-note")}</span><strong>便签</strong></header><textarea class="note-textarea node-interactive" data-note-content="${node.id}" placeholder="记录你的想法…">${escapeHtml(node.content || "")}</textarea></div>${resizeHandleHtml(node)}</article>`;
}
function nodeCanvasSource(node) { return node?.previewSrc || node?.src || node?.originalSrc || ""; }
function renderImageNodeHtml(node, selected, style) {
  const loading = node.type === "loading";
  const loadingMediaType = loading && node.mediaType === "video" ? "video" : "image";
  const disabled = Boolean(node.disabled);
  const hasSource = Boolean(node.src);
  const isVideoLoading = loading && loadingMediaType === "video";
  const elapsed = formatGenerationDuration(Date.now() - Number(node.generationStartedAt || 0)) || "0秒";
  const loadingStage = runningHubGenerationStageLabel(node.generationStage);
  const actions = loading ? "" : hasSource ? `<button class="icon-button node-interactive" type="button" data-crop-node="${node.id}" aria-label="裁剪参考图" data-tooltip="裁剪参考图">${icon("crop")}</button><button class="icon-button node-interactive" type="button" data-download-node="${node.id}" aria-label="下载图片" data-tooltip="下载图片">${icon("download")}</button>` : `<button class="icon-button node-interactive" type="button" data-upload-node="${node.id}" aria-label="上传图像" data-tooltip="上传图像">${icon("image-plus")}</button>`;
  const toggle = loading ? "" : `<button class="icon-button image-toggle node-interactive${disabled ? " is-disabled" : ""}" type="button" data-toggle-image="${node.id}" aria-label="${disabled ? "启用参考图节点" : "禁用参考图节点"}" title="${disabled ? "启用参考图节点" : "禁用参考图节点"}">${icon(disabled ? "power" : "ban")}</button>`;
  const dimensions = Number(node.imageWidth) > 0 && Number(node.imageHeight) > 0 ? `${node.imageWidth} × ${node.imageHeight}` : "";
  const candidateActions = node.midjourneyCandidate && hasSource
    ? `<div class="midjourney-candidate-actions"><span>选择单图</span>${(node.midjourneySlots || []).map(slot => `<button class="node-interactive" type="button" data-midjourney-upscale="${node.id}" data-midjourney-slot="${slot}"${node.midjourneyActionJobId ? " disabled" : ""}>U${slot}</button>`).join("")}</div>`
    : "";
  const preview = loading
    ? isVideoLoading
      ? `<div class="loading-preview video-loading-preview"><div>${icon("loader-circle")}<span>${escapeHtml(node.source || "海螺 H3 视频")} 生成中</span><strong data-generation-elapsed="${Number(node.generationStartedAt) || Date.now()}">已等待 ${escapeHtml(elapsed)}</strong><small>${escapeHtml(loadingStage)}</small></div></div>`
      : `<div class="loading-preview">${icon("loader-circle")}<span>${escapeHtml(node.source || "生图")} 生成中</span></div>`
    : hasSource ? `<img class="image-preview node-interactive" data-preview-node="${node.id}" src="${escapeHtml(nodeCanvasSource(node))}" alt="${escapeHtml(node.name)}" loading="lazy" draggable="false" decoding="async">` : `<button class="reference-placeholder node-interactive" type="button" data-upload-node="${node.id}">${icon("image-plus")}<strong>上传图像</strong><small>点击选择本地文件</small></button>`;
  return `<article class="canvas-node image-node${loading ? " loading-node" : ""}${disabled ? " is-disabled" : ""}${selected}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, loading ? "loader-circle" : "image", `${actions}${toggle}`, false)}<div class="node-body">
    ${preview}
    ${candidateActions}
    <div class="image-node-meta"><strong>${escapeHtml(node.source || "参考图")}</strong><span>${escapeHtml(dimensions || node.ratio || (hasSource ? "图片" : "未上传"))}</span></div>
    </div></div>${resizeHandleHtml(node)}${(node.generated || node.source === "Image2" || node.source === "Gemini" || loading) ? portHtml(node, "result", loadingMediaType, "input", "Result", 70) : ""}${portHtml(node, loadingMediaType, loadingMediaType, "output", loadingMediaType === "video" ? "Video" : "Image", 70)}</article>`;
}
function generatorPromptPortId(index) { return index === 0 ? "prompt" : `prompt-${index}`; }
// The generator input list begins below the model and image-setting controls.
// Keep connector centers on their corresponding list rows so edges never cross the controls.
function generatorInputPortTop(index) { return 189 + index * 30; }
function generatorPromptPortTop(index) { return generatorInputPortTop(index); }
function generatorImagePortTop(node, index) { return generatorInputPortTop(node.promptSlots + index); }
function renderGeneratorNodeHtml(node, selected, style) {
  if (node.mediaType === "video") return renderVideoGeneratorNodeHtml(node, selected, style);
  const provider = generatorProviderForNode(node);
  const isMoyu = node.provider === "gemini" || node.provider === "moyu";
  const isMidjourney = node.provider === "midjourney";
  const outputOptions = generatorOutputOptions(node);
  const outputSize = normalizeGeneratorOutputSize(node);
  const outputSizeControl = outputOptions.length > 1
    ? `<select class="node-select node-interactive" data-generator-field="outputSize" data-node-id="${node.id}" aria-label="输出尺寸">${outputOptions.map(option => `<option value="${option.value}"${outputSize === option.value ? " selected" : ""}>${option.label}</option>`).join("")}</select>`
    : `<div class="node-static-field">${escapeHtml(outputOptions[0]?.label || "当前最大")}</div>`;
  const batchControl = isMidjourney ? `<div class="node-static-field">四宫格</div>` : `<select class="node-select node-interactive" data-generator-field="batch" data-node-id="${node.id}" aria-label="生成张数">${[1,2,3,4].map(value => `<option value="${value}"${Number(node.batch) === value ? " selected" : ""}>${value}</option>`).join("")}</select>`;
  const outputControl = isMidjourney ? `<div class="node-static-field">结果节点 U1-U4</div>` : outputSizeControl;
  const promptSlots = Array.from({ length: node.promptSlots }, (_, index) => { const edge = incomingEdge(node.id, generatorPromptPortId(index)); const promptNode = findNode(edge?.source); const label = edge ? sourceLabelForEdge(edge) : "未连接"; return `<div class="input-slot${edge ? " is-connected" : ""}${promptNode?.disabled ? " is-disabled" : ""}"><span>${index ? `提示词 ${index + 1}` : "提示词"}</span><span>${escapeHtml(label)}</span></div>`; }).join("");
  const slots = Array.from({ length: node.inputSlots }, (_, index) => { const edge = incomingEdge(node.id, `image-${index}`); const imageNode = findNode(edge?.source); return `<div class="input-slot${edge ? " is-connected" : ""}${imageNode?.disabled ? " is-disabled" : ""}"><span>参考图 ${index + 1}</span><span>${edge ? escapeHtml(sourceLabelForEdge(edge)) : "未连接"}</span></div>`; }).join("");
  const statusLabel = node.status === "running" ? "生成中" : node.lastResultIds?.length ? `${node.lastResultIds.length} 个结果` : "待运行";
  return `<article class="canvas-node generator-node${selected}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, "sparkles")}<div class="node-body generator-body">
    <div class="node-field generator-provider-field"><label>生图模型</label><select class="node-select node-interactive" data-generator-field="providerModel" data-node-id="${node.id}" aria-label="生图模型"><option value="image2"${node.provider === "image2" ? " selected" : ""}>Image2 · GPT Image 2</option>${geminiImageModels.map(item => `<option value="${item.id}"${node.provider === "gemini" && node.geminiModel === item.id ? " selected" : ""}>Gemini · ${item.label}</option>`).join("")}${seedreamImageModels.map(item => `<option value="${item.id}"${node.provider === "moyu" && node.moyuModel === item.id ? " selected" : ""}>豆包 · ${item.label}</option>`).join("")}${midjourneyImageModels.map(item => `<option value="${item.id}"${isMidjourney ? " selected" : ""}>Midjourney · ${item.label}</option>`).join("")}</select></div>
    <div class="node-field-row"><div class="node-field"><label>比例</label><select class="node-select node-interactive" data-generator-field="aspect" data-node-id="${node.id}" aria-label="图像比例">${Object.keys(sizeMap).map(value => `<option value="${value}"${node.aspect === value ? " selected" : ""}>${value}</option>`).join("")}</select></div>
    <div class="node-field"><label>品质</label>${isMoyu || isMidjourney ? `<div class="node-static-field">模型默认</div>` : `<select class="node-select node-interactive" data-generator-field="quality" data-node-id="${node.id}" aria-label="图像品质"><option value="low"${node.quality === "low" ? " selected" : ""}>快速</option><option value="medium"${node.quality === "medium" ? " selected" : ""}>标准</option><option value="high"${node.quality === "high" ? " selected" : ""}>高品质</option></select>`}</div>
    <div class="node-field"><label>${isMidjourney ? "候选图" : "张数"}</label>${batchControl}</div>
    <div class="node-field"><label>${isMidjourney ? "单图输出" : "输出尺寸"}</label>${outputControl}</div></div>
    <div class="generator-inputs">${promptSlots}${slots}</div><div class="generator-add-inputs"><button class="add-input-button node-interactive" type="button" data-add-prompt-input="${node.id}"${node.promptSlots >= 6 ? " disabled" : ""}>${icon("plus")} 添加提示词输入</button><button class="add-input-button node-interactive" type="button" data-add-input="${node.id}"${node.inputSlots >= generatorReferenceLimit(node) ? " disabled" : ""}>${icon("image-plus")} 添加图片输入</button></div>
    <button class="run-node-button node-interactive" type="button" data-run-node="${node.id}"${node.status === "running" ? " disabled" : ""}>${icon(node.status === "running" ? "loader-circle" : "play")} ${node.status === "running" ? `${escapeHtml(provider.label)} 处理中` : `运行 ${escapeHtml(provider.label)}`}</button>
    <div class="node-run-state"><span>${escapeHtml(provider.model)}</span><span class="${node.lastResultIds?.length ? "is-ready" : ""}">${statusLabel}</span></div>
    </div></div>${resizeHandleHtml(node)}${Array.from({ length: node.promptSlots }, (_, index) => portHtml(node, generatorPromptPortId(index), "prompt", "input", index ? `提示词 ${index + 1}` : "提示词", generatorPromptPortTop(index))).join("")}${Array.from({ length: node.inputSlots }, (_, index) => portHtml(node, `image-${index}`, "image", "input", `参考图 ${index + 1}`, generatorImagePortTop(node, index))).join("")}${portHtml(node, "image", "image", "output", "Image", 76)}</article>`;
}
function renderVideoNodeHtml(node, selected, style) {
  const hasSource = Boolean(node.src);
  const generationDuration = formatGenerationDuration(node.generationDurationMs);
  const profileLabel = videoResultProfileLabel(node);
  const videoPreload = selected.includes("is-selected") ? "metadata" : "none";
  const actions = hasSource ? `<button class="icon-button node-interactive" type="button" data-download-node="${node.id}" aria-label="下载视频" data-tooltip="下载视频">${icon("download")}</button>` : "";
  const preview = hasSource
    ? `<video class="video-preview node-interactive" data-preview-video="${node.id}" src="${escapeHtml(nodeCanvasSource(node))}" controls preload="${videoPreload}"></video>`
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
  const frame = videoPreviewFrame(node); const source = videoPreviewSource(node); const connected = Boolean(incomingEdge(node.id, "video")); const actions = frame ? `<button class="icon-button node-interactive" type="button" data-export-preview="${node.id}" aria-label="导出下载视频" data-tooltip="导出下载视频">${icon("download")}</button>` : "";
  const preview = frame ? `<video class="video-preview node-interactive" data-preview-composite="${node.id}" data-preview-editor="${frame.editor.id}" data-preview-clip-id="${escapeHtml(frame.entry.clip.id)}" src="${escapeHtml(frame.source)}" playsinline preload="metadata"></video>` : `<div class="video-preview-empty">${icon("monitor-play")}<strong>${connected ? "等待视频片段" : "等待视频连接"}</strong><span>${connected ? "剪辑节点还没有可预览的片段" : "连接视频剪辑节点后，这里会实时预览时间轴"}</span></div>`;
  return `<article class="canvas-node video-preview-node${selected}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, "monitor-play", actions)}<div class="node-body">${preview}<div class="image-node-meta"><strong>实时成片预览</strong><span>${source ? "已导出 · 可下载" : frame ? "跟随时间轴" : connected ? "等待片段" : "未连接"}</span></div></div></div>${resizeHandleHtml(node)}${portHtml(node, "video", "video", "input", "成片视频", 70)}</article>`;
}
function renderVideoGeneratorNodeHtml(node, selected, style) {
  const dimensions = runningHubVideoDimensions(node);
  const quality = runningHubVideoQuality(node);
  const mode = runningHubVideoMode(node);
  const firstFrameReady = mode.value === "first-frame";
  const firstFrameProfile = runningHubFirstFrameProfile(node);
  const modeNote = firstFrameReady
    ? `首帧生视频：连接的首帧图会上传至 RunningHub 工作流 #60。当前${firstFrameProfile.label}副本固定 16:9、${firstFrameProfile.dimensions.width} × ${firstFrameProfile.dimensions.height}，时长可选 5-15 秒。`
    : `${mode.label}尚未接入对应 RunningHub 工作流，暂不可运行。`;
  const promptSlots = Array.from({ length: node.promptSlots }, (_, index) => { const edge = incomingEdge(node.id, generatorPromptPortId(index)); const promptNode = findNode(edge?.source); const label = edge ? sourceLabelForEdge(edge) : "未连接"; return `<div class="input-slot${edge ? " is-connected" : ""}${promptNode?.disabled ? " is-disabled" : ""}"><span>${index ? `Prompt ${index + 1}` : "Prompt"}</span><span>${escapeHtml(label)}</span></div>`; }).join("");
  const imageSlots = Array.from({ length: node.inputSlots }, (_, index) => { const edge = incomingEdge(node.id, `image-${index}`); const imageNode = findNode(edge?.source); return `<div class="input-slot${edge ? " is-connected" : ""}${imageNode?.disabled ? " is-disabled" : ""}"><span>${escapeHtml(mode.inputs[index] || `参考图 ${index + 1}`)}</span><span>${edge ? escapeHtml(sourceLabelForEdge(edge)) : "未连接"}</span></div>`; }).join("");
  const statusLabel = node.status === "running" ? "生成中" : node.lastError ? "上次生成失败" : node.lastResultIds?.length ? `${node.lastResultIds.length} 个视频` : "待运行";
  return `<article class="canvas-node generator-node video-generator-node${selected}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, "clapperboard", "", true, true)}<div class="node-body generator-body">
    <div class="video-provider-badge"><span>${escapeHtml(runningHubVideoProvider.label)}</span><small>工作流 ${escapeHtml(firstFrameReady ? firstFrameProfile.workflowId : "待接入")} · plus</small></div>
    <div class="node-field"><label>生成方式</label><select class="node-select node-interactive" data-video-field="mode" data-node-id="${node.id}" aria-label="视频生成方式">${runningHubVideoModes.map(option => `<option value="${option.value}"${node.videoMode === option.value ? " selected" : ""}${option.available ? "" : " disabled"}>${option.label}</option>`).join("")}</select></div>
    <div class="node-field-row"><div class="node-field"><label>比例</label>${firstFrameReady ? '<div class="node-static-field">16:9</div>' : `<select class="node-select node-interactive" data-video-field="aspect" data-node-id="${node.id}" aria-label="视频比例">${runningHubVideoAspects.map(value => `<option value="${value}"${node.videoAspect === value ? " selected" : ""}>${value === "auto" ? "自适应" : value}</option>`).join("")}</select>`}</div>
    <div class="node-field"><label>清晰度</label>${firstFrameReady ? `<select class="node-select node-interactive" data-video-field="quality" data-node-id="${node.id}" aria-label="视频清晰度">${Object.values(runningHubFirstFrameProfiles).map(profile => `<option value="${profile.quality}"${node.videoQuality === profile.quality ? " selected" : ""}>${profile.label}</option>`).join("")}</select>` : `<select class="node-select node-interactive" data-video-field="quality" data-node-id="${node.id}" aria-label="视频清晰度">${runningHubVideoQualityOptions.map(option => `<option value="${option.value}"${node.videoQuality === option.value ? " selected" : ""}>${option.label}</option>`).join("")}</select>`}</div></div>
    <div class="node-field-row"><div class="node-field"><label>秒数</label><select class="node-select node-interactive" data-video-field="seconds" data-node-id="${node.id}" aria-label="视频秒数">${Array.from({ length: firstFrameReady ? 11 : 13 }, (_, index) => index + (firstFrameReady ? 5 : 3)).map(value => `<option value="${value}"${Number(node.videoSeconds) === value ? " selected" : ""}>${value} 秒</option>`).join("")}</select></div><div class="node-field"><label>实例</label><div class="node-static-field">API plus · 48G</div></div></div>
    <div class="video-resolution-summary"><span>${escapeHtml(quality.label)}</span><strong>${dimensions.width} × ${dimensions.height}</strong></div>
    <div class="generator-inputs">${promptSlots}${imageSlots}</div>
    <div class="generator-add-inputs"><button class="add-input-button node-interactive" type="button" data-add-prompt-input="${node.id}"${node.promptSlots >= 6 ? " disabled" : ""}>${icon("plus")} 添加提示词输入</button><button class="add-input-button node-interactive" type="button" data-add-input="${node.id}"${node.inputSlots >= generatorReferenceLimit(node) ? " disabled" : ""}>${icon("image-plus")} 添加图片输入</button></div>
    <div class="video-reference-note">${escapeHtml(modeNote)}</div>
    <button class="run-node-button node-interactive" type="button" data-run-node="${node.id}"${node.status === "running" ? " disabled" : ""}>${icon(node.status === "running" ? "loader-circle" : "play")} ${node.status === "running" ? "海螺 H3 处理中" : "运行海螺 H3"}</button>
    <div class="node-run-state"><span>${escapeHtml(runningHubVideoProvider.model)}</span><span class="${node.lastResultIds?.length ? "is-ready" : ""}"${node.lastError ? ` title="${escapeHtml(node.lastError)}"` : ""}>${statusLabel}</span></div>
    </div></div>${resizeHandleHtml(node)}${Array.from({ length: node.promptSlots }, (_, index) => portHtml(node, generatorPromptPortId(index), "prompt", "input", index ? `Prompt ${index + 1}` : "Prompt", 202 + index * 30)).join("")}${Array.from({ length: node.inputSlots }, (_, index) => portHtml(node, `image-${index}`, "image", "input", mode.inputs[index] || `Image ${index + 1}`, 232 + (node.promptSlots - 1) * 30 + index * 30)).join("")}${portHtml(node, "video", "video", "output", "Video", 76)}</article>`;
}
function answerPromptPortId(index) { return index === 0 ? "prompt" : `prompt-${index}`; }
// Keep model input connectors centered on the rows rendered by .answer-inputs.
function answerInputPortTop(index) { return 133 + index * 30; }
function answerPromptPortTop(index) { return answerInputPortTop(index); }
function answerImagePortTop(node, index) { return answerInputPortTop(node.promptSlots + index); }
function renderAnswerNodeHtml(node, selected, style) {
  const promptSlots = Array.from({ length: node.promptSlots }, (_, index) => { const edge = incomingEdge(node.id, answerPromptPortId(index)); const promptNode = findNode(edge?.source); const label = edge ? sourceLabelForEdge(edge) : "未连接"; return `<div class="input-slot${edge ? " is-connected" : ""}${promptNode?.disabled ? " is-disabled" : ""}"><span>${index ? `提示词 ${index + 1}` : "提示词"}</span><span>${escapeHtml(label)}</span></div>`; }).join("");
  const imageSlots = Array.from({ length: node.inputSlots }, (_, index) => { const edge = incomingEdge(node.id, `image-${index}`); const imageNode = findNode(edge?.source); return `<div class="input-slot${edge ? " is-connected" : ""}${imageNode?.disabled ? " is-disabled" : ""}"><span>参考图 ${index + 1}</span><span>${edge ? escapeHtml(sourceLabelForEdge(edge)) : "未连接"}</span></div>`; }).join("");
  const usingH3Skill = node.answerSkill === "minimax-h3";
  const h3Settings = usingH3Skill ? `<div class="node-field answer-skill-field"><label>提示词 Skill</label><select class="node-select node-interactive" data-answer-skill="${node.id}" aria-label="回答 Skill">${answerSkillOptions.map(item => `<option value="${item.value}"${node.answerSkill === item.value ? " selected" : ""}>${item.label}</option>`).join("")}</select></div><div class="node-field-row answer-h3-settings"><div class="node-field"><label>H3 模式</label><select class="node-select node-interactive" data-answer-h3-mode="${node.id}" aria-label="MiniMax H3 模式">${h3AnswerModeOptions.map(item => `<option value="${item.value}"${node.h3Mode === item.value ? " selected" : ""}>${item.label}</option>`).join("")}</select></div><div class="node-field"><label>视频时长</label><select class="node-select node-interactive" data-answer-h3-duration="${node.id}" aria-label="MiniMax H3 视频时长">${Array.from({ length: 13 }, (_, index) => index + 3).map(seconds => `<option value="${seconds}"${node.h3Duration === seconds ? " selected" : ""}>${seconds} 秒</option>`).join("")}</select></div></div><p class="field-note">自动识别：无图为文生视频，1 图为首帧，2 图为首尾帧，3 图及以上为全能多参考。</p>` : `<div class="node-field answer-skill-field"><label>提示词 Skill</label><select class="node-select node-interactive" data-answer-skill="${node.id}" aria-label="回答 Skill">${answerSkillOptions.map(item => `<option value="${item.value}"${node.answerSkill === item.value ? " selected" : ""}>${item.label}</option>`).join("")}</select></div>`;
  const answerText = node.status === "running" ? (usingH3Skill ? "正在生成 MiniMax H3 提示词…" : "模型正在回答…") : node.error ? node.error : node.answer || (usingH3Skill ? "连接提示词和参考图后，将输出可直接用于 MiniMax H3 的视频提示词。" : "连接提示词后，模型回答会显示在这里。");
  const responseClass = node.error ? " is-error" : node.answer ? " is-ready" : "";
  const expandLabel = node.answerExpanded ? "收起回答" : "展开回答";
  return `<article class="canvas-node answer-node${selected}" data-node-id="${node.id}" style="${style}"><div class="node-card">${nodeHeaderHtml(node, "message-square-text")}<div class="node-body answer-body"><div class="node-field answer-model-field"><label>模型</label><select class="node-select node-interactive" data-answer-model="${node.id}" aria-label="回答模型"><option value="gpt-5.5"${node.model === "gpt-5.5" ? " selected" : ""}>GPT-5.5 系列</option><option value="gpt-5.6"${node.model === "gpt-5.6" ? " selected" : ""}>GPT-5.6 系列</option></select></div><div class="answer-inputs">${promptSlots}${imageSlots}</div>${h3Settings}<div class="answer-add-inputs"><button class="add-input-button node-interactive" type="button" data-add-answer-prompt-input="${node.id}"${node.promptSlots >= 6 ? " disabled" : ""}>${icon("plus")} 添加提示词输入</button><button class="add-input-button node-interactive" type="button" data-add-answer-image-input="${node.id}"${node.inputSlots >= 8 ? " disabled" : ""}>${icon("image-plus")} 添加参考图输入</button></div><button class="run-node-button node-interactive" type="button" data-run-answer="${node.id}"${node.status === "running" ? " disabled" : ""}>${icon(node.status === "running" ? "loader-circle" : "send-horizontal")} ${node.status === "running" ? (usingH3Skill ? "生成中" : "回答中") : (usingH3Skill ? "生成 H3 提示词" : "请求回答")}</button><div class="answer-response-wrap${node.answerExpanded ? " is-expanded" : ""}"><div class="answer-response-heading"><span>回答内容</span><span class="answer-response-actions"><button class="answer-response-toggle node-interactive" type="button" data-copy-answer="${node.id}" aria-label="复制回答" data-tooltip="复制回答">${icon("copy")}</button><button class="answer-response-toggle node-interactive" type="button" data-toggle-answer-response="${node.id}" aria-label="${expandLabel}">${icon(node.answerExpanded ? "chevron-up" : "chevron-down")} ${expandLabel}</button></span></div><div class="answer-response node-interactive${responseClass}" data-answer-selectable="${node.id}">${escapeHtml(answerText)}</div></div></div></div>${resizeHandleHtml(node)}${Array.from({ length: node.promptSlots }, (_, index) => portHtml(node, answerPromptPortId(index), "prompt", "input", index ? `提示词 ${index + 1}` : "提示词", answerPromptPortTop(index))).join("")}${Array.from({ length: node.inputSlots }, (_, index) => portHtml(node, `image-${index}`, "image", "input", `参考图 ${index + 1}`, answerImagePortTop(node, index))).join("")}</article>`;
}

function bindNodeEvents() {
  $$('[data-answer-selectable]').forEach(element => { element.tabIndex = 0; });
  $$(".canvas-node").forEach(element => element.addEventListener("pointerdown", handleNodePointerDown));
  $$('[data-node-drag-handle]').forEach(handle => handle.addEventListener("pointerdown", event => { if (event.target.closest(".node-interactive, .node-port")) return; event.preventDefault(); event.stopPropagation(); startNodeDrag(event, handle.dataset.nodeDragHandle); }));
  $$('[data-node-resize]').forEach(handle => handle.addEventListener("pointerdown", startResize));
  $$('[data-download-node]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); const node = findNode(button.dataset.downloadNode); if (node) downloadNode(node); }));
  $$('[data-crop-node]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); openCropDialog(button.dataset.cropNode); }));
  $$('[data-midjourney-upscale]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); void upscaleMidjourneyCandidate(button.dataset.midjourneyUpscale, Number(button.dataset.midjourneySlot)); }));
  $$('[data-import-video]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); pendingVideoImportNodeId = button.dataset.importVideo; videoFileInput.value = ""; videoFileInput.click(); }));
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
  $$('[data-toggle-prompt]').forEach(button => button.addEventListener("click", event => { event.stopPropagation(); const node = findNode(button.dataset.togglePrompt); if (!node || node.type !== "prompt") return; recordHistory(); node.disabled = !node.disabled; renderCanvas(); renderInspector(); scheduleSave(); toast(node.disabled ? "提示词节点已禁用" : "提示词节点已启用"); }));
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
  $$('[data-prompt-content]').forEach(textarea => {
    textarea.addEventListener("select", () => rememberPromptQuickSelection(textarea.dataset.promptContent));
    textarea.addEventListener("keyup", () => rememberPromptQuickSelection(textarea.dataset.promptContent));
    textarea.addEventListener("mouseup", () => rememberPromptQuickSelection(textarea.dataset.promptContent));
    textarea.addEventListener("focus", () => rememberPromptQuickSelection(textarea.dataset.promptContent));
    textarea.addEventListener("input", event => { const node = findNode(textarea.dataset.promptContent); if (node) { node.content = event.target.value; node.promptPresetId = ""; rememberPromptQuickSelection(node.id); scheduleSave(); } });
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
    recordHistory(); const field = control.dataset.videoField;
    if (field === "seconds") node.videoSeconds = Math.min(15, Math.max(node.videoMode === "first-frame" ? 5 : 3, Number(event.target.value) || 6));
    else if (field === "mode") { node.videoMode = runningHubVideoMode({ videoMode: event.target.value }).value; if (node.videoMode === "first-frame") { node.videoAspect = "16:9"; node.videoQuality = "standard"; node.videoSeconds = Math.max(5, Number(node.videoSeconds) || 6); } const limit = generatorReferenceLimit(node); node.inputSlots = limit ? Math.min(limit, Math.max(node.videoMode === "first-last-frame" ? 2 : 1, Number(node.inputSlots) || 1)) : 0; state.edges = state.edges.filter(edge => edge.target !== node.id || edge.type !== "image" || Number(edge.targetPort.split("-")[1]) < node.inputSlots); node.height = nodeHeight("video-generator", node.inputSlots, node.promptSlots); }
    else if (field === "aspect") node.videoAspect = runningHubVideoAspects.includes(event.target.value) ? event.target.value : "16:9";
    else if (field === "quality") node.videoQuality = node.videoMode === "first-frame" && event.target.value === "clear" ? "clear" : (runningHubVideoQualityOptions.some(item => item.value === event.target.value) ? event.target.value : "standard");
    renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$('[data-generator-field]').forEach(control => control.addEventListener("change", event => {
    const node = findNode(control.dataset.nodeId); if (!node) return; recordHistory();
    const field = control.dataset.generatorField;
    if (field === "providerModel") {
      const selection = event.target.value;
      node.provider = selection === "image2" ? "image2" : midjourneyImageModels.some(item => item.id === selection) ? "midjourney" : geminiImageModels.some(item => item.id === selection) ? "gemini" : "moyu";
      if (node.provider === "gemini") node.geminiModel = geminiImageModels.some(item => item.id === selection) ? selection : geminiImageModels[0].id;
      if (node.provider === "moyu") node.moyuModel = seedreamImageModels.some(item => item.id === selection) ? selection : seedreamImageModels[0].id;
      node.outputSize = normalizeGeneratorOutputSize(node);
      const provider = generatorProviderForNode(node);
      if (["GPT Image 2", "Gemini Image", "豆包 Seedream", "Midjourney Fast", "生图"].includes(node.name)) node.name = node.provider === "gemini" ? "Gemini Image" : node.provider === "moyu" ? "豆包 Seedream" : node.provider === "midjourney" ? "Midjourney Fast" : "GPT Image 2";
      toast(`已切换为 ${provider.label} · ${provider.model}`);
    } else node[field] = field === "batch" ? Number(event.target.value) : event.target.value;
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
  $$("[data-answer-model]").forEach(control => control.addEventListener("change", event => { const node = findNode(control.dataset.answerModel); if (!node || node.type !== "answer") return; recordHistory(); node.model = event.target.value; renderInspector(); scheduleSave(); }));
  $$("[data-answer-skill]").forEach(control => control.addEventListener("change", event => {
    event.stopPropagation(); const node = findNode(control.dataset.answerSkill); if (!node || node.type !== "answer") return;
    recordHistory(); const previous = node.answerSkill === "minimax-h3"; node.answerSkill = normalizedAnswerSkill(event.target.value); node.height = Math.max(answerNodeHeight(node), (Number(node.height) || answerNodeHeight(node)) + (node.answerSkill === "minimax-h3" && !previous ? 112 : node.answerSkill === "none" && previous ? -112 : 0)); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$("[data-answer-h3-mode]").forEach(control => control.addEventListener("change", event => {
    event.stopPropagation(); const node = findNode(control.dataset.answerH3Mode); if (!node || node.type !== "answer") return;
    recordHistory(); node.h3Mode = normalizedH3AnswerMode(event.target.value); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$("[data-answer-h3-duration]").forEach(control => control.addEventListener("change", event => {
    event.stopPropagation(); const node = findNode(control.dataset.answerH3Duration); if (!node || node.type !== "answer") return;
    recordHistory(); node.h3Duration = normalizedH3Duration(event.target.value); renderCanvas(); renderInspector(); scheduleSave();
  }));
  $$("[data-upload-node]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); triggerReferenceUpload(button.dataset.uploadNode); }));
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
  const elements = movingIds.map(id => ({ id, element: nodeLayer.querySelector(`[data-node-id="${CSS.escape(id)}"]`) })).filter(item => item.element);
  dragSession = { start: point, moved: false, before: snapshot(), origins: movingIds.map(id => { const item = findNode(id); return { id, x: item.x, y: item.y }; }), elements, elementById: new Map(elements.map(item => [item.id, item.element])) };
  workspace.classList.add("is-flow-interacting"); dragSession.elements.forEach(item => { item.element.classList.add("is-dragging"); item.element.style.willChange = "transform"; });
}
function resizeMinimum(node) {
  if (node.type === "frame") return { width: 320, height: 220 };
  if (node.type === "generator") return { width: 300, height: 250 };
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
  selectNode(node.id); const point = screenToScene(event.clientX, event.clientY); const corner = event.currentTarget.dataset.nodeResizeCorner || "se"; resizeSession = { nodeId: node.id, corner, start: point, moved: false, before: snapshot(), origin: { x: node.x, y: node.y, width: node.width, height: node.height }, element: nodeLayer.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`) };
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
  if (state.edges.some(edge => edge.source === output.nodeId && edge.sourcePort === output.portId && edge.target === input.nodeId && edge.targetPort === input.portId)) return;
  if (trackHistory) recordHistory(); state.edges = state.edges.filter(edge => !(edge.target === input.nodeId && edge.targetPort === input.portId));
  state.edges.push({ id: uid("edge"), source: output.nodeId, sourcePort: output.portId, target: input.nodeId, targetPort: input.portId, type: output.dataType }); if (output.dataType === "composition") applyCompositionToLinkedPrompts(output.nodeId); syncAllVideoEditorClips(); selectedEdgeId = null; scheduleSave();
}
function handlePointerMove(event) {
  if (handleScriptPointerMove(event)) return;
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
  if (finishScriptPointerUp(event)) return;
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
    dragSession.elements.forEach(item => { const node = findNode(item.id); if (item.element && node) { item.element.style.left = `${node.x}px`; item.element.style.top = `${node.y}px`; item.element.style.transform = ""; item.element.style.willChange = ""; item.element.classList.remove("is-dragging"); } });
    if (dragSession.moved) { undoStack.push(dragSession.before); if (undoStack.length > 18) undoStack.shift(); redoStack = []; scheduleSave(); }
    const movedFrame = dragSession.origins.some(origin => findNode(origin.id)?.type === "frame");
    const movedFrames = dragSession.origins.map(origin => findNode(origin.id)).filter(node => node?.type === "frame");
    dragSession = null;
    // Moving a frame already updates its children in-place. Refresh only the count label;
    // rebuilding the canvas would recreate every video element in the group.
    if (movedFrame) movedFrames.forEach(updateFrameMetaDom);
    renderLibrary(); renderInspector(); updateHistoryButtons();
  }
}
function handleWheel(event) {
  if (event.target instanceof Element && event.target.closest(".answer-response, .prompt-node .node-textarea")) return;
  event.preventDefault(); const rect = workspace.getBoundingClientRect(); const mouseX = event.clientX - rect.left; const mouseY = event.clientY - rect.top;
  const beforeX = (mouseX - state.viewport.x) / state.viewport.scale; const beforeY = (mouseY - state.viewport.y) / state.viewport.scale;
  const nextScale = Math.min(WORKFLOW_ZOOM_MAX, Math.max(WORKFLOW_ZOOM_MIN, state.viewport.scale * Math.exp(-event.deltaY * 0.0015)));
  state.viewport.x = mouseX - beforeX * nextScale; state.viewport.y = mouseY - beforeY * nextScale; state.viewport.scale = nextScale; updateViewport(); scheduleSave();
}
function handleScriptWheel(event) {
  event.preventDefault();
  const rect = scriptFlowStage.getBoundingClientRect(); const mouseX = event.clientX - rect.left; const mouseY = event.clientY - rect.top;
  const viewport = scriptViewport(); const beforeX = (mouseX - viewport.x) / viewport.scale; const beforeY = (mouseY - viewport.y) / viewport.scale;
  const nextScale = Math.min(SCRIPT_ZOOM_MAX, Math.max(SCRIPT_ZOOM_MIN, viewport.scale * Math.exp(-event.deltaY * 0.0015)));
  viewport.x = mouseX - beforeX * nextScale; viewport.y = mouseY - beforeY * nextScale; viewport.scale = nextScale; updateScriptViewport(); scheduleSave();
}
function updateViewport() { if (!state) return; canvasScene.style.transform = `translate(${state.viewport.x}px, ${state.viewport.y}px) scale(${state.viewport.scale})`; canvasScene.getBoundingClientRect(); if (state.flowMode !== "script") $("#zoomButton").textContent = `${Math.round(state.viewport.scale * 100)}%`; }
function fitScriptContent() {
  const flow = ensureScriptFlow(); const rect = scriptFlowStage.getBoundingClientRect(); const viewport = scriptViewport();
  const bounds = [...flow.characters.map(role => ({ x: role.x, y: role.y, width: 148, height: 183 })), ...flow.storyCards.map(card => ({ x: card.x, y: card.y, width: card.width, height: card.height })), ...flow.storyFrames.map(frame => ({ x: frame.x, y: frame.y, width: frame.width, height: frame.height }))];
  bounds.push(...(flow.emotionBoards || []).map(board => ({ x: board.x, y: board.y, width: board.width, height: board.height })), ...(flow.characterArcs || []).map(arc => ({ x: arc.x, y: arc.y, width: arc.width, height: arc.height })), ...(flow.characterGoals || []).map(goal => ({ x: goal.x, y: goal.y, width: goal.width, height: goal.height })), ...(flow.aiAssistants || []).map(assistant => ({ x: assistant.x, y: assistant.y, width: assistant.width, height: assistant.height })), ...(flow.scriptNotes || []).map(note => ({ x: note.x, y: note.y, width: note.width, height: note.height })));
  if (!bounds.length) { viewport.x = 0; viewport.y = 0; viewport.scale = 1; updateScriptViewport(); scheduleSave(); return; }
  const minX = Math.min(...bounds.map(item => item.x)); const minY = Math.min(...bounds.map(item => item.y)); const maxX = Math.max(...bounds.map(item => item.x + item.width)); const maxY = Math.max(...bounds.map(item => item.y + item.height));
  const width = Math.max(148, maxX - minX); const height = Math.max(183, maxY - minY); const scale = Math.min(1.4, Math.max(SCRIPT_ZOOM_MIN, Math.min((rect.width - 180) / width, (rect.height - 150) / height)));
  viewport.scale = scale; viewport.x = rect.width / 2 - (minX + width / 2) * scale; viewport.y = rect.height / 2 - (minY + height / 2) * scale; updateScriptViewport(); scheduleSave();
}
function fitContent() {
  if (state?.flowMode === "script") return fitScriptContent();
  if (!state?.nodes.length) return; const rect = workspace.getBoundingClientRect();
  const minX = Math.min(...state.nodes.map(node => node.x)); const minY = Math.min(...state.nodes.map(node => node.y));
  const maxX = Math.max(...state.nodes.map(node => node.x + node.width)); const maxY = Math.max(...state.nodes.map(node => node.y + node.height));
  const width = Math.max(100, maxX - minX); const height = Math.max(100, maxY - minY);
  const scale = Math.min(1, Math.max(WORKFLOW_ZOOM_MIN, Math.min((rect.width - 150) / width, (rect.height - 135) / height)));
  state.viewport.scale = scale; state.viewport.x = rect.width / 2 - (minX + width / 2) * scale; state.viewport.y = rect.height / 2 - (minY + height / 2) * scale - 15; updateViewport(); scheduleSave();
}function addNode(type) {
  const center = sceneCenter(); recordHistory(); let node;
  if (type === "prompt") node = createPromptNode(Math.round(center.x - 160), Math.round(center.y - 145));
  if (type === "generator") node = createGeneratorNode(Math.round(center.x - 180), Math.round(center.y - 180));
  if (type === "video") node = createVideoNode(Math.round(center.x - 195), Math.round(center.y - 235));
  if (type === "video-editor") node = createVideoEditorNode(Math.round(center.x - 340), Math.round(center.y - 195));
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
  if (state?.flowMode === "script") return renderScriptLibrary();
  if (state.libraryTab === "assets") return renderAssetsLibrary(); if (state.libraryTab === "history") return renderHistoryLibrary();
  const counts = type => state.nodes.filter(node => node.type === type).length;
  libraryContent.innerHTML = `<div class="section-label"><span>创建模块</span><span>${state.nodes.filter(node => node.type !== "frame").length}</span></div><div class="module-list">
    <button class="module-item" type="button" data-library-add="prompt"><span class="module-icon prompt">${icon("text-cursor-input")}</span><span class="module-copy"><strong>提示词</strong><small>输出 Prompt 文本</small></span></button><button class="module-item" type="button" data-library-add="composition"><span class="module-icon composition">${icon("sliders-horizontal")}</span><span class="module-copy"><strong>参数控制</strong><small>透视、地平线与摄影参数</small></span></button>
    <button class="module-item" type="button" data-library-image><span class="module-icon image">${icon("image-plus")}</span><span class="module-copy"><strong>参考图</strong><small>输出 Image 图像</small></span></button>
    <button class="module-item" type="button" data-library-add="generator"><span class="module-icon generator">${icon("sparkles")}</span><span class="module-copy"><strong>生图</strong><small>Image2 / Gemini / Seedream / Midjourney</small></span></button>
    <button class="module-item" type="button" data-library-add="video"><span class="module-icon video">${icon("clapperboard")}</span><span class="module-copy"><strong>视频</strong><small>海螺 H3 · API plus · MP4</small></span></button>
    <button class="module-item" type="button" data-library-add="video-editor"><span class="module-icon video">${icon("scissors")}</span><span class="module-copy"><strong>视频剪辑</strong><small>多段裁切、排序与合成预览</small></span></button>
    <button class="module-item" type="button" data-library-add="video-preview"><span class="module-icon video">${icon("monitor-play")}</span><span class="module-copy"><strong>成片预览</strong><small>播放并下载合成视频</small></span></button>
    <button class="module-item" type="button" data-library-add="answer"><span class="module-icon answer">${icon("message-square-text")}</span><span class="module-copy"><strong>模型回答</strong><small>最多 6 条提示词 · 8 张参考图</small></span></button>
    </div><div class="section-label"><span>当前结构</span><span>${state.edges.length} 条连接</span></div><div class="summary-row"><span>提示词模块</span><strong>${counts("prompt")}</strong></div><div class="summary-row"><span>参数控制</span><strong>${counts("composition")}</strong></div><div class="summary-row"><span>图像模块</span><strong>${counts("image")}</strong></div><div class="summary-row"><span>生图模块</span><strong>${counts("generator")}</strong></div><div class="summary-row"><span>模型回答</span><strong>${counts("answer")}</strong></div>`;
  $$('[data-library-add]').forEach(button => button.addEventListener("click", () => addNode(button.dataset.libraryAdd))); $("[data-library-image]")?.addEventListener("click", () => imageFileInput.click()); refreshIcons();
}
function assetRowHtml(node) { const selected = state.selectedIds.includes(node.id); const thumb = node.src ? node.type === "video" ? `<video class="asset-thumb" src="${escapeHtml(nodeDisplaySource(node))}" muted preload="${selected ? "metadata" : "none"}"></video>` : `<img class="asset-thumb" src="${escapeHtml(nodeDisplaySource(node))}" alt="" loading="lazy" decoding="async">` : `<span class="asset-thumb asset-thumb-empty">${icon("image-plus")}</span>`; const outputType = node.type === "video" ? (node.outputType || "mp4") : (node.ratio || (node.src ? "图片" : "未上传")); return `<button class="asset-row${selected ? " is-selected" : ""}" type="button" data-select-node="${node.id}">${thumb}<span class="asset-copy"><strong>${escapeHtml(node.name)}</strong><small>${escapeHtml(node.source || "素材")} · ${escapeHtml(outputType)}</small></span><span class="asset-kind">${outgoingEdges(node.id, node.type === "video" ? "video" : "image").length} 链接</span></button>`; }
function renderAssetsLibrary() { const images = state.nodes.filter(node => ["image", "video"].includes(node.type)); libraryContent.innerHTML = `<div class="section-label"><span>素材与视频</span><span>${images.length}</span></div>${images.map(assetRowHtml).join("") || emptyHtml("images", "尚未导入图像或视频")}`; bindLibraryRows(); }
function renderHistoryLibrary() { const recent = state.recentIds.map(findNode).filter(node => node && ["image", "video"].includes(node.type)); libraryContent.innerHTML = `<div class="section-label"><span>生成结果</span><span>${recent.length}</span></div>${recent.map(assetRowHtml).join("") || emptyHtml("history", "还没有运行记录")}`; bindLibraryRows(); }
function emptyHtml(iconName, message) { return `<div class="empty-state">${icon(iconName)}<p>${escapeHtml(message)}</p></div>`; }
function bindLibraryRows() { $$('[data-select-node]').forEach(button => button.addEventListener("click", () => { selectNode(button.dataset.selectNode); focusNode(button.dataset.selectNode); $("#libraryPanel").classList.remove("is-open"); })); refreshIcons(); }
function focusNode(id) { const node = findNode(id); if (!node) return; const rect = workspace.getBoundingClientRect(); state.viewport.x = rect.width / 2 - (node.x + node.width / 2) * state.viewport.scale; state.viewport.y = rect.height / 2 - (node.y + node.height / 2) * state.viewport.scale; updateViewport(); }
function renderInspector() {
  if (state?.flowMode === "script") return renderScriptInspector();
  if (selectedEdgeId) return renderEdgeInspector(); const selectedNodes = state.selectedIds.map(findNode).filter(Boolean); if (selectedNodes.length > 1) return renderMultiSelectionInspector(selectedNodes); const node = selectedNode(); if (node) return renderNodeInspector(node);
  $("#inspectorEyebrow").textContent = "PROJECT"; $("#inspectorTitle").textContent = "工作流概览";
  const prompts = state.nodes.filter(node => node.type === "prompt").length; const compositions = state.nodes.filter(node => node.type === "composition").length; const images = state.nodes.filter(node => node.type === "image").length; const videos = state.nodes.filter(node => node.type === "video").length; const generators = state.nodes.filter(node => node.type === "generator").length; const answers = state.nodes.filter(node => node.type === "answer").length;
  inspectorContent.innerHTML = `<section class="control-section"><div class="control-title">项目结构 <span>${state.edges.length} 条连接</span></div><div class="summary-row"><span>提示词</span><strong>${prompts}</strong></div><div class="summary-row"><span>参数控制</span><strong>${compositions}</strong></div><div class="summary-row"><span>图像素材</span><strong>${images}</strong></div><div class="summary-row"><span>视频结果</span><strong>${videos}</strong></div><div class="summary-row"><span>生图</span><strong>${generators}</strong></div><div class="summary-row"><span>模型回答</span><strong>${answers}</strong></div></section>
    <section class="control-section"><div class="control-title">数据流</div><div class="edge-summary"><span class="edge-swatch prompt"></span><span>Prompt 文本连接</span></div><div class="edge-summary"><span class="edge-swatch composition"></span><span>参数控制连接</span></div><div class="edge-summary"><span class="edge-swatch"></span><span>Image 图像连接</span></div><div class="edge-summary"><span class="edge-swatch video"></span><span>Video 视频连接</span></div></section>
    <section class="control-section"><div class="control-title">界面基调 <span>${themeLabels[state.theme]}</span></div><div class="settings-theme-switch">${themeButtonsHtml()}</div></section>`;
  bindInspectorThemeButtons(); refreshIcons();
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
  if (node.type === "video-preview") specific = `<div class="summary-row"><span>输入连接</span><strong>${incoming}</strong></div><div class="summary-row"><span>预览状态</span><strong>${videoPreviewFrame(node) ? "实时预览" : "等待连接"}</strong></div><div class="summary-row"><span>导出状态</span><strong>${videoPreviewSource(node) ? "已导出" : "按需导出"}</strong></div>`;
  if (node.type === "generator" && node.mediaType !== "video") { const imageInputs = state.edges.filter(edge => edge.target === node.id && edge.type === "image").length; const provider = generatorProviderForNode(node); specific = `<div class="summary-row"><span>模型</span><strong>${provider.model}</strong></div><div class="summary-row"><span>提示词</span><strong>${incomingEdge(node.id, "prompt") ? "已连接" : "未连接"}</strong></div><div class="summary-row"><span>参考图</span><strong>${imageInputs}/${node.inputSlots}</strong></div><div class="summary-row"><span>输出结果</span><strong>${node.lastResultIds?.length || 0}</strong></div>`; }
  if (node.mediaType === "video") { const dimensions = runningHubVideoDimensions(node); specific = `<div class="summary-row"><span>模型</span><strong>${runningHubVideoProvider.model}</strong></div><div class="summary-row"><span>生成方式</span><strong>${runningHubVideoMode(node).label}</strong></div><div class="summary-row"><span>提示词</span><strong>${incomingEdge(node.id, "prompt") ? "已连接" : "未连接"}</strong></div><div class="summary-row"><span>清晰度</span><strong>${runningHubVideoQuality(node).label}</strong></div><div class="summary-row"><span>尺寸</span><strong>${dimensions.width} × ${dimensions.height}</strong></div><div class="summary-row"><span>时长</span><strong>${node.videoSeconds} 秒</strong></div><div class="summary-row"><span>输出结果</span><strong>${node.lastResultIds?.length || 0}</strong></div>${node.lastError ? `<div class="summary-row"><span>最近错误</span><strong>${escapeHtml(node.lastError)}</strong></div>` : ""}`; }
  if (node.type === "frame") { const contained = frameContainedNodes(node).length; specific = `<div class="summary-row"><span>包含节点</span><strong>${contained}</strong></div><div class="summary-row"><span>画板尺寸</span><strong>${Math.round(node.width)} × ${Math.round(node.height)}</strong></div><p class="field-note">把节点拖入虚线范围后，拖动画板边框即可整体移动这些节点。右下角手柄可以调整画板大小。</p>`; }
  inspectorContent.innerHTML = `<section class="control-section"><div class="control-title">名称</div><input class="text-input" id="nodeNameInput" value="${escapeHtml(node.name)}"></section><section class="control-section">${specific}</section><section class="control-section"><div class="action-list">${node.type === "generator" ? `<button class="action-row" type="button" data-inspector-action="run">${icon("play")}<strong>运行此节点</strong><small>${node.mediaType === "video" ? "MP4 视频" : `${node.batch} 张`}</small></button>` : ""}${node.type === "video-editor" ? `<button class="action-row" type="button" data-inspector-action="import-video">${icon("video")}<strong>导入视频</strong><small>保存到本机 E 盘</small></button>` : ""}${node.type === "image" ? (node.src ? `<button class="action-row" type="button" data-inspector-action="download">${icon("download")}<strong>下载图片</strong><small>原始文件</small></button>` : `<button class="action-row" type="button" data-inspector-action="upload">${icon("image-plus")}<strong>上传图像</strong><small>本地参考图</small></button>`) : ""}${(node.type === "video" && node.src) || (node.type === "video-preview" && videoPreviewFrame(node)) ? `<button class="action-row" type="button" data-inspector-action="download">${icon("download")}<strong>${node.type === "video-preview" ? "导出并下载视频" : "下载视频"}</strong><small>${node.type === "video-preview" ? "按需生成 MP4" : escapeHtml(node.outputType || "mp4")}</small></button>` : ""}${node.type === "image" && generatedImageFilename(node.src) ? `<button class="action-row danger-action" type="button" data-inspector-action="delete-generated-file">${icon("trash-2")}<strong>同步删除生成文件</strong><small>删除画布节点与本地图片，不可撤销</small></button>` : ""}<button class="action-row" type="button" data-inspector-action="duplicate">${icon("copy")}<strong>复制模块</strong><small>保留当前参数</small></button><button class="action-row danger-action" type="button" data-inspector-action="delete">${icon("trash-2")}<strong>删除模块</strong><small>仅删除画布节点，保留本地文件</small></button></div></section>`;
  $("#nodeNameInput").addEventListener("change", event => { const value = event.target.value.trim(); if (!value || value === node.name) return; recordHistory(); node.name = value; renderCanvas(); renderLibrary(); scheduleSave(); });
  $$("#inspectorContent [data-upload-node]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); triggerReferenceUpload(button.dataset.uploadNode); }));
   $$('[data-inspector-action]').forEach(button => button.addEventListener("click", () => { const action = button.dataset.inspectorAction; if (action === "run") runGeneratorNode(node.id); if (action === "upload") triggerReferenceUpload(node.id); if (action === "import-video") { pendingVideoImportNodeId = node.id; videoFileInput.value = ""; videoFileInput.click(); } if (action === "download") { if (node.type === "video-preview") void exportVideoPreview(node.id); else downloadNode(node); } if (action === "delete-generated-file") void deleteGeneratedImageNodeWithFile(node.id); if (action === "duplicate") duplicateSelected(); if (action === "delete") deleteSelection(); }));
  refreshIcons();
}
async function handleCanvasPaste(event) {
  const target = event.target instanceof Element ? event.target : null;
  const isEditable = Boolean(target?.matches("input, textarea, select, [contenteditable=true]"));
  if (!state || isEditable) return;
  const imageFiles = [...(event.clipboardData?.items || [])]
    .filter(item => item.kind === "file" && /^image\/(png|jpeg|webp)$/i.test(item.type))
    .map(item => item.getAsFile())
    .filter(Boolean);
  if (imageFiles.length) {
    event.preventDefault();
    if (state.flowMode === "script") return toast("请切换到工作流画布粘贴图片", true);
    try { await importImages(imageFiles, { source: "剪贴板", placeAtViewport: true }); }
    catch (error) { toast(`粘贴图片失败：${error?.message || "无法保存图片"}`, true); }
    return;
  }
  event.preventDefault();
  if (state.flowMode === "script") pasteScriptSelection();
  else pasteWorkflowSelection();
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
    for (const file of accepted.slice(0, 24)) {
      const result = await requestJson("/api/video-assets", { method: "POST", headers: { "Content-Type": file.type || "video/mp4", "x-file-name": encodeURIComponent(file.name || "导入视频.mp4") }, body: file }, 10 * 60_000);
      imported.push({ id: uid("clip"), name: (file.name || "导入视频").replace(/\.[^.]+$/, ""), src: result.url, start: 0, end: 0, duration: 0, origin: "imported" });
    }
    if (!imported.length) return;
    recordHistory(); editor.clips.push(...imported); editor.status = "idle"; editor.outputSrc = ""; editor.lastError = ""; state.selectedIds = [editor.id];
    renderWorkspace(); scheduleSave(); toast(`已导入 ${imported.length} 条视频`);
  } catch (error) { toast(error?.message || "视频导入失败", true); }
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
  const preview = findNode(nodeId); const frame = videoPreviewFrame(preview); if (!frame) return toast("请先连接视频剪辑节点", true);
  if (frame.editor.outputSrc) return downloadNode({ ...preview, type: "video-preview" });
  const response = await composeVideoEditor(frame.editor.id); if (response?.url) downloadNode({ ...preview, type: "video-preview" });
}
function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
function createPreviewDataUrl(source, maxSize = 720) {
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
      resolve(canvas.toDataURL("image/jpeg", .82));
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
function nodeDisplaySource(node) { return node?.previewSrc || node?.src || ""; }
function imageSourceFromNode(node) {
  if (!node || node.disabled) return ""; if (node.type === "image") return node.originalSrc || node.src || "";
  if (node.type === "generator") { const result = node.lastResultIds?.map(findNode).find(item => item?.src); return result?.src || ""; }
  return "";
}
async function requestJson(url, options = {}, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `请求失败 (${response.status})`);
    return result;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("请求超时，请确认本机桌面应用仍在运行");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
async function openGeneratedFolder() {
  try {
    await requestJson("/api/generated/open-folder", { method: "POST" }, 10_000);
    toast("已请求 Windows 打开生成图片文件夹");
  } catch (error) {
    toast(error?.message || "无法打开生成图片文件夹", true);
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
  const placeholders = Array.from({ length: count }, (_, index) => ({ id: uid("result"), type: "loading", mediaType: isVideo ? "video" : "image", generationJobId: jobId, generationStartedAt: Number(generationStartedAt) || Date.now(), generationStage: isVideo ? "" : undefined, videoQuality: isVideo ? generator.videoQuality : undefined, name: `${modelLabel} 结果 ${index + 1}`, x: generator.x + generator.width + 190 + (index % columns) * 310, y: generator.y + Math.floor(index / columns) * 360, width: 270, height: nodeHeight("loading"), source: provider.label, model: modelId, modelLabel, ratio: isVideo ? `${runningHubVideoDimensions(generator).width}:${runningHubVideoDimensions(generator).height}` : generator.aspect, outputType: isVideo ? "mp4" : "png", createdAt: Date.now() + index }));
  state.nodes.push(...placeholders);
  placeholders.forEach(node => state.edges.push({ id: uid("edge"), source: generator.id, sourcePort: isVideo ? "video" : "image", target: node.id, targetPort: "result", type: isVideo ? "video" : "image" }));
  return placeholders;
}
function finishGenerationJob(generatorId, job) {
  const generator = findNode(generatorId);
  if (!generator || generator.activeJobId !== job.id) return;
  const placeholders = ensureGenerationPlaceholders(generator, job.id, job.imageCount, job.model, job.startedAt || job.createdAt);
  const provider = ["gemini", "moyu"].includes(job.provider)
    ? { ...generatorProviders[job.provider], model: job.model || generatorProviders[job.provider].model }
    : generatorProviderForNode(generator);
  const modelLabel = generatorModelLabel(job.model || provider.model, provider.label);
  if (job.status === "succeeded") {
    const createdIds = [];
    const isVideo = generator.mediaType === "video" || job.provider === "runninghub-h3";
    const videoProfile = isVideo ? runningHubFirstFrameProfile({ videoQuality: job.videoQuality || generator.videoQuality }) : null;
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
      Object.assign(node, { type: isVideo ? "video" : "image", mediaType: isVideo ? "video" : "image", generationJobId: undefined, generationStage: undefined, name: `${modelLabel}${mjSlot ? ` · U${mjSlot}` : ""} · ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} · ${index + 1}`, src: image.url, source: provider.label, model: job.model || provider.model, modelLabel, outputType: image.outputType || (isVideo ? "mp4" : "png"), imageWidth: image.width || undefined, imageHeight: image.height || undefined, midjourneyCandidate: isMjCandidate, midjourneyJobId: isMjCandidate ? job.id : undefined, midjourneySlots: isMjCandidate ? job.midjourney.slots || [] : undefined, videoQuality: isVideo ? videoProfile.quality : undefined, videoWidth: isVideo ? videoProfile.dimensions.width : undefined, videoHeight: isVideo ? videoProfile.dimensions.height : undefined, generationDurationMs: isVideo ? generationDurationMs : undefined, generated: true, prompt: generator.activePrompt || "", revisedPrompt: image.revisedPrompt || "" });
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
    if (job.status === "succeeded" || job.status === "failed") return finishGenerationJob(generatorId, job);
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
  if (!state) return;
  const active = state.nodes.filter(node => node.type === "generator" && node.activeJobId);
  active.forEach(generator => {
    generator.status = "running";
    pollGenerationJob(generator.id, generator.activeJobId);
  });
  state.nodes.filter(node => node.midjourneyCandidate && node.midjourneyActionJobId && node.midjourneyActionJobId !== "pending").forEach(node => pollMidjourneyUpscale(node.id, node.midjourneyActionJobId));
}
async function runGeneratorNode(nodeId) {
  const generator = findNode(nodeId); if (!generator || generator.type !== "generator" || isGenerating || generator.activeJobId) return;
  if (generator.mediaType === "video" || generator.provider === "runninghub-h3") return runVideoGeneratorNode(generator);
  const promptEdges = state.edges.filter(edge => edge.target === nodeId && edge.type === "prompt" && (edge.targetPort === "prompt" || /^prompt-\d+$/.test(edge.targetPort))).sort((a, b) => (a.targetPort === "prompt" ? 0 : Number(a.targetPort.split("-")[1]) || 0) - (b.targetPort === "prompt" ? 0 : Number(b.targetPort.split("-")[1]) || 0));
  const prompt = promptEdges.map(edge => findNode(edge.source)).filter(node => node?.type === "prompt" && !node.disabled).map(node => node.content?.trim()).filter(Boolean).join("\n\n");
  if (!prompt) { selectNode(nodeId); return toast("请连接至少一个有内容且已启用的提示词模块", true); }
  const imageEdges = state.edges.filter(edge => edge.target === nodeId && edge.type === "image" && edge.targetPort.startsWith("image-") && !findNode(edge.source)?.disabled).sort((a, b) => Number(a.targetPort.split("-")[1]) - Number(b.targetPort.split("-")[1]));
  const referenceSources = imageEdges.map(edge => imageSourceFromNode(findNode(edge.source))).filter(Boolean).slice(0, generatorReferenceLimit(generator));
  const provider = generatorProviderForNode(generator);
  const usesMoyu = ["gemini", "moyu"].includes(generator.provider);
  const usesProviderKey = usesMoyu || generator.provider === "midjourney";
  if (!usesProviderKey && !$("#apiState").classList.contains("is-ready") && !apiKey) { openSettings(); return toast("请先连接 Image2 API", true); }
  if (generator.provider === "midjourney") {
    try {
      const status = await requestJson("/api/status", {}, 10_000);
      if (!status.midjourney?.ready) { openSettings(); return toast("请先在设置中保存 Midjourney Fast API Key", true); }
    } catch { return toast("本机服务不可用，无法检查 Midjourney 设置", true); }
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
    const externalSize = generatorApiSize(generator);
    const result = await requestJson("/api/generate", { method: "POST", headers: { "Content-Type": "application/json", ...(!usesProviderKey && apiKey ? { "x-image2-api-key": apiKey } : {}) }, body: JSON.stringify({ provider: generator.provider || "image2", model: usesProviderKey ? generatorModelForNode(generator) : undefined, prompt: fullPrompt, size: usesProviderKey ? externalSize : sizeMap[generator.aspect].api, aspect: generator.aspect, outputSize: normalizeGeneratorOutputSize(generator), quality: generator.quality, n: generator.provider === "midjourney" ? 1 : generator.batch, references }) }, 75_000);
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
  if (!prompt) { selectNode(nodeId); return toast("请连接至少一个有内容且已启用的提示词模块", true); }
  if (!$("#apiState").classList.contains("is-ready") && !apiKey) { openSettings(); return toast("请先连接 API", true); }
  const imageEdges = state.edges.filter(edge => edge.target === nodeId && edge.type === "image" && edge.targetPort.startsWith("image-") && !findNode(edge.source)?.disabled).sort((a, b) => Number(a.targetPort.split("-")[1]) - Number(b.targetPort.split("-")[1]));
  const sources = imageEdges.map(edge => imageSourceFromNode(findNode(edge.source))).filter(Boolean).slice(0, 8);
  recordHistory(); node.status = "running"; node.error = ""; renderCanvas(); renderInspector();
  try {
    const references = await Promise.all(sources.map(sourceToDataUrl));
    const h3Enabled = node.answerSkill === "minimax-h3";
    const result = await requestJson("/api/respond", { method: "POST", headers: { "Content-Type": "application/json", ...(apiKey ? { "x-image2-api-key": apiKey } : {}) }, body: JSON.stringify({ prompt, model: node.model, references, skill: h3Enabled ? "minimax-h3" : "none", h3Mode: h3Enabled ? resolveH3AnswerMode(node, references.length) : undefined, durationSeconds: h3Enabled ? normalizedH3Duration(node.h3Duration) : undefined }) }, 165_000);
    node.answer = String(result.answer || ""); node.model = result.model || node.model; node.status = "idle";
    toast("模型回答已完成");
  } catch (error) {
    node.status = "idle"; node.error = error?.message || "模型回答失败";
    toast(node.error, true);
  } finally {
    renderCanvas(); renderInspector(); scheduleSave(); updateHistoryButtons();
  }
}function setCropSelection(selection) {
  if (!cropSession) return; cropSession.selection = selection; cropSelection.hidden = false;
  cropSelection.style.left = `${selection.x * 100}%`; cropSelection.style.top = `${selection.y * 100}%`; cropSelection.style.width = `${selection.width * 100}%`; cropSelection.style.height = `${selection.height * 100}%`;
}
function resetCropSelection() { if (cropSession) setCropSelection({ x: .15, y: .15, width: .7, height: .7 }); }
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
  } catch { toast(`${node?.type === "video" ? "视频" : "图片"}下载失败`, true); }
}
function exportProject() { const blob = new Blob([JSON.stringify(cleanProjectForSave(), null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${state.projectName.replace(/[\\/:*?"<>|]/g, "-")}.image2.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function importProject(file) {
  try { const parsed = JSON.parse(await file.text()); if (!Array.isArray(parsed.nodes)) throw new Error("项目文件缺少节点数据"); const imported = normalizeProject(parsed); imported.id = uid("project"); imported.projectName = `${imported.projectName || "导入项目"} · 导入`; imported.createdAt = Date.now(); imported.updatedAt = Date.now(); await dbPutBoth(imported); projectMetas.unshift(projectMeta(imported)); await openProject(imported.id); toast("项目已作为新项目导入"); }
  catch (error) { toast(error.message || "项目文件无法读取", true); }
}
function toast(message, isError = false) { const element = document.createElement("div"); element.className = `toast${isError ? " is-error" : ""}`; element.innerHTML = `${icon(isError ? "circle-alert" : "circle-check")}<span>${escapeHtml(message)}</span>`; $("#toastRegion").appendChild(element); refreshIcons(); setTimeout(() => element.remove(), 4300); }
function setHomeServiceState(label, detail, mode = "") {
  const status = $("#homeServiceStatus"); const copy = $("#homeServiceDetail");
  if (status) { status.textContent = label; status.classList.toggle("is-ready", mode === "ready"); status.classList.toggle("is-error", mode === "error"); }
  if (copy) copy.textContent = detail;
}async function checkApiStatus() {
  const element = $("#apiState"); if (!element) return;
  setHomeServiceState("检查中", "正在检查本机服务与 Image2 网关连接。");
  const headers = apiKey ? { "x-image2-api-key": apiKey } : {};
  try {
    const status = await requestJson("/api/status", { headers }, 10_000);
    $("#apiBase").value = status.baseUrl || "https://rehdasu.cn/v1";
    if (!status.ready && !apiKey) {
      element.classList.remove("is-ready"); element.classList.add("is-error"); element.querySelector("b").textContent = "需要 API Key"; setHomeServiceState("需要 API Key", "本机服务正常，但尚未配置可用的 API Key。", "error"); return;
    }
    try {
      const health = await requestJson("/api/health", { headers }, 20_000);
      const ready = Boolean(health.ready); element.classList.toggle("is-ready", ready); element.classList.toggle("is-error", !ready); element.querySelector("b").textContent = ready ? "Image2 已验证" : "Image2 模型不可用"; setHomeServiceState(ready ? "连接正常" : "模型不可用", ready ? "本机服务与网关连接正常，可开始生图。" : (health.message || "网关未提供当前模型。"), ready ? "ready" : "error");
    } catch (error) {
      element.classList.remove("is-ready"); element.classList.add("is-error"); element.querySelector("b").textContent = error.message || "Image2 网关异常"; setHomeServiceState("网关异常", error.message || "无法连接 Image2 网关。", "error");
    }
  } catch {
    element.classList.remove("is-ready"); element.classList.add("is-error"); element.querySelector("b").textContent = "本机服务异常"; setHomeServiceState("本机服务异常", "无法访问本地 Node 服务，请尝试恢复生图服务。", "error");
  }
}
async function restartImage2Service() {
  const checkButton = $("#homeCheckServiceButton"); const restartButton = $("#homeRestartServiceButton");
  if (!restartButton || restartButton.disabled) return;
  checkButton.disabled = true; restartButton.disabled = true; setHomeServiceState("正在恢复", "正在重启本机服务，项目和图片不会被删除。");
  try {
    await requestJson("/api/restart", { method: "POST" }, 8_000);
    const startedAt = Date.now(); let ready = false;
    while (Date.now() - startedAt < 15_000) {
      await new Promise(resolve => setTimeout(resolve, 600));
      try { await requestJson("/api/status", {}, 1_500); ready = true; break; } catch { /* 服务切换期间短暂不可用 */ }
    }
    if (!ready) throw new Error("本机服务未能在规定时间内恢复");
    await checkApiStatus(); toast("生图服务已恢复");
  } catch (error) {
    setHomeServiceState("恢复失败", error.message || "请重新打开桌面应用。", "error"); toast(error.message || "生图服务恢复失败", true);
  } finally { checkButton.disabled = false; restartButton.disabled = false; }
}
async function runVideoGeneratorNode(generator) {
  const promptEdges = state.edges.filter(edge => edge.target === generator.id && edge.type === "prompt" && (edge.targetPort === "prompt" || /^prompt-\d+$/.test(edge.targetPort))).sort((a, b) => (a.targetPort === "prompt" ? 0 : Number(a.targetPort.split("-")[1]) || 0) - (b.targetPort === "prompt" ? 0 : Number(b.targetPort.split("-")[1]) || 0));
  const prompt = promptEdges.map(edge => findNode(edge.source)).filter(node => node?.type === "prompt" && !node.disabled).map(node => node.content?.trim()).filter(Boolean).join("\n\n");
  if (!prompt) { selectNode(generator.id); return toast("请连接至少一个有内容且已启用的提示词模块", true); }
  const imageEdges = state.edges.filter(edge => edge.target === generator.id && edge.type === "image" && /^image-\d+$/.test(edge.targetPort) && !findNode(edge.source)?.disabled).sort((a, b) => Number(a.targetPort.split("-")[1]) - Number(b.targetPort.split("-")[1]));
  const mode = runningHubVideoMode(generator);
  if (!mode.available) { selectNode(generator.id); return toast(`${mode.label}，请先选择首帧生视频`, true); }
  const requiredReferences = generator.videoMode === "first-last-frame" ? 2 : generator.videoMode === "text-to-video" ? 0 : 1;
  if (imageEdges.length < requiredReferences) { selectNode(generator.id); return toast(`${mode.label}至少需要连接 ${requiredReferences} 张参考图`, true); }
  if (!runningHubApiKey) {
    try { const status = await requestJson("/api/status", {}, 10_000); if (!status.runninghub?.ready) { openSettings(); return toast("请先在设置中保存 RunningHub API Key", true); } }
    catch { return toast("本机服务不可用，无法检查 RunningHub 设置", true); }
  }
  isGenerating = true; recordHistory(); generator.status = "running"; generator.activePrompt = prompt; delete generator.lastError; renderWorkspace();
  try {
    const dimensions = runningHubVideoDimensions(generator);
    const referenceSources = imageEdges.map(edge => imageSourceFromNode(findNode(edge.source))).filter(Boolean).slice(0, generatorReferenceLimit(generator));
    const references = await Promise.all(referenceSources.map(sourceToDataUrl));
    const result = await requestJson("/api/generate", { method: "POST", headers: { "Content-Type": "application/json", ...(runningHubApiKey ? { "x-runninghub-api-key": runningHubApiKey } : {}) }, body: JSON.stringify({ provider: "runninghub-h3", prompt, width: dimensions.width, height: dimensions.height, seconds: generator.videoSeconds, videoMode: generator.videoMode, videoQuality: generator.videoQuality, references }) }, 75_000);
    const job = result.job; if (!job?.id) throw new Error("本机服务未返回视频任务");
    generator.activeJobId = job.id; ensureGenerationPlaceholders(generator, job.id, 1, job.model, job.createdAt); state.selectedIds = []; toast(`${runningHubVideoProvider.label} 已进入任务队列，正在生成视频`); renderWorkspace(); scheduleSave(); pollGenerationJob(generator.id, job.id);
  } catch (error) { generator.status = "idle"; delete generator.activePrompt; toast(error.message || "视频任务创建失败", true); renderWorkspace(); scheduleSave(); }
  finally { isGenerating = false; updateHistoryButtons(); }
}
async function refreshGeminiSettingsStatus() {
  const statusElement = $("#geminiKeyStatus"); if (!statusElement) return;
  try {
    const result = await requestJson("/api/status", {}, 5_000);
    statusElement.textContent = result.gemini?.ready ? `已配置 · ${result.gemini.model}` : "尚未配置，保存密钥后即可在生图节点中选择 Gemini。";
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
function applyLineMotionPreference(value = lineMotion) { lineMotion = value === "static" ? "static" : "dynamic"; document.documentElement.dataset.edgeMotion = lineMotion; $$("#lineMotionSwitch [data-line-motion]").forEach(button => button.classList.toggle("is-active", button.dataset.lineMotion === lineMotion)); }
function setLineMotion(value) { applyLineMotionPreference(value); localStorage.setItem("image2-canvas-line-motion", lineMotion); }
function openSettings() { const theme = state?.theme || globalTheme; $$("#settingsThemeSwitch [data-theme-value]").forEach(button => button.classList.toggle("is-active", button.dataset.themeValue === theme)); applyLineMotionPreference(); const input = $("#geminiApiKeyInput"); if (input) input.value = ""; const midjourneyInput = $("#midjourneyApiKeyInput"); if (midjourneyInput) midjourneyInput.value = ""; const runningHubInput = $("#runningHubApiKeyInput"); if (runningHubInput) runningHubInput.value = ""; settingsDialog.showModal(); void refreshGeminiSettingsStatus(); void refreshMidjourneySettingsStatus(); void refreshRunningHubSettingsStatus(); }
function bindStaticEvents() {
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
  $("#homeCheckServiceButton").addEventListener("click", () => checkApiStatus());
  $("#homeRestartServiceButton").addEventListener("click", restartImage2Service);
  $$("#homeThemeSwitch [data-theme-value]").forEach(button => button.addEventListener("click", () => setTheme(button.dataset.themeValue)));
  $("#homeSettingsButton").addEventListener("click", openSettings);
  $("#backHomeButton").addEventListener("click", goHome);

  workspace.addEventListener("pointerdown", event => {
    closeConnectionMenu();
    if (state?.flowMode === "script") return;
    if (event.target.closest(".flow-switch, .tool-rail, .canvas-status, .mobile-panel-button")) return;
    if (event.target.closest(".canvas-node, .node-port, .node-interactive")) return;
    if (event.button === 2) return;
    // Left-drag pans the empty canvas; Shift keeps the existing box-selection workflow available.
    if (event.shiftKey && state.tool !== "hand" && !spacePressed && event.button === 0) return beginSelectionBox(event);
    if (state.tool === "hand" || spacePressed || [0, 1].includes(event.button)) return startPan(event);
  });
  workspace.addEventListener("selectstart", event => { if (!allowsCanvasTextSelection(event.target)) event.preventDefault(); });
  workspace.addEventListener("wheel", event => { if (state?.flowMode === "script") return handleScriptWheel(event); handleWheel(event); }, { passive: false });
  scriptEdgeLayer.addEventListener("pointerdown", event => {
    const path = event.target.closest("[data-script-edge]"); if (!path) return;
    event.preventDefault(); event.stopPropagation();
    const flow = ensureScriptFlow(); flow.selectedEdgeId = path.dataset.scriptEdge; flow.selectedIds = [];
    renderScriptEdges(); renderLibrary(); renderInspector(); scheduleSave();
  });
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  $("#undoButton").addEventListener("click", undo);
  $("#redoButton").addEventListener("click", redo);
  $("#fitButton").addEventListener("click", fitContent);
  $("#zoomButton").addEventListener("click", () => { if (state.flowMode === "script") { const viewport = scriptViewport(); viewport.x = 0; viewport.y = 0; viewport.scale = 1; updateScriptViewport(); } else { state.viewport.scale = 1; updateViewport(); } scheduleSave(); });
  $$('[data-tool]').forEach(button => button.addEventListener("click", () => setActiveTool(button.dataset.tool)));
  $$("[data-flow-mode]").forEach(button => button.addEventListener("click", () => setFlowMode(button.dataset.flowMode)));
  $$('[data-add-node]').forEach(button => button.addEventListener("click", () => addNode(button.dataset.addNode)));
  $("#addFrameButton").addEventListener("click", addFrame);
  $("#toolUploadButton").addEventListener("click", () => imageFileInput.click());
  $("#importButton").addEventListener("click", () => imageFileInput.click());
  imageFileInput.addEventListener("change", async event => { const files = [...event.target.files || []]; const pending = pendingImageUploadNodeId; pendingImageUploadNodeId = null; if (pending) { if (files[0]) await uploadImageIntoNode(pending, files[0]); event.target.value = ""; return; } await importImages(event.target.files); event.target.value = ""; });
  videoFileInput.addEventListener("change", async event => { const nodeId = pendingVideoImportNodeId; pendingVideoImportNodeId = null; if (nodeId && event.target.files?.length) await importVideosIntoEditor(nodeId, event.target.files); event.target.value = ""; });
  $$(".library-tabs .tab").forEach(tab => tab.addEventListener("click", () => { state.libraryTab = tab.dataset.libraryTab; renderLibrary(); scheduleSave(); }));

  $("#exportProjectButton").addEventListener("click", exportProject);
  $("#importProjectButton").addEventListener("click", () => projectFileInput.click());
  projectFileInput.addEventListener("change", async event => { if (event.target.files[0]) await importProject(event.target.files[0]); event.target.value = ""; });

  $("#settingsButton").addEventListener("click", openSettings);
  $$("#lineMotionSwitch [data-line-motion]").forEach(button => button.addEventListener("click", () => setLineMotion(button.dataset.lineMotion)));
  $("#revealKeyButton").addEventListener("click", () => { const input = $("#apiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $("#revealGeminiKeyButton").addEventListener("click", () => { const input = $("#geminiApiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $("#revealMidjourneyKeyButton").addEventListener("click", () => { const input = $("#midjourneyApiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $("#revealRunningHubKeyButton").addEventListener("click", () => { const input = $("#runningHubApiKeyInput"); input.type = input.type === "password" ? "text" : "password"; });
  $$("#settingsThemeSwitch [data-theme-value]").forEach(button => button.addEventListener("click", () => { setTheme(button.dataset.themeValue); $$("#settingsThemeSwitch [data-theme-value]").forEach(item => item.classList.toggle("is-active", item.dataset.themeValue === button.dataset.themeValue)); }));
  $("#saveSettingsButton").addEventListener("click", async event => {
    event.preventDefault();
    apiKey = $("#apiKeyInput").value.trim();
    const geminiKey = $("#geminiApiKeyInput").value.trim();
    const midjourneyKey = $("#midjourneyApiKeyInput").value.trim();
    const runningHubKey = $("#runningHubApiKeyInput").value.trim();
    if (geminiKey) {
      try { await requestJson("/api/providers/gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: geminiKey }) }, 10_000); }
      catch (error) { return toast(error.message || "Gemini 密钥保存失败", true); }
    }
    if (midjourneyKey) {
      try { await requestJson("/api/providers/midjourney", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: midjourneyKey }) }, 10_000); }
      catch (error) { return toast(error.message || "Midjourney 密钥保存失败", true); }
    }
    if (runningHubKey) {
      try { await requestJson("/api/providers/runninghub", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: runningHubKey }) }, 10_000); }
      catch (error) { return toast(error.message || "RunningHub 密钥保存失败", true); }
    }
    settingsDialog.close(); checkApiStatus(); toast(runningHubKey ? "RunningHub 密钥已安全保存" : midjourneyKey ? "Midjourney 密钥已安全保存" : geminiKey ? "Gemini 密钥已安全保存" : (apiKey ? "临时 Image2 API Key 已启用" : "将使用服务器环境中的 Image2 API Key"));
  });
  $("#projectName").addEventListener("click", () => { const next = window.prompt("项目名称", state.projectName)?.trim(); if (!next || next === state.projectName) return; recordHistory(); state.projectName = next; renderWorkspace(); scheduleSave(); });
  $("#closeDialogueScriptButton").addEventListener("click", closeStoryDialogue);
$("#toggleDialogueFullscreenButton").addEventListener("click", toggleDialogueFullscreen);
$("#dialogueRoleSelect").addEventListener("change", event => { if (dialogueEditor) { recordDialogueDraftHistory(); dialogueEditor.roleId = event.target.value; dialogueEditor.analysisHiddenRoles = (dialogueEditor.analysisHiddenRoles || []).filter(id => id !== event.target.value); renderDialogueEditor(); } });
$("#addDialogueSpeechButton").addEventListener("click", addDialogueSpeech);
$("#addDialogueActionButton").addEventListener("click", () => addDialogueMarker("action"));
$("#addDialogueNarrationButton").addEventListener("click", () => addDialogueMarker("narration"));
$("#saveDialogueCardButton").addEventListener("click", saveStoryDialogue);
$("#downloadDialogueTextButton").addEventListener("click", downloadDialogueText);
  $("#deleteDialogueEntryButton").addEventListener("click", deleteDialogueEntry);
  $("#deleteDialogueAnalysisRoleButton").addEventListener("click", deleteDialogueAnalysisRole);
  $$('[data-dialogue-drag]').forEach(header => header.addEventListener("pointerdown", event => startDialoguePanelGesture(event, "drag")));
  $$('[data-dialogue-resize]').forEach(handle => handle.addEventListener("pointerdown", event => startDialoguePanelGesture(event, "resize"))); $$('[data-dialogue-analysis-resize]').forEach(handle => handle.addEventListener("pointerdown", startDialogueAnalysisResize));
  document.addEventListener("pointerdown", event => { if (!event.target.closest("#dialogueEntryMenu, [data-dialogue-delete]")) closeDialogueEntryMenu(); if (!event.target.closest("#dialogueAnalysisMenu, [data-dialogue-analysis-role]")) closeDialogueAnalysisMenu(); if (!event.target.closest("#managerSegmentMenu, [data-manager-segment]")) closeManagerSegmentMenu(); });
  window.addEventListener("pointermove", moveDialoguePanelGesture);
  window.addEventListener("pointerup", endDialoguePanelGesture);
  window.addEventListener("resize", () => { if (dialogueScriptDialog.open) applyDialoguePanelLayout(); });
$("#dialogueSpeechInput").addEventListener("keydown", event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); addDialogueSpeech(); } });
dialogueScriptDialog.addEventListener("cancel", event => { event.preventDefault(); closeStoryDialogue(); });
dialogueScriptDialog.addEventListener("click", event => event.stopPropagation());$("#previewCloseButton").addEventListener("click", () => { previewVideo.pause(); previewVideo.removeAttribute("src"); previewDialog.close(); });
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
  $("#mobileLibraryButton").addEventListener("click", () => $("#libraryPanel").classList.toggle("is-open"));
  $("#mobileInspectorButton").addEventListener("click", () => $("#inspectorPanel").classList.toggle("is-open"));
  $("#closeInspectorButton").addEventListener("click", () => $("#inspectorPanel").classList.remove("is-open"));
  $("#openGeneratedFolderButton").addEventListener("click", () => void openGeneratedFolder());

  window.addEventListener("paste", handleCanvasPaste);
  document.addEventListener("focusin", event => { beginEditableHistory(event.target); beginDialogueEditableHistory(event.target); }, true);
  document.addEventListener("input", event => { scheduleEditableHistory(event.target); scheduleDialogueEditableHistory(event.target); }, true);
  document.addEventListener("change", event => { scheduleEditableHistory(event.target); scheduleDialogueEditableHistory(event.target); }, true);
  document.addEventListener("focusout", event => { commitEditableHistory(event.target); commitDialogueEditableHistory(event.target); }, true);
  window.addEventListener("keydown", event => {
    const target = event.target instanceof Element ? event.target : null;
    const isEditable = Boolean(target?.matches("input, textarea, select, [contenteditable=true]"));
    const historyShortcut = (event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y");
    const clipboardShortcut = (event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "c" || event.key.toLowerCase() === "v");
    const selectAllShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a";
    if (selectAllShortcut && !isEditable) { event.preventDefault(); selectAnswerResponse(selectedAnswerResponse()); return; }
    if (clipboardShortcut && isEditable) return;
    if (clipboardShortcut && state?.flowMode === "script") { event.preventDefault(); if (event.key.toLowerCase() === "c") copyScriptSelection(); else pasteScriptSelection(); return; }
    if (clipboardShortcut && state?.flowMode !== "script") { const selection = window.getSelection(); const answerTextSelected = Boolean(selection?.toString().trim() && selection.anchorNode?.parentElement?.closest(".answer-response")); if (event.key.toLowerCase() === "c" && answerTextSelected) return; if (event.key.toLowerCase() === "c") { event.preventDefault(); copyWorkflowSelection(); } return; }
    if (historyShortcut && isEditable) { discardEditableHistory(target); discardDialogueEditableHistory(target); return; }
    if (historyShortcut && dialogueEditor && dialogueScriptDialog.open) { const handled = event.shiftKey || event.key.toLowerCase() === "y" ? redoDialogueDraft() : undoDialogueDraft(); if (handled) { event.preventDefault(); return; } }
    if (historyShortcut && state && !settingsDialog.open && !newProjectDialog.open) { event.preventDefault(); if (event.shiftKey || event.key.toLowerCase() === "y") redo(); else undo(); return; }
    if (event.key === "Escape") { closeConnectionMenu(); closeCanvasContextMenu(); connectionDraft = null; workspace.classList.remove("is-flow-interacting"); renderEdges(); scriptConnectionDraft = null; scriptFlowStage.classList.remove("is-interacting"); renderScriptEdges(); }
    if (!state || isEditable || settingsDialog.open || newProjectDialog.open) return;
    if (event.code === "Space") { spacePressed = true; workspace.style.cursor = "grab"; event.preventDefault(); }
    if (event.key.toLowerCase() === "v") setActiveTool("select");
    if (event.key.toLowerCase() === "h") setActiveTool("hand");
    if (state.flowMode !== "script" && event.key.toLowerCase() === "f") addFrame();
    if (event.key === "Delete" || event.key === "Backspace") { state.flowMode === "script" ? deleteScriptSelection() : deleteSelection(); }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { const node = selectedNode(); if (node?.type === "generator") runGeneratorNode(node.id); }
  });
  window.addEventListener("blur", () => { workspace.classList.remove("is-flow-interacting", "is-panning"); });
  window.addEventListener("keyup", event => { if (event.code === "Space" && state) { spacePressed = false; workspace.style.cursor = state.tool === "hand" ? "grab" : "default"; } });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && saveTimer) void saveProjectNow(); });
  workspace.addEventListener("contextmenu", showCanvasContextMenu);
  workspace.addEventListener("dragover", event => event.preventDefault());
  workspace.addEventListener("drop", async event => { event.preventDefault(); if (state?.flowMode === "script") return; if (event.dataTransfer.files.length) await importImages(event.dataTransfer.files); });
  $$("#scriptToolRail [data-script-quick]").forEach(button => button.addEventListener("click", () => { const action = button.dataset.scriptQuick; if (action === "select" || action === "hand") return setActiveTool(action); if (action === "male") return addScriptCharacter("male-1"); if (action === "female") return addScriptCharacter("female-1"); if (action === "story") return addStoryCard(); if (action === "emotion") return addEmotionBoard(); if (action === "character-arc") return addCharacterArc(); if (action === "character-goal") return addCharacterGoal(); if (action === "ai-assistant") return addScriptAssistant(); if (action === "note") return addScriptNote(); if (action === "frame") return addScriptFrame(); }));  $("#libraryResizer").addEventListener("pointerdown", event => startPanelResize(event, "library"));
  $("#inspectorResizer").addEventListener("pointerdown", event => startPanelResize(event, "inspector"));
  scriptFlowStage.addEventListener("pointerdown", event => { if (!state || state.flowMode !== "script") return; if (event.target.closest(".script-character-node, .script-note-card, .flow-switch, .canvas-status")) return; if (event.button === 2) return; if (event.shiftKey && state.tool !== "hand" && !spacePressed && event.button === 0) return startScriptSelection(event); if (state.tool === "hand" || spacePressed || [0, 1].includes(event.button)) return startScriptPan(event); });
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
init();











