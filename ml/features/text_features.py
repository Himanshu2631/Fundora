"""
Text Feature Extractor Module
Extracts textual statistics, readability metrics, sentiment polarity, and TF-IDF representations.
"""

import math
import re
from typing import List, Dict, Any, Tuple

# Positive and Negative Lexicons for Lexicon-Based Sentiment Polarity
POSITIVE_WORDS = set([
    "help", "support", "blessing", "love", "hope", "recovery", "life", "care", "cure", "gratitude",
    "thank", "family", "survive", "heal", "god", "pray", "kindness", "strength", "give", "community"
])

NEGATIVE_WORDS = set([
    "cancer", "disease", "death", "tragedy", "loss", "funeral", "emergency", "crisis", "accident",
    "debt", "pain", "hardship", "suffering", "fire", "injury", "devastating", "urgent", "passed"
])

def extract_text_features(records: List[Dict[str, Any]], top_n_tfidf: int = 20) -> Tuple[List[List[float]], List[str]]:
    """
    Extracts statistical, sentiment, readability, and TF-IDF text features from title and description.
    """
    feature_names = [
        "title_length",
        "title_word_count",
        "description_length",
        "description_word_count",
        "sentence_count",
        "avg_word_length",
        "readability_score",
        "sentiment_pos_ratio",
        "sentiment_neg_ratio",
        "sentiment_polarity_net",
    ]

    # Pre-tokenize all texts for TF-IDF computation
    corpus_tokens = []
    token_doc_counts = {}

    for rec in records:
        text = (rec.get("title", "") + " " + rec.get("description", "")).lower()
        words = re.findall(r"\b[a-z]{3,}\b", text)
        corpus_tokens.append(words)
        unique_words = set(words)
        for w in unique_words:
            token_doc_counts[w] = token_doc_counts.get(w, 0) + 1

    # Select Top N Vocabulary terms by Document Frequency
    sorted_vocab = sorted(token_doc_counts.items(), key=lambda x: x[1], reverse=True)
    selected_vocab = [w for w, _ in sorted_vocab[:top_n_tfidf]]

    for w in selected_vocab:
        feature_names.append(f"tfidf_{w}")

    total_docs = len(records)
    idf_dict = {}
    for w in selected_vocab:
        df_val = token_doc_counts.get(w, 1)
        idf_dict[w] = math.log((1.0 + total_docs) / (1.0 + df_val)) + 1.0

    matrix = []
    for idx, rec in enumerate(records):
        title = str(rec.get("title", ""))
        desc = str(rec.get("description", ""))
        combined_text = (title + " " + desc).lower()

        # Lengths & Word Counts
        t_len = float(len(title))
        t_words = float(len(re.findall(r"\b\w+\b", title)))
        d_len = float(len(desc))
        words_list = re.findall(r"\b[a-z]+\b", combined_text)
        d_words = float(len(words_list))

        # Sentence Count
        sentences = re.split(r"[.!?]+", desc)
        sentence_count = float(max(1, len([s for s in sentences if s.strip()])))

        # Average Word Length
        total_chars = sum(len(w) for w in words_list)
        avg_word_len = (total_chars / d_words) if d_words > 0 else 0.0

        # Automated Readability Index (ARI) Approximation
        # ARI = 4.71 * (characters / words) + 0.5 * (words / sentences) - 21.43
        if d_words > 0 and sentence_count > 0:
            ari_score = 4.71 * (total_chars / d_words) + 0.5 * (d_words / sentence_count) - 21.43
            readability_score = float(max(0.0, min(100.0, ari_score)))
        else:
            readability_score = 0.0

        # Lexicon Sentiment Polarity
        pos_cnt = sum(1 for w in words_list if w in POSITIVE_WORDS)
        neg_cnt = sum(1 for w in words_list if w in NEGATIVE_WORDS)
        pos_ratio = (pos_cnt / d_words) if d_words > 0 else 0.0
        neg_ratio = (neg_cnt / d_words) if d_words > 0 else 0.0
        net_polarity = pos_ratio - neg_ratio

        row = [
            t_len,
            t_words,
            d_len,
            d_words,
            sentence_count,
            avg_word_len,
            readability_score,
            pos_ratio,
            neg_ratio,
            net_polarity,
        ]

        # Compute TF-IDF vector for top vocabulary
        doc_words = corpus_tokens[idx]
        doc_word_cnt = len(doc_words)
        for w in selected_vocab:
            tf = (doc_words.count(w) / doc_word_cnt) if doc_word_cnt > 0 else 0.0
            tfidf = tf * idf_dict[w]
            row.append(tfidf)

        matrix.append(row)

    return matrix, feature_names
