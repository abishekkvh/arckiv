FROM node:22-bookworm-slim AS node-runtime
FROM python:3.13-slim-bookworm
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
ENV NODE_ENV=production PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 \
    NODE_OPTIONS=--max-old-space-size=192
WORKDIR /app
COPY ml/requirements.serve.txt /app/ml/requirements.serve.txt
RUN pip install --no-cache-dir -r ml/requirements.serve.txt
COPY server/package.json server/package-lock.json /app/server/
RUN cd server && npm ci --omit=dev && npm cache clean --force
COPY server/src /app/server/src
COPY ml/app.py ml/serve.py ml/preprocessing.py /app/ml/
COPY ml/artifacts/classifier.joblib /app/ml/artifacts/classifier.joblib
COPY deploy /app/deploy
RUN useradd --create-home --uid 10001 arckiv && chown -R arckiv:arckiv /app
USER arckiv
EXPOSE 10000
CMD ["python", "deploy/start.py"]
