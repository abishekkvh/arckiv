const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const { renderPdfPagesToImages, extractPdfText } = require('./pdfService');

function validateAnalysis(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      typeof value.summary !== 'string' || typeof value.fullText !== 'string' ||
      typeof value.category !== 'string' || !Array.isArray(value.tags) ||
      !value.tags.every(tag => typeof tag === 'string') || !value.keyFields ||
      typeof value.keyFields !== 'object' || Array.isArray(value.keyFields)) {
    throw new Error('Invalid AI response structure');
  }
  return { summary: value.summary.slice(0, 10000), fullText: value.fullText.slice(0, 200000),
    category: value.category.slice(0, 100), tags: value.tags.slice(0, 10).map(tag => tag.slice(0, 100)), keyFields: value.keyFields };
}

const analyzeDocument = async (filePath, fileType) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing in the environment variables');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } } });
  
  try {
    // 1. Read the file from the local file system
    const fileBuffer = fs.readFileSync(filePath);
    
    // 2. Prepare the prompt
    let prompt = `
      You are an expert document analyzer for the 'Arckiv' intelligent document manager.
      Analyze this document using BOTH its visual content and OCR text. The document itself is the primary source of truth.

      Extract the following information:
      1. A short, accurate summary (1-2 sentences).
      2. Exactly 5 category tags that best describe this document (e.g., "Invoice", "Tax", "ID", "Education", "Receipt").
      3. A general category name (e.g., "Identity", "Finance", "Education", "Health", "Other").
      4. The full, raw text content of the document (OCR transcription).
      5. Structured key fields that are explicitly present in the document.

      CRITICAL INSTRUCTIONS FOR KEY FIELDS:
      - The schema must adapt to the document type. Identify important fields based on what the document is.
      - Examples of common fields: name, documentNumber, certificateNumber, invoiceNumber, issueDate, expiryDate, dateOfBirth, issuingAuthority, organization, address, phone, email, amount, currency.
      - Only extract values that are actually present in the document. Never infer or fabricate a value.
      - If a field is not present, use null.
      - Preserve the exact value from the document whenever possible (e.g. "₹25,000.00").
      - For dates, extract the exact string (e.g. "issueDate": "15/08/2026") and optionally add a normalized ISO date (e.g. "issueDateNormalized": "2026-08-15") ONLY if the date is unambiguous.
      
      Return ONLY a raw JSON object with the following structure (no markdown formatting, no backticks):
      {
        "summary": "...",
        "tags": ["...", "...", "...", "...", "..."],
        "category": "...",
        "fullText": "...",
        "keyFields": {
           "field1": "value1",
           "field2": "value2"
        }
      }
    `;

    // 3. Determine the mime type for Gemini
    let mimeType = fileType;
    if (!mimeType) {
      if (filePath.toLowerCase().includes('.pdf')) mimeType = 'application/pdf';
      else if (filePath.toLowerCase().match(/\.(jpg|jpeg)$/)) mimeType = 'image/jpeg';
      else if (filePath.toLowerCase().includes('.png')) mimeType = 'image/png';
      else mimeType = 'application/octet-stream';
    }

    // Digital PDFs already contain text: do not make the model transcribe it again.
    const extracted = mimeType === 'application/pdf' ? await extractPdfText(filePath) : { text: '', complete: false };
    if (extracted.complete) {
      prompt += '\nThe PDF text has already been extracted. Return fullText as an empty string; the server will retain the extracted text. Analyze the attached PDF for summary, tags, category and key fields. Do not repeat or transcribe the document.';
    }

    // 4. Call Gemini
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        // Bound upload latency, including retries, and require valid JSON OCR output.
        abortSignal: AbortSignal.timeout(60000),
        httpOptions: { timeout: 60000, retryOptions: { attempts: 1 } },
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: fileBuffer.toString('base64'),
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
    });

    const responseText = result.text;
    const finish = value => validateAnalysis(extracted.complete ? { ...value, fullText: extracted.text } : value);
    
    // Parse the JSON response
    try {
      const parsed = JSON.parse(responseText.trim());
      return finish(parsed);
    } catch (e) {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return finish(JSON.parse(cleaned));
    }
    
  } catch (error) {
    console.error('Error analyzing document with Gemini:', error.message);
    throw new Error('AI analysis did not complete. Your document was saved without AI metadata.');
  }
};

