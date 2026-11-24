const byId = id => document.getElementById(id);
const library = byId('homeLibrary');
const view = byId('remakeView');
const source = byId('remakeSource');
const output = byId('remakeOutput');
const prompt = byId('remakePrompt');
const build = byId('remakeBuild');
const cancel = byId('remakeCancel');
const feedback = byId('remakeFeedback');
const images = [];
let sourceUrl = '', resultUrl = '', active = null;

byId('openRemake').onclick = () => {
  library.hidden = true;
  view.hidden = false;
  byId('homeView').scrollTop = 0;
  byId('remakeTitle').focus();
};
byId('remakeBack').onclick = () => {
  active?.abort();
  source.pause(); output.pause();
  view.hidden = true;
  library.hidden = false;
  byId('openRemake').focus();
};
function refreshControls() {
  build.disabled = !!active || !sourceUrl || source.readyState < 2 || !prompt.value.trim();
  cancel.hidden = !active;
}
function resetResult() {
  if (resultUrl) {
    output.pause(); output.removeAttribute('src'); output.load();
    URL.revokeObjectURL(resultUrl); resultUrl = '';
  }
  output.hidden = true;
  byId('remakeEmpty').hidden = false;
  byId('remakeDownload').hidden = true;
  byId('remakeDownload').removeAttribute('href');
  refreshControls();
  feedback.textContent = build.disabled ? '添加视频并填写提示词后即可预览。' : '素材已就绪，可以制作样片。';
}
function selectVideo(file) {
  if (file && !/\.(mp4|webm|mov)$/i.test(file.name) && !['video/mp4','video/webm','video/quicktime'].includes(file.type)) {
    feedback.textContent = '请选择 MP4、WebM 或 MOV 视频。'; return;
  }
  source.pause();
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  sourceUrl = file ? URL.createObjectURL(file) : '';
  if (file) source.src = sourceUrl; else source.removeAttribute('src');
  source.load();
  source.hidden = !file;
  view.querySelector('.remake-drop [data-pick="video"]').hidden = !!file;
  byId('remakeVideoMeta').hidden = !file;
  byId('remakeVideoMeta').querySelector('span').textContent = file?.name || '';
  resetResult();
}
source.onloadeddata = () => { refreshControls(); if (!build.disabled) feedback.textContent = '素材已就绪，可以制作样片。'; };
source.onerror = () => { refreshControls(); feedback.textContent = '这段视频无法解码，请替换为浏览器可播放的视频。'; };
function addImages(files) {
  let invalid = false;
  for (const file of files) {
    if (!/\.(jpe?g|png|webp)$/i.test(file.name) && !['image/jpeg','image/png','image/webp'].includes(file.type)) { invalid = true; continue; }
    const url = URL.createObjectURL(file);
    const img = new Image(); img.src = url; img.alt = file.name;
    const row = document.createElement('li');
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', '移除 ' + file.name);
    remove.onclick = () => { images.splice(images.indexOf(img),1); URL.revokeObjectURL(url); row.remove(); resetResult(); };
    row.append(img, remove); images.push(img); byId('remakeThumbs').append(row);
  }
  resetResult(); if (invalid) feedback.textContent = '图片支持 JPG、PNG 和 WebP。';
}
for (const [kind, input] of [['video',byId('remakeVideoFile')], ['images',byId('remakeImageFiles')]]) {
  for (const button of view.querySelectorAll('[data-pick="'+kind+'"]')) button.onclick = () => input.click();
  const accept = files => { if (files.length && !active) kind === 'video' ? selectVideo(files[0]) : addImages(files); };
  input.onchange = () => { accept(input.files); input.value = ''; };
  const drop = view.querySelector('[data-drop="'+kind+'"]');
  drop.ondragover = e => { e.preventDefault(); if (!active) drop.classList.add('is-over'); };
  drop.ondragleave = () => drop.classList.remove('is-over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('is-over'); accept(e.dataTransfer.files); };
}
byId('removeRemakeVideo').onclick = () => selectVideo(null);
prompt.oninput = resetResult;
cancel.onclick = () => active?.abort();

// Record a short, local storyboard in the reference video's aspect ratio.
async function makeSample(signal) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw Error('当前浏览器不支持制作样片，请使用桌面 Chrome 或 Edge。');
  await Promise.all(images.map(img => img.decode().catch(() => { throw Error('有图片无法解码，请移除或替换后重试。'); })));
  signal.throwIfAborted();
  const clip = document.createElement('video'); clip.playsInline = true; clip.muted = true; clip.src = sourceUrl;
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 720 / Math.max(source.videoWidth, source.videoHeight));
  canvas.width = Math.max(2, 2*Math.round(source.videoWidth*scale/2));
  canvas.height = Math.max(2, 2*Math.round(source.videoHeight*scale/2));
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(24);
  let recorder, frame, timer;
  try {
    const mimeType = ['video/webm;codecs=vp8','video/webm','video/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(stream, mimeType ? {mimeType} : undefined);
    await clip.play(); signal.throwIfAborted();
    const chunks = [];
    const lead = Math.min(Number.isFinite(clip.duration) ? clip.duration : 4, 4);
    const total = lead + images.length;
    return await new Promise((resolve,reject) => {
      const started = performance.now();
      const fail = () => reject(Error('制作样片失败，请检查视频后重试。'));
      signal.addEventListener('abort', () => reject(signal.reason), { once:true });
      recorder.onerror = fail; clip.onerror = fail;
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => chunks.length ? resolve(new Blob(chunks,{type:recorder.mimeType})) : fail();
      function draw() {
        if (signal.aborted) return;
        const elapsed = (performance.now()-started)/1000;
        const media = elapsed < lead ? clip : images[Math.floor(elapsed-lead)];
        if (!media || elapsed >= total) { recorder.stop(); return; }
        const w = media.videoWidth || media.naturalWidth, h = media.videoHeight || media.naturalHeight;
        if (w && h) {
          const fit = Math.min(canvas.width/w,canvas.height/h);
          ctx.fillStyle = '#111'; ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(media,(canvas.width-w*fit)/2,(canvas.height-h*fit)/2,w*fit,h*fit);
        }
        feedback.textContent = '正在制作样片 · '+Math.floor(Math.min(99,elapsed/total*100))+'%';
        frame = requestAnimationFrame(draw);
      }
      recorder.start(); draw(); timer = setTimeout(fail,(total+20)*1000);
    });
  } finally {
    clearTimeout(timer); cancelAnimationFrame(frame);
    if (recorder?.state === 'recording') recorder.stop();
    stream.getTracks().forEach(t=>t.stop()); clip.pause(); clip.removeAttribute('src'); clip.load();
  }
}
build.onclick = async () => {
  if (build.disabled) return;
  active = new AbortController(); source.pause(); output.pause();
  refreshControls();
  const inputs = view.querySelectorAll('[data-pick], #removeRemakeVideo, #remakeThumbs button, textarea');
  inputs.forEach(el => el.disabled = true);
  feedback.textContent = '正在读取素材…';
  try {
    const blob = await makeSample(active.signal);
    active.signal.throwIfAborted();
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(blob); output.src = resultUrl; output.hidden = false;
    byId('remakeEmpty').hidden = true;
    const download = byId('remakeDownload'); download.href = resultUrl; download.hidden = false;
    download.download = '短视频复刻-预览样片.'+(blob.type.includes('mp4')?'mp4':'webm');
    feedback.textContent = '样片已就绪，可以播放或下载。';
  } catch (error) { feedback.textContent = active.signal.aborted ? '已取消，素材和提示词已保留。' : error.message; }
  finally { active = null; inputs.forEach(el=>el.disabled=false); refreshControls(); }
};
