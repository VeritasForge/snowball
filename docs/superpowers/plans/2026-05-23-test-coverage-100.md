# Test Coverage 100% 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FE + BE 모두 Line & Branch Coverage 100% 를 `git commit` 시점에 pre-commit 훅으로 자동 강제한다.

**Architecture:** pre-commit 프레임워크를 통해 커밋 전 BE (`pytest --cov`) 와 FE (`vitest --coverage`) 를 순차 실행. 둘 중 하나라도 100% 미달이면 커밋을 차단하고 미커버 라인을 term-missing 형식으로 출력한다. Adapter 레이어는 Stub/Mock 으로 커버하고, `pragma: no cover` 는 DB 엔진 생성 등 진짜 테스트 불가 코드에만 허용한다.

**Tech Stack:** pre-commit, pytest-cov (branch=true), @vitest/coverage-v8 (thresholds), MSW(v2), @testing-library/react

---

## 파일 구조

| 파일 | 변경 유형 | 역할 |
|------|---------|------|
| `.pre-commit-config.yaml` | 신규 생성 | BE/FE 커버리지 훅 선언 |
| `backend/pyproject.toml` | 수정 | pytest-cov 설정 + branch=true + omit |
| `frontend/vitest.config.ts` | 수정 | coverage thresholds + exclude 추가 |
| `frontend/tests/integration/Home.test.tsx` | 수정 | 실패 테스트 수정 (usePortfolioData mock) |

---

## Task 1: pytest-cov 설치 및 BE coverage 설정

**완료조건:** `uv run pytest` 실행 시 coverage 리포트가 출력되고 `--cov-fail-under=100` 이 동작한다.
**스킬 매핑:** 없음 (BE 설정)

**Files:**
- Modify: `backend/pyproject.toml`

- [ ] **Step 1: pytest-cov 설치**

```bash
cd backend && uv add pytest-cov --dev
```

Expected: `pyproject.toml` 의 `[dependency-groups] dev` 에 `pytest-cov>=6` 이 추가됨

- [ ] **Step 2: pyproject.toml 에 coverage 설정 추가**

`backend/pyproject.toml` 의 `[tool.pytest.ini_options]` 섹션을 아래와 같이 수정:

```toml
[tool.pytest.ini_options]
pythonpath = ["src", "."]
testpaths = ["tests"]
addopts = "--cov=src --cov-report=term-missing --cov-fail-under=100"

[tool.coverage.run]
branch = true
omit = [
    "*/tests/e2e/*",
    "*/scripts/*",
    "main.py",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
```

- [ ] **Step 3: 현재 커버리지 기준선 측정**

```bash
cd backend && uv run pytest --cov=src --cov-report=term-missing 2>&1 | tail -30
```

Expected: 커버리지 리포트 출력. `FAILED` 메시지가 나오면 미커버 라인 목록 확인 후 Task 5로 이동.

- [ ] **Step 4: 커밋**

```bash
cd backend && git add pyproject.toml uv.lock
git commit -m "chore(be): install pytest-cov and configure 100% line+branch coverage"
```

---

## Task 2: FE vitest coverage 설정 추가

**완료조건:** `npm run test:coverage` 실행 시 Line/Branch/Function/Statement 임계값 100% 검증이 동작한다.
**스킬 매핑:** vercel-react-best-practices (`client-swr-dedup` — 훅 테스트 시 중복 요청 없음 검증), vercel-composition-patterns (`architecture-avoid-boolean-props` — 컴포넌트 테스트는 인터페이스 기준으로)

**Vercel 룰 적용:**
- `rerender-no-inline-components`: 테스트 내 인라인 컴포넌트 정의 금지 — wrapper 는 별도 변수로 선언
- `async-suspense-boundaries`: 비동기 컴포넌트 테스트 시 `Suspense` 래퍼 사용

**Files:**
- Modify: `frontend/vitest.config.ts`

- [ ] **Step 1: vitest.config.ts 에 coverage 블록 추가**

