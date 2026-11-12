import {normalizeLayerDocument,layerBounds,drawLayer,MAX_LAYERS} from './layer-document.js';

export function treeEntries(entries,parents=[]){return !Array.isArray(entries)||parents.length>12?[]:entries.filter(entry=>entry&&typeof entry==='object').flatMap(entry=>[{entry,parents},...(entry.type==='group'?treeEntries(entry.children,[...parents,entry]):[])]);}
export const leafLayers=entries=>treeEntries(entries).filter(x=>x.entry.type!=='group').map(x=>x.entry);
export function allLayerSources(entries,depth=0){return !Array.isArray(entries)||depth>12?[]:entries.filter(Boolean).flatMap(l=>l.type==='group'?[...allLayerSources(l.children,depth+1),...(l.backup?allLayerSources([l.backup],depth+1):[])]:[l.src]).filter(Boolean);}
export function findLayer(entries,id){for(const entry of entries){if(entry.id===id)return {entry,siblings:entries};if(entry.type==='group'){const found=findLayer(entry.children,id);if(found)return found;}}return null;}
export const effectiveVisible=item=>item.entry.visible&&item.parents.every(p=>p.visible);
export const effectiveLocked=item=>item.entry.locked||item.parents.some(p=>p.locked);
export function entryBounds(entry){
  if(entry.type!=='group')return layerBounds(entry);
  const boxes=entry.children.map(entryBounds);if(!boxes.length)return entry.backup?entryBounds(entry.backup):{left:0,top:0,right:1,bottom:1};
  return {left:Math.min(...boxes.map(b=>b.left)),top:Math.min(...boxes.map(b=>b.top)),right:Math.max(...boxes.map(b=>b.right)),bottom:Math.max(...boxes.map(b=>b.bottom))};
}
export function moveEntry(entry,dx,dy){if(entry.type==='group'){entry.children.forEach(l=>moveEntry(l,dx,dy));if(entry.backup)moveEntry(entry.backup,dx,dy);}else{entry.x+=dx;entry.y+=dy;}}
export function cloneEntry(entry,makeId){const copy=structuredClone(entry);const visit=l=>{l.id=makeId();if(l.type==='group'){l.children.forEach(visit);if(l.backup)visit(l.backup);}};visit(copy);return copy;}
export function selectedRoots(entries,ids){return treeEntries(entries).filter(x=>ids.has(x.entry.id)&&!x.parents.some(p=>ids.has(p.id)));}
export function orderEntries(entries,ids,action){
  // Reorder only siblings: a child's stacking position remains inside its group.
  for(const l of entries)if(l.type==='group'&&!ids.has(l.id))orderEntries(l.children,ids,action);
  if(action==='top'||action==='bottom'){const selected=entries.filter(l=>ids.has(l.id)),rest=entries.filter(l=>!ids.has(l.id));entries.splice(0,entries.length,...(action==='top'?[...rest,...selected]:[...selected,...rest]));}
  if(action==='up')for(let i=entries.length-2;i>=0;i--)if(ids.has(entries[i].id)&&!ids.has(entries[i+1].id))[entries[i],entries[i+1]]=[entries[i+1],entries[i]];
  if(action==='down')for(let i=1;i<entries.length;i++)if(ids.has(entries[i].id)&&!ids.has(entries[i-1].id))[entries[i],entries[i-1]]=[entries[i-1],entries[i]];
}
export function removeEntries(entries,ids){return entries.filter(l=>!ids.has(l.id)).map(l=>l.type==='group'?{...l,children:removeEntries(l.children,ids)}:l);}
export function applyLayerRefinement(document,targetId,candidate,makeId=()=>crypto.randomUUID()){
  const doc=normalizeLayerDocument(document),result=normalizeLayerDocument(candidate),found=findLayer(doc.layers,targetId);
  if(!found||found.entry.type==='group')throw new Error('请选择一个现有图片图层再次拆分');
  if(result.layers.length<2||result.layers.some(l=>l.type==='group'||l.rotation||l.flipX||l.flipY))throw new Error('再次拆分结果格式无效');
  if(leafLayers(doc.layers).length-1+result.layers.length>MAX_LAYERS)throw new Error('应用后将超过 64 个图层，请先减少图层');
  const source=found.entry,r=source.rotation*Math.PI/180,cos=Math.cos(r),sin=Math.sin(r),fx=source.flipX?-1:1,fy=source.flipY?-1:1;
  const children=result.layers.map(l=>{
    const width=l.width/result.width*source.width,height=l.height/result.height*source.height;
    const dx=((l.x+l.width/2)/result.width-.5)*source.width*fx,dy=((l.y+l.height/2)/result.height-.5)*source.height*fy;
    return {...l,id:makeId(),x:source.x+source.width/2+dx*cos-dy*sin-width/2,y:source.y+source.height/2+dx*sin+dy*cos-height/2,width,height,rotation:source.rotation,flipX:source.flipX,flipY:source.flipY,locked:false};
  });
  const group={id:makeId(),type:'group',name:source.name+' · 再次拆分',visible:source.visible,locked:false,opacity:source.opacity,collapsed:false,children,backup:structuredClone(source)};
  found.siblings.splice(found.siblings.indexOf(source),1,group);doc.version=2;
  return {doc:normalizeLayerDocument(doc),groupId:group.id};
}
export function restoreLayerGroup(doc,id){const found=findLayer(doc.layers,id);if(!found?.entry.backup)throw new Error('这个图层组没有原图层备份');found.siblings.splice(found.siblings.indexOf(found.entry),1,structuredClone(found.entry.backup));}
export const layerFingerprint=layer=>JSON.stringify(layer);

// Isolate each group's opacity so overlapping children do not darken twice.
// Global pixel coordinates keep nested transforms and PSD offsets consistent.
export function drawLayerTree(ctx,entries,images,createCanvas,pixelScale=1){
  for(const l of entries){
    if(!l.visible)continue;
    if(l.type!=='group'){if(images.has(l.src))drawLayer(ctx,images.get(l.src),l);continue;}
    if(!l.children.length)continue;
    if(l.opacity===1){drawLayerTree(ctx,l.children,images,createCanvas,pixelScale);continue;}
    const b=entryBounds(l),left=Math.floor(b.left),top=Math.floor(b.top),width=Math.max(1,Math.ceil((b.right-left)*pixelScale)),height=Math.max(1,Math.ceil((b.bottom-top)*pixelScale));
    if(width*height>140_000_000||width>32000||height>32000)throw new Error('图层组范围过大，请缩小后导出');
    const buffer=createCanvas(width,height),c=buffer.getContext('2d');c.scale(pixelScale,pixelScale);c.translate(-left,-top);drawLayerTree(c,l.children,images,createCanvas,pixelScale);
    ctx.save();ctx.globalAlpha=l.opacity;ctx.drawImage(buffer,left,top,width/pixelScale,height/pixelScale);ctx.restore();buffer.width=1;buffer.height=1;
  }
}
