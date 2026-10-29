const mongoose=require('mongoose');
const Log=require('../models/MlInferenceLog');
const History=require('../models/DocumentHistory');
const Document=require('../models/Document');
const User=require('../models/User');
const registry=require('../data/modelRegistry.json');
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
function pagination(q) {
 const integer=(v,fallback,max)=>{if(v===undefined)return fallback;if(!/^\d+$/.test(String(v))||+v<1||+v>max)fail('Invalid pagination');return +v;};
 return {page:integer(q.page,1,10000),limit:integer(q.limit,20,100)};
}
function buildFilter(q) {
 const filter={};
 for(const [key,field] of [['category','predictedCategory'],['source','finalSource'],['status','status'],['model','modelId']]){
  if(q[key]!==undefined&&q[key]!==''){if(typeof q[key]!=='string'||q[key].length>150)fail('Invalid filter');filter[field]=q[key];}
 }
 for(const [key,op] of [['from','$gte'],['to','$lte']])if(q[key]){if(typeof q[key]!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(q[key]))fail('Use YYYY-MM-DD dates');const date=new Date(q[key]+(key==='to'?'T23:59:59.999Z':'T00:00:00Z'));if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==q[key])fail('Invalid date');filter.uploadedAt={...filter.uploadedAt,[op]:date};}
 if(filter.uploadedAt?.$gte>filter.uploadedAt?.$lte)fail('Date range is reversed');
 for(const [key,op] of [['minConfidence','$gte'],['maxConfidence','$lte']])if(q[key]!==undefined&&q[key]!==''){const value=Number(q[key]);if(typeof q[key]!=='string'||!Number.isFinite(value)||value<0||value>1)fail('Confidence must be between 0 and 1');filter.confidence={...filter.confidence,[op]:value};}
 if(filter.confidence?.$gte>filter.confidence?.$lte)fail('Confidence range is reversed');
 if(q.q){if(typeof q.q!=='string'||q.q.length>100)fail('Search is too long');filter.filename={$regex:q.q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'};}
 return filter;
}
const usersJoin=[{$lookup:{from:'users',localField:'userId',foreignField:'_id',pipeline:[{$project:{_id:1,name:1,email:1}}],as:'user'}},{$set:{user:{$arrayElemAt:['$user',0]}}}];
async function decisions(q) {
 const {page,limit}=pagination(q),filter=buildFilter(q);
 const [items,total]=await Promise.all([Log.aggregate([{$match:filter},{$sort:{uploadedAt:-1,_id:-1}},{$skip:(page-1)*limit},{$limit:limit},...usersJoin,{$project:{scores:0,timeline:0,processingErrors:0}}]).option({maxTimeMS:5000}),Log.countDocuments(filter).maxTimeMS(5000)]);
 return {items,total,page,pages:Math.max(1,Math.ceil(total/limit)),limit};
}
async function decision(id) {
 if(!mongoose.isValidObjectId(id))fail('Invalid inference ID');
 const [item]=await Log.aggregate([{$match:{_id:new mongoose.Types.ObjectId(id)}},...usersJoin]).option({maxTimeMS:5000});
 if(!item)throw Object.assign(new Error('Inference record not found'),{status:404});return item;
}
async function modelHealth() {
 if(!process.env.CLASSIFIER_URL)return {ready:false,status:'not_configured'};
 try{const r=await fetch(`${process.env.CLASSIFIER_URL.replace(/\/$/,'')}/health`,{signal:AbortSignal.timeout(3000)});if(!r.ok)return {ready:false,status:'unavailable'};const h=await r.json();return {ready:h.ready===true,status:h.ready?'ready':'unavailable',modelId:h.model?.model_id || null,algorithm:h.model?.algorithm || null,threshold:h.model?.confidence_threshold ?? null};}catch{return {ready:false,status:'unavailable'};}
}
const countIf=condition=>({$sum:{$cond:[condition,1,0]}});
const day={$dateToString:{format:'%Y-%m-%d',date:'$uploadedAt',timezone:'UTC'}};
async function analytics() {
 const since=new Date(Date.now()-29*86400000);since.setUTCHours(0,0,0,0);
 const todayStart=new Date();todayStart.setUTCHours(0,0,0,0);
 const [totalUsers,activeUsers,disabledUsers,totalDocuments,storageStats,todayUploads,types,categories,uploads,userGrowth,all,charts,recentHistory,health]=await Promise.all([
 User.countDocuments(),
 User.countDocuments({status:{$ne:'disabled'}}),
 User.countDocuments({status:'disabled'}),
 Document.countDocuments(),
 Document.aggregate([{$group:{_id:null,bytes:{$sum:'$size'}}}]),
 Document.countDocuments({createdAt:{$gte:todayStart}}),
 Document.aggregate([{$group:{_id:{$switch:{branches:[{case:{$eq:['$type','application/pdf']},then:'PDF'},{case:{$regexMatch:{input:'$type',regex:'^image/'}},then:'Image'},{case:{$eq:['$type','application/vnd.openxmlformats-officedocument.wordprocessingml.document']},then:'DOCX'}],default:'Other'}},count:{$sum:1}}}]),
 Document.aggregate([{$group:{_id:'$category',count:{$sum:1}}},{$sort:{count:-1}},{$limit:30}]),
 Document.aggregate([{$match:{createdAt:{$gte:since}}},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt',timezone:'UTC'}},count:{$sum:1}}},{$sort:{_id:1}}]),
 User.aggregate([{$match:{createdAt:{$gte:since}}},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt',timezone:'UTC'}},count:{$sum:1}}},{$sort:{_id:1}}]),
 Log.aggregate([{$group:{
   _id:null, records:{$sum:1},
   mlAttempts:countIf({$not:[{$in:['$decisionStatus',['disabled','no_text','not_run']]}]}),
   accepted:countIf('$accepted'), fallbacks:countIf('$geminiFallback'),
   failed:countIf({$or:[{$eq:['$status','failed']},{$in:['$finalSource',['default','other']]}]}),
   averageMs:{$avg:'$durationMs'}, averageInferenceMs:{$avg:'$inferenceDurationMs'},
   extractionFailures:countIf({$eq:['$extractionStatus','unavailable']}),
   mlFailures:countIf({$in:['$decisionStatus',['unavailable','invalid_confidence','model_mismatch','experimental_model_rejected','demo_model_rejected']]})
 }}]),
 Log.aggregate([{$match:{uploadedAt:{$gte:since}}},{$facet:{
  confidence:[{$match:{confidence:{$type:'number'}}},{$bucket:{groupBy:'$confidence',boundaries:[0,.2,.4,.6,.8,1.000001],default:'unknown',output:{count:{$sum:1}}}}],
  sources:[{$group:{_id:'$finalSource',count:{$sum:1}}}],
  trends:[{$group:{_id:{day,model:'$modelId',category:'$predictedCategory'},count:{$sum:1}}},{$sort:{'_id.day':1}},{$limit:300}],
  failures:[{$match:{$or:[{status:{$ne:'completed'}},{'processingErrors.0':{$exists:true}}]}},{$group:{_id:day,count:{$sum:1}}},{$sort:{_id:1}}],
  recent:[{$sort:{uploadedAt:-1,_id:-1}},{$limit:12},...usersJoin,{$project:{documentId:1,filename:1,status:1,decisionStatus:1,finalSource:1,predictedCategory:1,finalCategory:1,confidence:1,uploadedAt:1,durationMs:1,processingErrors:1,user:1}}]
 }}]).option({maxTimeMS:5000}),
 History.aggregate([
  {$sort:{createdAt:-1,_id:-1}},
  {$limit:15},
  ...usersJoin,
  {$lookup:{from:'documents',localField:'documentId',foreignField:'_id',pipeline:[{$project:{name:1,category:1,type:1}}],as:'doc'}},
  {$set:{doc:{$arrayElemAt:['$doc',0]}}},
  {$project:{action:1,createdAt:1,metadata:1,user:1,doc:1}}
 ]),
 modelHealth()]);
 const totals=all[0]||{records:0,mlAttempts:0,accepted:0,fallbacks:0,failed:0,averageMs:null,averageInferenceMs:null,extractionFailures:0,mlFailures:0};
 const totalStorageBytes=(storageStats[0]?.bytes)||0;
 return {totalUsers,activeUsers,disabledUsers,totalDocuments,totalStorageBytes,todayUploads,types,categories,uploads,userGrowth,totals:{...totals,acceptanceRate:totals.mlAttempts?totals.accepted/totals.mlAttempts:null,fallbackRate:totals.records?totals.fallbacks/totals.records:null},charts:charts[0],recentHistory,health,window:{from:since.toISOString(),days:30,timezone:'UTC'},coverage:'Only new monitored uploads have inference records; existing documents are not backfilled.',registeredUsersScope:'Arckiv accounts synced to MongoDB, not all Firebase project accounts.'};
}
function reviewPipeline() {return [{$match:{'metadata.categoryReview':{$exists:true}}},{$sort:{createdAt:-1,_id:-1}},{$group:{_id:'$documentId',review:{$first:'$$ROOT'}}},{$replaceRoot:{newRoot:'$review'}},{$set:{originalPrediction:'$metadata.categoryReview.predictedCategory',reviewedCategory:'$metadata.categoryReview.to',modelId:'$metadata.categoryReview.modelId',changed:{$ne:['$metadata.categoryReview.from','$metadata.categoryReview.to']}}}];}
async function quality(q) {
 const {page,limit}=pagination(q);
 const [result]=await History.aggregate([...reviewPipeline(),{$facet:{
  items:[{$sort:{createdAt:-1,_id:-1}},{$skip:(page-1)*limit},{$limit:limit},...usersJoin,{$project:{_id:1,documentId:1,user:1,createdAt:1,originalPrediction:1,reviewedCategory:1,modelId:1,kind:'$metadata.categoryReview.kind',verifiedGroundTruth:'$metadata.categoryReview.verifiedGroundTruth'}}],
  totals:[{$group:{_id:null,reviewed:{$sum:1},comparable:{$sum:{$cond:[{$ne:[{$ifNull:['$originalPrediction',null]},null]},1,0]}},agree:{$sum:{$cond:[{$and:[{$ne:[{$ifNull:['$originalPrediction',null]},null]},{$eq:['$originalPrediction','$reviewedCategory']}]},1,0]}},corrected:{$sum:{$cond:[{$and:[{$ne:[{$ifNull:['$originalPrediction',null]},null]},{$ne:['$originalPrediction','$reviewedCategory']}]},1,0]}}}}],
  categories:[{$match:{originalPrediction:{$ne:null},$expr:{$ne:['$originalPrediction','$reviewedCategory']}}},{$group:{_id:{from:'$originalPrediction',to:'$reviewedCategory'},count:{$sum:1}}},{$sort:{count:-1}},{$limit:30}],
  trends:[{$match:{originalPrediction:{$ne:null},$expr:{$ne:['$originalPrediction','$reviewedCategory']}}},{$group:{_id:{month:{$dateToString:{format:'%Y-%m',date:'$createdAt'}},category:'$originalPrediction'},count:{$sum:1}}},{$sort:{'_id.month':-1}},{$limit:36}]
 }}]).option({maxTimeMS:5000});
 const totals=result.totals[0] || {reviewed:0,comparable:0,agree:0,corrected:0};
 return {...result,totals:{...totals,agreementRate:totals.comparable?totals.agree/totals.comparable:null,productionAccuracy:null},page,limit,pages:Math.max(1,Math.ceil(totals.reviewed/limit)),notice:'Latest explicit review or correction per document. User feedback is not verified ground truth; agreement is not production accuracy. Legacy edits without prediction provenance are excluded.'};
}
module.exports={pagination,buildFilter,decisions,decision,analytics,quality,modelHealth,registry};
