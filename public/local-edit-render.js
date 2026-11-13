import {normalizeMarks,markBounds} from './local-edit-document.js';
export const loadEditImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('无法读取图片，请确认原图仍在本机'));image.src=src;});
export function editCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
export function drawMark(ctx,mark,width,height,number,{selected=false,labels=true}={}){
  const points=mark.points.map(p=>[p[0]*width,p[1]*height]),b=markBounds(mark);ctx.save();ctx.strokeStyle=mark.color;ctx.fillStyle=mark.color;ctx.lineWidth=Math.max(1,mark.width*width);ctx.lineJoin='round';ctx.lineCap='round';ctx.globalAlpha=mark.enabled?1:.25;
  if(mark.kind==='rect'){ctx.strokeRect(b.x*width,b.y*height,(b.right-b.x)*width,(b.bottom-b.y)*height);}
  else if(['pen','lasso','arrow'].includes(mark.kind)){
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(mark.kind==='lasso')ctx.closePath();ctx.stroke();
    if(mark.kind==='arrow'){const [a,z]=points,angle=Math.atan2(z[1]-a[1],z[0]-a[0]),len=Math.max(12,width*.018);ctx.beginPath();ctx.moveTo(z[0]-len*Math.cos(angle-.5),z[1]-len*Math.sin(angle-.5));ctx.lineTo(...z);ctx.lineTo(z[0]-len*Math.cos(angle+.5),z[1]-len*Math.sin(angle+.5));ctx.stroke();}
  }
  if(labels){const [x,y]=points[0],radius=Math.max(10,width*.009);ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold '+Math.max(12,width*.011)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(number),x,y);
    if(mark.kind==='text'&&mark.text){ctx.textAlign='left';const text=mark.text.slice(0,50),font=Math.max(14,width*.013);ctx.font=font+'px sans-serif';const tx=Math.min(width-ctx.measureText(text).width-8,Math.max(2,x+radius+4)),ty=Math.min(height-font,Math.max(font,y));ctx.fillStyle='#17202b';ctx.fillRect(tx-3,ty-font*.7,ctx.measureText(text).width+6,font*1.4);ctx.fillStyle='#fff';ctx.fillText(text,tx,ty);}
  }
  if(selected){ctx.setLineDash([5,4]);ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.strokeRect(b.x*width-5,b.y*height-5,Math.max(10,(b.right-b.x)*width+10),Math.max(10,(b.bottom-b.y)*height+10));}ctx.restore();
}
export async function prepareLocalReferences(source,marks){
  const image=await loadEditImage(source),scale=Math.min(1,2048/Math.max(image.width,image.height)),w=Math.max(15,Math.round(image.width*scale)),h=Math.max(15,Math.round(image.height*scale));
  const c=editCanvas(w,h),ctx=c.getContext('2d');ctx.drawImage(image,0,0,w,h);const refs=[c.toDataURL('image/png')];
  const active=normalizeMarks(marks).filter(m=>m.enabled);
  if(active.some(m=>['pen','arrow','text','lasso'].includes(m.kind))){active.forEach((m,i)=>drawMark(ctx,m,w,h,i+1));refs.push(c.toDataURL('image/png'));}
  return refs;
}
export async function compositeLocalEdit(source,result,marks,{protect=false,feather=6}={}){
  const [before,after]=await Promise.all([loadEditImage(source),loadEditImage(result)]),w=before.width,h=before.height;
  if(Math.abs((after.width/after.height)/(w/h)-1)>.015)throw Error('模型返回画幅与原图不一致，请重新生成，原图及本次返回记录保留');
  const out=editCanvas(w,h),ctx=out.getContext('2d',{willReadFrequently:true});
  if(!protect){ctx.drawImage(after,0,0,w,h);return out.toDataURL('image/png');}
  const regions=normalizeMarks(marks).filter(m=>m.enabled&&['rect','lasso'].includes(m.kind));if(!regions.length)throw Error('保护区域外画面需要至少一个框选或圈选范围');
  const mask=editCanvas(w,h),m=mask.getContext('2d',{willReadFrequently:true});m.fillStyle='#fff';
  for(const r of regions){const b=markBounds(r);if(r.kind==='rect')m.fillRect(b.x*w,b.y*h,(b.right-b.x)*w,(b.bottom-b.y)*h);else{m.beginPath();r.points.forEach(([x,y],i)=>i?m.lineTo(x*w,y*h):m.moveTo(x*w,y*h));m.closePath();m.fill();}}
  const patch=editCanvas(w,h),p=patch.getContext('2d',{willReadFrequently:true});p.filter='blur('+Math.max(0,Math.min(32,Number(feather)||0))+'px)';p.drawImage(mask,0,0);p.filter='none';p.globalCompositeOperation='destination-in';p.drawImage(mask,0,0);m.clearRect(0,0,w,h);m.drawImage(patch,0,0);p.globalCompositeOperation='source-over';p.clearRect(0,0,w,h);p.drawImage(after,0,0,w,h);
  // Software readback and explicit premultiplied mixing avoid GPU rounding outside the mask.
  // Process strips so even large originals do not require three full-size pixel arrays.
  ctx.drawImage(before,0,0);
  for(let y=0;y<h;y+=128){const rows=Math.min(128,h-y),a=ctx.getImageData(0,y,w,rows),b=p.getImageData(0,y,w,rows).data,maskPixels=m.getImageData(0,y,w,rows).data;
    for(let i=0;i<a.data.length;i+=4){const mix=maskPixels[i+3]/255;if(!mix)continue;if(mix===1){for(let k=0;k<4;k++)a.data[i+k]=b[i+k];continue;}const aa=a.data[i+3]/255*(1-mix),ba=b[i+3]/255*mix,alpha=aa+ba;for(let k=0;k<3;k++)a.data[i+k]=alpha?Math.round((a.data[i+k]*aa+b[i+k]*ba)/alpha):0;a.data[i+3]=Math.round(alpha*255);}
    ctx.putImageData(a,0,y);
  }
  return out.toDataURL('image/png');
}
