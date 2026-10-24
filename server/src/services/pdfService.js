const { execFile } = require('child_process');
const path = require('path');
const util = require('util');
const execFileAsync = util.promisify(execFile);

/**
 * Renders question-relevant PDF pages to high-resolution PNG base64 strings
 * using a Python microservice with PyMuPDF.
 *
 * Strategy:
 *   - Small PDFs (≤5 pages): all pages are rendered.
 *   - Larger PDFs: pages are scored against the user's query keywords.
 *     Top-scoring pages are rendered. If no keywords match, a distributed
 *     fallback (first, last, evenly-spaced middle pages) is used.
 *
 * @param {string} pdfPath      - Absolute path to the PDF file
 * @param {number} maxPages     - Maximum number of pages to render (default 5)
 * @param {string} searchQuery  - The user's chat message, used for page scoring
 * @returns {Promise<{images: string[], pageNumbers: number[]}>}
 *   images:      Array of base64 encoded PNG strings
 *   pageNumbers: Corresponding 1-indexed page numbers
 */
async function renderPdfPagesToImages(pdfPath, maxPages = 5, searchQuery = '') {
  try {
    const pythonScript = path.join(__dirname, '../utils/pdfRenderer.py');

    const { stdout, stderr } = await execFileAsync('python3', [
      pythonScript,
      pdfPath,
      maxPages.toString(),
      searchQuery
    ], { timeout: 15000, maxBuffer: 1024 * 1024 * 50 }); // 50 MB buffer

    if (stderr && stderr.trim().length > 0) {
      console.warn('PDF Renderer Warning:', stderr);
    }

    // Extract JSON — C libraries may print warnings before the JSON object
    const jsonStartIndex = stdout.indexOf('{');
    if (jsonStartIndex === -1) {
      throw new Error('No JSON object found in python script output');
    }
    const cleanJsonStr = stdout.substring(jsonStartIndex);
    const result = JSON.parse(cleanJsonStr);

    if (result.error) {
      throw new Error(result.error);
    }

    return {
      images: result.images || [],
      pageNumbers: result.pageNumbers || [],
    };
  } catch (error) {
    console.error('Failed to render PDF to images:', error.message);
    // Return empty results so AI can gracefully fallback to raw PDF + OCR text
    return { images: [], pageNumbers: [] };
  }
}

async function extractPdfText(pdfPath) {
  try {
    const { stdout } = await execFileAsync(process.execPath, [path.join(__dirname, '../utils/extractPdfText.js'), pdfPath], { timeout: 10000, maxBuffer: 2 * 1024 * 1024 });
    return JSON.parse(stdout);
  } catch { return { text: '', complete: false }; }
}

module.exports = {
  extractPdfText,
  renderPdfPagesToImages
};
