export const speechProtocol = 'canvas-speech-v2';
export const speechEndpoint = 'https://openspeech.bytedance.com/api/v3/plan/tts/unidirectional';
// Official 2.0 catalog, checked 2026-11-18. Account access is verified when generating.
// https://docs.volcengine.com/docs/doubao-voice/tone-list-3?lang=zh
export const speechVoices = [
  {id:'zh_female_vv_uranus_bigtts',name:'Vivi · 女声',tags:'中文 英文 多语言'},
  {id:'zh_female_gaolengyujie_uranus_bigtts',name:'高冷御姐 · 女声',tags:'中文 英文 多语言'},
  {id:'zh_male_m191_uranus_bigtts',name:'云舟 · 男声',tags:'中文 多语言 通用'},
  {id:'zh_male_taocheng_uranus_bigtts',name:'小天 · 男声',tags:'中文 多语言 通用'},
  {id:'zh_female_xiaohe_uranus_bigtts',name:'小何 · 女声',tags:'中文 多语言 通用'},
  {id:'zh_female_shuangkuaisisi_uranus_bigtts',name:'爽快思思 · 女声',tags:'中文 多语言 通用'},
  {id:'zh_male_guanggaojieshuo_uranus_bigtts',name:'广告解说 · 男声',tags:'中文 多语言 广告'},
  {id:'zh_male_ruyayichen_uranus_bigtts',name:'儒雅逸辰 · 男声',tags:'中文 多语言 视频配音'},
  {id:'zh_female_wenroumama_uranus_bigtts',name:'温柔妈妈 · 女声',tags:'中文 多语言 温柔'},
  {id:'zh_male_shaonianzixin_uranus_bigtts',name:'少年梓辛 · 男声',tags:'中文 多语言 少年'},
  {id:'en_male_tim_uranus_bigtts',name:'Tim · 美式男声',tags:'英语 男声'},
  {id:'en_female_dacey_uranus_bigtts',name:'Dacey · 美式女声',tags:'英语 女声'}
];
export const speechDefaults = {speaker:speechVoices[0].id,rate:0,volume:0,pitch:0,language:'',dialect:'',direction:'',pronunciation:'',subtitle:true};
export const speechDialects=[['','普通话 / 默认'],['beijing','北京话'],['dongbei','东北话'],['henan','河南话'],['shaanxi','陕西话'],['shanghai','上海话'],['sichuan','四川话'],['tianjin','天津话'],['yue','粤语']];
export const dialectSpeakers=new Set(['zh_female_vv_uranus_bigtts','zh_female_xiaohe_uranus_bigtts','zh_male_m191_uranus_bigtts','zh_male_taocheng_uranus_bigtts']);
export const speechLanguages = [['','自动'],['zh-cn','中文 / 中英混读'],['en','英语'],['ja','日语'],['ko','韩语'],['fr','法语'],['de','德语'],['es-mx','西班牙语（墨西哥）'],['pt-br','葡萄牙语（巴西）'],['it','意大利语'],['ru','俄语'],['th','泰语'],['vi','越南语'],['id','印度尼西亚语']];
export function speechCapabilities(speaker){
  const voice=speechVoices.find(v=>v.id===speaker),dialects=dialectSpeakers.has(speaker),english=String(speaker).startsWith('en_');
  return {dialects,english,known:!!voice,label:voice?.name||'自定义音色',hint:dialects?'支持普通话及粤语、上海、河南、北京、天津、四川、陕西、东北方言。':english?'英语音色：请选择自动或英语；不支持中文方言。':voice?'支持中文及多语言；官方未标注方言能力，方言选择不可用。':'自定义音色能力尚未核验，请按账户音色说明使用；暂不开放方言。'};
}
export function speechSettingsError(settings){try{normalizeSpeechSettings(settings);return '';}catch(error){return error.message;}}
export function safeSpeechFingerprint(segment){try{return speechFingerprint(segment);}catch{return null;}}
export function speechDirectionInstruction(direction){return direction?'请按照以下声音表演要求朗读正文，要求本身不要读出来：'+direction:'';}
export const speechDirectionExamples=[['忧郁 / 难过','请用明显忧郁、低落、难过的语气说话。声音轻而沉，节奏舒缓，句尾收低，带有失落感，不要带笑意或欢快上扬的语调。'],['平静自然','请用平静、自然的语气说话，像认真和朋友聊天，语调平稳，不夸张。'],['开心活泼','请用开心、轻快、有活力的语气说话，带着自然的笑意，表达亲切。']];
const bounded = (value,min,max,label) => { const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw Error(label+'超出允许范围');return Math.round(n); };
export function normalizeSpeechSettings(value={}) {
  const s={...speechDefaults,...value};
  if(!/^[a-zA-Z0-9_-]{3,120}$/.test(String(s.speaker)))throw Error('请选择有效的豆包 2.0 音色');
  if(!speechLanguages.some(([id])=>id===s.language))throw Error('朗读语言无效');
  if(!speechDialects.some(([id])=>id===s.dialect))throw Error('方言无效');
  if(s.dialect&&(!dialectSpeakers.has(s.speaker)||!['','zh-cn'].includes(s.language)))throw Error('方言请选 Vivi、小何、云舟或小天，并使用中文或自动语言');
  if(s.speaker.startsWith('en_')&&s.language&&!['en'].includes(s.language))throw Error('该英语音色请使用英语或自动语言');
  const direction=String(s.direction||'').trim();if(direction.length>1000)throw Error('表达要求最多 1000 字');
  const pronunciation=String(s.pronunciation||'').trim();const rules=pronunciation.split(/\r?\n/).filter(Boolean);
  const seen=new Set();if(rules.length>100)throw Error('本工具最多配置 100 条发音规则');
  for(const rule of rules){const i=rule.indexOf('/'),word=rule.slice(0,i);if(i<1||i===rule.length-1||word.length>9||/\s/.test(word)||seen.has(word))throw Error('发音规则格式：原词/正确读法；原词不超过 9 字且不可重复');seen.add(word);}
  return {speaker:String(s.speaker),rate:bounded(s.rate,-50,100,'语速'),volume:bounded(s.volume,-50,100,'音量'),pitch:bounded(s.pitch,-12,12,'音调'),language:s.language,dialect:s.dialect,direction,pronunciation:rules.join('\n'),subtitle:s.subtitle!==false};
}
export function speechPayload(segment) {
  const s=normalizeSpeechSettings(segment.settings);
  const additions={post_process:{pitch:s.pitch},disable_markdown_filter:true,disable_emoji_filter:true};
  if(s.direction)additions.context_texts=[speechDirectionInstruction(s.direction)];
  if(s.language)additions.explicit_language=s.language;else additions.enable_auto_language_recognition=true;
  if(s.dialect)additions.explicit_dialect=s.dialect;
  if(s.pronunciation)additions.pronunciation_dict={tone:s.pronunciation.split('\n')};
  return {req_params:{text:segment.text,speaker:s.speaker,audio_params:{format:'pcm',sample_rate:24000,speech_rate:s.rate,loudness_rate:s.volume,enable_subtitle:s.subtitle&&['','zh-cn','en'].includes(s.language)},additions:JSON.stringify(additions)}};
}
export function validateSpeechRequest(body) {
  if(!/^[a-f0-9-]{36}$/i.test(String(body.requestId)))throw Error('语音请求编号无效');
  if(!['wav','mp3'].includes(body.format))throw Error('音频格式只能为 WAV 或 MP3');
  if(!Array.isArray(body.segments)||!body.segments.length||body.segments.length>40)throw Error('每次需要 1–40 段配音');
  const seen=new Set();let length=0;
  const segments=body.segments.map(segment=>{
    const id=String(segment.id||'');if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||seen.has(id))throw Error('段落编号无效或重复');seen.add(id);
    const text=String(segment.text||'').trim();length+=text.length;
    if(!text||text.length>2000)throw Error('每段正文需要 1–2000 字，请将长文案分段');
    const reuse=segment.reuse?{jobId:String(segment.reuse.jobId||''),segmentId:String(segment.reuse.segmentId||'')}:null;
    if(reuse&&(!/^sp-[a-f0-9-]{36}$/i.test(reuse.jobId)||!/^\w[\w-]{0,99}$/.test(reuse.segmentId)))throw Error('复用音频记录无效');
    return {id,text,role:String(segment.role||'旁白').slice(0,60),pauseMs:bounded(segment.pauseMs??300,0,10000,'段后停顿'),settings:normalizeSpeechSettings(segment.settings),reuse};
  });
  if(length>12000)throw Error('单次作品最多 12000 字，请拆成多个节点');
  return {requestId:body.requestId,format:body.format,segments};
}
export function speechFingerprint(segment){const settings=normalizeSpeechSettings(segment.settings);return JSON.stringify({text:segment.text,settings,...(settings.direction?{directionInstructionVersion:2}:{})});}
export function createSpeechNode(id,x,y){return {id,type:'speech',name:'语音生成',x,y,width:400,height:615,text:'',direction:'',settings:{...speechDefaults},format:'wav',autoplay:false,status:'idle',speechRequestId:'',draft:null,segmentClips:{},presets:[],favorites:[],createdAt:Date.now()};}
export function createAudioNode(id,x,y){return {id,type:'audio',name:'音频结果',x,y,width:440,height:340,versions:[],currentVersionId:'',previewVersionId:'',src:'',createdAt:Date.now()};}
export function normalizeSpeechNode(node){
  const base=node.type==='speech'?createSpeechNode(node.id,0,0):createAudioNode(node.id,0,0);
  const next={...base,...node,width:Math.max(340,Number(node.width)||base.width),height:Math.max(node.type==='speech'?560:300,Number(node.height)||base.height)};
  if(node.type==='speech'){
    // Preserve invalid saved choices so the user can repair them; validate only before submission.
    next.settings={...speechDefaults,...node.settings};next.segmentClips=node.segmentClips||{};next.presets=Array.isArray(node.presets)?node.presets:[];next.favorites=Array.isArray(node.favorites)?node.favorites:[];
    next.inputSources={text:'auto',direction:'auto',...node.inputSources};
    if(node.draft){const rows=Array.isArray(node.draft.segments)?node.draft.segments.filter(Boolean):[];next.draft={...node.draft,segments:(rows.length?rows:[{id:'main',text:String(node.text||''),settings:next.settings}]).map((s,i)=>({...s,id:s.id||'restored-'+i,text:String(s.text||''),role:String(s.role||'旁白'),pauseMs:s.pauseMs??300,settings:{...speechDefaults,...s.settings},inputSources:{text:'local',direction:'local',...s.inputSources}}))};}
  }
  else {next.versions=(Array.isArray(node.versions)?node.versions:[]).filter(v=>v&&/^\/api\/speech\/files\/[\w.-]+\.(wav|mp3)$/.test(v.src));const current=next.versions.find(v=>v.id===next.currentVersionId)||next.versions[0];next.currentVersionId=current?.id||'';next.src=current?.src||'';}
  return next;
}
export function speechSrt(cues){const time=n=>{const ms=Math.max(0,Math.round(n*1000));return [Math.floor(ms/3600000),Math.floor(ms/60000)%60,Math.floor(ms/1000)%60].map(v=>String(v).padStart(2,'0')).join(':')+','+String(ms%1000).padStart(3,'0');};return cues.filter(c=>c.text&&c.end>c.start).map((c,i)=>String(i+1)+'\n'+time(c.start)+' --> '+time(c.end)+'\n'+c.text+'\n').join('\n');}
