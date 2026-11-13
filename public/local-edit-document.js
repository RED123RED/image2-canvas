import {arkPlanModels} from './seedream-ark.js';

export const localEditProtocol='seedream-local-edit-v1';
export const MAX_MARKS=48;
export const markKinds=['point','rect','lasso','pen','arrow','text'];
const clamp=n=>Math.max(0,Math.min(1,n));
export function normalizedPoint(x,y,width,height){return [clamp(x/width),clamp(y/height)];}
export function markBounds(mark){const xs=mark.points.map(p=>p[0]),ys=mark.points.map(p=>p[1]);return {x:Math.min(...xs),y:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)};}
export function normalizeMarks(marks){
  if(!Array.isArray(marks)||marks.length>MAX_MARKS)throw Error('最多保留 '+MAX_MARKS+' 条标记，请分批修改');
  let points=0;const ids=new Set();
  return marks.map(m=>{
    if(!m||!markKinds.includes(m.kind)||!Array.isArray(m.points)||!m.points.length||m.points.length>4096||(points+=m.points.length)>16000)throw Error('标记格式无效或笔迹过长');
    const id=String(m.id||'');if(!id||ids.has(id))throw Error('标记编号无效');ids.add(id);
    if(m.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1)))throw Error('标记坐标必须位于图片内');
    if(['rect','arrow'].includes(m.kind)&&m.points.length!==2||m.kind==='lasso'&&m.points.length<3)throw Error('请完成区域或箭头标记');
    return {id,kind:m.kind,points:m.points.map(p=>[...p]),text:String(m.text||'').trim().slice(0,1200),enabled:m.enabled!==false,color:/^#[0-9a-f]{6}$/i.test(m.color)?m.color:'#ff5151',width:Math.max(.0005,Math.min(.03,Number(m.width)||.003))};
  });
}
export function editSize(width,height){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<15||height<15||width>16000||height>16000||width*height>36000000||width/height<1/16||width/height>16)throw Error('原图尺寸需大于14像素、总像素不超过3600万，宽高比1:16–16:1');
  const pixels=width*height,min=921600,max=4624220;
  let w=width,h=height;
  if(pixels<min){const scale=Math.sqrt(min/pixels);w=Math.ceil(width*scale);h=Math.ceil(height*scale);}
  if(pixels>max){const scale=Math.sqrt(max/pixels);w=Math.floor(width*scale);h=Math.floor(height*scale);}
  if(w/h>16)w=16*h;if(h/w>16)h=16*w;
  while(w*h<min){w++;h++;}
  return w+'x'+h;
}
export function buildLocalEditPrompt(marks,globalText='',hasGuide=false){
  const active=normalizeMarks(marks).filter(m=>m.enabled),general=String(globalText||'').trim();
  if(!active.length)throw Error('请先点选、框选或绘制需要修改的位置');
  if(!general&&!active.some(m=>m.text))throw Error('请填写修改要求');
  const coord=n=>Math.max(0,Math.min(999,Math.round(n*1000)));
  const lines=active.map((m,i)=>{const b=markBounds(m),location=['point','text'].includes(m.kind)?'<point>'+m.points[0].map(coord).join(' ')+'</point>':'<bbox>'+[b.x,b.y,b.right,b.bottom].map(coord).join(' ')+'</bbox>';return '要求'+(i+1)+'：图1 '+location+' '+(m.text||'按总要求和示意修改此处')+(m.kind==='arrow'?'；箭头表示方向或位置关系':'');});
  const prompt=['编辑图1，保持原画幅、主体身份、原有构图和未要求修改的内容。',hasGuide?'图2是图1的编辑示意；彩色线条、箭头、编号及说明仅为辅助标注，不是成品内容。结合各条要求理解手绘形状，最终移除辅助标注；要求新增的正式文字除外。':'按以下坐标定位对象。',general?'总要求：'+general:'',...lines].filter(Boolean).join('\n');
  if(prompt.length>12000)throw Error('修改说明过长，请缩短或分批编辑');return prompt;
}
export function buildLocalEditPayload(body){
  if(body.provider!=='ark-plan'||!arkPlanModels.some(m=>m.id===body.model))throw Error('局部修改仅使用火山套餐 Pro 或 Flash');
  const references=body.references;
  if(!Array.isArray(references)||references.length<1||references.length>2)throw Error('局部修改需要原图和可选的示意图');
  for(const src of references)if(typeof src!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src)||src.split(',')[1].length*3/4>30*1024*1024)throw Error('参考图应为不超过30MB的PNG/JPG/WebP');
  const size=String(body.size||''),match=/^(\d+)x(\d+)$/.exec(size);
  if(!match||Number(match[1])*Number(match[2])<921600||Number(match[1])*Number(match[2])>4624220||Number(match[1])/Number(match[2])<1/16||Number(match[1])/Number(match[2])>16)throw Error('局部修改输出尺寸无效');
  const prompt=String(body.prompt||'').trim();if(!prompt||prompt.length>12000)throw Error('局部修改提示词无效');
  return {model:body.model,prompt,image:references.length===1?references[0]:references,size,output_format:'png',response_format:'url',stream:false,watermark:false};
}
export function localEditSources(edit){return edit?[edit.source,edit.result?.url,edit.rawResult?.url,...(Array.isArray(edit.history)?edit.history:[]).flatMap(h=>[h?.before,h?.after])].filter(Boolean):[];}
