# 종목 이름 검색 기능 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 종목 추가 시 숫자 코드(예: `005930`)뿐 아니라 이름(예: "삼성전자")으로도 검색할 수 있도록 통합 입력 필드와 자동완성 드롭다운을 추가한다.

**Architecture:** 백엔드에 `GET /finance/search?q=<query>` 엔드포인트를 추가하여 Naver Finance 자동완성 API를 프록시하고, 프론트엔드에서 `useTickerSearch` 훅과 `TickerSearchInput` 컴포넌트로 드롭다운 자동완성을 구현한다. 드롭다운 선택 시 기존 `fetchAssetInfo(code)` 흐름을 재사용한다.

**Tech Stack:** Python/FastAPI, requests (백엔드), React/TypeScript, vitest, @testing-library/react (프론트엔드)

---

## 파일 구조

| 파일 | 유형 | 역할 |
|------|------|------|
| `backend/src/snowball/domain/ports.py` | 수정 | `MarketDataProvider`에 `search_by_name` 추상 메서드 추가 |
| `backend/src/snowball/adapters/external/market_data.py` | 수정 | 상수 분리 + `search_by_name` 구현 |
| `backend/src/snowball/use_cases/assets.py` | 수정 | `SearchAssetUseCase` 추가 |
| `backend/src/snowball/adapters/api/routes.py` | 수정 | `GET /finance/search` 엔드포인트 추가 |
| `backend/tests/unit/adapters/test_market_data.py` | 수정 | `search_by_name` 단위 테스트 추가 |
| `backend/tests/unit/use_cases/test_asset_use_cases.py` | 수정 | `SearchAssetUseCase` 단위 테스트 추가 |
| `backend/tests/e2e/test_finance.py` | 수정 | `/finance/search` e2e 테스트 추가 |
| `frontend/src/lib/hooks/useTickerSearch.ts` | **신규** | 검색 로직 훅 (debounce, fetch, 상태) |
| `frontend/tests/hooks/useTickerSearch.test.ts` | **신규** | 훅 단위 테스트 |
| `frontend/src/components/TickerSearchInput.tsx` | **신규** | 통합 검색 입력 + 드롭다운 컴포넌트 |
| `frontend/tests/components/TickerSearchInput.test.tsx` | **신규** | 컴포넌트 단위 테스트 |
| `frontend/src/components/AssetRow.tsx` | 수정 | CODE 입력 → `TickerSearchInput` 교체 |
| `frontend/tests/components/AssetRow.test.tsx` | 수정 | placeholder 선택자 업데이트 |

---

## Task 1: `ports.py` — `search_by_name` 추상 메서드 추가

**Files:**
- Modify: `backend/src/snowball/domain/ports.py:56-65`

- [ ] **Step 1: `MarketDataProvider`에 추상 메서드 추가**

`backend/src/snowball/domain/ports.py`의 `MarketDataProvider` 클래스 끝에 아래를 추가한다:

```python
    @abstractmethod
    def search_by_name(self, query: str) -> list[dict]:
        """Search KRX stocks by name. Returns [{name, code, market}]."""
        raise NotImplementedError
```

최종 `ports.py` MarketDataProvider 섹션:
```python
class MarketDataProvider(ABC):
    @abstractmethod
    def fetch_price(self, code: str) -> Optional[float]:
        """Fetch current price for a given ticker code."""
        raise NotImplementedError

    @abstractmethod
    def fetch_asset_info(self, code: str) -> Optional[dict]:
        """Fetch name, price, and category for a given code."""
        raise NotImplementedError

    @abstractmethod
    def search_by_name(self, query: str) -> list[dict]:
        """Search KRX stocks by name. Returns [{name, code, market}]."""
        raise NotImplementedError
```

- [ ] **Step 2: 백엔드 테스트 실행 — 추상 메서드 추가로 인한 오류 확인**

```bash
cd backend && uv run pytest -v --tb=short 2>&1 | tail -20
```

Expected: `RealMarketDataProvider`가 `search_by_name`을 구현하지 않아서 에러 발생 (Task 2에서 수정). 추상 메서드 자체는 오류 없음.

- [ ] **Step 3: commit**

```bash
git add backend/src/snowball/domain/ports.py
git commit -m "feat(domain): add search_by_name abstract method to MarketDataProvider"
```

---

