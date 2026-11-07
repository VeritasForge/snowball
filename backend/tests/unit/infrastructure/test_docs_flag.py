import pytest
from fastapi.testclient import TestClient

from src.snowball.infrastructure.main import create_app

DOC_PATHS = ["/docs", "/redoc", "/openapi.json"]


@pytest.mark.parametrize("path", DOC_PATHS)
def test_기본값에서는_API_문서가_열린다(monkeypatch, path):
    monkeypatch.delenv("ENABLE_DOCS", raising=False)
    client = TestClient(create_app())
    assert client.get(path).status_code == 200


@pytest.mark.parametrize("path", DOC_PATHS)
def test_ENABLE_DOCS_0이면_API_문서가_닫힌다(monkeypatch, path):
    monkeypatch.setenv("ENABLE_DOCS", "0")
    client = TestClient(create_app())
    assert client.get(path).status_code == 404


def test_ENABLE_DOCS_0이어도_API_엔드포인트는_동작한다(monkeypatch):
    monkeypatch.setenv("ENABLE_DOCS", "0")
    client = TestClient(create_app())
    assert client.get("/api/v1/accounts").status_code == 401
