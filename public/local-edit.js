import {localEditAlreadyApplied} from './local-edit-apply.js';
import {arkPlanModels} from './seedream-ark.js';
import {localEditProtocol,MAX_MARKS,normalizeMarks,normalizedPoint,markBounds,editSize,buildLocalEditPrompt} from './local-edit-document.js';
import {loadEditImage,drawMark,prepareLocalReferences,compositeLocalEdit} from './local-edit-render.js';
const clone=v=>structuredClone(v),names={point:'点选',rect:'框选',lasso:'圈选',pen:'画笔',arrow:'箭头',text:'文字',move:'移动',erase:'擦除笔迹'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function json(url,options={}){const response=await fetch(url,{...options,signal:AbortSignal.timeout(60000)});let data;try{data=await response.json();}catch{throw Error('服务未返回有效数据，请检查服务是否已更新');}if(!response.ok)throw Object.assign(Error(data.error||'请求失败'),{status:response.status});return data;}
export async function openLocalEditor(options){
  if(document.querySelector('#localEditDialog'))return;
  if(!document.querySelector('[data-local-edit-style]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/local-edit.css';l.dataset.localEditStyle='';document.head.append(l);}
  const original=await loadEditImage(options.session?.source||options.source);editSize(original.width,original.height);if(document.querySelector('#localEditDialog'))return;
  let s=clone(options.session||{version:1,source:options.source,marks:[],general:'',model:arkPlanModels.find(m=>m.id.includes('pro'))?.id||arkPlanModels[0].id,protect:false,feather:6,status:'draft',history:[]});
  s.marks=normalizeMarks(s.marks||[]);if(!Array.isArray(s.history))s.history=[];s.width=original.width;s.height=original.height;
  let source=original,result=null,selected=s.marks[0]?.id||'',tool='point',zoom=1,split=.5,view=s.result?'compare':'edit',busy=false,closed=false,pollTimer,drag=null,undo=[],redo=[];
  const dialog=document.createElement('dialog');dialog.id='localEditDialog';dialog.setAttribute('aria-label','局部修改');
  dialog.innerHTML='<div class="li-layout"><header><strong>局部修改 · '+esc(options.name)+'</strong><button data-li="close" aria-label="关闭局部修改">关闭</button></header><div class="li-toolbar">'+Object.entries(names).map(([k,n])=>'<button data-tool="'+k+'" type="button">'+n+'</button>').join('')+'<input data-li="color" type="color" value="#ff5151" aria-label="画笔颜色"><button data-li="undo">撤销标记</button><button data-li="redo">重做</button><button data-li="fit">适应</button><input data-li="zoom" type="range" min="5" max="300" value="100" aria-label="图片缩放"><select data-li="view" class="li-view" aria-label="预览方式"><option value="edit">编辑标记</option><option value="compare">左右对比</option><option value="before">修改前</option><option value="after">修改后</option></select></div><div class="li-main"><div class="li-stage" tabindex="0" aria-label="图片编辑区"><div class="li-picture"><canvas aria-label="绘制编辑标记"></canvas><div class="li-divider" role="slider" tabindex="0" aria-label="拖动对比中轴" aria-valuemin="0" aria-valuemax="100"></div><span class="li-compare-label before">修改前</span><span class="li-compare-label after">修改后</span></div></div><aside class="li-side"><label>编辑模型<select data-li="model">'+arkPlanModels.map(m=>'<option value="'+esc(m.id)+'">火山套餐 · '+esc(m.label||m.name||m.id)+'</option>').join('')+'</select></label><p class="li-hint">点选可标记多处；框选/圈选可限定区域。画笔与箭头表达形状和方向，文字工具在画面中添加说明。标记不应出现在成品中。</p><div class="li-marks" aria-label="修改标记列表"></div><label>当前标记的修改要求<textarea data-li="mark-text" maxlength="1200" placeholder="例如：把此处改为蓝色，保留材质与光影"></textarea></label><label>整体要求<textarea data-li="general" maxlength="5000" placeholder="可描述整体风格、需要保留的内容…"></textarea></label><label class="li-check"><input data-li="protect" type="checkbox">保护选区外画面</label><label>边缘融合<select data-li="feather"><option value="0">无融合（硬边）</option><option value="3">轻柔 · 3 px</option><option value="6">自然 · 6 px</option><option value="12">柔和 · 12 px</option></select></label><p class="li-hint" data-li="scope">'+(options.layered?'确认后直接更新当前节点，保留原像素尺寸。原图层与草稿收纳为可恢复备份，再次进入仍可对比。':'确认后直接更新当前节点，保留原像素尺寸、位置和连接；原图保留，再次进入仍可对比。')+'</p><p class="li-hint">开启保护需要框选或圈选；只将选区内结果合成回原图。未开启时模型也可能调整其他细节。</p><button data-li="start" class="li-primary">生成修改预览</button><button data-li="check">检查已有任务 / 恢复预览</button><button data-li="reset">开始新一轮 / 放弃预览</button></aside></div><p class="li-status" role="status"></p><footer><span class="li-hint">对比时可拖动白色中轴；滚轮缩放，移动工具拖动画面。</span><button data-li="apply" class="li-primary">确认应用</button></footer></div>';
  document.body.append(dialog);dialog.showModal();const q=k=>dialog.querySelector('[data-li="'+k+'"]'),canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d'),picture=dialog.querySelector('.li-picture'),stage=dialog.querySelector('.li-stage'),divider=dialog.querySelector('.li-divider'),list=dialog.querySelector('.li-marks');
  const pending=()=>['submitting','queued','running','unknown'].includes(s.status),locked=()=>busy||pending()||!!s.rawResult||s.status==='applied';
  const message=(text,error=false)=>{dialog.querySelector('.li-status').textContent=text;dialog.querySelector('.li-status').classList.toggle('error',error);};
  const save=async durable=>{if(!closed)await options.onSession(clone(s),durable);};
  const capture=()=>JSON.stringify({marks:s.marks,general:s.general,model:s.model,protect:s.protect,feather:s.feather});
  const remember=()=>{undo.push(capture());if(undo.length>40)undo.shift();redo=[];};
  const selectedMark=()=>s.marks.find(m=>m.id===selected);
  function draw(){
    const scale=Math.min(1,zoom*(window.devicePixelRatio||1));canvas.width=Math.round(source.width*scale);canvas.height=Math.round(source.height*scale);
    const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.drawImage(source,0,0,w,h);
    if(result&&['compare','after'].includes(view)){ctx.save();if(view==='compare'){ctx.beginPath();ctx.rect(w*split,0,w*(1-split),h);ctx.clip();}ctx.drawImage(result,0,0,w,h);ctx.restore();}
    if(view==='edit')s.marks.forEach((m,i)=>drawMark(ctx,m,w,h,i+1,{selected:m.id===selected}));
    const dw=source.width*zoom,dh=source.height*zoom;canvas.style.width=dw+'px';canvas.style.height=dh+'px';picture.style.width=dw+'px';picture.style.height=dh+'px';divider.style.left=(split*100)+'%';divider.hidden=view!=='compare'||!result;divider.setAttribute('aria-valuenow',String(Math.round(split*100)));dialog.querySelectorAll('.li-compare-label').forEach(el=>el.hidden=divider.hidden);
  }
  function controls(){
    q('model').value=s.model;q('general').value=s.general;q('protect').checked=!!s.protect;q('feather').value=String(s.feather);q('view').value=view;
    for(const key of ['model','general','protect','feather','mark-text'])q(key).disabled=locked();
    q('start').disabled=locked();q('check').hidden=!s.jobId||s.status==='applied'||!!s.result;q('check').disabled=busy;q('reset').disabled=busy||pending();
    q('apply').disabled=busy||!s.result||localEditAlreadyApplied(s,options.currentSource());q('apply').textContent=localEditAlreadyApplied(s,options.currentSource())?'已确认应用':'确认应用';
    q('undo').disabled=locked()||!undo.length;q('redo').disabled=locked()||!redo.length;
    dialog.querySelectorAll('[data-tool]').forEach(el=>{el.disabled=locked()&&el.dataset.tool!=='move';el.classList.toggle('active',tool===el.dataset.tool);});
    list.innerHTML=s.marks.map((m,i)=>'<div class="li-mark '+(m.id===selected?'selected':'')+'" data-mark="'+esc(m.id)+'"><input type="checkbox" aria-label="启用标记 '+(i+1)+'" '+(m.enabled?'checked':'')+(locked()?' disabled':'')+'><button data-select="'+esc(m.id)+'">'+(i+1)+' · '+names[m.kind]+' '+esc(m.text||'待填写要求')+'</button><button data-delete="'+esc(m.id)+'" aria-label="删除标记 '+(i+1)+'" '+(locked()?'disabled':'')+'>×</button></div>').join('');
    const mark=selectedMark();q('mark-text').value=mark?.text||'';q('mark-text').disabled=locked()||!mark;draw();
  }
  function changed(){void save(false).catch(e=>message(e.message,true));controls();}
  function fit(){zoom=Math.max(.05,Math.min(1,(stage.clientWidth-56)/source.width,(stage.clientHeight-56)/source.height));q('zoom').value=String(Math.round(zoom*100));draw();}
  const point=e=>{const b=canvas.getBoundingClientRect();return normalizedPoint(e.clientX-b.left,e.clientY-b.top,b.width,b.height);};
  const hit=p=>[...s.marks].reverse().find(m=>{const b=markBounds(m),pad=12/(source.width*zoom);return p[0]>=b.x-pad&&p[0]<=b.right+pad&&p[1]>=b.y-pad&&p[1]<=b.bottom+pad;});
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);const p=point(e);
    if(tool==='move'||view!=='edit'){const m=view==='edit'&&!locked()?hit(p):null;if(m){remember();selected=m.id;drag={moving:m,from:p,points:clone(m.points)};}else drag={pan:true,x:e.clientX,y:e.clientY,left:stage.scrollLeft,top:stage.scrollTop};return;}if(locked())return;
    if(tool==='erase'){const px=p[0]*source.width,py=p[1]*source.height,tolerance=12/zoom;const m=[...s.marks].reverse().find(m=>['pen','arrow'].includes(m.kind)&&m.points.some((a,i)=>{const z=m.points[i+1]||a,ax=a[0]*source.width,ay=a[1]*source.height,dx=(z[0]-a[0])*source.width,dy=(z[1]-a[1])*source.height,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(px-ax-t*dx,py-ay-t*dy)<=tolerance;}));if(m){remember();s.marks=s.marks.filter(a=>a!==m);changed();}return;}
    if(s.marks.length>=MAX_MARKS||s.marks.reduce((n,m)=>n+m.points.length,0)>=12000){message('标记或笔迹过多，请分批修改',true);return;}remember();
    const m={id:crypto.randomUUID(),kind:tool,points:['rect','arrow'].includes(tool)?[p,p]:[p],text:'',enabled:true,color:q('color').value,width:.003};s.marks.push(m);selected=m.id;drag={mark:m};draw();
  });
  canvas.addEventListener('pointermove',e=>{if(!drag)return;if(drag.pan){stage.scrollLeft=drag.left-(e.clientX-drag.x);stage.scrollTop=drag.top-(e.clientY-drag.y);return;}const p=point(e);if(drag.moving){const b=markBounds({points:drag.points}),dx=Math.max(-b.x,Math.min(1-b.right,p[0]-drag.from[0])),dy=Math.max(-b.y,Math.min(1-b.bottom,p[1]-drag.from[1]));drag.moving.points=drag.points.map(([x,y])=>[x+dx,y+dy]);draw();return;}const m=drag.mark;if(['rect','arrow'].includes(m.kind))m.points[1]=p;else if(['pen','lasso'].includes(m.kind)&&m.points.length<4096&&s.marks.reduce((n,a)=>n+a.points.length,0)<16000){const last=m.points.at(-1);if(Math.hypot(p[0]-last[0],p[1]-last[1])*source.width>2)m.points.push(p);}draw();});
  const endDraw=()=>{if(!drag)return;if(drag.moving){drag=null;changed();return;}if(drag.mark){const m=drag.mark,b=markBounds(m);if((m.kind==='lasso'&&m.points.length<3)||(['rect','arrow'].includes(m.kind)&&Math.hypot(b.right-b.x,b.bottom-b.y)<.004))s.marks=s.marks.filter(a=>a!==m);drag=null;changed();if(selectedMark()&&['point','rect','text','lasso'].includes(m.kind))q('mark-text').focus();}else drag=null;};
  canvas.addEventListener('pointerup',endDraw);canvas.addEventListener('pointercancel',endDraw);
  dialog.querySelectorAll('[data-tool]').forEach(el=>el.onclick=()=>{tool=el.dataset.tool;if(tool!=='move')view='edit';controls();});
  list.addEventListener('click',e=>{const select=e.target.closest('[data-select]'),del=e.target.closest('[data-delete]');if(select){selected=select.dataset.select;controls();}if(del&&!locked()){remember();s.marks=s.marks.filter(m=>m.id!==del.dataset.delete);changed();}});
  list.addEventListener('change',e=>{if(e.target.type==='checkbox'&&!locked()){remember();s.marks.find(m=>m.id===e.target.closest('[data-mark]').dataset.mark).enabled=e.target.checked;changed();}});
  for(const [key,field] of [['mark-text','text'],['general','general']]){q(key).onfocus=()=>{if(!locked())remember();};q(key).oninput=()=>{if(locked())return;if(key==='mark-text'){const m=selectedMark();if(m)m.text=q(key).value;}else s[field]=q(key).value;void save(false).catch(e=>message(e.message,true));draw();};q(key).onchange=()=>controls();}
  for(const key of ['model','protect','feather'])q(key).onchange=()=>{if(locked())return;remember();s[key]=key==='protect'?q(key).checked:key==='feather'?Number(q(key).value):q(key).value;if(key==='protect'&&s.protect&&!s.marks.some(m=>m.enabled&&['rect','lasso'].includes(m.kind))){s.protect=false;message('先框选或圈选范围，再开启区域外保护',true);}changed();};
  function history(from,to){if(locked()||!from.length)return;to.push(capture());Object.assign(s,JSON.parse(from.pop()));changed();}
  q('undo').onclick=()=>history(undo,redo);q('redo').onclick=()=>history(redo,undo);q('fit').onclick=fit;q('zoom').oninput=()=>{zoom=Number(q('zoom').value)/100;draw();};
  q('view').onchange=()=>{view=q('view').value;if(['after','compare'].includes(view)&&!result){view='edit';message('生成修改预览后，即可查看前后对比');}controls();};
  stage.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.05,Math.min(3,zoom*(e.deltaY>0?.9:1.1)));q('zoom').value=String(zoom*100);draw();},{passive:false});
  let sliding=false;const slide=e=>{const b=canvas.getBoundingClientRect();split=Math.max(0,Math.min(1,(e.clientX-b.left)/b.width));draw();};
  divider.onpointerdown=e=>{e.preventDefault();e.stopPropagation();sliding=true;divider.setPointerCapture(e.pointerId);slide(e);};divider.onpointermove=e=>{if(sliding)slide(e);};divider.onpointerup=()=>sliding=false;divider.onpointercancel=()=>sliding=false;divider.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();split=e.key==='Home'?0:e.key==='End'?1:Math.max(0,Math.min(1,split+(e.key==='ArrowLeft'?-.02:.02)));draw();}};
  async function finalize(){
    if(!s.rawResult)return;const asset=await options.onPersist(await compositeLocalEdit(s.source,s.rawResult.url,s.marks,{protect:s.protect,feather:s.feather}));
    const next=clone(s);next.result=asset;next.status='preview';await options.onSession(next,true);s=next;result=await loadEditImage(asset.url);view='compare';message('预览已生成。拖动中轴检查细节，确认满意后再应用。');
  }
  function schedulePoll(){clearTimeout(pollTimer);if(!closed&&pending())pollTimer=setTimeout(()=>void check(),5000);}
  async function check(){
    if(busy||closed||!s.jobId)return;busy=true;controls();
    try{if(s.rawResult){await finalize();return;}const {job}=await json('/api/jobs/'+encodeURIComponent(s.jobId));if(closed)return;
      if(job.status==='succeeded'){if(!job.images?.[0]?.url)throw Error('任务成功但没有可读取的图片');s.rawResult=job.images[0];s.status='processing';await save(true);await finalize();}
      else if(['failed','canceled'].includes(job.status)){s.status='failed';await save(true);message((job.error||'生成未完成')+'；原图保留，点击“开始新一轮”后可手动再试。',true);}
      else{s.status=job.status;await save(true);message('修改任务处理中，可关闭此窗口；再次打开会检查同一任务。');}
    }catch(error){if(!s.rawResult&&pending())s.status='unknown';message(error.message+(error.status===404?'；任务编号未找到，请检查网关记录后再开始新一轮，避免重复提交。':''),true);if(error.status===404){s.status='missing';await save(true).catch(()=>{});}}
    finally{busy=false;if(!closed){controls();schedulePoll();}}
  }
  q('check').onclick=()=>void check();
  q('start').onclick=async()=>{
    if(locked())return;busy=true;controls();let submitted=false;
    try{const health=await json('/api/local-edit/status');if(health.protocol!==localEditProtocol)throw Error('服务版本需要更新，请重新启动画布服务');if(!health.ready)throw Error('请在设置中配置火山 Agent Plan 套餐密钥');
      if(s.protect&&!s.marks.some(m=>m.enabled&&['rect','lasso'].includes(m.kind)))throw Error('保护区域外画面需要框选或圈选');
      const references=await prepareLocalReferences(s.source,s.marks),prompt=buildLocalEditPrompt(s.marks,s.general,references.length===2);
      s.requestId=crypto.randomUUID();s.jobId='job-le-'+s.requestId;s.status='submitting';await save(true);submitted=true;message('正在提交修改请求，请稍候…');
      const {job}=await json('/api/local-edit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:'ark-plan',model:s.model,prompt,references,size:editSize(s.width,s.height),requestId:s.requestId})});
      s.jobId=job.id;s.status=job.status;await save(true);message('修改任务处理中，可关闭此窗口；再次打开会检查同一任务。');
    }catch(error){s.status=submitted&&(!error.status||error.status>=500)?'unknown':'draft';if(s.status==='draft'){delete s.jobId;delete s.requestId;}try{await save(true);}catch{}message(error.message+(s.status==='unknown'?'；不自动重发，请检查已有任务。':''),true);}
    finally{busy=false;controls();if(submitted&&pending())void check();}
  };
  q('reset').onclick=async()=>{if(busy||pending())return;if((s.rawResult||s.marks.length)&&!confirm('开始新一轮会清除当前标记和未应用预览，原图和已应用历史保留。继续？'))return;busy=true;try{const nextSource=options.currentSource();source=await loadEditImage(nextSource);s.source=nextSource;s.width=source.width;s.height=source.height;for(const key of ['result','rawResult','requestId','jobId'])delete s[key];s.status='draft';s.marks=[];s.general='';s.protect=false;selected='';result=null;view='edit';undo=[];redo=[];await save(true);fit();message('新一轮修改已准备好');}catch(e){message(e.message,true);}finally{busy=false;controls();}};
  async function commit(){if(busy||!s.result||localEditAlreadyApplied(s,options.currentSource()))return;busy=true;controls();try{s=await options.onCommit({session:clone(s),asset:s.result});message('已确认应用到当前节点，原像素尺寸保持不变；再次进入可继续查看前后对比。');}catch(e){message(e.message,true);}finally{busy=false;controls();}}
  q('apply').onclick=()=>void commit();
  async function close(){if(busy){message('正在保存或提交，请稍候再关闭');return;}try{await save(true);}catch(e){message(e.message,true);return;}closed=true;clearTimeout(pollTimer);dialog.close();dialog.remove();options.onClose?.();}
  q('close').onclick=()=>void close();dialog.addEventListener('cancel',e=>{e.preventDefault();void close();});
  dialog.addEventListener('keydown',e=>{e.stopPropagation();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.matches('input,textarea')){e.preventDefault();history(e.shiftKey?redo:undo,e.shiftKey?undo:redo);}});for(const name of ['paste','pointerdown','wheel'])dialog.addEventListener(name,e=>e.stopPropagation());
  if(s.result){try{result=await loadEditImage(s.result.url);}catch(e){message(e.message,true);}}
  controls();requestAnimationFrame(fit);if(pending())void check();else if(s.rawResult&&!s.result)message('已有返回图片，点击“恢复预览”继续处理，无需重新生成。');else message(s.status==='applied'?'已应用的修改记录。可查看对比，或开始新一轮。':s.result?'已恢复修改预览，拖动中轴检查，满意后再应用。':'先在图片上标记需要修改的位置，再填写要求。');
}
