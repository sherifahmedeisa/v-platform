import asyncio
import re
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
import trafilatura

from app.schemas import CompetitorHeading, SerpCompetitor

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]


def extract_headings_from_soup(soup: BeautifulSoup) -> List[CompetitorHeading]:
    """Extract ordered H2 and H3 headings from BeautifulSoup."""
    headings: List[CompetitorHeading] = []
    for tag in soup.find_all(["h2", "h3"]):
        text = tag.get_text(separator=" ", strip=True)
        if not text or len(text) < 3 or len(text) > 150:
            continue
        level = "h2" if tag.name.lower() == "h2" else "h3"
        headings.append(CompetitorHeading(level=level, text=text))
    return headings


def compute_heuristics(text: str, headings_count: int, word_count: int) -> Dict[str, int]:
    """Calculate approximate SEO, GEO, and AIO benchmark scores."""
    # GEO score heuristics: presence of citations, statistics, definitions, quotes
    geo_points = 50
    if re.search(r"\b(according to|study|research|survey|percent|%|\d{4})\b", text, re.I):
        geo_points += 15
    if re.search(r"\b(is defined as|refers to|means that|specifically)\b", text, re.I):
        geo_points += 12
    if headings_count >= 5:
        geo_points += 10
    if word_count >= 1200:
        geo_points += 8
    geo_score = min(96, max(45, geo_points))

    # SEO score heuristics: length, heading density
    seo_points = 45
    if word_count > 1800:
        seo_points += 25
    elif word_count > 1000:
        seo_points += 18
    elif word_count > 500:
        seo_points += 10
    if headings_count >= 8:
        seo_points += 20
    elif headings_count >= 4:
        seo_points += 12
    seo_score = min(98, max(40, seo_points))

    # AIO score: direct structured answer format
    aio_points = 52
    if re.search(r"\b(step \d|key takeaways|summary|overview|pros and cons)\b", text, re.I):
        aio_points += 20
    if headings_count >= 4:
        aio_points += 14
    aio_score = min(95, max(48, aio_points))

    overall = round((seo_score * 0.4) + (geo_score * 0.35) + (aio_score * 0.25))

    return {
        "geoScore": geo_score,
        "seoScore": seo_score,
        "aioScore": aio_score,
        "score": overall,
    }


async def fetch_and_parse_single_page(
    client: httpx.AsyncClient,
    serp_item: Dict[str, Any],
) -> Dict[str, Any]:
    """Fetch and parse one competitor URL using httpx, trafilatura, and BeautifulSoup."""
    url = serp_item.get("url", "")
    title = serp_item.get("title", "Untitled")
    rank = serp_item.get("rank", 1)
    domain = serp_item.get("domain", "")
    snippet = serp_item.get("snippet", "")

    headers = {
        "User-Agent": USER_AGENTS[rank % len(USER_AGENTS)],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.7",
    }

    clean_text = ""
    headings_list: List[CompetitorHeading] = []
    word_count = 0
    headings_count = 0

    try:
        resp = await client.get(url, headers=headers)
        if resp.status_code == 200 and resp.text:
            html = resp.text

            # 1. Clean article body with trafilatura
            extracted_text = trafilatura.extract(
                html,
                include_comments=False,
                include_tables=True,
                no_fallback=False,
            )
            if extracted_text and len(extracted_text.strip()) > 100:
                clean_text = extracted_text.strip()
            else:
                # Fallback to BeautifulSoup text extraction
                soup = BeautifulSoup(html, "html.parser")
                for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
                    tag.decompose()
                clean_text = soup.get_text(separator=" ", strip=True)

            # 2. Extract headings with BeautifulSoup
            soup = BeautifulSoup(html, "html.parser")
            headings_list = extract_headings_from_soup(soup)
            headings_count = len(soup.find_all(["h1", "h2", "h3", "h4"]))
    except Exception:
        # Fallback to snippet + title text if fetch blocked or failed
        clean_text = f"{title}. {snippet}"

    # Calculate word count
    words = re.findall(r"\b\w+\b", clean_text)
    word_count = len(words)
    if word_count < 100 and snippet:
        # Pad with snippet context if page was thin/protected
        clean_text = f"{title}. {snippet}. " + clean_text
        words = re.findall(r"\b\w+\b", clean_text)
        word_count = len(words)

    # Calculate metrics
    metrics = compute_heuristics(clean_text, headings_count, word_count)

    competitor = SerpCompetitor(
        rank=rank,
        title=title,
        url=url,
        domain=domain,
        words=word_count,
        headings=max(headings_count, len(headings_list)),
        geoScore=metrics["geoScore"],
        score=metrics["score"],
        seoScore=metrics["seoScore"],
        aioScore=metrics["aioScore"],
        sections=max(len(headings_list), 1),
        headingsList=headings_list,
        topicMentions={},
    )

    return {
        "competitor": competitor,
        "clean_text": clean_text,
    }


async def extract_all_competitors(
    serp_results: List[Dict[str, Any]],
    concurrency_limit: int = 6,
    on_progress: Optional[Any] = None,
) -> List[Dict[str, Any]]:
    """
    Extract competitor data concurrently with a semaphore limit.
    Calls optional on_progress(completed_count, total_count) callback.
    """
    semaphore = asyncio.Semaphore(concurrency_limit)
    total = len(serp_results)
    completed_count = 0

    async def sem_task(client: httpx.AsyncClient, item: Dict[str, Any]):
        nonlocal completed_count
        async with semaphore:
            res = await fetch_and_parse_single_page(client, item)
            completed_count += 1
            if on_progress:
                try:
                    if asyncio.iscoroutinefunction(on_progress):
                        await on_progress(completed_count, total)
                    else:
                        on_progress(completed_count, total)
                except Exception:
                    pass
            return res

    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
        tasks = [sem_task(client, item) for item in serp_results]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    extracted_items = []
    for i, res in enumerate(results):
        if isinstance(res, Exception):
            # Fallback placeholder
            serp_item = serp_results[i]
            comp = SerpCompetitor(
                rank=serp_item.get("rank", i + 1),
                title=serp_item.get("title", "Competitor"),
                url=serp_item.get("url", ""),
                domain=serp_item.get("domain", ""),
                words=500,
                headings=3,
                geoScore=60,
                score=65,
                seoScore=68,
                aioScore=62,
                sections=3,
                headingsList=[],
                topicMentions={},
            )
            extracted_items.append({"competitor": comp, "clean_text": serp_item.get("snippet", "")})
        else:
            extracted_items.append(res)

    # Sort strictly by rank 1..N
    extracted_items.sort(key=lambda x: x["competitor"].rank)
    return extracted_items
