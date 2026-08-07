import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const outputDir = path.join(__dirname, "output");
const generatedDir = path.join(outputDir, "generated");
const assetsDir = path.join(outputDir, "assets");
const jobsPath = path.join(outputDir, "image2-generation-jobs.json");
const generationLogPath = path.join(outputDir, "image2-generation.log");
const port = Number(process.env.PORT || 45173);
const baseUrl = (process.env.IMAGE2_BASE_URL || "https://rehdasu.cn/v1").replace(/\/$/, "");
const model = process.env.IMAGE2_MODEL || "gpt-image-2";
const geminiBaseUrl = (process.env.GEMINI_MOYU_BASE_URL || "https://www.moyu.info").replace(/\/$/, "");
const runningHubBaseUrl = (process.env.RUNNINGHUB_BASE_URL || "https://www.runninghub.cn").replace(/\/$/, "");
const runningHubWorkflowId = "2084196829952045057";
const runningHubInstanceType = process.env.RUNNINGHUB_INSTANCE_TYPE === "default" ? "default" : "plus";
const geminiImageModels = Object.freeze([
  "gemini-3-pro-image-preview",
  "gemini-3.1-flash-image-preview"
]);
const seedreamImageModels = Object.freeze([
  "doubao-seedream-5-0-pro-260628"
]);
const moyuImageModels = Object.freeze([...geminiImageModels, ...seedreamImageModels]);
const geminiDefaultModel = geminiImageModels.includes(process.env.GEMINI_MOYU_MODEL)
  ? process.env.GEMINI_MOYU_MODEL
  : geminiImageModels[0];
function normalizeMoyuModel(value) {
  return moyuImageModels.includes(String(value || "")) ? String(value) : geminiDefaultModel;
}
function moyuReferenceLimit(modelName) {
  return seedreamImageModels.includes(String(modelName || "")) ? 6 : 14;
}
function normalizeMoyuOutputSize(modelName, value) {
  const modelId = String(modelName || "");
  if (modelId === "gemini-3-pro-image-preview") return ["1K", "2K", "4K"].includes(value) ? value : "4K";
  if (modelId === "gemini-3.1-flash-image-preview") return "1K";
  if (seedreamImageModels.includes(modelId)) return "2K";
  return "1K";
}
const providerConfigDir = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "image2-canvas");
const providerConfigPath = path.join(providerConfigDir, "providers.json");
const jobs = new Map();
const pendingJobIds = [];
let workerRunning = false;
let jobPersistQueue = Promise.resolve();
const maxStoredTerminalJobs = 240;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

function jobView(job) {
  const { request, ...safeJob } = job;
  return safeJob;
}

function trimCompletedJobs() {
  const terminal = [...jobs.values()].filter(job => !["queued", "running"].includes(job.status)).sort((a, b) => (a.finishedAt || a.createdAt || 0) - (b.finishedAt || b.createdAt || 0));
  terminal.slice(0, Math.max(0, terminal.length - maxStoredTerminalJobs)).forEach(job => jobs.delete(job.id));
}

