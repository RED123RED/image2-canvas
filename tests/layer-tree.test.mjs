import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLayerDocument} from '../public/layer-document.js';
import {applyLayerRefinement,restoreLayerGroup,moveEntry,leafLayers,allLayerSources,orderEntries,selectedRoots,findLayer,effectiveLocked} from '../public/layer-tree.js';
const layer=(id,extra={})=>({id,src:'/api/assets/'+id+'.png',name:id,x:0,y:0,width:200,height:100,rotation:0,opacity:1,visible:true,locked:false,flipX:false,flipY:false,...extra});
const document=layers=>({version:1,name:'Test',width:1000,height:600,originalSrc:'',layers,initialLayers:structuredClone(layers)});
const candidate=document([layer('base',{width:1000,height:600}),layer('subject',{x:100,y:120,width:300,height:180})]);
let sequence=0;const id=()=>String(++sequence);
test('legacy v1 remains equivalent; refinement replaces only selected layer in its stack',()=>{
 const original=normalizeLayerDocument(document([layer('target',{x:30,y:40,width:500,height:300,locked:true,opacity:.4}),layer('untouched')]));
 assert.deepEqual(normalizeLayerDocument(original),original);
 const {doc,groupId}=applyLayerRefinement(original,'target',candidate,id);const group=doc.layers[0];
 assert.equal(doc.version,2);assert.equal(group.id,groupId);assert.equal(group.opacity,.4);assert.equal(group.locked,false);assert.deepEqual(group.backup,original.layers[0]);assert.deepEqual(doc.layers[1],original.layers[1]);assert.deepEqual(doc.initialLayers,original.initialLayers);
 assert.deepEqual([group.children[1].x,group.children[1].y,group.children[1].width,group.children[1].height],[80,100,150,90]);assert.equal(group.children[1].opacity,1);assert.equal(leafLayers(doc.layers).length,3);assert(allLayerSources(doc.layers).includes('/api/assets/target.png'));
 restoreLayerGroup(doc,groupId);assert.deepEqual(doc.layers,original.layers);
});
test('rotation and flips preserve all candidate corner positions',()=>{
 for(const rotation of [0,30,90,-45])for(const flipX of [false,true])for(const flipY of [false,true]){
  const source=layer('source',{x:50,y:30,width:500,height:300,rotation,flipX,flipY});const {doc}=applyLayerRefinement(document([source]),'source',candidate,id),part=doc.layers[0].children[1];
  const transform=(l,u,v)=>{const a=l.rotation*Math.PI/180,dx=(u-.5)*l.width*(l.flipX?-1:1),dy=(v-.5)*l.height*(l.flipY?-1:1);return [l.x+l.width/2+dx*Math.cos(a)-dy*Math.sin(a),l.y+l.height/2+dx*Math.sin(a)+dy*Math.cos(a)];};
  for(const u of [0,1])for(const v of [0,1]){const want=transform(source,(100+u*300)/1000,(120+v*180)/600),actual=transform(part,u,v);actual.forEach((x,i)=>assert(Math.abs(x-want[i])<1e-8));}
 }
});
test('nested refinement, move, sibling ordering, inherited lock and backups stay coherent',()=>{
 let {doc,groupId}=applyLayerRefinement(document([layer('source'),layer('outer')]),'source',candidate,id);const target=doc.layers[0].children[1].id;doc=applyLayerRefinement(doc,target,candidate,id).doc;
 const group=doc.layers[0],nested=group.children[1],before=structuredClone(nested.backup);moveEntry(group,23,-7);assert.equal(nested.backup.x,before.x+23);assert.equal(nested.backup.y,before.y-7);
 orderEntries(doc.layers,new Set([nested.children[0].id]),'top');assert.equal(doc.layers[1].id,'outer');assert.equal(group.children[1],nested);
 group.locked=true;const selection=selectedRoots(doc.layers,new Set([nested.children[0].id]));assert(effectiveLocked(selection[0]));assert.equal(selectedRoots(doc.layers,new Set([groupId,nested.children[0].id])).length,1);
 restoreLayerGroup(doc,nested.id);assert.equal(findLayer(doc.layers,target).entry.x,before.x+23);assert.equal(doc.layers[1].id,'outer');
});
test('normalization rejects duplicate nested ids and total leaf overflow',()=>{
 assert.throws(()=>normalizeLayerDocument({...document([]),version:2,layers:[{id:'g',type:'group',children:[layer('same'),layer('same')]}]}),/编号重复/);
 assert.throws(()=>normalizeLayerDocument({...document([]),version:2,layers:[{id:'g',type:'group',children:Array.from({length:65},(_,i)=>layer('l'+i))}]}),/64/);
 assert.throws(()=>applyLayerRefinement(document([layer('source')]),'missing',candidate,id),/现有图片/);
});
