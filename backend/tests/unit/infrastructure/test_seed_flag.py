from src.snowball.infrastructure.main import seed_default_data_enabled


def test_기본값은_기본_데이터를_만든다(monkeypatch):
    monkeypatch.delenv("SEED_DEFAULT_DATA", raising=False)
    assert seed_default_data_enabled() is True


def test_0이면_기본_데이터를_만들지_않는다(monkeypatch):
    monkeypatch.setenv("SEED_DEFAULT_DATA", "0")
    assert seed_default_data_enabled() is False


def test_0이_아닌_값은_기본_데이터를_만든다(monkeypatch):
    monkeypatch.setenv("SEED_DEFAULT_DATA", "1")
    assert seed_default_data_enabled() is True
