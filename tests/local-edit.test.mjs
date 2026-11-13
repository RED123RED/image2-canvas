import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMarks,normalizedPoint,editSize,buildLocalEditPrompt,buildLocalEditPayload,localEditSources} from '../public/local-edit-document.js';
const mark=(kind,points,text='改成蓝色')=>({id:kind,kind,points,text,enabled:true});
test('coordinates, disabled annotations and guide instructions are deterministic',()=>{
  assert.deepEqual(normalizedPoint(300,150,600,300),[.5,.5]);assert.deepEqual(normalizedPoint(-10,600,600,300),[0,1]);
  const marks=[mark('point',[[1,0]]),mark('rect',[[.8,.9],[.2,.3]]),{...mark('pen',[[.1,.1],[.2,.2]],'ignore'),enabled:false}];
  const p=buildLocalEditPrompt(marks,'保持文字',true);assert.ok(p.includes('<point>999 0</point>'));assert.ok(p.includes('<bbox>200 300 800 900</bbox>'));assert.ok(p.includes('图2'));assert.ok(!p.includes('ignore'));
  assert.throws(()=>buildLocalEditPrompt([],''));assert.throws(()=>normalizeMarks([mark('point',[[NaN,1]])]));assert.throws(()=>normalizeMarks([mark('rect',[[0,0]])]));
  assert.throws(()=>normalizeMarks([mark('point',[[0,0]]),mark('point',[[1,1]])]));
});
test('output dimensions preserve varied source aspect ratios within provider bounds',()=>{
  for(const [w,h] of [[2848,1600],[700,600],[15,240],[240,15],[6000,6000],[4096,2160],[33,32]]){const [x,y]=editSize(w,h).split('x').map(Number);assert.ok(x*y>=921600&&x*y<=4624220);assert.ok(x/y>=1/16&&x/y<=16);assert.ok(Math.abs((x/y)/(w/h)-1)<.015);}
  assert.equal(editSize(2848,1600),'2848x1600');assert.throws(()=>editSize(10000,10000));assert.throws(()=>editSize(10,10));
});
test('local edit payload cannot change provider or enable layers and preserves custom aspect',()=>{
  const body={provider:'ark-plan',model:'doubao-seedream-5-0-pro',prompt:'修改',size:'1200x1000',references:['data:image/png;base64,YWJj']};
  const p=buildLocalEditPayload(body);assert.equal(p.size,'1200x1000');assert.equal(p.image,body.references[0]);assert.equal(p.mask,undefined);assert.equal(p.layer_decomposition,undefined);
  assert.equal(buildLocalEditPayload({...body,model:'doubao-seedream-5.0-flash',references:[...body.references,...body.references]}).image.length,2);
  for(const bad of [{provider:'ark'},{model:'gpt-image-2'},{size:'2K'},{size:'15x15'},{references:[]}])assert.throws(()=>buildLocalEditPayload({...body,...bad}));
  assert.deepEqual(localEditSources({source:'a',rawResult:{url:'b'},result:{url:'c'},history:[{before:'d',after:'e'}]}),['a','c','b','d','e']);
});
