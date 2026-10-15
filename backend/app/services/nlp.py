import re
from typing import List, Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer

from app.schemas import (
    ProjectBrief,
    SemanticTopic,
    QuestionItem,
    OutlineItem,
    SerpCompetitor,
)


STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can",
    "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
    "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have",
    "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him",
    "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
    "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor",
    "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
    "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some",
    "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
    "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to",
    "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
    "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're",
    "you've", "your", "yours", "yourself", "yourselves", "also", "one", "two", "use", "used", "using",
    "get", "just", "like", "make", "new", "see", "way", "even", "well", "will", "may", "can", "us"
}




def extract_questions_from_corpus(corpus: List[str], query: str) -> List[QuestionItem]:
    """Find interrogative sentences and categorize search intent."""
    raw_questions: List[str] = []
    
    # Regex to grab sentences ending with ?
    for doc in corpus:
        matches = re.findall(r"(?:^|[.!?\n])\s*([A-Z][^.!?\n]{10,120}\?)", doc)
        for m in matches:
            cleaned = m.strip()
            # Must look like an informative question
            if re.match(r"^(What|How|Why|Which|Can|Is|Are|Will|Should|Does|Do|Where|When)\b", cleaned, re.I):
                raw_questions.append(cleaned)

    # If few questions found in scraped text, supply query-anchored search questions
    if len(raw_questions) < 4:
        raw_questions.extend([
            f"What is {query} and why does it matter?",
            f"How does {query} compare to traditional SEO?",
            f"What are the best practices for implementing {query}?",
            f"How do AI search engines evaluate {query}?",
            f"What tools and metrics are used to measure {query}?",
            f"What are common mistakes to avoid with {query}?",
        ])

    # Deduplicate while preserving order
    seen = set()
    questions: List[QuestionItem] = []
    
    for q in raw_questions:
        norm = re.sub(r"[^\w\s]", "", q.lower()).strip()
        if norm in seen or len(q) < 12:
            continue
        seen.add(norm)

        # Detect intent
        intent = "definitional"
        q_lower = q.lower()
        if re.search(r"\b(vs|versus|difference|compare|comparative|better)\b", q_lower):
            intent = "comparative"
        elif re.search(r"\b(how to|steps|guide|implement|create|process|setup)\b", q_lower):
            intent = "procedural"
        elif re.search(r"\b(worth|effective|future|pros and cons|benefits|review|good)\b", q_lower):
            intent = "evaluative"
        else:
            intent = "definitional"

        item_id = f"q-{len(questions) + 1}"
        questions.append(
            QuestionItem(
                id=item_id,
                question=q,
                intent=intent,
                answered=False,
                suggestedAnswer=None,
            )
        )

        if len(questions) >= 8:
            break

    return questions


def extract_outline_from_headings(
    competitors: List[SerpCompetitor], query: str, topics: List[SemanticTopic]
) -> List[OutlineItem]:
    """Aggregate top competitor headings into a coherent hierarchical outline."""
    candidate_headings: List[Tuple[str, str]] = []  # (level, text)

    for comp in competitors:
        if comp.headingsList:
            for h in comp.headingsList:
                t = h.text.strip()
                if len(t) > 6 and not re.search(r"(cookies|privacy|subscribe|sign in|login|comment|share)", t, re.I):
                    candidate_headings.append((h.level, t))

    outline_items: List[OutlineItem] = []
    seen = set()

    # If competitors gave sparse headings, construct a robust default baseline
    if len(candidate_headings) < 4:
        candidate_headings = [
            ("h2", f"Understanding {query}: Core Concepts"),
            ("h3", "Definition and Historical Context"),
            ("h3", "Why the Shift Matters Now"),
            ("h2", f"Key Components of {query}"),
            ("h3", "Algorithmic Factors and Signals"),
            ("h3", "Content Structure & Semantic Depth"),
            ("h2", f"Step-by-Step Implementation Strategy"),
            ("h3", "Optimization Framework"),
            ("h3", "Performance Benchmarking"),
            ("h2", "Frequently Asked Questions"),
        ]

    for level, text in candidate_headings:
        norm = re.sub(r"[^\w\s]", "", text.lower()).strip()
        if norm in seen:
            continue
        seen.add(norm)

        # Match relevant key topics for this heading
        matched_topics = [
            t.term
            for t in topics[:15]
            if any(word in norm for word in t.term.lower().split() if len(word) > 3)
        ][:3]

        item_id = f"out-{len(outline_items) + 1}"
        outline_items.append(
            OutlineItem(
                id=item_id,
                level="h2" if level == "h2" else "h3",
                title=text,
                keyTopics=matched_topics,
            )
        )

        if len(outline_items) >= 10:
            break

    return outline_items


