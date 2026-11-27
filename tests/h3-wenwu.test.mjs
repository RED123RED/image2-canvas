import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { wenwuId, wenwuAspects, wenwuDefaults, wenwuDimensions, validMultiple, validMegapixels } from '../public/h3-wenwu.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = server => new Promise(resolve => server.close(resolve));
const pause = () => new Promise(resolve => setTimeout(resolve, 45));

test('Wenwu dimensions follow aspect, pixel area and alignment and template exposes supported values', async () => {
  assert.equal(Object.keys(wenwuAspects).length, 8);
  for (const aspect of Object.keys(wenwuAspects)) {
    const size = wenwuDimensions({ ...wenwuDefaults, videoAspect: aspect, videoMultiple: 20 });
    assert.ok(size.width > 0 && size.height > 0);
    assert.equal(size.width % 20 + size.height % 20, 0);
  }
  assert.deepEqual(wenwuDimensions({videoAspect:'1:1', videoMegapixels:1, videoMultiple:32}), {width:1024, height:1024});
  assert.ok(validMegapixels(0.1) && validMegapixels(16) && !validMegapixels(16.1));
  assert.ok(validMultiple(8) && validMultiple(128) && !validMultiple(10));
  const template = await fs.readFile(path.join(root,'public/index.html'),'utf8');
  const remake = await fs.readFile(path.join(root,'public/video-remake.js'),'utf8');
  assert.match(template,/<input id="remakeDuration" type="number" min="5" max="30" step="1" value="10"/);
  for (const aspect of ['16:9','9:16','1:1','4:3','3:4']) assert.match(template,new RegExp(`<option>${aspect}</option>`));
  assert.match(template,/id="remakeOpenFolder"/);
  assert.match(template,/id="remakeHistoryButton"/);
  assert.match(template,/id="remakeHistoryView"/);
  assert.match(template,/id="remakeHistoryOutput"/);
  assert.match(template,/id="remakeHistoryList"/);
  assert.doesNotMatch(template,/id="remakeDelete"/);
  assert.match(remake,/function deleteHistoryRecord/);
  assert.match(remake,/\/api\/generated\/delete/);
  assert.match(remake,/event\.key !== 'Control'/);
  assert.match(remake,/event\.key === 'Control'/);
  assert.match(remake,/if \(mentionMenu\.hidden \|\| event\.isComposing/);
  assert.doesNotMatch(remake,/prompt\.insertAdjacentText\('beforeend', '@'\)/);
});

test('H3 submits uploaded video to #27 or legacy #170 and returns the final video', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'canvas-h3-route-'));
  const uploads = [], runs = [], rewrites = [];
  const upstream = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const send = data => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(data)); };
    if (req.url === '/chat/completions') {
      const payload = JSON.parse(body); rewrites.push(payload);
      return send({ choices: [{ message: { content: 'integrated_multimodal_description: simulated H3 prompt' } }] });
    }
    if (req.url === '/messages') {
      const payload = JSON.parse(body); rewrites.push(payload);
      return send({ content: [{ type:'text', text:'integrated_multimodal_description: simulated H3 prompt' }] });
    }
    if (req.url.endsWith('/upload/binary')) {
      uploads.push(body); return send({ code:0, data:{ fileName:'asset-' + uploads.length } });
    }
    if (req.url.includes('/run/workflow/')) {
      runs.push({ path:req.url, ...JSON.parse(body) }); return send({ taskId:'task-' + runs.length });
    }
    if (req.url.endsWith('/query')) {
      const wenwu = runs.at(-1).path.endsWith(wenwuId);
      const final = { nodeId:wenwu ? '364' : '92', url:gateway + '/result.mp4', outputType:'mp4' };
      return send({ status:'SUCCESS', results:wenwu ? [{nodeId:'27', url:gateway+'/preview.png'}, final] : [final] });
    }
    if (req.url === '/result.mp4') { res.setHeader('content-type','video/mp4'); return res.end('offline-final-video'); }
    res.writeHead(404); res.end();
  });
  const gateway = 'http://127.0.0.1:' + await listen(upstream);
  let child = null;
  t.after(async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const done = new Promise(resolve=>child.once('exit',resolve));
      child.kill();
      if (child.exitCode === null && child.signalCode === null) await done;
    }
    upstream.closeAllConnections();
    await close(upstream);
    await fs.rm(dir,{recursive:true,force:true});
  });
  const gatewayPort = new URL(gateway).port;
  const fetchRouterPath = path.join(dir, 'mock-model-fetch.mjs');
  await fs.writeFile(fetchRouterPath, `
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (input, init) => {
      const target = typeof input === 'string' ? input : input.url;
      const url = new URL(target);
      const fixedGateway = url.hostname === 'www.moyu.cn' || (url.hostname === 'ark.cn-beijing.volces.com' && url.pathname.startsWith('/api/plan/v3'));
      return fixedGateway && url.pathname.endsWith('/chat/completions')
        ? originalFetch('http://127.0.0.1:${gatewayPort}/chat/completions', init)
        : originalFetch(input, init);
    };
  `);
  const probe = http.createServer(); const port = await listen(probe); await close(probe);
  await fs.mkdir(path.join(dir,'public'));
  for (const file of ['server.mjs','media-cleanup.mjs','package.json', ...['media-references','local-edit-document','layer-document','seedream-ark','runninghub-moss','h3-wenwu'].map(name=>'public/'+name+'.js')]) {
    await fs.copyFile(path.join(root,file),path.join(dir,file));
  }
  const nodeOptions = [process.env.NODE_OPTIONS, `--import=${pathToFileURL(fetchRouterPath).href}`].filter(Boolean).join(' ');
  child = spawn(process.execPath, ['server.mjs'], { cwd:dir, windowsHide:true, stdio:'ignore', env:{...process.env, NODE_OPTIONS:nodeOptions, PORT:String(port), APPDATA:dir, OPENAI_API_KEY:'offline-astra-only', IMAGE2_BASE_URL:gateway, DEEPSEEK_BASE_URL:gateway, DEEPSEEK_API_KEY:'offline-deepseek', GEMINI_NEON_BASE_URL:gateway, GEMINI_NEON_API_KEY:'offline-gemini', CLAUDE_NUODA_BASE_URL:gateway, CLAUDE_NUODA_API_KEY:'offline-claude', KIMI_BASE_URL:gateway, KIMI_API_KEY:'offline-moonshot', MOYU_KIMI_API_KEY:'offline-moyu', ARK_PLAN_API_KEY:'offline-ark-plan', RUNNINGHUB_BASE_URL:gateway, RUNNINGHUB_API_KEY:'offline-only'} });
  const base = 'http://127.0.0.1:' + port;
  let status;
  for (let i=0;i<100 && !status;i++) {try {status = await (await fetch(base+'/api/status')).json();} catch {await pause();}}
  assert.equal(status?.runninghub?.wenwuWorkflowId,wenwuId);
  const uploaded = await (await fetch(base+'/api/video-assets',{method:'POST',headers:{'content-type':'video/mp4','x-file-name':'sample.mp4'},body:'offline-video-reference'})).json();
  assert.ok(uploaded.url);
  const audio = await (await fetch(base+'/api/audio-assets',{method:'POST',headers:{'content-type':'audio/mpeg','x-file-name':'sample.mp3'},body:'offline-audio-reference'})).json();
  assert.ok(audio.url);
  const cloneDir = path.join(dir,'output','voice-clone','files');
  await fs.mkdir(cloneDir,{recursive:true});
  const cloneName = 'vc-00000000-0000-4000-a000-000000000001-0.mp3';
  const cloneUrl = '/api/voice-clone/files/' + cloneName;
  await fs.writeFile(path.join(cloneDir,cloneName),'selected-clone-result');
  const request = { provider:'runninghub-h3', videoMode:'wenwu', prompt:'慢镜头', seconds:30, aspect:'21:9', megapixels:0.75, multiple:20, videoReference:uploaded.url, audioReference:audio.url, secondAudioReference:audio.url, references:[] };
  const submit = payload=>fetch(base+'/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  assert.equal((await submit({...request,audioReference:cloneUrl.replace('-0.mp3','-9.mp3')})).status,400);
  assert.equal((await submit({...request,audioReference:'/api/voice-clone/files/../../server.mjs'})).status,400);
  assert.equal((await submit({...request,multiple:10})).status,400);
  assert.equal((await submit({...request,videoMode:'reference'})).status,400);
  const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
  for (const [mode, id] of [['wenwu','27'],['reference','170']]) {
    const submitted=await submit({...request,videoMode:mode,audioReference:mode==='wenwu'?audio.url:cloneUrl,secondAudioReference:cloneUrl,references:mode==='wenwu'?[]:[pixel]});
    assert.equal(submitted.status,202); let {job}=await submitted.json();
    for(let i=0;i<160 && !['succeeded','failed'].includes(job.status);i++){await pause();({job}=await (await fetch(base+'/api/jobs/'+job.id)).json());}
    assert.equal(job.status,'succeeded',JSON.stringify(job.error));
    assert.equal(job.media.length,1);
    assert.equal(await (await fetch(base+job.media[0].url)).text(),'offline-final-video');
    assert.equal(job.videoSeconds, mode === 'wenwu' ? 30 : 15);
    const run=runs.at(-1); const fields=Object.fromEntries(run.nodeInfoList.map(item=>[item.nodeId+'.'+item.fieldName,item.fieldValue]));
    assert.ok(uploads[Number(fields[id+'.video'].split('-')[1])-1].includes('offline-video-reference'));
    const cloneField = mode === 'wenwu' ? '14.audio' : '171.audio';
    assert.ok(uploads[Number(fields[cloneField].split('-')[1])-1].includes('selected-clone-result'));
    assert.ok(!run.nodeInfoList.some(n=>n.nodeId==='309'));
    if(mode==='wenwu') {
      assert.ok(run.path.endsWith(wenwuId)); assert.equal(fields['263.text'],request.prompt); assert.equal(fields['259.value'],30);
      assert.equal(fields['252.aspect_ratio'],'21:9 (Ultrawide)'); assert.equal(fields['252.megapixels'],0.75); assert.equal(fields['252.multiple'],20);
      assert.ok(fields['48.audio'] && fields['14.audio']); assert.equal(job.media[0].nodeId,'364');
    } else {assert.ok(run.path.endsWith('2093564802919649281'));assert.ok(fields['137.image'] && fields['171.audio']);}
  }

  const remakePixel = pixel;
  const remakeRequest = (references, prompt='') => ({
    requestId: crypto.randomUUID(), prompt, rewriterModel:'gpt-6-astra', seconds:10,
    aspect:'16:9', megapixels:1.5, references, frames:[], videoReference:''
  });
  const remake = async payload => fetch(base+'/api/templates/video-remake', {
    method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload)
  });
  const textOnly = remakeRequest([], '一只纸飞机穿过阳光照亮的房间');
  textOnly.seconds = 17;
  const textResponse = await remake(textOnly);
  assert.equal(textResponse.status,202,await textResponse.clone().text());
  let {job: remakeJob} = await textResponse.json();
  for(let i=0;i<160 && !['succeeded','failed'].includes(remakeJob.status);i++) {
    await pause(); ({job:remakeJob}=await (await fetch(base+'/api/jobs/'+remakeJob.id)).json());
  }
  assert.equal(remakeJob.status,'succeeded',JSON.stringify(remakeJob.error));
  assert.equal(remakeJob.h3Prompt,'integrated_multimodal_description: simulated H3 prompt');
  assert.equal(rewrites.at(-1).model,'gpt-6-astra');
  assert.match(rewrites.at(-1).messages[0].content,/Selected input mode: T2VA/);
  assert.match(rewrites.at(-1).messages[0].content,/Target video duration: 17\.00 seconds/);
  assert.equal(remakeJob.videoSeconds,17);
  assert.ok(Number.isFinite(remakeJob.videoStartedAt));
  assert.ok(Number.isFinite(remakeJob.videoElapsedMs));
  const remakeRun = runs.at(-1);
  const remakeFields = Object.fromEntries(remakeRun.nodeInfoList.map(item=>[item.nodeId+'.'+item.fieldName,item.fieldValue]));
  assert.ok(remakeRun.path.endsWith(wenwuId));
  assert.equal(remakeFields['263.text'],remakeJob.h3Prompt);
  assert.equal(remakeFields['252.megapixels'],1.5);
  assert.equal(remakeFields['259.value'],17);

  const referenceRequest = remakeRequest(Array(9).fill(remakePixel), '让@2中的人物走进画面，产品参考@1。');
  const referenceResponse = await remake(referenceRequest);
  assert.equal(referenceResponse.status,202);
  ({job:remakeJob}=await referenceResponse.json());
  for(let i=0;i<160 && !['succeeded','failed'].includes(remakeJob.status);i++) {
    await pause(); ({job:remakeJob}=await (await fetch(base+'/api/jobs/'+remakeJob.id)).json());
  }
  assert.equal(remakeJob.status,'succeeded',JSON.stringify(remakeJob.error));
  assert.match(rewrites.at(-1).messages[0].content,/Selected input mode: REF2VA/);
  const rewriteUserContent = rewrites.at(-1).messages[1].content.map(part => part.text || '').join('\n');
  assert.match(rewriteUserContent,/@2中的人物走进画面/);
  assert.match(rewriteUserContent,/@1。/);
  assert.match(rewriteUserContent,/<Picture 1>/);
  assert.match(rewriteUserContent,/<Picture 2>/);
  assert.equal(rewrites.at(-1).messages[1].content.filter(item=>item.type==='image_url').length,9);
  assert.equal(runs.at(-1).nodeInfoList.filter(item=>item.fieldName==='image').length,9);

  const selectedModelRequest = remakeRequest([], 'DeepSeek 模型提示词整理');
  selectedModelRequest.rewriterModel = 'deepseek-flash';
  const selectedModelResponse = await remake(selectedModelRequest);
  assert.equal(selectedModelResponse.status,202);
  ({job:remakeJob}=await selectedModelResponse.json());
  for(let i=0;i<160 && !['succeeded','failed'].includes(remakeJob.status);i++) {
    await pause(); ({job:remakeJob}=await (await fetch(base+'/api/jobs/'+remakeJob.id)).json());
  }
  assert.equal(remakeJob.status,'succeeded',JSON.stringify(remakeJob.error));
  assert.equal(rewrites.at(-1).model,'deepseek-flash');

  const textOnlyModelRequest = remakeRequest([remakePixel], '视觉模型校验');
  textOnlyModelRequest.rewriterModel = 'gemini-4-neon';
  assert.equal((await remake(textOnlyModelRequest)).status,400);

  for (const model of ['deepseek-v4-pro','claude-sonnet-4-6','claude-opus-5-5','kimi-k3-moyu','kimi-k3-moonshot','kimi-k3.1-pro']) {
    const modelRequest = remakeRequest([], `${model} H3 模板检查`);
    modelRequest.rewriterModel = model;
    const response = await remake(modelRequest);
    assert.equal(response.status,202,`${model}: ${await response.clone().text()}`);
    ({job:remakeJob}=await response.json());
    for(let i=0;i<160 && !['succeeded','failed'].includes(remakeJob.status);i++) {
      await pause(); ({job:remakeJob}=await (await fetch(base+'/api/jobs/'+remakeJob.id)).json());
    }
    assert.equal(remakeJob.status,'succeeded',`${model}: ${remakeJob.error}`);
    assert.equal(rewrites.at(-1).model,model.startsWith('kimi-k3-') ? 'kimi-k3' : model);
  }

  for (const aspect of ['4:3','3:4']) {
    const longRequest = remakeRequest([], `30 秒 ${aspect} 视频`);
    longRequest.seconds = 30;
    longRequest.aspect = aspect;
    const response = await remake(longRequest);
    assert.equal(response.status,202,`${aspect}: ${await response.clone().text()}`);
    ({job:remakeJob}=await response.json());
    for(let i=0;i<160 && !['succeeded','failed'].includes(remakeJob.status);i++) {
      await pause(); ({job:remakeJob}=await (await fetch(base+'/api/jobs/'+remakeJob.id)).json());
    }
    assert.equal(remakeJob.status,'succeeded',`${aspect}: ${remakeJob.error}`);
    assert.equal(remakeJob.videoSeconds,30);
    const fields = Object.fromEntries(runs.at(-1).nodeInfoList.map(item=>[item.nodeId+'.'+item.fieldName,item.fieldValue]));
    assert.equal(fields['259.value'],30);
    assert.equal(fields['252.aspect_ratio'],aspect === '4:3' ? '4:3 (Standard)' : '3:4 (Portrait Standard)');
  }

  const overflow = await remake(remakeRequest(Array(10).fill(remakePixel), '不要提交'));
  assert.equal(overflow.status,400);
  const duplicateRequest = remakeRequest([], '幂等测试');
  duplicateRequest.requestId = textOnly.requestId;
  assert.equal((await remake(duplicateRequest)).status,409);

  const videoUrl = remakeJob.media[0].url;
  const videoFilename = decodeURIComponent(new URL(videoUrl,base).pathname.split('/').pop());
  const deletion = await fetch(base+'/api/generated/delete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({filenames:[videoFilename]})});
  assert.equal(deletion.status,200);
  assert.deepEqual(await deletion.json(),{deleted:1,missing:0});
  assert.equal((await fetch(base+videoUrl)).status,404);
});
