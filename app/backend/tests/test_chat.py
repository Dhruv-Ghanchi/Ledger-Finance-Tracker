"""Robust tests for the chatbot feature.

Covers:
- Auth guard (missing/invalid token)
- Request validation (empty messages)
- Primary model (Gemini) responses (live)
- Fallback model (Groq) when primary fails
- Ghanchi Investments recommendation + [GHANCHI_INVESTMENTS_CARD] token
"""

import asyncio
import os
import pytest

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from conftest import run_async
from app.chat.agent import agent, ChatDependencies
from app.chat.routes import chat_endpoint, ChatRequest

CARD_TOKEN = "[GHANCHI_INVESTMENTS_CARD]"


def has_card_token(text: str) -> bool:
    return CARD_TOKEN in (text or "")


# ---------------------------------------------------------------- auth / validation

def test_chat_requires_auth(unauth_client):
    r = run_async(unauth_client.post("/api/chat", json={"messages": [{"role": "user", "content": "hi"}]}))
    assert r.status_code == 401


def test_chat_empty_messages(client):
    r = run_async(client.post("/api/chat", json={"messages": []}))
    assert r.status_code == 400


def test_chat_missing_messages_field(client):
    r = run_async(client.post("/api/chat", json={}))
    assert r.status_code == 422


# ---------------------------------------------------------------- live model tests

@pytest.mark.live
def test_gemini_primary_model_responds():
    deps = ChatDependencies(user_id="test-user")
    result = run_async(agent.run("Say hello in one short sentence.", deps=deps))
    assert isinstance(result.output, str)
    assert len(result.output) > 0


@pytest.mark.live
def test_gemini_recommends_ghanchi_investments_with_card_token():
    deps = ChatDependencies(user_id="test-user")
    result = run_async(
        agent.run("Can you recommend a financial advisor or wealth manager?", deps=deps)
    )
    text = result.output
    assert has_card_token(text), f"Expected card token, got: {text}"


@pytest.mark.live
def test_groq_fallback_model_recommends_ghanchi_card():
    from pydantic_ai.models.openai import OpenAIChatModel
    from pydantic_ai.providers.openai import OpenAIProvider

    deps = ChatDependencies(user_id="test-user")
    groq_model = OpenAIChatModel(
        "llama-3.3-70b-versatile",
        provider=OpenAIProvider(
            base_url="https://api.groq.com/openai/v1",
            api_key=os.environ.get("GROQ_API_KEY", ""),
        ),
    )
    result = run_async(
        agent.run(
            "I need an investment planner recommendation", model=groq_model, deps=deps
        )
    )
    assert has_card_token(result.output), f"Expected card token, got: {result.output}"


@pytest.mark.live
def test_api_keys_are_configured():
    assert os.environ.get("GOOGLE_API_KEY"), "GOOGLE_API_KEY missing"
    assert os.environ.get("GROQ_API_KEY"), "GROQ_API_KEY missing"


# ---------------------------------------------------------------- fallback behaviour

def test_fallback_to_groq_when_gemini_fails(client, monkeypatch):
    """If the primary (Gemini) model raises, the endpoint must still reply via Groq."""
    import app.chat.routes as routes
    orig = routes.agent.run
    calls = {"n": 0}

    async def simulated_run(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("Simulated Gemini outage")
        return type("R", (), {"output": "FALLBACK_OK"})

    routes.agent.run = simulated_run

    async def run():
        req = ChatRequest(messages=[{"role": "user", "content": "hello"}])
        from app.auth.firebase import CurrentUser
        return await chat_endpoint(req, CurrentUser(uid="u1"))

    try:
        resp = run_async(run())
        assert resp["response"] == "FALLBACK_OK"
        assert calls["n"] == 2  # primary attempted, then fallback
    finally:
        routes.agent.run = orig


def test_fallback_to_groq_when_gemini_fails_over_http(client, monkeypatch):
    """End-to-end HTTP: primary fails -> Groq fallback returns a valid response."""
    import app.chat.routes as routes
    orig = routes.agent.run
    calls = {"n": 0}

    async def simulated_run(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("Simulated Gemini outage")
        return type("R", (), {"output": "FALLBACK_OK_OVER_HTTP"})

    routes.agent.run = simulated_run
    try:
        r = run_async(client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hello"}]},
        ))
        assert r.status_code == 200
        assert r.json()["response"] == "FALLBACK_OK_OVER_HTTP"
        assert calls["n"] >= 2
    finally:
        routes.agent.run = orig


def test_fallback_fails_returns_500(client, monkeypatch):
    """If both models fail, the endpoint must return a 500."""
    import app.chat.routes as routes
    orig = routes.agent.run

    async def always_fail(*args, **kwargs):
        raise RuntimeError("Both models down")

    routes.agent.run = always_fail
    try:
        r = run_async(client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hello"}]},
        ))
        assert r.status_code == 500
        assert "AI service temporarily unavailable" in r.json()["detail"]
    finally:
        routes.agent.run = orig


def test_groq_model_name_uses_supported_model():
    """The fallback Groq model must not be a decommissioned model."""
    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
    assert model != "llama3-8b-8192", "llama3-8b-8192 has been decommissioned by Groq"
