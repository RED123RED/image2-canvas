async(page)=>{
  const checks=[],errors=[],requests=[];let ready=false,protocol='seedream-layer-document-v1',hold=true;
  const check=(v,name)=>{if(!v)throw Error(name);checks.push(name);};page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/health',r=>r.fulfill({json:{ready:true}}));
  await page.route('**/api/layers/status',r=>r.fulfill({json:{ready,protocol}}));await page.reload();
  const fixture=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=512;c.height=512;c.getContext('2d').fillRect(0,0,512,512);const src=c.toDataURL('image/png');return{version:2,projectName:'拆层流程回归',theme:'dark',viewport:{x:10,y:90,scale:.7},nodes:[{id:'original',type:'image',name:'原图',src,originalSrc:src,x:0,y:0,width:500,height:550}],edges:[]};});
  const layers=[{id:'base',src:fixture.nodes[0].src,name:'背景',x:0,y:0,width:512,height:512,locked:true},{id:'top',src:fixture.nodes[0].src,name:'主体',x:30,y:60,width:100,height:80}].map(l=>({rotation:0,opacity:1,visible:true,locked:false,...l}));
  const doc={version:1,width:512,height:512,layers,initialLayers:structuredClone(layers)};
  await page.route('**/api/layers/decompose',r=>{requests.push(r.request().postDataJSON());return r.fulfill({status:202,json:{job:{id:'mock-layer-queue',status:'queued'}}});});
  await page.route('**/api/jobs/mock-layer-queue',r=>r.fulfill({json:{job:{id:'mock-layer-queue',status:hold?'running':'succeeded',layerDocument:doc}}}));
  const importFixture=async data=>{await page.locator('#projectFileInput').setInputFiles({name:'queue.image2.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.getByRole('button',{name:'拆层流程回归 · 导入',exact:true}).waitFor();};
  await importFixture(fixture);await page.getByRole('button',{name:'分层编辑',exact:true}).click();await page.locator('#leModel').waitFor();
  check(await page.locator('#leModel').inputValue()==='doubao-seedream-5-0-pro','Defaults to plan Pro');
  await page.locator('#layerEditor [data-action="start"]').click();await page.locator('.le-message.is-error').filter({hasText:'套餐密钥'}).waitFor();check(requests.length===0,'Missing plan key blocks paid request');
  ready=true;protocol='old';await page.locator('#layerEditor [data-action="start"]').click();await page.locator('.le-message.is-error').filter({hasText:'加载拆层功能'}).waitFor();check(requests.length===0,'Old server blocks submission');
  protocol='seedream-layer-document-v1';await page.locator('#leModel').selectOption('doubao-seedream-5.0-flash');await page.locator('#lePrompt').fill('拆出主体');await page.locator('#layerEditor [data-action="start"]').click();await page.locator('#layerEditor').waitFor({state:'detached'});
  check(requests.length===1&&requests[0].model==='doubao-seedream-5.0-flash'&&requests[0].image===fixture.nodes[0].src,'Selected Flash sends one source through dedicated route');
  check(await page.locator('.image-node').count()===2,'One result node is added while original remains');
  await page.reload();await page.getByRole('button',{name:'查看拆层进度',exact:true}).waitFor();check(true,'Pending task survives refresh');
  hold=false;await page.getByRole('button',{name:'编辑图层',exact:true}).waitFor({timeout:20000});check(requests.length===1,'Polling never resubmits paid generation');
  fixture.nodes.push({...fixture.nodes[0],id:'copy-a',name:'副本A',layerSource:fixture.nodes[0].src,layerJobId:'mock-layer-queue',x:600});
  fixture.nodes.push({...fixture.nodes[1],id:'copy-b',name:'副本B',x:1200});
  await importFixture(fixture);await page.waitForFunction(()=>document.querySelectorAll('[aria-label="编辑图层"]').length===2);
  check(await page.locator('.image-node').count()===3,'Two nodes referencing one task both recover');
  await page.getByRole('button',{name:'编辑图层',exact:true}).first().click();await page.locator('.le-row').first().waitFor();check(await page.locator('.le-row').count()===2,'Recovered node opens complete document');await page.getByRole('button',{name:'关闭分层编辑'}).click();
  check(errors.length===0,'No browser errors');return {checks,errors};
}
