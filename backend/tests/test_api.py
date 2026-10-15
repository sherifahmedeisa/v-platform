import sys
import os
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_v_platform.db"

from app.main import app
from app.db import init_db


@pytest.fixture(scope="session", autouse=True)
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    await init_db()


@pytest_asyncio.fixture
async def async_client():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    resp = await async_client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"


@pytest.mark.asyncio
async def test_auth_and_profile_flow(async_client: AsyncClient):
    # Unique test email
    rand = str(uuid.uuid4())[:8]
    email = f"architect_{rand}@vplatform.test"
    password = "SuperSecurePassword123!"
    full_name = f"Alex Creator {rand}"

    # 1. Register
    reg_resp = await async_client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "fullName": full_name},
    )
    assert reg_resp.status_code == 200, reg_resp.text
    reg_data = reg_resp.json()
    token = reg_data["token"]
    assert token is not None
    assert reg_data["user"]["email"] == email
    assert reg_data["user"]["profile"]["fullName"] == full_name

    # 2. Reject duplicate registration
    dup_resp = await async_client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )
    assert dup_resp.status_code == 400

    # 3. Login
    login_resp = await async_client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    login_token = login_resp.json()["token"]

    # 4. Get Current User (/api/auth/me)
    headers = {"Authorization": f"Bearer {login_token}"}
    me_resp = await async_client.get("/api/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email

    # 5. Get and Update Profile
    prof_resp = await async_client.get("/api/profile", headers=headers)
    assert prof_resp.status_code == 200
    assert prof_resp.json()["fullName"] == full_name

    upd_resp = await async_client.put(
        "/api/profile",
        headers=headers,
        json={
            "fullName": f"Updated {full_name}",
            "bio": "Leading Generative Engine Optimization research.",
            "role": "Principal AI Researcher",
            "preferences": {"theme": "cupertino-dark", "editorFontSize": 15},
        },
    )
    assert upd_resp.status_code == 200
    upd_data = upd_resp.json()
    assert upd_data["fullName"] == f"Updated {full_name}"
    assert upd_data["role"] == "Principal AI Researcher"
    assert upd_data["preferences"]["editorFontSize"] == 15


@pytest.mark.asyncio
async def test_document_crud_flow(async_client: AsyncClient):
    rand = str(uuid.uuid4())[:8]
    email = f"writer_{rand}@vplatform.test"
    password = "WriterSecurePassword123!"

    # Register & get auth token
    reg = await async_client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "fullName": "Content Writer"},
    )
    token = reg.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create document
    create_payload = {
        "title": "Comprehensive Guide to Generative Engine Optimization",
        "query": "Generative Engine Optimization",
        "content": "# Generative Engine Optimization\n\nGEO is the process of optimizing content for LLM synthesis.",
        "brief": {"targetScore": 85, "targetWordCount": 2400},
        "seoScore": 72,
        "geoScore": 80,
        "aioScore": 78,
        "wordCount": 150,
    }
    create_resp = await async_client.post("/api/documents", headers=headers, json=create_payload)
    assert create_resp.status_code == 200
    doc = create_resp.json()
    doc_id = doc["id"]
    assert doc["title"] == create_payload["title"]
    assert doc["geoScore"] == 80

    # 2. List documents
    list_resp = await async_client.get("/api/documents", headers=headers)
    assert list_resp.status_code == 200
    doc_list = list_resp.json()
    assert len(doc_list) >= 1
    assert any(d["id"] == doc_id for d in doc_list)

    # 3. Get document by ID
    get_resp = await async_client.get(f"/api/documents/{doc_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["query"] == "Generative Engine Optimization"

    # 4. Update document
    upd_resp = await async_client.put(
        f"/api/documents/{doc_id}",
        headers=headers,
        json={
            "title": "GEO Mastery 2026: The Definitive Blueprint",
            "content": "# GEO Mastery\n\nExpanded comprehensive benchmark study.",
            "wordCount": 1820,
            "seoScore": 89,
            "geoScore": 92,
        },
    )
    assert upd_resp.status_code == 200
    updated_doc = upd_resp.json()
    assert updated_doc["title"] == "GEO Mastery 2026: The Definitive Blueprint"
    assert updated_doc["geoScore"] == 92

    # 5. Delete document
    del_resp = await async_client.delete(f"/api/documents/{doc_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True

    # 6. Verify 404 after deletion
    get_deleted = await async_client.get(f"/api/documents/{doc_id}", headers=headers)
    assert get_deleted.status_code == 404


@pytest.mark.asyncio
async def test_auth_long_password_and_document_fallbacks(async_client: AsyncClient):
    rand = str(uuid.uuid4())[:8]
    email = f"edge_{rand}@vplatform.test"
    # Password longer than bcrypt's 72-byte limit
    long_password = "SuperLongSecurePassword1234567890" * 3  # 99 chars

    reg_resp = await async_client.post(
        "/api/auth/register",
        json={"email": email, "password": long_password, "fullName": "Edge Tester"},
    )
    assert reg_resp.status_code == 200
    token = reg_resp.json()["token"]

    login_resp = await async_client.post(
        "/api/auth/login",
        json={"email": email, "password": long_password},
    )
    assert login_resp.status_code == 200

    headers = {"Authorization": f"Bearer {token}"}
    create_resp = await async_client.post(
        "/api/documents",
        headers=headers,
        json={"title": "   ", "query": "  ", "content": "Sample content"},
    )
    assert create_resp.status_code == 200
    doc = create_resp.json()
    assert doc["title"] == "Untitled Document"
    assert doc["query"] == "Generative Engine Optimization"


@pytest.mark.asyncio
async def test_demo_user_seed_and_login(async_client: AsyncClient):
    login_resp = await async_client.post(
        "/api/auth/login",
        json={"email": "creator@vplatform.ai", "password": "Password2026!"},
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert data["token"] is not None
    assert data["user"]["email"] == "creator@vplatform.ai"
    assert data["user"]["profile"]["fullName"] == "Apple Content Architect"


@pytest.mark.asyncio
async def test_root_and_api_prefix_path_parity(async_client: AsyncClient):
    """Verify endpoints respond identically with or without the /api prefix."""
    rand = str(uuid.uuid4())[:8]
    email = f"sherif_{rand}@vplatform.test"
    password = "SherifPassword2026!"
    full_name = "Sherif Architect"

    # Register via root path /auth/register
    reg_resp = await async_client.post(
        "/auth/register",
        json={"email": email, "password": password, "fullName": full_name, "role": "Content Architect"},
    )
    assert reg_resp.status_code == 200, reg_resp.text
    token = reg_resp.json()["token"]

    # Login via /auth/login
    login_resp = await async_client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["token"] is not None

    # Get /me via root path /auth/me and via /api/auth/me
    headers = {"Authorization": f"Bearer {token}"}
    me_root = await async_client.get("/auth/me", headers=headers)
    assert me_root.status_code == 200
    assert me_root.json()["email"] == email

    me_api = await async_client.get("/api/auth/me", headers=headers)
    assert me_api.status_code == 200
    assert me_api.json()["email"] == email