const chatWithDocument = async ({ filePath, mimeType, documentText, history, newMessage }) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing in the environment variables');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } } });

  const systemInstruction = `
    You are an expert multimodal AI assistant for the 'Arckiv' intelligent document manager.
    Your task is to answer the user's questions based ONLY on the provided document.
    
    You will be provided with:
    1. The original document file (PDF or image).
    2. High-resolution rendered images of specific document pages, each labeled with its page number (e.g., "[HIGH-RESOLUTION RENDER OF DOCUMENT PAGE 1]").
    3. The extracted OCR text from the document (as a fallback or searchable context).

    DOCUMENT OCR TEXT:
    ---
    ${documentText || 'No OCR text available.'}
    ---
    
    CRITICAL INSTRUCTIONS:
    1. The visual document and the high-resolution page images are the PRIMARY SOURCE OF TRUTH.
    2. When answering questions about document layout (tables, grids, cards), visually inspect the geometric relationship before answering.
    3. For ratings, identify the exact box or card containing the requested subject/category, then inspect the rating symbols belonging strictly inside that same bounding box.
    4. Do not confuse legend ratings at the top/bottom of the page with the specific item ratings.
    5. Count only the rating symbols that visually belong next to the requested item.
    6. When the visual document and OCR disagree, inspect the visual document and use the actual visual information.
    7. Do NOT invent facts or hallucinate information. If information is not present in the document, say so clearly.
  `;

  try {
    // Map history to the format expected by the SDK
    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Add the new message
    const userParts = [{ text: newMessage }];

    // If we have a physical file, attach it to the user's prompt so Gemini can see it
    if (filePath && fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);

      // Always attach the original file first (PDF or image)
      userParts.push({
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType || 'application/octet-stream'
        }
      });

      // For PDFs, also render question-relevant pages as high-res images
      if (mimeType === 'application/pdf') {
        const { images, pageNumbers } = await renderPdfPagesToImages(filePath, 5, newMessage);
        images.forEach((base64Img, idx) => {
          // Label each page so Gemini knows which document page this image represents
          userParts.push({ text: `[HIGH-RESOLUTION RENDER OF DOCUMENT PAGE ${pageNumbers[idx]}]` });
          userParts.push({
            inlineData: {
              data: base64Img,
              mimeType: 'image/png'
            }
          });
        });
      }
    }

    contents.push({
      role: 'user',
      parts: userParts
    });

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        abortSignal: AbortSignal.timeout(45000),
        httpOptions: { timeout: 45000, retryOptions: { attempts: 1 } },
        thinkingConfig: { thinkingBudget: 0 },
      }
    });

    return result.text;
  } catch (error) {
    console.error('Error in chatWithDocument:', error);
    const failure = new Error('Failed to generate chat response', { cause: error });
    failure.status = error.status;
    throw failure;
  }
};

const buildSearchableText = (doc) => {
  let text = `Title: ${doc.name}\n`;
  if (doc.category) text += `Category: ${doc.category}\n`;
  if (doc.tags && doc.tags.length > 0) text += `Tags: ${doc.tags.join(', ')}\n`;

  // Support both legacy shape ({ extractedData: { summary, fullText, keyFields } })
  // and new flat DocumentContent shape ({ summary, fullText, keyFields } passed directly as extractedData)
  const content = doc.extractedData || {};
  const keyFields = content.keyFields || {};
  const summary = content.summary || '';
  const fullText = content.fullText || '';

  if (Object.keys(keyFields).length > 0) {
    text += 'Key Information:\n';
    for (const [key, value] of Object.entries(keyFields)) {
      if (value) text += `- ${key}: ${value}\n`;
    }
  }
  if (summary) {
    text += `Summary:\n${summary}\n`;
  }
  if (fullText) {
    // Truncate to first 3000 chars to respect embedding limits safely
    text += `Content:\n${fullText.substring(0, 3000)}\n`;
  }
  return text;
};

const generateEmbedding = async (text) => {
  if (!process.env.GEMINI_API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } } });
  
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
      config: { abortSignal: AbortSignal.timeout(10000), httpOptions: { timeout: 10000, retryOptions: { attempts: 1 } } }
    });
    
    if (response.embeddings && response.embeddings.length > 0) {
      const vector = response.embeddings[0].values;
      if (vector.length === 3072) {
        return vector;
      } else {
        console.error(`[EMBEDDING ERROR] Unexpected dimension size: ${vector.length}`);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('[EMBEDDING API ERROR]:', error.message);
    return null;
  }
};

const generateDashboardInsights = async (stats) => {
  if (!process.env.GEMINI_API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } } });

  try {
    const prompt = `
      You are an AI document analytics advisor for Arckiv.
      Analyze the user's document statistics below and provide 3 concise, high-value bullet-point observations or suggestions.

      STATISTICS:
      - Total Documents: ${stats.totalDocuments}
      - Total Storage Used: ${stats.totalStorageMB} MB
      - Categories: ${stats.categories.map(c => `${c.name} (${c.count})`).join(', ') || 'None'}
      - File Types: ${stats.fileTypes.map(f => `${f.type} (${f.count})`).join(', ') || 'None'}
      - Top Tags: ${stats.topTags.map(t => `${t.name} (${t.count})`).join(', ') || 'None'}
      - Expiring Documents Count: ${stats.expiringCount || 0}

      RULES:
      1. Provide exactly 3 short, analytical observations (1-2 sentences each).
      2. Strictly interpret only the provided statistics. Do not invent unprovided data.
      3. Return ONLY a raw JSON array of strings, e.g. ["Insight 1", "Insight 2", "Insight 3"] with no backticks or markdown.
    `;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        abortSignal: AbortSignal.timeout(15000),
        thinkingConfig: { thinkingBudget: 0 },
      }
    });

    if (result && result.text) {
      const parsed = JSON.parse(result.text.trim());
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    return null;
  } catch (error) {
    console.error('[AI DASHBOARD INSIGHTS ERROR]:', error.message);
    return null;
  }
};

module.exports = { analyzeDocument, chatWithDocument, buildSearchableText, generateEmbedding, generateDashboardInsights };
