"""Build a metadata-only registry from existing reports; never train or load models."""
import hashlib, json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
production=json.loads((root/'deploy/model-manifest.json').read_text())
models=[]
for relative in ['ml/artifacts/evaluation.json','ml/artifacts/production-v1/evaluation.json','ml/artifacts/doclaynet-v1/evaluation.json']:
 path=root/relative
 if not path.exists(): continue
 e=json.loads(path.read_text()); digest=hashlib.sha256(path.read_bytes()).hexdigest()
 metrics=[]
 for algorithm, values in e.get('validation',{}).items():
  if isinstance(values,dict) and 'accuracy' in values:
   metrics.append({'algorithm':algorithm,'split':'validation',**{k:values.get(k) for k in ['accuracy','macro_precision','macro_recall','macro_f1','rows','confusion_matrix','training_seconds','prediction_ms_per_document']}})
 if e.get('test'): metrics.append({'algorithm':e.get('algorithm'),'split':'test',**{k:e['test'].get(k) for k in ['accuracy','macro_precision','macro_recall','macro_f1','rows','confusion_matrix','prediction_ms_per_document']}})
 models.append({'modelId':e.get('model_id'),'algorithm':e.get('algorithm'),'labels':e.get('labels',[]),'threshold':e.get('confidence_threshold'),
  'configuredProduction':e.get('model_id')==production['model_id'],'experimental':e.get('experimental',False),'demo':e.get('demo',False),
  'evaluationVersion':digest,'evaluationDate':e.get('evaluation_date') or e.get('created_at'),
  'artifacts':[{'path':relative,'sha256':digest}], 'dataset':{'sha256':e.get('dataset_sha256'),'splitRows':e.get('split_rows'),'scope':e.get('scope')},
  'featureExtraction':{'method':'TF-IDF' if 'tfidf' in e.get('config',{}) else None,'configuration':e.get('config',{}).get('tfidf'),'vocabularySize':e.get('vocabulary_size'),'preprocessingVersion':e.get('preprocessing_version')},
  'selectionMetric':e.get('selection_metric'),'metrics':metrics,
  'calibration':{k:e.get('validation_calibration',{}).get(k) for k in ['brier_score','ece','mce']}})
output={'configuredModelId':production['model_id'],'artifactSha256':production['sha256'],'models':models,
 'selectionEvidence':{'source':'ml/train_v2.py:259-260','explanation':'V2 explicitly retains Logistic Regression as the primary model with predict_proba. Logistic Regression and Linear SVM tie on the recorded V2 validation metrics. Native probability outputs support the confidence gate; the code does not run both models or select a winner per upload. Recorded calibration error is not a guarantee of calibrated production probabilities.'},
 'limitations':['Offline metrics are report results, not production accuracy.','Evaluation dates are unavailable unless explicitly recorded.','Different report versions use different datasets and are not directly comparable.','Linear SVM is a validation benchmark, not a separately deployed V2 model.']}
(root/'server/src/data/modelRegistry.json').write_text(json.dumps(output,indent=2)+'\n')
print('Registry generated from',len(models),'existing evaluation reports')
