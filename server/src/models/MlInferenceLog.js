const mongoose = require('mongoose');
const schema = new mongoose.Schema({
 documentId: {type:mongoose.Schema.Types.ObjectId,ref:'Document',required:true},
 userId: {type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
 filename:{type:String,maxLength:255}, format:{type:String,maxLength:120},
 uploadedAt:Date, inferenceStartedAt:Date, inferenceCompletedAt:Date,
 confidenceMethod:String, modelId:String, expectedModelId:String, algorithm:String, estimatorClass:String, pipelineVersion:String, evaluationVersion:String,
 predictedCategory:String, finalCategory:String, confidence:{type:Number,min:0,max:1,default:null}, threshold:{type:Number,min:0,max:1,default:null},
 scores:[{_id:false,category:String,score:Number}],scoreType:{type:String,enum:['probability','decision_margin',null],default:null},
 accepted:Boolean, geminiAttempted:Boolean, geminiSucceeded:Boolean, geminiFallback:Boolean,
 finalSource:{type:String,enum:['ml','gemini','default','manual','other']}, decisionStatus:String, reason:String,
 status:{type:String,enum:['completed','degraded','failed'],required:true}, durationMs:Number, inferenceDurationMs:Number,
 extractionStatus:{type:String,enum:['available','unavailable','not_attempted']},
 timeline:[{_id:false,stage:String,startedAt:Date,completedAt:Date,durationMs:Number,status:String}],
 processingErrors:[{_id:false,stage:String,code:String}],
}, {timestamps:true,collection:'mlInferenceLogs',bufferCommands:false});
schema.index({uploadedAt:-1,_id:-1});
schema.index({documentId:1,uploadedAt:-1});
schema.index({userId:1,uploadedAt:-1});
for(const field of ['modelId','finalSource','predictedCategory','status'])schema.index({[field]:1,uploadedAt:-1});
schema.index({confidence:1,uploadedAt:-1});
module.exports=mongoose.model('MlInferenceLog',schema);
