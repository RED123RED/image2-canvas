import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mossAspects, mossUpscaledResult, mossWorkflow } from '../public/runninghub-moss.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';

test('MOSS validates proportions and selects only the enlarged SaveImage output', () => {
  assert.equal(mossAspects.length, 11);
  assert.equal(mossUpscaledResult([{ nodeId: '49', url: 'original' }, { nodeId: '65', url: 'enlarged' }]).url, 'enlarged');
  assert.throws(() => mossUpscaledResult([{ nodeId: '49', url: 'original' }]));
  assert.throws(() => mossUpscaledResult([{ nodeId: '65', url: 'a' }, { nodeId: '65', url: 'b' }]));
});

test('MOSS queue sends prompt and ratio, persists one enlarged image, and isolates existing routes', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'canvas-moss-test-'));
  await fs.mkdir(path.join(dir, 'public'));
  for (const file of ['server.mjs', 'media-cleanup.mjs', 'public/media-references.js', 'public/local-edit-document.js', 'public/layer-document.js', 'public/seedream-ark.js', 'public/runninghub-moss.js']) {
    await fs.copyFile(path.join(root, file), path.join(dir, file));
  }
  await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
  const record = path.join(dir, 'calls.jsonl');
  const mock = `
import fs from 'node:fs/promises';
const record = ${JSON.stringify(record)};
const pixel = ${JSON.stringify(pixel)};
globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  const body = options.body ? JSON.parse(options.body) : {};
  await fs.appendFile(record, JSON.stringify({ target, body, auth: options.headers?.Authorization || '' }) + '\\n');
  if (target.includes('/run/workflow/')) return Response.json({taskId:'remote-moss'});
  if (target.endsWith('/openapi/v2/query')) return Response.json({status:'SUCCESS', results:[
    {nodeId:'49', url:'https://images.example/original.png', outputType:'png'},
    {nodeId:'65', url:'https://images.example/enlarged.png', outputType:'png'}
  ]});
  if (target === 'https://images.example/enlarged.png') return new Response(Buffer.from(pixel, 'base64'), {headers:{'Content-Type':'image/png'}});
  throw Error('Unexpected remote request: ' + target);
};`;
  await fs.writeFile(path.join(dir, 'mock.mjs'), mock);
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['--import', pathToFileURL(path.join(dir, 'mock.mjs')).href, path.join(dir, 'server.mjs')], {
    cwd: dir, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, PORT: String(port), APPDATA: path.join(dir, 'config'), RUNNINGHUB_API_KEY: '', OPENAI_API_KEY: 'image2-test' }
  });
  let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk; });
  t.after(async () => { if (child.exitCode === null) { const stopped = new Promise(resolve => child.once('exit', resolve)); child.kill(); await stopped; } await fs.rm(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${port}`;
  const call = async (url, body) => {
    const response = await fetch(base + url, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  let ready = false;
  for (let i = 0; i < 100; i++) { try { await call('/api/status'); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 50)); } }
  assert.ok(ready, stderr || 'Server startup timed out');
  const request = { provider: 'runninghub-moss', prompt: 'a clear product photo', aspect: '9:16', references: [] };
  assert.equal((await call('/api/status')).data.runninghub.mossWorkflowId, mossWorkflow.id);
  assert.equal((await call('/api/generate', request)).status, 401);
  assert.equal((await call('/api/providers/runninghub', { apiKey: 'moss-test-key' })).status, 200);
  assert.equal((await call('/api/generate', { ...request, aspect: 'invalid' })).status, 400);
  assert.equal((await call('/api/generate', { ...request, references: ['data:image/png;base64,AA=='] })).status, 400);
  assert.equal((await call('/api/generate', { ...request, prompt: '' })).status, 400);
  const created = await call('/api/generate', request);
  assert.equal(created.status, 202); assert.equal(created.data.job.imageCount, 1);
  let job;
  for (let i = 0; i < 100; i++) {
    job = (await call('/api/jobs/' + created.data.job.id)).data.job;
    if (['succeeded', 'failed'].includes(job.status)) break;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  assert.equal(job.status, 'succeeded', job.error || stderr);
  assert.equal(job.images.length, 1);
  assert.equal(job.images[0].outputType, 'png');
  assert.equal((await fetch(base + job.images[0].url)).status, 200);
  const calls = (await fs.readFile(record, 'utf8')).trim().split('\n').map(JSON.parse);
  const submits = calls.filter(item => item.target.includes('/run/workflow/'));
  assert.equal(submits.length, 1);
  assert.ok(submits[0].target.endsWith('/' + mossWorkflow.id));
  assert.equal(submits[0].auth, 'Bearer moss-test-key');
  assert.deepEqual(submits[0].body.nodeInfoList, [
    { nodeId: '88', fieldName: 'value', fieldValue: request.prompt },
    { nodeId: '97', fieldName: '比例', fieldValue: request.aspect }
  ]);
  assert.equal(calls.filter(item => item.target === 'https://images.example/enlarged.png').length, 1);
  assert.equal(calls.filter(item => item.target === 'https://images.example/original.png').length, 0);
  assert.ok(!(await fs.readFile(path.join(dir, 'output/image2-generation-jobs.json'), 'utf8')).includes('moss-test-key'));
});
