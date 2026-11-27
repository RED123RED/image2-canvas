import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = server => new Promise(resolve => server.close(resolve));
const pause = () => new Promise(resolve => setTimeout(resolve, 40));

test('Gemini 4 Neon uses its isolated key and OpenAI-compatible text endpoint', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'canvas-gemini-neon-'));
  const calls = [];
  const upstream = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    res.setHeader('content-type', 'application/json');
    if (req.url === '/v1/models') return res.end(JSON.stringify({ data: [{ id: 'gemini-4-neon' }] }));
    if (req.url === '/v1/chat/completions') {
      calls.push({ authorization: req.headers.authorization, payload: JSON.parse(body) });
      return res.end(JSON.stringify({ model: 'gemini-4-neon-enterprise', choices: [{ message: { content: '模拟回答成功' } }] }));
    }
    res.writeHead(404);
    res.end('{}');
  });
  const gateway = 'http://127.0.0.1:' + await listen(upstream) + '/v1';
  const probe = http.createServer();
  const port = await listen(probe);
  await close(probe);
  await fs.mkdir(path.join(dir, 'public'));
  for (const file of ['server.mjs', 'media-cleanup.mjs', ...['media-references', 'local-edit-document', 'layer-document', 'seedream-ark', 'runninghub-moss'].map(name => 'public/' + name + '.js')]) {
    await fs.copyFile(path.join(root, file), path.join(dir, file));
  }
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: dir,
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, PORT: String(port), APPDATA: dir, GEMINI_NEON_BASE_URL: gateway, OPENAI_API_KEY: '' }
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  t.after(async () => {
    if (child.exitCode === null) {
      const done = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await done;
    }
    await close(upstream);
    await fs.rm(dir, { recursive: true, force: true });
  });
  const base = 'http://127.0.0.1:' + port;
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    try { ready = (await fetch(base + '/api/status')).ok; } catch { await pause(); }
  }
  assert.equal(ready, true, stderr);
  const apiKey = 'isolated-gemini-neon-test-key';
  const save = await fetch(base + '/api/providers/gemini-neon', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ apiKey })
  });
  assert.equal(save.status, 200);
  const status = await (await fetch(base + '/api/status')).json();
  assert.equal(status.geminiNeon.ready, true);
  assert.equal(JSON.stringify(status).includes(apiKey), false);
  const health = await (await fetch(base + '/api/providers/gemini-neon/health')).json();
  assert.equal(health.ready, true);
  assert.equal(health.model, 'gemini-4-neon');

  const response = await fetch(base + '/api/respond', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'gemini-4-neon', prompt: '测试文本问题' })
  });
  assert.equal(response.status, 200);
  const answer = await response.json();
  assert.equal(answer.answer, '模拟回答成功');
  assert.equal(answer.model, 'gemini-4-neon');
  assert.equal(answer.provider, 'gemini-neon');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].authorization, 'Bearer ' + apiKey);
  assert.equal(calls[0].payload.model, 'gemini-4-neon');

  const imageResponse = await fetch(base + '/api/respond', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'gemini-4-neon', prompt: '看图', references: ['data:image/png;base64,aGVsbG8='] })
  });
  assert.equal(imageResponse.status, 400);
  assert.equal(calls.length, 1);
});
