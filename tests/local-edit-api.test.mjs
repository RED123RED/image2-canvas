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
test('local edit API: isolated keys, idempotency and restart',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'canvas-local-edit-'));
  await fs.mkdir(path.join(dir,'public'));
  for(const f of ['server.mjs','media-cleanup.mjs','public/media-references.js','public/seedream-ark.js','public/layer-document.js','public/local-edit-document.js'])await fs.copyFile(path.join(root,f),path.join(dir,f));
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
  const ready=async()=>{for(let i=0;i<100;i++){try{await call('/api/local-edit/status');return;}catch{await new Promise(r=>setTimeout(r,30));}}throw Error('server did not start');};
  const wait=async id=>{for(let i=0;i<100;i++){const {job}= (await call('/api/jobs/'+id)).data;if(['failed','succeeded'].includes(job.status))return job;await new Promise(r=>setTimeout(r,25));}throw Error('job timeout');};
  start();await ready();
  const input={provider:'ark-plan',model:'doubao-seedream-5-0-pro',references:['data:image/png;base64,'+data],size:'1200x1000',prompt:'edit',requestId:crypto.randomUUID()};
  assert.equal((await call('/api/local-edit/status')).data.ready,false);
  await call('/api/providers/ark',{apiKey:'ordinary-only'});assert.equal((await call('/api/local-edit',input)).status,401);
  await call('/api/providers/ark-plan',{apiKey:'layer-test-key'});
  for(const bad of [{provider:'ark'},{model:'gpt-image-2'},{size:'1x1'},{requestId:'bad'},{references:['data:image/png;base64,'+png(10,10)]},{references:['data:image/png;base64,YWJj']}])assert.equal((await call('/api/local-edit',{...input,...bad})).status,400);
  const duplicate=await Promise.all([call('/api/local-edit',input),call('/api/local-edit',input)]);assert.ok(duplicate.every(r=>[200,202].includes(r.status)));assert.equal(duplicate[0].data.job.id,duplicate[1].data.job.id);
  const job=await wait(duplicate[0].data.job.id);assert.equal(job.status,'succeeded');assert.equal(job.kind,'local-image-edit');assert.equal(job.request,undefined);assert.equal(job.images.length,1);assert.equal(job.layerDocument,undefined);assert.equal((await fetch(base+job.images[0].url)).status,200);
  assert.equal((await call('/api/local-edit',{...input,prompt:'changed'})).status,409);
  const flash=await call('/api/local-edit',{...input,model:'doubao-seedream-5.0-flash',requestId:crypto.randomUUID(),references:[...input.references,...input.references]});assert.equal((await wait(flash.data.job.id)).status,'succeeded');
  const failure=await call('/api/local-edit',{...input,prompt:'FAIL',requestId:crypto.randomUUID()});assert.equal((await wait(failure.data.job.id)).status,'failed');
  const requests=(await fs.readFile(record,'utf8')).trim().split(String.fromCharCode(10)).map(JSON.parse);assert.equal(requests.length,3);assert.equal(requests.filter(r=>r.body.prompt==='FAIL').length,1);assert.ok(requests.every(r=>r.key==='Bearer layer-test-key'&&r.body.size==='1200x1000'&&!r.body.layer_decomposition));
  const saved=await fs.readFile(path.join(dir,'output/image2-generation-jobs.json'),'utf8');assert.ok(!saved.includes('layer-test-key'));assert.ok(!saved.includes(input.references[0]));
  await stop();start();await ready();assert.equal((await call('/api/local-edit',input)).data.job.id,job.id);assert.equal((await call('/api/jobs/'+job.id)).data.job.status,'succeeded');assert.equal((await fs.readFile(record,'utf8')).trim().split(String.fromCharCode(10)).length,3);
});