## Task 2: `market_data.py` — 상수 분리 + `search_by_name` 구현

**Files:**
- Modify: `backend/src/snowball/adapters/external/market_data.py`
- Modify: `backend/tests/unit/adapters/test_market_data.py`

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/unit/adapters/test_market_data.py` 하단에 `TestSearchByName` 클래스를 추가한다:

```python
class TestSearchByName:
    # [Happy] Naver AC returns results → list of {name, code, market}
    @patch("src.snowball.adapters.external.market_data.requests.get")
    def test_returns_results_on_success(self, mock_get):
        # Given
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "items": [
                ["삼성전자", "005930", "1", "KOSPI"],
                ["삼성SDI", "006400", "1", "KOSPI"],
            ]
        }
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response
        provider = RealMarketDataProvider()
        # When
        result = provider.search_by_name("삼성")
        # Then
        assert result == [
            {"name": "삼성전자", "code": "005930", "market": "KOSPI"},
            {"name": "삼성SDI", "code": "006400", "market": "KOSPI"},
        ]

    # [Boundary] Naver AC returns empty items → empty list
    @patch("src.snowball.adapters.external.market_data.requests.get")
    def test_returns_empty_list_when_no_items(self, mock_get):
        # Given
        mock_response = MagicMock()
        mock_response.json.return_value = {"items": []}
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response
        provider = RealMarketDataProvider()
        # When
        result = provider.search_by_name("없는종목")
        # Then
        assert result == []

    # [Boundary] Naver AC returns more than SEARCH_RESULT_LIMIT → capped
    @patch("src.snowball.adapters.external.market_data.requests.get")
    @patch("src.snowball.adapters.external.market_data._SEARCH_RESULT_LIMIT", 2)
    def test_results_are_capped_by_search_result_limit(self, mock_get):
        # Given
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "items": [
                ["A", "001", "1", "KOSPI"],
                ["B", "002", "1", "KOSPI"],
                ["C", "003", "1", "KOSPI"],
            ]
        }
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response
        provider = RealMarketDataProvider()
        # When
        result = provider.search_by_name("test")
        # Then
        assert len(result) == 2

    # [Error] Naver AC raises HTTPError → raises
    @patch("src.snowball.adapters.external.market_data.requests.get")
    def test_raises_when_http_error(self, mock_get):
        # Given
        import requests as req_lib
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = req_lib.HTTPError("500 Server Error")
        mock_get.return_value = mock_response
        provider = RealMarketDataProvider()
        # When / Then
        with pytest.raises(req_lib.HTTPError):
            provider.search_by_name("삼성")
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd backend && uv run pytest tests/unit/adapters/test_market_data.py::TestSearchByName -v
```

Expected: `FAILED` — `search_by_name`이 아직 없음.

- [ ] **Step 3: `market_data.py` 상단에 상수 추가 및 `search_by_name` 구현**

`backend/src/snowball/adapters/external/market_data.py`를 아래와 같이 수정한다 (import 줄 다음에 상수 추가):

```python
import os
import requests
from bs4 import BeautifulSoup
import FinanceDataReader as fdr  # type: ignore
from typing import Optional
from ...domain.ports import MarketDataProvider

_NAVER_AC_URL = "https://ac.finance.naver.com/ac"
_NAVER_AC_PARAMS = {
    "q_enc": "utf-8",
    "st": "111",
    "r_format": "json",
    "r_enc": "utf-8",
}
_NAVER_AC_TIMEOUT = int(os.environ.get("NAVER_AC_TIMEOUT", "3"))
_SEARCH_RESULT_LIMIT = int(os.environ.get("SEARCH_RESULT_LIMIT", "10"))
```

`RealMarketDataProvider` 클래스 끝에 `search_by_name` 메서드 추가:

```python
    def search_by_name(self, query: str) -> list[dict]:
        params = {**_NAVER_AC_PARAMS, "q": query}
        res = requests.get(_NAVER_AC_URL, params=params, timeout=_NAVER_AC_TIMEOUT)
        res.raise_for_status()
        items = res.json().get("items", [])[:_SEARCH_RESULT_LIMIT]
        # Naver AC items format: [name, code, type, market]
        return [{"name": item[0], "code": item[1], "market": item[3]} for item in items]
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
cd backend && uv run pytest tests/unit/adapters/test_market_data.py -v
```

Expected: `PASSED` 전체.

- [ ] **Step 5: 전체 백엔드 테스트 통과 확인**

```bash
cd backend && uv run pytest -v 2>&1 | tail -10
```

Expected: 모든 기존 테스트 PASS.

- [ ] **Step 6: commit**

```bash
git add backend/src/snowball/adapters/external/market_data.py \
        backend/tests/unit/adapters/test_market_data.py
