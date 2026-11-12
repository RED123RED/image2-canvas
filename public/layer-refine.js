import {normalizeLayerDocument} from './layer-document.js';

const defaultPrompt='请将当前图层中仍合在一起的元素分别拆开：纯背景与台面、摄影主图、曲线与光影装饰、叶片等装饰、底部色带。只拆分实际存在的元素，保持各部分原有位置、大小和外观，尽量保留细节。';
const image=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('无法读取图层素材'));img.src=src;});
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
async function json(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(60000)});const body=await r.json();if(!r.ok)throw Error(body.error||'请求失败 ('+r.status+')');return body;}

// Send the selected layer's untransformed source. Placement is restored only on apply.
async function requestImage(src){
  const img=await image(src),pixels=img.naturalWidth*img.naturalHeight;
  if(img.width/img.height<1/16||img.width/img.height>16)throw Error('此图层过于狭长，请先调整素材宽高比至 1:16–16:1');
  const factor=pixels<262144?Math.sqrt(262144/pixels):pixels>36000000?Math.sqrt(36000000/pixels):1;
  const width=factor>=1?Math.ceil(img.width*factor):Math.floor(img.width*factor),height=factor>=1?Math.ceil(img.height*factor):Math.floor(img.height*factor);
  const c=canvas(width,height);c.getContext('2d').drawImage(img,0,0,width,height);const data=c.toDataURL('image/png');
  if(data.length*3/4>30*1024*1024)throw Error('当前图层 PNG 超过 30 MB，请先缩小素材');return data;
}
async function preserveAlpha(candidate,source,persist){
  const sourceImage=await image(source),mask=canvas(candidate.width,candidate.height),m=mask.getContext('2d',{willReadFrequently:true});m.drawImage(sourceImage,0,0,mask.width,mask.height);
  const pixels=m.getImageData(0,0,mask.width,mask.height).data;
  let transparent=false;for(let i=3;i<pixels.length;i+=4)if(pixels[i]<255){transparent=true;break;}
  if(!transparent)return candidate;
  const result=structuredClone(candidate);
  for(const layer of result.layers){
    const img=await image(layer.src),c=canvas(img.width,img.height),ctx=c.getContext('2d');ctx.drawImage(img,0,0);
    ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,-layer.x*c.width/layer.width,-layer.y*c.height/layer.height,mask.width*c.width/layer.width,mask.height*c.height/layer.height);
    const stored=await persist(c.toDataURL('image/png'));layer.src=stored.url;
  }
  result.initialLayers=structuredClone(result.layers);return result;
}

