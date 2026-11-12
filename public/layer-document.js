import { arkPlanModels } from './seedream-ark.js';

export const layerProtocol = 'seedream-layer-document-v1';
export const MAX_LAYERS = 64;
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export function buildLayerPayload(body) {
  if (body.provider !== 'ark-plan' || !arkPlanModels.some(m => m.id === body.model)) throw new Error('请选择火山套餐 Flash 或 Pro 拆层模型');
  if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(body.image || '')) throw new Error('拆层需要一张 PNG 或 JPG 图片');
  if (body.image.split(',')[1].length * 3 / 4 > 30 * 1024 * 1024) throw new Error('拆层图片不能超过 30 MB');
  return { model: body.model, image: body.image, prompt: String(body.prompt || '').slice(0,12000), layer_decomposition: true, size: 'auto', output_format: 'png', response_format: 'url', stream: false, watermark: false };
}
export function layerRect(item, width, height) {
  if (item.z_index === 0) return { x: 0, y: 0, width, height };
  const box = item.bounding_box;
  let a = box?.absolute;
  if (!Array.isArray(a) && Array.isArray(box?.normalized)) a = box.normalized.map((v,i) => Number(v) * (i % 2 ? height : width) / 1000);
  if (!Array.isArray(a) || a.length !== 4 || !a.every(Number.isFinite) || a[2] <= a[0] || a[3] <= a[1] || a.some(v=>Math.abs(v)>4*Math.max(width,height))) throw new Error('图层坐标缺失或无效，无法可靠还原布局');
  return { x:a[0], y:a[1], width:a[2]-a[0], height:a[3]-a[1] };
}
export function createLayerDocument(items, source = '', name = '分层作品') {
  if (!Array.isArray(items) || items.length<2 || items.length>17) throw new Error('拆层结果需要一张底图和 1–16 个图层');
  const sorted = [...items].sort((a,b)=>a.z_index-b.z_index);
  if (sorted[0].z_index!==0 || new Set(sorted.map(x=>x.z_index)).size!==sorted.length || sorted.some(x=>!Number.isInteger(x.z_index)||x.z_index<0)) throw new Error('图层叠放顺序无效');
  const {width,height}=sorted[0];
  if (!(width>0 && height>0 && width*height<=36_000_000 && width<=16000 && height<=16000)) throw new Error('拆层底图尺寸无效');
  const layers=sorted.map((item,i)=>({id:'layer-'+i,src:item.url,name:String(item.name|| (i?'图层 '+i:'背景')).slice(0,160),...layerRect(item,width,height),rotation:0,opacity:1,visible:true,locked:i===0,flipX:false,flipY:false}));
  return {version:1,name,width,height,originalSrc:source,layers,initialLayers:structuredClone(layers)};
}
export function normalizeLayerDocument(doc) {
  if (!doc || ![1,2].includes(doc.version) || !Array.isArray(doc.layers) || doc.layers.length>MAX_LAYERS) throw new Error('分层作品格式不支持');
  const width=Math.round(finite(doc.width,0)),height=Math.round(finite(doc.height,0));
  if(width<1||height<1||width>16000||height>16000||width*height>36_000_000)throw new Error('分层作品尺寸超出支持范围');
  let count=0;
  const normalize=(layer,i,depth=0)=>{
    if(!layer||++count>MAX_LAYERS*3||depth>12)throw new Error('图层数量或嵌套深度超出支持范围');
    if(layer.type==='group'){
      if(!Array.isArray(layer.children))throw new Error('图层组内容无效');
      return {id:String(layer.id||'group-'+i),type:'group',name:String(layer.name||'图层组').slice(0,160),visible:layer.visible!==false,locked:!!layer.locked,opacity:Math.max(0,Math.min(1,finite(layer.opacity,1))),collapsed:!!layer.collapsed,children:layer.children.map((l,j)=>normalize(l,j,depth+1)),...(layer.backup?{backup:normalize(layer.backup,0,depth+1)}:{})};
    }
    const src=String(layer.src||'');
    if(!/^(\/api\/(generated|assets)\/[^/?#]+|\/assets\/[^?#]+|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*)$/.test(src))throw new Error('图层素材必须保存在本机');
    return {id:String(layer.id||'layer-'+i),src,name:String(layer.name||'图层').slice(0,160),x:Math.max(-32000,Math.min(32000,finite(layer.x,0))),y:Math.max(-32000,Math.min(32000,finite(layer.y,0))),width:Math.max(1,Math.min(16000,finite(layer.width,100))),height:Math.max(1,Math.min(16000,finite(layer.height,100))),rotation:finite(layer.rotation,0)%360,opacity:Math.max(0,Math.min(1,finite(layer.opacity,1))),visible:layer.visible!==false,locked:!!layer.locked,flipX:!!layer.flipX,flipY:!!layer.flipY};
  };
  const layers=doc.layers.map((l,i)=>normalize(l,i));
  const checkIds=entries=>{const ids=new Set();let leaves=0;const visit=items=>items.forEach(l=>{if(ids.has(l.id))throw new Error('图层编号重复');ids.add(l.id);if(l.type==='group')visit(l.children);else if(++leaves>MAX_LAYERS)throw new Error('最多保留 64 个图层');});visit(entries);};checkIds(layers);
  count=0;const initialLayers=(Array.isArray(doc.initialLayers)?doc.initialLayers:layers).map((l,i)=>normalize(l,i));checkIds(initialLayers);
  return {version:doc.version,name:String(doc.name||'分层作品').slice(0,160),width,height,originalSrc:String(doc.originalSrc||''),layers,initialLayers};
}
export function layerBounds(l) {
  const r=l.rotation*Math.PI/180,c=Math.abs(Math.cos(r)),s=Math.abs(Math.sin(r));
  const w=l.width*c+l.height*s,h=l.width*s+l.height*c;
  return {left:l.x+l.width/2-w/2,top:l.y+l.height/2-h/2,right:l.x+l.width/2+w/2,bottom:l.y+l.height/2+h/2};
}
export function drawLayer(ctx,image,l,opacity=true) {
  ctx.save();ctx.globalAlpha=opacity?l.opacity:1;ctx.translate(l.x+l.width/2,l.y+l.height/2);ctx.rotate(l.rotation*Math.PI/180);ctx.scale(l.flipX?-1:1,l.flipY?-1:1);ctx.drawImage(image,-l.width/2,-l.height/2,l.width,l.height);ctx.restore();
}
