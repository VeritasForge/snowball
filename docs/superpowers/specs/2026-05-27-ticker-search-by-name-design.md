# 종목 이름 검색 기능 설계

**작성일**: 2026-05-27  
**상태**: 승인됨

---

## 개요

현재 종목 추가 시 종목 코드(숫자, 예: `005930`)만 입력 가능하다. 이 기능은 종목명(예: "삼성전자")으로도 검색할 수 있도록 통합 입력 필드와 자동완성 드롭다운을 추가한다. 대상 시장은 국내(KRX) 전용이며, Naver Finance 자동완성 API를 프록시로 활용한다.

---

## 완료조건 (Completion Criteria)

- [ ] `GET /finance/search?q=삼성` 호출 시 `[{name, code, market}]` 배열을 반환한다
- [ ] 한글/영문 입력 시 300ms debounce 후 자동완성 드롭다운이 표시된다
- [ ] 숫자 입력 시 드롭다운이 표시되지 않는다 (기존 코드 경로 유지)
- [ ] 드롭다운에서 종목 선택 시 `code`·`name`이 자동 채워지고 `fetchAssetInfo`가 즉시 호출된다
- [ ] Naver API 타임아웃/오류 시 `"종목 검색에 실패했습니다."` toast가 표시된다
- [ ] 검색 결과 0개 시 드롭다운에 `"검색 결과 없음"` 표시
- [ ] 1글자 이하 입력 시 검색 API를 호출하지 않는다
- [ ] 백엔드·프론트엔드 테스트 커버리지 100% 유지

---

## 금지사항 (Don'ts)

- 숫자 입력 경로를 수정하지 말 것 → 기존 `fetchAssetInfo(code)` 흐름 그대로 재사용
- 드롭다운 선택 시 별도 API 호출 없이 기존 `fetchAssetInfo`를 탑승할 것
- Naver API URL·파라미터를 하드코딩하지 말 것 → 모듈 상수로 분리
- `any` 타입 사용 금지 (TypeScript)
- 외부 autocomplete 라이브러리 도입 금지 → 직접 구현

---

## 고려사항 (Considerations)

- **입력 감지 로직**: `/[가-힣a-zA-Z]/` 정규식으로 이름 쿼리 여부 판단 (한글 또는 영문 포함 시 이름 검색)
- **ESC/외부 클릭**: 드롭다운 닫힘 처리 필요 (접근성)
- **debounce 300ms**: 타이핑 중 과도한 API 호출 방지
- **결과 최대 10개**: `SEARCH_RESULT_LIMIT` 상수로 제어
- **타임아웃**: `NAVER_AC_TIMEOUT` 환경 변수 (기본 3초)

---

## 제약사항 (Constraints)

- 국내 KRX 종목 전용 (Naver Finance AC API가 KRX만 지원)
- Naver Finance 비공식 API 의존 — 향후 API 변경 위험 존재 (허용 범위 내)
- 기존 `AssetRow` 구조를 최대한 유지하여 회귀 최소화

---

## 아키텍처

```
[Frontend: AssetRow]
  TickerSearchInput (신규)
    useTickerSearch hook (신규)
      ↓ /[가-힣a-zA-Z]/ 감지 → debounce 300ms
      → GET /finance/search?q=<query>
      → [{name, code, market}, ...]
      → 드롭다운 렌더
    선택 시: onUpdateAsset('code', code), onUpdateAsset('name', name)
           → onFetchAssetInfo(id, code) 즉시 호출

[Backend: routes.py]
  GET /finance/search?q=<query>
    → SearchAssetUseCase (신규)
      → MarketDataProvider.search_by_name(query) (신규)
        → Naver ac.finance.naver.com 프록시
        → [{name, code, market}, ...]
```

---

## 변경 파일 목록

### 백엔드

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `backend/src/snowball/domain/ports.py` | 수정 | `MarketDataProvider`에 `search_by_name(query: str) -> list[dict]` 추가 |
| `backend/src/snowball/adapters/external/market_data.py` | 수정 | `search_by_name` 구현 (Naver AC API 프록시) + 상수 분리 |
| `backend/src/snowball/use_cases/assets.py` | 수정 | `SearchAssetUseCase` 추가 |
| `backend/src/snowball/adapters/api/routes.py` | 수정 | `GET /finance/search` 엔드포인트 추가 |
| `backend/tests/unit/adapters/test_market_data.py` | 수정 | `search_by_name` 테스트 추가 |
| `backend/tests/unit/use_cases/test_assets.py` | 수정 | `SearchAssetUseCase` 테스트 추가 |
| `backend/tests/unit/adapters/test_routes_*.py` | 수정 | `/finance/search` 라우트 테스트 추가 |

### 프론트엔드

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `frontend/src/components/TickerSearchInput.tsx` | **신규** | 통합 검색 입력 + 드롭다운 컴포넌트 |
| `frontend/src/lib/hooks/useTickerSearch.ts` | **신규** | 검색 로직 훅 (debounce, API 호출, 상태) |
| `frontend/src/components/AssetRow.tsx` | 수정 | CODE 입력 → `TickerSearchInput` 교체 |

---

## 상세 설계

### 백엔드: 상수 분리 패턴

```python
# adapters/external/market_data.py
import os

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

> **패턴 노트**: 외부 API URL·파라미터는 모듈 상수(`_UPPER_SNAKE`)로 관리하고, 환경별로 튜닝 가능한 값(timeout, limit)만 env var로 오버라이드한다.

### 백엔드: search_by_name 구현

```python
def search_by_name(self, query: str) -> list[dict]:
    params = {**_NAVER_AC_PARAMS, "q": query}
    res = requests.get(_NAVER_AC_URL, params=params, timeout=_NAVER_AC_TIMEOUT)
    res.raise_for_status()
    items = res.json().get("items", [])[:_SEARCH_RESULT_LIMIT]
    # Naver items format: [name, code, type, market]
    return [{"name": item[0], "code": item[1], "market": item[3]} for item in items]
