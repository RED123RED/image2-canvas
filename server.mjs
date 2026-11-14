import http from "node:http";
import {createMediaCleanup} from './media-cleanup.mjs';
import fsNative from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";
import {createHash} from 'node:crypto';
import {localEditProtocol,buildLocalEditPayload} from './public/local-edit-document.js';
import { layerProtocol, buildLayerPayload, createLayerDocument } from './public/layer-document.js';
import { fileURLToPath } from "node:url";
import { arkProtocol, arkBaseUrl, arkModels, arkPlanProtocol, arkPlanBaseUrl, arkPlanModels, isArkProvider, arkModelsForProvider, buildArkPayload } from './public/seedream-ark.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const outputDir = path.join(__dirname, "output");
const generatedDir = path.join(outputDir, "generated");
const assetsDir = path.join(outputDir, "assets");
const videoAssetsDir = path.join(outputDir, "video-assets");
const audioAssetsDir = path.join(outputDir, "audio-assets");
const editedVideoDir = path.join(outputDir, "video-edited");
const videoTempDir = path.join(outputDir, "video-temp");
const localFfmpegPath = path.join(__dirname, "tools", "ffmpeg", "bin", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
const localFfprobePath = path.join(__dirname, "tools", "ffmpeg", "bin", process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
const maxVideoUploadBytes = 2 * 1024 * 1024 * 1024;
const maxRemoteImageBytes = 50 * 1024 * 1024;
const maxRemoteMediaBytes = 512 * 1024 * 1024;
const compatibilityJobs = new Map();
const maxAudioUploadBytes = 512 * 1024 * 1024;
const jobsPath = path.join(outputDir, "image2-generation-jobs.json");
const generationLogPath = path.join(outputDir, "image2-generation.log");
const port = Number(process.env.PORT || 45173);
const baseUrl = (process.env.IMAGE2_BASE_URL || "https://rehdasu.cn/v1").replace(/\/$/, "");
const image2Models = Object.freeze([
  "gpt-image-2",
  "gpt-image-2.5",
  "gpt-image-2.5-flare",
  "gpt-image-2.5-sunburst"
]);
const image25Models = Object.freeze(image2Models.filter(value => value.startsWith("gpt-image-2.5")));
const image25AdvancedModels = Object.freeze(["gpt-image-2.5-flare", "gpt-image-2.5-sunburst"]);
const image25SizeProtocol = "image2-size-v2";
const model = image2Models.includes(process.env.IMAGE2_MODEL) ? process.env.IMAGE2_MODEL : "gpt-image-2.5-sunburst";
const image25Qualities = Object.freeze(["low", "medium", "high", "xhigh", "max", "auto"]);
function validImage25Size(value) {
  const match = /^(\d{3,4})x(\d{3,4})$/.exec(String(value || ""));
  if (!match) return false;
  const width = Number(match[1]); const height = Number(match[2]); const pixels = width * height; const ratio = width / height;
  return width % 16 === 0 && height % 16 === 0 && width <= 3840 && height <= 3840 && pixels >= 655_360 && pixels <= 8_294_400 && ratio >= 1 / 3 && ratio <= 3;
}
const deepseekBaseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const deepseekFlashModel = "deepseek-flash";
const deepseekModels = Object.freeze([deepseekFlashModel, "deepseek-v4-pro"]);
const deepseekVisionModel = deepseekFlashModel;
const deepseekModelAliases = Object.freeze({
  "deepseek-v4-flash": deepseekFlashModel,
  "deepseek-v4-flash-vision-exp": deepseekFlashModel
});
function normalizeDeepseekModel(value) {
  const candidate = String(value || "").trim();
  return deepseekModelAliases[candidate] || candidate;
}
const claudeBaseUrl = (process.env.CLAUDE_NUODA_BASE_URL || "https://api.nuoda.vip/v1").replace(/\/$/, "");
const claudeModels = Object.freeze(["claude-sonnet-4-6", "claude-opus-5-5"]);
const claudeDefaultModel = claudeModels[0];
const kimiBaseUrl = (process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1").replace(/\/$/, "");
const kimiMoyuBaseUrl = "https://www.moyu.cn/v1";
const kimiApiModel = "kimi-k3";
const kimiPlanModel = "kimi-k3.1-pro";
const kimiModels = Object.freeze(["kimi-k3-moyu", "kimi-k3-moonshot"]);
const kimiDefaultModel = "kimi-k3-moonshot";
const kimiModelAliases = Object.freeze({ "kimi-k3": kimiDefaultModel });
const openAiChatModels = Object.freeze(["gpt-5.6", "gpt-6-astra"]);
function normalizeKimiModel(value) {
  const candidate = String(value || "").trim();
  return kimiModelAliases[candidate] || candidate;
}
function kimiGatewayForModel(model) {
  return normalizeKimiModel(model) === "kimi-k3-moyu" ? "moyu" : "moonshot";
}
const seedreamBaseUrl = (process.env.SEEDREAM_BASE_URL || "https://www.moyu.info").replace(/\/$/, "");
const mjBaseUrl = (process.env.MJ_API_BASE_URL || "https://key.34ku.com").replace(/\/$/, "");
const mjFastModel = "mj_fast_imagine";
const runningHubBaseUrl = (process.env.RUNNINGHUB_BASE_URL || "https://www.runninghub.cn").replace(/\/$/, "");
const runningHubVideoWorkflows = Object.freeze({
  reference: Object.freeze({
    id: "2093564802919649281",
    promptNode: "138",
    durationNode: "131",
    resolutionNode: "115",
    imageNodes: ["137", "139", "147", "165", "166", "167"],
    videoNode: "170",
    audioNode: "171",
    outputNode: "92",
    minSeconds: 5,
    maxSeconds: 15,
    defaultAspect: "16:9",
    defaultMegapixels: 0.9
  })
});
const runningHubKrea2Workflow = Object.freeze({
  id: "2092538454105223169",
  promptNode: "67",
  widthNode: "75",
  heightNode: "75",
  batchNode: "75",
  outputNode: "9",
  defaultWidth: 1920,
  defaultHeight: 1080,
  maxBatch: 4
});
const runningHubWorkflowId = runningHubVideoWorkflows.reference.id;
const runningHubInstanceType = "plus";
const seedreamImageModels = Object.freeze([
  "doubao-seedream-5-0-pro-260628"
]);
const seedreamDefaultModel = seedreamImageModels[0];
function normalizeSeedreamModel(value) { return seedreamImageModels.includes(String(value || "")) ? String(value) : seedreamDefaultModel; }
function seedreamReferenceLimit() { return 6; }
function normalizeSeedreamOutputSize() { return "2K"; }
const providerConfigDir = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "image2-canvas");
const providerConfigPath = path.join(providerConfigDir, "providers.json");
const jobs = new Map();
const pendingJobIds = [];
let workerRunning = false;
let jobPersistQueue = Promise.resolve();
const maxStoredTerminalJobs = 240;
const maxGenerationLogBytes = 10 * 1024 * 1024;

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
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

function jobView(job) {
  const { request, ...safeJob } = job;
  if (safeJob.midjourney?.actions) {
    const { actions, ...safeMidjourney } = safeJob.midjourney;
    safeJob.midjourney = safeMidjourney;
  }
  return safeJob;
}

function jobPersistView(job) {
  const { request, ...safeJob } = job;
  return safeJob;
}

function trimCompletedJobs() {
  const terminal = [...jobs.values()].filter(job => !["queued", "running"].includes(job.status)).sort((a, b) => (a.finishedAt || a.createdAt || 0) - (b.finishedAt || b.createdAt || 0));
  terminal.slice(0, Math.max(0, terminal.length - maxStoredTerminalJobs)).forEach(job => jobs.delete(job.id));
}

function persistJobs() {
  trimCompletedJobs();
  const snapshot = [...jobs.values()].map(jobPersistView);
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
  try {
    const stat = await fs.stat(generationLogPath);
    if (stat.size >= maxGenerationLogBytes) await fs.rename(generationLogPath, `${generationLogPath}.1`).catch(() => undefined);
  } catch { /* log file may not exist yet */ }
  const runningHub = job.runningHub || {};
  const entry = {
    at: new Date().toISOString(), id: job.id, event, status: job.status, code: job.errorCode || "", durationMs: job.finishedAt && job.startedAt ? job.finishedAt - job.startedAt : 0,
    remoteTaskId: job.remoteTaskId || "", runningHubStage: runningHub.stage || "", runningHubStatus: runningHub.status || "", runningHubHttpStatus: runningHub.httpStatus || 0, runningHubErrorCode: runningHub.errorCode || ""
  };
  await fs.appendFile(generationLogPath, `${JSON.stringify(entry)}\n`, "utf8");
}

async function initializeJobs() {
  await Promise.all([
    fs.mkdir(generatedDir, { recursive: true }),
    fs.mkdir(assetsDir, { recursive: true }),
    fs.mkdir(videoAssetsDir, { recursive: true }),
    fs.mkdir(audioAssetsDir, { recursive: true }),
    fs.mkdir(editedVideoDir, { recursive: true }),
    fs.mkdir(videoTempDir, { recursive: true })
  ]);
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

function safeVideoName(value, fallback = "video") {
  const decoded = (() => { try { return decodeURIComponent(String(value || "")); } catch { return String(value || ""); } })();
  const base = path.basename(decoded).replace(/[\\/:*?"<>|\x00-\x1f]/g, "-").replace(/\s+/g, " ").trim();
  return base || fallback;
}

function videoExtension(filename, mime = "") {
  const extension = path.extname(filename).toLowerCase();
  if ([".mp4", ".webm", ".mov"].includes(extension)) return extension.slice(1);
  if (/webm/i.test(mime)) return "webm";
  if (/quicktime/i.test(mime)) return "mov";
  return "mp4";
}

async function storeVideoUpload(req, res) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  const originalName = safeVideoName(req.headers["x-file-name"], "导入视频.mp4");
  const extension = videoExtension(originalName, contentType);
  if (!/^video\/(mp4|webm|quicktime)$/i.test(contentType) && !/\.(mp4|webm|mov)$/i.test(originalName)) return sendJson(res, 400, { error: "仅支持 MP4、WebM 或 MOV 视频" });
  await fs.mkdir(videoAssetsDir, { recursive: true });
  const identifier = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${identifier}-${safeVideoName(originalName.replace(/\.[^.]+$/, ""), "video")}.${extension}`;
  const temporary = path.join(videoAssetsDir, `${filename}.uploading`);
  const target = path.join(videoAssetsDir, filename);
  let handle;
  let size = 0;
  try {
    handle = await fs.open(temporary, "wx");
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxVideoUploadBytes) throw new Error("视频超过 2 GB，本地剪辑模块暂不接收");
      await handle.write(chunk);
    }
    await handle.close(); handle = null;
    if (!size) throw new Error("上传的视频为空");
    await fs.rename(temporary, target);
    let storedFilename = filename;
    let storedSize = size;
    let transcoded = false;
    let sourceCodec = "";
    const tools = await localVideoTools();
    if (tools) {
      sourceCodec = await probeVideoCodec(tools, target);
      if (["hevc", "h265"].includes(sourceCodec)) {
        const compatibilityFilename = `${path.parse(filename).name}-h264.mp4`;
        const compatibilityTemp = path.join(videoAssetsDir, `${compatibilityFilename}.building.mp4`);
        const compatibilityTarget = path.join(videoAssetsDir, compatibilityFilename);
        try {
          await transcodeVideoToH264(tools, target, compatibilityTemp);
          const convertedStat = await fs.stat(compatibilityTemp);
          if (!convertedStat.isFile() || convertedStat.size <= 0) throw new Error("转码结果为空");
          await fs.rename(compatibilityTemp, compatibilityTarget);
          await fs.rm(target, { force: true });
          storedFilename = compatibilityFilename;
          storedSize = convertedStat.size;
          transcoded = true;
        } finally {
          await fs.rm(compatibilityTemp, { force: true }).catch(() => undefined);
        }
      }
    }
    return sendJson(res, 201, { filename: storedFilename, name: originalName, size: storedSize, url: `/api/video-assets/${encodeURIComponent(storedFilename)}`, transcoded, sourceCodec: sourceCodec || undefined });
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await fs.rm(temporary, { force: true }).catch(() => undefined);
    await fs.rm(target, { force: true }).catch(() => undefined);
    return sendJson(res, 400, { error: error?.message || "视频导入失败" });
  }
}

function audioExtension(filename, mime = "") {
  const extension = path.extname(filename).toLowerCase();
  if ([".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"].includes(extension)) return extension.slice(1);
  if (/wav/i.test(mime)) return "wav";
  if (/mp4|m4a/i.test(mime)) return "m4a";
  if (/aac/i.test(mime)) return "aac";
  if (/ogg/i.test(mime)) return "ogg";
  if (/flac/i.test(mime)) return "flac";
  return "mp3";
}

async function storeAudioUpload(req, res) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  const originalName = safeVideoName(req.headers["x-file-name"], "参考音频.mp3");
  const extension = audioExtension(originalName, contentType);
  if (!/^audio\/(mpeg|wav|x-wav|mp4|aac|ogg|flac)$/i.test(contentType) && !/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(originalName)) return sendJson(res, 400, { error: "仅支持 MP3、WAV、M4A、AAC、OGG 或 FLAC 音频" });
  await fs.mkdir(audioAssetsDir, { recursive: true });
  const identifier = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${identifier}-${safeVideoName(originalName.replace(/\.[^.]+$/, ""), "audio")}.${extension}`;
  const temporary = path.join(audioAssetsDir, `${filename}.uploading`);
  const target = path.join(audioAssetsDir, filename);
  let handle;
  let size = 0;
  try {
    handle = await fs.open(temporary, "wx");
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxAudioUploadBytes) throw new Error("音频超过 512 MB");
      await handle.write(chunk);
    }
    await handle.close(); handle = null;
    if (!size) throw new Error("上传的音频为空");
    await fs.rename(temporary, target);
    return sendJson(res, 201, { filename, name: originalName, size, url: `/api/audio-assets/${encodeURIComponent(filename)}` });
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await fs.rm(temporary, { force: true }).catch(() => undefined);
    return sendJson(res, 400, { error: error?.message || "音频导入失败" });
  }
}

async function localVideoTools() {
  const ffmpeg = process.env.FFMPEG_PATH || localFfmpegPath;
  try { await fs.access(ffmpeg); }
  catch { return null; }
  const ffprobe = process.env.FFPROBE_PATH || localFfprobePath;
  try { await fs.access(ffprobe); return { ffmpeg, ffprobe }; }
  catch { return { ffmpeg, ffprobe: "" }; }
}

function runVideoTool(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true });
    let stdout = ""; let stderr = ""; let startupError = null;
    let settled = false;
    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 0;
    const timer = timeoutMs ? setTimeout(() => {
      child.kill();
      if (!settled) {
        settled = true;
        reject(new Error("本机视频处理超时"));
      }
    }, timeoutMs) : null;
    child.stdout?.on("data", chunk => { if (stdout.length < 64 * 1024) stdout += chunk.toString(); });
    child.stderr?.on("data", chunk => { if (stderr.length < 64 * 1024) stderr += chunk.toString(); });
    child.on("error", error => { startupError = error; });
    child.on("close", code => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (!startupError && code === 0) return resolve({ stdout, stderr });
      const error = startupError || new Error(stderr.trim().split("\n").at(-1) || `视频处理失败 (${code ?? "未知"})`);
      reject(error);
    });
  });
}