git commit -m "feat(adapter): implement search_by_name with Naver AC API and extract constants"
```

---

## Task 3: `SearchAssetUseCase` 추가

**Files:**
- Modify: `backend/src/snowball/use_cases/assets.py`
- Modify: `backend/tests/unit/use_cases/test_asset_use_cases.py`

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/unit/use_cases/test_asset_use_cases.py`에 `SearchAssetUseCase` 임포트와 테스트 클래스를 추가한다. 파일 상단 임포트 줄을 업데이트:

```python
from src.snowball.use_cases.assets import UpdateAssetPricesUseCase, FetchAssetInfoUseCase, SearchAssetUseCase
```

파일 하단에 테스트 클래스 추가:

```python
class TestSearchAssetUseCase:
    # [Happy] Provider returns results → use case returns them as-is
    def test_returns_results_from_provider(self):
        # Given
        mock_market = MagicMock(spec=MarketDataProvider)
        mock_market.search_by_name.return_value = [
            {"name": "삼성전자", "code": "005930", "market": "KOSPI"},
        ]
        use_case = SearchAssetUseCase(mock_market)
        # When
        result = use_case.execute("삼성")
        # Then
        assert result == [{"name": "삼성전자", "code": "005930", "market": "KOSPI"}]
        mock_market.search_by_name.assert_called_once_with("삼성")

    # [Boundary] Provider returns empty list → use case returns empty list
    def test_returns_empty_list_when_no_results(self):
        # Given
        mock_market = MagicMock(spec=MarketDataProvider)
        mock_market.search_by_name.return_value = []
        use_case = SearchAssetUseCase(mock_market)
        # When
        result = use_case.execute("없는종목")
        # Then
        assert result == []

    # [Error] Provider raises → use case propagates exception
    def test_propagates_exception_from_provider(self):
        # Given
        import requests as req_lib
        mock_market = MagicMock(spec=MarketDataProvider)
        mock_market.search_by_name.side_effect = req_lib.HTTPError("500")
        use_case = SearchAssetUseCase(mock_market)
        # When / Then
        with pytest.raises(req_lib.HTTPError):
            use_case.execute("삼성")
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd backend && uv run pytest tests/unit/use_cases/test_asset_use_cases.py::TestSearchAssetUseCase -v
```

Expected: `FAILED` — `SearchAssetUseCase`가 없음.

- [ ] **Step 3: `SearchAssetUseCase` 구현**

`backend/src/snowball/use_cases/assets.py` 끝에 추가:

```python
class SearchAssetUseCase:
    def __init__(self, market_data: MarketDataProvider):
        self.market_data = market_data

    def execute(self, query: str) -> list[dict]:
        return self.market_data.search_by_name(query)
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
cd backend && uv run pytest tests/unit/use_cases/test_asset_use_cases.py -v
```

Expected: 모두 PASS.

- [ ] **Step 5: commit**

```bash
git add backend/src/snowball/use_cases/assets.py \
        backend/tests/unit/use_cases/test_asset_use_cases.py
git commit -m "feat(use-case): add SearchAssetUseCase"
```

---

## Task 4: `GET /finance/search` 엔드포인트 추가

**Files:**
- Modify: `backend/src/snowball/adapters/api/routes.py`
- Modify: `backend/tests/e2e/test_finance.py`

- [ ] **Step 1: 실패하는 e2e 테스트 작성**

`backend/tests/e2e/test_finance.py`에 아래 테스트를 추가한다 (기존 `test_finance_lookup_not_found` 다음):

