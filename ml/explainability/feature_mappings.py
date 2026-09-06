"""
Feature Mappings & Human-Readable Explanation Layer
Maps technical feature names, abbreviations, and TF-IDF terms into intuitive,
domain-specific descriptions, feature groups, and directional risk/viability explanations.
"""

from typing import Dict, Any, Optional

FEATURE_GROUPS = {
    "Metadata": [
        "goal", "log_goal", "launch_day", "launch_hour", "is_weekend",
        "cat_memorial", "cat_medical", "cat_animals", "cat_emergency",
        "cat_financial_emergency", "cat_other", "country_us", "country_ca",
        "country_gb", "country_au", "country_other"
    ],
    "Text": [
        "description_length", "description_word_count", "sentence_count",
        "avg_word_length", "readability_score", "sentiment_pos_ratio",
        "sentiment_neg_ratio", "sentiment_polarity_net",
        "tfidf_help", "tfidf_support", "tfidf_family", "tfidf_medical",
        "tfidf_fund", "tfidf_life", "tfidf_love", "tfidf_time",
        "tfidf_home", "tfidf_care", "tfidf_community", "tfidf_funds",
        "tfidf_expenses", "tfidf_treatment", "tfidf_hospital", "tfidf_surgery",
        "tfidf_cancer", "tfidf_passed", "tfidf_memorial", "tfidf_emergency"
    ],
    "Early Behaviour": [
        "donations_first_24h_count", "donations_first_24h_amount",
        "donations_first_48h_count", "donations_first_48h_amount",
        "early_donation_velocity", "early_comment_count",
        "early_comment_density", "early_update_count",
        "early_update_frequency"
    ],
    "Image Metadata": [
        "has_cover_photo", "num_body_photos", "total_photo_count"
    ]
}

# Aliases mapping technical and short names to standardized feature identifiers
FEATURE_ALIASES: Dict[str, str] = {
    "d48Count": "donations_first_48h_count",
    "d48Amt": "donations_first_48h_amount",
    "d24Count": "donations_first_24h_count",
    "d24Amt": "donations_first_24h_amount",
    "earlyVel": "early_donation_velocity",
    "u48Count": "early_update_count",
    "u48Freq": "early_update_frequency",
    "c48Count": "early_comment_count",
    "cDensity": "early_comment_density",
    "goal": "goal",
    "log_goal": "log_goal",
    "coverPhoto": "has_cover_photo",
    "bodyPhotos": "num_body_photos",
    "totalPhotos": "total_photo_count",
    "descLen": "description_length",
    "wordCount": "description_word_count",
    "sentCount": "sentence_count",
    "readability": "readability_score"
}