async function probeVideoCodec(tools, source) {
  if (!tools?.ffprobe) return "";
  try {
    const result = await runVideoTool(tools.ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name", "-of", "default=nw=1:nk=1", source], { timeoutMs: 30_000 });
    return String(result.stdout || "").trim().split(/\s+/)[0].toLowerCase();
  } catch {
    return "";
  }
}

async function transcodeVideoToH264(tools, source, destination) {
  await runVideoTool(tools.ffmpeg, [
    "-hide_banner", "-y", "-i", source,
    "-map", "0:v:0", "-map", "0:a?",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", destination
  ], { timeoutMs: 30 * 60_000 });
}

async function ensureBrowserCompatibleVideo(source) {
  const sourcePath = String(source || "");
  if (!sourcePath) return sourcePath;
  const tools = await localVideoTools();
  if (!tools) return sourcePath;
  const codec = await probeVideoCodec(tools, sourcePath);
  if (!["hevc", "h265"].includes(codec)) return sourcePath;
  const parsed = path.parse(sourcePath);
  const target = path.join(parsed.dir, `${parsed.name}-h264.mp4`);
  try {
    const targetStat = await fs.stat(target);
    if (targetStat.isFile() && targetStat.size > 0) return target;
  } catch { /* convert below */ }
  if (!compatibilityJobs.has(sourcePath)) {
    compatibilityJobs.set(sourcePath, (async () => {
      const temporary = `${target}.building.mp4`;
      try {
        await transcodeVideoToH264(tools, sourcePath, temporary);
        const convertedStat = await fs.stat(temporary);
        if (!convertedStat.isFile() || convertedStat.size <= 0) throw new Error("转码结果为空");
        await fs.rename(temporary, target);
      } finally {
        await fs.rm(temporary, { force: true }).catch(() => undefined);
      }
      return target;
    })().finally(() => compatibilityJobs.delete(sourcePath)));
  }
  try { return await compatibilityJobs.get(sourcePath); }
  catch { return sourcePath; }
}

async function localMediaPath(source, kind = "video") {
  const pathname = decodeURIComponent(new URL(String(source || ""), "http://127.0.0.1").pathname);
  const locations = kind === "audio"
    ? [["/api/audio-assets/", audioAssetsDir]]
    : [["/api/generated/", generatedDir], ["/api/video-assets/", videoAssetsDir], ["/api/video-edited/", editedVideoDir]];
  const matched = locations.find(([prefix]) => pathname.startsWith(prefix));
  if (!matched) throw new Error(kind === "audio" ? "只能使用本机画布中的音频" : "只能使用本机画布中的视频");
  const filename = pathname.slice(matched[0].length);
  if (!filename || path.basename(filename) !== filename) throw new Error(kind === "audio" ? "音频地址无效" : "视频地址无效");
  const filePath = path.join(matched[1], filename);
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) throw new Error(kind === "audio" ? "音频文件不存在" : "视频文件不存在");
  return filePath;
}
async function localVideoPath(source) {
  const filePath = await localMediaPath(source, "video");
  return ensureBrowserCompatibleVideo(filePath);
}

function validClipSecond(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 86_400 ? Math.round(number * 1000) / 1000 : fallback;
}

async function sourceHasAudio(tools, source) {
  if (!tools.ffprobe) return false;
  try {
    const result = await runVideoTool(tools.ffprobe, ["-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_type", "-of", "csv=p=0", source]);
    return /audio/i.test(result.stdout);
  } catch { return false; }
}

function concatListPath(filePath) { return path.resolve(filePath).replace(/\\/g, "/").replace(/'/g, "'\\\\''"); }

async function composeVideo(req, res) {
  const temporaryPaths = [];
  try {
    const body = await readJson(req, 256 * 1024);
    const requested = Array.isArray(body.clips) ? body.clips.slice(0, 24) : [];
    if (!requested.length) return sendJson(res, 400, { error: "请先导入或连接至少一条视频" });
    const tools = await localVideoTools();
    if (!tools) return sendJson(res, 503, { error: "未找到本地 FFmpeg。请将 ffmpeg.exe 放入 tools\\ffmpeg\\bin，或设置 FFMPEG_PATH 后重启软件。" });
    const clips = await Promise.all(requested.map(async item => {
      const start = validClipSecond(item?.start, 0);
      const end = validClipSecond(item?.end, 0);
      if (end && end <= start) throw new Error("每条视频的结束时间必须大于开始时间");
      return { source: await localVideoPath(item?.src), start, end };
    }));
    await Promise.all([fs.mkdir(videoTempDir, { recursive: true }), fs.mkdir(editedVideoDir, { recursive: true })]);
    const identifier = `edit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const allHaveAudio = (await Promise.all(clips.map(clip => sourceHasAudio(tools, clip.source)))).every(Boolean);
    for (let index = 0; index < clips.length; index += 1) {
      const clip = clips[index]; const segment = path.join(videoTempDir, `${identifier}-${index}.mp4`); temporaryPaths.push(segment);
      const duration = clip.end ? clip.end - clip.start : 0;
      const args = ["-hide_banner", "-y", "-i", clip.source, "-ss", String(clip.start)];
      if (duration) args.push("-t", String(duration));
      args.push("-map", "0:v:0", "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p");
      if (allHaveAudio) args.push("-map", "0:a:0", "-c:a", "aac", "-ar", "48000", "-ac", "2"); else args.push("-an");
      args.push("-movflags", "+faststart", segment);
      await runVideoTool(tools.ffmpeg, args);
    }
    const listFile = path.join(videoTempDir, `${identifier}.txt`); temporaryPaths.push(listFile);
    await fs.writeFile(listFile, clips.map((_, index) => `file '${concatListPath(temporaryPaths[index])}'`).join("\n"), "utf8");
    const filename = `${identifier}.mp4`; const output = path.join(editedVideoDir, filename); const outputTemp = path.join(editedVideoDir, `${identifier}.building.mp4`); temporaryPaths.push(outputTemp);
    await runVideoTool(tools.ffmpeg, ["-hide_banner", "-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", "-movflags", "+faststart", outputTemp]);
    await fs.rename(outputTemp, output);
    temporaryPaths.pop();
    const stat = await fs.stat(output);
    return sendJson(res, 201, { filename, size: stat.size, hasAudio: allHaveAudio, url: `/api/video-edited/${encodeURIComponent(filename)}` });
  } catch (error) {
    return sendJson(res, 500, { error: error?.message || "视频合成失败" });
  } finally {
    await Promise.all(temporaryPaths.map(file => fs.rm(file, { force: true }).catch(() => undefined)));
  }
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

async function resolveSeedreamApiKey(req) {
  const explicit = req.headers["x-seedream-api-key"];
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  if (process.env.SEEDREAM_API_KEY) return process.env.SEEDREAM_API_KEY;
  const config = await readProviderConfig();
  return typeof config?.seedream?.apiKey === "string" ? config.seedream.apiKey.trim() : "";
}

async function resolveArkApiKey(req, provider = 'ark') {
  if (provider === 'ark-plan') {
    const explicit = req.headers['x-ark-plan-api-key'];
    if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
    return String(process.env.ARK_PLAN_API_KEY || (await readProviderConfig())?.arkPlan?.apiKey || '').trim();
  }
  const explicit = req.headers['x-ark-api-key'];
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
  return String(process.env.ARK_API_KEY || (await readProviderConfig())?.ark?.apiKey || '').trim();
}

async function saveArkProvider(req, res, provider = 'ark') {
  try {
    const body = await readJson(req, 64 * 1024);
    const apiKey = String(body.apiKey || '').trim();
    if (!apiKey) return sendJson(res, 400, { error: '火山引擎 API Key 不能为空' });
    const previous = await readProviderConfig();
    const plan = provider === 'ark-plan';
    const configKey = plan ? 'arkPlan' : 'ark';
    await saveProviderConfig({ ...previous, [configKey]: { ...(previous[configKey] || {}), apiKey, baseUrl: plan ? arkPlanBaseUrl : arkBaseUrl, updatedAt: Date.now() } });
    return sendJson(res, 200, { ready: true, provider, protocol: plan ? arkPlanProtocol : arkProtocol, models: arkModelsForProvider(provider).map(item => item.id) });
  } catch { return sendJson(res, 400, { error: '火山引擎设置保存失败' }); }
}

async function migrateLegacyGeminiConfig() {
  const config = await readProviderConfig();
  if (!config?.gemini) return;
  const next = { ...config };
  if (!next.seedream && config.gemini?.apiKey) {
    next.seedream = { ...config.gemini, baseUrl: seedreamBaseUrl, model: seedreamDefaultModel, updatedAt: Date.now() };
  }
  delete next.gemini;
  await saveProviderConfig(next);
}

async function resolveMjApiKey(req) {
  const explicit = req.headers["x-mj-api-key"];
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  if (process.env.MJ_API_KEY) return process.env.MJ_API_KEY.trim();
  const config = await readProviderConfig();
  return typeof config?.midjourney?.apiKey === "string" ? config.midjourney.apiKey.trim() : "";
}

async function resolveRunningHubApiKey(req) {
  const explicit = req.headers["x-runninghub-api-key"];
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  if (process.env.RUNNINGHUB_API_KEY) return process.env.RUNNINGHUB_API_KEY.trim();
  const config = await readProviderConfig();
  return typeof config?.runninghub?.apiKey === "string" ? config.runninghub.apiKey.trim() : "";
}

async function resolveDeepseekApiKey(req) {
  const explicit = req.headers["x-deepseek-api-key"];
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY.trim();
  const config = await readProviderConfig();
  return typeof config?.deepseek?.apiKey === "string" ? config.deepseek.apiKey.trim() : "";
}

async function resolveClaudeApiKey(req) {
  const explicit = req.headers["x-claude-api-key"];
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  if (process.env.CLAUDE_NUODA_API_KEY) return process.env.CLAUDE_NUODA_API_KEY.trim();
  const config = await readProviderConfig();
  return typeof config?.claude?.apiKey === "string" ? config.claude.apiKey.trim() : "";
}

async function resolveKimiApiKey(req, model = kimiDefaultModel) {
  const gateway = kimiGatewayForModel(model);
  const explicit = req.headers[gateway === "moyu" ? "x-kimi-moyu-api-key" : "x-kimi-api-key"];
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const envKey = gateway === "moyu" ? process.env.MOYU_KIMI_API_KEY : process.env.KIMI_API_KEY;
  if (envKey) return envKey.trim();
  const config = await readProviderConfig();
  const configuredKey = gateway === "moyu" ? config?.kimi?.moyuApiKey : config?.kimi?.moonshotApiKey || config?.kimi?.apiKey;
  return typeof configuredKey === "string" ? configuredKey.trim() : "";
}

function normalizeKimiBaseUrl(value) {
  const candidate = String(value || "").trim().replace(/\/$/, "");
  return candidate === "https://api.moonshot.cn/v1" ? candidate : kimiBaseUrl;
}

async function resolveKimiBaseUrl(model = kimiDefaultModel) {
  if (kimiGatewayForModel(model) === "moyu") return kimiMoyuBaseUrl;
  if (process.env.KIMI_BASE_URL) return kimiBaseUrl;
  const config = await readProviderConfig();
  return normalizeKimiBaseUrl(config?.kimi?.baseUrl);
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

function imageMimeFromBuffer(buffer, fallbackMime = "image/png") {
  if (!Buffer.isBuffer(buffer)) return fallbackMime;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return fallbackMime;
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
      const length = Number(response.headers.get("content-length"));
      if (Number.isFinite(length) && length > maxRemoteImageBytes) throw new Error("返回图片超过 50 MB 限制");
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > maxRemoteImageBytes) throw new Error("返回图片超过 50 MB 限制");
      return { buffer, mime: response.headers.get("content-type") || "image/png" };
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
      const length = Number(response.headers.get("content-length"));
      if (Number.isFinite(length) && length > maxRemoteMediaBytes) throw new Error("返回媒体超过 512 MB 限制");
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > maxRemoteMediaBytes) throw new Error("返回媒体超过 512 MB 限制");
      return { buffer, mime: response.headers.get("content-type") || fallbackMime };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

function imageDimensions(buffer, mime = "") {
  if (!Buffer.isBuffer(buffer) || buffer.length < 10) return { width: 0, height: 0 };
  if (buffer.length >= 24 && (mime.includes("png") || buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (mime.includes("webp") || buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    const kind = buffer.subarray(12, 16).toString("ascii");
    if (kind === "VP8X" && buffer.length >= 30) return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    if (kind === "VP8 " && buffer.length >= 30) return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    if (kind === "VP8L" && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  if (mime.includes("jpeg") || mime.includes("jpg") || buffer[0] === 0xff && buffer[1] === 0xd8) {
    for (let offset = 2; offset + 9 < buffer.length;) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) { offset += 2; continue; }
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2 || offset + 2 + length > buffer.length) break;
      if (marker >= 0xc0 && marker <= 0xc3 || marker >= 0xc5 && marker <= 0xc7 || marker >= 0xc9 && marker <= 0xcb || marker >= 0xcd && marker <= 0xcf) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      offset += 2 + length;
    }
  }
  return { width: 0, height: 0 };
}

async function persistGeneratedImage(job, item, index) {
  let image;
  if (item?.b64_json) image = { buffer: Buffer.from(item.b64_json, "base64"), mime: "image/png" };
  else if (item?.url) image = await fetchResultImage(item.url);
  else throw new Error("接口响应中没有可用图片数据");
  if (!image.buffer.length) throw new Error("接口返回的图片为空");
  const mime = imageMimeFromBuffer(image.buffer, image.mime);
  const extension = extensionForMime(mime);
  const filename = `${job.id}-${index + 1}.${extension}`;
  const isLayer = job.kind === 'layer-decomposition';
  await fs.writeFile(path.join(isLayer ? assetsDir : generatedDir, filename), image.buffer);
  const dimensions = imageDimensions(image.buffer, mime);
  return { url: `/api/${isLayer ? 'assets' : 'generated'}/${filename}`, revisedPrompt: item.revised_prompt || "", width: dimensions.width, height: dimensions.height, outputType: extension };
}

async function persistGeneratedMedia(job, item, index) {
  const itemUrl = String(item?.url || "");
  const urlExtension = path.extname(new URL(itemUrl, "http://127.0.0.1").pathname).slice(1);
  const outputType = extensionForOutputType(item?.outputType || item?.fileType || urlExtension || "mp4");
  const file = item?.b64_json
    ? { buffer: Buffer.from(item.b64_json, "base64"), mime: mimeTypes[`.${outputType}`] || "application/octet-stream" }
    : item?.url ? await fetchRemoteFile(item.url, mimeTypes[`.${outputType}`] || "application/octet-stream") : null;
  if (!file?.buffer?.length) throw new Error("RunningHub 返回的媒体文件为空");
  const extension = outputType !== "bin" ? outputType : extensionForMime(file.mime);
  const filename = `${job.id}-${index + 1}.${extension}`;
  await fs.writeFile(path.join(generatedDir, filename), file.buffer);
  return { url: `/api/generated/${filename}`, outputType: extension, nodeId: item?.nodeId || "", text: item?.text || "" };
}

async function collectRequestedImageItems(requestedCount, requestOnce) {
  const targetCount = Math.min(4, Math.max(1, Number(requestedCount) || 1));
  const items = [];
  while (items.length < targetCount) {
    const remaining = targetCount - items.length;
    const responseItems = await requestOnce(remaining, items.length);
    if (!Array.isArray(responseItems) || !responseItems.length) throw gatewayError(502, "接口响应中没有图片");
    items.push(...responseItems);
  }
  return items.slice(0, targetCount);
}

async function requestImage2Generation(job) {
  const { apiKey, prompt, quality, size, outputFormat, n, references } = job.request;
  const endpoint = references.length ? "/images/edits" : "/images/generations";
  const requestOnce = async (count, index) => {
    let requestBody;
    const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Idempotency-Key": index ? `${job.id}:${index + 1}` : job.id };
    if (references.length) {
      const form = new FormData();
      form.append("model", job.model);
      form.append("prompt", prompt);
      form.append("quality", quality);
      form.append("size", size);
      form.append("output_format", outputFormat);
      form.append("n", String(count));
      references.forEach((dataUrl, referenceIndex) => {
        const { blob, filename } = parseDataUrl(dataUrl, referenceIndex);
        form.append("image[]", blob, filename);
      });
      requestBody = form;
    } else {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify({ model: job.model, prompt, quality, size, output_format: outputFormat, n: count });
    }
    const response = await fetch(`${baseUrl}${endpoint}`, { method: "POST", headers, body: requestBody, signal: AbortSignal.timeout(10 * 60_000) });
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); } catch { result = { error: { message: raw.slice(0, 500) || "接口返回了无法解析的内容" } }; }
    if (!response.ok) throw gatewayError(response.status, result?.error?.message || result?.message || `Image2 请求失败 (${response.status})`);
    return Array.isArray(result.data) ? result.data : [];
  };
  // Preserve native batch support, then top up when an OpenAI-compatible gateway returns fewer images than requested.
  const items = await collectRequestedImageItems(n, requestOnce);
  return { items, mode: references.length ? "edit" : "generate", referencesUsed: references.length };
}

async function requestArkGeneration(job) {
  const layerJob = job.kind === 'layer-decomposition';
  const payload = (layerJob ? buildLayerPayload : job.kind==='local-image-edit'?buildLocalEditPayload:buildArkPayload)({ ...job.request, provider: job.provider, model: job.model });
  // A POST is never automatically retried: a lost response may already be billable.
  const response = await fetch(`${job.provider === 'ark-plan' ? arkPlanBaseUrl : arkBaseUrl}/images/generations`, { method: 'POST', headers: { Authorization: `Bearer ${job.request.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10 * 60_000) });
  let result;
  try { result = await response.json(); } catch { throw gatewayError(502, '火山引擎返回了无法解析的响应，请检查控制台后手动重试'); }
  if (!response.ok) {
    const code = String(result?.error?.code || '').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 100);
    const hint = response.status === 401 ? '请检查官方 API Key' : response.status === 403 ? '请检查模型开通、权限或余额' : response.status === 429 ? '额度或并发受限，请稍后手动重试' : '请检查模型权限、参考图和提示词';
    throw gatewayError(response.status, `火山引擎请求失败 (${response.status}${code ? ` / ${code}` : ''})：${hint}`);
  }
  const items = Array.isArray(result.data) ? result.data : [];
  if (!items.length || items.some(item => item?.error || (!item?.url && !item?.b64_json))) throw gatewayError(502, '火山引擎未返回完整图片结果，请检查控制台后再手动重试');
  if (layerJob) {
    if (items.length < 2 || items.length > 17) throw gatewayError(502, '拆层没有返回有效的底图和图层');
    return { items, mode: 'layers', referencesUsed: 1 };
  }
  if (items.length !== 1) throw gatewayError(502, '火山引擎返回的图片数量与请求不符');
  return { items, mode: job.request.references.length ? 'edit' : 'generate', referencesUsed: job.request.references.length };
}

