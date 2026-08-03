import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(appDir, "output");
const port = Number(process.env.PORT || 45173);
const appUrl = `http://127.0.0.1:${port}/?desktop=${Date.now()}`;
const statusUrl = `http://127.0.0.1:${port}/api/status`;

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function isServiceReady(timeoutMs = 1500) {
  try {
    const response = await fetch(statusUrl, { signal: AbortSignal.timeout(timeoutMs) });
    return response.ok;
  } catch {
    return false;
  }
}

function startServer() {
  ensureOutputDir();
  const out = fs.openSync(path.join(outputDir, "image2-desktop-server.log"), "a");
  const err = fs.openSync(path.join(outputDir, "image2-desktop-server-error.log"), "a");
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: appDir,
    detached: true,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", out, err]
  });
  child.unref();
}

async function waitForService() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (await isServiceReady()) return true;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

function existingBrowserPaths() {
  const candidates = [
    process.env.IMAGE2_BROWSER,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ].filter(Boolean);
  return candidates.filter(candidate => fs.existsSync(candidate));
}

function openDesktopWindow() {
  const browser = existingBrowserPaths()[0];
  if (!browser) {
    spawn("cmd.exe", ["/c", "start", "", appUrl], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  spawn(browser, [`--app=${appUrl}`, "--new-window"], {
    detached: true,
    stdio: "ignore"
  }).unref();
}

if (!(await isServiceReady())) {
  startServer();
  const ready = await waitForService();
  if (!ready) {
    console.error(`Image2 Canvas service did not start: ${statusUrl}`);
    process.exitCode = 1;
    process.exit();
  }
}

openDesktopWindow();