# Standardized human-readable descriptions and directional interpretations
FEATURE_METADATA_MAPPING: Dict[str, Dict[str, str]] = {
    # 1. Early Behaviour
    "donations_first_48h_count": {
        "title": "Number of donations received during the first 48 hours",
        "short_title": "48h Donation Count",
        "group": "Early Behaviour",
        "high_risk_desc": "Low backer volume in first 48h indicates sluggish community momentum.",
        "low_risk_desc": "High 48h donor mobilization provides critical early traction and social proof.",
        "unit": "donations"
    },
    "donations_first_48h_amount": {
        "title": "Total donation amount received during the first 48 hours",
        "short_title": "48h Raised Amount",
        "group": "Early Behaviour",
        "high_risk_desc": "Low capital inflow in first 48h leaves a substantial remaining gap.",
        "low_risk_desc": "Substantial 48h funding jumpstarts progress toward the goal.",
        "unit": "USD"
    },
    "donations_first_24h_count": {
        "title": "Donations received during the first 24 hours",
        "short_title": "24h Donation Count",
        "group": "Early Behaviour",
        "high_risk_desc": "Weak Day-1 donor count signals slow initial peer activation.",
        "low_risk_desc": "Rapid Day-1 donor turnout demonstrates high immediate urgency and backing.",
        "unit": "donations"
    },
    "donations_first_24h_amount": {
        "title": "Total donation amount received during the first 24 hours",
        "short_title": "24h Raised Amount",
        "group": "Early Behaviour",
        "high_risk_desc": "Modest Day-1 capital inflow suggests low early network engagement.",
        "low_risk_desc": "High Day-1 funding accelerates viral sharing across donor networks.",
        "unit": "USD"
    },
    "early_donation_velocity": {
        "title": "Average donation amount per hour during the first 48 hours",
        "short_title": "Donation Velocity",
        "group": "Early Behaviour",
        "high_risk_desc": "Hourly donation velocity is below the threshold needed for full funding.",
        "low_risk_desc": "Rapid hourly donation inflow rate indicates strong fundraising momentum.",
        "unit": "USD/hr"
    },
    "early_update_count": {
        "title": "Creator updates during the first 48 hours",
        "short_title": "48h Creator Updates",
        "group": "Early Behaviour",
        "high_risk_desc": "No creator updates in the first 48h reduces donor visibility and engagement.",
        "low_risk_desc": "Active early creator updates build trust and keep backers engaged.",
        "unit": "updates"
    },
    "early_update_frequency": {
        "title": "Creator update frequency (updates per hour)",
        "short_title": "Update Frequency",
        "group": "Early Behaviour",
        "high_risk_desc": "Infrequent creator communications limit ongoing campaign visibility.",
        "low_risk_desc": "Frequent, transparent creator updates sustain donor interest and sharing.",
        "unit": "updates/hr"
    },
    "early_comment_count": {
        "title": "Supporter comments received in first 48 hours",
        "short_title": "48h Comments",
        "group": "Early Behaviour",
        "high_risk_desc": "Few supporter comments indicates low conversational engagement.",
        "low_risk_desc": "Vibrant supporter commentary reflects strong emotional investment.",
        "unit": "comments"
    },
    "early_comment_density": {
        "title": "Supporter comments per donation",
        "short_title": "Comment Density",
        "group": "Early Behaviour",
        "high_risk_desc": "Low comment density suggests purely transactional interactions.",
        "low_risk_desc": "High comment density reflects passionate, dedicated community advocacy.",
        "unit": "ratio"
    },

    # 2. Metadata
    "goal": {
        "title": "Campaign funding goal",
        "short_title": "Funding Goal",
        "group": "Metadata",
        "high_risk_desc": "Large financial goal creates a higher threshold for full funding.",
        "low_risk_desc": "Realistic, well-sized funding goal facilitates goal achievement.",
        "unit": "USD"
    },
    "log_goal": {
        "title": "Log-transformed funding goal",
        "short_title": "Log Goal",
        "group": "Metadata",
        "high_risk_desc": "Higher target magnitude increases funding completion risk.",
        "low_risk_desc": "Moderate target scale keeps required donor backing manageable.",
        "unit": "log(USD)"
    },
    "launch_day": {
        "title": "Day of week campaign launched (0=Mon, 6=Sun)",
        "short_title": "Launch Day",
        "group": "Metadata",
        "high_risk_desc": "Launched on a day with historically lower donor traffic.",
        "low_risk_desc": "Launched on an optimal weekday with active online donor participation.",
        "unit": "day"
    },
    "launch_hour": {
        "title": "Hour of day campaign launched (UTC)",
        "short_title": "Launch Hour",
        "group": "Metadata",
        "high_risk_desc": "Off-peak launch timing during low donor discovery activity.",
        "low_risk_desc": "Optimal launch timing aligning with active donor browsing windows.",
        "unit": "hour"
    },
    "is_weekend": {
        "title": "Launched on a weekend indicator",
        "short_title": "Weekend Launch",
        "group": "Metadata",
        "high_risk_desc": "Weekend launch when digital workplace sharing is typically lower.",
        "low_risk_desc": "Weekday launch when online giving engagement is higher.",
        "unit": "boolean"
    },
    "cat_memorial": {
        "title": "Category: Memorial & Funeral",
        "short_title": "Memorial Category",
        "group": "Metadata",
        "high_risk_desc": "Memorial campaigns require concentrated immediate local network outreach.",
        "low_risk_desc": "Memorial campaigns elicit strong sympathy and swift community giving.",
        "unit": "binary"
    },
    "cat_medical": {
        "title": "Category: Medical & Health",
        "short_title": "Medical Category",
        "group": "Metadata",
        "high_risk_desc": "Medical campaigns often carry large ongoing funding targets.",
        "low_risk_desc": "Medical emergencies generate high empathy among donors.",
        "unit": "binary"
    },
    "cat_animals": {
        "title": "Category: Animals & Pets",
        "short_title": "Animals Category",
        "group": "Metadata",
        "high_risk_desc": "Animal welfare campaigns face varying reach across broader networks.",
        "low_risk_desc": "Animal causes trigger strong emotional resonance among dedicated pet advocates.",
        "unit": "binary"
    },
    "cat_emergency": {
        "title": "Category: Emergency & Disaster",
        "short_title": "Emergency Category",
        "group": "Metadata",
        "high_risk_desc": "Disaster causes require rapid viral acceleration to meet urgent targets.",
        "low_risk_desc": "Acute crisis drives immediate, decisive contributions.",
        "unit": "binary"
    },
    "cat_financial_emergency": {
        "title": "Category: Financial Hardship & Emergency",
        "short_title": "Financial Emergency",
        "group": "Metadata",
        "high_risk_desc": "General hardship appeals face donor fatigue without unique story context.",
        "low_risk_desc": "Clear, specific hardship context aids peer conversions.",
        "unit": "binary"
    },
    "cat_other": {
        "title": "Category: Other Causes",
        "short_title": "Other Category",
        "group": "Metadata",
        "high_risk_desc": "Miscellaneous cause category lacks dedicated thematic donor discovery tags.",
        "low_risk_desc": "Unique niche cause attracting passionate specialized backers.",
        "unit": "binary"
    },
    "country_us": {
        "title": "Origin Country: United States",
        "short_title": "Country: US",
        "group": "Metadata",
        "high_risk_desc": "High campaign competition volume in the US crowdfunding ecosystem.",
        "low_risk_desc": "Large donor base and streamlined digital payment infrastructure in the US.",
        "unit": "binary"
    },
    "country_ca": {
        "title": "Origin Country: Canada",
        "short_title": "Country: Canada",
        "group": "Metadata",
        "high_risk_desc": "Canadian regional donor distribution dynamics.",
        "low_risk_desc": "Strong local community backing across Canadian campaigns.",
        "unit": "binary"
    },
    "country_gb": {
        "title": "Origin Country: United Kingdom",
        "short_title": "Country: UK",
        "group": "Metadata",
        "high_risk_desc": "UK market competition baseline.",
        "low_risk_desc": "Established UK giving traditions and active donor participation.",
        "unit": "binary"
    },
    "country_au": {
        "title": "Origin Country: Australia",
        "short_title": "Country: Australia",
        "group": "Metadata",
        "high_risk_desc": "Australian market volume dynamics.",
        "low_risk_desc": "Strong Australian community networks and peer sharing.",
        "unit": "binary"
    },
    "country_other": {
        "title": "Origin Country: International / Other",
        "short_title": "Country: Other",
        "group": "Metadata",
        "high_risk_desc": "Potential cross-border payment friction or localized network constraints.",
        "low_risk_desc": "Global outreach with international donor appeal.",
        "unit": "binary"
    },

    # 3. Text
    "description_length": {
        "title": "Campaign story character length",
        "short_title": "Story Length",
        "group": "Text",
        "high_risk_desc": "Story is either too brief to establish credibility or excessively dense.",
        "low_risk_desc": "Comprehensive narrative provides clear, transparent project context.",
        "unit": "chars"
    },
    "description_word_count": {
        "title": "Campaign story word count",
        "short_title": "Word Count",
        "group": "Text",
        "high_risk_desc": "Low word count leaves essential donor questions unaddressed.",
        "low_risk_desc": "Detailed story clearly articulates need and fund allocation plan.",
        "unit": "words"
    },
    "sentence_count": {
        "title": "Story sentence count",
        "short_title": "Sentences",
        "group": "Text",
        "high_risk_desc": "Lack of structured sentences hinders readability.",
        "low_risk_desc": "Structured narrative flow makes the campaign easy to read and share.",
        "unit": "sentences"
    },
    "avg_word_length": {
        "title": "Average word length in story",
        "short_title": "Avg Word Length",
        "group": "Text",
        "high_risk_desc": "Complex jargon or fragmented vocabulary reduces accessibility.",
        "low_risk_desc": "Clear, accessible vocabulary aids fast donor comprehension.",
        "unit": "chars/word"
    },
    "readability_score": {
        "title": "Story readability index (ARI)",
        "short_title": "Readability (ARI)",
        "group": "Text",
        "high_risk_desc": "High readability index indicates dense, difficult-to-scan text.",
        "low_risk_desc": "Approachable readability level enables immediate reader understanding.",
        "unit": "grade"
    },
    "sentiment_pos_ratio": {
        "title": "Positive sentiment vocabulary proportion",
        "short_title": "Positive Tone",
        "group": "Text",
        "high_risk_desc": "Low gratitude and community language dampens emotional connection.",
        "low_risk_desc": "Hopeful and appreciative tone fosters donor goodwill and trust.",
        "unit": "ratio"
    },
    "sentiment_neg_ratio": {
        "title": "Urgency and crisis vocabulary proportion",
        "short_title": "Urgency Tone",
        "group": "Text",
        "high_risk_desc": "Under-communicating urgency fails to convey critical necessity.",
        "low_risk_desc": "Clear articulation of urgency communicates the immediate need.",
        "unit": "ratio"
    },
    "sentiment_polarity_net": {
        "title": "Net sentiment balance (Positive - Negative)",
        "short_title": "Sentiment Balance",
        "group": "Text",
        "high_risk_desc": "Unbalanced tone can weaken donor confidence.",
        "low_risk_desc": "Balanced tone effectively blends urgent need with hopeful resolve.",
        "unit": "score"
    },

    # 4. Image Metadata
    "has_cover_photo": {
        "title": "Campaign cover image presence",
        "short_title": "Cover Photo",
        "group": "Image Metadata",
        "high_risk_desc": "Missing cover photo severely hurts campaign visual appeal and credibility.",
        "low_risk_desc": "Prominent cover photo establishes an immediate visual connection.",
        "unit": "boolean"
    },
    "num_body_photos": {
        "title": "Number of supporting photos in story body",
        "short_title": "Body Photos",
        "group": "Image Metadata",
        "high_risk_desc": "Absence of supporting photos provides fewer visual proofs of the cause.",
        "low_risk_desc": "Multiple body photos provide authentic visual proof and emotional context.",
        "unit": "photos"
    },
    "total_photo_count": {
        "title": "Total visual assets (Cover + Body photos)",
        "short_title": "Total Photos",
        "group": "Image Metadata",
        "high_risk_desc": "Minimal visual storytelling limits campaign shareability.",
        "low_risk_desc": "Rich visual media package improves social media sharing conversions.",
        "unit": "photos"
    }
}

