export const speechProtocol='canvas-runninghub-voice-v1';
export const voiceWorkflowId='2123214466497204226';
export const voiceEngine='runninghub-indextts2';
export const referenceMaxSeconds=12; // App limit matching the supplied workflow.
export function createSpeechNode(id,x,y){return {id,type:'speech',engine:voiceEngine,name:'声音克隆 · IndexTTS2',x,y,width:470,height:900,text:'',inputSources:{text:'auto'},voiceReference:null,emotionReference:null,emotionSource:'voice',emotionStrength:1,versions:[],currentVersionId:'',previewVersionId:'',src:'',requestId:'',status:'idle',historyHeight:270,createdAt:Date.now()};}
export function createAudioNode(id,x,y){return {id,type:'audio',name:'音频结果',x,y,width:440,height:350,versions:[],currentVersionId:'',previewVersionId:'',src:'',createdAt:Date.now()};}
export function extractCloneResult(id, source, recording, nodes) {
 const card = createAudioNode(id, source.x + source.width + 64, source.y);
 const saved = structuredClone(recording);
 saved.name ||= '结果 ' + (source.versions.findIndex(v => v.id === recording.id) + 1);
 Object.assign(card, {standaloneClone:true, name:saved.name, height:185, versions:[saved], currentVersionId:saved.id, previewVersionId:saved.id, src:saved.src});
 // Pick the next free space in the column to the right of the source.
 const column = nodes.filter(n => n.type !== 'frame' && n.x < card.x + card.width + 16 && n.x + n.width + 16 > card.x).sort((a,b) => a.y - b.y);
 for (const n of column) {
  if (card.y + card.height + 16 <= n.y) break;
  card.y = Math.max(card.y, n.y + n.height + 16);
 }
 return card;
}
export function isAudioSource(src){return typeof src==='string'&&new RegExp('^/api/(?:speech/files|voice-clone/files)/[A-Za-z0-9._-]+[.](?:wav|mp3)$').test(src);}
export function normalizeSpeechNode(node){
 const next={...(node.type==='audio'?createAudioNode(node.id,0,0):createSpeechNode(node.id,0,0)),...node};
 if(node.type==='speech'&&node.engine!==voiceEngine){next.engine='retired-volcengine';next.requestId='';next.retiredSpeechRequestId=node.speechRequestId||node.retiredSpeechRequestId||'';next.speechRequestId='';}
 next.width=Math.max(380,Number(next.width)||470);next.height=Math.max(node.type==='audio'?(next.standaloneClone?165:300):560,Number(next.height)||900);
 next.versions=(Array.isArray(node.versions)?node.versions:[]).filter(v=>v&&isAudioSource(v.src));
 next.currentVersionId=next.versions.some(v=>v.id===next.currentVersionId)?next.currentVersionId:(node.currentVersionId===undefined?next.versions[0]?.id||'':'');
 next.previewVersionId=next.versions.some(v=>v.id===next.previewVersionId)?next.previewVersionId:next.currentVersionId;next.src=next.versions.find(v=>v.id===next.currentVersionId)?.src||'';
 next.inputSources={text:'auto',...next.inputSources};next.historyHeight=Math.min(900,Math.max(160,Number(next.historyHeight)||270));return next;
}
export function validateCloneRequest(body){
 if(!body||!/^[a-f0-9-]{36}$/i.test(body.requestId||''))throw Error('无效请求编号');
 const text=String(body.text||'').trim();if(!text||text.length>2000)throw Error('请填写 1–2000 字配音正文（本工具限制）');
 const reference=(value,label)=>{
  if(!value||!new RegExp('^/api/audio-assets/[^/?#]+$').test(value.src||''))throw Error('请上传'+label);
  let filename;try{filename=decodeURIComponent(value.src.split('/').pop());}catch{throw Error('无效音频地址');}
  if(filename.includes('/')||filename.includes(String.fromCharCode(92))||filename.includes(String.fromCharCode(0))||filename==='.'||filename==='..')throw Error('无效音频地址');
  const start=Number(value.start),end=Number(value.end);if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end-start>referenceMaxSeconds)throw Error(label+'请选择有效的 0–12 秒片段（本工具限制）');
  return {src:value.src,name:String(value.name||filename).slice(0,160),start,end};
 };
 if(!['voice','reference'].includes(body.emotionSource))throw Error('请选择情感来源');
 const voiceReference=reference(body.voiceReference,'音色参考'),emotionReference=body.emotionSource==='reference'?reference(body.emotionReference,'情感参考'):voiceReference;
 const emotionStrength=Number(body.emotionStrength);if(!Number.isFinite(emotionStrength)||emotionStrength<0||emotionStrength>1)throw Error('情感强度须在 0–1 之间');
 return {requestId:body.requestId,text,voiceReference,emotionReference,emotionSource:body.emotionSource,emotionStrength};
}
export function workflowNodeInfo(body,voiceFile,emotionFile){
 const time=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
 return [['13','audio',voiceFile],['15','audio',emotionFile],['14','value',body.text],['37','start_time',time(body.voiceReference.start)],['37','end_time',time(body.voiceReference.end)],['38','start_time',time(body.emotionReference.start)],['38','end_time',time(body.emotionReference.end)],['12','emo_alpha',body.emotionStrength],['12','use_emo_text',false],['12','emo_text',''],['12','emo_vector',''],['39','filename_prefix','audio/voice-'+body.requestId]].map(([nodeId,fieldName,fieldValue])=>({nodeId,fieldName,fieldValue:String(fieldValue)}));
}
