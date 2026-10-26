const test=require('node:test'),assert=require('node:assert/strict');
const {classifyDocument}=require('../src/services/classifierService');
const {makeInferenceRecord,persistMonitoring}=require('../src/services/inferenceMonitoring');
const {buildFilter,pagination}=require('../src/services/adminMonitoring');
const registry=require('../src/data/modelRegistry.json');
const base={documentId:'507f1f77bcf86cd799439011',userId:'507f1f77bcf86cd799439012',file:{originalname:'invoice.pdf',mimetype:'application/pdf'},uploadedAt:new Date(),aiSuccess:true,finalCategory:'Invoice',extractedTextAvailable:true,timeline:[{stage:'gemini'}]};
const response={model_id:registry.configuredModelId,algorithm:'logistic_regression',demo:false,labels:['Invoice','Receipt','Report','Certificate'],category:'Invoice',confidence:.4,confidence_threshold:.45,scores:{Invoice:.4,Receipt:.3,Report:.2,Certificate:.1},score_type:'probability'};
test('rejected prediction retains actual model, scores and threshold in fallback log',async()=>{
 const classification=await classifyDocument('text',{env:{CLASSIFIER_URL:'http://local.invalid'},fetchImpl:async()=>({ok:true,json:async()=>response})});
 const record=makeInferenceRecord({...base,classification});
 assert.equal(record.accepted,false);assert.equal(record.geminiFallback,true);assert.equal(record.algorithm,'logistic_regression');assert.equal(record.modelId,response.model_id);assert.equal(record.scores[0].score,.4);assert.equal(record.threshold,.45);assert.equal(record.evaluationVersion,registry.models[0].evaluationVersion);
 assert.equal(record.finalSource,'gemini');assert.equal(record.predictedCategory,'Invoice');assert.equal(record.finalCategory,'Invoice');assert.equal('fullText' in record,false);
});
test('unavailable predictions have no invented scores and failed Gemini is not a successful fallback',async()=>{
 const classification=await classifyDocument('text',{env:{CLASSIFIER_URL:'http://local.invalid'},fetchImpl:async()=>{throw Error('private request payload');}});
 classification.source='default';const record=makeInferenceRecord({...base,classification,aiSuccess:false});
 assert.equal(record.modelId,null);assert.equal(record.confidence,null);assert.deepEqual(record.scores,[]);assert.equal(record.geminiFallback,false);assert.equal(record.status,'degraded');assert.ok(!JSON.stringify(record).includes('private request payload'));
});
test('monitoring rejected and stalled writes return without affecting upload caller',async()=>{
 assert.equal(await persistMonitoring({}, {model:{create:async()=>{throw Error('offline');}}}),false);
 assert.equal(await persistMonitoring({}, {model:{create:()=>new Promise(()=>{})},timeoutMs:10}),false);
 assert.equal(await persistMonitoring({}, {model:{create:async()=>({})}}),true);
});
test('query validation prevents injection and invalid date/confidence/pagination ranges',()=>{
 assert.equal(buildFilter({q:'[a.*'}).filename.$regex,'\\[a\\.\\*');
 for(const q of [{source:{$ne:''}},{from:'2026-02-30'},{from:'2026-10-02',to:'2026-10-01'},{minConfidence:'.9',maxConfidence:'.1'},{maxConfidence:'NaN'}])assert.throws(()=>buildFilter(q),e=>e.status===400);
 for(const q of [{page:'-1'},{limit:'10000'},{page:{$gt:0}}])assert.throws(()=>pagination(q),e=>e.status===400);
 assert.deepEqual(pagination({}),{page:1,limit:20});
});
