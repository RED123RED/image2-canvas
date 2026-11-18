import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {speechProtocol,speechEndpoint,validateSpeechRequest,speechPayload,speechFingerprint} from './public/speech-document.js';
const sampleRate=24000,maxAudioBytes=160*1024*1024;
export function pcmToWav(pcm){const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(sampleRate,24);header.writeUInt32LE(sampleRate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);return Buffer.concat([header,pcm]);}
export async function parseSpeechResponse(response){
  if(!response.ok){const message=(await response.text()).slice(0,1000);throw Error('语音服务 HTTP '+response.status+'：'+message);}
  const chunks=[],cues=[];let bytes=0,buffer='',done=false,usage=null;const decoder=new TextDecoder();
  const consume=line=>{
    const trimmed=line.trim().replace(/^data:\s*/,'');if(!trimmed||trimmed==='[DONE]')return;
    let item;try{item=JSON.parse(trimmed);}catch{throw Error('语音服务返回了无法识别的数据');}
    if(item.code!==0&&item.code!==20000000)throw Error('语音服务：'+String(item.message||item.code).slice(0,400));
    if(item.code===20000000)done=true;
    if(item.data){if(typeof item.data!=='string'||!/^[A-Za-z0-9+/=\r\n]+$/.test(item.data))throw Error('无效音频数据');const chunk=Buffer.from(item.data,'base64');bytes+=chunk.length;if(bytes>maxAudioBytes)throw Error('音频超过本工具的安全长度');chunks.push(chunk);}
    const sentence=item.sentence;
    if(sentence?.words?.length){const words=sentence.words.filter(w=>Number.isFinite(w.startTime)&&Number.isFinite(w.endTime));if(words.length)cues.push({text:String(sentence.text||words.map(w=>w.word).join('')),start:words[0].startTime,end:words.at(-1).endTime});}
    if(item.usage)usage=item.usage;
  };
  for await(const part of response.body){buffer+=decoder.decode(part,{stream:true});if(buffer.length>40*1024*1024)throw Error('语音响应单包过大');let newline;while((newline=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,newline));buffer=buffer.slice(newline+1);}}
  buffer+=decoder.decode();if(buffer.trim())consume(buffer);
  const pcm=Buffer.concat(chunks);if(!pcm.length||pcm.length%2)throw Error('语音服务未返回完整音频');
  // Current HTTP endpoint ends with 20000000; never publish truncated streams.
  if(!done)throw Error('语音返回中断，未收到结束标记；保留原版本，请核对后再生成');
  const unique=[...new Map(cues.map(c=>[JSON.stringify(c),c])).values()];return {pcm,cues:unique,usage};
}
export async function createSpeechService({outputDir,resolveKey,readJson,sendJson,fetchImpl=fetch}){
  const dir=path.join(outputDir,'speech'),files=path.join(dir,'files'),jobsPath=path.join(dir,'jobs.json');
  const jobs=new Map();let saving=Promise.resolve(),queue=Promise.resolve(),ffmpeg='';
  const save=()=>{saving=saving.catch(()=>{}).then(async()=>{await fs.mkdir(files,{recursive:true});await fs.writeFile(jobsPath+'.tmp',JSON.stringify([...jobs.values()]));await fs.rename(jobsPath+'.tmp',jobsPath);});return saving;};
  try{const data=JSON.parse(await fs.readFile(jobsPath,'utf8'));if(!Array.isArray(data))throw Error('Invalid jobs');for(const job of data){if(['queued','running'].includes(job.status)){job.status='interrupted';job.error='服务曾中断，未自动重发；已完成段落保留，请检查后重新生成';}jobs.set(job.id,job);}}catch(error){if(error.code!=='ENOENT')throw Error('语音任务记录读取失败，请保留文件并检查：'+error.message);}
  for(const candidate of [process.env.FFMPEG_PATH,path.join(path.dirname(outputDir),'tools/ffmpeg/bin/ffmpeg.exe'),path.join(path.dirname(await fs.realpath(outputDir).catch(()=>outputDir)),'tools/ffmpeg/bin/ffmpeg.exe')].filter(Boolean)){try{await fs.access(candidate);ffmpeg=candidate;break;}catch{}}
  const safeJob=job=>{const {hash,...safe}=job;return safe;};
  const fileUrl=name=>'/api/speech/files/'+name;
  const run=async(job,key)=>{
    try{
      job.status='running';await save();const buffers=[],cues=[];let offset=0,total=0;
      for(const [index,segment] of job.request.segments.entries()){
        const fingerprint=speechFingerprint(segment);let pcm,part;
        if(segment.reuse){const old=jobs.get(segment.reuse.jobId);part=old?.parts?.find(p=>p.segmentId===segment.reuse.segmentId&&p.fingerprint===fingerprint);if(!part)throw Error('复用段落与当前正文/设置不一致，请重新生成该段');const content=await fs.readFile(path.join(files,path.basename(part.src)));if(content.toString('ascii',0,4)!=='RIFF'||content.length<44)throw Error('缓存音频已损坏');pcm=content.subarray(44);part={...part,segmentId:segment.id,reused:true};}
        else{
          const response=await fetchImpl(speechEndpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(210000),headers:{'Content-Type':'application/json','X-Api-Key':key,'X-Api-Resource-Id':'seed-tts-2.0','X-Api-Request-Id':randomUUID(),'X-Control-Require-Usage-Tokens-Return':'*'},body:JSON.stringify(speechPayload(segment))});
          const data=await parseSpeechResponse(response);pcm=data.pcm;const filename=job.id+'-'+index+'.wav';await fs.writeFile(path.join(files,filename),pcmToWav(pcm),{flag:'wx'});
          part={segmentId:segment.id,src:fileUrl(filename),duration:pcm.length/(sampleRate*2),cues:data.cues,usage:data.usage,fingerprint};
        }
        job.parts.push(part);job.completed=job.parts.length;await save();
        cues.push(...part.cues.map(c=>({...c,start:c.start+offset,end:c.end+offset})));buffers.push(pcm);offset+=part.duration;total+=pcm.length;
        if(index<job.request.segments.length-1&&segment.pauseMs){const silence=Buffer.alloc(Math.round(segment.pauseMs*sampleRate/1000)*2);buffers.push(silence);offset+=segment.pauseMs/1000;total+=silence.length;}
        if(total>maxAudioBytes)throw Error('合成作品过大，请拆成多个语音节点');
      }
      const basename=job.id+'-complete',wavName=basename+'.wav';await fs.writeFile(path.join(files,wavName),pcmToWav(Buffer.concat(buffers)),{flag:'wx'});
      let src=fileUrl(wavName);
      if(job.request.format==='mp3'){
        if(!ffmpeg)throw Error('MP3 导出需要本地 FFmpeg，请改选 WAV');
        await new Promise((resolve,reject)=>{const child=spawn(ffmpeg,['-nostdin','-y','-i',path.join(files,wavName),'-codec:a','libmp3lame','-b:a','160k',path.join(files,basename+'.mp3')],{windowsHide:true,stdio:'ignore'});const timer=setTimeout(()=>{child.kill();reject(Error('MP3 编码超时'));},60000);child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error('MP3 编码失败'));});});src=fileUrl(basename+'.mp3');
      }
      job.result={id:job.id,src,wavSrc:fileUrl(wavName),duration:offset,cues,parts:job.parts,segments:job.request.segments,format:job.request.format,createdAt:Date.now()};job.status='succeeded';
    }catch(error){job.status='failed';job.error=String(error.message||error).split(key).join('[已隐藏密钥]').slice(0,1000);}
    job.updatedAt=Date.now();await save();
  };
  return async function handle(req,res,url){
    try{
      if(req.method==='GET'&&url.pathname==='/api/speech/status')return sendJson(res,200,{protocol:speechProtocol,ready:Boolean(await resolveKey(req)),formats:ffmpeg?['wav','mp3']:['wav'],model:'seed-tts-2.0'});
      if(req.method==='POST'&&url.pathname==='/api/speech/jobs'){
        const body=validateSpeechRequest(await readJson(req,512*1024));const id='sp-'+body.requestId,hash=createHash('sha256').update(JSON.stringify(body)).digest('hex');
        const existing=jobs.get(id);if(existing){await saving;return sendJson(res,existing.hash===hash?200:409,existing.hash===hash?safeJob(existing):{error:'同一请求编号不能提交不同内容'});}
        if([...jobs.values()].filter(j=>['queued','running'].includes(j.status)).length>=8)return sendJson(res,429,{error:'语音队列已满，请等待已有任务完成'});
        if(body.format==='mp3'&&!ffmpeg)return sendJson(res,400,{error:'当前未检测到 MP3 编码工具，请选择 WAV'});
        const key=await resolveKey(req);if(!key)return sendJson(res,401,{error:'请先在设置中保存火山 Agent Plan 套餐密钥'});
        // Resolving a saved key yields: recheck identity before reserving the job.
        const raced=jobs.get(id);if(raced){await saving;return sendJson(res,raced.hash===hash?200:409,raced.hash===hash?safeJob(raced):{error:'同一请求编号不能提交不同内容'});}
        if([...jobs.values()].filter(j=>['queued','running'].includes(j.status)).length>=8)return sendJson(res,429,{error:'语音队列已满，请等待已有任务完成'});
        const job={id,hash,request:body,status:'queued',completed:0,parts:[],createdAt:Date.now()};jobs.set(id,job);
        try{await save();}catch(error){jobs.delete(id);throw error;}
        queue=queue.catch(()=>{}).then(()=>run(job,key)).catch(error=>console.error('Speech task save failure:',error.message));return sendJson(res,202,safeJob(job));
      }
      if(req.method==='GET'&&/^\/api\/speech\/jobs\/sp-[a-f0-9-]{36}$/i.test(url.pathname)){const job=jobs.get(path.basename(url.pathname));return sendJson(res,job?200:404,job?safeJob(job):{error:'未找到该语音任务；没有自动重发'});}
      if(['GET','HEAD'].includes(req.method)&&/^\/api\/speech\/files\/sp-[a-f0-9-]{36}-(\d+|complete)\.(wav|mp3)$/i.test(url.pathname)){
        const name=path.basename(url.pathname),bytes=await fs.readFile(path.join(files,name));const range=req.headers.range;let start=0,end=bytes.length-1,status=200;
        if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match)return res.writeHead(416).end();start=Number(match[1]);end=match[2]?Math.min(end,Number(match[2])):end;if(start>end)return res.writeHead(416,{'Content-Range':'bytes */'+bytes.length}).end();status=206;}
        res.writeHead(status,{'Content-Type':name.endsWith('.mp3')?'audio/mpeg':'audio/wav','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'private, max-age=31536000, immutable',...(status===206?{'Content-Range':`bytes ${start}-${end}/${bytes.length}`}:{})});res.end(req.method==='HEAD'?undefined:bytes.subarray(start,end+1));return;
      }
      return sendJson(res,404,{error:'语音接口不存在'});
    }catch(error){return sendJson(res,error.code==='ENOENT'?404:400,{error:String(error.message||error).slice(0,1000)});}
  };
}