export async function openLayerRefinement(options){
  const modal=document.createElement('dialog');modal.className='le-refine';modal.id='leRefine';
  modal.innerHTML='<header><strong>再次拆分图层</strong><button data-r="close" aria-label="关闭再次拆分">关闭</button></header><p class="le-refine-status" role="status"></p><div class="le-refine-previews"><figure><figcaption>当前图层</figcaption><img class="le-refine-source" alt="再次拆分的原图层"></figure><figure><figcaption>候选结果 <select class="le-refine-view" aria-label="候选图层预览"><option value="all">全部组合</option></select></figcaption><canvas class="le-refine-canvas"></canvas></figure></div><div class="le-refine-form"><label>拆层模型<select class="le-refine-model"><option value="doubao-seedream-5-0-pro">火山套餐 · Seedream 5.0 Pro</option><option value="doubao-seedream-5.0-flash">火山套餐 · Seedream 5.0 Flash</option></select></label><label>拆分要求<textarea class="le-refine-prompt" rows="4"></textarea></label><small>开始拆分会消耗套餐额度。结果仅供预览，点击“应用结果”后才更改作品；原图层保留为备份。AI 可能重绘细节。</small></div><footer><button data-r="start">开始拆分</button><button data-r="check" hidden>检查已有任务</button><button data-r="apply" class="le-primary" disabled>应用结果</button><button data-r="discard">放弃结果</button></footer>';
  options.parent.append(modal);const $=s=>modal.querySelector(s);
  let session=structuredClone(options.session||null),closed=false,working=false,timer,loaded=new Map();
  const target=session?.sourceLayer||options.target;
  if(!target){modal.remove();throw Error('请选择一个图片图层');}
  $('.le-refine-source').src=target.src;$('.le-refine-model').value=session?.model||options.model||'doubao-seedream-5-0-pro';$('.le-refine-prompt').value=session?.prompt??defaultPrompt;
  const status=(text,error=false)=>{const el=$('.le-refine-status');el.textContent=text;el.classList.toggle('is-error',error);};
  const persist=async()=>{await options.onSession(session?structuredClone(session):null);};
  const controls=()=>{
    $('[data-r="start"]').disabled=working||!!session?.jobId||!!session?.candidate||['unknown','submitting'].includes(session?.status);
    $('[data-r="check"]').hidden=!session?.jobId||!!session?.candidate;$('[data-r="check"]').disabled=working;
    $('[data-r="apply"]').disabled=working||!session?.candidate;
    $('[data-r="discard"]').disabled=working;$('[data-r="close"]').disabled=working;
    $('.le-refine-model').disabled=working||!!session?.jobId;$('.le-refine-prompt').disabled=working||!!session?.jobId;
  };
  const close=()=>{if(working)return;closed=true;clearTimeout(timer);modal.close();modal.remove();options.onClose?.();};
  async function drawCandidate(){
    if(!session?.candidate)return;const doc=session.candidate,c=$('.le-refine-canvas'),scale=Math.min(1,900/Math.max(doc.width,doc.height));c.width=Math.round(doc.width*scale);c.height=Math.round(doc.height*scale);const ctx=c.getContext('2d');ctx.scale(scale,scale);
    for(const l of doc.layers){if($('.le-refine-view').value!=='all'&&$('.le-refine-view').value!==l.id)continue;if(!loaded.has(l.src))loaded.set(l.src,await image(l.src));ctx.drawImage(loaded.get(l.src),l.x,l.y,l.width,l.height);}
  }
  async function showCandidate(){
    const select=$('.le-refine-view');select.replaceChildren(new Option('全部组合','all'),...session.candidate.layers.map(l=>new Option(l.name,l.id)));await drawCandidate();status('已返回 '+session.candidate.layers.length+' 层；可单独查看主体或底图，满意后应用。');controls();
  }
  async function poll(){
    clearTimeout(timer);if(closed||working||!session?.jobId||session?.candidate)return;
    working=true;controls();let again=false;
    try{
      const {job}=await json('/api/jobs/'+encodeURIComponent(session.jobId));if(closed)return;
      if(job.status==='succeeded'){
        if(!job.layerDocument)throw Error('任务没有返回分层文档');
        const candidate=normalizeLayerDocument(job.layerDocument);
        session.candidate=await preserveAlpha(candidate,session.sourceLayer.src,options.onPersist);session.status='ready';await persist();await showCandidate();
      }else if(['failed','canceled'].includes(job.status)){
        session.status='failed';session.error=job.error||'拆分失败';await persist();status(session.error+'。可关闭保留记录，或放弃后重新发起。',true);
      }else{session.status='running';status('拆分任务处理中，可关闭此窗口；再次打开会继续检查原任务。');again=true;}
    }catch(error){status(error.message+'；点击“检查已有任务”重试，不会再次扣费提交。',true);}
    finally{working=false;controls();if(again&&!closed)timer=setTimeout(poll,5000);}
  }
  $('.le-refine-view').addEventListener('change',()=>void drawCandidate().catch(e=>status(e.message,true)));
  modal.addEventListener('keydown',e=>e.stopPropagation());modal.addEventListener('cancel',e=>{e.preventDefault();close();});
  modal.addEventListener('click',async e=>{
    e.stopPropagation();const action=e.target.closest('[data-r]')?.dataset.r;if(!action||working)return;
    if(action==='close')return close();if(action==='check')return poll();
    working=true;controls();
    try{
      if(action==='start'){
        const ready=await json('/api/layers/status');if(ready.protocol!=='seedream-layer-document-v1'||!ready.ready)throw Error('请确认本机服务已更新，并配置火山套餐密钥');
        const model=$('.le-refine-model').value,prompt=$('.le-refine-prompt').value.trim();status('正在准备当前图层…');
        const input=await requestImage(target.src);
        // Save the exact target document before the only billable POST.
        await options.beforeStart();
        session={targetId:target.id,sourceLayer:structuredClone(target),fingerprint:options.fingerprint,model,prompt,status:'submitting'};await persist();
        try{const {job}=await json('/api/layers/decompose',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:'ark-plan',model,prompt,image:input})});session.jobId=job.id;session.status='running';await persist();}
        catch(error){session.status='unknown';session.error='提交结果未确认，请先检查任务记录，勿重复点击造成扣费：'+error.message;await persist();throw Error(session.error);}
        timer=setTimeout(poll,0);return;
      }
      if(action==='discard'){if(session&&!session.candidate&&session.status!=='failed'&&!confirm('放弃本地记录不会取消已提交的远端任务，也不会退还额度。确认放弃？'))return;session=null;await persist();working=false;close();return;}
      if(action==='apply'){await options.onApply(session);session=null;await persist();working=false;close();return;}
    }catch(error){status(error.message,true);}finally{working=false;controls();}
  });
  modal.showModal();controls();
  if(session?.candidate){try{await showCandidate();}catch(error){status(error.message,true);}}
  else if(session?.jobId)void poll();
  else if(session?.status==='unknown'||session?.status==='submitting'){status(session.error||'上次提交尚未确认，请先检查任务记录后再决定是否重试。',true);$('[data-r="start"]').disabled=true;}
  else status('只拆分当前选中的图片图层，先预览再应用。');
}
