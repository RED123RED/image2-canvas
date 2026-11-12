import { writePsdUint8Array, initializeCanvas } from 'ag-psd';
import { normalizeLayerDocument, drawLayer, layerBounds } from '../public/layer-document.js';
initializeCanvas((w,h)=>new OffscreenCanvas(w,h));
self.onmessage=async({data})=>{
  const images=new Map();
  try{
    const doc=normalizeLayerDocument(data.doc);
    let decodedPixels=0;
    for(const l of doc.layers)if(!images.has(l.src)){
      const response=await fetch(l.src);if(!response.ok)throw new Error('图层素材读取失败');
      const image=await createImageBitmap(await response.blob());images.set(l.src,image);
      decodedPixels+=image.width*image.height;if(decodedPixels>140_000_000)throw new Error('图层素材占用过大，请减少图层后导出');
    }
    const composite=new OffscreenCanvas(doc.width,doc.height),ctx=composite.getContext('2d');
    for(const l of doc.layers)if(l.visible)drawLayer(ctx,images.get(l.src),l);
    if(data.format==='psd'){
      const children=[];let pixels=0;
      for(const l of doc.layers){
        const b=layerBounds(l),left=Math.floor(b.left),top=Math.floor(b.top),w=Math.max(1,Math.ceil(b.right)-left),h=Math.max(1,Math.ceil(b.bottom)-top);
        pixels+=w*h;if(w>16000||h>16000||pixels>140_000_000)throw new Error('图层占用过大，请减小尺寸或分批导出');
        const canvas=new OffscreenCanvas(w,h),c=canvas.getContext('2d');c.translate(-left,-top);drawLayer(c,images.get(l.src),l,false);
        children.push({name:l.name,left,top,canvas,opacity:l.opacity,hidden:!l.visible,blendMode:'normal',protected:{position:l.locked,composite:l.locked,transparency:l.locked}});
      }
      const bytes=writePsdUint8Array({width:doc.width,height:doc.height,canvas:composite,children:children.reverse()},{noBackground:true,trimImageData:true});
      self.postMessage({bytes:bytes.buffer,mime:'image/vnd.adobe.photoshop'},[bytes.buffer]);
    }else{
      const width=Math.round(Number(data.width)||doc.width),height=Math.round(width*doc.height/doc.width);
      if(width<1||height<1||width>16000||height>16000||width*height>36_000_000)throw new Error('导出尺寸过大');
      const out=new OffscreenCanvas(width,height),c=out.getContext('2d');
      if(data.format==='jpg'){c.fillStyle=/^#[0-9a-f]{6}$/i.test(data.background)?data.background:'#ffffff';c.fillRect(0,0,width,height);}
      c.drawImage(composite,0,0,width,height);
      const blob=await out.convertToBlob({type:data.format==='jpg'?'image/jpeg':'image/png',quality:Math.max(.1,Math.min(1,Number(data.quality)||.95))});
      const bytes=await blob.arrayBuffer();self.postMessage({bytes,mime:blob.type},[bytes]);
    }
  }catch(e){self.postMessage({error:e.message||'导出失败'});}finally{for(const image of images.values())image.close();}
};