function persistJobs() {
  const snapshot = [...jobs.values()].map(jobView);
  const write = jobPersistQueue.catch(() => undefined).then(async () => {
    await fs.mkdir(outputDir, { recursive: true });
    const tempPath = `${jobsPath}.${process.pid}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(snapshot, null, 2), "utf8");
    await fs.rename(tempPath, jobsPath);
  });
  jobPersistQueue = write;
  return write;
}

async function writeJobLog(job, event) {
  await fs.mkdir(outputDir, { recursive: true });
  const runningHub = job.runningHub || {};
  const entry = {
    at: new Date().toISOString(), id: job.id, event, status: job.status, code: job.errorCode || "", durationMs: job.finishedAt && job.startedAt ? job.finishedAt - job.startedAt : 0,
    remoteTaskId: job.remoteTaskId || "", runningHubStage: runningHub.stage || "", runningHubStatus: runningHub.status || "", runningHubHttpStatus: runningHub.httpStatus || 0, runningHubErrorCode: runningHub.errorCode || ""
  };
  await fs.appendFile(generationLogPath, `${JSON.stringify(entry)}\n`, "utf8");
}

async function initializeJobs() {
  await Promise.all([fs.mkdir(generatedDir, { recursive: true }), fs.mkdir(assetsDir, { recursive: true })]);
  try {
    const saved = JSON.parse(await fs.readFile(jobsPath, "utf8"));
    for (const item of Array.isArray(saved) ? saved : []) {
      if (!item?.id) continue;
      const job = { ...item };
      if (["queued", "running"].includes(job.status)) {
        job.status = "failed";
        job.errorCode = "SERVICE_RESTART";
        job.error = "本机服务在生成期间重启，请重新运行此节点";
        job.finishedAt = Date.now();
      }
      jobs.set(job.id, job);
    }
    await persistJobs();
  } catch (error) {
    if (error?.code !== "ENOENT") console.error("Cannot restore Image2 jobs", error);
  }
}

async function readJson(req, limit = 48 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("请求内容过大，请减少参考图数量或尺寸");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function findKey(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return "";
  seen.add(value);
  if (typeof value.OPENAI_API_KEY === "string") return value.OPENAI_API_KEY;
  for (const child of Object.values(value)) {
    const found = findKey(child, seen);
    if (found) return found;
  }
  return "";
}

let cachedAuthKey;
async function readAuthKey() {
  if (cachedAuthKey !== undefined) return cachedAuthKey;
  try {
    const authPath = path.join(os.homedir(), ".codex", "auth.json");
    cachedAuthKey = findKey(JSON.parse(await fs.readFile(authPath, "utf8")));
  } catch {
    cachedAuthKey = "";
  }
  return cachedAuthKey;
}

async function resolveApiKey(req) {
  const explicit = req.headers["x-image2-api-key"];
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  return process.env.OPENAI_API_KEY || await readAuthKey();
}

let cachedProviderConfig;
async function readProviderConfig() {
  if (cachedProviderConfig) return cachedProviderConfig;
  try {
    const parsed = JSON.parse(await fs.readFile(providerConfigPath, "utf8"));
    cachedProviderConfig = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    cachedProviderConfig = {};
  }
  return cachedProviderConfig;
}

async function saveProviderConfig(nextConfig) {
  cachedProviderConfig = nextConfig;
  await fs.mkdir(providerConfigDir, { recursive: true });
  const temporaryPath = `${providerConfigPath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(nextConfig, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporaryPath, providerConfigPath);
}

async function resolveGeminiApiKey(req) {
  const explicit = req.headers["x-gemini-api-key"];
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  if (process.env.GEMINI_MOYU_API_KEY) return process.env.GEMINI_MOYU_API_KEY;
  const config = await readProviderConfig();
  return typeof config?.gemini?.apiKey === "string" ? config.gemini.apiKey.trim() : "";
}

async function resolveRunningHubApiKey(req) {
  const explicit = req.headers["x-runninghub-api-key"];
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  if (process.env.RUNNINGHUB_API_KEY) return process.env.RUNNINGHUB_API_KEY.trim();
  const config = await readProviderConfig();
  return typeof config?.runninghub?.apiKey === "string" ? config.runninghub.apiKey.trim() : "";
}

function parseDataUrl(dataUrl, index) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error(`第 ${index + 1} 张参考图格式无效`);
  const mime = match[1];
  const extension = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  return { blob: new Blob([Buffer.from(match[2], "base64")], { type: mime }), filename: `reference-${index + 1}.${extension}` };
}

function parseStoredImage(dataUrl, label = "素材") {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error(label + "格式无效");
  const mime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) throw new Error(label + "内容为空");
  return { mime, buffer, extension: extensionForMime(mime) };
}

async function storeAsset(req, res) {
  try {
    const body = await readJson(req);
    const original = parseStoredImage(body.dataUrl, "原图");
    const preview = body.previewDataUrl ? parseStoredImage(body.previewDataUrl, "预览图") : null;
    if (original.buffer.length > 36 * 1024 * 1024) throw new Error("原图超过 36MB，请先压缩后再上传");
    await fs.mkdir(assetsDir, { recursive: true });
    const id = "asset-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    const filename = id + "." + original.extension;
    const previewFilename = preview ? id + ".preview." + preview.extension : filename;
    await fs.writeFile(path.join(assetsDir, filename), original.buffer);
    if (preview) await fs.writeFile(path.join(assetsDir, previewFilename), preview.buffer);
    return sendJson(res, 201, { url: "/api/assets/" + filename, previewUrl: "/api/assets/" + previewFilename, size: original.buffer.length });
  } catch (error) {
    return sendJson(res, 400, { error: error?.message || "本地素材保存失败" });
  }
}
function gatewayError(status, message, diagnostic = null) {
  const code = status === 401 || status === 403 ? "AUTH" : status === 429 ? "RATE_LIMIT" : status >= 500 ? "GATEWAY" : "REQUEST";
  const error = new Error(message || `Image2 请求失败 (${status})`);
  error.code = code;
  if (diagnostic) error.diagnostic = diagnostic;
  return error;
}

function classifyError(error) {
  if (error?.code) return { code: error.code, message: error.message || "生成失败" };
  if (error?.name === "TimeoutError") return { code: "TIMEOUT", message: "生成等待超时，网关可能仍在繁忙，请稍后重新运行" };
  if (error?.name === "TypeError") return { code: "NETWORK", message: "无法连接 Image2 网关，请检查网络后重新运行" };
  return { code: "UNKNOWN", message: error?.message || "生成失败" };
}

function diagnosticText(value, maxLength = 900) {
  const text = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  return text
    .replace(/(Bearer\s+)[^\s"',]+/gi, "$1[REDACTED]")
    .replace(/((?:api[_-]?key|authorization|token|secret)\s*["':=]\s*)(?:Bearer\s+)?[^\s"',}]+/gi, "$1[REDACTED]")
    .replace(/\b[a-f0-9]{32,}\b/gi, "[REDACTED]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function runningHubDiagnostic(stage, httpStatus, result, raw = "") {
  const failedReason = result?.failedReason?.message || result?.failedReason?.error || result?.failedReason;
  const errorMessage = result?.errorMessage || result?.message || result?.error?.message || "";
  return {
    stage,
    httpStatus: Number.isFinite(Number(httpStatus)) ? Number(httpStatus) : 0,
    taskId: diagnosticText(result?.taskId, 80),
    status: diagnosticText(result?.status, 80),
    errorCode: diagnosticText(result?.errorCode || result?.code, 120),
    errorMessage: diagnosticText(errorMessage),
    failedReason: diagnosticText(failedReason),
    promptTips: diagnosticText(result?.promptTips),
    responseSummary: result && Object.keys(result).length ? "" : diagnosticText(raw)
  };
}

function updateRunningHubDiagnostic(job, diagnostic) {
  const previous = job.runningHub || {};
  job.runningHub = { ...previous, ...diagnostic, updatedAt: Date.now() };
  if (diagnostic.taskId) job.remoteTaskId = diagnostic.taskId;
}

function runningHubRequestError(stage, httpStatus, result, raw, fallback) {
  const diagnostic = runningHubDiagnostic(stage, httpStatus, result, raw);
  const detail = diagnostic.errorMessage || diagnostic.failedReason || diagnostic.responseSummary || fallback;
  const meta = [diagnostic.httpStatus ? `HTTP ${diagnostic.httpStatus}` : "无 HTTP 状态", diagnostic.errorCode ? `错误码 ${diagnostic.errorCode}` : ""].filter(Boolean).join(" · ");
  return gatewayError(httpStatus || 502, `RunningHub ${stage}失败（${meta}）：${detail}`, diagnostic);
}

function extensionForMime(mime = "") {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "png";
}

function extensionForOutputType(outputType = "") {
  const value = String(outputType || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return ["mp4", "webm", "mov", "png", "jpg", "jpeg", "webp", "gif"].includes(value) ? value : "bin";
}

async function fetchResultImage(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!response.ok) throw gatewayError(response.status, "生成成功，但读取返回图片失败");
      return { buffer: Buffer.from(await response.arrayBuffer()), mime: response.headers.get("content-type") || "image/png" };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function fetchRemoteFile(url, fallbackMime = "application/octet-stream") {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10 * 60_000) });
      if (!response.ok) throw gatewayError(response.status, "生成成功，但读取返回文件失败");
      return { buffer: Buffer.from(await response.arrayBuffer()), mime: response.headers.get("content-type") || fallbackMime };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function persistGeneratedImage(job, item, index) {
  let image;
  if (item?.b64_json) image = { buffer: Buffer.from(item.b64_json, "base64"), mime: "image/png" };
  else if (item?.url) image = await fetchResultImage(item.url);
  else throw new Error("接口响应中没有可用图片数据");
  if (!image.buffer.length) throw new Error("接口返回的图片为空");
  const extension = extensionForMime(image.mime);
  const filename = `${job.id}-${index + 1}.${extension}`;
  await fs.writeFile(path.join(generatedDir, filename), image.buffer);
  return { url: `/api/generated/${filename}`, revisedPrompt: item.revised_prompt || "" };
}

async function persistGeneratedMedia(job, item, index) {
  const outputType = extensionForOutputType(item?.outputType);
  const file = item?.b64_json
    ? { buffer: Buffer.from(item.b64_json, "base64"), mime: mimeTypes[`.${outputType}`] || "application/octet-stream" }
    : item?.url ? await fetchRemoteFile(item.url, mimeTypes[`.${outputType}`] || "application/octet-stream") : null;
  if (!file?.buffer?.length) throw new Error("RunningHub 返回的媒体文件为空");
  const extension = outputType !== "bin" ? outputType : extensionForMime(file.mime);
  const filename = `${job.id}-${index + 1}.${extension}`;
  await fs.writeFile(path.join(generatedDir, filename), file.buffer);
  return { url: `/api/generated/${filename}`, outputType: extension, nodeId: item?.nodeId || "", text: item?.text || "" };
}

async function requestImage2Generation(job) {
  const { apiKey, prompt, quality, size, n, references } = job.request;
  const endpoint = references.length ? "/images/edits" : "/images/generations";
  let requestBody;
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Idempotency-Key": job.id };
  if (references.length) {
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", prompt);
    form.append("quality", quality);
    form.append("size", size);
    form.append("n", String(n));
    references.forEach((dataUrl, index) => {
      const { blob, filename } = parseDataUrl(dataUrl, index);
      form.append("image[]", blob, filename);
    });
    requestBody = form;
  } else {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify({ model, prompt, quality, size, n });
  }
  const response = await fetch(`${baseUrl}${endpoint}`, { method: "POST", headers, body: requestBody, signal: AbortSignal.timeout(10 * 60_000) });
  const raw = await response.text();
  let result;
  try { result = JSON.parse(raw); } catch { result = { error: { message: raw.slice(0, 500) || "接口返回了无法解析的内容" } }; }
  if (!response.ok) throw gatewayError(response.status, result?.error?.message || result?.message || `Image2 请求失败 (${response.status})`);
  const items = Array.isArray(result.data) ? result.data : [];
  if (!items.length) throw gatewayError(502, "接口响应中没有图片");
  return { items, mode: references.length ? "edit" : "generate", referencesUsed: references.length };
}

async function requestGeminiGeneration(job) {
  const { apiKey, prompt, size, outputSize, n, references } = job.request;
  const modelName = normalizeMoyuModel(job.model);
  const selectedReferences = references.slice(0, moyuReferenceLimit(modelName));
  const payload = { model: modelName, prompt, size, n };
  if (job.provider === "gemini") payload.quality = normalizeMoyuOutputSize(modelName, outputSize);
  if (job.provider === "moyu") payload.watermark = false;
  // The gateway accepts one reference as a string and multiple references as an array.
  if (selectedReferences.length === 1) payload.image = selectedReferences[0];
  else if (selectedReferences.length > 1) payload.image = selectedReferences;
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json", "Idempotency-Key": job.id };
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${geminiBaseUrl}/v1/images/generations`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10 * 60_000)
      });
      const raw = await response.text();
      let result;
      try { result = JSON.parse(raw); } catch { result = { error: { message: raw.slice(0, 500) || "接口返回了无法解析的内容" } }; }
      if (!response.ok) {
        lastError = gatewayError(response.status, result?.error?.message || result?.message || `Gemini 请求失败 (${response.status})`);
        if (response.status < 500 && response.status !== 429) throw lastError;
      } else {
        const items = Array.isArray(result.data) ? result.data : [];
        if (!items.length) throw gatewayError(502, "Gemini 接口响应中没有图片");
        return { items, mode: selectedReferences.length ? "edit" : "generate", referencesUsed: selectedReferences.length };
      }
    } catch (error) {
      lastError = error;
      if (error?.code && error.code !== "GATEWAY" && error.code !== "RATE_LIMIT") throw error;
    }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1200 * (attempt + 1)));
  }
  throw lastError || gatewayError(502, "魔芋图像接口请求失败");
}

function runningHubNodeInfo(nodeId, fieldName, fieldValue) {
  return { nodeId, fieldName, fieldValue: String(fieldValue ?? "") };
}

const runningHubVideoReferenceNodes = Object.freeze({
  "text-to-video": [],
  "first-frame": ["60"],
  "last-frame": ["72"],
  "first-last-frame": ["60", "72"],
  "reference": ["60", "72", "128", "129"]
});

function normalizeRunningHubVideoMode(value) {
  return Object.hasOwn(runningHubVideoReferenceNodes, value) ? value : "reference";
}

async function uploadRunningHubReference(apiKey, dataUrl, index) {
  const source = parseStoredImage(dataUrl, `第 ${index + 1} 张视频参考图`);
  const form = new FormData();
  form.append("file", new Blob([source.buffer], { type: source.mime }), `reference-${index + 1}.${source.extension}`);
  const response = await fetch(`${runningHubBaseUrl}/openapi/v2/media/upload/binary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    body: form,
    signal: AbortSignal.timeout(120_000)
  });
  const raw = await response.text();
  let result;
  try { result = JSON.parse(raw); } catch { result = {}; }
  const fileName = String(result?.data?.fileName || "").trim();
  if (!response.ok || Number(result?.code) !== 0 || !fileName) throw runningHubRequestError("上传参考图", response.status, result, raw, "RunningHub 视频参考图上传失败");
  return fileName;
}

async function requestRunningHubGeneration(job) {
  const { apiKey, prompt, width, height, seconds, videoMode, references = [] } = job.request;
  const nodeInfoList = [
    runningHubNodeInfo("59", "value", prompt),
    runningHubNodeInfo("46", "value", width),
    runningHubNodeInfo("78", "value", height),
    runningHubNodeInfo("14", "value", seconds)
  ];
  const referenceNodes = runningHubVideoReferenceNodes[normalizeRunningHubVideoMode(videoMode)];
  let uploadedReferences;
  try {
    uploadedReferences = await Promise.all(references.slice(0, referenceNodes.length).map((reference, index) => uploadRunningHubReference(apiKey, reference, index)));
    updateRunningHubDiagnostic(job, { stage: "上传参考图", httpStatus: 200, referenceCount: uploadedReferences.length });
  } catch (error) {
    const diagnostic = { stage: "上传参考图", httpStatus: error?.diagnostic?.httpStatus || 0, errorCode: error?.code || "", errorMessage: diagnosticText(error?.message || "RunningHub 视频参考图上传失败") };
    updateRunningHubDiagnostic(job, diagnostic);
    error.diagnostic = diagnostic;
    throw error;
  }
  uploadedReferences.forEach((fileName, index) => nodeInfoList.push(runningHubNodeInfo(referenceNodes[index], "image", fileName)));
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json", "Idempotency-Key": job.id };
  const submitResponse = await fetch(`${runningHubBaseUrl}/openapi/v2/run/workflow/${runningHubWorkflowId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ addMetadata: true, nodeInfoList, instanceType: runningHubInstanceType, usePersonalQueue: false }),
    signal: AbortSignal.timeout(60_000)
  });
  const submitRaw = await submitResponse.text();
  let submitted;
  try { submitted = JSON.parse(submitRaw); } catch { submitted = {}; }
  const submitDiagnostic = runningHubDiagnostic("提交工作流", submitResponse.status, submitted, submitRaw);
  updateRunningHubDiagnostic(job, submitDiagnostic);
  if (!submitResponse.ok || !submitted?.taskId) throw runningHubRequestError("提交工作流", submitResponse.status, submitted, submitRaw, "RunningHub 工作流提交失败");
  await persistJobs();
  const startedAt = Date.now();
  let lastStatus = submitted;
  while (Date.now() - startedAt < 45 * 60_000) {
    const response = await fetch(`${runningHubBaseUrl}/openapi/v2/query`, { method: "POST", headers, body: JSON.stringify({ taskId: submitted.taskId }), signal: AbortSignal.timeout(60_000) });
    const raw = await response.text();
    let status;
    try { status = JSON.parse(raw); } catch { status = {}; }
    const queryDiagnostic = runningHubDiagnostic("查询任务", response.status, status, raw);
    updateRunningHubDiagnostic(job, queryDiagnostic);
    if (!response.ok) throw runningHubRequestError("查询任务", response.status, status, raw, "RunningHub 任务查询失败");
    lastStatus = status;
    if (status.status === "SUCCESS") {
      const results = Array.isArray(status.results) ? status.results.filter(item => item?.url || item?.text) : [];
      if (!results.length) throw gatewayError(502, "RunningHub 任务成功但没有可下载结果");
      return { items: results, mode: "workflow", mediaType: "video", taskId: submitted.taskId, referencesUsed: uploadedReferences.length };
    }
    if (status.status === "FAILED") {
      const error = runningHubRequestError("执行工作流", 502, status, raw, `RunningHub 任务失败 (${status.errorCode || "UNKNOWN"})`);
      updateRunningHubDiagnostic(job, error.diagnostic);
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 5_000));
  }
  throw gatewayError(504, `RunningHub 任务等待超时 (${lastStatus?.taskId || submitted.taskId})`);
}

async function executeJob(job) {
  job.status = "running";
  job.startedAt = Date.now();
  await persistJobs();
  await writeJobLog(job, "started");
  try {
    const result = job.provider === "runninghub-h3" ? await requestRunningHubGeneration(job) : ["gemini", "moyu"].includes(job.provider) ? await requestGeminiGeneration(job) : await requestImage2Generation(job);
    if (result.mediaType === "video") job.media = await Promise.all(result.items.map((item, index) => persistGeneratedMedia(job, item, index)));
    else job.images = await Promise.all(result.items.map((item, index) => persistGeneratedImage(job, item, index)));
    job.status = "succeeded";
    job.mode = result.mode;
    job.referencesUsed = result.referencesUsed;
    job.finishedAt = Date.now();
  } catch (error) {
    const failure = classifyError(error);
    job.status = "failed";
    job.errorCode = failure.code;
    job.error = failure.message;
    job.finishedAt = Date.now();
  } finally {
    delete job.request;
    await persistJobs();
    await writeJobLog(job, job.status === "succeeded" ? "completed" : "failed");
  }
}

async function drainJobs() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    while (pendingJobIds.length) {
      const job = jobs.get(pendingJobIds.shift());
      if (job?.status === "queued") await executeJob(job);
    }
  } finally {
    workerRunning = false;
  }
}

async function createJob(req, res) {
  try {
    const body = await readJson(req);
    const provider = body.provider === "runninghub-h3" ? "runninghub-h3" : body.provider === "gemini" ? "gemini" : body.provider === "moyu" ? "moyu" : "image2";
    if (provider === "runninghub-h3") return createRunningHubJob(req, res, body);
    const usesMoyu = ["gemini", "moyu"].includes(provider);
    if (usesMoyu && body.model && !moyuImageModels.includes(String(body.model))) return sendJson(res, 400, { error: "不支持的魔芋图像模型" });
    const apiKey = usesMoyu ? await resolveGeminiApiKey(req) : await resolveApiKey(req);
    if (!apiKey) return sendJson(res, 401, { error: usesMoyu ? "未配置魔芋 API Key，请在设置中保存 Gemini 密钥" : "未找到 API Key，请在设置中临时输入，或在启动前设置 OPENAI_API_KEY" });
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return sendJson(res, 400, { error: "提示词不能为空" });
    const quality = ["low", "medium", "high"].includes(body.quality) ? body.quality : "high";
    const size = provider === "moyu"
      ? (/^\d{3,4}x\d{3,4}$/.test(body.size || "") ? body.size : "1024x1024")
      : provider === "gemini"
        ? (/[0-9]+:[0-9]+/.test(body.size || "") ? body.size : "1:1")
        : (/^\d{3,4}x\d{3,4}$/.test(body.size || "") ? body.size : "1024x1024");
    const selectedModel = usesMoyu ? normalizeMoyuModel(body.model) : model;
    const outputSize = usesMoyu ? normalizeMoyuOutputSize(selectedModel, String(body.outputSize || "")) : "current";
    const n = Math.min(4, Math.max(1, Number(body.n) || 1));
    const maxReferences = provider === "moyu" || provider === "gemini" ? 14 : 8;
    const references = Array.isArray(body.references) ? body.references.slice(0, maxReferences) : [];
    const job = { id: `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, status: "queued", createdAt: Date.now(), provider, model: selectedModel, imageCount: n, request: { apiKey, prompt, quality, size, outputSize, n, references } };
    jobs.set(job.id, job);
    pendingJobIds.push(job.id);
    await persistJobs();
    await writeJobLog(job, "queued");
    sendJson(res, 202, { job: jobView(job) });
    void drainJobs();
  } catch (error) {
    const failure = classifyError(error);
    sendJson(res, failure.code === "REQUEST" ? 400 : 500, { error: failure.message, code: failure.code });
  }
}

async function createRunningHubJob(req, res, body) {
  try {
    const apiKey = await resolveRunningHubApiKey(req);
    if (!apiKey) return sendJson(res, 401, { error: "未配置 RunningHub API Key，请在设置中保存密钥" });
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return sendJson(res, 400, { error: "提示词不能为空" });
    const videoMode = normalizeRunningHubVideoMode(String(body.videoMode || "reference"));
    const requiredReferences = videoMode === "first-last-frame" ? 2 : videoMode === "text-to-video" ? 0 : 1;
    const maxReferences = runningHubVideoReferenceNodes[videoMode].length;
    const references = (Array.isArray(body.references) ? body.references : []).filter(item => /^data:image\/(png|jpeg|webp);base64,/i.test(String(item || ""))).slice(0, maxReferences);
    if (references.length < requiredReferences) return sendJson(res, 400, { error: `${videoMode === "first-frame" ? "首帧" : videoMode === "last-frame" ? "尾帧" : videoMode === "first-last-frame" ? "首尾帧" : "全能参考"}模式至少需要 ${requiredReferences} 张参考图` });
    const width = Math.min(4096, Math.max(32, Number(body.width) || 1376));
    const height = Math.min(4096, Math.max(32, Number(body.height) || 768));
    const seconds = Math.min(15, Math.max(3, Math.round(Number(body.seconds) || 6)));
    const job = { id: `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, status: "queued", createdAt: Date.now(), provider: "runninghub-h3", model: `H3 workflow ${runningHubWorkflowId}`, mediaType: "video", imageCount: 1, videoMode, request: { apiKey, prompt, width, height, seconds, videoMode, references } };
    jobs.set(job.id, job); pendingJobIds.push(job.id); await persistJobs(); await writeJobLog(job, "queued"); sendJson(res, 202, { job: jobView(job) }); void drainJobs();
  } catch (error) {
    const failure = classifyError(error); sendJson(res, failure.code === "REQUEST" ? 400 : 500, { error: failure.message, code: failure.code });
  }
}

async function checkGateway(req, res) {
  const apiKey = await resolveApiKey(req);
  if (!apiKey) return sendJson(res, 401, { ready: false, gateway: "missing_key", message: "未找到 API Key" });
  try {
    const response = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw gatewayError(response.status, "Image2 网关鉴权失败");
    const result = await response.json().catch(() => ({}));
    const available = !Array.isArray(result.data) || result.data.some(item => item?.id === model);
    return sendJson(res, available ? 200 : 502, { ready: available, gateway: available ? "ready" : "model_unavailable", model, checkedAt: Date.now() });
  } catch (error) {
    const failure = classifyError(error);
    return sendJson(res, 502, { ready: false, gateway: failure.code.toLowerCase(), message: failure.message, checkedAt: Date.now() });
  }
}

async function checkGeminiGateway(req, res) {
  const apiKey = await resolveGeminiApiKey(req);
  if (!apiKey) return sendJson(res, 401, { ready: false, gateway: "missing_key", message: "未配置 Gemini API Key" });
  try {
    const response = await fetch(`${geminiBaseUrl}/v1/models`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw gatewayError(response.status, "Gemini 网关鉴权失败");
    const result = await response.json().catch(() => ({}));
    const listedModels = Array.isArray(result.data) ? new Set(result.data.map(item => item?.id)) : null;
    const availableModels = listedModels ? moyuImageModels.filter(id => listedModels.has(id)) : moyuImageModels;
    const available = availableModels.length > 0;
    return sendJson(res, available ? 200 : 502, { ready: available, gateway: available ? "ready" : "model_unavailable", model: geminiDefaultModel, models: availableModels, baseUrl: geminiBaseUrl, checkedAt: Date.now() });
  } catch (error) {
    const failure = classifyError(error);
    return sendJson(res, 502, { ready: false, gateway: failure.code.toLowerCase(), message: failure.message, checkedAt: Date.now() });
  }
}

async function saveGeminiProvider(req, res) {
  try {
    const body = await readJson(req, 64 * 1024);
    const apiKey = String(body.apiKey || "").trim();
    if (!apiKey) return sendJson(res, 400, { error: "Gemini API Key 不能为空" });
    const previous = await readProviderConfig();
    await saveProviderConfig({ ...previous, gemini: { ...(previous.gemini || {}), apiKey, baseUrl: geminiBaseUrl, model: geminiDefaultModel, updatedAt: Date.now() } });
    return sendJson(res, 200, { ready: true, provider: "moyu", model: geminiDefaultModel, models: moyuImageModels, baseUrl: geminiBaseUrl });
  } catch (error) {
    return sendJson(res, 400, { error: error?.message || "Gemini 设置保存失败" });
  }
}

async function saveRunningHubProvider(req, res) {
  try {
    const body = await readJson(req, 64 * 1024);
    const apiKey = String(body.apiKey || "").trim();
    if (!apiKey) return sendJson(res, 400, { error: "RunningHub API Key 不能为空" });
    const previous = await readProviderConfig();
    await saveProviderConfig({ ...previous, runninghub: { ...(previous.runninghub || {}), apiKey, baseUrl: runningHubBaseUrl, workflowId: runningHubWorkflowId, updatedAt: Date.now() } });
    return sendJson(res, 200, { ready: true, provider: "runninghub-h3", workflowId: runningHubWorkflowId, baseUrl: runningHubBaseUrl });
  } catch (error) {
    return sendJson(res, 400, { error: error?.message || "RunningHub 设置保存失败" });
  }
}

async function restartLocalService(req, res) {
  await persistJobs();
  sendJson(res, 202, { restarting: true, message: "本机生图服务正在恢复" });
  setTimeout(() => {
    let restarted = false;
    const startReplacement = () => {
      if (restarted) return;
      restarted = true;
      const entry = process.argv[1] || path.join(__dirname, "server.mjs");
      const child = spawn(process.execPath, [entry], {
        cwd: __dirname,
        detached: true,
        env: { ...process.env, PORT: String(port) },
        stdio: "ignore"
      });
      child.unref();
      process.exit(0);
    };
    const forceCloseTimer = setTimeout(() => { server.closeAllConnections?.(); }, 1800);
    server.close(() => { clearTimeout(forceCloseTimer); startReplacement(); });
  }, 120);
}
async function serveStoredImage(res, directory, filename) {
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename) return sendJson(res, 403, { error: "禁止访问" });
  try {
    const filePath = path.join(directory, safeName);
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "image/png", "Cache-Control": "private, max-age=3600" });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "媒体文件不存在" });
  }
}
async function serveGenerated(res, filename) { return serveStoredImage(res, generatedDir, filename); }
async function serveAsset(res, filename) { return serveStoredImage(res, assetsDir, filename); }

function responseTextFrom(result) {
  const content = result?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) return content.map(item => item?.text || item?.content || "").join("\n").trim();
  return String(content || "").trim();
}

async function createResponse(req, res) {
  try {
    const apiKey = await resolveApiKey(req);
    if (!apiKey) return sendJson(res, 401, { error: "未找到 API Key，请在设置中临时输入，或在启动前设置 OPENAI_API_KEY" });
    const body = await readJson(req);
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return sendJson(res, 400, { error: "请连接并填写至少一个提示词节点" });
    const textModel = ["gpt-5.5", "gpt-5.6"].includes(body.model) ? body.model : "gpt-5.6";
    const references = (Array.isArray(body.references) ? body.references : []).filter(item => /^data:image\/(png|jpeg|webp);base64,/i.test(String(item || ""))).slice(0, 8);
    const content = [{ type: "text", text: prompt }];
    references.forEach(url => content.push({ type: "image_url", image_url: { url, detail: "auto" } }));
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ model: textModel, messages: [{ role: "user", content }] }),
      signal: AbortSignal.timeout(150_000)
    });
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); } catch { result = { error: { message: raw.slice(0, 500) || "接口返回了无法解析的内容" } }; }
    if (!response.ok) throw gatewayError(response.status, result?.error?.message || result?.message || `模型回答失败 (${response.status})`);
    const answer = responseTextFrom(result);
    if (!answer) throw gatewayError(502, "接口没有返回可显示的文本回答");
    return sendJson(res, 200, { answer, model: textModel, references: references.length });
  } catch (error) {
    const failure = classifyError(error);
    return sendJson(res, failure.code === "REQUEST" ? 400 : 502, { error: failure.message, code: failure.code });
  }
}
async function serveStatic(req, res, pathname) {
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(publicDir, `.${relativePath}`);
  if (!filePath.startsWith(publicDir + path.sep)) return sendJson(res, 403, { error: "禁止访问" });
  try {
    const data = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const isAppCode = [".html", ".js", ".css"].includes(extension);
    res.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream", "Cache-Control": isAppCode ? "no-store, max-age=0" : "public, max-age=3600" });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "未找到资源" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/api/status") {
    const key = await resolveApiKey(req);
    const geminiKey = await resolveGeminiApiKey(req);
    const runningHubKey = await resolveRunningHubApiKey(req);
    return sendJson(res, 200, { ready: Boolean(key), model, baseUrl, gemini: { ready: Boolean(geminiKey), model: geminiDefaultModel, models: moyuImageModels, baseUrl: geminiBaseUrl }, runninghub: { ready: Boolean(runningHubKey), workflowId: runningHubWorkflowId, instanceType: runningHubInstanceType, baseUrl: runningHubBaseUrl }, jobs: jobs.size });
  }
  if (req.method === "GET" && url.pathname === "/api/health") return checkGateway(req, res);
  if (req.method === "GET" && url.pathname === "/api/providers/gemini/health") return checkGeminiGateway(req, res);
  if (req.method === "POST" && url.pathname === "/api/providers/gemini") return saveGeminiProvider(req, res);
  if (req.method === "POST" && url.pathname === "/api/providers/runninghub") return saveRunningHubProvider(req, res);
  if (req.method === "POST" && url.pathname === "/api/restart") return restartLocalService(req, res);
  if (req.method === "POST" && url.pathname === "/api/assets") return storeAsset(req, res);
  if (req.method === "POST" && url.pathname === "/api/generate") return createJob(req, res);
  if (req.method === "POST" && url.pathname === "/api/respond") return createResponse(req, res);
  if (req.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
    const job = jobs.get(decodeURIComponent(url.pathname.slice("/api/jobs/".length)));
    return job ? sendJson(res, 200, { job: jobView(job) }) : sendJson(res, 404, { error: "生成任务不存在，可能已被清理" });
  }
  if (req.method === "GET" && url.pathname.startsWith("/api/generated/")) return serveGenerated(res, decodeURIComponent(url.pathname.slice("/api/generated/".length)));
  if (req.method === "GET" && url.pathname.startsWith("/api/assets/")) return serveAsset(res, decodeURIComponent(url.pathname.slice("/api/assets/".length)));
  if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res, decodeURIComponent(url.pathname));
  sendJson(res, 405, { error: "不支持的请求方法" });
});

await initializeJobs();
server.listen(port, "127.0.0.1", () => {
  console.log(`Image2 Canvas: http://127.0.0.1:${port}`);
});
