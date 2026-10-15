from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field


# -------------------------------------------------------------
# SERP, Competitor & Research Schemas
# -------------------------------------------------------------

class SemanticTopic(BaseModel):
    term: str
    category: Literal["seo", "geo", "aio"]
    targetMin: int
    targetMax: int
    currentCount: int = 0
    importance: int = Field(ge=1, le=5)


class QuestionItem(BaseModel):
    id: str
    question: str
    intent: Literal["definitional", "comparative", "procedural", "evaluative"]
    answered: bool = False
    suggestedAnswer: Optional[str] = None


class OutlineItem(BaseModel):
    id: str
    level: Literal["h2", "h3"]
    title: str
    keyTopics: List[str] = Field(default_factory=list)


class CompetitorHeading(BaseModel):
    level: Literal["h2", "h3"]
    text: str


class SerpCompetitor(BaseModel):
    rank: int
    title: str
    url: str
    domain: Optional[str] = None
    words: int = 0
    headings: int = 0
    geoScore: int = 50
    score: Optional[int] = None
    seoScore: Optional[int] = None
    aioScore: Optional[int] = None
    sections: Optional[int] = None
    headingsList: Optional[List[CompetitorHeading]] = None
    topicMentions: Optional[Dict[str, int]] = None


class ProjectBrief(BaseModel):
    query: str
    targetWordCount: int
    targetReadability: str
    targetScore: int
    topics: List[SemanticTopic]
    questions: List[QuestionItem]
    outline: List[OutlineItem]
    competitors: List[SerpCompetitor]

    model_config = {
        "populate_by_name": True
    }


class ResearchProgressEvent(BaseModel):
    step: str
    status: Literal["starting", "in_progress", "complete", "cached", "error"]
    percent: int
    message: str
    current: Optional[int] = None
    total: Optional[int] = None
    brief: Optional[ProjectBrief] = None


class ResearchRequest(BaseModel):
    query: str
    maxCompetitors: int = 10


# -------------------------------------------------------------
# Auth & User Profile Schemas (Neon PostgreSQL)
# -------------------------------------------------------------

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    fullName: Optional[str] = None
    role: Optional[str] = "Content Architect"


class UserLoginRequest(BaseModel):
    email: str
    password: str


class ProfileUpdate(BaseModel):
    fullName: Optional[str] = None
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None
    role: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


class ProfileResponse(BaseModel):
    id: str
    userId: str
    fullName: str
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None
    role: str
    preferences: Dict[str, Any] = Field(default_factory=dict)
    createdAt: str
    updatedAt: str


class UserResponse(BaseModel):
    id: str
    email: str
    isActive: bool
    createdAt: str
    profile: Optional[ProfileResponse] = None


class AuthResponse(BaseModel):
    token: str
    tokenType: str = "bearer"
    user: UserResponse


# -------------------------------------------------------------
# User Documents / Projects Persistence Schemas
# -------------------------------------------------------------

class DocumentCreate(BaseModel):
    title: str
    query: str
    content: str = ""
    brief: Optional[Dict[str, Any]] = None
    seoScore: int = 0
    geoScore: int = 0
    aioScore: int = 0
    wordCount: int = 0


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    query: Optional[str] = None
    content: Optional[str] = None
    brief: Optional[Dict[str, Any]] = None
    seoScore: Optional[int] = None
    geoScore: Optional[int] = None
    aioScore: Optional[int] = None
    wordCount: Optional[int] = None


class DocumentResponse(BaseModel):
    id: str
    userId: str
    title: str
    query: str
    content: str
    brief: Optional[Dict[str, Any]] = None
    seoScore: int
    geoScore: int
    aioScore: int
    wordCount: int
    createdAt: str
    updatedAt: str


# -------------------------------------------------------------
# Workspace & Website Domain Audit Schemas (Neon PostgreSQL)
# -------------------------------------------------------------

class ContentCompetitorMatch(BaseModel):
    name: str
    domain: str
    matchPercentage: int
    keywordOverlap: int
    semanticEntityScore: int
    searchIntentScore: int
    topKeywords: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)


class HowToFixItem(BaseModel):
    id: str
    category: Literal["seo", "geo", "aio"]
    impact: Literal["high", "medium", "low"]
    title: str
    detail: str
    fixProposal: str
    snippet: Optional[str] = None


class WorkspaceCreate(BaseModel):
    domain: str
    name: Optional[str] = None
    targetScore: int = 85
    overallScore: Optional[int] = None
    seoScore: Optional[int] = None
    geoScore: Optional[int] = None
    aioScore: Optional[int] = None
    howToFix: Optional[List[HowToFixItem]] = None
    competitors: Optional[List[ContentCompetitorMatch]] = None


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    targetScore: Optional[int] = None
    overallScore: Optional[int] = None
    seoScore: Optional[int] = None
    geoScore: Optional[int] = None
    aioScore: Optional[int] = None
    howToFix: Optional[List[HowToFixItem]] = None
    competitors: Optional[List[ContentCompetitorMatch]] = None


class WorkspaceResponse(BaseModel):
    id: str
    userId: str
    name: str
    domain: str
    targetScore: int
    overallScore: int
    seoScore: int
    geoScore: int
    aioScore: int
    howToFix: List[HowToFixItem] = Field(default_factory=list)
    competitors: List[ContentCompetitorMatch] = Field(default_factory=list)
    createdAt: str
    updatedAt: str


class DomainAuditComputeRequest(BaseModel):
    domain: str
    name: Optional[str] = None


class DomainAuditResult(BaseModel):
    domain: str
    name: str
    overallScore: int
    seoScore: int
    geoScore: int
    aioScore: int
    targetScore: int
    howToFix: List[HowToFixItem]
    competitors: List[ContentCompetitorMatch]

