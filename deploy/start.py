"""Run Express and private FastAPI in one free Render service; supervise both."""
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'deploy/model-manifest.json').read_text())
model = ROOT / manifest['artifact']
if hashlib.sha256(model.read_bytes()).hexdigest() != manifest['sha256']:
    raise SystemExit('Model checksum differs from deployment manifest. Review the model update before deploying.')
ml_port = os.environ.get('INTERNAL_ML_PORT', '8001')
env = os.environ.copy()
env.update(CLASSIFIER_MODEL_PATH=str(model), CLASSIFIER_URL=f'http://127.0.0.1:{ml_port}',
           CLASSIFIER_REQUIRED='true', CLASSIFIER_EXPECTED_MODEL_ID=manifest['model_id'])
configured = env.get('CLASSIFIER_MIN_CONFIDENCE', str(manifest['confidence_threshold']))
if float(configured) != manifest['confidence_threshold']:
    raise SystemExit('Configured confidence threshold differs from the reviewed V2 deployment manifest.')
env['CLASSIFIER_MIN_CONFIDENCE'] = configured
for key in ('OPENBLAS_NUM_THREADS', 'OMP_NUM_THREADS', 'MKL_NUM_THREADS'):
    env[key] = '1'
children = []
def stop(*_):
    for child in children:
        if child.poll() is None: child.terminate()
    for child in children:
        try: child.wait(timeout=10)
        except subprocess.TimeoutExpired: child.kill()
signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
try:
    children.append(subprocess.Popen([sys.executable, 'serve.py', '--host', '127.0.0.1', '--port', ml_port], cwd=ROOT / 'ml', env=env))
    for attempt in range(60):
        if children[0].poll() is not None: raise RuntimeError('Classifier exited during startup')
        try:
            with urlopen(env['CLASSIFIER_URL'] + '/health', timeout=1) as response:
                health = json.load(response)
            if health.get('ready') and health['model']['model_id'] == manifest['model_id']:
                break
        except (OSError, ValueError): pass
        time.sleep(1)
    else: raise RuntimeError('Classifier did not become ready within 60 seconds')
    print(f"Verified ML V2: {manifest['model_id']} at threshold {configured}", flush=True)
    children.append(subprocess.Popen(['node', 'src/server.js'], cwd=ROOT / 'server', env=env))
    while all(child.poll() is None for child in children): time.sleep(1)
    raise RuntimeError('A required service exited; restarting the deployment is required')
finally:
    stop()