```

### 백엔드: 신규 엔드포인트

```
GET /finance/search?q=삼성
응답: [{"name": "삼성전자", "code": "005930", "market": "KOSPI"}, ...]
```

- `q` 길이: 2자 이상, 20자 이하 검증
- 인증: 불필요 (기존 `/finance/lookup` 동일 정책)
- Naver API 실패 시 → 500 반환

### 프론트엔드: TickerSearchInput 인터페이스

```typescript
interface TickerSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (code: string, name: string) => void;
  onSearch: () => void;
  isLoading: boolean;
  disabled?: boolean;
}
```

### 프론트엔드: 입력 감지 로직

```typescript
// 한글 또는 영문 포함 시 이름 검색
const isNameQuery = (val: string) => /[가-힣a-zA-Z]/.test(val);
```

---

## 엣지 케이스 처리

| 상황 | 처리 방식 |
|------|----------|
| 검색 결과 0개 | 드롭다운에 "검색 결과 없음" 표시 |
| Naver API 타임아웃/오류 | `showToast("종목 검색에 실패했습니다.", 'error')` + 드롭다운 숨김 |
| 1자 이하 입력 | API 호출 없음 |
| ESC 키 | 드롭다운 닫힘 |
| 드롭다운 외부 클릭 | 드롭다운 닫힘 |
| 숫자 입력 | 드롭다운 없음, 기존 코드 경로 유지 |

---

## 테스트 전략

### 백엔드 (pytest) — 커버리지 100% 유지

```
[Happy]  search_by_name("삼성") → [{name, code, market}, ...] (Naver API mocked)
[Boundary] q="" or len(q) < 2 → 400 Bad Request
[Boundary] Naver 응답 items=[] → 빈 배열 반환
[Error]  Naver API timeout → raise_for_status → 500 Internal Server Error
```

### 프론트엔드 (vitest) — 커버리지 100% 유지

```
[Happy]  한글 입력 → debounce → 드롭다운 표시 → 클릭 → code/name 자동 채움 → fetchAssetInfo 호출
[Boundary] 1자 입력 → API 미호출
[Boundary] 숫자 입력 → 드롭다운 없음
[Boundary] 검색 결과 0개 → "검색 결과 없음" 표시
[Error]  API 실패 → toast "종목 검색에 실패했습니다."
[Boundary] ESC 키 → 드롭다운 닫힘
```

---

## 스킬 검색 (Skill Discovery)

| 스킬/Agent | 용도 | 적용 Task |
|-----------|------|----------|
| `tdd-developer` agent | RED→GREEN→REFACTOR 구현 | 백엔드·프론트엔드 모든 코드 작성 Task |
| `code-reviewer` agent | 코드 품질 검토 | 각 Task 완료 후 리뷰 |
| `test-reviewer` agent | 테스트 품질 검토 | 각 Task 완료 후 병렬 리뷰 |
| `/vercel-react-best-practices` | Next.js/React 코드 작성 기준 | 프론트엔드 Task |
| `/vercel-composition-patterns` | 컴포넌트 설계 패턴 | TickerSearchInput 설계 |

---

## Task List

### Task 1: 백엔드 ports.py — search_by_name 인터페이스 추가
- **완료조건**: `MarketDataProvider`에 `search_by_name(query: str) -> list[dict]` 추상 메서드 존재, 테스트 통과
- **스킬 매핑**: `tdd-developer` agent

### Task 2: 백엔드 market_data.py — search_by_name 구현
- **완료조건**: `RealMarketDataProvider.search_by_name` 구현 완료, 상수 분리(`_NAVER_AC_URL` 등), 단위 테스트 통과 (Naver API mocked)
- **스킬 매핑**: `tdd-developer` agent

### Task 3: 백엔드 SearchAssetUseCase 추가
- **완료조건**: `SearchAssetUseCase(market_data).execute(query)` → `list[dict]` 반환, 단위 테스트 통과
- **스킬 매핑**: `tdd-developer` agent

### Task 4: 백엔드 /finance/search 엔드포인트 추가
- **완료조건**: `GET /finance/search?q=삼성` → 200 + 결과 배열, `q` 길이 검증, 라우트 테스트 통과
- **스킬 매핑**: `tdd-developer` agent

### Task 5: 프론트엔드 useTickerSearch 훅 구현
- **완료조건**: debounce 300ms, 2자 이상만 API 호출, 숫자 입력 시 미호출, 오류 시 onError 콜백, vitest 테스트 통과
- **스킬 매핑**: `tdd-developer` agent, `/vercel-react-best-practices`

### Task 6: 프론트엔드 TickerSearchInput 컴포넌트 구현
- **완료조건**: 드롭다운 표시/숨김, ESC·외부 클릭 닫힘, 선택 시 onSelect 호출, "검색 결과 없음" 표시, vitest 테스트 통과
- **스킬 매핑**: `tdd-developer` agent, `/vercel-composition-patterns`

### Task 7: AssetRow에 TickerSearchInput 통합
- **완료조건**: 기존 CODE 입력 → TickerSearchInput 교체, 선택 시 name/code 자동 채움 + fetchAssetInfo 즉시 호출, 기존 AssetRow 테스트 모두 통과
- **스킬 매핑**: `tdd-developer` agent

### Task 8: 전체 테스트 통과 확인
- **완료조건**: `cd backend && uv run pytest` → 100% pass, `cd frontend && npm test` → 100% pass
- **스킬 매핑**: `/test-backend`, `/test-frontend`
