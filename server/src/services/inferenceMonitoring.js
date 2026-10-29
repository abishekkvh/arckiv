const Log=require('../models/MlInferenceLog');
const registry=require('../data/modelRegistry.json');
const validSources=new Set(['ml','gemini','default','manual']);
function makeInferenceRecord({documentId,userId,file,uploadedAt,classification={},aiSuccess=false,finalCategory,extractedTextAvailable=false,timeline=[],errors=[],failed=false}) {
 const completedAt=new Date();
 return { documentId,userId,filename:file.originalname?.slice(0,255),format:file.mimetype,uploadedAt,
  inferenceStartedAt:timeline.find(t=>t.stage==='ml')?.startedAt || null,inferenceCompletedAt:timeline.find(t=>t.stage==='ml')?.completedAt || null,
  modelId:classification.modelId || null,expectedModelId:process.env.CLASSIFIER_EXPECTED_MODEL_ID || null,
  algorithm:classification.algorithm || null,estimatorClass:classification.estimatorClass || null,pipelineVersion:classification.pipelineVersion || null,
  evaluationVersion:registry.models.find(m=>m.modelId===classification.modelId)?.evaluationVersion || null,
  predictedCategory:classification.predictionCategory ?? classification.category ?? null,finalCategory:finalCategory || null,
  confidenceMethod:classification.confidenceMethod || null,confidence:classification.confidence ?? null,threshold:classification.threshold ?? null,scores:classification.scores || [],scoreType:classification.scoreType || null,
  requiresReview:classification.source==='default' || classification.requiresReview===true,inputMetadata:classification.inputMetadata,
  accepted:classification.source==='ml',geminiAttempted:timeline.some(t=>t.stage==='gemini'),geminiSucceeded:aiSuccess,
  geminiFallback:classification.source==='gemini' && aiSuccess,
  finalSource:validSources.has(classification.source)?classification.source:'other',decisionStatus:classification.status || 'not_run',
  reason:classification.reason || 'Processing failed before the ML decision was available.',
  status:failed?'failed':(!aiSuccess || ['default','other'].includes(classification.source))?'degraded':'completed',
  durationMs:completedAt-new Date(uploadedAt),inferenceDurationMs:classification.durationMs ?? null,
  extractionStatus:extractedTextAvailable?'available':timeline.length?'unavailable':'not_attempted',timeline,processingErrors:errors,
 };
}
// A bounded, best-effort write outside upload/edit transactions. Failures never roll back user data.
async function persistMonitoring(record,{model=Log,timeoutMs=750}={}) {
 let timer;
 try {await Promise.race([model.create(record),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('monitoring_timeout')),timeoutMs);})]);return true;}
 catch {console.warn('[ML_MONITORING_WRITE_FAILED]');return false;}finally{clearTimeout(timer);}
}
module.exports={makeInferenceRecord,persistMonitoring};
