import os
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator
from dotenv import load_dotenv

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Integer,
    JSON,
    text,
    select,
)


# Load environment variables from cwd and parent folders
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
SQLITE_FALLBACK_URL = os.getenv("SQLITE_FALLBACK_URL", "sqlite+aiosqlite:///./v_platform.db")
ACTIVE_DB_URL = DATABASE_URL or SQLITE_FALLBACK_URL




def normalize_db_url(url: str) -> str:
    """Normalize PostgreSQL URLs for asyncpg driver and strip query strings."""
    normalized = url
    if normalized.startswith("postgres://"):
        normalized = normalized.replace("postgres://", "postgresql+asyncpg://", 1)
    elif normalized.startswith("postgresql://") and not normalized.startswith("postgresql+asyncpg://"):
        normalized = normalized.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "?" in normalized:
        normalized = normalized.split("?")[0]
    return normalized


def create_engine_for_url(raw_url: str):
    """Build an AsyncEngine configured for asyncpg or aiosqlite."""
    clean_url = normalize_db_url(raw_url)
    is_sqlite = clean_url.startswith("sqlite")

    if is_sqlite:
        connect_args = {}
    else:
        # Resilient asyncpg configuration with 8s connection timeout for remote Neon
        connect_args = {
            "ssl": "require",
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "timeout": 8.0,
            "command_timeout": 15.0,
        }

    return create_async_engine(
        clean_url,
        connect_args=connect_args,
        poolclass=NullPool,
        echo=False,
    )


# Active engine and sessionmaker
engine = create_engine_for_url(ACTIVE_DB_URL)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()
_db_initialized: bool = False
_using_sqlite_fallback: bool = False


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan", lazy="selectin")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    workspaces = relationship("Workspace", back_populates="user", cascade="all, delete-orphan", lazy="selectin")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False, default="Anonymous Creator")
    avatar_url = Column(String(1024), nullable=True)
    bio = Column(Text, nullable=True)
    role = Column(String(100), default="Content Architect", nullable=False)
    preferences = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="profile", lazy="selectin")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    query = Column(String(255), nullable=False)
    content = Column(Text, default="", nullable=False)
    brief_data = Column(JSON, nullable=True)
    seo_score = Column(Integer, default=0, nullable=False)
    geo_score = Column(Integer, default=0, nullable=False)
    aio_score = Column(Integer, default=0, nullable=False)
    word_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="documents", lazy="selectin")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    domain = Column(String(255), nullable=False)
    target_score = Column(Integer, default=85, nullable=False)
    overall_score = Column(Integer, default=0, nullable=False)
    seo_score = Column(Integer, default=0, nullable=False)
    geo_score = Column(Integer, default=0, nullable=False)
    aio_score = Column(Integer, default=0, nullable=False)
    how_to_fix = Column(JSON, default=list, nullable=False)
    competitors = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="workspaces", lazy="selectin")



def is_neon_connected() -> bool:
    """Return True if connected to Neon PostgreSQL, False if using SQLite or offline."""
    return _db_initialized and not _using_sqlite_fallback and not normalize_db_url(DATABASE_URL).startswith("sqlite")


async def seed_demo_user(engine_target) -> None:
    """Ensure standard demo creator user exists with known credentials."""
    try:
        from app.auth import hash_password
        maker = async_sessionmaker(
            bind=engine_target,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
        demo_email = "creator@vplatform.ai"
        async with maker() as session:
            stmt = select(User).where(User.email == demo_email)
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if not existing:
                demo_user = User(
                    email=demo_email,
                    hashed_password=hash_password("Password2026!"),
                    is_active=True,
                )
                session.add(demo_user)
                await session.flush()
                demo_profile = Profile(
                    user_id=demo_user.id,
                    full_name="Alex Creator",
                    role="Lead GEO Strategist",
                    preferences={"theme": "dark", "autoSave": True},
                )
                session.add(demo_profile)
                await session.commit()
    except Exception as e:
        err = str(e) or type(e).__name__
        print(f"[v-platform] Demo account seeding note: {err}")


async def init_db() -> None:
    """
    Create all database tables on startup if they don't exist.
    If remote Neon PostgreSQL is unreachable or times out, seamlessly falls back
    to local SQLite storage to ensure uninterrupted service and testing.
    """
    global engine, AsyncSessionLocal, _db_initialized, _using_sqlite_fallback

    if _db_initialized:
        return

    clean_url = normalize_db_url(DATABASE_URL)
    if clean_url.startswith("sqlite"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await seed_demo_user(engine)
        _db_initialized = True
        return

    # Attempt connection to Neon PostgreSQL
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
            await conn.run_sync(Base.metadata.create_all)
        await seed_demo_user(engine)
        _db_initialized = True
        _using_sqlite_fallback = False
        print("[v-platform] Successfully connected to Neon PostgreSQL and initialized schema.")
    except Exception as e:
        err_msg = str(e) or type(e).__name__
        print(f"[v-platform] Remote Neon connection unavailable ({err_msg}). Activating SQLite fallback...")
        _using_sqlite_fallback = True
        engine = create_engine_for_url(SQLITE_FALLBACK_URL)
        AsyncSessionLocal = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await seed_demo_user(engine)
        _db_initialized = True
        print("[v-platform] SQLite fallback tables initialized successfully.")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for yielding an async session, ensuring tables exist first."""
    if not _db_initialized:
        await init_db()

    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
