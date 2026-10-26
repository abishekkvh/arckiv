const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const User = require('../models/User');
const Document = require('../models/Document');
const evaluation = require('../data/modelEvaluation.json');
router.use(requireAuth, requireAdmin);
router.get('/overview', async (req,res,next) => {
 try {
  const page = Math.max(1, Math.min(100000, parseInt(req.query.page,10) || 1));
  const [totalUsers, totalDocuments, users, classifications] = await Promise.all([
   User.countDocuments(), Document.countDocuments(),
   User.aggregate([{ $sort: {createdAt:-1,_id:1} },{$skip:(page-1)*20},{$limit:20},
    {$lookup:{from:'documents',let:{owner:'$_id'},pipeline:[{$match:{$expr:{$eq:['$userId','$$owner']}}},{$group:{_id:null,count:{$sum:1},bytes:{$sum:'$size'}}}],as:'usage'}},
    {$project:{name:1,email:1,createdAt:1,documentCount:{$ifNull:[{$arrayElemAt:['$usage.count',0]},0]},storageBytes:{$ifNull:[{$arrayElemAt:['$usage.bytes',0]},0]}}}]),
   Document.aggregate([{$group:{_id:{$ifNull:['$classification.source','unclassified']},count:{$sum:1}}}])
  ]);
  let model = {ready:false};
  try { const r=await fetch(`${process.env.CLASSIFIER_URL}/health`,{signal:AbortSignal.timeout(3000)}); if(r.ok) model=await r.json(); } catch {}
  res.json({totalUsers,totalDocuments,users,page,pages:Math.max(1,Math.ceil(totalUsers/20)),classifications,model,evaluation});
 } catch(e) {next(e);}
});
const monitoring = require('../services/adminMonitoring');
for (const [path, handler] of [
  ['/inferences', req => monitoring.decisions(req.query)],
  ['/inferences/:id', req => monitoring.decision(req.params.id)],
  ['/analytics', () => monitoring.analytics()],
  ['/quality', req => monitoring.quality(req.query)],
  ['/registry', async () => ({...monitoring.registry,health:await monitoring.modelHealth()})],
]) router.get(path, async(req,res,next)=>{try{res.json(await handler(req));}catch(e){next(e);}});
module.exports=router;
