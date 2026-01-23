---
name: test-writing
description: 테스트 작성 표준과 커버리지 요구사항
---

# Test Writing Standards

## 테스트 구조

### 1. Given-When-Then 명시적 주석

```python
def test_should_calculate_rebalancing_amount():
    # Given: 자산 2개와 현금 보유
    portfolio = Portfolio(
        assets=[asset1, asset2],
        cash=Money(Decimal("100000"))
    )

    # When: 리밸런싱 계산 실행
    result = rebalancing_service.calculate(portfolio)

    # Then: 매수/매도 수량이 올바르게 계산됨
    assert result.trades[0].quantity == expected_quantity
```

### 2. 단일 개념 검증

하나의 테스트 = 하나의 동작

```python
# ✅ 좋은 예: 단일 개념
def test_should_reject_negative_money():
    with pytest.raises(ValueError):
        Money(Decimal("-100"))

# ❌ 나쁜 예: 여러 개념
def test_money_validation():
    # 음수 테스트
    with pytest.raises(ValueError):
        Money(Decimal("-100"))
    # 영 테스트
    money = Money(Decimal("0"))
    assert money.amount == 0
```

### 3. 서술적 이름

```
test_should_[expected_behavior]_when_[condition]
```

## 커버리지 요구사항

| 계층 | 최소 | 목표 |
|------|------|------|
| Domain (Entity, VO) | 90% | 100% |
| Use Cases | 85% | 95% |
| Adapters (API, Repo) | 80% | 90% |
| Frontend Components | 70% | 85% |
| **전체** | **80%** | **90%** |

## 100% 필수 영역

다음 영역은 **반드시 100% 커버리지**:

- `RebalancingService` - 리밸런싱 계산
- `Money`, `Quantity`, `Ratio` - Value Objects
- 금액 계산/포맷팅 함수

## 테스트 안티패턴

| 안티패턴 | 설명 | 해결책 |
|---------|------|--------|
| ❌ private 메서드 테스트 | 구현 세부사항 테스트 | public 인터페이스로 테스트 |
| ❌ 테스트 간 의존성 | 순서 의존 테스트 | 각 테스트 독립적으로 |
| ❌ 과도한 모킹 | 실제 동작 검증 불가 | 필요한 최소만 모킹 |
| ❌ Flaky tests | 불안정한 테스트 | 원인 파악 후 수정 |

## 경계값 테스트

금융 계산의 경우 반드시 다음 경계값 테스트:

- 0 (영)
- 음수 (거부되어야 함)
- 매우 큰 수
- 소수점 정밀도

```python
@pytest.mark.parametrize("amount", [
    Decimal("0"),
    Decimal("0.01"),
    Decimal("999999999.99"),
])
def test_should_accept_valid_amounts(amount):
    money = Money(amount)
    assert money.amount == amount
```

## 참조 규칙

- `.claude/rules/testing.md`
