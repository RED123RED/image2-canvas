import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createMediaCleanup} from '../media-cleanup.mjs';
import {collectMediaReferences, imageKeyFromSource, managedImageKey, mediaCleanupProtocol} from '../public/media-references.js';

const body = (extra = {}) => ({protocol: mediaCleanupProtocol, action: 'preview', referencedImages: [], referencedJobIds: [], ...extra});
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'canvas-cleanup-test-'));
  for (const dir of ['assets', 'generated']) await fs.mkdir(path.join(root, dir));
  const jobs = []; let time = Date.now();
  const cleanup = createMediaCleanup({generatedDir: path.join(root, 'generated'), assetsDir: path.join(root, 'assets'), getJobs: () => jobs, now: () => time});
  const put = async (key, content = 'fixture', recent = false) => {
    const file = path.join(root, key); await fs.writeFile(file, content);
    if (!recent) await fs.utimes(file, new Date(time - 3600000), new Date(time - 3600000));
  };
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const exists = async key => {try {await fs.stat(path.join(root,key));return true;} catch {return false;}};
  return {root, jobs, cleanup, put, exists, advance: ms => time += ms};
}

test('references cover every project, hidden groups, backups, drafts, comparisons and unfinished jobs', () => {
  const url = name => '/api/assets/asset-' + name + '.png';
  const documents = [{id:'first',nodes:[{type:'image',src:'/api/generated/job-one-1.png',originalSrc:url('original'),previewSrc:url('preview'),layerSource:url('layer-source'),
    layerDocument:{originalSrc:url('doc-original'),layers:[{type:'group',visible:false,children:[{src:url('hidden')}],backup:{type:'group',children:[{src:url('backup')}]}}],initialLayers:[{src:url('initial')}]},
    layerDraft:{layers:[{src:url('draft')}]},layerRefinement:{jobId:'job-refine',sourceLayer:{src:url('refine-source')},candidate:{layers:[{src:url('candidate')}]}},
    localEdit:{source:url('before'),result:{url:url('after')},rawResult:{url:'/api/generated/job-raw-1.png'},history:[{before:url('old-before'),after:url('old-after')}],requestId:'11111111-1111-1111-1111-111111111111'}},
    {type:'generator',activeJobId:'job-awaiting'},{type:'image',layerJobId:'job-layer-awaiting'},
    {type:'another-tool',image:url('other-tool')}]}, {id:'second',nodes:[{src:url('shared-other-project')}]}];
  const result = collectMediaReferences(documents, 'http://localhost:45173');
  for (const name of ['original','preview','layer-source','doc-original','hidden','backup','initial','draft','refine-source','candidate','before','after','old-before','old-after','other-tool','shared-other-project']) assert.ok(result.referencedImages.includes('assets/asset-'+name+'.png'),name);
  assert.ok(result.referencedImages.includes('generated/job-one-1.png'));
  assert.ok(result.referencedImages.includes('generated/job-raw-1.png'));
  assert.deepEqual(result.referencedJobIds,['job-awaiting','job-layer-awaiting','job-le-11111111-1111-1111-1111-111111111111','job-refine']);
});

test('safe file names, origin handling and cyclic objects', () => {
  assert.equal(imageKeyFromSource('http://127.0.0.1:45173/api/assets/asset-one.preview.jpg?v=1','http://localhost:45173'),'assets/asset-one.preview.jpg');
  assert.equal(imageKeyFromSource('/api/assets/ASSET-ONE.PNG'),'assets/asset-one.png');
  assert.equal(imageKeyFromSource('https://external.test/api/assets/asset-one.png','http://localhost:45173'),'');
  for(const key of ['assets/../settings.json','assets/asset-one.png/else','assets/asset-one.svg','generated/job-one-1.mp4','assets/custom.png']) assert.equal(managedImageKey(key),'');
  assert.equal(imageKeyFromSource('/api/assets/%2e%2e%2fsecret.png'),'');
  const cyclic={src:'/api/assets/asset-one.png'};cyclic.self=cyclic;assert.equal(collectMediaReferences(cyclic).referencedImages.length,1);
});

