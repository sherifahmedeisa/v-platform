import os
import asyncio
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status, Query, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db import (
    init_db,
    get_db,
    is_neon_connected,
    User,
    Profile,
    Document,
    Workspace,
    utc_now,
)
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    ProfileResponse,
    ProfileUpdate,
    AuthResponse,
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceResponse,
    DomainAuditComputeRequest,
    DomainAuditResult,
    ResearchRequest,
    ProjectBrief,
    ResearchProgressEvent,
)
from app.services.domain_analyzer import (
    clean_domain,
    derive_workspace_name,
    compute_domain_audit,
)
from app.services.serp import fetch_serp_results
from app.services.extractor import extract_all_competitors
from app.services.nlp import build_project_brief


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup
    try:
        await init_db()
        print("[v-platform] Database initialized and connected.")
    except Exception as e:
        print(f"[v-platform] Database init warning (will retry on query): {e}")
    yield


app = FastAPI(
    title="V Platform - Neon Auth & SERP Intelligence API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS setup
cors_env = os.getenv("CORS_ORIGINS", "")
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
if cors_env:
    env_origins = [orig.strip() for orig in cors_env.split(",") if orig.strip()]
    origins = list(set(default_origins + env_origins))
else:
    origins = default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter()


# -------------------------------------------------------------
# Helpers
# -------------------------------------------------------------


def user_to_response(user: User) -> UserResponse:
    profile_resp = None
    insp = inspect(user)
    has_profile = "profile" in insp.dict and user.profile is not None
    if has_profile:
        prof = user.profile
        created_str = prof.created_at.isoformat() if prof.created_at else utc_now().isoformat()
        updated_str = prof.updated_at.isoformat() if prof.updated_at else utc_now().isoformat()
        profile_resp = ProfileResponse(
            id=prof.id,
            userId=prof.user_id,
            fullName=prof.full_name,
            avatarUrl=prof.avatar_url,
            bio=prof.bio,
            role=prof.role,
            preferences=prof.preferences or {},
            createdAt=created_str,
            updatedAt=updated_str,
        )
    user_created_str = user.created_at.isoformat() if user.created_at else utc_now().isoformat()
    return UserResponse(
        id=user.id,
        email=user.email,
        isActive=user.is_active,
        createdAt=user_created_str,
        profile=profile_resp,
    )


def doc_to_response(doc: Document) -> DocumentResponse:
    created_str = doc.created_at.isoformat() if doc.created_at else utc_now().isoformat()
    updated_str = doc.updated_at.isoformat() if doc.updated_at else utc_now().isoformat()
    return DocumentResponse(
        id=doc.id,
        userId=doc.user_id,
        title=doc.title,
        query=doc.query,
        content=doc.content,
        brief=doc.brief_data,
        seoScore=doc.seo_score,
        geoScore=doc.geo_score,
        aioScore=doc.aio_score,
        wordCount=doc.word_count,
        createdAt=created_str,
        updatedAt=updated_str,
    )


def workspace_to_response(ws: Workspace) -> WorkspaceResponse:
    created_str = ws.created_at.isoformat() if ws.created_at else utc_now().isoformat()
    updated_str = ws.updated_at.isoformat() if ws.updated_at else utc_now().isoformat()
    return WorkspaceResponse(
        id=ws.id,
        userId=ws.user_id,
        name=ws.name,
        domain=ws.domain,
        targetScore=ws.target_score,
        overallScore=ws.overall_score,
        seoScore=ws.seo_score,
        geoScore=ws.geo_score,
        aioScore=ws.aio_score,
        howToFix=ws.how_to_fix or [],
        competitors=ws.competitors or [],
        createdAt=created_str,
        updatedAt=updated_str,
    )


# -------------------------------------------------------------
# System & Health
# -------------------------------------------------------------

@api_router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "connected"
    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    return {
        "status": "ok",
        "service": "V Platform Neon API",
        "database": db_status,
        "neon": is_neon_connected(),
    }


# -------------------------------------------------------------
# Authentication Endpoints
# -------------------------------------------------------------

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(req: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    email_clean = req.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Invalid email address.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    # Check existing user
    stmt = select(User).where(User.email == email_clean)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    hashed_pw = hash_password(req.password)
    new_user = User(
        email=email_clean,
        hashed_password=hashed_pw,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()  # populate new_user.id

    full_name = req.fullName.strip() if req.fullName and req.fullName.strip() else email_clean.split("@")[0].capitalize()
    new_profile = Profile(
        user_id=new_user.id,
        full_name=full_name,
        role=req.role or "Content Architect",
        preferences={"theme": "dark", "autoSave": True},
    )
    db.add(new_profile)

    await db.commit()
    new_user.profile = new_profile

    token = create_access_token({"sub": new_user.id, "email": new_user.email})
    return AuthResponse(token=token, user=user_to_response(new_user))



@api_router.post("/auth/login", response_model=AuthResponse)
async def login(req: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    email_clean = req.email.strip().lower()
    stmt = select(User).options(selectinload(User.profile)).where(User.email == email_clean)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive.")

    if not user.profile:
        prof = Profile(
            user_id=user.id,
            full_name=user.email.split("@")[0].capitalize(),
            role="Content Architect",
            preferences={"theme": "dark", "autoSave": True},
        )
        db.add(prof)
        await db.commit()
        user.profile = prof

    token = create_access_token({"sub": user.id, "email": user.email})
    return AuthResponse(token=token, user=user_to_response(user))


@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return user_to_response(current_user)


# -------------------------------------------------------------
# User Profile Endpoints
# -------------------------------------------------------------

@api_router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.profile:
        # Create profile if missing
        prof = Profile(
            user_id=current_user.id,
            full_name=current_user.email.split("@")[0].capitalize(),
            role="Content Architect",
            preferences={"theme": "dark", "autoSave": True},
        )
        db.add(prof)
        await db.commit()
        await db.refresh(prof)
        current_user.profile = prof

    return ProfileResponse(
        id=current_user.profile.id,
        userId=current_user.profile.user_id,
        fullName=current_user.profile.full_name,
        avatarUrl=current_user.profile.avatar_url,
        bio=current_user.profile.bio,
        role=current_user.profile.role,
        preferences=current_user.profile.preferences or {},
        createdAt=current_user.profile.created_at.isoformat(),
        updatedAt=current_user.profile.updated_at.isoformat(),
    )


@api_router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    req: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Profile).where(Profile.user_id == current_user.id)
    profile = (await db.execute(stmt)).scalar_one_or_none()

    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    if req.fullName is not None:
        profile.full_name = req.fullName.strip()
    if req.avatarUrl is not None:
        profile.avatar_url = req.avatarUrl.strip() or None
    if req.bio is not None:
        profile.bio = req.bio.strip()
    if req.role is not None:
        profile.role = req.role.strip()
    if req.preferences is not None:
        merged_prefs = dict(profile.preferences or {})
        merged_prefs.update(req.preferences)
        profile.preferences = merged_prefs


    profile.updated_at = utc_now()
    await db.commit()
    await db.refresh(profile)

    return ProfileResponse(
        id=profile.id,
        userId=profile.user_id,
        fullName=profile.full_name,
        avatarUrl=profile.avatar_url,
        bio=profile.bio,
        role=profile.role,
        preferences=profile.preferences or {},
        createdAt=profile.created_at.isoformat(),
        updatedAt=profile.updated_at.isoformat(),
    )


# -------------------------------------------------------------
# Document & Draft Persistence Endpoints
# -------------------------------------------------------------

@api_router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.updated_at.desc())
    )
    result = await db.execute(stmt)
    docs = result.scalars().all()
    return [doc_to_response(d) for d in docs]


@api_router.post("/documents", response_model=DocumentResponse)
async def create_document(
    req: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = Document(
        user_id=current_user.id,
        title=req.title.strip() if req.title and req.title.strip() else "Untitled Document",
        query=req.query.strip() if req.query and req.query.strip() else "Generative Engine Optimization",
        content=req.content,
        brief_data=req.brief,
        seo_score=req.seoScore,
        geo_score=req.geoScore,
        aio_score=req.aioScore,
        word_count=req.wordCount,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc_to_response(doc)


@api_router.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc_to_response(doc)


@api_router.put("/documents/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: str,
    req: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if req.title is not None:
        doc.title = req.title
    if req.query is not None:
        doc.query = req.query
    if req.content is not None:
        doc.content = req.content
    if req.brief is not None:
        doc.brief_data = req.brief
    if req.seoScore is not None:
        doc.seo_score = req.seoScore
    if req.geoScore is not None:
        doc.geo_score = req.geoScore
    if req.aioScore is not None:
        doc.aio_score = req.aioScore
    if req.wordCount is not None:
        doc.word_count = req.wordCount

    doc.updated_at = utc_now()
    await db.commit()
    await db.refresh(doc)
    return doc_to_response(doc)


@api_router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    await db.delete(doc)
    await db.commit()
    return {"deleted": True, "id": doc_id}


# -------------------------------------------------------------
# Workspace & Website Domain Audit Endpoints (Neon PostgreSQL)
# -------------------------------------------------------------

@api_router.post("/workspaces/compute", response_model=DomainAuditResult)
async def compute_workspace_domain(req: DomainAuditComputeRequest):
    """
    Compute domain content audit:
    - Calculates SEO, GEO, and AIO scores
    - Produces actionable 'how to fix' deficit recommendations
    - Identifies top content competitors with content match percentage
    """
    domain = req.domain.strip()
    if not domain:
        raise HTTPException(status_code=400, detail="Domain cannot be empty.")
    result = compute_domain_audit(domain, req.name)
    return result


@api_router.get("/workspaces", response_model=List[WorkspaceResponse])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Workspace)
        .where(Workspace.user_id == current_user.id)
        .order_by(Workspace.created_at.desc())
    )
    result = await db.execute(stmt)
    workspaces = result.scalars().all()
    return [workspace_to_response(ws) for ws in workspaces]


@api_router.post("/workspaces", response_model=WorkspaceResponse)
async def create_workspace(
    req: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cleaned = clean_domain(req.domain)
    name = req.name.strip() if req.name and req.name.strip() else derive_workspace_name(cleaned)

    # Compute audit if scores not pre-supplied
    if req.overallScore is None or req.howToFix is None or req.competitors is None:
        computed = compute_domain_audit(cleaned, name)
        overall_score = computed.overallScore
        seo_score = computed.seoScore
        geo_score = computed.geoScore
        aio_score = computed.aioScore
        how_to_fix = [f.model_dump() for f in computed.howToFix]
        competitors = [c.model_dump() for c in computed.competitors]
    else:
        overall_score = req.overallScore
        seo_score = req.seoScore or 0
        geo_score = req.geoScore or 0
        aio_score = req.aioScore or 0
        how_to_fix = [f.model_dump() for f in req.howToFix] if req.howToFix else []
        competitors = [c.model_dump() for c in req.competitors] if req.competitors else []

    ws = Workspace(
        user_id=current_user.id,
        name=name,
        domain=cleaned,
        target_score=req.targetScore or 85,
        overall_score=overall_score,
        seo_score=seo_score,
        geo_score=geo_score,
        aio_score=aio_score,
        how_to_fix=how_to_fix,
        competitors=competitors,
    )
    db.add(ws)
    await db.commit()
    await db.refresh(ws)
    return workspace_to_response(ws)


@api_router.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Workspace).where(Workspace.id == workspace_id, Workspace.user_id == current_user.id)
    ws = (await db.execute(stmt)).scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    return workspace_to_response(ws)


@api_router.put("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    req: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Workspace).where(Workspace.id == workspace_id, Workspace.user_id == current_user.id)
    ws = (await db.execute(stmt)).scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    if req.name is not None and req.name.strip():
        ws.name = req.name.strip()
    if req.domain is not None and req.domain.strip():
        ws.domain = clean_domain(req.domain)
    if req.targetScore is not None:
        ws.target_score = req.targetScore
    if req.overallScore is not None:
        ws.overall_score = req.overallScore
    if req.seoScore is not None:
        ws.seo_score = req.seoScore
    if req.geoScore is not None:
        ws.geo_score = req.geoScore
    if req.aioScore is not None:
        ws.aio_score = req.aioScore
    if req.howToFix is not None:
        ws.how_to_fix = [f.model_dump() for f in req.howToFix]
    if req.competitors is not None:
        ws.competitors = [c.model_dump() for c in req.competitors]

    ws.updated_at = utc_now()
    await db.commit()
    await db.refresh(ws)
    return workspace_to_response(ws)


@api_router.delete("/workspaces/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Workspace).where(Workspace.id == workspace_id, Workspace.user_id == current_user.id)
    ws = (await db.execute(stmt)).scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    await db.delete(ws)
    await db.commit()
    return {"deleted": True, "id": workspace_id}



# -------------------------------------------------------------
# SERP Scraping & NLP Research Pipeline
# -------------------------------------------------------------

@api_router.post("/research", response_model=ProjectBrief)
async def conduct_research(req: ResearchRequest):
    """Synchronous full research workflow: SERP fetching, scraping, hybrid NLP synthesis."""
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # 1. Fetch SERP
    serp_results = await fetch_serp_results(query, max_results=req.maxCompetitors)
    # 2. Extract content & headings
    extracted = await extract_all_competitors(serp_results, concurrency_limit=5)
    # 3. NLP synthesis
    brief = build_project_brief(query, extracted)
    return brief


@api_router.get("/research/stream")
async def stream_research(query: str = Query(..., min_length=1), max_competitors: int = Query(10, ge=1, le=20)):
    """
    SSE stream emitting step-by-step progress events as competitor pages are scraped,
    ending with the full synthesized ProjectBrief.
    """
    clean_query = query.strip()

    async def event_generator():
        try:
            # 1. SERP Search
            ev_start = ResearchProgressEvent(
                step="serp",
                status="in_progress",
                percent=15,
                message=f"Fetching top SERP competitor rankings for '{clean_query}'...",
            )
            yield f"data: {ev_start.model_dump_json()}\n\n"
            await asyncio.sleep(0.1)

            serp_results = await fetch_serp_results(clean_query, max_results=max_competitors)

            total_serp = len(serp_results)
            ev_serp_done = ResearchProgressEvent(
                step="serp",
                status="complete",
                percent=30,
                message=f"Found {total_serp} competitor organic results. Starting deep content scraping...",
                current=total_serp,
                total=total_serp,
            )
            yield f"data: {ev_serp_done.model_dump_json()}\n\n"

            # 2. Page Extraction with progress callbacks
            async def on_progress(completed: int, total: int):
                pct = 30 + int((completed / max(total, 1)) * 45)  # 30% to 75%
                ev_prog = ResearchProgressEvent(
                    step="extraction",
                    status="in_progress",
                    percent=pct,
                    message=f"Scraped & parsed {completed}/{total} competitor articles...",
                    current=completed,
                    total=total,
                )
                yield_queue.append(ev_prog)

            yield_queue: List[ResearchProgressEvent] = []

            # We wrap extract_all_competitors
            extraction_task = asyncio.create_task(
                extract_all_competitors(
                    serp_results,
                    concurrency_limit=5,
                    on_progress=lambda c, t: yield_queue.append(
                        ResearchProgressEvent(
                            step="extraction",
                            status="in_progress",
                            percent=30 + int((c / max(t, 1)) * 45),
                            message=f"Scraped {c}/{t} competitor pages...",
                            current=c,
                            total=t,
                        )
                    ),
                )
            )

            while not extraction_task.done():
                while yield_queue:
                    ev = yield_queue.pop(0)
                    yield f"data: {ev.model_dump_json()}\n\n"
                await asyncio.sleep(0.15)

            while yield_queue:
                ev = yield_queue.pop(0)
                yield f"data: {ev.model_dump_json()}\n\n"

            extracted_items = await extraction_task

            # 3. Hybrid NLP analysis
            ev_nlp = ResearchProgressEvent(
                step="nlp",
                status="in_progress",
                percent=85,
                message="Running TF-IDF keyword extraction & heading cluster synthesis...",
            )
            yield f"data: {ev_nlp.model_dump_json()}\n\n"
            await asyncio.sleep(0.1)

            brief = build_project_brief(clean_query, extracted_items)

            # 4. Complete
            ev_complete = ResearchProgressEvent(
                step="complete",
                status="complete",
                percent=100,
                message=f"Brief ready with {len(brief.topics)} semantic topics and {len(brief.outline)} outline sections.",
                brief=brief,
            )
            yield f"data: {ev_complete.model_dump_json()}\n\n"

        except Exception as e:
            ev_err = ResearchProgressEvent(
                step="error",
                status="error",
                percent=100,
                message=f"Research error: {str(e)}",
            )
            yield f"data: {ev_err.model_dump_json()}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# Mount routes with /api prefix and also root prefix for 100% path compatibility
app.include_router(api_router, prefix="/api")
app.include_router(api_router)

