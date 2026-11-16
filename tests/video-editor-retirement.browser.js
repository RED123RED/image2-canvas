async page => {
  const checks = [], errors = [], writes = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({width:1600,height:1050});
  const actual = await (await page.request.get(new URL('/api/status',page.url()).href)).json();
  const video = Buffer.from(await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 90;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#44aabb'; ctx.fillRect(0,0,160,90);
    const stream = canvas.captureStream(10), chunks = [], recorder = new MediaRecorder(stream,{mimeType:'video/webm'});
    const done = new Promise(resolve => { recorder.ondataavailable = e => chunks.push(e.data); recorder.onstop = resolve; });
    recorder.start(); await new Promise(resolve => setTimeout(resolve,250)); recorder.stop(); await done;
    stream.getTracks().forEach(track => track.stop()); return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  }));
  await page.route('**/api/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() === 'GET' && path === '/api/status') return route.fulfill({json:actual});
    if (request.method() === 'GET' && path.startsWith('/api/video-assets/')) return route.fulfill({contentType:'video/webm',body:video});
    if (request.method() !== 'GET') writes.push({path,method:request.method()});
    if (request.method() === 'POST' && path === '/api/video-assets') return route.fulfill({json:{url:'/api/video-assets/retirement-upload.webm',filename:'retirement-upload.webm',name:'验证视频.webm'}});
    return route.fulfill({status:400,json:{error:'Blocked by isolated video retirement regression'}});
  });
  const name = '视频剪辑下线回归 '+Date.now(), src = '/api/video-assets/retirement-fixture.webm';
  const nodes = [
    {id:'result',type:'video',name:'既有视频结果',src,outputType:'webm',x:0,y:0,width:360,height:280},
    {id:'editor',type:'video-editor',name:'既有剪辑兼容',x:0,y:380,width:680,height:390,clips:[{id:'clip1',name:'原片段',src,start:.02,end:.2,duration:.25,origin:'imported'}],timelinePlayhead:.05,selectedClipId:'clip1',outputSrc:src,status:'ready'},
    {id:'preview',type:'video-preview',name:'既有剪辑预览',x:760,y:380,width:360,height:280},
    {id:'local',type:'video-preview',name:'本地视频预览',x:430,y:0,width:360,height:280,localVideoSrc:src,localVideoName:'本地视频.webm',outputType:'webm'},
    {id:'h3',type:'generator',mediaType:'video',provider:'runninghub',name:'H3 保留',x:1200,y:0,width:390,height:770},
    {id:'prompt',type:'prompt',name:'既有提示词',content:'保持视频和图像功能',x:0,y:900,width:300,height:300},
    {id:'answer',type:'answer',name:'既有回答',model:'gpt-6-astra',answer:'已有回答保留',x:400,y:900,width:380,height:600},
    {id:'generator',type:'generator',name:'既有生图',provider:'image2',image2Model:'gpt-image-2.5-sunburst',x:900,y:900,width:360,height:600}
  ];
  const edges = [
    {id:'e1',source:'editor',sourcePort:'video',target:'preview',targetPort:'video',type:'video'},
    {id:'e2',source:'local',sourcePort:'video-output',target:'h3',targetPort:'video-reference',type:'video'},
    {id:'e3',source:'prompt',sourcePort:'prompt',target:'answer',targetPort:'prompt',type:'prompt'},
    {id:'e4',source:'prompt',sourcePort:'prompt',target:'generator',targetPort:'prompt',type:'prompt'}
  ];
  await page.locator('#projectFileInput').setInputFiles({name:'video-retirement.image2.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:2,projectName:name,theme:'dark',nodes,edges,viewport:{x:20,y:30,scale:.45}}))});
  await page.getByRole('button',{name:name+' · 导入',exact:true}).waitFor();
  const saved = () => page.evaluate(name => new Promise((resolve,reject) => {
    const request = indexedDB.open('image2-canvas',3); request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db=request.result, q=db.transaction('projects').objectStore('projects').getAll();q.onsuccess=()=>{db.close();resolve(q.result.find(p=>p.projectName===name+' · 导入'));}; };
  }),name);
  const initial=await saved(), ids=Object.fromEntries(initial.nodes.map(n=>[nodes.find(x=>x.name===n.name).id,n.id]));
  check(!await page.locator('[data-library-add="video-editor"]').count(),'Module library removes video editor');
  for(const kind of ['prompt','composition','generator','video','video-preview','answer']) check(await page.locator('[data-library-add="'+kind+'"]').count()===1,'Library retains '+kind);
  check(await page.locator('[data-library-image]').count()===1,'Reference image entry retained');
  check((await page.locator('[data-preview-composite="'+ids.preview+'"]').getAttribute('src'))===src,'Legacy timeline still feeds preview');
  check((await page.locator('[data-preview-video="'+ids.local+'"]').getAttribute('src'))===src,'Local video preview source retained');
  check(await page.locator('[data-answer-model="'+ids.answer+'"]').inputValue()==='gpt-6-astra','GPT-6 Astra retained');
  const blankPoint = () => page.evaluate(() => {
    const rect=document.querySelector('#workspace').getBoundingClientRect();
    for(let y=rect.bottom-60;y>rect.top+60;y-=75) for(let x=rect.right-90;x>rect.left+50;x-=90) {
      const target=document.elementFromPoint(x,y); if(target?.closest('#workspace')&&!target.closest('.canvas-node,button,.panel-resize-handle')) return {x,y};
    } throw Error('No blank canvas point');
  });
  let blank=await blankPoint(); await page.mouse.click(blank.x,blank.y,{button:'right'});
  const context=await page.locator('.canvas-context-option strong').allTextContents();
  check(!context.includes('视频剪辑')&&['视频','成片预览','生图','模型回答','参考图'].every(x=>context.includes(x)),'Canvas context menu removes only editor');
  await page.keyboard.press('Escape');
  const connectionMenu = async (id,portId) => {
    await page.locator('#fitButton').click();
    const port=page.locator('.node-port[data-node-id="'+id+'"][data-port-id="'+portId+'"]'), box=await port.boundingBox(), target=await blankPoint();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down(); await page.mouse.move(target.x,target.y,{steps:12}); await page.mouse.up();
    await page.locator('.connection-menu').waitFor(); return page.locator('.connection-option-list strong').allTextContents();
  };
  let choices=await connectionMenu(ids.result,'video');
  check(choices.join('|')==='新建视频节点|新建成片预览节点','Video result keeps H3 and preview choices only');
  await page.keyboard.press('Escape'); choices=await connectionMenu(ids.local,'video-output');
  check(choices.join('|')==='新建视频节点','Local preview retains H3 connection choice');
  await page.keyboard.press('Escape'); choices=await connectionMenu(ids.editor,'video');
  check(choices.join('|')==='新建成片预览节点','Legacy editor retains preview connection');
  await page.keyboard.press('Escape'); choices=await connectionMenu(ids.h3,'video-reference');
  check(choices.join('|')==='新建成片预览节点','H3 input can still create a local preview');
  await page.locator('.connection-option').click(); await page.waitForTimeout(650);
  const connected=await saved();check(connected.nodes.length===initial.nodes.length+1&&connected.nodes.filter(n=>n.type==='video-editor').length===1,'Connected creation adds a preview without editor');
  check(connected.edges.some(e=>e.target===ids.h3&&e.targetPort==='video-reference'&&e.source!==ids.local),'Connected preview links to H3');
  await page.locator('#undoButton').click();await page.waitForTimeout(650);
  check((await saved()).edges.some(e=>e.target===ids.h3&&e.source===ids.local),'Undo restores original H3 reference');
  await page.evaluate(() => {
    const input=document.querySelector('#videoFileInput');
    input.click=()=>{}; // setInputFiles below supplies the file without opening the native picker.
  });
  await page.locator('[data-upload-preview-video="'+ids.local+'"]').first().evaluate(el=>el.click());
  await page.locator('#videoFileInput').setInputFiles({name:'验证视频.webm',mimeType:'video/webm',buffer:video});
  await page.waitForFunction(id=>document.querySelector('[data-preview-video="'+id+'"]')?.getAttribute('src')==='/api/video-assets/retirement-upload.webm',ids.local);
  check(writes.length===1&&writes[0].path==='/api/video-assets','Local video upload uses existing route (mocked)');
  await page.waitForTimeout(650);const afterUpload=await saved();
  check(afterUpload.edges.some(e=>e.source===ids.local&&e.target===ids.h3),'Upload preserves outgoing H3 link');
  check(JSON.stringify(afterUpload.nodes.find(n=>n.id===ids.editor).clips)===JSON.stringify(initial.nodes.find(n=>n.id===ids.editor).clips),'Legacy clips and trim values unchanged');
  for(const kind of ['video','video-preview','generator','answer','prompt','composition']) await page.locator('[data-library-add="'+kind+'"]').evaluate(el=>el.click());
  await page.waitForTimeout(650);const added=await saved();
  check(added.nodes.length===initial.nodes.length+6&&added.nodes.filter(n=>n.type==='video-editor').length===1,'Other six library node types can still be created');
  await page.reload();await page.locator('[data-answer-model="'+ids.answer+'"]').waitFor();
  check((await saved()).nodes.find(n=>n.id===ids.answer).answer==='已有回答保留','Refresh preserves existing answer');
  check((await saved()).nodes.find(n=>n.id===ids.editor).outputSrc===src,'Refresh preserves legacy rendered output');
  check(await page.locator('[data-preview-composite="'+ids.preview+'"]').count()===1,'Refresh preserves linked legacy preview');
  await page.evaluate(()=>{const original=URL.createObjectURL;URL.createObjectURL=function(blob){if(blob.type==='application/json')window.__retirementExport=blob;return original.call(this,blob);};});
  await page.locator('#exportProjectButton').click();await page.waitForFunction(()=>!!window.__retirementExport);
  const exported=await page.evaluate(async()=>JSON.parse(await window.__retirementExport.text()));
  check(exported.nodes.length===added.nodes.length&&exported.edges.length===edges.length,'Export preserves all nodes and links');
  check(exported.nodes.find(n=>n.id===ids.editor).clips[0].src===src,'Export preserves legacy media reference');
  await page.locator('#fitButton').click();await page.screenshot({path:'output/playwright/video-editor-retirement.png'});
  check(errors.length===0,'No browser exceptions'); return {checks,writes,errors};
}
