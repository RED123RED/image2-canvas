import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { managedImageKey, collectMediaReferences, mediaCleanupProtocol } from './public/media-references.js';

const failure = (message, status = 400) => Object.assign(new Error(message), { status });

export const generatedFolders = { image: '图像', video: '视频' };

export function generatedFolder(root, filename) {
  const extension = path.extname(filename).toLowerCase();
  if (['.mp4', '.webm', '.mov'].includes(extension)) return path.join(root, generatedFolders.video);
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(extension)) return path.join(root, generatedFolders.image);
  return root;
}

export function createMediaCleanup({ generatedDir, assetsDir, getJobs, now = Date.now, graceMs = 10 * 60_000 }) {
  const folders = [
    ['generated', generatedDir],
    ['generated', path.join(generatedDir, generatedFolders.image)],
    ['assets', assetsDir]
  ];
  const previews = new Map();
  let deleting = false;
  const protection = body => {
    const images = new Set(body.referencedImages.map(managedImageKey)), jobIds = new Set(body.referencedJobIds.map(id => id.toLowerCase()));
    for (const job of getJobs()) {
      if (['queued', 'running'].includes(job.status)) {
        jobIds.add(job.id.toLowerCase());
        collectMediaReferences(job).referencedImages.forEach(key => images.add(key));
      }
    }
    return { images, jobIds };
  };
  const needed = (key, protectedFiles) => protectedFiles.images.has(key) || [...protectedFiles.jobIds].some(id => key.slice(key.indexOf('/') + 1).startsWith(id + '-'));
  const signature = stat => `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.ino}`;
  return async body => {
    if (body?.protocol !== mediaCleanupProtocol || !['preview', 'delete'].includes(body.action) ||
        !Array.isArray(body.referencedImages) || !body.referencedImages.every(key => !!managedImageKey(key)) ||
        !Array.isArray(body.referencedJobIds) || !body.referencedJobIds.every(id => typeof id === 'string' && /^job-[a-z0-9-]+$/i.test(id))) {
      throw failure('清理引用不完整或版本不匹配，请刷新页面后重试');
    }
    if (deleting) throw failure('正在清理，请等待本次操作完成', 409);
    const time = now();
    for (const [token, item] of previews) if (item.expires <= time) previews.delete(token);
    if (body.action === 'delete') {
      const preview = previews.get(body.previewToken);
      if (!preview) throw failure('预览已过期，请重新检查可清理图片', 409);
      previews.delete(body.previewToken);
      deleting = true;
      let deleted = 0, deletedBytes = 0, missing = 0, skipped = 0, failed = 0;
      try {
        for (const item of preview.candidates) {
          if (needed(item.key, protection(body))) { skipped++; continue; }
          try {
            if (!(await fs.lstat(item.folder)).isDirectory()) { skipped++; continue; }
            const file = path.join(item.folder, item.filename);
            const stat = await fs.lstat(file);
            if (!stat.isFile() || stat.isSymbolicLink() || signature(stat) !== item.signature || now() - stat.mtimeMs < graceMs || needed(item.key, protection(body))) { skipped++; continue; }
            await fs.unlink(file); deleted++; deletedBytes += stat.size;
          } catch (error) { if (error.code === 'ENOENT') missing++; else failed++; }
        }
        return { protocol: mediaCleanupProtocol, deleted, deletedBytes, missing, skipped, failed };
      } finally { deleting = false; }
    }
    const protectedFiles = protection(body), candidates = [];
    const byDirectory = {};
    let totalImageCount = 0, protectedCount = 0, recentCount = 0;
    for (const [directory, folder] of folders) {
      byDirectory[directory] ??= { unusedCount: 0, reclaimBytes: 0 };
      let entries;
      try {
        if (!(await fs.lstat(folder)).isDirectory()) continue;
        entries = await fs.readdir(folder, { withFileTypes: true });
      } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      for (const entry of entries) {
        const key = managedImageKey(directory + '/' + entry.name);
        if (!entry.isFile() || !key) continue;
        totalImageCount++;
        if (needed(key, protectedFiles)) { protectedCount++; continue; }
        let stat;
        try { stat = await fs.lstat(path.join(folder, entry.name)); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
        if (!stat.isFile() || stat.isSymbolicLink()) continue;
        if (time - stat.mtimeMs < graceMs) { recentCount++; continue; }
        candidates.push({ key, folder, filename: entry.name, signature: signature(stat) });
        byDirectory[directory].unusedCount++; byDirectory[directory].reclaimBytes += stat.size;
      }
    }
    if (previews.size >= 32) previews.delete(previews.keys().next().value);
    const previewToken = randomUUID();
    previews.set(previewToken, { expires: time + 5 * 60_000, candidates });
    return { protocol: mediaCleanupProtocol, previewToken, totalImageCount, protectedCount, recentCount, unusedCount: candidates.length, reclaimBytes: Object.values(byDirectory).reduce((n, v) => n + v.reclaimBytes, 0), byDirectory };
  };
}
