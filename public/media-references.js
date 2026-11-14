export const mediaCleanupProtocol = 'canvas-media-cleanup-v1';

export function managedImageKey(value) {
  if (typeof value !== 'string') return '';
  const [directory, filename, extra] = value.split('/');
  if (extra !== undefined || !['assets', 'generated'].includes(directory)) return '';
  const generated = /^job-[a-z0-9-]+-[0-9]+[.](?:png|jpe?g|webp)$/i.test(filename);
  const asset = /^asset-[a-z0-9-]+(?:[.]preview)?[.](?:png|jpe?g|webp)$/i.test(filename);
  return generated || directory === 'assets' && asset ? value.toLowerCase() : '';
}

export function imageKeyFromSource(value, origin = 'http://127.0.0.1') {
  if (typeof value !== 'string' || value.startsWith('data:') || value.startsWith('blob:')) return '';
  try {
    const url = new URL(value, origin), base = new URL(origin);
    const local = host => ['localhost', '127.0.0.1', '[::1]'].includes(host);
    if (url.origin !== base.origin && !(local(url.hostname) && local(base.hostname))) return '';
    if (!url.pathname.startsWith('/api/')) return '';
    return managedImageKey(decodeURIComponent(url.pathname.slice(5)));
  } catch { return ''; }
}

// Walk persisted structures, including nested groups/backups, drafts and edit history.
// Do not limit traversal to visible image nodes: other tools may also use a file.
export function collectMediaReferences(records, origin) {
  const images = new Set(), jobIds = new Set(), seen = new Set(), stack = [records];
  while (stack.length) {
    const value = stack.pop();
    if (typeof value === 'string') {
      const key = imageKeyFromSource(value, origin);
      if (key) images.add(key);
      continue;
    }
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    for (const [key, entry] of Object.entries(value)) {
      if (/^(?:activeJobId|layerJobId|jobId|generationJobId|midjourneyActionJobId)$/.test(key) && /^job-[a-z0-9-]+$/i.test(entry)) jobIds.add(entry);
      if (key === 'requestId' && /^[a-f0-9-]{36}$/i.test(entry)) jobIds.add('job-le-' + entry);
      if ((entry && typeof entry === 'object') || typeof entry === 'string') stack.push(entry);
    }
  }
  return { referencedImages: [...images].sort(), referencedJobIds: [...jobIds].sort() };
}