async function requestSeedreamGeneration(job) {
  const { apiKey, prompt, size, outputSize, n, references } = job.request;
  const modelName = normalizeSeedreamModel(job.model);
  const selectedReferences = references.slice(0, seedreamReferenceLimit());
  const requestOnce = async (count, index) => {
    const payload = { model: modelName, prompt, size, n: count };
    payload.watermark = false;
    // The gateway accepts one reference as a string and multiple references as an array.
    if (selectedReferences.length === 1) payload.image = selectedReferences[0];
    else if (selectedReferences.length > 1) payload.image = selectedReferences;
    const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json", "Idempotency-Key": index ? `${job.id}:${index + 1}` : job.id };
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(`${seedreamBaseUrl}/v1/images/generations`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10 * 60_000)
        });
        const raw = await response.text();
        let result;
        try { result = JSON.parse(raw); } catch { result = { error: { message: raw.slice(0, 500) || "接口返回了无法解析的内容" } }; }
        if (!response.ok) {
          lastError = gatewayError(response.status, result?.error?.message || result?.message || `Seedream 请求失败 (${response.status})`);
          if (response.status < 500 && response.status !== 429) throw lastError;
        } else {
          return Array.isArray(result.data) ? result.data : [];
        }
      } catch (error) {
        lastError = error;
        if (error?.code && error.code !== "GATEWAY" && error.code !== "RATE_LIMIT") throw error;
      }
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1200 * (attempt + 1)));
    }
    throw lastError || gatewayError(502, "Seedream 图像接口请求失败");
  };
  // The configured Seedream gateway returns one image per generation request.
  const items = await collectRequestedImageItems(n, requestOnce);
  return { items, mode: selectedReferences.length ? "edit" : "generate", referencesUsed: selectedReferences.length };
}

function mjTaskIdFrom(result) {
  const value = result?.result ?? result?.taskId ?? result?.task_id ?? result?.data?.taskId ?? result?.data?.task_id;
  return value === undefined || value === null ? "" : String(value).trim();
}

function mjTaskImageUrls(result) {
  const direct = [result?.imageUrl, result?.image_url, result?.url].filter(value => typeof value === "string" && value.trim());
  const arrays = [result?.imageUrls, result?.image_urls, result?.images, result?.data?.images, result?.data?.imageUrls]
    .filter(Array.isArray)
    .flatMap(items => items.map(item => typeof item === "string" ? item : item?.imageUrl || item?.image_url || item?.url))
    .filter(value => typeof value === "string" && value.trim());
  return [...new Set([...direct, ...arrays])];
}

function mjPromptWithAspect(prompt, aspect) {
  if (/--ar\s+\d+(?:\.\d+)?:\d+(?:\.\d+)?\b/i.test(prompt)) return prompt;
  const ratio = /^\d+:\d+$/.test(String(aspect || "")) ? aspect : "1:1";
  return `${prompt.trim()} --ar ${ratio}`;
}

async function fetchMjTask(headers, taskId) {
  const deadline = Date.now() + 20 * 60_000;
  let latest = null;
  while (Date.now() < deadline) {
    const taskResponse = await fetch(`${mjBaseUrl}/mj/task/${encodeURIComponent(taskId)}/fetch`, { headers, signal: AbortSignal.timeout(30_000) });
    const taskRaw = await taskResponse.text();
    let task;
    try { task = JSON.parse(taskRaw); } catch { task = { description: taskRaw.slice(0, 500) || "Midjourney 查询接口返回了无法解析的内容" }; }
    if (!taskResponse.ok) throw gatewayError(taskResponse.status, task?.description || task?.message || "Midjourney 任务查询失败");
    latest = task?.data && typeof task.data === "object" ? task.data : task;
    const status = String(latest?.status || latest?.state || "").toUpperCase();
    const urls = mjTaskImageUrls(latest);
    if (status === "SUCCESS" && urls.length) return { task: latest, urls };
    if (["FAILURE", "FAILED", "CANCEL", "CANCELLED"].includes(status)) throw gatewayError(502, latest?.failReason || latest?.description || "Midjourney 任务失败");
    await new Promise(resolve => setTimeout(resolve, 3_000));
  }
  throw gatewayError(504, `Midjourney 任务等待超时 (${latest?.id || taskId})`);
}