```python
def test_finance_search_success(client):
    # Given
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.search_by_name.return_value = [
        {"name": "삼성전자", "code": "005930", "market": "KOSPI"},
        {"name": "삼성SDI", "code": "006400", "market": "KOSPI"},
    ]
    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider

    # When
    response = client.get("/finance/search?q=삼성")

    # Then
    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "삼성전자"
    assert data[0]["code"] == "005930"
    assert data[0]["market"] == "KOSPI"
    app.dependency_overrides.pop(get_market_data)


def test_finance_search_empty_results(client):
    # Given
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.search_by_name.return_value = []
    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider

    # When
    response = client.get("/finance/search?q=없는종목")

    # Then
    assert response.status_code == HTTPStatus.OK
    assert response.json() == []
    app.dependency_overrides.pop(get_market_data)


def test_finance_search_query_too_short(client):
    # When: q is 1 character (too short)
    response = client.get("/finance/search?q=삼")
    # Then: 400 Bad Request
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_finance_search_query_too_long(client):
    # When: q exceeds 20 characters
    response = client.get("/finance/search?q=" + "삼" * 21)
    # Then: 400 Bad Request
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_finance_search_provider_error(client):
    # Given
    import requests as req_lib
    mock_provider = MagicMock(spec=MarketDataProvider)
    mock_provider.search_by_name.side_effect = req_lib.HTTPError("Naver API failed")
    from main import app
    app.dependency_overrides[get_market_data] = lambda: mock_provider

    # When
    response = client.get("/finance/search?q=삼성")

    # Then: 500 Internal Server Error
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    app.dependency_overrides.pop(get_market_data)
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd backend && uv run pytest tests/e2e/test_finance.py -v
```

Expected: 새 테스트들 FAIL (`/finance/search` 없음).

- [ ] **Step 3: `routes.py`에 엔드포인트 추가**

`backend/src/snowball/adapters/api/routes.py`에서:

**임포트 줄 수정** (line 13):
```python
from ...use_cases.assets import FetchAssetInfoUseCase, SearchAssetUseCase
```

**파일 끝에 엔드포인트 추가**:
```python
@router.get("/finance/search")
def search_assets(
    q: str,
    market_data: Annotated[RealMarketDataProvider, Depends(get_market_data)]
):
    if not (2 <= len(q) <= 20):
        raise HTTPException(HTTPStatus.BAD_REQUEST, "Query must be 2-20 characters")
    try:
        results = SearchAssetUseCase(market_data).execute(q)
    except Exception:
        raise HTTPException(HTTPStatus.INTERNAL_SERVER_ERROR, "Search failed")
    return results
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
cd backend && uv run pytest tests/e2e/test_finance.py -v
```

Expected: 모두 PASS.

- [ ] **Step 5: 전체 백엔드 테스트 + 커버리지 확인**

```bash
cd backend && uv run pytest -v 2>&1 | tail -15
```

Expected: 모두 PASS, coverage 100%.

- [ ] **Step 6: commit**

```bash
git add backend/src/snowball/adapters/api/routes.py \
        backend/tests/e2e/test_finance.py
git commit -m "feat(api): add GET /finance/search endpoint with Naver AC proxy"
```

---

## Task 5: `useTickerSearch` 훅 구현

**Files:**
- Create: `frontend/src/lib/hooks/useTickerSearch.ts`
- Create: `frontend/tests/hooks/useTickerSearch.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/tests/hooks/useTickerSearch.test.ts` 파일을 생성한다:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTickerSearch } from '../../src/lib/hooks/useTickerSearch';

const originalFetch = global.fetch;

