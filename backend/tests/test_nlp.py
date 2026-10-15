import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.schemas import SerpCompetitor, CompetitorHeading
from app.services.nlp import (
    extract_semantic_topics,
    extract_questions_from_corpus,
    build_project_brief,
)


def test_extract_semantic_topics():
    corpus = [
        "Generative Engine Optimization focuses on authoritative citations, factual benchmarks, and clear definitions.",
        "To win in AI overview search, structured answers and comprehensive schema markup are essential for LLM synthesis.",
        "Traditional SEO targets search engines while GEO targets large language models and generative answer engines.",
    ]
    topics = extract_semantic_topics(corpus, "Generative Engine Optimization", top_n=10)
    assert len(topics) > 0
    categories = {t.category for t in topics}
    assert any(c in {"seo", "geo", "aio"} for c in categories)
    for t in topics:
        assert t.targetMin >= 1
        assert t.targetMax >= t.targetMin
        assert 1 <= t.importance <= 5


def test_extract_questions_from_corpus():
    corpus = [
        "What is Generative Engine Optimization? It is an emerging paradigm. How does GEO compare to SEO? Which metrics matter most?",
    ]
    questions = extract_questions_from_corpus(corpus, "GEO")
    assert len(questions) >= 3
    for q in questions:
        assert q.question.endswith("?")
        assert q.intent in {"definitional", "comparative", "procedural", "evaluative"}


def test_extract_outline_and_build_brief():
    headings = [
        CompetitorHeading(level="h2", text="Understanding Generative Engine Optimization"),
        CompetitorHeading(level="h3", text="Core Principles and Methodology"),
        CompetitorHeading(level="h2", text="Key Ranking Factors in AI Search"),
    ]
    comp = SerpCompetitor(
        rank=1,
        title="The Ultimate GEO Guide",
        url="https://example.com/geo",
        words=1500,
        headings=3,
        geoScore=85,
        headingsList=headings,
    )

    items = [{"competitor": comp, "clean_text": "Generative engine optimization benchmark study and citations."}]
    brief = build_project_brief("Generative Engine Optimization", items)

    assert brief.query == "Generative Engine Optimization"
    assert brief.targetWordCount >= 1400
    assert len(brief.topics) > 0
    assert len(brief.outline) > 0
    assert len(brief.competitors) == 1
    assert brief.competitors[0].topicMentions is not None
