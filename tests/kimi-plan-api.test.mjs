import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));

test('Ark Plan Kimi: dedicated key and endpoint, image limits, skills, failure isolation and existing models',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'canvas-kimi-plan-test-'));await fs.mkdir(path.join(dir,'public'));
  for(const file of ['server.mjs','media-cleanup.mjs','public/media-references.js','public/local-edit-document.js','public/layer-document.js','public/seedream-ark.js'])await fs.copyFile(path.join(root,file),path.join(dir,file));
  await fs.writeFile(path.join(dir,'package.json'),JSON.stringify({type:'module'}));
  const config=path.join(dir,'config','image2-canvas');await fs.mkdir(config,{recursive:true});
  await fs.writeFile(path.join(config,'providers.json'),JSON.stringify({ark:{apiKey:'ordinary-test'},kimi:{moyuApiKey:'moyu-test',moonshotApiKey:'moonshot-test'},claude:{apiKey:'claude-test'},deepseek:{apiKey:'deepseek-test'}}));
  const record=path.join(dir,'requests.jsonl');
  await fs.writeFile(path.join(dir,'mock.mjs'),["import fs from 'node:fs/promises';",'const record='+JSON.stringify(record)+';',
    "globalThis.fetch=async(url,init={})=>{const body=JSON.parse(init.body);await fs.appendFile(record,JSON.stringify({url:String(url),body,key:init.headers.Authorization||init.headers['x-api-key']})+String.fromCharCode(10));",
    "const input=JSON.stringify(body.messages);if(input.includes('FAIL503'))return Response.json({error:{message:'model not available'}},{status:503});",
    "if(input.includes('EMPTY'))return Response.json({choices:[{message:{content:''}}]});",
    "if(String(url).endsWith('/messages'))return Response.json({content:[{type:'text',text:'old Claude answer'}]});return Response.json({choices:[{message:{content:'测试回答'}}]});};"].join(String.fromCharCode(10)));
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const child=spawn(process.execPath,['--import',pathToFileURL(path.join(dir,'mock.mjs')).href,path.join(dir,'server.mjs')],{cwd:dir,windowsHide:true,stdio:'ignore',env:{...process.env,PORT:String(port),APPDATA:path.join(dir,'config'),ARK_PLAN_API_KEY:'',ARK_API_KEY:'',OPENAI_API_KEY:'openai-test',DEEPSEEK_API_KEY:'deepseek-test',CLAUDE_API_KEY:'claude-test'}});
  t.after(async()=>{if(child.exitCode===null){const end=new Promise(r=>child.once('exit',r));child.kill();await end;}await fs.rm(dir,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+port,call=async(url,body)=>{const r=await fetch(base+url,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','x-image2-api-key':'wrong-shared-key'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
  let ready=false;for(let i=0;i<100;i++){try{await call('/api/status');ready=true;break;}catch{await new Promise(r=>setTimeout(r,40));}}assert.ok(ready);
  const input={model:'kimi-k3.1-pro',prompt:'简短测试',references:[]};
  assert.equal((await call('/api/status')).data.arkPlanAnswer.ready,false);
  assert.equal((await call('/api/respond',input)).status,401,'ordinary and other keys never substitute plan key');
  await call('/api/providers/ark-plan',{apiKey:'plan-test'});
  const status=(await call('/api/status')).data;assert.equal(status.arkPlanAnswer.model,input.model);assert.equal(status.arkPlanAnswer.protocol,'kimi-ark-plan-v1');assert.equal(status.arkPlan.models.length,2,'image model list unchanged');
  let result=await call('/api/respond',input);assert.equal(result.status,200);assert.equal(result.data.provider,'ark-plan');assert.equal(result.data.model,input.model);assert.equal(result.data.answer,'测试回答');
  const image='data:image/png;base64,YWJj';
  result=await call('/api/respond',{...input,references:Array(8).fill(image),skill:'nuyoah-reverse',referenceMetadata:Array(8).fill({width:1024,height:1024})});assert.equal(result.status,200);assert.equal(result.data.references,8);
  for(const references of [Array(9).fill(image),['https://remote/image.png'],['invalid'],[image+'a'.repeat(4*1024*1024)],'invalid'])assert.equal((await call('/api/respond',{...input,references})).status,400);
  assert.equal((await call('/api/respond',{...input,prompt:'FAIL503'})).status,502);assert.equal((await call('/api/respond',{...input,prompt:'EMPTY'})).status,502);
  for(const model of ['gpt-6-astra','kimi-k3-moyu','kimi-k3-moonshot','deepseek-flash','deepseek-v4-pro','claude-sonnet-4-6','claude-opus-5-5'])assert.equal((await call('/api/respond',{model,prompt:'previous model'})).status,200,model);
  const requests=(await fs.readFile(record,'utf8')).trim().split(String.fromCharCode(10)).map(JSON.parse),plan=requests.filter(r=>r.body.model===input.model);
  assert.equal(plan.length,4,'no automatic paid retry or invalid-input requests');assert.ok(plan.every(r=>r.url==='https://ark.cn-beijing.volces.com/api/plan/v3/chat/completions'&&r.key==='Bearer plan-test'));
  assert.ok(plan.every(r=>r.body.reasoning_effort==='high'&&r.body.max_tokens===16384&&r.body.temperature===undefined));
  assert.equal(plan[1].body.messages[0].role,'system');assert.equal(plan[1].body.messages[1].content.filter(c=>c.type==='image_url').length,8);assert.ok(plan[1].body.messages[1].content.filter(c=>c.type==='image_url').every(c=>!('detail' in c.image_url)));
  const oldKimi=requests.filter(r=>r.body.model==='kimi-k3');assert.equal(oldKimi.length,2);assert.ok(oldKimi.some(r=>r.url==='https://www.moyu.cn/v1/chat/completions'&&r.key==='Bearer moyu-test'));assert.ok(oldKimi.some(r=>r.url==='https://api.moonshot.cn/v1/chat/completions'&&r.key==='Bearer moonshot-test'));assert.ok(oldKimi.every(r=>r.body.reasoning_effort==='max'));
  assert.ok(requests.some(r=>r.body.model==='gpt-6-astra'&&r.key==='Bearer wrong-shared-key'));
});