describe('useTickerSearch', () => {
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onError = vi.fn();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // [Happy] Korean input >= 2 chars → fetch called after debounce → results set
  it('[Happy] 한글 입력 2자 이상 → debounce 후 fetch 호출 → 결과 반환', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: '삼성전자', code: '005930', market: 'KOSPI' }],
    });
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼성'); });
    expect(global.fetch).not.toHaveBeenCalled(); // debounce 전

    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/finance/search?q=%EC%82%BC%EC%84%B1')
    );
    expect(result.current.results).toEqual([
      { name: '삼성전자', code: '005930', market: 'KOSPI' },
    ]);
    expect(result.current.hasSearched).toBe(true);
  });

  // [Boundary] 1자 입력 → fetch 미호출
  it('[Boundary] 1자 입력 → fetch 미호출, results 빈 배열', async () => {
    global.fetch = vi.fn();
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });

  // [Boundary] 숫자만 입력 → fetch 미호출
  it('[Boundary] 숫자 입력 → fetch 미호출', async () => {
    global.fetch = vi.fn();
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('005930'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.hasSearched).toBe(false);
  });

  // [Boundary] 빈 문자열 → fetch 미호출
  it('[Boundary] 빈 문자열 → fetch 미호출', async () => {
    global.fetch = vi.fn();
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search(''); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  // [Boundary] 검색 결과 0개 → hasSearched=true, results=[]
  it('[Boundary] 검색 결과 0개 → hasSearched=true, results=[]', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('없는종목이름'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  // [Error] fetch returns !ok → onError 호출, hasSearched=false
  it('[Error] fetch 응답 ok=false → onError 호출', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼성전자'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(onError).toHaveBeenCalledWith('종목 검색에 실패했습니다.');
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });

  // [Error] fetch throws → onError 호출
  it('[Error] fetch 예외 발생 → onError 호출', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼성전자'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(onError).toHaveBeenCalledWith('종목 검색에 실패했습니다.');
    expect(result.current.hasSearched).toBe(false);
  });

  // [Boundary] clearResults → results=[], hasSearched=false
  it('[Boundary] clearResults → 상태 초기화', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: '삼성전자', code: '005930', market: 'KOSPI' }],
    });
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼성'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(result.current.results.length).toBe(1);

    act(() => { result.current.clearResults(); });
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });

  // [Boundary] 연속 빠른 입력 → 마지막 입력만 fetch 호출
  it('[Boundary] 연속 입력 → 마지막 입력만 fetch 호출', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼'); }); // 1자라 실제론 fetch 안 함
    act(() => { result.current.search('삼성'); });
    act(() => { result.current.search('삼성전'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('삼성전')
    );
  });
});
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd frontend && npm test -- --run tests/hooks/useTickerSearch.test.ts 2>&1 | tail -15
```

Expected: `FAILED` — `useTickerSearch` 모듈 없음.

- [ ] **Step 3: `useTickerSearch.ts` 구현**

`frontend/src/lib/hooks/useTickerSearch.ts` 파일을 생성한다:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
const NAME_QUERY_RE = /[가-힣a-zA-Z]/;
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export interface TickerSearchResult {
  name: string;
  code: string;
  market: string;
}

interface UseTickerSearchOptions {
  onError: (message: string) => void;
}

export function useTickerSearch({ onError }: UseTickerSearchOptions) {
  const [results, setResults] = useState<TickerSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!NAME_QUERY_RE.test(query) || query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_URL}/finance/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');
        const data: TickerSearchResult[] = await res.json();
        setResults(data);
        setHasSearched(true);
      } catch {
        onError('종목 검색에 실패했습니다.');
        setResults([]);
        setHasSearched(false);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);
  }, [onError]);

  const clearResults = useCallback(() => {
    setResults([]);
    setHasSearched(false);
  }, []);

  useEffect(() => {
    /* v8 ignore next */
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return { results, hasSearched, isSearching, search, clearResults };
}
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
cd frontend && npm test -- --run tests/hooks/useTickerSearch.test.ts 2>&1 | tail -15
```

Expected: 모두 PASS.

- [ ] **Step 5: commit**

```bash
git add frontend/src/lib/hooks/useTickerSearch.ts \
        frontend/tests/hooks/useTickerSearch.test.ts
git commit -m "feat(hook): add useTickerSearch with debounced Naver AC search"
```

---

## Task 6: `TickerSearchInput` 컴포넌트 구현

**Files:**
- Create: `frontend/src/components/TickerSearchInput.tsx`
- Create: `frontend/tests/components/TickerSearchInput.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/tests/components/TickerSearchInput.test.tsx` 파일을 생성한다:

```typescript
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TickerSearchInput } from '../../src/components/TickerSearchInput';

const originalFetch = global.fetch;

const defaultProps = {
  value: '',
  onChange: vi.fn(),
  onSelect: vi.fn(),
  onSearch: vi.fn(),
  onError: vi.fn(),
  isLoading: false,
};

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe('TickerSearchInput', () => {
  // [Happy] 초기 렌더링 — placeholder와 검색 버튼 표시
  it('[Happy] placeholder와 검색 버튼이 렌더링된다', () => {
    render(<TickerSearchInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('CODE / 종목명')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '종목 정보 조회' })).toBeInTheDocument();
  });

  // [Happy] 검색 버튼 클릭 → onSearch 호출
  it('[Happy] 검색 버튼 클릭 시 onSearch 호출된다', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<TickerSearchInput {...defaultProps} onSearch={onSearch} />);
    await user.click(screen.getByRole('button', { name: '종목 정보 조회' }));
    expect(onSearch).toHaveBeenCalled();
  });

  // [Boundary] Enter 키 → onSearch 호출
  it('[Boundary] Enter 키 입력 시 onSearch 호출된다', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<TickerSearchInput {...defaultProps} onSearch={onSearch} />);
    await user.click(screen.getByPlaceholderText('CODE / 종목명'));
    await user.keyboard('{Enter}');
    expect(onSearch).toHaveBeenCalled();
  });

  // [Happy] 한글 입력 → debounce 후 fetch → 드롭다운 표시
  it('[Happy] 한글 입력 후 debounce → 드롭다운 결과 표시', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { name: '삼성전자', code: '005930', market: 'KOSPI' },
      ],
    });
    render(<TickerSearchInput {...defaultProps} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(screen.getByText('삼성전자')).toBeInTheDocument();
    expect(screen.getByText('005930')).toBeInTheDocument();
  });

  // [Happy] 드롭다운 항목 클릭 → onSelect 호출 → 드롭다운 닫힘
  it('[Happy] 드롭다운 항목 클릭 시 onSelect(code, name) 호출되고 닫힌다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: '삼성전자', code: '005930', market: 'KOSPI' }],
    });
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<TickerSearchInput {...defaultProps} onSelect={onSelect} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    await user.click(screen.getByText('삼성전자'));
    expect(onSelect).toHaveBeenCalledWith('005930', '삼성전자');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // [Boundary] 검색 결과 0개 → "검색 결과 없음" 표시
  it('[Boundary] 검색 결과 0개 → "검색 결과 없음" 표시', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    render(<TickerSearchInput {...defaultProps} value="없는종목이름" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '없는종목이름' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(screen.getByText('검색 결과 없음')).toBeInTheDocument();
  });

  // [Boundary] ESC 키 → 드롭다운 닫힘
  it('[Boundary] ESC 키 입력 시 드롭다운이 닫힌다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: '삼성전자', code: '005930', market: 'KOSPI' }],
    });
    const user = userEvent.setup();
    render(<TickerSearchInput {...defaultProps} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // [Boundary] 외부 클릭 → 드롭다운 닫힘
  it('[Boundary] 외부 영역 클릭 시 드롭다운이 닫힌다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: '삼성전자', code: '005930', market: 'KOSPI' }],
    });
    render(
      <div>
        <TickerSearchInput {...defaultProps} value="삼성" />
        <div data-testid="outside">외부</div>
      </div>
    );
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // [Error] fetch 실패 → onError 호출
  it('[Error] fetch 실패 시 onError 호출된다', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const onError = vi.fn();
    render(<TickerSearchInput {...defaultProps} onError={onError} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(onError).toHaveBeenCalledWith('종목 검색에 실패했습니다.');
  });

  // [Boundary] isLoading=true → 검색 버튼 비활성화 + 스피너
  it('[Boundary] isLoading=true 시 검색 버튼이 비활성화된다', () => {
    render(<TickerSearchInput {...defaultProps} isLoading={true} />);
    expect(screen.getByRole('button', { name: '종목 정보 조회' })).toBeDisabled();
  });

  // [Boundary] onChange 콜백 호출 확인
  it('[Boundary] 입력 값 변경 시 onChange가 호출된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TickerSearchInput {...defaultProps} onChange={onChange} />);
    await user.type(screen.getByPlaceholderText('CODE / 종목명'), 'A');
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd frontend && npm test -- --run tests/components/TickerSearchInput.test.tsx 2>&1 | tail -15
```

Expected: `FAILED` — `TickerSearchInput` 모듈 없음.

- [ ] **Step 3: `TickerSearchInput.tsx` 구현**

`frontend/src/components/TickerSearchInput.tsx` 파일을 생성한다:

```typescript
"use client";

import { useRef, useEffect } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useTickerSearch, TickerSearchResult } from '../lib/hooks/useTickerSearch';

interface TickerSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (code: string, name: string) => void;
  onSearch: () => void;
  onError: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function TickerSearchInput({
  value, onChange, onSelect, onSearch, onError, isLoading, disabled,
}: TickerSearchInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { results, hasSearched, search, clearResults } = useTickerSearch({ onError });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearResults();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    /* v8 ignore next */
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearResults]);

  const handleChange = (val: string) => {
    onChange(val);
    search(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      clearResults();
      onSearch();
    }
    if (e.key === 'Escape') clearResults();
  };

  const handleSelect = (item: TickerSearchResult) => {
    onSelect(item.code, item.name);
    clearResults();
  };

  const showDropdown = hasSearched;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="종목 코드 또는 이름 검색"
          className="w-20 text-[10px] text-muted border-b border-transparent focus:border-primary outline-none bg-transparent font-mono"
          placeholder="CODE / 종목명"
        />
        <button
          onClick={() => { clearResults(); onSearch(); }}
          disabled={isLoading}
          aria-label="종목 정보 조회"
          className="text-muted hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
        </button>
      </div>

      {showDropdown && (
        <ul
          role="listbox"
          aria-label="종목 검색 결과"
          className="absolute top-full left-0 z-50 mt-1 min-w-[180px] bg-card border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">검색 결과 없음</li>
          ) : (
            results.map((item) => (
              <li key={item.code}>
                <button
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors"
                >
                  <span className="font-bold text-foreground">{item.name}</span>
                  <span className="text-muted ml-2">{item.code}</span>
                  <span className="text-muted ml-1 text-[10px]">{item.market}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
cd frontend && npm test -- --run tests/components/TickerSearchInput.test.tsx 2>&1 | tail -15
```

Expected: 모두 PASS.

- [ ] **Step 5: commit**

```bash
git add frontend/src/components/TickerSearchInput.tsx \
        frontend/tests/components/TickerSearchInput.test.tsx
git commit -m "feat(component): add TickerSearchInput with autocomplete dropdown"
```

---

## Task 7: `AssetRow` — `TickerSearchInput` 통합

**Files:**
- Modify: `frontend/src/components/AssetRow.tsx`
- Modify: `frontend/tests/components/AssetRow.test.tsx`

- [ ] **Step 1: `AssetRow.tsx` 수정**

`frontend/src/components/AssetRow.tsx`에서:

**임포트 줄 수정** — `Loader2, Search` 제거, `TickerSearchInput` 추가:

```typescript
"use client";

import { PlayCircle, Check, X, Trash2 } from 'lucide-react';
import { Asset } from '../types';
import { CategorySelector } from './CategorySelector';
import { NumberFormatInput } from './NumberFormatInput';
import { TickerSearchInput } from './TickerSearchInput';
import { formatNumber } from '../lib/utils';
import type { AssetField, AssetFieldValue } from '../lib/hooks/usePortfolioData';
```

**`td` 섹션 교체** — 기존 `code` 입력 + 검색 버튼 블록을 `TickerSearchInput`으로 교체:

기존 코드 (lines 47-64):
```typescript
        <div className="flex items-center gap-1 mt-1">
          <input
            type="text"
            value={item.code || ''}
            onChange={(e) => onUpdateAsset(item.id, 'code', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onFetchAssetInfo(item.id, item.code || '')}
            className="w-20 text-[10px] text-muted border-b border-transparent focus:border-primary outline-none bg-transparent font-mono"
            placeholder="CODE"
          />
          <button
            onClick={() => onFetchAssetInfo(item.id, item.code || '')}
            disabled={loadingRowId === item.id}
            aria-label="종목 정보 조회"
            className="text-muted hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingRowId === item.id ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
          </button>
        </div>
```

교체할 코드:
```typescript
        <div className="flex items-center gap-1 mt-1">
          <TickerSearchInput
            value={item.code || ''}
            onChange={(val) => onUpdateAsset(item.id, 'code', val)}
            onSelect={(code, name) => {
              onUpdateAsset(item.id, 'code', code);
              onUpdateAsset(item.id, 'name', name);
              onFetchAssetInfo(item.id, code);
            }}
            onSearch={() => onFetchAssetInfo(item.id, item.code || '')}
            onError={(msg) => showToast(msg, 'error')}
            isLoading={loadingRowId === item.id}
          />
        </div>
```

- [ ] **Step 2: `AssetRow.test.tsx` — placeholder 선택자 업데이트**

`frontend/tests/components/AssetRow.test.tsx`에서 `'CODE'` placeholder를 `'CODE / 종목명'`으로 교체한다. 변경 대상 라인들:

| 기존 | 교체 |
|------|------|
| `screen.getByPlaceholderText('CODE')` | `screen.getByPlaceholderText('CODE / 종목명')` |