test('deletes orphan images in both directories and retains used images, previews, jobs and nonimages', async t => {
  const f=await fixture(t);
  const kept=['assets/asset-used.png','assets/asset-used.preview.jpg','assets/job-layer-1.png','generated/job-running-1.png','generated/job-complete-1.png','assets/asset-inflight.png'];
  for(const key of [...kept,'generated/job-orphan-1.png','assets/asset-orphan.png','assets/asset-orphan.preview.jpg','assets/job-unused-layer-1.png','generated/job-video-1.mp4','assets/notes.json','assets/custom.png'])await f.put(key);
  await f.put('assets/asset-new.png','recent',true);
  f.jobs.push({id:'job-running',status:'running',request:{image:'/api/assets/asset-inflight.png'}});
  const references=body({referencedImages:kept.slice(0,2),referencedJobIds:['job-layer','job-complete']});
  const preview=await f.cleanup(references);assert.equal(preview.unusedCount,4);assert.equal(preview.recentCount,1);assert.equal(preview.byDirectory.assets.unusedCount,3);
  assert.equal(await f.exists('assets/asset-orphan.png'),true,'preview never deletes');
  const result=await f.cleanup({...references,action:'delete',previewToken:preview.previewToken});assert.equal(result.deleted,4);assert.equal(result.failed,0);
  for(const key of [...kept,'assets/asset-new.png','generated/job-video-1.mp4','assets/notes.json','assets/custom.png'])assert.equal(await f.exists(key),true,key);
  for(const key of ['generated/job-orphan-1.png','assets/asset-orphan.png','assets/asset-orphan.preview.jpg','assets/job-unused-layer-1.png'])assert.equal(await f.exists(key),false,key);
});

test('confirmation protects new references, changed files, new active jobs and files outside preview', async t => {
  const f=await fixture(t);
  for(const key of ['assets/asset-now-used.png','assets/asset-changed.png','generated/job-started-1.png','assets/asset-delete.png'])await f.put(key);
  const preview=await f.cleanup(body());
  await f.put('assets/asset-new-after-preview.png');await f.put('assets/asset-changed.png','changed content');
  f.jobs.push({id:'job-started',status:'running'});
  const result=await f.cleanup(body({action:'delete',previewToken:preview.previewToken,referencedImages:['assets/asset-now-used.png']}));
  assert.equal(result.deleted,1);assert.equal(result.skipped,3);
  for(const key of ['assets/asset-now-used.png','assets/asset-changed.png','generated/job-started-1.png','assets/asset-new-after-preview.png'])assert.equal(await f.exists(key),true,key);
  assert.equal(await f.exists('assets/asset-delete.png'),false);
});

test('invalid, incomplete, expired and reused requests fail closed; fresh files become eligible later',async t=>{
  const f=await fixture(t);await f.put('assets/asset-recent.png','recent',true);
  for(const bad of [{},{action:'delete',referencedFilenames:[]},body({referencedImages:['assets/../secret.png']}),body({referencedJobIds:null}),body({action:'invalid'})])await assert.rejects(f.cleanup(bad));
  assert.equal((await f.cleanup(body())).unusedCount,0);f.advance(11*60_000);
  let preview=await f.cleanup(body());assert.equal(preview.unusedCount,1);f.advance(6*60_000);
  await assert.rejects(f.cleanup(body({action:'delete',previewToken:preview.previewToken})));assert.equal(await f.exists('assets/asset-recent.png'),true);
  preview=await f.cleanup(body());await f.cleanup(body({action:'delete',previewToken:preview.previewToken}));
  await assert.rejects(f.cleanup(body({action:'delete',previewToken:preview.previewToken})));
});

test('nested directories and symbolic links are not cleanup candidates',async t=>{
  const f=await fixture(t);await fs.mkdir(path.join(f.root,'assets','nested'));await fs.writeFile(path.join(f.root,'assets/nested/asset-safe.png'),'safe');
  await f.put('assets/asset-used.png');
  let linked=false;try{await fs.symlink(path.join(f.root,'assets/asset-used.png'),path.join(f.root,'assets/asset-link.png'));linked=true;}catch(error){if(!['EPERM','EACCES'].includes(error.code))throw error;}
  const preview=await f.cleanup(body({referencedImages:['assets/asset-used.png']}));assert.equal(preview.unusedCount,0);
  if(linked)assert.equal((await fs.lstat(path.join(f.root,'assets/asset-link.png'))).isSymbolicLink(),true);
});
