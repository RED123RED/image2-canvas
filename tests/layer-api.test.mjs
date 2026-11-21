import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {deflateSync} from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
function png(w,h){
  const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
  const chunk=(name,data)=>{const type=Buffer.from(name),size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([size,type,data,sum]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((w*4+1)*h))),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
test('separate layer queue: one POST, accurate layout, durable local assets and recovery',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'canvas-layers-'));
  await fs.mkdir(path.join(dir,'public'));
  for(const f of ['server.mjs','media-cleanup.mjs','public/media-references.js','public/seedream-ark.js','public/runninghub-moss.js','public/layer-document.js','public/local-edit-document.js'])await fs.copyFile(path.join(root,f),path.join(dir,f));
  await fs.writeFile(path.join(dir,'package.json'),' {"type":"module"}');
  const record=path.join(dir,'requests.jsonl'),data=png(512,512),part=png(100,80);
  const mock=[
    "import fs from 'node:fs/promises';",
    'const record='+JSON.stringify(record)+';',
    'const data='+JSON.stringify(data)+', part='+JSON.stringify(part)+';',
    'globalThis.fetch=async(url,init={})=>{const body=JSON.parse(init.body);await fs.appendFile(record,JSON.stringify({url:String(url),body,key:init.headers.Authorization})+String.fromCharCode(10));',
    'if(body.prompt==="FAIL")return Response.json({error:{code:"RateLimitExceeded"}},{status:429});',
    'if(body.prompt==="PARTIAL")return Response.json({data:[{b64_json:data,z_index:0},{error:{code:"Rejected"}}]});',
    'if(!body.layer_decomposition)return Response.json({data:[{b64_json:data}]});',
    'return Response.json({data:[{b64_json:part,z_index:1,name:"主体",bounding_box:body.prompt==="NO_BOX"?{}:{absolute:[50,60,150,140]}},{b64_json:data,z_index:0,name:"底图"}]});};'
  ].join('\n');
  await fs.writeFile(path.join(dir,'mock.mjs'),mock);
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  let child;const stop=async()=>{if(child&&child.exitCode===null){const done=new Promise(r=>child.once('exit',r));child.kill();await done;}};
  const start=()=>{child=spawn(process.execPath,['--import',pathToFileURL(path.join(dir,'mock.mjs')).href,path.join(dir,'server.mjs')],{cwd:dir,env:{...process.env,PORT:String(port),APPDATA:path.join(dir,'config'),ARK_PLAN_API_KEY:'',ARK_API_KEY:'',OPENAI_API_KEY:''},windowsHide:true,stdio:'ignore'});};
  t.after(async()=>{await stop();await fs.rm(dir,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+port;
  const call=async(url,body)=>{const r=await fetch(base+url,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
  const ready=async()=>{for(let i=0;i<100;i++){try{await call('/api/layers/status');return;}catch{await new Promise(r=>setTimeout(r,30));}}throw Error('server did not start');};
  const wait=async id=>{for(let i=0;i<100;i++){const {job}= (await call('/api/jobs/'+id)).data;if(['failed','succeeded'].includes(job.status))return job;await new Promise(r=>setTimeout(r,25));}throw Error('job timeout');};
  start();await ready();const input={provider:'ark-plan',model:'doubao-seedream-5-0-pro',image:'data:image/png;base64,'+data};
  assert.equal((await call('/api/layers/status')).data.ready,false);
  await call('/api/providers/ark',{apiKey:'ordinary-only'});
  assert.equal((await call('/api/layers/decompose',input)).status,401);
  await call('/api/providers/ark-plan',{apiKey:'layer-test-key'});
  assert.equal((await call('/api/layers/status')).data.protocol,'seedream-layer-document-v1');
  for(const bad of [{provider:'ark'},{model:'gpt-image-2'},{image:[input.image]},{image:'data:image/png;base64,'+png(10,10)},{image:'data:image/png;base64,YWJj'}])assert.equal((await call('/api/layers/decompose',{...input,...bad})).status,400);
  const completed=[];
  for(const model of ['doubao-seedream-5-0-pro','doubao-seedream-5.0-flash']){
    const created=await call('/api/layers/decompose',{...input,model});assert.equal(created.status,202);assert.equal(created.data.job.request,undefined);
    const job=await wait(created.data.job.id);assert.equal(job.status,'succeeded');assert.equal(job.mode,'layers');assert.equal(job.imageCount,2);
    assert.equal(job.layerDocument.width,512);assert.equal(job.layerDocument.layers[1].x,50);assert.equal(job.layerDocument.layers[1].height,80);assert.equal(job.layerDocument.layers[0].locked,true);
    for(const image of job.images){assert.ok(image.url.startsWith('/api/assets/'));assert.equal((await fetch(base+image.url)).status,200);}
    completed.push(job);
  }
  for(const prompt of ['FAIL','PARTIAL','NO_BOX']){const created=await call('/api/layers/decompose',{...input,prompt});assert.equal((await wait(created.data.job.id)).status,'failed');}
  const ordinary=await call('/api/generate',{provider:'ark-plan',model:input.model,prompt:'ordinary',references:[],n:1,aspect:'1:1'});
  const ordinaryJob=await wait(ordinary.data.job.id);assert.equal(ordinaryJob.status,'succeeded');assert.equal(ordinaryJob.layerDocument,undefined);assert.ok(ordinaryJob.images[0].url.startsWith('/api/generated/'));
  const requests=(await fs.readFile(record,'utf8')).trim().split('\n').map(JSON.parse);assert.equal(requests.length,6);
  assert.equal(requests.filter(r=>r.body.prompt==='FAIL').length,1);assert.ok(requests.every(r=>r.key==='Bearer layer-test-key'));
  for(const request of requests.filter(r=>r.body.layer_decomposition)){assert.equal(request.body.size,'auto');assert.equal(request.body.output_format,'png');assert.equal(request.body.sequential_image_generation,undefined);assert.ok(request.url.endsWith('/api/plan/v3/images/generations'));}
  const saved=await fs.readFile(path.join(dir,'output/image2-generation-jobs.json'),'utf8');assert.ok(!saved.includes('layer-test-key'));assert.ok(!saved.includes(input.image));
  await stop();start();await ready();
  const recovered=(await call('/api/jobs/'+completed[0].id)).data.job;assert.deepEqual(recovered.layerDocument,completed[0].layerDocument);assert.equal(recovered.status,'succeeded');
});