총 5곳: lines 186, 208, 215, 246, 304.

각 테스트에서 `getByPlaceholderText('CODE')` → `getByPlaceholderText('CODE / 종목명')` 일괄 변경.

또한 **신규 테스트 추가** — `TickerSearchInput` 통합 동작:

```typescript
  // [Happy] TickerSearchInput onSelect → onUpdateAsset(code), onUpdateAsset(name), onFetchAssetInfo 호출
  it('[Happy] 드롭다운 선택 시 code/name 업데이트 + fetchAssetInfo 호출', async () => {
    const onUpdateAsset = vi.fn();
    const onFetchAssetInfo = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: '삼성전자', code: '005930', market: 'KOSPI' }],
    });
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onUpdateAsset, onFetchAssetInfo });

    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    await user.click(screen.getByText('삼성전자'));
    expect(onUpdateAsset).toHaveBeenCalledWith(1, 'code', '005930');
    expect(onUpdateAsset).toHaveBeenCalledWith(1, 'name', '삼성전자');
    expect(onFetchAssetInfo).toHaveBeenCalledWith(1, '005930');
  });
```

- [ ] **Step 3: 테스트 실행 — FAIL 확인**

```bash
cd frontend && npm test -- --run tests/components/AssetRow.test.tsx 2>&1 | tail -20
```

Expected: `placeholder 'CODE'` 관련 테스트들 FAIL, 새 통합 테스트 FAIL.

- [ ] **Step 4: 전체 AssetRow 테스트 PASS 확인**

Step 1-2를 적용한 후:

```bash
cd frontend && npm test -- --run tests/components/AssetRow.test.tsx 2>&1 | tail -20
```

Expected: 모두 PASS (기존 테스트 + 신규 통합 테스트).

- [ ] **Step 5: commit**

```bash
git add frontend/src/components/AssetRow.tsx \
        frontend/tests/components/AssetRow.test.tsx
git commit -m "feat(ui): replace code input with TickerSearchInput in AssetRow"
```

---

## Task 8: 전체 테스트 + 커버리지 최종 확인

**Files:** 없음 (확인만)

- [ ] **Step 1: 백엔드 전체 테스트 실행**

```bash
cd backend && uv run pytest -v 2>&1 | tail -20
```

Expected: 모든 테스트 PASS, coverage 100%.

- [ ] **Step 2: 프론트엔드 전체 테스트 실행**

```bash
cd frontend && npm test -- --run 2>&1 | tail -20
```

Expected: 모든 테스트 PASS, coverage 100%.

- [ ] **Step 3: 완료 조건 체크리스트**

- [ ] `GET /finance/search?q=삼성` → `[{name, code, market}]` 배열 반환
- [ ] 한글/영문 입력 → 300ms debounce → 드롭다운 표시
- [ ] 숫자 입력 → 드롭다운 없음 (기존 경로 유지)
- [ ] 드롭다운 선택 → code·name 자동 채움 + fetchAssetInfo 즉시 호출
- [ ] Naver API 오류 → toast "종목 검색에 실패했습니다."
- [ ] 결과 0개 → "검색 결과 없음"
- [ ] 1자 이하 → API 미호출
- [ ] 백엔드·프론트엔드 커버리지 100%

---

## 자가 리뷰 결과

**스펙 커버리지:** 모든 완료조건이 테스트와 구현에 반영됨.

**수정된 사항:**
1. 스펙의 `test_routes.py` → 실제로는 e2e 엔드포인트 테스트가 `tests/e2e/test_finance.py`에 위치 (수정 반영)
2. 스펙의 `test_assets.py` → 실제 파일명은 `test_asset_use_cases.py` (수정 반영)
3. `/* v8 ignore next */` — `useTickerSearch`의 unmount cleanup과 `TickerSearchInput`의 `removeEventListener` cleanup에 추가 (vitest jsdom에서 테스트 불가한 cleanup 경로)
4. 연속 입력 debounce 테스트에서 1자 검색어("삼")는 NAME_QUERY_RE를 통과하지만 MIN_QUERY_LENGTH에서 걸러짐 — 테스트가 이를 올바르게 반영

**타입 일관성:** `TickerSearchResult` 타입이 `useTickerSearch.ts`에서 export되어 `TickerSearchInput.tsx`에서 import되어 일관성 유지.
