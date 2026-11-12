import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLayerPayload,createLayerDocument,normalizeLayerDocument,layerBounds } from '../public/layer-document.js';
test('layer requests stay separate from ordinary generation and accept one reference',()=>{
  for(const model of ['doubao-seedream-5-0-pro','doubao-seedream-5.0-flash']){
    const body={provider:'ark-plan',model,image:'data:image/png;base64,YWJj',prompt:''};const p=buildLayerPayload(body);
    assert.equal(p.layer_decomposition,true);assert.equal(p.size,'auto');assert.equal(p.image,body.image);assert.equal(p.sequential_image_generation,undefined);assert.equal(p.n,undefined);
    for(const bad of [{provider:'ark'},{model:'gpt-image-2'},{image:['data:image/png;base64,YWJj']},{image:'https://elsewhere.invalid/a.png'}])assert.throws(()=>buildLayerPayload({...body,...bad}));
  }
});
test('reconstruction uses base dimensions, sorts depth, and respects bounding boxes',()=>{
  const doc=createLayerDocument([{url:'/api/assets/top.png',width:2048,height:2048,z_index:2,name:'标题',bounding_box:{absolute:[100,50,400,150]}},{url:'/api/assets/base.png',width:1000,height:600,z_index:0},{url:'/api/assets/product.png',width:1024,height:1024,z_index:1,bounding_box:{normalized:[200,250,600,750]}}],'/api/assets/original.png');
  assert.equal(doc.layers[0].locked,true);assert.equal(doc.layers[1].x,200);assert.equal(doc.layers[1].width,400);assert.equal(doc.layers[1].height,300);assert.equal(doc.layers[2].width,300);
  doc.layers[1].x=777;assert.equal(doc.initialLayers[1].x,200);assert.deepEqual(normalizeLayerDocument(doc),doc);
  assert.throws(()=>createLayerDocument([{url:'x',width:100,height:100,z_index:0},{url:'y',width:20,height:20,z_index:1}]));
  assert.throws(()=>normalizeLayerDocument({...doc,width:200000}));
  assert.throws(()=>normalizeLayerDocument({...doc,layers:[{...doc.layers[0],src:'javascript:alert(1)'}]}));
  const b=layerBounds({x:10,y:20,width:100,height:50,rotation:90});assert.ok(Math.abs(b.left-35)<1e-6);assert.ok(Math.abs(b.top+5)<1e-6);
});
