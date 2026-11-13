import test from 'node:test';
import assert from 'node:assert/strict';
import {applyLocalEditToLayers,localEditAlreadyApplied} from '../public/local-edit-apply.js';
import {normalizeLayerDocument} from '../public/layer-document.js';
import {allLayerSources,restoreLayerGroup} from '../public/layer-tree.js';
const image={id:'base',src:'/api/assets/original.png',name:'背景',x:0,y:0,width:2848,height:1600,rotation:0,opacity:1,visible:true,locked:true};
const doc={version:1,name:'海报',width:2848,height:1600,layers:[image],initialLayers:[image]};
test('apply raster in same layered document with exact original and initial layouts recoverable',()=>{
  const original=normalizeLayerDocument(doc),before=structuredClone(original),result=applyLocalEditToLayers(original,'/api/assets/edited.png',2848,1600);
  assert.deepEqual(original,before);assert.equal(result.layers[0].children[0].src,'/api/assets/edited.png');assert.deepEqual(result.layers[0].backup.children,original.layers);assert.deepEqual(result.initialLayers,original.initialLayers);
  assert.ok(allLayerSources(result.layers).includes(image.src));restoreLayerGroup(result,result.layers[0].id);assert.deepEqual(result.layers[0].children,original.layers);
  assert.throws(()=>applyLocalEditToLayers(original,'/api/assets/edited.png',720,405));
});
test('full 64-layer artwork retains layers and subsequent edit can restore preceding raster',()=>{
  const full={...doc,layers:Array.from({length:64},(_,i)=>({...image,id:'old-'+i}))},one=applyLocalEditToLayers(full,'/api/assets/one.png',2848,1600),two=applyLocalEditToLayers(one,'/api/assets/two.png',2848,1600);
  restoreLayerGroup(two,two.layers[0].id);assert.deepEqual(two.layers[0].children,one.layers);assert.equal(allLayerSources(two.layers).filter(s=>s===image.src).length,64);
});
test('legacy save-copy session is not mistaken for application to original node',()=>{
  const session={status:'applied',source:'/before.png',result:{url:'/after.png'}};assert.equal(localEditAlreadyApplied(session,'/before.png'),false);assert.equal(localEditAlreadyApplied(session,'/after.png'),true);assert.equal(localEditAlreadyApplied({...session,status:'preview'},'/before.png'),false);assert.equal(localEditAlreadyApplied({...session,appliedToNode:true},'/saved-layer-composite.png'),true);
});