async function submitMjTask(headers, jobId, pathname, body, sequence) {
  const response = await fetch(`${mjBaseUrl}${pathname}`, {
    method: "POST",
    headers: { ...headers, "Idempotency-Key": `${jobId}:${sequence}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000)
  });
  const raw = await response.text();
  let submitted;
  try { submitted = JSON.parse(raw); } catch { submitted = { description: raw.slice(0, 500) || "Midjourney 提交接口返回了无法解析的内容" }; }
  const taskId = mjTaskIdFrom(submitted);
  if (!response.ok || !taskId || ![0, 1, 22].includes(Number(submitted?.code ?? 1))) {
    throw gatewayError(response.status || 502, submitted?.description || submitted?.message || "Midjourney 任务提交失败");
  }
  return taskId;
}

function mjUpscaleActions(task) {
  return [1, 2, 3, 4].flatMap(slot => {
    const button = (task?.buttons || []).find(item => new RegExp(`^U${slot}\\b`, "i").test(String(item?.label || "")) || new RegExp(`(?:upscale|upsample)::${slot}(?:::|$)`, "i").test(String(item?.customId || "")));
    return button?.customId ? [{ slot, customId: button.customId }] : [];
  });
}

async function requestMjGeneration(job) {
  const { apiKey, prompt, aspect, references } = job.request;
  const selectedReferences = references.slice(0, 4);
  selectedReferences.forEach((dataUrl, index) => {
    const source = parseStoredImage(dataUrl, `第 ${index + 1} 张 Midjourney 参考图`);
    if (source.buffer.length > 4 * 1024 * 1024) throw gatewayError(400, `第 ${index + 1} 张 Midjourney 参考图超过 4MB，请先压缩后再运行`);
  });
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" };
  const imagineTaskId = await submitMjTask(headers, job.id, "/mj/submit/imagine", {
    botType: "MID_JOURNEY",
    prompt: mjPromptWithAspect(prompt, aspect),
    base64Array: selectedReferences,
    accountFilter: { modes: ["FAST"], remix: true, remixAutoConsidered: true },
    state: job.id
  }, 1);
  const imagineResult = await fetchMjTask(headers, imagineTaskId);
  const actions = mjUpscaleActions(imagineResult.task);
  if (!actions.length) throw gatewayError(502, "Midjourney 未返回 U1-U4 单图操作，请检查网关的按钮映射");
  return {
    items: imagineResult.urls.slice(0, 1).map(url => ({ url })),
    mode: selectedReferences.length ? "reference" : "generate",
    referencesUsed: selectedReferences.length,
    midjourney: { kind: "grid", taskId: imagineTaskId, slots: actions.map(action => action.slot), actions }
  };
}

async function requestMjUpscale(job) {
  const { apiKey, parentTaskId, customId, slot } = job.request;
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" };
  const actionTaskId = await submitMjTask(headers, job.id, "/mj/submit/action", { chooseSameChannel: true, customId, taskId: parentTaskId, state: job.id }, 1);
  const result = await fetchMjTask(headers, actionTaskId);
  return { items: result.urls.slice(0, 1).map(url => ({ url })), mode: "upscale", referencesUsed: 0, midjourney: { kind: "upscale", parentTaskId, slot, taskId: actionTaskId } };
}

function runningHubNodeInfo(nodeId, fieldName, fieldValue) {
  return { nodeId: String(nodeId), fieldName: String(fieldName), fieldValue: fieldValue ?? "" };
}

function runningHubVideoWorkflowForMode(value) { return runningHubVideoWorkflows[String(value || "")] || null; }

function runningHubLengthExpression(seconds) {
  const value = Math.min(15, Math.max(5, Math.round(Number(seconds) || 5)));
  return `max(5, round(${value} * 24)) + (5 - (max(5, round(${value} * 24)) % 17)) % 17`;
}

function runningHubAspectLabel(value) {
  const labels = { "1:1": "1:1 (Square)", "4:3": "4:3 (Standard)", "3:2": "3:2 (Photo)", "16:9": "16:9 (Widescreen)", "2:1": "21:9 (Ultrawide)", "9:16": "9:16 (Portrait Widescreen)", "3:4": "3:4 (Portrait Standard)", "2:3": "2:3 (Portrait Photo)" };
  return labels[String(value || "16:9")] || labels["16:9"];
}

async function uploadRunningHubResource(apiKey, sourceValue, index, kind) {
  let source;
  if (kind === "image") source = parseStoredImage(sourceValue, `第 ${index + 1} 张视频参考图`);
  else {
    const filePath = kind === "video" ? await localVideoPath(sourceValue) : await localMediaPath(sourceValue, kind);
    const buffer = await fs.readFile(filePath);
    const extension = path.extname(filePath).slice(1).toLowerCase();
    const mime = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    source = { buffer, extension, mime };
  }
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
  const { apiKey, prompt, seconds, workflowId, imageNodes, videoNode, audioNode, aspect, megapixels, references = [], videoReference = "", audioReference = "" } = job.request;
  const nodeInfoList = [
    runningHubNodeInfo("138", "value", prompt),
    runningHubNodeInfo("131", "expression", runningHubLengthExpression(seconds)),
    runningHubNodeInfo("115", "aspect_ratio", runningHubAspectLabel(aspect)),
    runningHubNodeInfo("115", "megapixels", megapixels)
  ];
  let uploadedReferences;
  try {
    uploadedReferences = await Promise.all(references.slice(0, imageNodes.length).map((reference, index) => uploadRunningHubResource(apiKey, reference, index, "image")));
    updateRunningHubDiagnostic(job, { stage: "上传参考图", httpStatus: 200, referenceCount: uploadedReferences.length });
  } catch (error) {
    const diagnostic = { stage: "上传参考图", httpStatus: error?.diagnostic?.httpStatus || 0, errorCode: error?.code || "", errorMessage: diagnosticText(error?.message || "RunningHub 视频参考图上传失败") };
    updateRunningHubDiagnostic(job, diagnostic);
    error.diagnostic = diagnostic;
    throw error;
  }
  uploadedReferences.forEach((fileName, index) => nodeInfoList.push(runningHubNodeInfo(imageNodes[index], "image", fileName)));
  if (job.cancelRequested) throw Object.assign(new Error("视频任务已停止"), { code: "CANCELED" });
  if (videoReference) nodeInfoList.push(runningHubNodeInfo(videoNode, "video", await uploadRunningHubResource(apiKey, videoReference, 0, "video")));
  if (audioReference) nodeInfoList.push(runningHubNodeInfo(audioNode, "audio", await uploadRunningHubResource(apiKey, audioReference, 0, "audio")));
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json", "Idempotency-Key": job.id };
  const submitResponse = await fetch(`${runningHubBaseUrl}/openapi/v2/run/workflow/${workflowId}`, {
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
  job.remoteTaskId = String(submitted.taskId);
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
    if (job.cancelRequested) throw Object.assign(new Error("视频任务已停止"), { code: "CANCELED" });
    const previewUrl = Array.isArray(status.results) ? status.results.find(item => item?.url)?.url : status.previewUrl || status.preview_url;
    if (previewUrl && typeof previewUrl === "string") { job.previewRemoteUrl = previewUrl; await persistJobs(); }
    if (status.status === "SUCCESS") {
      const results = Array.isArray(status.results) ? status.results.filter(item => item?.url) : [];
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

async function requestRunningHubKrea2Generation(job) {
  const { apiKey, prompt, width, height, n, workflow } = job.request;
  const nodeInfoList = [
    runningHubNodeInfo(workflow.promptNode, "text", prompt),
    runningHubNodeInfo(workflow.widthNode, "width", width),
    runningHubNodeInfo(workflow.heightNode, "height", height),
    runningHubNodeInfo(workflow.batchNode, "batch_size", n)
  ];
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json", "Idempotency-Key": job.id };
  const submitResponse = await fetch(`${runningHubBaseUrl}/openapi/v2/run/workflow/${workflow.id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ addMetadata: true, nodeInfoList, instanceType: runningHubInstanceType, usePersonalQueue: false }),
    signal: AbortSignal.timeout(60_000)
  });
  const submitRaw = await submitResponse.text();
  let submitted;
  try { submitted = JSON.parse(submitRaw); } catch { submitted = {}; }
  const submitDiagnostic = runningHubDiagnostic("提交 Krea2 工作流", submitResponse.status, submitted, submitRaw);
  updateRunningHubDiagnostic(job, submitDiagnostic);
  if (!submitResponse.ok || !submitted?.taskId) throw runningHubRequestError("提交 Krea2 工作流", submitResponse.status, submitted, submitRaw, "RunningHub Krea2 工作流提交失败");
  job.remoteTaskId = String(submitted.taskId);
  await persistJobs();
  if (job.cancelRequested) {
    await fetch(`${runningHubBaseUrl}/task/openapi/cancel`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ apiKey, taskId: submitted.taskId }), signal: AbortSignal.timeout(30_000) });
    throw Object.assign(new Error("K2 白玉任务已停止"), { code: "CANCELED" });
  }
  const startedAt = Date.now();
  let lastStatus = submitted;
  while (Date.now() - startedAt < 45 * 60_000) {
    const response = await fetch(`${runningHubBaseUrl}/openapi/v2/query`, { method: "POST", headers, body: JSON.stringify({ taskId: submitted.taskId }), signal: AbortSignal.timeout(60_000) });
    const raw = await response.text();
    let status;
    try { status = JSON.parse(raw); } catch { status = {}; }
    const queryDiagnostic = runningHubDiagnostic("查询 Krea2 任务", response.status, status, raw);
    updateRunningHubDiagnostic(job, queryDiagnostic);
    if (!response.ok) throw runningHubRequestError("查询 Krea2 任务", response.status, status, raw, "RunningHub Krea2 任务查询失败");
    lastStatus = status;
    if (job.cancelRequested) throw Object.assign(new Error("K2 白玉任务已停止"), { code: "CANCELED" });
    if (status.status === "SUCCESS") {
      const results = Array.isArray(status.results) ? status.results.filter(item => item?.url || item?.text).slice(0, n) : [];
      if (!results.length) throw gatewayError(502, "Krea2 工作流成功但没有可下载图片");
      return { items: results, mode: "workflow", referencesUsed: 0, taskId: submitted.taskId };
    }
    if (status.status === "FAILED") throw runningHubRequestError("执行 Krea2 工作流", 502, status, raw, `RunningHub Krea2 任务失败 (${status.errorCode || "UNKNOWN"})`);
    await new Promise(resolve => setTimeout(resolve, 5_000));
  }
  throw gatewayError(504, `RunningHub Krea2 任务等待超时 (${lastStatus?.taskId || submitted.taskId})`);
}

async function executeJob(job) {
  job.status = "running";
  job.startedAt = Date.now();
  await persistJobs();
  await writeJobLog(job, "started");
  try {
    const result = isArkProvider(job.provider) ? await requestArkGeneration(job) : job.provider === "runninghub-h3" ? await requestRunningHubGeneration(job) : job.provider === "runninghub-krea2" ? await requestRunningHubKrea2Generation(job) : job.kind === "midjourney-upscale" ? await requestMjUpscale(job) : job.provider === "midjourney" ? await requestMjGeneration(job) : job.provider === "moyu" ? await requestSeedreamGeneration(job) : await requestImage2Generation(job);
    if (result.mediaType === "video") job.media = await Promise.all(result.items.map((item, index) => persistGeneratedMedia(job, item, index)));
    else job.images = await Promise.all(result.items.map((item, index) => persistGeneratedImage(job, item, index)));
    if (job.kind === 'layer-decomposition') {
      const items = job.images.map((image,index) => ({ ...image, z_index: result.items[index].z_index, name: result.items[index].name, description: result.items[index].description, bounding_box: result.items[index].bounding_box }));
      job.layerDocument = createLayerDocument(items);
    }
    if (isArkProvider(job.provider)) job.imageCount = job.images.length;
    job.status = "succeeded";
    job.mode = result.mode;
    job.referencesUsed = result.referencesUsed;
    if (result.midjourney) job.midjourney = result.midjourney;
    job.finishedAt = Date.now();
  } catch (error) {
    const failure = classifyError(error);
    job.status = failure.code === "CANCELED" || job.cancelRequested ? "canceled" : "failed";
    job.errorCode = job.status === "canceled" ? "CANCELED" : failure.code;
    job.error = job.status === "canceled" ? (job.provider === "runninghub-krea2" ? "K2 白玉任务已停止" : "视频任务已停止") : failure.message;
    job.finishedAt = Date.now();
  } finally {
    delete job.request;
    await persistJobs();
    await writeJobLog(job, job.status === "succeeded" ? "completed" : job.status === "canceled" ? "canceled" : "failed");
  }
}

async function cancelJob(req, res, jobId) {
  const job = jobs.get(jobId);
  const cancelable = job?.provider === "runninghub-h3" || job?.provider === "runninghub-krea2";
  const taskLabel = job?.provider === "runninghub-krea2" ? "K2 白玉" : "视频";
  if (!job || !cancelable) return sendJson(res, 404, { error: `${taskLabel}任务不存在` });
  if (["succeeded", "failed", "canceled"].includes(job.status)) return sendJson(res, 200, { job: jobView(job), canceled: job.status === "canceled" });
  job.cancelRequested = true;
  const remoteTaskId = job.remoteTaskId || job.runningHub?.taskId || "";
  try {
    if (remoteTaskId && job.request?.apiKey) {
      const response = await fetch(`${runningHubBaseUrl}/task/openapi/cancel`, { method: "POST", headers: { Authorization: `Bearer ${job.request.apiKey}`, Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: job.request.apiKey, taskId: remoteTaskId }), signal: AbortSignal.timeout(30_000) });
      const raw = await response.text(); let result; try { result = JSON.parse(raw); } catch { result = {}; }
      updateRunningHubDiagnostic(job, runningHubDiagnostic("取消任务", response.status, result, raw));
      if (!response.ok || Number(result?.code) !== 0) throw runningHubRequestError("取消任务", response.status, result, raw, "RunningHub 任务取消失败");
    }
    job.status = "canceled"; job.errorCode = "CANCELED"; job.error = `${taskLabel}任务已停止`; job.finishedAt = Date.now();
    await persistJobs(); await writeJobLog(job, "canceled");
    return sendJson(res, 200, { job: jobView(job), canceled: true });
  } catch (error) {
    delete job.cancelRequested;
    return sendJson(res, 502, { error: error?.message || "RunningHub 任务取消失败", code: error?.code || "GATEWAY" });
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
    if (isArkProvider(body.provider)) return createArkJob(req, res, body);
    if (body.provider === "gemini") return sendJson(res, 400, { error: "Gemini 已移除，请选择 Image2 或 Seedream" });
    const provider = body.provider === "runninghub-h3" ? "runninghub-h3" : body.provider === "runninghub-krea2" ? "runninghub-krea2" : body.provider === "moyu" ? "moyu" : body.provider === "midjourney" ? "midjourney" : "image2";
    if (provider === "runninghub-h3") return createRunningHubJob(req, res, body);
    if (provider === "runninghub-krea2") return createRunningHubKrea2Job(req, res, body);
    const usesSeedream = provider === "moyu";
    if (usesSeedream && body.model && !seedreamImageModels.includes(String(body.model))) return sendJson(res, 400, { error: "不支持的 Seedream 图像模型" });
    const isMj = provider === "midjourney";
    const apiKey = isMj ? await resolveMjApiKey(req) : usesSeedream ? await resolveSeedreamApiKey(req) : await resolveApiKey(req);
    if (!apiKey) return sendJson(res, 401, { error: isMj ? "未配置 Midjourney API Key，请在设置中保存密钥" : usesSeedream ? "未配置 Seedream API Key，请在设置中保存密钥" : "未找到 API Key，请在设置中临时输入，或在启动前设置 OPENAI_API_KEY" });
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return sendJson(res, 400, { error: "提示词不能为空" });
    const selectedImage2Model = image2Models.includes(String(body.model || "")) ? String(body.model) : model;
    const usesImage25 = image25Models.includes(selectedImage2Model);
    const supportsAdvancedImage25Quality = image25AdvancedModels.includes(selectedImage2Model);
    const qualityOptions = supportsAdvancedImage25Quality ? image25Qualities : ["low", "medium", "high"];
    const quality = qualityOptions.includes(body.quality) ? body.quality : supportsAdvancedImage25Quality ? "auto" : "high";
    const requestedSize = String(body.size || "");
    const size = usesImage25
      ? (validImage25Size(requestedSize) ? requestedSize : "1024x1024")
      : (/^\d{3,4}x\d{3,4}$/.test(requestedSize) ? requestedSize : "1024x1024");
    const aspect = /^(?:1:1|3:4|4:3|16:9|9:16)$/.test(String(body.aspect || "")) ? String(body.aspect) : "1:1";
    const selectedModel = isMj ? mjFastModel : usesSeedream ? normalizeSeedreamModel(body.model) : selectedImage2Model;
    const outputSize = usesSeedream ? normalizeSeedreamOutputSize() : "current";
    // Keep generated Image2 assets lossless unless a future node-level format setting explicitly changes it.
    const outputFormat = "png";
    const n = isMj ? 1 : Math.min(4, Math.max(1, Number(body.n) || 1));
    const maxReferences = isMj ? 4 : provider === "moyu" ? 6 : 8;
    const references = Array.isArray(body.references) ? body.references.slice(0, maxReferences) : [];
    const job = { id: `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, status: "queued", createdAt: Date.now(), provider, model: selectedModel, imageCount: n, request: { apiKey, prompt, quality, size, aspect, outputSize, outputFormat, n, references } };
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

async function createLayerJob(req, res) {
  try {
    const body = await readJson(req);
    const payload = buildLayerPayload(body);
    const input = Buffer.from(payload.image.split(',')[1], 'base64');
    const dimensions = imageDimensions(input, imageMimeFromBuffer(input, ''));
    const pixels = dimensions.width * dimensions.height;
    if (pixels < 262144 || pixels > 36000000 || dimensions.width / dimensions.height < 1/16 || dimensions.width / dimensions.height > 16) return sendJson(res, 400, { error: '拆层图片总像素需在 512×512 至 3600 万之间，宽高比在 1:16 至 16:1 之间' });
    const apiKey = await resolveArkApiKey(req, 'ark-plan');
    if (!apiKey) return sendJson(res, 401, { error: '请先在设置中配置火山 Agent Plan 套餐密钥' });
    const job = { id: 'job-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8), kind: 'layer-decomposition', status: 'queued', createdAt: Date.now(), provider: 'ark-plan', model: body.model, imageCount: 1, request: { apiKey, image: payload.image, prompt: payload.prompt } };
    jobs.set(job.id, job); pendingJobIds.push(job.id); await persistJobs(); await writeJobLog(job, 'queued');
    sendJson(res, 202, { job: jobView(job) }); void drainJobs();
  } catch (error) { return sendJson(res, 400, { error: error.message || '拆层任务创建失败' }); }
}

async function createArkJob(req, res, body) {
  try {
    buildArkPayload(body);
    const apiKey = await resolveArkApiKey(req, body.provider);
    if (!apiKey) return sendJson(res, 401, { error: body.provider === 'ark-plan' ? '请先在设置中保存火山 Agent Plan 套餐密钥' : '请先在设置中保存火山引擎官方 API Key' });
    const job = { id: `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, status: 'queued', createdAt: Date.now(), provider: body.provider, model: body.model, imageCount: 1, request: { apiKey, prompt: String(body.prompt || ''), aspect: body.aspect, n: 1, references: body.references || [] } };
    jobs.set(job.id, job); pendingJobIds.push(job.id);
    await persistJobs(); await writeJobLog(job, 'queued');
    sendJson(res, 202, { job: jobView(job) }); void drainJobs();
  } catch (error) { return sendJson(res, 400, { error: error?.message || '火山引擎任务创建失败' }); }
}

