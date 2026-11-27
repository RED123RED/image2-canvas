import { readVideoRemakeGalleryProjects, remakeAuthHeaders, videoRemakeModelOptions } from './app.js?v=wenwu-remake-gallery-source-fallback-20261127';
import { wenwuDimensions } from './h3-wenwu.js';
const byId = id => document.getElementById(id);
const library = byId('homeLibrary');
const view = byId('remakeView');
const historyView = byId('remakeHistoryView');
const galleryDialog = byId('remakeGalleryDialog');
const source = byId('remakeSource');
const output = byId('remakeOutput');
const prompt = byId('remakePrompt');
const mentionMenu = byId('remakeMentionMenu');
const build = byId('remakeBuild');
const cancel = byId('remakeCancel');
const feedback = byId('remakeFeedback');
const images = [];
let sourceUrl = '', videoFile = null, videoAsset = '', currentJob = '', busy = false;
let elapsedJob = null;
let elapsedTimer = null;
let controlTapped = false;
let mentionActiveIndex = 0;
const sessionKey = 'canvas-wenwu-remake-v1';
const historyKey = 'canvas-wenwu-remake-history-v1';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function promptText() {
  function read(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    if (node.classList.contains('remake-image-mention')) return node.querySelector('strong')?.textContent || '';
    if (node.tagName === 'BR') return '\n';
    const text = Array.from(node.childNodes,read).join('');
    return node !== prompt && ['DIV','P'].includes(node.tagName) ? text + '\n' : text;
  }
  return read(prompt).replace(/\u00a0/g,' ').replace(/\n+$/,'');
}
function setPromptText(value) { prompt.replaceChildren(document.createTextNode(value || '')); }

let galleryProjects = [];
let galleryProjectId = '';

for (const model of videoRemakeModelOptions) {
  const option = document.createElement('option');
  option.value = model.value;
  option.textContent = model.label + (model.vision ? '' : ' · 仅文本');
  byId('remakeModel').append(option);
}
byId('remakeModel').value = videoRemakeModelOptions.some(model => model.value === localStorage.getItem('canvas-remake-model'))
  ? localStorage.getItem('canvas-remake-model') : 'gpt-6-astra';
byId('remakeModel').addEventListener('change', () => localStorage.setItem('canvas-remake-model', byId('remakeModel').value));

byId('openRemake').onclick = () => {
  library.hidden = true;
  view.hidden = false;
  byId('homeView').scrollTop = 0;
  byId('remakeTitle').focus();
};
byId('remakeBack').onclick = () => {
  source.pause(); output.pause();
  view.hidden = true;
  library.hidden = false;
  byId('openRemake').focus();
};
byId('remakeHistoryButton').onclick = () => {
  view.hidden = true;
  historyView.hidden = false;
  renderHistory();
  byId('remakeHistoryTitle').focus();
};
byId('remakeHistoryBack').onclick = () => {
  byId('remakeHistoryOutput').pause();
  historyView.hidden = true;
  view.hidden = false;
  byId('remakeTitle').focus();
};
byId('remakeGalleryButton').onclick = () => { void openGallery(); };
byId('remakeGalleryClose').onclick = closeGallery;
galleryDialog.addEventListener('click', event => { if (event.target === galleryDialog) closeGallery(); });
byId('remakeGalleryProjectBack').onclick = () => { galleryProjectId = ''; renderGalleryProjects(); renderGalleryImages(); };

