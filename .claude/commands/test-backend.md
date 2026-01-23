# /test-backend - Run Backend Tests

백엔드 테스트를 실행합니다.

## Usage

```
/test-backend              # 전체 테스트
/test-backend unit         # 유닛 테스트만
/test-backend integration  # 통합 테스트만
/test-backend --coverage   # 커버리지 리포트 포함
/test-backend [파일경로]    # 특정 파일만
```

## Commands

```bash
# 전체 테스트
cd backend && uv run pytest tests/ -v

# 유닛 테스트만
cd backend && uv run pytest tests/unit/ -v

# 통합 테스트만
cd backend && uv run pytest tests/integration/ -v

# 특정 파일
cd backend && uv run pytest tests/unit/domain/test_asset.py -v

# 커버리지
cd backend && uv run pytest --cov=src --cov-report=html --cov-report=term

# 실패한 테스트만 재실행
cd backend && uv run pytest --lf

# 새로 작성된 테스트만
cd backend && uv run pytest --new-first
```

## Test Structure

```
backend/tests/
├── conftest.py                # 공용 fixtures
├── unit/
│   ├── domain/
│   │   ├── test_asset.py
│   │   ├── test_money.py
│   │   └── test_rebalancing_service.py
│   └── use_cases/
│       ├── test_calculate_portfolio.py
│       └── test_manage_assets.py
└── integration/
    ├── adapters/
    │   ├── test_api_endpoints.py
    │   └── test_repository.py
    └── external/
        └── test_finance_data_reader.py
```

## Coverage Requirements

- **Overall**: 80% minimum
- **Domain Layer**: 90% minimum
- **RebalancingService**: 100%
