"""Versioned shared preprocessing for the experimental model only."""
import re
import unicodedata

VERSION = "doclaynet-text-v1"
MAX_CHARACTERS = 100000


def normalize_text(text):
    text = unicodedata.normalize("NFKC", text)
    text = "".join(character if character in "\n\t" or not unicodedata.category(character).startswith("C")
                   else " " for character in text)
    text = re.sub(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b", " EMAIL ", text)
    return re.sub(r"\s+", " ", text).strip()[:MAX_CHARACTERS]


def normalize_batch(texts):
    return [normalize_text(text) for text in texts]


def duplicate_key(text):
    """Case/digit-insensitive token key; never used as the classifier's text."""
    return " ".join(re.findall(r"\w+", re.sub(r"\d+", "0", text.casefold())))


def shingles(text):
    words = duplicate_key(text).split()
    return {" ".join(words[i:i + 5]) for i in range(max(0, len(words) - 4))}
