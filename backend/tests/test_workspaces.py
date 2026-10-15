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
async def test_compute_domain_audit_endpoint(async_client: AsyncClient):
    # Test compute for linear.app
    resp = await async_client.post(
        "/api/workspaces/compute",
        json={"domain": "https://linear.app/issues", "name": "Linear"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["domain"] == "linear.app"
    assert data["name"] == "Linear"
    assert data["overallScore"] > 0
    assert data["geoScore"] > 0
    assert data["seoScore"] > 0
    assert data["aioScore"] > 0
    assert len(data["competitors"]) > 0
    # Check competitor match percentage is present and numeric
    for comp in data["competitors"]:
        assert "matchPercentage" in comp
        assert 0 <= comp["matchPercentage"] <= 100
        assert "keywordOverlap" in comp
        assert "semanticEntityScore" in comp
        assert "searchIntentScore" in comp

    assert len(data["howToFix"]) > 0
    for fix in data["howToFix"]:
        assert fix["impact"] in ["high", "medium", "low"]
        assert fix["category"] in ["seo", "geo", "aio"]

    # Test subdomain derive and compute
    sub_resp = await async_client.post(
        "/api/workspaces/compute",
        json={"domain": "https://app.linear.app/team"},
    )
    assert sub_resp.status_code == 200
    assert sub_resp.json()["name"] == "Linear"

    # Test supabase.com preset compute
    supa_resp = await async_client.post(
        "/api/workspaces/compute",
        json={"domain": "supabase.com"},
    )
    assert supa_resp.status_code == 200
    supa_data = supa_resp.json()
    assert supa_data["name"] == "Supabase"
    assert any(c["name"] == "Firebase" for c in supa_data["competitors"])


@pytest.mark.asyncio
async def test_workspace_crud_flow(async_client: AsyncClient):
    rand = str(uuid.uuid4())[:8]
    email = f"lead_{rand}@vplatform.test"
    password = "LeaderPassword123!"

    # 1. Register & login
    reg_resp = await async_client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "fullName": "Lead Strategist"},
    )
    token = reg_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create workspace with auto-computation
    create_resp = await async_client.post(
        "/api/workspaces",
        headers=headers,
        json={"domain": "stripe.com"},
    )
    assert create_resp.status_code == 200, create_resp.text
    ws = create_resp.json()
    ws_id = ws["id"]
    assert ws["name"] == "Stripe"
    assert ws["domain"] == "stripe.com"
    assert ws["overallScore"] > 0
    assert len(ws["competitors"]) >= 2
    assert any(c["name"] == "Adyen" for c in ws["competitors"])
    assert any(c["matchPercentage"] > 80 for c in ws["competitors"])

    # 3. List workspaces
    list_resp = await async_client.get("/api/workspaces", headers=headers)
    assert list_resp.status_code == 200
    workspaces = list_resp.json()
    assert len(workspaces) >= 1
    assert any(w["id"] == ws_id for w in workspaces)

    # 4. Get workspace by ID
    get_resp = await async_client.get(f"/api/workspaces/{ws_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Stripe"

    # 5. Update workspace
    upd_resp = await async_client.put(
        f"/api/workspaces/{ws_id}",
        headers=headers,
        json={"name": "Stripe Global Payments", "targetScore": 90},
    )
    assert upd_resp.status_code == 200
    assert upd_resp.json()["name"] == "Stripe Global Payments"
    assert upd_resp.json()["targetScore"] == 90

    # 6. Delete workspace
    del_resp = await async_client.delete(f"/api/workspaces/{ws_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True

    # 7. 404 after deletion
    get_del = await async_client.get(f"/api/workspaces/{ws_id}", headers=headers)
    assert get_del.status_code == 404
