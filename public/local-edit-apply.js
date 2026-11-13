import {normalizeLayerDocument} from './layer-document.js';

// The API returns a raster. Preserve the previous editable tree in a recoverable group.
export function applyLocalEditToLayers(document,url,width,height,makeId=()=>crypto.randomUUID()){
  const doc=normalizeLayerDocument(document);
  if(doc.width!==width||doc.height!==height)throw Error('修改结果与分层作品尺寸不一致，原图层已保留');
  const prior={id:makeId(),type:'group',name:'修改前图层（已保留）',visible:true,locked:false,opacity:1,collapsed:false,children:doc.layers};
  const image={id:makeId(),name:'局部修改结果',src:url,x:0,y:0,width,height,rotation:0,opacity:1,visible:true,locked:false};
  doc.version=2;doc.layers=[{id:makeId(),type:'group',name:'局部修改 · 已确认结果',visible:true,locked:false,opacity:1,collapsed:false,children:[image],backup:prior}];
  return normalizeLayerDocument(doc);
}

export function localEditAlreadyApplied(session,currentSource){
  return !!session?.result?.url&&session.status==='applied'&&(session.appliedToNode===true||currentSource===session.result.url);
}
