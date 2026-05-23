# Test Coverage 100% 유지 설계

**날짜**: 2026-05-23
**상태**: 승인됨

---

## 목표

FE (Vitest) 와 BE (pytest-cov) 모두 Line + Branch Coverage 100% 를 `git commit` 시점에 자동 강제한다.

---

## 완료 조건

- `git commit` 시 pre-commit 훅이 자동 실행된다
- FE/BE 중 하나라도 100% 미달이면 커밋이 차단된다
- 미달 시 어느 파일의 어느 라인이 미커버인지 `term-missing` 스타일로 출력된다
- Line Coverage + Branch Coverage 를 모두 측정한다

---

## 금지사항

- 커버리지 숫자를 채우기 위한 assertion 없는 가짜 테스트 작성 금지
- Adapter 로직을 `pragma: no cover` 로 무작정 제외 금지 — Stub 으로 커버할 것
- `pragma: no cover` 는 DB 엔진 생성·OS 시그널 핸들러 등 진짜 테스트 불가 코드에만 허용

---

## 고려사항

### Vitest 기본 동작
Vitest 는 기본적으로 "테스트가 실제로 건드린 파일만" 커버리지 분모에 포함한다.
따라서 `thresholds: 100%` 는 "테스트 없는 파일을 강제 포함"하는 게 아니라
"테스트가 있는 파일은 빈틈없이 커버"하는 의미다.
(Martin Fowler 의 "100% 강제는 가짜 테스트 유발" 경고와 충돌하지 않음)

### pytest-cov 동작
`--cov=src` 는 src/ 전체 파일을 분모에 포함한다 (Vitest 와 다름).
Adapter 레이어는 Stub (Mock/Patch) 으로 외부 의존성을 교체하여 커버한다.

### Adapter 테스트 전략
- `SQLModelAssetRepository` → SQLModel Session 을 Mock 으로 교체
- `FinanceDataReaderAdapter` → `fdr.DataReader` 를 `@patch` 로 Stub
- DB 엔진 생성(`create_engine`), OS 시그널 등 앱 시작 시 1회성 코드 → `# pragma: no cover`

---

## 제약사항

- pre-commit 프레임워크 (`brew install pre-commit`) 설치 필요
- pytest-cov (`uv add pytest-cov --dev`) 설치 필요
- @vitest/coverage-v8 은 이미 설치됨

---

## 아키텍처

### 전체 흐름

```
git commit
    ↓
pre-commit 자동 실행 (.pre-commit-config.yaml)
    ├── [BE] uv run pytest --cov=src --cov-report=term-missing --cov-fail-under=100
    └── [FE] npm run test:coverage
         ↓
    Line + Branch 모두 100%? → 커밋 통과 ✅
    하나라도 미달?           → 커밋 차단 ❌ + 미커버 라인 출력
```

### 파일 구조

```
snowball/
├── .pre-commit-config.yaml      ← 신규 생성
├── backend/
│   └── pyproject.toml           ← [tool.coverage] 섹션 추가
└── frontend/
    └── vitest.config.ts         ← coverage 블록 추가
```

---

## 설정 상세

### `.pre-commit-config.yaml`

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

### `backend/pyproject.toml` 추가

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

### `frontend/vitest.config.ts` 추가

```ts
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
```

---

## 탈출구 (Escape Hatch)

진짜 테스트 불가 코드에 한해 주석으로 제외:

```python
# BE: pragma 주석
engine = create_engine(os.environ["DATABASE_URL"])  # pragma: no cover
```

```typescript
// FE: v8 ignore 주석
/* v8 ignore next */
export const authOptions = { ... }  // next-auth 설정 boilerplate
```

---

## 설치 방법 (최초 1회)

```bash
# 1. pre-commit 설치
brew install pre-commit

# 2. pytest-cov 설치
cd backend && uv add pytest-cov --dev

# 3. 훅 등록
pre-commit install
```