def normalize_feature_name(feature_name: str) -> str:
    """Resolves aliases or abbreviations to standardized feature name."""
    return FEATURE_ALIASES.get(feature_name, feature_name)

def get_feature_group(feature_name: str) -> str:
    """Returns the group name (Metadata, Text, Early Behaviour, Image Metadata) for a feature."""
    norm_name = normalize_feature_name(feature_name)
    for group, feats in FEATURE_GROUPS.items():
        if norm_name in feats or any(norm_name.startswith(f) for f in feats):
            return group
    if norm_name.startswith("tfidf_"):
        return "Text"
    return "Metadata"

def get_human_readable_name(feature_name: str) -> str:
    """Returns the descriptive human-readable title for a feature."""
    norm_name = normalize_feature_name(feature_name)
    if norm_name in FEATURE_METADATA_MAPPING:
        return FEATURE_METADATA_MAPPING[norm_name]["title"]
    if norm_name.startswith("tfidf_"):
        kw = norm_name.replace("tfidf_", "")
        return f"Narrative keyword relevance: '{kw}'"
    return norm_name.replace("_", " ").title()

def get_feature_info(feature_name: str) -> Dict[str, str]:
    """Returns metadata, title, group, unit, and directional explanations for a feature."""
    norm_name = normalize_feature_name(feature_name)
    if norm_name in FEATURE_METADATA_MAPPING:
        return FEATURE_METADATA_MAPPING[norm_name]

    if norm_name.startswith("tfidf_"):
        kw = norm_name.replace("tfidf_", "")
        return {
            "title": f"Narrative keyword relevance: '{kw}'",
            "short_title": f"Keyword: {kw}",
            "group": "Text",
            "high_risk_desc": f"Contextual usage or absence of keyword '{kw}' relative to campaign needs.",
            "low_risk_desc": f"Clear narrative usage of '{kw}' highlighting the specific project cause.",
            "unit": "TF-IDF"
        }

    return {
        "title": norm_name.replace("_", " ").title(),
        "short_title": norm_name,
        "group": get_feature_group(norm_name),
        "high_risk_desc": f"Factor '{norm_name}' indicates elevated funding risk.",
        "low_risk_desc": f"Factor '{norm_name}' supports funding completion viability.",
        "unit": "value"
    }

def format_feature_value(feature_name: str, value: Any, info: Optional[Dict[str, str]] = None) -> str:
    """Formats numeric feature values with proper domain units."""
    if info is None:
        info = get_feature_info(feature_name)
    unit = info.get("unit", "")

    if value is None:
        return "N/A"

    try:
        fval = float(value)
    except (ValueError, TypeError):
        return str(value)

    if "USD" in unit:
        return f"${fval:,.2f}"
    elif unit == "USD/hr":
        return f"${fval:,.2f}/hr"
    elif unit == "boolean" or unit == "binary":
        return "Yes" if fval >= 0.5 else "No"
    elif "ratio" in unit:
        return f"{fval * 100:.1f}%"
    elif unit == "chars/word":
        return f"{fval:.2f} chars/word"
    elif unit == "grade":
        return f"Grade {fval:.1f}"
    elif unit in ("donations", "updates", "comments", "photos", "words", "chars", "sentences", "day", "hour"):
        return f"{int(round(fval)):,}"
    elif fval.is_integer():
        return f"{int(fval)}"
    else:
        return f"{fval:.4f}"
