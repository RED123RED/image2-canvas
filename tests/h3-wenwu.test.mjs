import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { wenwuId, wenwuAspects, wenwuDefaults, wenwuDimensions, validMultiple, validMegapixels } from '../public/h3-wenwu.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = server => new Promise(resolve => server.close(resolve));
const pause = () => new Promise(resolve => setTimeout(resolve, 45));

test('Wenwu dimensions follow aspect, pixel area and alignment', () => {
  assert.equal(Object.keys(wenwuAspects).length, 8);
  for (const aspect of Object.keys(wenwuAspects)) {
    const size = wenwuDimensions({ ...wenwuDefaults, videoAspect: aspect, videoMultiple: 20 });
    assert.ok(size.width > 0 && size.height > 0);
    assert.equal(size.width % 20 + size.height % 20, 0);
  }
  assert.deepEqual(wenwuDimensions({videoAspect:'1:1', videoMegapixels:1, videoMultiple:32}), {width:1024, height:1024});
  assert.ok(validMegapixels(0.1) && validMegapixels(16) && !validMegapixels(16.1));
  assert.ok(validMultiple(8) && validMultiple(128) && !validMultiple(10));
});

test('H3 submits uploaded video to #27 or legacy #170 and returns the final video', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'canvas-h3-route-'));
  const uploads = [], runs = [];
  const upstream = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    const send = data => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(data)); };
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
  const probe = http.createServer(); const port = await listen(probe); await close(probe);
  await fs.mkdir(path.join(dir,'public'));
  for (const file of ['server.mjs','media-cleanup.mjs','package.json', ...['media-references','local-edit-document','layer-document','seedream-ark','runninghub-moss','h3-wenwu'].map(name=>'public/'+name+'.js')]) {
    await fs.copyFile(path.join(root,file),path.join(dir,file));
  }
  const child = spawn(process.execPath, ['server.mjs'], { cwd:dir, windowsHide:true, stdio:'ignore', env:{...process.env, PORT:String(port), APPDATA:dir, RUNNINGHUB_BASE_URL:gateway, RUNNINGHUB_API_KEY:'offline-only'} });
  t.after(async () => { if (child.exitCode === null) {const done = new Promise(resolve=>child.once('exit',resolve)); child.kill(); await done;} await close(upstream); await fs.rm(dir,{recursive:true,force:true}); });
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
});
