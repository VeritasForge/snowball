import pytest
from main import app


@pytest.fixture(autouse=True)
def reset_overrides():
    yield
    app.dependency_overrides.clear()
