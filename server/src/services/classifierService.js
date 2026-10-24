const ALLOWED_CATEGORIES = new Set(['Invoice', 'Receipt', 'Certificate', 'Report']);

// Optional local Python inference. Failures must never block a document upload.
async function classifyDocument(text, { fetchImpl = fetch, env = process.env } = {}) {
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
      modelId: result.model_id,
      demo: result.demo,
    };
  } catch {
    return { source: 'gemini', status: 'unavailable' };
  }
}

module.exports = { classifyDocument, ALLOWED_CATEGORIES };
