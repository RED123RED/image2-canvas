async page=>page.evaluate(async()=>{
  const {compositeLocalEdit,editCanvas,loadEditImage}=await import('/local-edit-render.js');const checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  const c=editCanvas(240,200),x=c.getContext('2d',{willReadFrequently:true}),im=x.createImageData(240,200);for(let i=0;i<im.data.length;i+=4){im.data[i]=i%251;im.data[i+1]=(i*3)%255;im.data[i+2]=(i*7)%253;im.data[i+3]=255;}x.putImageData(im,0,0);const before=c.toDataURL();x.clearRect(0,0,240,200);const empty=c.toDataURL();x.fillStyle='#0066ff';x.fillRect(0,0,240,200);const after=c.toDataURL();
  const rect={id:'box',kind:'rect',points:[[.25,.25],[.75,.75]],enabled:true},read=async src=>{x.clearRect(0,0,240,200);x.drawImage(await loadEditImage(src),0,0);return x.getImageData(0,0,240,200).data;};
  const mixed=await read(await compositeLocalEdit(before,after,[rect],{protect:true,feather:6}));let changed=0;for(let y=0;y<200;y++)for(let px=0;px<240;px++){if(px>=59&&px<=181&&y>=49&&y<=151)continue;const i=(y*240+px)*4;if([0,1,2,3].some(k=>mixed[i+k]!==im.data[i+k]))changed++;}check(changed===0,'Complex RGB pattern preserves every protected outside pixel');
  const cleared=await read(await compositeLocalEdit(before,empty,[rect],{protect:true,feather:0}));check(cleared[(100*240+100)*4+3]===0&&cleared[3]===255,'Transparent replacement clears only selected region');
  const lasso={id:'circle',kind:'lasso',points:[[.1,.1],[.6,.1],[.1,.6]],enabled:true};const triangle=await read(await compositeLocalEdit(before,after,[lasso],{protect:true,feather:0}));check(triangle[(30*240+30)*4]===0&&triangle[(120*240+150)*4]===im.data[(120*240+150)*4],'Lasso mask follows polygon rather than bounding rectangle');
  return {checks};
})
