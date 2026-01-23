# Testing Rules

테스트 작성에 관한 필수 규칙입니다.

## Core Principle

> **No code without tests. Tests are not optional.**

## Coverage Requirements

| Layer | Minimum | Target |
|-------|---------|--------|
| Domain (Entities, Value Objects) | 90% | 100% |
| Use Cases | 85% | 95% |
| Adapters (API, Repository) | 80% | 90% |
| Frontend Components | 70% | 85% |
| Utilities | 90% | 100% |
| **Overall** | **80%** | **90%** |

## Critical Paths (100% Required)

다음 영역은 100% 커버리지 필수:

### Backend
- `RebalancingService` - 리밸런싱 계산 로직
- `Money`, `Quantity`, `Ratio` - Value Objects
- API 입력 검증

### Frontend
- 금액 계산/포맷팅 함수
- 리밸런싱 결과 표시 로직

## TDD Workflow

```
1. RED    → 실패하는 테스트 작성
2. GREEN  → 테스트 통과하는 최소 코드
3. REFACTOR → 코드 개선 (테스트 유지)
```

## Test Structure

### Given-When-Then Pattern
```python
def test_rebalancing_calculates_correct_quantities():
    # Given - 테스트 데이터 준비
    assets = [
        Asset(ticker="SPY", current_price=100, quantity=10, target_ratio=0.5),
        Asset(ticker="TLT", current_price=50, quantity=20, target_ratio=0.5),
    ]
    cash = Money(500)

    # When - 테스트 대상 실행
    result = RebalancingService().calculate(assets, cash)

    # Then - 결과 검증
    assert result[0].trade_quantity == 5
    assert result[1].trade_quantity == -5
```

### Descriptive Test Names
```python
# ❌ Vague names
def test_asset():
def test_calculate():

# ✅ Descriptive names
def test_asset_creation_with_valid_data():
def test_rebalancing_when_portfolio_is_unbalanced():
def test_api_returns_404_when_asset_not_found():
```

## Edge Cases Checklist

모든 함수에 대해 다음 케이스 테스트:

- [ ] **null/None/undefined** 입력
- [ ] **빈 배열/객체**
- [ ] **잘못된 타입**
- [ ] **경계값** (0, 음수, 최대값)
- [ ] **특수 문자** (SQL injection, XSS vectors)

### Financial Specific
- [ ] 비중 합계 100% 초과
- [ ] 비중 합계 100% 미달
- [ ] 소수점 정밀도 (0.1 + 0.2 ≠ 0.3)
- [ ] 0원 자산
- [ ] 음수 수량

## Anti-Patterns to Avoid

### 1. Testing Implementation Details
```python
# ❌ Tests private method
def test_internal_calculation():
    service = RebalancingService()
    result = service._calculate_target_value(...)  # Private!

# ✅ Tests public interface
def test_rebalancing_result():
    service = RebalancingService()
    result = service.calculate(assets, cash)
    assert result.total_trade_amount == expected
```

### 2. Test Dependencies
```python
# ❌ Tests depend on execution order
def test_create_asset():
    asset = repo.create(Asset(...))
    assert asset.id == 1  # Assumes this runs first

def test_get_asset():
    asset = repo.get_by_id(1)  # Depends on test above

# ✅ Independent tests
def test_create_and_retrieve_asset():
    created = repo.create(Asset(...))
    retrieved = repo.get_by_id(created.id)
    assert retrieved.ticker == created.ticker
```

### 3. Flaky Tests
```python
# ❌ Time-dependent (flaky)
def test_created_at():
    asset = create_asset()
    assert asset.created_at == datetime.now()  # Race condition

# ✅ Use freezegun or mock time
from freezegun import freeze_time

@freeze_time("2024-01-01 12:00:00")
def test_created_at():
    asset = create_asset()
    assert asset.created_at == datetime(2024, 1, 1, 12, 0, 0)
```

### 4. Over-Mocking
```python
# ❌ Mocks everything (tests nothing)
def test_service():
    repo = Mock()
    service = Mock()
    result = Mock()
    # What are we even testing?

# ✅ Mock only external dependencies
def test_service_calculates_correctly():
    repo = Mock()
    repo.get_all.return_value = [Asset(...), Asset(...)]

    service = RebalancingService(repo)
    result = service.calculate()  # Real calculation

    assert result.total == expected
```

## Test Commands

```bash
# Backend
cd backend && uv run pytest -v
cd backend && uv run pytest --cov=src --cov-report=html

# Frontend
cd frontend && npm test
cd frontend && npm run test:coverage
```