async function createLocalEditJob(req,res){
  try{
    const body=await readJson(req,84*1024*1024),payload=buildLocalEditPayload(body);
    if(!/^[a-f0-9-]{36}$/.test(body.requestId||''))throw Error('缺少有效的编辑请求编号');
    const id='job-le-'+body.requestId,requestHash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const existing=()=>{const job=jobs.get(id);if(!job)return false;sendJson(res,job.requestHash===requestHash?200:409,job.requestHash===requestHash?{job:jobView(job)}:{error:'请求编号已用于另一项编辑'});return true;};
    if(existing())return;
    for(const image of body.references){const bytes=Buffer.from(image.split(',')[1],'base64'),d=imageDimensions(bytes,imageMimeFromBuffer(bytes,''));if(d.width<=14||d.height<=14||d.width*d.height>36000000||d.width/d.height<1/16||d.width/d.height>16)throw Error('参考图尺寸或宽高比不符合模型要求');}
    const apiKey=await resolveArkApiKey(req,'ark-plan');if(!apiKey)return sendJson(res,401,{error:'请先配置火山 Agent Plan 套餐密钥'});
    if(existing())return;
    const job={id,requestHash,kind:'local-image-edit',status:'queued',createdAt:Date.now(),provider:'ark-plan',model:body.model,imageCount:1,request:{apiKey,prompt:payload.prompt,size:payload.size,references:body.references,n:1}};
    jobs.set(id,job);
    try{await persistJobs();}catch(error){jobs.delete(id);throw error;}
    pendingJobIds.push(id);await writeJobLog(job,'queued').catch(()=>{});sendJson(res,202,{job:jobView(job)});void drainJobs();
  }catch(error){return sendJson(res,400,{error:error.message||'局部修改任务创建失败'});}
}

