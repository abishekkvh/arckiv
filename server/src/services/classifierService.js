const ALLOWED_CATEGORIES = new Set(['Invoice', 'Receipt', 'Certificate', 'Report']);

// Optional local Python inference. Failures must never block a document upload.
async function decideClassification(text, { fetchImpl = fetch, env = process.env, capture = () => {} } = {}) {
  const fallback = { source: 'gemini', status: 'disabled' };
  if (!env.CLASSIFIER_URL) return fallback;
  if (typeof text !== 'string' || !text.trim()) {
    return { source: 'gemini', status: 'no_text' };
  }
  try {
    const response = await fetchImpl(`${env.CLASSIFIER_URL.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 100000) }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Classifier unavailable');
    const result = await response.json();
    capture(result);
    if (typeof result.demo !== 'boolean' || typeof result.model_id !== 'string') {
      throw new Error('Invalid classifier metadata');
    }
    if (env.CLASSIFIER_EXPECTED_MODEL_ID && result.model_id !== env.CLASSIFIER_EXPECTED_MODEL_ID) {
      return { source: 'gemini', status: 'model_mismatch' };
    }
    // Six-category experiments must never overwrite normal Arckiv categories,
    // even if CLASSIFIER_URL accidentally points to the experimental service.
    if (result.experimental === true) {
      return { source: 'gemini', status: 'experimental_model_rejected' };
    }
    if (result.demo && env.CLASSIFIER_ALLOW_DEMO !== 'true') {
      return { source: 'gemini', status: 'demo_model_rejected' };
    }
    if (result.category === null && result.reason === 'no_known_terms') {
      return { source: 'gemini', status: 'no_known_terms' };
    }
    if (typeof result.category !== 'string' || !result.category.trim() ||
        result.category.length > 100 || !Array.isArray(result.labels) ||
        !result.labels.includes(result.category)) {
      throw new Error('Invalid classifier prediction');
    }

    if (!ALLOWED_CATEGORIES.has(result.category)) {
      return { source: 'gemini', status: 'unsupported_category', category: result.category };
    }

    const minConfidence = Number(
      env.CLASSIFIER_MIN_CONFIDENCE ||
      (typeof result.confidence_threshold === 'number' ? result.confidence_threshold : 0.65)
    );

    if (!Number.isFinite(minConfidence) || minConfidence < 0 || minConfidence > 1 ||
        !Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) {
      return { source: 'gemini', status: 'invalid_confidence' };
    }

    if (result.confidence < minConfidence) {
      return {
        source: 'gemini',
        status: 'low_confidence',
        category: result.category,
        confidence: result.confidence,
        threshold: minConfidence,
      };
    }

    return {
      source: 'ml',
      status: 'predicted',
      category: result.category,
      confidence: typeof result.confidence === 'number' ? result.confidence : null,
      threshold: minConfidence,
      modelId: result.model_id,
      demo: result.demo,
    };
  } catch {
    return { source: 'gemini', status: 'unavailable' };
  }
}

const DECISION_REASONS = {
  predicted: 'The supported prediction met the configured confidence threshold.',
  low_confidence: 'The prediction was below the confidence threshold; Gemini category is retained when available.',
  disabled: 'The ML inference service is not configured.', no_text: 'No extracted text was available for ML inference.',
  no_known_terms: 'No document terms matched the model vocabulary.', model_mismatch: 'The returned model did not match the required production model.',
  experimental_model_rejected: 'An experimental model cannot classify production documents.', demo_model_rejected: 'Demo model predictions are disabled.',
  unsupported_category: 'The prediction was outside the production category set.', invalid_confidence: 'The score or threshold was missing or invalid.',
  unavailable: 'The model request failed, timed out, or returned an invalid response.'
};
async function classifyDocument(text, options = {}) {
  const started = Date.now(); let raw = {};
  const decision = await decideClassification(text, { ...options, capture: result => { raw = result || {}; } });
  const string = value => typeof value === 'string' ? value.slice(0, 150) : null;
  const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
  const scoreType = ['probability', 'decision_margin'].includes(raw.score_type) ? raw.score_type : null;
  const scores = scoreType && raw.scores && typeof raw.scores === 'object' && !Array.isArray(raw.scores)
    ? Object.entries(raw.scores).slice(0, 50).filter(([label,value]) => label.length <= 100 && finite(value) !== null && (scoreType !== 'probability' || (value >= 0 && value <= 1))).map(([category,score]) => ({ category, score })) : [];
  const env = options.env || process.env;
  const configured = env.CLASSIFIER_MIN_CONFIDENCE !== undefined ? Number(env.CLASSIFIER_MIN_CONFIDENCE) : raw.confidence_threshold;
  const threshold = decision.threshold ?? (finite(configured) !== null && configured >= 0 && configured <= 1 ? configured : null);
  return { ...decision, modelId: string(raw.model_id), algorithm: string(raw.algorithm), estimatorClass: string(raw.estimator_class),
    pipelineVersion: string(raw.preprocessing_version), predictionCategory: string(raw.category),
    confidence: decision.confidence ?? (finite(raw.confidence) !== null && raw.confidence >= 0 && raw.confidence <= 1 ? raw.confidence : null),
    threshold, scores, scoreType, confidenceMethod: string(raw.confidence_method), accepted: decision.source === 'ml', durationMs: Date.now() - started,
    reason: DECISION_REASONS[decision.status] || 'No decision reason recorded.',
  };
}
module.exports = { classifyDocument, ALLOWED_CATEGORIES, DECISION_REASONS };