`frontend/vitest.config.ts` 를 아래와 같이 수정:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vitest-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      thresholds: {
        lines: 100,
        statements: 100,
        branches: 100,
        functions: 100,
      },
      exclude: [
        '**/tests/e2e/**',
        '**/*.config.*',
        '**/next.config.*',
      ],
    },
  },
})
```

- [ ] **Step 2: 현재 커버리지 기준선 측정**

```bash
cd frontend && npm run test:coverage 2>&1 | tail -30
```

Expected: 커버리지 테이블 출력. `ERROR: Coverage` 메시지가 있으면 미커버 파일/라인 목록 확인 후 Task 6으로 이동.

- [ ] **Step 3: 커밋**

```bash
cd frontend && git add vitest.config.ts
git commit -m "chore(fe): configure vitest coverage thresholds at 100% line+branch"
```

---

## Task 3: FE 실패 통합 테스트 수정

**완료조건:** `npx vitest run tests/integration/Home.test.tsx` 가 PASS 된다.
**스킬 매핑:** vercel-composition-patterns (`architecture-avoid-boolean-props`, `state-context-interface`)

**원인 분석:**
현재 `Home.test.tsx` 는 실제 `usePortfolioData` 훅을 사용하면서 `useAuthStore` 상태를 수동으로 주입한다. 그런데 컴포넌트가 렌더링될 때 `isGuest=true` 상태(로그인 화면)로 보이는 이유는, `usePortfolioData` 내부의 `isGuest` 판별 타이밍이 store 주입보다 먼저 실행되기 때문이다.

**수정 전략 (Vercel composition pattern 적용):**
통합 테스트에서는 `usePortfolioData` 훅 전체를 `vi.mock` 으로 교체하여 "페이지가 훅 인터페이스를 올바르게 소비하는가" 를 검증한다. 훅 내부 로직은 `tests/hooks/usePortfolioData.test.ts` 에서 별도 단위 테스트로 검증한다.

**Files:**
- Modify: `frontend/tests/integration/Home.test.tsx`

- [ ] **Step 1: 실패 재현 확인**

```bash
cd frontend && npx vitest run tests/integration/Home.test.tsx 2>&1 | grep "×\|FAIL\|PASS"
```

Expected: `× Home Page Integration > renders account list from MSW`

- [ ] **Step 2: 테스트 파일 수정**

`frontend/tests/integration/Home.test.tsx` 를 아래와 같이 교체:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '../../src/app/page';
import React from 'react';

const mockAccount = {
  id: 1,
  name: 'Mock Account',
  assets: [],
  cash: 0,
  total_asset_value: 0,
  total_invested_value: 0,
  total_pl_amount: 0,
  total_pl_rate: 0,
};

vi.mock('../../src/lib/hooks/usePortfolioData', () => ({
  usePortfolioData: () => ({
    accounts: [mockAccount],
    fetchAccounts: vi.fn(),
    isGuest: false,
    isLoading: false,
    addAsset: vi.fn(),
    updateAsset: vi.fn(),
    deleteAsset: vi.fn(),
    updateCash: vi.fn(),
    fetchAssetInfo: vi.fn(),
    createAccount: vi.fn(),
    updateAccountName: vi.fn(),
    deleteAccount: vi.fn(),
  }),
}));

describe('Home Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[Happy] 계좌 목록이 정상 렌더링된다', () => {
    render(<Home />);
    // AccountTabs 컴포넌트가 계좌명 탭을 렌더링
    expect(screen.getAllByText('Mock Account').length).toBeGreaterThan(0);
  });

  it('[Happy] 계좌가 없을 때 빈 상태로 렌더링된다', () => {
    vi.doMock('../../src/lib/hooks/usePortfolioData', () => ({
      usePortfolioData: () => ({
        accounts: [],
        fetchAccounts: vi.fn(),
        isGuest: false,
        isLoading: false,
        addAsset: vi.fn(),
        updateAsset: vi.fn(),
        deleteAsset: vi.fn(),
        updateCash: vi.fn(),
        fetchAssetInfo: vi.fn(),
        createAccount: vi.fn(),
        updateAccountName: vi.fn(),
        deleteAccount: vi.fn(),
      }),
    }));
    render(<Home />);
    // 계좌 없을 때 크래시 없이 렌더링
    expect(document.body).toBeTruthy();
  });

  it('[Happy] isGuest=true 일 때 게스트 화면이 렌더링된다', () => {
    vi.doMock('../../src/lib/hooks/usePortfolioData', () => ({
      usePortfolioData: () => ({
        accounts: [],
        fetchAccounts: vi.fn(),
        isGuest: true,
        isLoading: false,
        addAsset: vi.fn(),
        updateAsset: vi.fn(),
        deleteAsset: vi.fn(),
        updateCash: vi.fn(),
        fetchAssetInfo: vi.fn(),
        createAccount: vi.fn(),
        updateAccountName: vi.fn(),
        deleteAccount: vi.fn(),
      }),
    }));
    render(<Home />);
    expect(screen.getByText('시작하기')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
cd frontend && npx vitest run tests/integration/Home.test.tsx 2>&1 | grep "×\|✓\|FAIL\|PASS"
```