async function createRunningHubKrea2Job(req, res, body) {
  try {
    const apiKey = await resolveRunningHubApiKey(req);
    if (!apiKey) return sendJson(res, 401, { error: "未配置 RunningHub API Key，请在设置中保存密钥" });
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return sendJson(res, 400, { error: "提示词不能为空" });
    const workflow = runningHubKrea2Workflow;
    const width = Math.min(4096, Math.max(32, Number(body.width) || workflow.defaultWidth));
    const height = Math.min(4096, Math.max(32, Number(body.height) || workflow.defaultHeight));
    const n = Math.min(workflow.maxBatch, Math.max(1, Math.round(Number(body.n) || 1)));
    const job = { id: `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, status: "queued", createdAt: Date.now(), provider: "runninghub-krea2", model: `Krea2 workflow ${workflow.id}`, imageCount: n, request: { apiKey, prompt, width, height, n, workflow } };
    jobs.set(job.id, job); pendingJobIds.push(job.id); await persistJobs(); await writeJobLog(job, "queued"); sendJson(res, 202, { job: jobView(job) }); void drainJobs();
  } catch (error) {
    const failure = classifyError(error); sendJson(res, failure.code === "REQUEST" ? 400 : 500, { error: failure.message, code: failure.code });
  }
}

async function createMjUpscaleJob(req, res, parentJobId) {
  try {
    const parent = jobs.get(parentJobId);
    if (!parent || parent.provider !== "midjourney" || parent.midjourney?.kind !== "grid" || parent.status !== "succeeded") return sendJson(res, 404, { error: "Midjourney 候选四宫格任务不存在或尚未完成" });
    const body = await readJson(req);
    const slot = Math.min(4, Math.max(1, Math.round(Number(body.slot) || 0)));
    const action = parent.midjourney.actions?.find(item => item.slot === slot);
    if (!action?.customId) return sendJson(res, 400, { error: `该候选图没有可用的 U${slot} 单图操作` });
    const apiKey = await resolveMjApiKey(req);
    if (!apiKey) return sendJson(res, 401, { error: "未配置 Midjourney API Key，请在设置中保存密钥" });
    const job = {
      id: `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      kind: "midjourney-upscale",
      status: "queued",
      createdAt: Date.now(),
      provider: "midjourney",
      model: mjFastModel,
      imageCount: 1,
      parentJobId,
      request: { apiKey, parentTaskId: parent.midjourney.taskId, customId: action.customId, slot }
    };
    jobs.set(job.id, job); pendingJobIds.push(job.id); await persistJobs(); await writeJobLog(job, "queued"); sendJson(res, 202, { job: jobView(job) }); void drainJobs();
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
    const videoMode = "reference";
    const workflow = runningHubVideoWorkflowForMode(videoMode);
    if (!workflow) return sendJson(res, 500, { error: "RunningHub 多图参考工作流未配置" });
    const maxReferences = workflow.imageNodes.length;
    const references = (Array.isArray(body.references) ? body.references : []).filter(item => /^data:image\/(png|jpeg|webp);base64,/i.test(String(item || ""))).slice(0, maxReferences);
    if (!references.length) return sendJson(res, 400, { error: "多图参考生视频至少需要 1 张参考图" });
    const aspect = /^(?:1:1|3:2|4:3|16:9|2:1|9:16|3:4|2:3)$/.test(String(body.aspect || "")) ? String(body.aspect) : workflow.defaultAspect;
    const megapixels = Math.min(2, Math.max(0.2, Number(body.megapixels) || workflow.defaultMegapixels));
    const seconds = Math.min(workflow.maxSeconds, Math.max(workflow.minSeconds, Math.round(Number(body.seconds) || 6)));
    const videoReference = /^\/(?:api\/(?:video-assets|generated|video-edited))\/[A-Za-z0-9._%()\-]+$/.test(String(body.videoReference || "")) ? String(body.videoReference) : "";
    const audioReference = /^\/api\/audio-assets\/[A-Za-z0-9._%()\-]+$/.test(String(body.audioReference || "")) ? String(body.audioReference) : "";
    const job = { id: `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, status: "queued", createdAt: Date.now(), provider: "runninghub-h3", model: `H3 workflow ${workflow.id}`, mediaType: "video", imageCount: 1, videoMode, videoAspect: aspect, videoMegapixels: megapixels, videoSeconds: seconds, request: { apiKey, prompt, seconds, workflowId: workflow.id, imageNodes: workflow.imageNodes, videoNode: workflow.videoNode, audioNode: workflow.audioNode, aspect, megapixels, references, videoReference, audioReference } };
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
    const listedModels = Array.isArray(result.data) ? new Set(result.data.map(item => item?.id)) : null;
    const availableModels = listedModels ? image2Models.filter(id => listedModels.has(id)) : image2Models;
    const available = availableModels.includes(model);
    return sendJson(res, available ? 200 : 502, { ready: available, gateway: available ? "ready" : "model_unavailable", model, models: availableModels, checkedAt: Date.now() });
  } catch (error) {
    const failure = classifyError(error);
    return sendJson(res, 502, { ready: false, gateway: failure.code.toLowerCase(), message: failure.message, checkedAt: Date.now() });
  }
}

async function checkSeedreamGateway(req, res) {
  const apiKey = await resolveSeedreamApiKey(req);
  if (!apiKey) return sendJson(res, 401, { ready: false, gateway: "missing_key", message: "未配置 Seedream API Key" });
  try {
    const response = await fetch(`${seedreamBaseUrl}/v1/models`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw gatewayError(response.status, "Seedream 网关鉴权失败");
    const result = await response.json().catch(() => ({}));
    const listedModels = Array.isArray(result.data) ? new Set(result.data.map(item => item?.id)) : null;
    const availableModels = listedModels ? seedreamImageModels.filter(id => listedModels.has(id)) : seedreamImageModels;
    const available = availableModels.length > 0;
    return sendJson(res, available ? 200 : 502, { ready: available, gateway: available ? "ready" : "model_unavailable", model: seedreamDefaultModel, models: availableModels, baseUrl: seedreamBaseUrl, checkedAt: Date.now() });
  } catch (error) {
    const failure = classifyError(error);
    return sendJson(res, 502, { ready: false, gateway: failure.code.toLowerCase(), message: failure.message, checkedAt: Date.now() });
  }
}

async function checkMjGateway(req, res) {
  const apiKey = await resolveMjApiKey(req);
  if (!apiKey) return sendJson(res, 401, { ready: false, gateway: "missing_key", message: "未配置 Midjourney API Key" });
  try {
    const response = await fetch(`${mjBaseUrl}/v1/models`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw gatewayError(response.status, "Midjourney 网关鉴权失败");
    const result = await response.json().catch(() => ({}));
    const listedModels = Array.isArray(result.data) ? new Set(result.data.map(item => item?.id)) : null;
    const available = !listedModels || listedModels.has(mjFastModel);
    return sendJson(res, available ? 200 : 502, { ready: available, gateway: available ? "ready" : "model_unavailable", model: mjFastModel, baseUrl: mjBaseUrl, checkedAt: Date.now() });
  } catch (error) {
    const failure = classifyError(error);
    return sendJson(res, 502, { ready: false, gateway: failure.code.toLowerCase(), message: failure.message, checkedAt: Date.now() });
  }
}

async function checkDeepseekGateway(req, res) {
  const apiKey = await resolveDeepseekApiKey(req);
  if (!apiKey) return sendJson(res, 401, { ready: false, gateway: "missing_key", message: "未配置 DeepSeek API Key" });
  try {
    const response = await fetch(`${deepseekBaseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw gatewayError(response.status, "DeepSeek 网关鉴权失败");
    const result = await response.json().catch(() => ({}));
    const listedModels = Array.isArray(result.data)
      ? new Set(result.data.map(item => normalizeDeepseekModel(item?.id)).filter(Boolean))
      : null;
    const availableModels = listedModels ? deepseekModels.filter(id => listedModels.has(id)) : deepseekModels;
    const available = availableModels.length > 0;
    const defaultModel = availableModels.includes(deepseekVisionModel) ? deepseekVisionModel : availableModels[0] || deepseekVisionModel;
    return sendJson(res, available ? 200 : 502, { ready: available, gateway: available ? "ready" : "model_unavailable", model: defaultModel, visionModel: deepseekVisionModel, models: availableModels, baseUrl: deepseekBaseUrl, checkedAt: Date.now() });
  } catch (error) {
    const failure = classifyError(error);
    return sendJson(res, 502, { ready: false, gateway: failure.code.toLowerCase(), message: failure.message, checkedAt: Date.now() });
  }
}

async function checkClaudeGateway(req, res) {
  const apiKey = await resolveClaudeApiKey(req);
  if (!apiKey) return sendJson(res, 401, { ready: false, gateway: "missing_key", message: "未配置 Claude API Key" });
  try {
    const response = await fetch(`${claudeBaseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw gatewayError(response.status, "Claude 网关鉴权失败");
    const result = await response.json().catch(() => ({}));
    const listedModels = Array.isArray(result.data) ? new Set(result.data.map(item => item?.id)) : null;
    const availableModels = listedModels ? claudeModels.filter(id => listedModels.has(id)) : claudeModels;
    const available = availableModels.length > 0;
    return sendJson(res, available ? 200 : 502, { ready: available, gateway: available ? "ready" : "model_unavailable", model: claudeDefaultModel, models: availableModels, baseUrl: claudeBaseUrl, checkedAt: Date.now() });
  } catch (error) {
    const failure = classifyError(error);
    return sendJson(res, 502, { ready: false, gateway: failure.code.toLowerCase(), message: failure.message, checkedAt: Date.now() });
  }
}

async function checkKimiGateway(req, res) {
  const model = normalizeKimiModel(new URL(req.url, "http://localhost").searchParams.get("model"));
  if (!kimiModels.includes(model)) return sendJson(res, 400, { ready: false, gateway: "invalid_model", message: "不支持的 Kimi K3 配置" });
  const gateway = kimiGatewayForModel(model);
  const apiKey = await resolveKimiApiKey(req, model);
  if (!apiKey) return sendJson(res, 401, { ready: false, gateway: "missing_key", model, message: `未配置 ${gateway === "moyu" ? "魔芋 AI" : "Moonshot 官方"} Kimi API Key` });
  try {
    const baseUrl = await resolveKimiBaseUrl(model);
    const response = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw gatewayError(response.status, "Kimi 网关鉴权失败");
    const result = await response.json().catch(() => ({}));
    const listedModels = Array.isArray(result.data) ? new Set(result.data.map(item => item?.id)) : null;
    const available = !listedModels || listedModels.has(kimiApiModel);
    return sendJson(res, available ? 200 : 502, { ready: available, gateway: available ? "ready" : "model_unavailable", model, apiModel: kimiApiModel, models: available ? [kimiApiModel] : [], baseUrl, checkedAt: Date.now() });
  } catch (error) {
    const failure = classifyError(error);
    return sendJson(res, 502, { ready: false, gateway: failure.code.toLowerCase(), message: failure.message, checkedAt: Date.now() });
  }
}

async function saveSeedreamProvider(req, res) {
  try {
    const body = await readJson(req, 64 * 1024);
    const apiKey = String(body.apiKey || "").trim();
    if (!apiKey) return sendJson(res, 400, { error: "Seedream API Key 不能为空" });
    const previous = await readProviderConfig();
    await saveProviderConfig({ ...previous, seedream: { ...(previous.seedream || {}), apiKey, baseUrl: seedreamBaseUrl, model: seedreamDefaultModel, updatedAt: Date.now() } });
    return sendJson(res, 200, { ready: true, provider: "moyu", model: seedreamDefaultModel, models: seedreamImageModels, baseUrl: seedreamBaseUrl });
  } catch (error) {
    return sendJson(res, 400, { error: error?.message || "Seedream 设置保存失败" });
  }
}

function safeDecodePath(value) {
  try { return decodeURIComponent(String(value || "")); }
  catch { return null; }
}

async function saveMjProvider(req, res) {
  try {
    const body = await readJson(req, 64 * 1024);
    const apiKey = String(body.apiKey || "").trim();
    if (!apiKey) return sendJson(res, 400, { error: "Midjourney API Key 不能为空" });
    const previous = await readProviderConfig();
    await saveProviderConfig({ ...previous, midjourney: { ...(previous.midjourney || {}), apiKey, baseUrl: mjBaseUrl, model: mjFastModel, updatedAt: Date.now() } });
    return sendJson(res, 200, { ready: true, provider: "midjourney", model: mjFastModel, baseUrl: mjBaseUrl });
  } catch (error) {
    return sendJson(res, 400, { error: error?.message || "Midjourney 设置保存失败" });
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

async function saveDeepseekProvider(req, res) {
  try {
    const body = await readJson(req, 64 * 1024);
    const apiKey = String(body.apiKey || "").trim();
    if (!apiKey) return sendJson(res, 400, { error: "DeepSeek API Key 不能为空" });
    const previous = await readProviderConfig();
    await saveProviderConfig({ ...previous, deepseek: { ...(previous.deepseek || {}), apiKey, baseUrl: deepseekBaseUrl, model: deepseekVisionModel, updatedAt: Date.now() } });
    return sendJson(res, 200, { ready: true, provider: "deepseek", model: deepseekVisionModel, models: deepseekModels, baseUrl: deepseekBaseUrl });
  } catch (error) {
    return sendJson(res, 400, { error: error?.message || "DeepSeek 设置保存失败" });
  }
}

async function saveClaudeProvider(req, res) {
  try {
    const body = await readJson(req, 64 * 1024);
    const apiKey = String(body.apiKey || "").trim();
    if (!apiKey) return sendJson(res, 400, { error: "Claude API Key 不能为空" });
    const previous = await readProviderConfig();
    await saveProviderConfig({ ...previous, claude: { ...(previous.claude || {}), apiKey, baseUrl: claudeBaseUrl, model: claudeDefaultModel, updatedAt: Date.now() } });
    return sendJson(res, 200, { ready: true, provider: "claude", model: claudeDefaultModel, models: claudeModels, baseUrl: claudeBaseUrl });
  } catch (error) {
    return sendJson(res, 400, { error: error?.message || "Claude 设置保存失败" });
  }
}

async function saveKimiProvider(req, res) {
  try {
    const body = await readJson(req, 64 * 1024);
    const previous = await readProviderConfig();
    const previousKimi = previous.kimi || {};
    const legacyKey = String(body.apiKey || "").trim();
    const moyuApiKey = String(body.moyuApiKey || previousKimi.moyuApiKey || "").trim();
    const moonshotApiKey = String(body.moonshotApiKey || legacyKey || previousKimi.moonshotApiKey || previousKimi.apiKey || "").trim();
    if (!moyuApiKey && !moonshotApiKey) return sendJson(res, 400, { error: "至少需要配置一个 Kimi K3 API Key" });
    const baseUrl = process.env.KIMI_BASE_URL ? kimiBaseUrl : normalizeKimiBaseUrl(body.moonshotBaseUrl || previousKimi.baseUrl);
    await saveProviderConfig({ ...previous, kimi: { ...previousKimi, apiKey: moonshotApiKey, moonshotApiKey, moyuApiKey, baseUrl, model: kimiDefaultModel, updatedAt: Date.now() } });
    return sendJson(res, 200, { ready: true, provider: "kimi", models: kimiModels, gateways: { moyu: { model: "kimi-k3-moyu", apiModel: kimiApiModel, baseUrl: kimiMoyuBaseUrl, ready: Boolean(moyuApiKey) }, moonshot: { model: "kimi-k3-moonshot", apiModel: kimiApiModel, baseUrl, ready: Boolean(moonshotApiKey) } } });
  } catch (error) {
    return sendJson(res, 400, { error: error?.message || "Kimi 设置保存失败" });
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

async function openGeneratedFolder(req, res) {
  try {
    await fs.mkdir(generatedDir, { recursive: true });
    if (process.platform !== "win32") return sendJson(res, 501, { error: "当前系统不支持打开 Windows 图片文件夹" });
    const explorerPath = path.join(process.env.WINDIR || "C:\\Windows", "explorer.exe");
    await new Promise((resolve, reject) => {
      const child = spawn(explorerPath, [generatedDir], { detached: true, stdio: "ignore", windowsHide: false });
      child.once("error", reject);
      child.once("spawn", () => { child.unref(); resolve(); });
    });
    return sendJson(res, 200, { opened: true });
  } catch (error) {
    return sendJson(res, 500, { error: error?.message || "无法打开生成图片文件夹" });
  }
}

async function serveStoredMedia(req, res, directory, filename) {
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename) return sendJson(res, 403, { error: "禁止访问" });
  try {
    const filePath = path.join(directory, safeName);
    const stat = await fs.stat(filePath);
    const mime = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    const isVideo = mime.startsWith("video/");
    const baseHeaders = { "Content-Type": mime, "Accept-Ranges": "bytes", "Cache-Control": isVideo ? "no-store" : "private, max-age=3600" };
    const range = isVideo ? String(req.headers.range || "") : "";
    const match = range.match(/^bytes=(\d*)-(\d*)$/);
    if (match) {
      const start = Math.min(stat.size - 1, Math.max(0, Number(match[1] || 0)));
      const end = Math.min(stat.size - 1, Math.max(start, match[2] ? Number(match[2]) : stat.size - 1));
      res.writeHead(206, { ...baseHeaders, "Content-Length": end - start + 1, "Content-Range": `bytes ${start}-${end}/${stat.size}` });
      if (req.method === "HEAD") return res.end();
      fsNative.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { ...baseHeaders, "Content-Length": stat.size });
    if (req.method === "HEAD") return res.end();
    fsNative.createReadStream(filePath).pipe(res);
  } catch {
    sendJson(res, 404, { error: "媒体文件不存在" });
  }
}
async function serveGenerated(req, res, filename) { return serveStoredMedia(req, res, generatedDir, filename); }
async function serveAsset(req, res, filename) { return serveStoredMedia(req, res, assetsDir, filename); }
async function serveVideoAsset(req, res, filename) {
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename) return sendJson(res, 403, { error: "禁止访问" });
  try {
    const filePath = await ensureBrowserCompatibleVideo(path.join(videoAssetsDir, safeName));
    return serveStoredMedia(req, res, path.dirname(filePath), path.basename(filePath));
  } catch {
    return serveStoredMedia(req, res, videoAssetsDir, filename);
  }
}
async function serveEditedVideo(req, res, filename) { return serveStoredMedia(req, res, editedVideoDir, filename); }
async function serveAudioAsset(req, res, filename) { return serveStoredMedia(req, res, audioAssetsDir, filename); }

function generatedImageFilename(value) {
  const filename = String(value || "");
  return filename === path.basename(filename) && /^job-[a-z0-9-]+-\d+\.(?:png|jpe?g|webp)$/i.test(filename) ? filename : "";
}
function generatedMediaFilename(value) {
  const filename = String(value || "");
  return filename === path.basename(filename) && /^job-[a-z0-9-]+-\d+\.(?:png|jpe?g|webp|mp4|webm|mov|gif)$/i.test(filename) ? filename : "";
}

async function deleteGeneratedImages(req, res) {
  try {
    const body = await readJson(req, 256 * 1024);
    const requested = [...new Set(Array.isArray(body?.filenames) ? body.filenames.map(value => String(value || "")).filter(Boolean) : [])].slice(0, 256);
    const filenames = requested.map(generatedMediaFilename).filter(Boolean);
    if (!requested.length) return sendJson(res, 400, { error: "未提供可删除的生成媒体文件名" });
    if (filenames.length !== requested.length) return sendJson(res, 400, { error: "包含不支持的生成媒体文件名" });
    let deleted = 0; let missing = 0;
    for (const filename of filenames) {
      try { await fs.unlink(path.join(generatedDir, filename)); deleted += 1; }
      catch (error) { if (error?.code === "ENOENT") missing += 1; else throw error; }
    }
    return sendJson(res, 200, { deleted, missing });
  } catch (error) {
    return sendJson(res, 500, { error: error?.message || "本地生成媒体删除失败" });
  }
}

const cleanupMedia = createMediaCleanup({generatedDir, assetsDir, getJobs: () => jobs.values()});
async function cleanupUnusedGeneratedImages(req, res) {
  try {
    const body = await readJson(req, 2 * 1024 * 1024);
    return sendJson(res, 200, await cleanupMedia(body));
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error?.message || "未使用图片清理失败" });
  }
}

function responseTextFrom(result) {
  const content = result?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) return content.map(item => item?.text || item?.content || "").join("\n").trim();
  return String(content || "").trim();
}

function claudeResponseTextFrom(result) {
  const content = Array.isArray(result?.content) ? result.content : [];
  return content.map(item => item?.type === "text" ? item.text || "" : "").join("\n").trim();
}

function claudeImageContentFromDataUrl(url) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=]+)$/i.exec(String(url || ""));
  if (!match) return null;
  return { type: "image", source: { type: "base64", media_type: match[1].toLowerCase(), data: match[2] } };
}

function greatestCommonDivisor(a, b) {
  let left = Math.abs(Math.round(Number(a) || 0));
  let right = Math.abs(Math.round(Number(b) || 0));
  while (right) [left, right] = [right, left % right];
  return left || 1;
}

function nuyoahReferenceDimensions(metadata, referenceCount) {
  const entries = (Array.isArray(metadata) ? metadata : []).slice(0, referenceCount).map((item, index) => {
    const width = Math.max(0, Math.round(Number(item?.width) || 0));
    const height = Math.max(0, Math.round(Number(item?.height) || 0));
    if (!width || !height) return "";
    const divisor = greatestCommonDivisor(width, height);
    return `参考图 ${index + 1}：${width} × ${height}，最简画幅比例 ${width / divisor}:${height / divisor}`;
  }).filter(Boolean);
  return entries.length ? `\n\n可用的真实图片尺寸如下，图像类型中的画幅比例优先使用这些数据，不要目测：\n${entries.join("\n")}` : "";
}

function nuyoahReverseSystemInstruction(referenceMetadata, referenceCount) {
  return `你是“南鸢图片反推”分析器。把当前连接的参考图转译成可理解、可复用、可直接生图的中文视觉语言。只使用当前参考图、用户本次请求和本指令；不得从旧对话、记忆、历史图片或模板案例补全事实。${nuyoahReferenceDimensions(referenceMetadata, referenceCount)}

先判断一项主导图像类型：写实人物摄影、动漫插画、海报设计、商业产品、产品静物、空间景观、界面信息图或混合其他。真人时尚摄影同时有明显杂志/品牌版式时使用“真人摄影时尚海报”。混合图片只选一个主类型，最多借用 1–3 个必要的次级字段。

证据规则：只写当前图片可见，或由光线、材质、透视明确支持的事实；不确定内容省略或明确标为不确定。不得猜测品牌、人物身份、镜头型号、文化出处、不可见区域或看不清的具体文案。忽略平台界面、账号、来源水印和创作者标记，不把它们写进完整提示词。所有左右关系统一使用观者看到的“画面左侧/画面右侧”；视线必须根据虹膜在眼裂中的位置判断，不能由脸朝向或附近物体倒推。

按主类型选择有证据的中文公开字段，并保持对应顺序；无证据字段直接省略，不要压缩成笼统的“画面结构拆解”：
- 写实人物摄影：图像类型、风格参考线索、风格/滤镜、摄影/构图、主体人物、身形轮廓、肤色/肤调、动作/姿态、微表情/情绪、造型、服装贴合度、服装材质、皮肤/光泽细节、场景/背景、光线/色彩、成像质感、成像签名、参考色卡。
- 动漫插画：图像类型、风格参考线索、脸部风格锁定、脸型/面部线条、眼型/瞳孔设计、眉形/眼神压力、嘴唇/口红、脸部负面约束、身形轮廓、肤色/肤调、动作/姿态、微表情/情绪、服装贴合度、服装材质、皮肤/头发高光、色卡、成像质感、场景/世界观、服装/道具、色彩/光影、知名角色判断、角色设计、画风/线稿、分镜/构图、局部视觉焦点、清晰度/遮挡地图、图形元素功能、失败风险、生成时参考色卡。
- 海报设计：图像类型、风格参考线索、风格/滤镜、版式/构图、主体/主视觉、主体可见性、局部视觉焦点、清晰度/遮挡地图、版式结构地图、图形元素功能、生成优先级、失败风险、文字/信息层级、图形元素、材质/印刷质感、场景/背景、光线/色彩、色卡、成像质感。
- 真人摄影时尚海报：图像类型、风格参考线索、品牌气质、清晰度/遮挡地图、色彩系统、构图节奏、失败风险、视觉焦点、生成优先级、图形元素功能、主视觉、图层顺序、版式层级、版式结构地图、印刷/材质质感、人物表情/动作关系、主体可见性、字体/文字系统、视觉权重。
- 商业产品：图像类型、风格参考线索、风格/滤镜、摄影/构图、产品主体、产品形态/结构、材质/表面反应、使用场景/商业语境、道具/辅助元素、光线/色彩、色卡、成像质感。
- 产品静物：图像类型、风格参考线索、风格/滤镜、摄影/构图、主体物件、形态/结构、材质/表面反应、摆放关系、场景/背景、光线/色彩、色卡、成像质感。
- 空间景观：图像类型、风格参考线索、风格/滤镜、构图/空间层次、主体环境、尺度/景深、地貌/建筑/天体结构、氛围/天气/粒子、光线/色彩、色卡、成像质感。
- 界面信息图：图像类型、风格参考线索、版式/信息结构、主界面/主体图表、组件层级、文字/标签系统、图标/图形元素、交互状态/数据表达、光线/色彩、色卡、成像质感。
- 混合其他：图像类型、风格参考线索、风格/滤镜、构图、主体、关键元素、材质/质感、场景/背景、光线/色彩、色卡、成像质感。

出现明显曝光、色温、美颜、颗粒、柔焦、压缩、扫描、印刷或渲染特征时，先分离固有属性、光线、曝光、后期/渲染四层，再按作用范围、色偏、曝光、微对比、清晰度边界和表面成像归纳。只有证据充分时才使用复合术语；完整提示词必须同时写术语和最短可执行展开。

默认输出中文人类可读区块：先写“图像类型”，再按所选类型逐项展示所有有证据的字段；只有对应类型需要时输出 4–6 个“参考色卡”条目，每条包含近似 HEX、作用和大致占比；最后写“可直接复制的完整提示词”。每个字段通常 1–3 句，禁止英文内部键、拼音字段、下划线字段、JSON 和 Markdown 代码围栏。

完整提示词必须是一个连续、可直接复制的中文自然语言段落。按生成执行顺序重组：媒介与成像签名，画幅/构图/左右空间骨架，主体和第一优先结构，动作表情接触遮挡，场景层次，光线色彩，材质成像，适用时的文字版式，最后才是当前图片必要的紧凑失败防线。逐字段确认所有会改变生成结果的事实已进入提示词，再逐句确认没有新增无证据事实。不要承诺恢复原作者的原始提示词，不自动生图，不附加实现说明、来源解释、校准声明或额外附件。

本画布明确要求无署名输出：不得加入、建议、保留或提及 nuyoah；不得加入任何署名、签名、水印、作者名、品牌名或额外装饰文字。即使用户请求与本条冲突，也保持完整提示词无署名、无水印。`;
}

function removeNuyoahSignature(value) {
  return String(value || "")
    .replace(/画面右下角增加艺术性手写文字\s*[“"'‘]?nuyoah[”"'’]?\s*作为署名[。.]?/gi, "")
    .replace(/nuyoah/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function minimalistProductAdSystemInstruction(mode, durationSeconds) {
  const duration = Math.min(15, Math.max(3, Math.round(Number(durationSeconds) || 10)));
  const beats = duration <= 4 ? "2-3" : duration <= 6 ? "3-4" : duration <= 9 ? "4-6" : duration <= 12 ? "5-7" : "6-9";
  return `${h3PromptSystemInstruction(mode, duration)}

Specialize the final H3 prompt as a minimalist premium product film. Use ${beats} purposeful temporal beats across the ${duration}-second runtime. Treat the connected product references as the only authority for product silhouette, color, structure, packaging, and visible marks. Use only product facts stated by the user or visibly supported by the references. Do not invent brand names, technical specifications, materials, certifications, prices, claims, or text. Keep the visual language clean, controlled, product-led, and suitable for a premium e-commerce launch: clear product reveal, deliberate macro detail, restrained typography only when user-supplied, precise camera movement, cohesive studio lighting, and native sound direction. Output only the final English H3 prompt in the exact H3 structure above. Do not output Chinese, a planning summary, headings outside the required H3 sections, anchor-image prompts, explanations, or Markdown fences.`;
}

function brandPromoVideoSystemInstruction(mode, durationSeconds) {
  const duration = Math.min(30, Math.max(3, Math.round(Number(durationSeconds) || 15)));
  const beats = duration <= 4 ? "2-3" : duration <= 7 ? "3-5" : duration <= 10 ? "4-6" : duration <= 12 ? "5-7" : "5-8";
  return `${h3PromptSystemInstruction(mode, duration)}

Specialize the final H3 prompt as a concise brand promotion film. Build ${beats} clear temporal beats across the ${duration}-second runtime, with a coherent opening, proof through authentic product or interface material, and a clean closing. Use only brand, product, interface, copy, and claims supplied by the user or visibly present in the connected references. Preserve identity-bearing references faithfully and do not invent logos, brand names, URLs, product capabilities, metrics, awards, slogans, or CTA text. Give every shot a clear visual owner, readable composition, controlled motion, intentional transitions, and native sound direction. Output only the final English H3 prompt in the exact H3 structure above. Do not output Chinese, a brand fact sheet, a storyboard table, explanations, or Markdown fences.`;
}

function h3PromptSystemInstruction(mode, durationSeconds) {
  const duration = `${Number(durationSeconds).toFixed(2)} seconds`;
  const alignment = {
    t2va: "Do not add a picture-alignment line.",
    i2va: "The first line must be: For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.",
    l2va: `The first line must be: How the reference pictures align with the target video - <Picture 1> (from [Shot 1]) aligns with the ${duration}-second mark of the target video.`,
    fl2va: `The first line must be: How the reference pictures align with the target video - Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the ${duration}-second mark of the target video.`,
    ref2va: "Use the six full-reference sections instead of a keyframe-alignment line."
  }[mode] || "Do not add a picture-alignment line.";
  const baseStructure = mode === "ref2va"
    ? "Output exactly these six English sections in order: subject_definitions, summary, retention_analysis, detailed_description, overall_soundscape, non_diegetic_music. Use consistent <Subject N> and <Picture N> labels for the connected images. In retention_analysis use only fully_preserved, partially_preserved, attribute_transfer, or weak_reference."
    : "After the alignment line when required, output exactly these three English sections in order: integrated_multimodal_description, overall_soundscape, non_diegetic_music.";
  return `You are the MiniMax H3 video-prompt generator. Transform the user's request and the connected reference images into one production-ready H3 prompt. Output the final prompt only, without commentary, explanations, Markdown fences, or a title.\n\nSelected input mode: ${mode.toUpperCase()}. Target video duration: ${duration}. ${alignment}\n\n${baseStructure}\n\nWrite every descriptive section in English. Preserve dialogue, lyrics, and visible on-screen text in their original language; wrap spoken dialogue as <d>[Language] exact words</d>. Describe concrete composition, subject identity and placement, environment, lighting, actions, camera motion, sound, and the reference image's actual role. Keep reference labels stable. Use [Shot 1] for the opening; later shots use strictly increasing cut times within the target duration. For keyframe modes, make the motion path visibly reach the required first or last reference frame. overall_soundscape contains only ambience, physical sounds, and non-verbal human sounds. non_diegetic_music describes only audience-only music, or N/A. Do not invent unsupported claims about the reference images.`;
}

async function createResponse(req, res) {
  try {
    const body = await readJson(req);
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return sendJson(res, 400, { error: "请连接并填写至少一个提示词节点" });
    const rawRequestedModel = String(body.model || "gpt-5.6");
    const requestedModel = normalizeDeepseekModel(rawRequestedModel === "gpt-5.5" ? "gpt-5.6" : rawRequestedModel);
    const normalizedKimiModel = normalizeKimiModel(requestedModel);
    const isDeepseek = deepseekModels.includes(requestedModel);
    const isClaude = claudeModels.includes(requestedModel);
    const isKimi = kimiModels.includes(normalizedKimiModel);
    const isKimiPlan = requestedModel === kimiPlanModel;
    const selectedModel = isKimi ? normalizedKimiModel : requestedModel;
    const textModel = isKimiPlan ? kimiPlanModel : isKimi ? kimiApiModel : isDeepseek || isClaude ? requestedModel : openAiChatModels.includes(requestedModel) ? requestedModel : "gpt-5.6";
    const apiKey = isKimiPlan ? await resolveArkApiKey(req, 'ark-plan') : isDeepseek ? await resolveDeepseekApiKey(req) : isClaude ? await resolveClaudeApiKey(req) : isKimi ? await resolveKimiApiKey(req, selectedModel) : await resolveApiKey(req);
    if (isKimiPlan && !apiKey) return sendJson(res, 401, {error: "未配置火山 Agent Plan 套餐密钥，请在设置中保存"});
    if (isKimiPlan && (body.references !== undefined && !Array.isArray(body.references) || (body.references || []).length > 8)) return sendJson(res, 400, {error: "火山套餐 Kimi 节点最多支持 8 张参考图"});
    if (isKimiPlan && (body.references || []).some(value => typeof value !== 'string' || !/^data:image[/](png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value) || value.length > 4 * 1024 * 1024)) return sendJson(res, 400, {error: "Kimi 参考图需为 PNG/JPEG/WebP，编码后每张不超过 4MB；请刷新画布后重试"});
    if (!apiKey) return sendJson(res, 401, { error: isDeepseek ? "未配置 DeepSeek API Key，请在设置中保存密钥" : isClaude ? "未配置 Claude API Key，请在设置中保存密钥" : isKimi ? `未配置 ${kimiGatewayForModel(selectedModel) === "moyu" ? "魔芋 AI" : "Moonshot 官方"} Kimi API Key，请在设置中保存密钥` : "未找到 API Key，请在设置中临时输入，或在启动前设置 OPENAI_API_KEY" });
    const references = (Array.isArray(body.references) ? body.references : []).filter(item => /^data:image\/(png|jpeg|webp);base64,/i.test(String(item || ""))).slice(0, 8);
    if (isDeepseek && references.length && textModel !== deepseekVisionModel) return sendJson(res, 400, { error: "当前 DeepSeek 模型不支持图片输入，请切换到 DeepSeek V4.1 Flash" });
    const usingH3Skill = body.skill === "minimax-h3";
    const usingNuyoahSkill = body.skill === "nuyoah-reverse";
    const usingMinimalistProductAdSkill = body.skill === "minimalist-product-ad";
    const usingBrandPromoVideoSkill = body.skill === "brand-promo-video";
    const usingDirectH3Skill = usingH3Skill || usingMinimalistProductAdSkill || usingBrandPromoVideoSkill;
    const answerSkill = usingH3Skill ? "minimax-h3" : usingNuyoahSkill ? "nuyoah-reverse" : usingMinimalistProductAdSkill ? "minimalist-product-ad" : usingBrandPromoVideoSkill ? "brand-promo-video" : "none";
    if (usingNuyoahSkill && !references.length) return sendJson(res, 400, { error: "南鸢图片反推需要至少一张参考图" });
    const h3Mode = ["t2va", "i2va", "l2va", "fl2va", "ref2va"].includes(body.h3Mode) ? body.h3Mode : "t2va";
    const durationSeconds = Math.min(30, Math.max(3, Math.round(Number(body.durationSeconds) || 6)));
    const adDurationSeconds = Math.min(usingBrandPromoVideoSkill ? 30 : 15, Math.max(3, Math.round(Number(body.adDurationSeconds) || (usingMinimalistProductAdSkill ? 10 : 15))));
    const content = [{ type: "text", text: prompt }];
    references.forEach(url => content.push({ type: "image_url", image_url: isKimi || isKimiPlan ? { url } : { url, detail: "auto" } }));
    if (isClaude) {
      const claudeContent = [...references.map(claudeImageContentFromDataUrl).filter(Boolean), { type: "text", text: prompt }];
      const claudeRequestBody = {
        model: textModel,
        max_tokens: 16_384,
        messages: [{ role: "user", content: claudeContent }]
      };
      if (usingH3Skill) claudeRequestBody.system = h3PromptSystemInstruction(h3Mode, durationSeconds);
      else if (usingNuyoahSkill) claudeRequestBody.system = nuyoahReverseSystemInstruction(body.referenceMetadata, references.length);
      else if (usingMinimalistProductAdSkill) claudeRequestBody.system = minimalistProductAdSystemInstruction(h3Mode, adDurationSeconds);
      else if (usingBrandPromoVideoSkill) claudeRequestBody.system = brandPromoVideoSystemInstruction(h3Mode, adDurationSeconds);
      const claudeResponse = await fetch(`${claudeBaseUrl}/messages`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(claudeRequestBody),
        signal: AbortSignal.timeout(150_000)
      });
      const raw = await claudeResponse.text();
      let result;
      try { result = JSON.parse(raw); } catch { result = { error: { message: raw.slice(0, 500) || "接口返回了无法解析的内容" } }; }
      if (!claudeResponse.ok) throw gatewayError(claudeResponse.status, result?.error?.message || result?.message || `Claude 回答失败 (${claudeResponse.status})`);
      const answer = usingNuyoahSkill ? removeNuyoahSignature(claudeResponseTextFrom(result)) : claudeResponseTextFrom(result);
      if (!answer) throw gatewayError(502, "Claude 接口没有返回可显示的文本回答");
      return sendJson(res, 200, { answer, model: selectedModel, provider: "claude", references: references.length, skill: answerSkill, h3Mode: usingDirectH3Skill ? h3Mode : undefined });
    }
    const skillSystemInstruction = usingH3Skill ? h3PromptSystemInstruction(h3Mode, durationSeconds) : usingNuyoahSkill ? nuyoahReverseSystemInstruction(body.referenceMetadata, references.length) : usingMinimalistProductAdSkill ? minimalistProductAdSystemInstruction(h3Mode, adDurationSeconds) : usingBrandPromoVideoSkill ? brandPromoVideoSystemInstruction(h3Mode, adDurationSeconds) : "";
    const messages = skillSystemInstruction
      ? [{ role: "system", content: skillSystemInstruction }, { role: "user", content }]
      : [{ role: "user", content: isDeepseek && !references.length ? prompt : content }];
    const requestBody = { model: textModel, messages };
    if (isDeepseek) {
      const thinking = body.deepseekThinking === "disabled" ? "disabled" : "enabled";
      requestBody.thinking = { type: thinking };
      if (thinking === "enabled") requestBody.reasoning_effort = ["low", "high", "max"].includes(body.deepseekReasoningEffort) ? body.deepseekReasoningEffort : "high";
    }
    if (isKimi) requestBody.reasoning_effort = ["low", "high", "max"].includes(body.kimiReasoningEffort) ? body.kimiReasoningEffort : "max";
    if (isKimiPlan) {
      requestBody.reasoning_effort = ["low", "high", "max"].includes(body.kimiReasoningEffort) ? body.kimiReasoningEffort : "high";
      requestBody.max_tokens = 16_384;
    }
    const responseBaseUrl = isKimiPlan ? arkPlanBaseUrl : isDeepseek ? deepseekBaseUrl : isKimi ? await resolveKimiBaseUrl(selectedModel) : baseUrl;
    let response;
    let raw = "";
    for (let attempt = 0; attempt < (isKimiPlan ? 1 : 2); attempt += 1) {
      response = await fetch(`${responseBaseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(isKimiPlan ? 210_000 : 150_000)
      });
      raw = await response.text();
      if (isKimiPlan || response.ok || ![502, 503, 504].includes(response.status) || attempt === 1) break;
      let retrySeconds = Number(response.headers.get("retry-after")) || 0;
      try {
        const retryPayload = JSON.parse(raw);
        retrySeconds ||= Number(retryPayload?.detail?.retry_after || retryPayload?.retry_after) || 0;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, Math.min(120, Math.max(1, retrySeconds || 60)) * 1000));
    }
    let result;
    try { result = JSON.parse(raw); } catch { result = { error: { message: raw.slice(0, 500) || "接口返回了无法解析的内容" } }; }
    if (!response.ok) throw gatewayError(response.status, result?.error?.message || result?.message || diagnosticText(raw) || `模型回答失败 (${response.status})`);
    const answer = usingNuyoahSkill ? removeNuyoahSignature(responseTextFrom(result)) : responseTextFrom(result);
    if (!answer) throw gatewayError(502, "接口没有返回可显示的文本回答");
    return sendJson(res, 200, { answer, model: selectedModel, provider: isKimiPlan ? "ark-plan" : isDeepseek ? "deepseek" : isKimi ? "kimi" : "openai", references: references.length, skill: answerSkill, h3Mode: usingDirectH3Skill ? h3Mode : undefined });
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
    const seedreamKey = await resolveSeedreamApiKey(req);
    const arkKey = await resolveArkApiKey(req);
    const arkPlanKey = await resolveArkApiKey(req, 'ark-plan');
    const mjKey = await resolveMjApiKey(req);
    const runningHubKey = await resolveRunningHubApiKey(req);
    const deepseekKey = await resolveDeepseekApiKey(req);
    const claudeKey = await resolveClaudeApiKey(req);
    const moyuKimiKey = await resolveKimiApiKey(req, "kimi-k3-moyu");
    const moonshotKimiKey = await resolveKimiApiKey(req, "kimi-k3-moonshot");
    return sendJson(res, 200, { ready: Boolean(key), model, models: image2Models, image25SizeProtocol, baseUrl, arkPlanAnswer: { ready: Boolean(arkPlanKey), protocol: "kimi-ark-plan-v1", model: kimiPlanModel, vision: true, referenceLimit: 8 }, ark: { ready: Boolean(arkKey), protocol: arkProtocol, models: arkModels.map(item => item.id), baseUrl: arkBaseUrl }, arkPlan: { ready: Boolean(arkPlanKey), protocol: arkPlanProtocol, models: arkPlanModels.map(item => item.id), baseUrl: arkPlanBaseUrl }, seedream: { ready: Boolean(seedreamKey), model: seedreamDefaultModel, models: seedreamImageModels, baseUrl: seedreamBaseUrl }, midjourney: { ready: Boolean(mjKey), model: mjFastModel, baseUrl: mjBaseUrl }, runninghub: { ready: Boolean(runningHubKey), workflowId: runningHubWorkflowId, instanceType: runningHubInstanceType, baseUrl: runningHubBaseUrl }, deepseek: { ready: Boolean(deepseekKey), model: deepseekVisionModel, visionModel: deepseekVisionModel, models: deepseekModels, baseUrl: deepseekBaseUrl }, claude: { ready: Boolean(claudeKey), model: claudeDefaultModel, models: claudeModels, baseUrl: claudeBaseUrl }, kimi: { ready: Boolean(moyuKimiKey || moonshotKimiKey), model: kimiDefaultModel, models: kimiModels, providers: { moyu: { ready: Boolean(moyuKimiKey), model: "kimi-k3-moyu", apiModel: kimiApiModel, baseUrl: kimiMoyuBaseUrl }, moonshot: { ready: Boolean(moonshotKimiKey), model: "kimi-k3-moonshot", apiModel: kimiApiModel, baseUrl: await resolveKimiBaseUrl("kimi-k3-moonshot") } } }, jobs: jobs.size });
  }
  if (req.method === "GET" && url.pathname === "/api/health") return checkGateway(req, res);
  if (req.method === "GET" && url.pathname === "/api/providers/seedream/health") return checkSeedreamGateway(req, res);
  if (req.method === "GET" && url.pathname === "/api/providers/midjourney/health") return checkMjGateway(req, res);
  if (req.method === "GET" && url.pathname === "/api/providers/deepseek/health") return checkDeepseekGateway(req, res);
  if (req.method === "GET" && url.pathname === "/api/providers/claude/health") return checkClaudeGateway(req, res);
  if (req.method === "GET" && url.pathname === "/api/providers/kimi/health") return checkKimiGateway(req, res);
  if (req.method === "POST" && url.pathname === "/api/providers/ark-plan") return saveArkProvider(req, res, 'ark-plan');
  if (req.method === "POST" && url.pathname === "/api/providers/ark") return saveArkProvider(req, res);
  if (req.method === "POST" && url.pathname === "/api/providers/seedream") return saveSeedreamProvider(req, res);
  if (req.method === "POST" && url.pathname === "/api/providers/midjourney") return saveMjProvider(req, res);
  if (req.method === "POST" && url.pathname === "/api/providers/runninghub") return saveRunningHubProvider(req, res);
  if (req.method === "POST" && url.pathname === "/api/providers/deepseek") return saveDeepseekProvider(req, res);
  if (req.method === "POST" && url.pathname === "/api/providers/claude") return saveClaudeProvider(req, res);
  if (req.method === "POST" && url.pathname === "/api/providers/kimi") return saveKimiProvider(req, res);
  if (req.method === "POST" && url.pathname === "/api/restart") return restartLocalService(req, res);
  if (req.method === "POST" && url.pathname === "/api/assets") return storeAsset(req, res);
  if (req.method === "POST" && url.pathname === "/api/video-assets") return storeVideoUpload(req, res);
  if (req.method === "POST" && url.pathname === "/api/audio-assets") return storeAudioUpload(req, res);
  if (req.method === "POST" && url.pathname === "/api/video-compose") return composeVideo(req, res);
  if (req.method === "GET" && url.pathname === "/api/layers/status") return sendJson(res, 200, { protocol: layerProtocol, ready: Boolean(await resolveArkApiKey(req, 'ark-plan')) });
  if (req.method === 'GET' && url.pathname === '/api/local-edit/status') return sendJson(res,200,{protocol:localEditProtocol,ready:Boolean(await resolveArkApiKey(req,'ark-plan'))});
  if (req.method === 'POST' && url.pathname === '/api/local-edit') return createLocalEditJob(req,res);
  if (req.method === "POST" && url.pathname === "/api/layers/decompose") return createLayerJob(req, res);
  if (req.method === "POST" && url.pathname === "/api/generate") return createJob(req, res);
  if (req.method === "POST" && url.pathname === "/api/respond") return createResponse(req, res);
  if (req.method === "POST" && url.pathname === "/api/generated/delete") return deleteGeneratedImages(req, res);
  if (req.method === "POST" && url.pathname === "/api/generated/cleanup-unused") return sendJson(res, 409, { error: "清理功能已更新，请刷新页面后重试" });
  if (req.method === "POST" && url.pathname === "/api/media/cleanup-unused") return cleanupUnusedGeneratedImages(req, res);
  if (req.method === "POST" && url.pathname === "/api/generated/open-folder") return openGeneratedFolder(req, res);
  const mjUpscaleMatch = req.method === "POST" && /^\/api\/jobs\/([^/]+)\/midjourney\/upscale$/.exec(url.pathname);
  if (mjUpscaleMatch) { const id = safeDecodePath(mjUpscaleMatch[1]); return id === null ? sendJson(res, 400, { error: "任务地址无效" }) : createMjUpscaleJob(req, res, id); }
  const cancelJobMatch = req.method === "POST" && /^\/api\/jobs\/([^/]+)\/cancel$/.exec(url.pathname);
  if (cancelJobMatch) { const id = safeDecodePath(cancelJobMatch[1]); return id === null ? sendJson(res, 400, { error: "任务地址无效" }) : cancelJob(req, res, id); }
  if (req.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
    const id = safeDecodePath(url.pathname.slice("/api/jobs/".length));
    if (id === null) return sendJson(res, 400, { error: "任务地址无效" });
    const job = jobs.get(id);
    return job ? sendJson(res, 200, { job: jobView(job) }) : sendJson(res, 404, { error: "生成任务不存在，可能已被清理" });
  }
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/api/generated/")) { const name = safeDecodePath(url.pathname.slice("/api/generated/".length)); return name === null ? sendJson(res, 400, { error: "资源地址无效" }) : serveGenerated(req, res, name); }
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/api/assets/")) { const name = safeDecodePath(url.pathname.slice("/api/assets/".length)); return name === null ? sendJson(res, 400, { error: "资源地址无效" }) : serveAsset(req, res, name); }
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/api/video-assets/")) { const name = safeDecodePath(url.pathname.slice("/api/video-assets/".length)); return name === null ? sendJson(res, 400, { error: "资源地址无效" }) : serveVideoAsset(req, res, name); }
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/api/audio-assets/")) { const name = safeDecodePath(url.pathname.slice("/api/audio-assets/".length)); return name === null ? sendJson(res, 400, { error: "资源地址无效" }) : serveAudioAsset(req, res, name); }
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/api/video-edited/")) { const name = safeDecodePath(url.pathname.slice("/api/video-edited/".length)); return name === null ? sendJson(res, 400, { error: "资源地址无效" }) : serveEditedVideo(req, res, name); }
  if (req.method === "GET" || req.method === "HEAD") { const pathname = safeDecodePath(url.pathname); return pathname === null ? sendJson(res, 400, { error: "资源地址无效" }) : serveStatic(req, res, pathname); }
  sendJson(res, 405, { error: "不支持的请求方法" });
});

await migrateLegacyGeminiConfig();
await initializeJobs();
server.listen(port, "127.0.0.1", () => {
  console.log(`万物维 · Image2 Canvas: http://127.0.0.1:${port}`);
});