function closeGallery() {
  galleryDialog.close();
  byId('remakeGalleryButton').focus();
}
async function openGallery() {
  galleryDialog.showModal();
  byId('remakeGalleryFeedback').textContent = '正在读取画布项目…';
  byId('remakeGalleryProjectList').replaceChildren();
  byId('remakeGalleryImageGrid').replaceChildren();
  byId('remakeGalleryProjectName').textContent = '选择一个项目查看图片';
  byId('remakeGalleryImageCount').textContent = '';
  byId('remakeGalleryProjectBack').hidden = true;
  galleryProjectId = '';
  try {
    galleryProjects = await readVideoRemakeGalleryProjects();
    renderGalleryProjects();
    renderGalleryImages();
  } catch (error) {
    byId('remakeGalleryFeedback').textContent = '无法读取画布项目：' + (error.message || '本机项目库暂不可用');
  }
}
function renderGalleryProjects() {
  const list = byId('remakeGalleryProjectList');
  list.replaceChildren();
  if (!galleryProjects.length) {
    const empty = document.createElement('p');
    empty.className = 'remake-gallery-empty';
    empty.textContent = '画布项目中还没有可用图片。';
    list.append(empty);
    return;
  }
  for (const project of galleryProjects) {
    const button = document.createElement('button');
    button.className = 'remake-gallery-project';
    button.type = 'button';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(project.id === galleryProjectId));
    button.disabled = busy;
    const cover = document.createElement('img');
    cover.alt = '';
    setGalleryImageSource(cover, project.images.flatMap(galleryImageSources));
    const details = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = project.name;
    const count = document.createElement('small');
    count.textContent = project.images.length + ' 张图片';
    details.append(name, count);
    button.append(cover, details);
    button.onclick = () => {
      galleryProjectId = project.id;
      renderGalleryProjects();
      renderGalleryImages();
    };
    list.append(button);
  }
}
function renderGalleryImages() {
  const project = galleryProjects.find(item => item.id === galleryProjectId);
  const grid = byId('remakeGalleryImageGrid');
  grid.replaceChildren();
  byId('remakeGalleryProjectBack').hidden = !project;
  byId('remakeGalleryProjectName').textContent = project?.name || '选择一个项目查看图片';
  byId('remakeGalleryImageCount').textContent = project ? project.images.length + ' 张图片' : '';
  if (!project) {
    byId('remakeGalleryFeedback').textContent = galleryProjects.length ? '选择画布项目，再点击要加入模板的图片。' : '请先在自由画布项目中生成或添加图片。';
    return;
  }
  for (const image of project.images) {
    const button = document.createElement('button');
    button.className = 'remake-gallery-image';
    button.type = 'button';
    button.setAttribute('role', 'option');
    button.disabled = busy || images.length >= 9;
    const thumbnail = document.createElement('img');
    thumbnail.alt = '';
    thumbnail.loading = 'lazy';
    setGalleryImageSource(thumbnail, galleryImageSources(image));
    const name = document.createElement('strong');
    name.textContent = image.name;
    const dimensions = document.createElement('small');
    dimensions.textContent = image.width && image.height ? image.width + ' × ' + image.height : '画布图片';
    button.append(thumbnail, name, dimensions);
    button.onclick = () => { void addGalleryImage(image); };
    grid.append(button);
  }
  byId('remakeGalleryFeedback').textContent = images.length >= 9 ? '模板已达到 9 张参考图上限。' : '点击图片即可加入短视频模板的参考图。当前已添加 ' + images.length + '/9 张。';
}
async function addGalleryImage(image) {
  if (busy || images.length >= 9) {
    byId('remakeGalleryFeedback').textContent = '模板最多支持 9 张参考图。';
    return;
  }
  const buttons = byId('remakeGalleryImageGrid').querySelectorAll('button');
  buttons.forEach(button => { button.disabled = true; });
  byId('remakeGalleryFeedback').textContent = '正在加入参考图片…';
  try {
    const imageCount = images.length;
    const { blob, type } = await fetchGalleryImage(image);
    const extension = type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp';
    const file = new File([blob], safeGalleryFilename(image.name, extension), { type });
    addImages([file]);
    if (images.length > imageCount) {
      renderGalleryImages();
      byId('remakeGalleryFeedback').textContent = '已添加「' + image.name + '」· 当前 ' + images.length + '/9 张，可继续选择图片。';
    }
  } catch (error) {
    byId('remakeGalleryFeedback').textContent = error.message || '无法加入这张画布图片。';
    buttons.forEach(button => { button.disabled = busy || images.length >= 9; });
  }
}
function galleryImageSources(image) {
  return [...new Set(image.sources?.length ? image.sources : [image.previewSrc, image.src, image.originalSrc].filter(Boolean))];
}
function setGalleryImageSource(element, sources) {
  let sourceIndex = 0;
  const tryNextSource = () => {
    if (sourceIndex < sources.length) {
      element.src = sources[sourceIndex++];
      return;
    }
    const unavailable = document.createElement('span');
    unavailable.className = 'remake-gallery-unavailable';
    unavailable.textContent = '图片不可用';
    element.replaceWith(unavailable);
  };
  element.addEventListener('error', tryNextSource);
  tryNextSource();
}
async function fetchGalleryImage(image) {
  let lastError;
  for (const imageSource of galleryImageSources(image)) {
    try {
      const response = await fetch(imageSource);
      if (!response.ok) throw Error('画布图片读取失败（' + response.status + '）');
      const blob = await response.blob();
      const type = ['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) ? blob.type : imageTypeFromSource(imageSource);
      if (!type) throw Error('模板支持 JPG、PNG 和 WebP 图片');
      if (blob.type && !blob.type.startsWith('image/') && blob.type !== 'application/octet-stream') throw Error('图片地址返回的内容不是图像文件');
      return { blob, type };
    } catch (error) {
      lastError = error;
    }
  }
  throw Error(lastError?.message || '图片预览、原图和原始素材地址均无法读取');
}
function imageTypeFromSource(source) {
  const path = String(source || '').split(/[?#]/, 1)[0].toLowerCase();
  if (/\.jpe?g$/.test(path)) return 'image/jpeg';
  if (/\.png$/.test(path)) return 'image/png';
  if (/\.webp$/.test(path)) return 'image/webp';
  return '';
}
function safeGalleryFilename(name, extension) {
  const stem = String(name || '画布图片').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim() || '画布图片';
  return stem + '.' + extension;
}
function readHistory() {
  try {
    const records = JSON.parse(localStorage.getItem(historyKey) || '[]');
    return Array.isArray(records) ? records.filter(record => record && generatedVideoFilename(record.url) && Number.isInteger(record.seconds) && record.seconds >= 5 && record.seconds <= 30) : [];
  } catch { return []; }
}
function saveHistory(job) {
  const url = job.media?.[0]?.url;
  if (!generatedVideoFilename(url)) return;
  const record = {
    id: job.id,
    url,
    seconds: Number(job.videoSeconds),
    elapsedMs: Math.max(0, Number(job.videoElapsedMs) || 0),
    generatedAt: Number(job.finishedAt) || Date.now()
  };
  try {
    const records = readHistory().filter(item => item.url !== record.url);
    localStorage.setItem(historyKey, JSON.stringify([record, ...records]));
  } catch { /* An unavailable browser store must not affect the completed video. */ }
  renderHistory();
}
function renderHistory() {
  const list = byId('remakeHistoryList');
  const records = readHistory();
  list.replaceChildren();
  byId('remakeHistoryCount').textContent = records.length + ' 条';
  if (!records.length) {
    const empty = document.createElement('p');
    empty.className = 'remake-history-empty';
    empty.textContent = '还没有生成记录。完成视频生成后会保存在这里。';
    list.append(empty);
    return;
  }
  for (const record of records) {
    const item = document.createElement('article');
    item.className = 'remake-history-item';
    item.setAttribute('role', 'listitem');
    const select = document.createElement('button');
    select.className = 'remake-history-select';
    select.type = 'button';
    select.setAttribute('aria-pressed', 'false');
    const icon = document.createElement('span');
    icon.className = 'remake-history-icon';
    const playIcon = document.createElement('i');
    playIcon.setAttribute('data-lucide', 'circle-play');
    icon.append(playIcon);
    const summary = document.createElement('span');
    summary.className = 'remake-history-summary';
    const title = document.createElement('strong');
    title.textContent = '短视频复刻成片';
    const date = document.createElement('small');
    date.textContent = new Date(record.generatedAt).toLocaleString();
    summary.append(title, date);
    const duration = document.createElement('span');
    duration.className = 'remake-history-duration';
    duration.textContent = record.seconds + ' 秒';
    const elapsed = document.createElement('small');
    elapsed.className = 'remake-history-item-elapsed';
    elapsed.textContent = '生成用时 ' + formatElapsed(record.elapsedMs);
    select.append(icon, summary, duration, elapsed);
    select.onclick = () => previewHistory(record, select);
    const remove = document.createElement('button');
    remove.className = 'remake-history-remove';
    remove.type = 'button';
    remove.title = '删除此视频';
    remove.setAttribute('aria-label', '删除 ' + title.textContent);
    remove.innerHTML = '<i data-lucide="trash-2"></i><span>删除</span>';
    remove.onclick = event => { event.stopPropagation(); void deleteHistoryRecord(record, remove); };
    item.append(select, remove);
    list.append(item);
  }
  window.lucide?.createIcons({attrs:{'stroke-width':1.8}});
}
async function previewHistory(record, trigger) {
  const video = byId('remakeHistoryOutput');
  const historyFeedback = byId('remakeHistoryFeedback');
  for (const button of byId('remakeHistoryList').querySelectorAll('.remake-history-select')) {
    const selected = button === trigger;
    button.closest('.remake-history-item')?.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed',String(selected));
  }
  try {
    const response = await fetch(record.url,{method:'HEAD'});
    if (!response.ok) throw Error('本地视频文件已不存在。');
    video.src = record.url;
    video.hidden = false;
    video.load();
    byId('remakeHistoryEmpty').hidden = true;
    byId('remakeHistoryDetails').hidden = false;
    byId('remakeHistoryDuration').textContent = '生成时长 ' + record.seconds + ' 秒';
    byId('remakeHistoryElapsed').textContent = '生成用时 ' + formatElapsed(record.elapsedMs);
    const generatedAt = new Date(record.generatedAt);
    byId('remakeHistoryDate').dateTime = generatedAt.toISOString();
    byId('remakeHistoryDate').textContent = generatedAt.toLocaleString();
    const download = byId('remakeHistoryDownload');
    download.href = record.url;
    download.download = '短视频复刻-' + record.seconds + '秒.mp4';
    historyFeedback.textContent = '已载入成片，点击播放器播放。';
  } catch (error) {
    video.pause(); video.removeAttribute('src'); video.load(); video.hidden = true;
    byId('remakeHistoryEmpty').hidden = false;
    byId('remakeHistoryDetails').hidden = true;
    historyFeedback.textContent = error.message || '无法读取本地视频。';
  }
}
function clearHistoryPreview(url) {
  const filename = generatedVideoFilename(url);
  const video = byId('remakeHistoryOutput');
  if (!filename || generatedVideoFilename(video.currentSrc || video.src) !== filename) return;
  video.pause(); video.removeAttribute('src'); video.load(); video.hidden = true;
  byId('remakeHistoryEmpty').hidden = false;
  byId('remakeHistoryDetails').hidden = true;
  byId('remakeHistoryDownload').removeAttribute('href');
}
function removeHistoryEntry(url) {
  const filename = generatedVideoFilename(url);
  try { localStorage.setItem(historyKey,JSON.stringify(readHistory().filter(record => generatedVideoFilename(record.url) !== filename))); }
  catch { /* The current output can still be removed if browser storage is unavailable. */ }
  renderHistory();
}
async function deleteHistoryRecord(record, remove) {
  const filename = generatedVideoFilename(record.url);
  const feedbackTarget = byId('remakeHistoryFeedback');
  if (!filename) { feedbackTarget.textContent = '无法确认这条历史记录对应的本地视频文件。'; return; }
  remove.disabled = true;
  try {
    const result = await jsonRequest('/api/generated/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filenames:[filename]})});
    if ((Number(result.deleted)||0) + (Number(result.missing)||0) < 1) throw Error('本机服务未确认视频文件已删除');
    clearHistoryPreview(record.url);
    removeHistoryEntry(record.url);
    feedbackTarget.textContent = result.deleted ? '已删除选中的历史成片和本地视频文件。' : '历史成片已移除，对应的本地视频文件原已不存在。';
  } catch (error) {
    feedbackTarget.textContent = '本地视频删除失败，历史记录已保留：' + error.message;
    remove.disabled = false;
  }
}
function refreshControls() {
  build.disabled = busy || !(promptText().trim() || images.length || videoFile);
  cancel.hidden = !busy || !currentJob;
  byId('remakeGalleryButton').disabled = busy;
  if (galleryDialog.open) {
    for (const button of galleryDialog.querySelectorAll('.remake-gallery-project, .remake-gallery-image')) button.disabled = busy || (button.classList.contains('remake-gallery-image') && images.length >= 9);
  }
  byId('remakeCount').textContent = images.length + '/9';
  for (const control of view.querySelectorAll('[data-pick], #removeRemakeVideo, #remakeThumbs button, .workshop-settings select, .workshop-settings input')) control.disabled = busy;
  const { width, height } = wenwuDimensions({ videoAspect: byId('remakeRatio').value, videoMegapixels: Number(byId('remakeMP').value), videoMultiple: 32 });
  byId('remakeEstimate').textContent = '预计 ' + width + ' × ' + height + ' · 32 对齐';
}
function resetResult() {
  refreshControls();
  if (!busy) feedback.textContent = videoFile || images.length ? '全能参考 · 准备就绪' : '文生视频 · 填写提示词后即可生成';
}
function clearOutput() {
  output.pause(); output.removeAttribute('src'); output.load(); output.hidden = true;
  byId('remakeEmpty').hidden = false;
  byId('remakeDownload').hidden = byId('remakeRewrite').hidden = true;
  byId('remakeDownload').removeAttribute('href');
  byId('remakeLength').textContent = '';
  elapsedJob = null;
  byId('remakeElapsed').textContent = '';
}
function generatedVideoFilename(source) {
  try {
    const url = new URL(String(source || ''),window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/generated/')) return '';
    const filename = decodeURIComponent(url.pathname.slice('/api/generated/'.length));
    return /^job-[a-z0-9-]+-\d+\.(?:mp4|webm|mov|gif)$/i.test(filename) ? filename : '';
  } catch { return ''; }
}
function selectVideo(file) {
  if (file && !/\.(mp4|webm|mov)$/i.test(file.name) && !['video/mp4','video/webm','video/quicktime'].includes(file.type)) {
    feedback.textContent = '请选择 MP4、WebM 或 MOV 视频。'; return;
  }
  videoFile = file; videoAsset = '';
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
source.onloadeddata = refreshControls;
source.onerror = () => { refreshControls(); feedback.textContent = '这段视频无法解码，请替换为浏览器可播放的视频。'; };
function addImages(files) {
  let invalid = false, overflow = false;
  for (const file of files) {
    if (!/\.(jpe?g|png|webp)$/i.test(file.name) && !['image/jpeg','image/png','image/webp'].includes(file.type)) { invalid = true; continue; }
    if (images.length >= 9) { overflow = true; continue; }
    const url = URL.createObjectURL(file);
    const img = new Image(); img.src = url; img.alt = file.name;
    img.dataset.referenceId = crypto.randomUUID();
    const row = document.createElement('li');
    img.dataset.referenceName = file.name;
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', '移除 ' + file.name);
    remove.onclick = () => {
      images.splice(images.indexOf(img),1);
      prompt.querySelectorAll('[data-reference-id="'+img.dataset.referenceId+'"]').forEach(chip => chip.remove());
      URL.revokeObjectURL(url); row.remove(); renumberMentions(); renderMentionMenu(); resetResult();
    };
    row.append(img, remove); images.push(img); byId('remakeThumbs').append(row);
  }
  renderMentionMenu();
  resetResult(); if (overflow) feedback.textContent = '最多支持 9 张，超出的图片未添加。'; else if (invalid) feedback.textContent = '图片支持 JPG、PNG 和 WebP。';
}
function renderMentionMenu() {
  mentionMenu.replaceChildren();
  if (!images.length) {
    mentionMenu.hidden = true;
    return;
  }
  mentionActiveIndex = Math.min(mentionActiveIndex, images.length - 1);
  for (const [index,image] of images.entries()) {
    const option = document.createElement('button'); option.type = 'button'; option.role = 'option';
    option.dataset.imageIndex = String(index + 1);
    option.setAttribute('aria-selected', String(index === mentionActiveIndex));
    const thumbnail = document.createElement('img'); thumbnail.src = image.src; thumbnail.alt = '';
    const label = document.createElement('strong'); label.textContent = '@' + (index + 1);
    const name = document.createElement('span'); name.textContent = image.dataset.referenceName;
    option.append(thumbnail,label,name);
    option.onmousedown = event => event.preventDefault();
    option.onclick = () => insertMention(index);
    mentionMenu.append(option);
  }
}
function closeMentionMenu() { mentionMenu.hidden = true; }
function renumberMentions() {
  prompt.querySelectorAll('.remake-image-mention').forEach(chip => {
    const index = images.findIndex(image => image.dataset.referenceId === chip.dataset.referenceId);
    if (index < 0) { chip.remove(); return; }
    chip.querySelector('strong').textContent = '@' + (index + 1);
  });
}
function makeMention(image,index) {
  const chip = document.createElement('span');
  chip.className = 'remake-image-mention'; chip.contentEditable = 'false';
  chip.dataset.referenceId = image.dataset.referenceId;
  const thumbnail = document.createElement('img'); thumbnail.src = image.src; thumbnail.alt = '';
  const label = document.createElement('strong'); label.textContent = '@' + (index + 1);
  chip.append(thumbnail,label);
  return chip;
}
function insertMention(index) {
  const selection = window.getSelection();
  if (mentionMenu.hidden || !selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!prompt.contains(range.commonAncestorContainer)) return closeMentionMenu();
  range.deleteContents();
  const chip = makeMention(images[index],index);
  range.insertNode(chip);
  const spacer = document.createTextNode(' ');
  chip.after(spacer);
  range.setStartAfter(spacer); range.collapse(true);
  prompt.focus(); selection.removeAllRanges(); selection.addRange(range);
  closeMentionMenu(); resetResult();
  prompt.dispatchEvent(new Event('input',{bubbles:true}));
}
for (const [kind, input] of [['video',byId('remakeVideoFile')], ['images',byId('remakeImageFiles')]]) {
  for (const button of view.querySelectorAll('[data-pick="'+kind+'"]')) button.onclick = () => input.click();
  const accept = files => { if (files.length && !busy) kind === 'video' ? selectVideo(files[0]) : addImages(files); };
  input.onchange = () => { accept(input.files); input.value = ''; };
  const drop = view.querySelector('[data-drop="'+kind+'"]');
  drop.ondragover = e => { e.preventDefault(); if (!busy) drop.classList.add('is-over'); };
  drop.ondragleave = () => drop.classList.remove('is-over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('is-over'); accept(e.dataTransfer.files); };
}
byId('removeRemakeVideo').onclick = () => selectVideo(null);
prompt.addEventListener('input', () => {
  closeMentionMenu(); resetResult();
  if (!busy) return;
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    if (saved?.id === currentJob) sessionStorage.setItem(sessionKey, JSON.stringify({ ...saved, prompt: promptText() }));
  } catch { /* Keep the active request independent from editor recovery. */ }
});
prompt.addEventListener('keyup', event => {
  if (event.key !== 'Control' || !controlTapped) return;
  controlTapped = false;
  if (!images.length || event.isComposing) return;
  mentionActiveIndex = 0;
  mentionMenu.hidden = false;
  renderMentionMenu();
});
prompt.addEventListener('pointerdown', () => { controlTapped = false; });
prompt.addEventListener('blur', () => { controlTapped = false; });
window.addEventListener('blur', () => { controlTapped = false; });
prompt.addEventListener('keydown', event => {
  if (!event.repeat) controlTapped = event.key === 'Control' && !event.shiftKey && !event.altKey && !event.metaKey && !event.isComposing;
  if (mentionMenu.hidden || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const options = mentionMenu.querySelectorAll('[role="option"]');
  if (/^[1-9]$/.test(event.key)) {
    const option = Array.from(options).find(item => item.dataset.imageIndex === event.key);
    if (option) { event.preventDefault(); option.click(); }
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault(); mentionActiveIndex = (mentionActiveIndex + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length; renderMentionMenu();
  } else if (event.key === 'Enter' || event.key === 'Tab') {
    event.preventDefault(); const option = options[mentionActiveIndex]; if (option) option.click();
  } else if (event.key === 'Escape') closeMentionMenu();
});
prompt.addEventListener('paste', event => {
  event.preventDefault();
  const text = event.clipboardData?.getData('text/plain') || '';
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const inserted = document.createTextNode(text);
  range.insertNode(inserted); range.setStartAfter(inserted); range.collapse(true);
  selection.removeAllRanges(); selection.addRange(range);
  prompt.dispatchEvent(new Event('input',{bubbles:true}));
});
prompt.addEventListener('blur', () => setTimeout(() => { if (!mentionMenu.matches(':hover')) closeMentionMenu(); },120));
byId('remakeOpenFolder').onclick = async () => {
  byId('remakeOpenFolder').disabled = true;
  try {
    await jsonRequest('/api/generated/open-folder?kind=video',{method:'POST'});
    feedback.textContent = '已打开本地生成文件夹。';
  } catch (error) { feedback.textContent = '无法打开本地生成文件夹：' + error.message; }
  finally { byId('remakeOpenFolder').disabled = false; }
};
for (const control of view.querySelectorAll('.workshop-settings select, .workshop-settings input')) control.onchange = resetResult;

async function jsonRequest(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(Error(data.error || '本机服务请求失败（' + response.status + '）'), {status: response.status});
  return data;
}
function jpeg(element, width, height, limit) {
  if (!width || !height) throw Error('参考素材无法解码');
  const scale = Math.min(1, limit / Math.max(width,height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width*scale)); canvas.height = Math.max(1, Math.round(height*scale));
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(element,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',0.88);
}
async function sampleVideo(url) {
  const clip = document.createElement('video'); clip.preload = 'auto'; clip.muted = true;
  function waitFor(event, action) {
    return new Promise((resolve,reject) => {
      const done = ok => { clearTimeout(timer); clip.onloadeddata = clip.onseeked = clip.onerror = null; ok ? resolve() : reject(Error('视频抽帧失败，请替换为可播放的视频。')); };
      const timer = setTimeout(() => done(false),15000);
      clip['on' + event] = () => done(true); clip.onerror = () => done(false); action();
    });
  }
  try {
    await waitFor('loadeddata', () => { clip.src = url; });
    const frames = [];
    for (const time of Number.isFinite(clip.duration) && clip.duration > 0.2 ? [0,clip.duration*0.5,clip.duration*0.9] : [0]) {
      if (time > 0) await waitFor('seeked', () => { clip.currentTime = time; });
      frames.push({seconds: Number(time.toFixed(2)), image: jpeg(clip,clip.videoWidth,clip.videoHeight,640)});
    }
    return frames;
  } finally { clip.removeAttribute('src'); clip.load(); }
}
function formatElapsed(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  return hours ? [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':') : [minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
}
function renderElapsed() {
  if (!elapsedJob?.videoStartedAt) { byId('remakeElapsed').textContent = ''; return; }
  const terminal = ['succeeded', 'failed', 'canceled'].includes(elapsedJob.status);
  const elapsed = terminal ? elapsedJob.videoElapsedMs : Date.now() - elapsedJob.videoStartedAt;
  byId('remakeElapsed').textContent = (terminal ? '视频生成用时 ' : '视频生成中 ') + formatElapsed(elapsed || 0);
}
function showJob(job) {
  elapsedJob = job;
  if (!elapsedTimer) elapsedTimer = setInterval(renderElapsed, 1000);
  renderElapsed();
  if (job.h3Prompt) {
    byId('remakeRewrite').hidden = false;
    byId('remakeRewrite').querySelector('pre').textContent = job.h3Prompt;
  }
  if (job.status === 'succeeded') {
    const url = job.media?.[0]?.url;
    if (url) {
      saveHistory(job);
      output.src = url; output.hidden = false; byId('remakeEmpty').hidden = true;
      const download = byId('remakeDownload'); download.href = url; download.download = '短视频复刻.mp4'; download.hidden = false;
      byId('remakeLength').textContent = job.videoSeconds + ' 秒';
    }
    feedback.textContent = url ? '成片已完成，可以播放或下载。' : '任务结束，未收到视频地址。';
  } else if (job.status === 'failed' || job.status === 'canceled') {
    feedback.textContent = (job.remakeStage === 'rewriting' ? '整理提示词阶段：' : '') + (job.error || '任务已结束');
  } else {
    feedback.textContent = job.status === 'queued' ? '任务排队中…' : job.remakeStage === 'rewriting' ? (videoRemakeModelOptions.find(model => model.value === (job.rewriterModel || byId('remakeModel').value))?.label || '所选模型') + ' 正在整理 H3 提示词…' : '文武双全正在生成视频…';
  }
  return ['succeeded','failed','canceled'].includes(job.status);
}
async function followJob(id) {
  let misses = 0;
  while (currentJob === id) {
    try {
      const {job} = await jsonRequest('/api/jobs/'+id);
      if (showJob(job)) break;
      misses = 0;
    } catch (error) {
      feedback.textContent = '任务状态暂时不可用，正在重新查询…';
      if (error.status === 404 && ++misses >= 8) { feedback.textContent = '未找到此任务，请检查本机服务及任务记录。'; break; }
    }
    await sleep(1500);
  }
  busy = false; currentJob = ''; refreshControls();
  if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
}
cancel.onclick = async () => {
  const id = currentJob; if (!id) return;
  try { await jsonRequest('/api/jobs/'+id+'/cancel', {method:'POST'}); }
  catch (error) { feedback.textContent = error.message; }
};
build.onclick = async () => {
  if (build.disabled) return;
  const seconds = Number(byId('remakeDuration').value);
  if (!Number.isInteger(seconds) || seconds < 5 || seconds > 30) {
    feedback.textContent = '视频时长请输入 5 到 30 之间的整数秒。';
    byId('remakeDuration').focus();
    return;
  }
  const submittedPrompt = promptText().trim();
  const rewriterModel = byId('remakeModel').value;
  busy = true; refreshControls(); feedback.textContent = '准备参考素材…';
  let dispatched = false;
  try {
    const references = [];
    for (const image of images) { await image.decode(); references.push(jpeg(image,image.naturalWidth,image.naturalHeight,1600)); }
    if (videoFile && !videoAsset) {
      const uploaded = await jsonRequest('/api/video-assets', {method:'POST',headers:{'Content-Type':videoFile.type || 'video/mp4','x-file-name':encodeURIComponent(videoFile.name)},body:videoFile});
      videoAsset = uploaded.url;
    }
    const frames = videoAsset ? await sampleVideo(videoAsset) : [];
    const requestId = crypto.randomUUID();
    const body = {requestId, prompt:submittedPrompt, rewriterModel,
      references, frames, videoReference:videoAsset, seconds, aspect:byId('remakeRatio').value, megapixels:Number(byId('remakeMP').value)};
    currentJob = 'job-remake-'+requestId;
    sessionStorage.setItem(sessionKey, JSON.stringify({id:currentJob, prompt:submittedPrompt}));
    clearOutput(); dispatched = true;
    const {job} = await jsonRequest('/api/templates/video-remake', {method:'POST',headers:{'Content-Type':'application/json',...remakeAuthHeaders()},body:JSON.stringify(body)});
    currentJob = job.id; refreshControls(); await followJob(job.id);
  } catch (error) {
    if (dispatched && (!error.status || error.status >= 500)) { await followJob(currentJob); return; }
    if (dispatched) sessionStorage.removeItem(sessionKey);
    busy = false; currentJob = ''; refreshControls();
    feedback.textContent = error.status === 404 ? '请在设置中重启本机服务，再刷新页面。' : error.message;
    if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
  }
};
refreshControls();
renderHistory();
try {
  const saved = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
  if (saved?.id?.startsWith('job-remake-')) { currentJob = saved.id; setPromptText(saved.prompt || ''); busy = true; refreshControls(); void followJob(currentJob); }
} catch { /* No recoverable task in this tab. */ }

const layout = view.querySelector('.remake-layout');
const separators = Array.from(layout.querySelectorAll('[data-split]'));
let cuts = [24, 64];
function sizePanels() {
  layout.style.setProperty('--media', cuts[0] + 'fr');
  layout.style.setProperty('--editor', (cuts[1] - cuts[0]) + 'fr');
  layout.style.setProperty('--result', (100 - cuts[1]) + 'fr');
  separators.forEach((handle, index) => {
    handle.setAttribute('aria-valuenow', Math.round(cuts[index]));
    handle.setAttribute('aria-valuemin', Math.ceil(index ? cuts[0]+23 : 18));
    handle.setAttribute('aria-valuemax', Math.floor(index ? 80 : cuts[1]-23));
  });
}
for (const [index, handle] of separators.entries()) {
  let origin;
  function move(value) {
    const low = index ? cuts[0]+23 : 18;
    const high = index ? 80 : cuts[1]-23;
    cuts[index] = Math.max(low,Math.min(high,value));
    sizePanels();
  }
  handle.onpointerdown = event => {
    if (event.button !== 0) return;
    origin = {x:event.clientX, cut:cuts[index]};
    handle.setPointerCapture(event.pointerId);
    handle.classList.add('dragging');
  };
  handle.onpointermove = event => {
    if (origin) move(origin.cut + (event.clientX-origin.x)*100/(layout.clientWidth-20));
  };
  handle.onlostpointercapture = () => { origin = null; handle.classList.remove('dragging'); };
  handle.ondblclick = () => { cuts = [24,64]; sizePanels(); };
  handle.onkeydown = event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(cuts[index] + (event.key === 'ArrowLeft' ? -1 : 1));
  };
}
sizePanels();