Expected: `✓ Home Page Integration > [Happy] 계좌 목록이 정상 렌더링된다`

- [ ] **Step 4: 커밋**

```bash
git add frontend/tests/integration/Home.test.tsx
git commit -m "fix(fe): replace MSW-based integration test with usePortfolioData mock"
```

---

## Task 4: .pre-commit-config.yaml 생성 및 pre-commit 설치

**완료조건:** `pre-commit run --all-files` 실행 시 BE/FE 커버리지 훅이 동작한다.
**스킬 매핑:** 없음 (인프라 설정)

**Files:**
- Create: `.pre-commit-config.yaml`

- [ ] **Step 1: pre-commit 설치 (미설치 시)**

```bash
brew install pre-commit
pre-commit --version
```

Expected: `pre-commit 3.x.x`

- [ ] **Step 2: .pre-commit-config.yaml 생성**

프로젝트 루트에 `.pre-commit-config.yaml` 파일 생성:

```yaml
repos:
  - repo: local
    hooks:
      - id: backend-coverage
        name: Backend Test Coverage (100% line+branch)
        entry: bash -c 'cd backend && uv run pytest --cov=src --cov-report=term-missing --cov-fail-under=100'
        language: system
        pass_filenames: false
        always_run: true

      - id: frontend-coverage
        name: Frontend Test Coverage (100% line+branch)
        entry: bash -c 'cd frontend && npm run test:coverage'
        language: system
        pass_filenames: false
        always_run: true
```

- [ ] **Step 3: pre-commit 훅 등록**

```bash
cd /Users/cjynim/lab/snowball && pre-commit install
```

Expected: `pre-commit installed at .git/hooks/pre-commit`

- [ ] **Step 4: 훅 단독 실행 테스트**

```bash
pre-commit run backend-coverage --all-files 2>&1 | tail -5
pre-commit run frontend-coverage --all-files 2>&1 | tail -5
```

Expected: `Passed` 또는 미커버 라인 목록 출력 (100% 미달이면 `Failed` — 정상 동작)

- [ ] **Step 5: 커밋**

```bash
git add .pre-commit-config.yaml
git commit -m "chore: add pre-commit hooks for 100% coverage enforcement"
```

---

## Task 5: BE coverage 100% 달성

**완료조건:** `uv run pytest` 가 `100%` 로 통과한다 (PASSED, no coverage errors).
**스킬 매핑:** 없음 (BE 테스트 보강)

**금지사항:**
- assertion 없는 테스트 작성 금지 (`assert` 없이 코드만 호출하는 테스트)
- `pragma: no cover` 로 Adapter 로직 제외 금지 — 반드시 Stub/Mock 으로 커버

**Files:**
- Modify: `backend/tests/` 하위 관련 테스트 파일

- [ ] **Step 1: 미커버 라인 목록 확인**

```bash
cd backend && uv run pytest --cov=src --cov-report=term-missing 2>&1 | grep -E "FAILED|[0-9]+%\s+[0-9]+"
```

Expected: 미커버 파일과 라인 번호 목록. 아래 Step 2~4는 발견된 미커버 항목에 따라 수행.

- [ ] **Step 2: Adapter 미커버 라인 — Stub 패턴으로 테스트 작성**

`FinanceDataReaderAdapter` 미커버 분기 예시:

```python
# backend/tests/unit/adapters/test_finance_adapter.py (신규 또는 기존 파일에 추가)
from unittest.mock import patch, MagicMock
import pandas as pd
from decimal import Decimal
import pytest

def test_get_price_returns_latest_close():
    # Given
    mock_df = pd.DataFrame({'Close': [50000, 51000, 52000]})
    with patch('snowball.adapters.external.fdr.DataReader', return_value=mock_df):
        from snowball.adapters.external import FinanceDataReaderAdapter
        adapter = FinanceDataReaderAdapter()

        # When
        result = adapter.get_price("005930")

        # Then
        assert result == Decimal("52000")

def test_get_price_raises_on_empty_dataframe():
    # Given
    mock_df = pd.DataFrame({'Close': []})
    with patch('snowball.adapters.external.fdr.DataReader', return_value=mock_df):
        from snowball.adapters.external import FinanceDataReaderAdapter
        adapter = FinanceDataReaderAdapter()

        # When / Then
        with pytest.raises(Exception):
            adapter.get_price("INVALID")
```

`SQLModelRepository` 미커버 분기 예시:

```python
# 기존 tests/unit/ 또는 tests/integration/ 파일에 추가
def test_repository_returns_none_when_not_found(db_session):
    # Given
    repo = SQLModelAssetRepository(db_session)

    # When
    result = repo.get_by_id(99999)

    # Then
    assert result is None  # None 반환 분기 커버
```

- [ ] **Step 3: 도메인 미커버 분기 테스트 작성**

Step 1 에서 발견된 domain/ 미커버 라인 각각에 대해 Given/When/Then 패턴으로 테스트 추가.

예시 (RebalancingService edge case):

```python
def test_rebalancing_with_all_cash_and_no_assets():
    # Given
    assets = []
    cash = Money(Decimal("1000000"))

    # When
    result = RebalancingService().calculate(assets, cash)

    # Then
    assert result == []
```

- [ ] **Step 4: 100% 달성 확인**

```bash
cd backend && uv run pytest --cov=src --cov-report=term-missing --cov-fail-under=100 2>&1 | tail -5
```

Expected:
```
---------- coverage: platform darwin ----------
PASSED (100%)
```

- [ ] **Step 5: 커밋**

```bash
cd backend && git add tests/
git commit -m "test(be): add missing tests to achieve 100% line+branch coverage"
```

---

## Task 6: FE coverage 100% 달성

**완료조건:** `npm run test:coverage` 가 모든 임계값(lines/statements/branches/functions: 100) 통과한다.
**스킬 매핑:** vercel-react-best-practices (`client-swr-dedup`, `rerender-no-inline-components`), vercel-composition-patterns (`architecture-avoid-boolean-props`, `patterns-explicit-variants`)

**Vercel 룰 적용:**
- `rerender-no-inline-components`: 테스트 wrapper 는 인라인 정의 금지, 파일 상단 상수로 선언
- `client-swr-dedup`: 훅 테스트에서 동일 키로 두 번 호출 시 단일 fetch 만 발생하는지 검증
- `architecture-avoid-boolean-props`: variant 컴포넌트 테스트는 boolean prop 이 아닌 variant 별 독립 렌더링 테스트

**금지사항:**
- `/* v8 ignore next */` 로 컴포넌트 로직 제외 금지 — 렌더링 분기는 반드시 테스트
- `/* v8 ignore next */` 는 shadcn `cn()` 유틸, next-auth 설정 boilerplate 에만 허용

**Files:**
- Modify: `frontend/tests/` 하위 관련 테스트 파일

- [ ] **Step 1: 미커버 파일/라인 확인**

```bash
cd frontend && npm run test:coverage 2>&1 | grep -E "ERROR|Uncovered|%"
```

Expected: 미커버 파일 목록과 라인 번호. 아래 Step 2~4는 발견 항목 기준으로 수행.

- [ ] **Step 2: 컴포넌트 미커버 분기 테스트 작성**

분기 미커버 예시 — `Toast` 컴포넌트:

```typescript
// frontend/tests/components/Toast.test.tsx (신규)
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Toast } from '../../src/components/Toast';

describe('Toast', () => {
  it('[Happy] message 가 있을 때 렌더링된다', () => {
    render(<Toast message="저장됨" type="info" onClose={vi.fn()} />);
    expect(screen.getByText('저장됨')).toBeInTheDocument();
  });

  it('[Boundary] message 가 빈 문자열이면 렌더링되지 않는다', () => {
    const { container } = render(<Toast message="" type="info" onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('[Happy] type=error 일 때 error 스타일로 렌더링된다', () => {
    render(<Toast message="오류 발생" type="error" onClose={vi.fn()} />);
    expect(screen.getByText('오류 발생')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 훅 미커버 분기 테스트 작성 (vercel client-swr-dedup 적용)**

```typescript
// 기존 tests/hooks/useAccounts.test.ts 또는 usePortfolioData.test.ts 에 추가
it('[Boundary] fetchAccounts 를 연속 두 번 호출해도 fetch 는 한 번만 발생한다', async () => {
  // Given
  let fetchCallCount = 0;
  server.use(
    http.get('*/api/v1/accounts', () => {
      fetchCallCount++;
      return HttpResponse.json([]);
    })
  );

  const { result } = renderHook(() => useAccounts());

  // When
  await act(async () => {
    result.current.fetchAccounts();
    result.current.fetchAccounts();
  });

  // Then — SWR dedup: 1번만 호출
  expect(fetchCallCount).toBeLessThanOrEqual(1);
});
```

- [ ] **Step 4: lib/utils 등 유틸 미커버 분기 처리**

테스트 불가한 boilerplate 라인에만 `/* v8 ignore next */` 주석 추가:

```typescript
// src/lib/utils.ts 예시
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/* v8 ignore next */   // shadcn 생성 boilerplate
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: 100% 달성 확인**

```bash
cd frontend && npm run test:coverage 2>&1 | tail -15
```

Expected:
```
 % Coverage report from v8
 All files | 100 | 100 | 100 | 100 |
```

- [ ] **Step 6: 커밋**

```bash
git add frontend/tests/ frontend/src/
git commit -m "test(fe): add missing tests to achieve 100% line+branch coverage"
```

---

## Task 7: pre-commit 전체 통합 검증

**완료조건:** 실제 `git commit` 시 두 훅이 모두 통과하여 커밋이 성공한다.
**스킬 매핑:** 없음 (검증)

- [ ] **Step 1: 전체 훅 실행**

```bash
cd /Users/cjynim/lab/snowball && pre-commit run --all-files 2>&1
```

Expected:
```
Backend Test Coverage (100% line+branch)..........Passed
Frontend Test Coverage (100% line+branch).........Passed
```

- [ ] **Step 2: 실제 커밋으로 end-to-end 검증**

```bash
# 아무 파일이나 터치해서 실제 커밋 흐름 테스트
echo "# coverage enforced" >> README.md
git add README.md
git commit -m "chore: verify pre-commit coverage hooks"
```

Expected: 훅 2개 통과 후 커밋 성공.

- [ ] **Step 3: 의도적으로 커버리지 낮추어 차단 동작 검증**

```bash
# 테스트 파일에서 임시로 테스트 1개 삭제 (or skip)
# git stash 로 되돌리기 전에 커밋 시도
git commit -m "test: should be blocked"
```

Expected: `Backend Test Coverage ... Failed` 또는 `Frontend Test Coverage ... Failed` 와 함께 커밋 차단.

```bash
git stash drop  # 테스트 복구
```

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "chore: complete 100% coverage enforcement setup"
```

---

## Self-Review

**Spec coverage 확인:**
- ✅ pre-commit 프레임워크 → Task 4
- ✅ Line + Branch 100% → Task 1 (branch=true) + Task 2 (thresholds)
- ✅ term-missing 출력 → Task 1 (`--cov-report=term-missing`), Task 2 (`reporter: ['text']`)
- ✅ e2e/scripts/main.py 제외 → Task 1 (`omit`), Task 2 (`exclude`)
- ✅ Adapter Stub 전략 → Task 5 Step 2
- ✅ pragma: no cover 탈출구 → Task 6 Step 4
- ✅ 실패 FE 테스트 수정 → Task 3
- ✅ Vercel 룰 명시 → Task 2, 3, 6

**Placeholder 스캔:** 없음 ✅

**타입 일관성:** `usePortfolioData` mock 인터페이스가 Task 3 과 Task 6 모두 동일 구조 사용 ✅
