import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { arkModels, arkPlanModels, buildArkPayload } from '../public/seedream-ark.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const reference = `data:image/png;base64,${pixel}`;
test('automatic reference detection accepts ten images on official and plan channels', () => {
  for (const model of [...arkModels,...arkPlanModels]) {
    const provider = arkPlanModels.includes(model) ? 'ark-plan' : 'ark';
    const common = { provider, model: model.id, prompt: 'test', n: 1, aspect: '16:9' };
    const generated = buildArkPayload(common);
    assert.equal(generated.size, '2848x1600'); assert.equal(generated.output_format, 'png'); assert.equal(generated.image, undefined);
    for (const count of [1,2,10]) {
      const images=Array.from({length:count},(_,i)=>reference);
      const edited=buildArkPayload({...common,references:images});
      assert.deepEqual(edited.image,count===1?reference:images);
      assert.equal(edited.size,'2848x1600'); assert.equal(edited.layer_decomposition,undefined);
    }
    for(const bad of [{references:Array(11).fill(reference)},{references:['https://untrusted.invalid/image.png']},{prompt:''},{n:4},{layer_decomposition:true},{arkOperation:'layers'}]) assert.throws(()=>buildArkPayload({...common,...bad}));
  }
  assert.throws(()=>buildArkPayload({model:'unsupported',prompt:'test'}));
  assert.throws(()=>buildArkPayload({provider:'ark-plan',model:arkModels[0].id,prompt:'test'}));
  assert.throws(()=>buildArkPayload({provider:'ark',model:arkPlanModels[0].id,prompt:'test'}));
});
test('real local queue, all outputs, independent keys, failures and saved jobs', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'canvas-ark-test-'));
  await fs.mkdir(path.join(dir, 'public'));
  await fs.copyFile(path.join(root, 'server.mjs'), path.join(dir, 'server.mjs'));
  await fs.copyFile(path.join(root, 'public/seedream-ark.js'), path.join(dir, 'public/seedream-ark.js'));
  await fs.copyFile(path.join(root, 'public/layer-document.js'), path.join(dir, 'public/layer-document.js'));
  await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
  const recordPath = path.join(dir, 'requests.jsonl');
  const preload = `
import fs from 'node:fs/promises';
const pixel = ${JSON.stringify(pixel)};
globalThis.fetch = async (url, init = {}) => {
  const target = String(url);
  let body = {}; try { body = JSON.parse(init.body || '{}'); } catch {}
  await fs.appendFile(${JSON.stringify(recordPath)}, JSON.stringify({ url: target, body, authorization: init.headers?.Authorization }) + String.fromCharCode(10));
  if (body.prompt === 'FAIL_ONCE') return Response.json({ error: { code: 'RateLimitExceeded' } }, { status: 429 });
  if (body.prompt === 'PARTIAL') return Response.json({ data: [{ error: { code: 'Rejected' } }] });
  const data = [{ b64_json: pixel }];
  return Response.json({ model: body.model, data });
};`;
  await fs.writeFile(path.join(dir, 'mock.mjs'), preload);
  const probe = net.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['--import', pathToFileURL(path.join(dir, 'mock.mjs')).href, path.join(dir, 'server.mjs')], { cwd: dir, env: { ...process.env, PORT: String(port), APPDATA: path.join(dir, 'config'), ARK_API_KEY: '', ARK_PLAN_API_KEY: '', SEEDREAM_API_KEY: '', OPENAI_API_KEY: 'test-image2' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk; });
  t.after(async () => { if (child.exitCode === null) { const closed = new Promise(resolve => child.once('exit', resolve)); child.kill(); await closed; } await fs.rm(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${port}`;
  const call = async (url, body) => { const response = await fetch(base + url, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: response.status, data: await response.json() }; };
  for (let i = 0; i < 100; i++) { try { await call('/api/status'); break; } catch { if (i === 99) throw new Error(stderr || 'Server startup timed out'); await new Promise(resolve => setTimeout(resolve, 50)); } }
  await call('/api/providers/seedream', { apiKey: 'test-legacy' });
  await call('/api/providers/ark', { apiKey: 'test-official' });
  const missingPlan = await call('/api/generate', {provider:'ark-plan',model:arkPlanModels[0].id,prompt:'test'});
  assert.equal(missingPlan.status,401);
  const wrongRoute = await call('/api/generate', {provider:'ark-plan',model:arkModels[0].id,prompt:'test'});
  assert.equal(wrongRoute.status,400);
  await call('/api/providers/ark-plan', { apiKey: 'test-plan' });
  const config=JSON.parse(await fs.readFile(path.join(dir,'config/image2-canvas/providers.json'),'utf8'));
  assert.equal(config.ark.apiKey,'test-official');assert.equal(config.arkPlan.apiKey,'test-plan');assert.equal(config.seedream.apiKey,'test-legacy');
  const status = await call('/api/status');
  assert.equal(status.data.ark.protocol, 'seedream-ark-auto-v1'); assert.equal(status.data.seedream.ready, true); assert.equal(status.data.ark.ready, true);
  assert.equal(JSON.stringify(status.data).includes('test-official'), false);
  assert.equal(status.data.arkPlan.protocol,'seedream-ark-plan-v1');assert.equal(status.data.arkPlan.ready,true);assert.ok(!JSON.stringify(status.data).includes('test-plan'));
  const waitJob = async id => { for (let i=0;i<100;i++) { const response = await call('/api/jobs/'+id); if (['succeeded','failed'].includes(response.data.job.status)) return response.data.job; await new Promise(resolve => setTimeout(resolve, 20)); } throw new Error('Queue timed out'); };
  for (const model of arkModels) for (const count of [0,1,10]) {
    const response = await call('/api/generate', { provider: 'ark', model: model.id, prompt: 'test', n: 1, aspect: '16:9', references: Array(count).fill(reference) });
    assert.equal(response.status, 202); assert.equal(response.data.job.request, undefined);
    const job = await waitJob(response.data.job.id);
    assert.equal(job.status, 'succeeded'); assert.equal(job.imageCount, 1); assert.equal(job.images.length, job.imageCount);
    assert.equal(job.mode, count ? 'edit' : 'generate'); assert.equal(job.referencesUsed,count);
    for (const image of job.images) { assert.equal(image.outputType, 'png'); const file = await fetch(base+image.url); assert.equal(file.status, 200); assert.equal(Buffer.from(await file.arrayBuffer()).equals(Buffer.from(pixel,'base64')),true); }
  }
  for (const prompt of ['FAIL_ONCE','PARTIAL']) { const created = await call('/api/generate',{provider:'ark',model:arkModels[0].id,prompt,n:1}); const job=await waitJob(created.data.job.id); assert.equal(job.status,'failed'); }
  const invalid = await call('/api/generate', {provider:'ark',model:arkModels[0].id,prompt:'test',references:Array(11).fill(reference)}); assert.equal(invalid.status,400);
  for (const model of arkPlanModels) for (const count of [0,1,10]) {
    const response=await call('/api/generate',{provider:'ark-plan',model:model.id,prompt:'plan test',n:1,aspect:'16:9',references:Array(count).fill(reference)});
    assert.equal(response.status,202);const job=await waitJob(response.data.job.id);
    assert.equal(job.status,'succeeded');assert.equal(job.provider,'ark-plan');assert.equal(job.model,model.id);assert.equal(job.referencesUsed,count);assert.equal(job.images.length,1);assert.equal(job.images[0].outputType,'png');assert.equal(job.request,undefined);
  }
  for(const prompt of ['FAIL_ONCE','PARTIAL']) {const response=await call('/api/generate',{provider:'ark-plan',model:arkPlanModels[0].id,prompt,n:1});assert.equal((await waitJob(response.data.job.id)).status,'failed');}
  assert.equal((await call('/api/generate',{provider:'ark-plan',model:arkPlanModels[0].id,prompt:'test',references:Array(11).fill(reference)})).status,400);
  for (const [provider, model, expected] of [['moyu',arkModels[1].id, 'test-legacy'], ['image2','gpt-image-2', 'test-image2']]) {
    const created=await call('/api/generate',{provider,model,prompt:'legacy test',size:'1024x1024',n:1}); assert.equal(created.status,202); assert.equal((await waitJob(created.data.job.id)).status,'succeeded');
    const requests=(await fs.readFile(recordPath,'utf8')).trim().split(String.fromCharCode(10)).map(JSON.parse); assert.equal(requests.at(-1).authorization, 'Bearer '+expected);
  }
  const requests=(await fs.readFile(recordPath,'utf8')).trim().split(String.fromCharCode(10)).map(JSON.parse);
  const official=requests.filter(item=>item.url==='https://ark.cn-beijing.volces.com/api/v3/images/generations'); assert.equal(official.length,8); assert.ok(official.every(item=>item.authorization==='Bearer test-official'));
  const plan=requests.filter(item=>item.url==='https://ark.cn-beijing.volces.com/api/plan/v3/images/generations');assert.equal(plan.length,8);assert.ok(plan.every(item=>item.authorization==='Bearer test-plan'));assert.equal(plan.filter(item=>item.body.prompt==='FAIL_ONCE').length,1);assert.equal(plan.filter(item=>Array.isArray(item.body.image)&&item.body.image.length===10).length,2);assert.ok(plan.every(item=>item.body.sequential_image_generation===undefined&&item.body.layer_decomposition===undefined));
  assert.equal(official.filter(item=>item.body.prompt==='FAIL_ONCE').length,1);
  assert.equal(official.filter(item=>Array.isArray(item.body.image)&&item.body.image.length===10).length,2);
  assert.ok(official.every(item=>item.body.layer_decomposition===undefined&&item.body.arkOperation===undefined));
  const saved=await fs.readFile(path.join(dir,'output/image2-generation-jobs.json'),'utf8'); assert.ok(!saved.includes('test-official') && !saved.includes('test-legacy') && !saved.includes(reference));
  assert.ok(!saved.includes('test-plan'));assert.equal(JSON.parse(saved).filter(job=>job.provider==='ark-plan').length,8);
});
