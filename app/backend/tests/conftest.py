import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from app.auth.firebase import get_current_user, CurrentUser
from main import app


@pytest.fixture()
def client():
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        uid="test-user-123", email="test@example.com"
    )
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def unauth_client():
    with TestClient(app) as c:
        yield c