def extract_semantic_topics(
    corpus: List[str], query: str, top_n: int = 24
) -> List[SemanticTopic]:
    """
    Extract high-value 1-to-3-gram semantic terms using TF-IDF and heuristic categorization.
    Categorizes into SEO, GEO, and AIO.
    """
    if not corpus or not any(len(c.strip()) > 50 for c in corpus):
        corpus = [f"{query} optimization strategies, citations, benchmarks, structured overview, technical factors."]

    # Use TF-IDF vectorizer for 1-gram to 3-grams
    try:
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 3),
            stop_words="english",
            max_df=0.95,
            min_df=1,
            max_features=250,
        )
        tfidf_matrix = vectorizer.fit_transform(corpus)
        feature_names = vectorizer.get_feature_names_out()
        scores = tfidf_matrix.sum(axis=0).A1
        ranked_indices = scores.argsort()[::-1]
    except Exception:
        # Fallback to pure word counting
        ranked_indices = []
        feature_names = []
        scores = []

    candidates: List[str] = []
    for idx in ranked_indices:
        term = feature_names[idx].strip()
        words = term.split()
        if any(w in STOP_WORDS for w in words):
            continue
        if len(term) < 4 or term.isdigit():
            continue
        candidates.append(term)
        if len(candidates) >= top_n * 2:
            break

    # Add core query components if missing
    query_words = [w for w in query.lower().split() if len(w) > 3 and w not in STOP_WORDS]
    for qw in query_words:
        if qw not in candidates:
            candidates.insert(0, qw)

    # Classify candidates into SEO, GEO, AIO categories
    topics: List[SemanticTopic] = []
    seen = set()

    for term in candidates:
        norm = term.lower().strip()
        if norm in seen or len(norm) < 3:
            continue
        seen.add(norm)

        # Count occurrences across corpus to set target bounds
        occurrences = []
        pattern = re.compile(rf"\b{re.escape(norm)}\b", re.I)
        for doc in corpus:
            matches = len(pattern.findall(doc))
            if matches > 0:
                occurrences.append(matches)

        avg_count = (sum(occurrences) / len(occurrences)) if occurrences else 2.0
        inclusion_rate = len(occurrences) / max(len(corpus), 1)

        target_min = max(1, round(avg_count * 0.7))
        target_max = max(target_min + 2, round(avg_count * 1.5))

        # Determine category (geo / aio / seo)
        geo_signals = {"citation", "source", "study", "data", "benchmark", "statistic", "definition", "authority", "evidence", "metric"}
        aio_signals = {"answer", "summary", "overview", "ai", "overview", "synthesize", "extract", "prompt", "engine", "format", "schema"}

        if any(sig in norm for sig in geo_signals):
            category = "geo"
        elif any(sig in norm for sig in aio_signals):
            category = "aio"
        else:
            category = "seo"

        importance = min(5, max(1, round(inclusion_rate * 3 + (1 if len(term.split()) > 1 else 0) + 1)))

        topics.append(
            SemanticTopic(
                term=term.title() if len(term.split()) > 1 else term,
                category=category,
                targetMin=target_min,
                targetMax=target_max,
                currentCount=0,
                importance=importance,
            )
        )

        if len(topics) >= top_n:
            break

    return topics


def build_project_brief(
    query: str,
    extracted_items: List[Dict[str, Any]],
) -> ProjectBrief:
    """
    Synthesize all scraped competitor texts, headings, and metrics into a complete ProjectBrief.
    """
    corpus = [item["clean_text"] for item in extracted_items if item.get("clean_text")]
    competitors = [item["competitor"] for item in extracted_items]

    # Extract topics
    topics = extract_semantic_topics(corpus, query)

    # Compute topic mentions for each competitor
    for comp, item in zip(competitors, extracted_items):
        text = item.get("clean_text", "")
        mentions: Dict[str, int] = {}
        for t in topics:
            count = len(re.findall(rf"\b{re.escape(t.term.lower())}\b", text.lower()))
            mentions[t.term] = count
        comp.topicMentions = mentions

    # Extract questions and outline
    questions = extract_questions_from_corpus(corpus, query)
    outline = extract_outline_from_headings(competitors, query, topics)

    # Word counts
    word_counts = [c.words for c in competitors if c.words > 300]
    target_words = int(sum(word_counts) / len(word_counts)) if word_counts else 2100
    target_words = max(1400, min(3800, round(target_words / 100) * 100))

    return ProjectBrief(
        query=query,
        targetWordCount=target_words,
        targetReadability="College / 10th Grade",
        targetScore=85,
        topics=topics,
        questions=questions,
        outline=outline,
        competitors=competitors,
    )
