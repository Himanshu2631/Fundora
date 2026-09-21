"""
Text Feature Extractor Module
Extracts textual statistics, readability metrics, sentiment polarity, and TF-IDF representations.
"""

import math
import re
from typing import List, Dict, Any, Tuple, Optional

POSITIVE_WORDS = set([
    "help", "support", "blessing", "love", "hope", "recovery", "life", "care", "cure", "gratitude",
    "thank", "family", "survive", "heal", "god", "pray", "kindness", "strength", "give", "community"
])

NEGATIVE_WORDS = set([
    "cancer", "disease", "death", "tragedy", "loss", "funeral", "emergency", "crisis", "accident",
    "debt", "pain", "hardship", "suffering", "fire", "injury", "devastating", "urgent", "passed"
])

# Default champion TF-IDF vocabulary (top 20 terms from MDCC training set)
DEFAULT_CHAMPION_VOCAB = [
    "and", "the", "for", "help", "this", "you", "with", "was", "will", "that",
    "are", "have", "family", "all", "has", "can", "his", "our", "time", "thank"
]

# Baseline MDCC IDF weights
DEFAULT_IDF_WEIGHTS = {
    "and": 1.042337,
    "the": 1.084567,
    "for": 1.140903,
    "help": 1.251555,
    "this": 1.276706,
    "you": 1.309177,
    "with": 1.326655,
    "was": 1.410897,
    "will": 1.442237,
    "that": 1.477406,
    "are": 1.522218,
    "have": 1.565454,
    "family": 1.587006,
    "all": 1.608168,
    "has": 1.611263,
    "can": 1.629913,
    "his": 1.755194,
    "our": 1.759931,
    "time": 1.766717,
    "thank": 1.782192
}

def extract_text_features(
    records: List[Dict[str, Any]],
    top_n_tfidf: int = 20,
    vocabulary: Optional[List[str]] = None,
    idf_dict: Optional[Dict[str, float]] = None
) -> Tuple[List[List[float]], List[str]]:
    feature_names = [
        "description_length",
        "description_word_count",
        "sentence_count",
        "avg_word_length",
        "readability_score",
        "sentiment_pos_ratio",
        "sentiment_neg_ratio",
        "sentiment_polarity_net",
    ]

    corpus_tokens = []
    token_doc_counts = {}

    for rec in records:
        text = str(rec.get("description", "")).lower()
        words = re.findall(r"\b[a-z]{3,}\b", text)
        corpus_tokens.append(words)
        for w in set(words):
            token_doc_counts[w] = token_doc_counts.get(w, 0) + 1

    if vocabulary is not None:
        selected_vocab = vocabulary
    else:
        sorted_vocab = sorted(token_doc_counts.items(), key=lambda x: x[1], reverse=True)
        selected_vocab = [w for w, _ in sorted_vocab[:top_n_tfidf]]

    for w in selected_vocab:
        feature_names.append(f"tfidf_{w}")

    if idf_dict is not None:
        active_idf = idf_dict
    elif vocabulary is not None and set(vocabulary).issubset(set(DEFAULT_IDF_WEIGHTS.keys())):
        active_idf = DEFAULT_IDF_WEIGHTS
    else:
        total_docs = len(records)
        active_idf = {}
        for w in selected_vocab:
            df_val = token_doc_counts.get(w, 1)
            active_idf[w] = math.log((1.0 + total_docs) / (1.0 + df_val)) + 1.0

    matrix = []
    for idx, rec in enumerate(records):
        desc = str(rec.get("description", ""))
        desc_lower = desc.lower()

        d_len = float(len(desc))
        words_list = re.findall(r"\b[a-z]+\b", desc_lower)
        d_words = float(len(words_list))

        sentences = re.split(r"[.!?]+", desc)
        sentence_count = float(max(1, len([s for s in sentences if s.strip()])))

        total_chars = sum(len(w) for w in words_list)
        avg_word_len = (total_chars / d_words) if d_words > 0 else 0.0

        if d_words > 0 and sentence_count > 0:
            ari_score = 4.71 * (total_chars / d_words) + 0.5 * (d_words / sentence_count) - 21.43
            readability_score = float(max(0.0, min(100.0, ari_score)))
        else:
            readability_score = 0.0

        pos_cnt = sum(1 for w in words_list if w in POSITIVE_WORDS)
        neg_cnt = sum(1 for w in words_list if w in NEGATIVE_WORDS)
        pos_ratio = (pos_cnt / d_words) if d_words > 0 else 0.0
        neg_ratio = (neg_cnt / d_words) if d_words > 0 else 0.0
        net_polarity = pos_ratio - neg_ratio

        row = [
            d_len,
            d_words,
            sentence_count,
            avg_word_len,
            readability_score,
            pos_ratio,
            neg_ratio,
            net_polarity,
        ]

        doc_words = corpus_tokens[idx]
        doc_word_cnt = len(doc_words)
        for w in selected_vocab:
            tf = (doc_words.count(w) / doc_word_cnt) if doc_word_cnt > 0 else 0.0
            term_idf = active_idf.get(w, 1.0)
            tfidf = tf * term_idf
            row.append(tfidf)

        matrix.append(row)

    return matrix, feature_names
