import sys
import os
# Redirect stderr to devnull so C-library warnings don't pollute stdout JSON
sys.stderr = open(os.devnull, 'w')
import json
import base64
import re
from collections import Counter

try:
    import fitz  # PyMuPDF
except ImportError:
    print(json.dumps({"error": "PyMuPDF (fitz) is not installed."}))
    sys.exit(1)


# ── Stop words to strip from user queries ──────────────────────────────
STOP_WORDS = frozenset({
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall",
    "should", "may", "might", "must", "can", "could",
    "i", "me", "my", "we", "our", "you", "your", "he", "she", "it", "its",
    "they", "them", "their", "this", "that", "these", "those",
    "what", "which", "who", "whom", "where", "when", "why", "how",
    "in", "on", "at", "to", "for", "of", "with", "by", "from", "about",
    "into", "through", "during", "before", "after", "above", "below",
    "between", "under", "again", "further", "then", "once",
    "not", "no", "nor", "only", "very", "too", "also", "just",
    "and", "but", "or", "so", "if", "because", "as", "until", "while",
    "all", "each", "every", "both", "few", "more", "most", "other",
    "some", "such", "than", "up", "out", "any",
    "tell", "show", "give", "find", "get", "see", "know", "use",
    "document", "file", "page", "pdf", "image", "text", "please",
    "rating", "rate", "rated", "star", "stars", "score",
})


def normalize_text(text):
    """Lowercase and collapse whitespace."""
    return re.sub(r'\s+', ' ', text.lower().strip())


def extract_query_terms(query):
    """
    Returns (full_phrase, keywords).
    full_phrase: the cleaned query with stop words removed (for multi-word matching).
    keywords:    individual non-stop words.
    """
    words = re.findall(r'[a-z0-9]+', query.lower())
    meaningful = [w for w in words if w not in STOP_WORDS]
    phrase = ' '.join(meaningful)
    return phrase, meaningful


def score_page(page_text_lower, phrase, keywords):
    """
    Score a page based on how well it matches the user's query.
    Priority order:
      1. Exact multi-word phrase match  (+10 per occurrence)
      2. Individual keyword matches     (+1 per occurrence)
    """
    score = 0

    # 1. Multi-word phrase match (only if phrase has >1 word)
    if ' ' in phrase:
        score += page_text_lower.count(phrase) * 10

    # 2. Individual keyword frequency
    for kw in keywords:
        score += page_text_lower.count(kw)

    return score


def select_pages(doc, search_query, max_rendered):
    """
    Decide which pages to render.

    Strategy:
      • Small PDFs (≤5 pages): render ALL pages.
      • Larger PDFs:
          – Score every page against the query keywords.
          – If strong matches exist, take the top `max_rendered` pages.
          – If NO keyword matches at all, use a distributed fallback:
              first page, last page, and evenly spaced middle pages.
      • Always sort selected pages back into document order.

    Returns: sorted list of 0-indexed page numbers.
    """
    num_pages = len(doc)

    # ── Small PDFs: render everything ──────────────────────────────────
    if num_pages <= 5:
        return list(range(num_pages))

    # ── Extract and normalise page texts ───────────────────────────────
    page_texts = []
    for i in range(num_pages):
        page = doc.load_page(i)
        page_texts.append(normalize_text(page.get_text()))

    # ── Score pages ────────────────────────────────────────────────────
    phrase, keywords = extract_query_terms(search_query or "")

    if not keywords:
        # No meaningful keywords → distributed fallback
        return _distributed_fallback(num_pages, max_rendered)

    scored = []
    for i, text in enumerate(page_texts):
        s = score_page(text, phrase, keywords)
        scored.append((s, i))

    # Check if any page actually matched
    best_score = max(s for s, _ in scored)

    if best_score == 0:
        # No keyword matches at all → distributed fallback
        return _distributed_fallback(num_pages, max_rendered)

    # Sort by score descending, then by page number ascending for tie-breaking
    scored.sort(key=lambda x: (-x[0], x[1]))
    selected = [page_idx for _, page_idx in scored[:max_rendered]]

    # Sort back into document order
    selected.sort()
    return selected


def _distributed_fallback(num_pages, max_rendered):
    """
    When no keyword matches, pick pages that give broad coverage:
      – always include first page (index 0)
      – always include last page
      – fill remaining slots with evenly spaced pages
    Sorted in document order.
    """
    if num_pages <= max_rendered:
        return list(range(num_pages))

    pages = set()
    pages.add(0)                  # first page
    pages.add(num_pages - 1)      # last page

    # Fill remaining slots with evenly spaced pages
    remaining = max_rendered - len(pages)
    if remaining > 0:
        step = num_pages / (remaining + 1)
        for i in range(1, remaining + 1):
            pages.add(int(step * i))

    result = sorted(pages)
    return result[:max_rendered]


def render_pages(doc, page_indices):
    """Render the given page indices at 2× zoom (144 DPI) and return
    a list of dicts: { "page": 1-indexed page number, "image": base64 }."""
    results = []
    zoom = 2.0
    mat = fitz.Matrix(zoom, zoom)

    for idx in page_indices:
        page = doc.load_page(idx)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")
        b64_str = base64.b64encode(img_bytes).decode('utf-8')
        results.append({
            "page": idx + 1,   # 1-indexed for human readability
            "image": b64_str
        })

    return results


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing PDF path argument"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    max_rendered = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    search_query = sys.argv[3] if len(sys.argv) > 3 else ""

    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

    selected = select_pages(doc, search_query, max_rendered)

    rendered = render_pages(doc, selected)
    doc.close()

    output = {
        "success": True,
        "totalPages": len(doc) if hasattr(doc, '__len__') else 0,
        "selectedPages": [r["page"] for r in rendered],
        "images": [r["image"] for r in rendered],
        "pageNumbers": [r["page"] for r in rendered],
    }
    # Re-open to get total pages since doc is closed
    # Actually we already have it from select_pages, let's fix:
    # We'll compute totalPages before closing.
    print(json.dumps(output))


# ── Corrected main that computes totalPages before closing ─────────────
def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing PDF path argument"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    max_rendered = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    search_query = sys.argv[3] if len(sys.argv) > 3 else ""

    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

    total_pages = len(doc)
    selected = select_pages(doc, search_query, max_rendered)
    rendered = render_pages(doc, selected)
    doc.close()

    output = {
        "success": True,
        "totalPages": total_pages,
        "selectedPages": [r["page"] for r in rendered],
        "images": [r["image"] for r in rendered],
        "pageNumbers": [r["page"] for r in rendered],
    }
    print(json.dumps(output))


if __name__ == "__main__":
    main()
