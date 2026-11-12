import { normalizeLayerDocument, drawLayer, layerBounds, MAX_LAYERS } from './layer-document.js';

let current=null;
let preferredListHeight=null;
const clone=value=>structuredClone(value);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const layerEditorOpen=()=>!!current;
export async function renderLayerComposite(doc) {
  doc=normalizeLayerDocument(doc);
  const canvas=document.createElement('canvas');canvas.width=doc.width;canvas.height=doc.height;
  const ctx=canvas.getContext('2d');
  for(const layer of doc.layers)if(layer.visible){const image=await loadImage(layer.src);drawLayer(ctx,image,layer);}
  return canvas.toDataURL('image/png');
}
function loadImage(src) {return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('无法读取图层素材，请确认文件未被清理'));image.src=src;});}
function download(bytes,mime,name){const url=URL.createObjectURL(new Blob([bytes],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export function exportLayerDocument(doc,options={}) {
  return new Promise((resolve,reject)=>{
    const worker=new Worker('/vendor/layer-export-worker.js',{type:'module'});
    const timer=setTimeout(()=>{worker.terminate();reject(new Error('导出超时，请减小尺寸后重试'));},120000);
    worker.onmessage=({data})=>{clearTimeout(timer);worker.terminate();if(data.error)reject(new Error(data.error));else resolve(data);};
    worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(new Error('导出组件加载失败，请刷新画布后重试'));};
    worker.postMessage({doc,...options});
  });
}
export async function openLayerEditor(options) {
  if(current)return;
  let doc=options.doc?normalizeLayerDocument(clone(options.doc)):null;
  if(!document.querySelector('link[data-layer-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/layer-editor.css';link.dataset.layerStyle='true';document.head.append(link);}
  const dialog=document.createElement('dialog');dialog.id='layerEditor';dialog.className='layer-editor';
  dialog.innerHTML='<header class="le-header"><div><strong>分层图片编辑</strong><span class="le-name"></span></div><button type="button" data-action="close" aria-label="关闭分层编辑">关闭</button></header><div class="le-message" role="status"></div>'+
    '<section class="le-start"><div class="le-start-preview"><img alt="待拆分原图"></div><div class="le-start-fields"><h2>将一张图片拆成可编辑图层</h2><p>自动保留布局，所有图层收纳在一个节点内。原图保留。</p><label>拆层模型<select id="leModel"><option value="doubao-seedream-5-0-pro">火山套餐 · Seedream 5.0 Pro</option><option value="doubao-seedream-5.0-flash">火山套餐 · Seedream 5.0 Flash</option></select></label><label>拆分要求（可不填）<textarea id="lePrompt" rows="4" placeholder="例如：拆出产品、标题和装饰元素；留空则自动识别"></textarea></label><p class="le-muted">会消耗套餐额度。AI 拆层可能重绘文字、边缘或被遮挡区域。</p><button type="button" class="le-primary" data-action="start">开始拆层</button></div></section>'+
    '<section class="le-edit" hidden><nav class="le-toolbar"><button data-action="undo">撤销</button><button data-action="redo">重做</button><button data-action="fit">适应窗口</button><label>缩放 <input id="leZoom" type="range" min="10" max="250" value="100"></label><button data-action="compare">查看原图</button><button data-action="reset">恢复初始布局</button><button data-action="save" class="le-primary">保存到画布</button></nav>'+
    '<div class="le-main"><div class="le-stage" tabindex="0" aria-label="图层编辑画布"><div class="le-canvas-wrap"><canvas id="leCanvas"></canvas></div></div><aside class="le-sidebar"><div class="le-list-heading"><strong>图层 · 上方显示在前</strong><button data-action="add">添加图片</button></div><div class="le-list" role="listbox" aria-label="图层列表" aria-multiselectable="true"></div><div class="le-layer-actions"><button data-action="up" title="上移一层">上移</button><button data-action="down" title="下移一层">下移</button><button data-action="top">置顶</button><button data-action="bottom">置底</button><button data-action="duplicate">复制</button><button data-action="delete">删除</button><button data-action="replace">替换图片</button></div><div class="le-properties"></div><div class="le-export"><strong>导出当前编辑结果</strong><label>JPG / PNG 宽度 <input id="leExportWidth" type="number" min="1" max="16000"></label><label>JPG 品质 <input id="leQuality" type="number" min="10" max="100" value="95"></label><label>JPG 底色 <input id="leBackground" type="color" value="#ffffff"></label><div><button data-action="psd">导出 PSD</button><button data-action="jpg">导出 JPG</button><button data-action="png">导出 PNG</button></div><small>PSD 保留独立位图图层；AI 拆出的文字仍是图片。</small></div></aside></div><footer class="le-footer">单击选择 · Shift 多选 · 拖动移动 · 右下角缩放 · 上方圆点旋转 · 方向键微调 · Alt 或中键拖动画布</footer></section><input id="leFile" type="file" accept="image/png,image/jpeg,image/webp" hidden>';
  document.body.append(dialog);
  const $=s=>dialog.querySelector(s),$$=s=>[...dialog.querySelectorAll(s)];
  let selected=new Set(),undo=[],redo=[],busy=false,compare=false,zoom=1,drag=null,fileMode='add',dirty=!!options.hasDraft;
  const images=new Map(),alpha=new Map();
  const canvas=$('#leCanvas'),ctx=canvas.getContext('2d'),stage=$('.le-stage');
  const list=$('.le-list'),listSizer=document.createElement('div');
  listSizer.className='le-list-resizer';listSizer.tabIndex=0;
  listSizer.setAttribute('role','separator');listSizer.setAttribute('aria-orientation','horizontal');
  listSizer.setAttribute('aria-label','调整图层列表高度');listSizer.title='上下拖动调整图层列表高度；双击恢复默认';
  list.id='leLayerList';listSizer.setAttribute('aria-controls',list.id);list.after(listSizer);
  let listResize=null;
  const listHeightLimit=()=>Math.max(100,stage.clientHeight-80);
  function updateListHeight(height=preferredListHeight){
    if(height!==null){const value=Math.round(Math.max(100,Math.min(listHeightLimit(),height)));list.style.height=value+'px';list.style.maxHeight='none';}
    else {list.style.removeProperty('height');list.style.removeProperty('max-height');}
    listSizer.setAttribute('aria-valuemin','100');listSizer.setAttribute('aria-valuemax',String(listHeightLimit()));
    listSizer.setAttribute('aria-valuenow',String(Math.round(list.getBoundingClientRect().height)));
  }
  const resizeList=height=>{preferredListHeight=Math.round(Math.max(100,Math.min(listHeightLimit(),height)));updateListHeight();};
  listSizer.addEventListener('pointerdown',e=>{if(busy||e.button!==0)return;e.preventDefault();e.stopPropagation();listSizer.focus({preventScroll:true});listResize={id:e.pointerId,y:e.clientY,height:list.getBoundingClientRect().height};listSizer.setPointerCapture(e.pointerId);listSizer.classList.add('is-resizing');});
  listSizer.addEventListener('pointermove',e=>{if(listResize?.id===e.pointerId)resizeList(listResize.height+e.clientY-listResize.y);});
  const finishListResize=()=>{listResize=null;listSizer.classList.remove('is-resizing');};
  listSizer.addEventListener('pointerup',finishListResize);listSizer.addEventListener('pointercancel',finishListResize);listSizer.addEventListener('lostpointercapture',finishListResize);
  listSizer.addEventListener('dblclick',()=>{if(!busy){preferredListHeight=null;updateListHeight();}});
  listSizer.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(busy)return;const step=e.shiftKey?60:24;resizeList(e.key==='Home'?100:e.key==='End'?listHeightLimit():list.getBoundingClientRect().height+(e.key==='ArrowUp'?-step:step));});
  current={dialog};$('.le-name').textContent=options.name||'图片';$('.le-start-preview img').src=options.source||'';
  const message=(text,error=false)=>{const el=$('.le-message');el.textContent=text;el.classList.toggle('is-error',error);};
  const setBusy=value=>{busy=value;dialog.classList.toggle('is-busy',value);$$('button, input, select, textarea').forEach(e=>e.disabled=value);};
  const saveDraft=()=>{dirty=true;options.onDraft?.(clone(doc));};
  const remember=()=>{undo.push(clone(doc));if(undo.length>40)undo.shift();redo=[];};
  const picked=()=>doc.layers.filter(l=>selected.has(l.id));
  const editable=()=>picked().filter(l=>!l.locked);
  const act=fn=>{if(busy||!doc)return;remember();fn();saveDraft();render();};
  async function ensureImages(){for(const l of doc.layers)if(!images.has(l.src)){const image=await loadImage(l.src);images.set(l.src,image);const c=document.createElement('canvas');c.width=Math.min(image.width,256);c.height=Math.max(1,Math.round(image.height*c.width/image.width));const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0,c.width,c.height);alpha.set(l.src,{width:c.width,height:c.height,data:x.getImageData(0,0,c.width,c.height).data});}}
  function fit(){zoom=Math.min(1,(stage.clientWidth-64)/doc.width,(stage.clientHeight-64)/doc.height);$('#leZoom').value=Math.round(zoom*100);draw();}
  function draw(){
    if(!doc)return;const scale=Math.min(1,1800/Math.max(doc.width,doc.height));canvas.width=Math.round(doc.width*scale);canvas.height=Math.round(doc.height*scale);canvas.style.width=doc.width*zoom+'px';canvas.style.height=doc.height*zoom+'px';ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,doc.width,doc.height);
    if(compare&&images.has(doc.originalSrc)){ctx.drawImage(images.get(doc.originalSrc),0,0,doc.width,doc.height);return;}
    for(const l of doc.layers)if(l.visible&&images.has(l.src))drawLayer(ctx,images.get(l.src),l);
    for(const l of picked())if(l.visible){const b=layerBounds(l);ctx.strokeStyle=l.locked?'#eead61':'#51dcb7';ctx.lineWidth=2/zoom;ctx.setLineDash([5/zoom,3/zoom]);ctx.strokeRect(b.left,b.top,b.right-b.left,b.bottom-b.top);ctx.setLineDash([]);if(!l.locked&&selected.size===1){const size=9/zoom;ctx.fillStyle='#51dcb7';ctx.fillRect(b.right-size/2,b.bottom-size/2,size,size);ctx.beginPath();ctx.arc((b.left+b.right)/2,b.top-18/zoom,5/zoom,0,Math.PI*2);ctx.fill();}}
  }
  function properties(){const ls=picked(),l=ls[0],el=$('.le-properties');
    if(!l){el.innerHTML='<p>在画面或图层列表中选择元素</p>';return;}
    if(ls.length>1){el.innerHTML='<p>已选 '+ls.length+' 层（锁定层不会移动）</p><div><button data-align="left">左对齐</button><button data-align="center">水平居中</button><button data-align="top">顶部对齐</button></div>';return;}
    const fields=[['x','X 位置',l.x],['y','Y 位置',l.y],['width','宽度',l.width],['height','高度',l.height],['rotation','旋转 °',l.rotation],['opacity','不透明度 %',l.opacity*100]];
    el.innerHTML='<label>名称<input data-property="name" value="'+escape(l.name)+'"></label><div class="le-fields">'+fields.map(([id,label,value])=>'<label>'+label+'<input type="number" data-property="'+id+'" value="'+Math.round(value*100)/100+'"'+(l.locked?' disabled':'')+'></label>').join('')+'</div><label class="le-check"><input id="leRatio" type="checkbox" checked>调整宽高时保持比例</label><div><button data-action="flipX"'+(l.locked?' disabled':'')+'>水平翻转</button><button data-action="flipY"'+(l.locked?' disabled':'')+'>垂直翻转</button></div>';
  }
  function render(){if(!doc)return;$('.le-list').innerHTML=[...doc.layers].reverse().map(l=>'<div class="le-row'+(selected.has(l.id)?' is-selected':'')+'" role="option" aria-selected="'+selected.has(l.id)+'" data-layer-id="'+escape(l.id)+'" draggable="'+!l.locked+'"><img src="'+escape(l.src)+'" alt=""><span>'+escape(l.name)+'</span><button data-layer-toggle="visible" title="'+(l.visible?'隐藏':'显示')+'">'+(l.visible?'显示':'隐藏')+'</button><button data-layer-toggle="locked" title="'+(l.locked?'解锁':'锁定')+'">'+(l.locked?'锁定':'未锁')+'</button></div>').join('');properties();draw();$('[data-action="undo"]').disabled=!undo.length;$('[data-action="redo"]').disabled=!redo.length;}
  const close=()=>{if(busy)return message('请等待当前操作完成');if(doc&&dirty)options.onDraft?.(clone(doc));dialog.close();dialog.remove();current=null;observer.disconnect();};
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('wheel',e=>e.stopPropagation());dialog.addEventListener('paste',e=>e.stopPropagation());
  dialog.addEventListener('click',async e=>{
    const row=e.target.closest('[data-layer-id]'),toggle=e.target.closest('[data-layer-toggle]');
    if(row&&doc&&!busy){const l=doc.layers.find(x=>x.id===row.dataset.layerId);if(toggle){act(()=>l[toggle.dataset.layerToggle]=!l[toggle.dataset.layerToggle]);return;}if(e.shiftKey){selected.has(l.id)?selected.delete(l.id):selected.add(l.id);}else selected=new Set([l.id]);render();return;}
    const align=e.target.closest('[data-align]');if(align&&doc){const ls=editable();if(ls.length>1)act(()=>{const x=Math.min(...ls.map(l=>l.x)),right=Math.max(...ls.map(l=>l.x+l.width)),y=Math.min(...ls.map(l=>l.y));ls.forEach(l=>{if(align.dataset.align==='top')l.y=y;else l.x=align.dataset.align==='left'?x:(x+right-l.width)/2;});});return;}
    const action=e.target.closest('[data-action]')?.dataset.action;if(!action||busy)return;
    try{
      if(action==='close')return close();
      if(action==='start'){setBusy(true);message('正在创建拆层任务…');await options.onStart({model:$('#leModel').value,prompt:$('#lePrompt').value.trim()});setBusy(false);return close();}
      if(!doc)return;
      if(action==='fit')return fit();
      if(action==='compare'){if(!doc.originalSrc)return message('没有原图');if(!images.has(doc.originalSrc))images.set(doc.originalSrc,await loadImage(doc.originalSrc));compare=!compare;$('[data-action="compare"]').textContent=compare?'返回编辑':'查看原图';draw();return;}
      if(action==='undo'||action==='redo'){const from=action==='undo'?undo:redo,to=action==='undo'?redo:undo;if(from.length){to.push(clone(doc));doc=from.pop();selected=new Set([...selected].filter(id=>doc.layers.some(l=>l.id===id)));saveDraft();await ensureImages();render();}return;}
      if(action==='save'){setBusy(true);message('正在保存图层与合成图片…');await options.onSave(clone(doc));dirty=false;message('已保存到画布；各图层仍可继续编辑');return;}
      if(['psd','jpg','png'].includes(action)){setBusy(true);message('正在导出 '+action.toUpperCase()+'…');const out=await exportLayerDocument(doc,{format:action,width:Number($('#leExportWidth').value),quality:Number($('#leQuality').value)/100,background:$('#leBackground').value});download(out.bytes,out.mime,(options.name||doc.name).replace(/[\\/:*?"<>|]/g,'-')+'.'+action);message('已导出 '+action.toUpperCase()+(action==='psd'?'；各图层为可独立调整的位图':''));return;}
      if(action==='add'||action==='replace'){if(action==='replace'&&(editable().length!==1||selected.size!==1))return message('请选择一个未锁定的图层');if(action==='add'&&doc.layers.length>=MAX_LAYERS)return message('最多保留 '+MAX_LAYERS+' 个图层');fileMode=action;$('#leFile').value='';$('#leFile').click();return;}
      if(action==='reset'){if(confirm('恢复刚拆分后的布局和图层？当前调整可撤销。'))act(()=>{doc.layers=clone(doc.initialLayers);selected.clear();});return;}
      const ls=editable();if(!ls.length)return message('请先选择未锁定的图层');
      act(()=>{
        const ids=new Set(ls.map(l=>l.id));
        if(action==='delete'){doc.layers=doc.layers.filter(l=>!ids.has(l.id));selected.clear();}
        if(action==='duplicate'){if(doc.layers.length+ls.length>MAX_LAYERS)throw new Error('最多保留 '+MAX_LAYERS+' 个图层');const copies=ls.map(l=>({...l,id:crypto.randomUUID(),name:l.name+' 副本',x:l.x+20,y:l.y+20}));doc.layers.push(...copies);selected=new Set(copies.map(l=>l.id));}
        if(action==='flipX'||action==='flipY')ls.forEach(l=>l[action]=!l[action]);
        if(action==='top'||action==='bottom'){const rest=doc.layers.filter(l=>!ids.has(l.id));doc.layers=action==='top'?[...rest,...ls]:[...ls,...rest];}
        if(action==='up'){for(let i=doc.layers.length-2;i>=0;i--)if(ids.has(doc.layers[i].id)&&!ids.has(doc.layers[i+1].id))[doc.layers[i],doc.layers[i+1]]=[doc.layers[i+1],doc.layers[i]];}
        if(action==='down'){for(let i=1;i<doc.layers.length;i++)if(ids.has(doc.layers[i].id)&&!ids.has(doc.layers[i-1].id))[doc.layers[i],doc.layers[i-1]]=[doc.layers[i-1],doc.layers[i]];}
      });
    }catch(error){message(error.message||'操作失败',true);}finally{if(busy){setBusy(false);if(doc)render();}}
  });
  dialog.addEventListener('change',async e=>{
    const property=e.target.dataset.property;if(property&&doc&&!busy){const l=picked()[0];if(!l||(l.locked&&property!=='name'))return;const value=property==='name'?e.target.value.trim().slice(0,160):Number(e.target.value);if(property!=='name'&&!Number.isFinite(value))return;
      act(()=>{if(property==='name')l.name=value||'图层';else if(property==='opacity')l.opacity=Math.max(0,Math.min(1,value/100));else if(property==='width'||property==='height'){const v=Math.max(1,Math.min(16000,value));if($('#leRatio')?.checked){const other=property==='width'?'height':'width';l[other]*=v/l[property];}l[property]=v;}else l[property]=property==='rotation'?value%360:Math.max(-32000,Math.min(32000,value));});
    }
    if(e.target.id==='leFile'&&e.target.files[0]&&doc){setBusy(true);try{const stored=await options.onUpload(e.target.files[0]);const image=await loadImage(stored.url);images.set(stored.url,image);remember();if(fileMode==='replace'){const l=picked()[0];l.src=stored.url;}else{const scale=Math.min(1,doc.width/image.width,doc.height/image.height),l={id:crypto.randomUUID(),src:stored.url,name:e.target.files[0].name,x:(doc.width-image.width*scale)/2,y:(doc.height-image.height*scale)/2,width:image.width*scale,height:image.height*scale,rotation:0,opacity:1,visible:true,locked:false,flipX:false,flipY:false};doc.layers.push(l);selected=new Set([l.id]);}saveDraft();await ensureImages();message('图片已载入图层');}catch(error){message(error.message,true);}finally{setBusy(false);render();}}
  });
  $('#leZoom').addEventListener('input',e=>{zoom=Number(e.target.value)/100;draw();});
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*doc.width/r.width,y:(e.clientY-r.top)*doc.height/r.height};};
  const hit=(l,p)=>{const r=-l.rotation*Math.PI/180,dx=p.x-l.x-l.width/2,dy=p.y-l.y-l.height/2;let x=(dx*Math.cos(r)-dy*Math.sin(r))*(l.flipX?-1:1)+l.width/2,y=(dx*Math.sin(r)+dy*Math.cos(r))*(l.flipY?-1:1)+l.height/2;if(x<0||y<0||x>=l.width||y>=l.height)return false;const a=alpha.get(l.src);return !a||a.data[(Math.min(a.height-1,Math.floor(y/l.height*a.height))*a.width+Math.min(a.width-1,Math.floor(x/l.width*a.width)))*4+3]>12;};
  canvas.addEventListener('pointerdown',e=>{
    if(busy||!doc||compare||e.button!==0)return;stage.focus({preventScroll:true});const p=point(e);let kind='move',l=picked()[0];
    if(l&&selected.size===1&&!l.locked){const b=layerBounds(l);if(Math.hypot(p.x-b.right,p.y-b.bottom)<12/zoom)kind='scale';else if(Math.hypot(p.x-(b.left+b.right)/2,p.y-b.top+18/zoom)<12/zoom)kind='rotate';}
    if(kind==='move'){l=[...doc.layers].reverse().find(l=>l.visible&&!l.locked&&hit(l,p));if(!l){selected.clear();render();return;}if(e.shiftKey){selected.has(l.id)?selected.delete(l.id):selected.add(l.id);}else if(!selected.has(l.id))selected=new Set([l.id]);}
    if(!editable().length){render();return;}e.preventDefault();canvas.setPointerCapture(e.pointerId);drag={kind,p,before:clone(doc),layers:clone(editable()),moved:false};draw();
  });
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const p=point(e),dx=p.x-drag.p.x,dy=p.y-drag.p.y;drag.moved ||=Math.abs(dx)+Math.abs(dy)>.1;
    for(const original of drag.layers){const l=doc.layers.find(l=>l.id===original.id);if(drag.kind==='move'){l.x=original.x+dx;l.y=original.y+dy;}else if(drag.kind==='scale'){const factor=Math.max(.02,Math.min(16000/Math.max(original.width,original.height),1+(dx+dy)/(original.width+original.height)));l.width=original.width*factor;l.height=original.height*factor;}else{const cx=original.x+original.width/2,cy=original.y+original.height/2;l.rotation=original.rotation+(Math.atan2(p.y-cy,p.x-cx)-Math.atan2(drag.p.y-cy,drag.p.x-cx))*180/Math.PI;}}draw();});
  const endDrag=()=>{if(!drag)return;if(drag.moved){undo.push(drag.before);if(undo.length>40)undo.shift();redo=[];saveDraft();}drag=null;render();};
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);
  let pan=null;stage.addEventListener('pointerdown',e=>{if(e.button===1||e.altKey){e.preventDefault();e.stopPropagation();pan={x:e.clientX,y:e.clientY,left:stage.scrollLeft,top:stage.scrollTop};stage.setPointerCapture(e.pointerId);}},true);stage.addEventListener('pointermove',e=>{if(pan){stage.scrollLeft=pan.left-e.clientX+pan.x;stage.scrollTop=pan.top-e.clientY+pan.y;}});stage.addEventListener('pointerup',()=>pan=null);stage.addEventListener('pointercancel',()=>pan=null);
  let reorderId='';$('.le-list').addEventListener('dragstart',e=>{const row=e.target.closest('[data-layer-id]');if(!row||busy)return e.preventDefault();reorderId=row.dataset.layerId;e.dataTransfer.setData('text/plain',reorderId);});$('.le-list').addEventListener('dragover',e=>{if(reorderId)e.preventDefault();});$('.le-list').addEventListener('drop',e=>{e.preventDefault();const target=e.target.closest('[data-layer-id]')?.dataset.layerId;if(!target||target===reorderId)return;act(()=>{const from=doc.layers.findIndex(l=>l.id===reorderId),to=doc.layers.findIndex(l=>l.id===target);if(from>=0&&!doc.layers[from].locked)doc.layers.splice(to,0,doc.layers.splice(from,1)[0]);});reorderId='';});
  dialog.addEventListener('keydown',e=>{e.stopPropagation();if(busy)return;const input=e.target.closest('input,textarea,select');if(e.key==='Escape'){e.preventDefault();return close();}if(input)return;if((e.ctrlKey||e.metaKey)&&['z','y','s','a'].includes(e.key.toLowerCase())){e.preventDefault();const key=e.key.toLowerCase();if(key==='a'){selected=new Set(doc?.layers.filter(l=>!l.locked).map(l=>l.id));render();}else $('[data-action="'+(key==='s'?'save':key==='y'||e.shiftKey?'redo':'undo')+'"]').click();}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();$('[data-action="delete"]').click();}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const step=e.shiftKey?10:1;act(()=>editable().forEach(l=>{if(e.key==='ArrowLeft')l.x-=step;if(e.key==='ArrowRight')l.x+=step;if(e.key==='ArrowUp')l.y-=step;if(e.key==='ArrowDown')l.y+=step;}));}});
  const observer=new ResizeObserver(()=>{if(doc){updateListHeight();draw();}});observer.observe(stage);
  dialog.showModal();
  if(doc){$('.le-start').hidden=true;$('.le-edit').hidden=false;$('#leExportWidth').value=doc.width;message(options.hasDraft?'已恢复上次未提交的编辑草稿':'先检查自动还原效果，再自由调整图层');setBusy(true);try{await ensureImages();fit();render();}catch(error){message(error.message,true);}finally{setBusy(false);render();}}
}
