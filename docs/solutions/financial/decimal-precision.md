---
category: financial
tags: [decimal, precision, value-object, money]
created: 2026-02-16
updated: 2026-02-16
---

# Decimal 정밀도 처리 패턴

## 문제

Python `float`는 부동소수점 오류로 인해 금융 계산에 부적합합니다:

```python
# ❌ float 사용 시 정밀도 문제
0.1 + 0.2 == 0.3  # False!
0.1 + 0.2         # 0.30000000000000004

# 금융 계산에서 치명적
price = 15000.50    # float
quantity = 10
total = price * quantity  # 150005.0 (정확하지만 우연)

# 더 복잡한 계산에서 문제 발생
(0.1 * 3) == 0.3  # False!
```

**문제점**:
- IEEE 754 부동소수점 표준의 한계
- 10진수를 2진수로 변환 시 근사값 사용
- 금융 계산에서 오차 누적 시 심각한 문제

---

## 해결책

항상 `decimal.Decimal` 사용:

```python
from decimal import Decimal, ROUND_HALF_UP

# ✅ Decimal 사용 (정확한 계산)
price = Decimal("15000.50")
quantity = Decimal("10")
total = (price * quantity).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
# total = Decimal("150005") (정확!)

# ✅ 비교도 정확
a = Decimal("0.1")
b = Decimal("0.2")
a + b == Decimal("0.3")  # True!
```

---

## 규칙

### 1. 모든 금액은 `Money` Value Object로 래핑

```python
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

@dataclass(frozen=True)
class Money:
    """금액을 나타내는 Value Object"""
    amount: Decimal
    currency: str = "KRW"

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"Cannot add {self.currency} and {other.currency}")
        return Money(self.amount + other.amount, self.currency)

    def __mul__(self, scalar: Decimal) -> "Money":
        return Money(
            (self.amount * scalar).quantize(Decimal("1"), rounding=ROUND_HALF_UP),
            self.currency
        )

    def round(self, precision: str = "1") -> "Money":
        """금액 반올림 (기본: 원 단위)"""
        return Money(
            self.amount.quantize(Decimal(precision), rounding=ROUND_HALF_UP),
            self.currency
        )
```

### 2. 문자열로 초기화

```python
# ✅ 올바른 방법
price = Decimal("15000.50")
money = Money(Decimal("15000.50"))

# ❌ float로 초기화하지 마세요!
price = Decimal(15000.50)  # 여전히 부동소수점 오류 발생
```

### 3. 반올림 명시

금융 표준 반올림 방식 사용:

```python
from decimal import ROUND_HALF_UP  # 은행가 반올림

# 원 단위 반올림
amount = Decimal("15000.567")
rounded = amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
# rounded = Decimal("15001")

# 소수점 둘째 자리 반올림 (센트)
amount = Decimal("15.567")
rounded = amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
# rounded = Decimal("15.57")
```

**반올림 모드**:
- `ROUND_HALF_UP`: 0.5 이상이면 올림 (금융 표준)
- `ROUND_HALF_EVEN`: 은행가 반올림 (가장 가까운 짝수로)
- `ROUND_DOWN`: 항상 내림
- `ROUND_UP`: 항상 올림

Snowball에서는 **`ROUND_HALF_UP` 사용**을 권장합니다.

---

## 테스트

### 기본 테스트

```python
import pytest
from decimal import Decimal
from snowball.domain.value_objects import Money

def test_decimal_precision():
    """Decimal 정밀도 테스트"""
    a = Money(Decimal("0.1"))
    b = Money(Decimal("0.2"))
    result = a + b

    assert result.amount == Decimal("0.3")
    assert result.amount != 0.30000000000000004

def test_money_multiplication():
    """금액 곱셈 테스트"""
    price = Money(Decimal("15000.50"))
    quantity = Decimal("10")
    total = price * quantity

    assert total.amount == Decimal("150005")

def test_money_rounding():
    """금액 반올림 테스트"""
    money = Money(Decimal("15000.567"))
    rounded = money.round("1")  # 원 단위

    assert rounded.amount == Decimal("15001")
```

### 엣지 케이스 테스트

```python
def test_very_small_amounts():
    """매우 작은 금액 테스트"""
    a = Money(Decimal("0.01"))
    b = Money(Decimal("0.02"))
    result = a + b

    assert result.amount == Decimal("0.03")

def test_large_calculations():
    """대규모 계산 정밀도 테스트"""
    price = Money(Decimal("1234567.89"))
    quantity = Decimal("9876")
    total = price * quantity

    # float로 계산 시 오차 발생 가능
    assert total.amount == Decimal("12193333325.64")

def test_division_precision():
    """나눗셈 정밀도 테스트"""
    total = Money(Decimal("100"))
    parts = Decimal("3")

    # 나눗셈 후 반올림
    per_part = Money(
        (total.amount / parts).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    )

    assert per_part.amount == Decimal("33.33")
```

---

## 적용 사례

### 리밸런싱 계산

```python
# backend/src/snowball/domain/services.py
from decimal import Decimal, ROUND_HALF_UP

class RebalancingService:
    def calculate_target_value(
        self,
        total_value: Money,
        target_ratio: Ratio
    ) -> Money:
        """목표 가치 계산"""
        target_amount = (
            total_value.amount * target_ratio.value
        ).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

        return Money(target_amount, total_value.currency)
```

### 거래 수수료 계산

```python
def calculate_fee(amount: Money, fee_rate: Decimal) -> Money:
    """거래 수수료 계산 (비율 기반)"""
    fee_amount = (
        amount.amount * fee_rate
    ).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

    return Money(fee_amount, amount.currency)

# 사용 예시
transaction_amount = Money(Decimal("1000000"))  # 100만원
fee_rate = Decimal("0.001")  # 0.1%
fee = calculate_fee(transaction_amount, fee_rate)
# fee = Money(Decimal("1000"))  # 정확히 1000원
```

---

## 주의사항

### ❌ 하지 말 것

```python
# ❌ float 사용
price = 15000.50
total = price * 10

# ❌ float로 Decimal 초기화
price = Decimal(15000.50)

# ❌ 반올림 없이 연산
result = Decimal("10") / Decimal("3")  # 3.333333...

# ❌ 문자열 없이 직접 계산
price = Decimal("15000") + 0.5  # TypeError or float 변환
```

### ✅ 올바른 방법

```python
# ✅ 문자열로 초기화
price = Decimal("15000.50")
total = price * Decimal("10")

# ✅ 항상 반올림 명시
result = (Decimal("10") / Decimal("3")).quantize(
    Decimal("0.01"), rounding=ROUND_HALF_UP
)

# ✅ Money VO 사용
price = Money(Decimal("15000.50"))
total = price * Decimal("10")
```

---

## 성능 고려사항

**Decimal vs float 성능**:
- `Decimal`은 `float`보다 느림 (약 10-100배)
- 금융 계산에서는 정확성 > 성능
- Snowball 규모에서는 성능 차이 무시 가능

**최적화 팁**:
```python
# ✅ 반복 연산에서는 한 번만 quantize
amounts = [Decimal("10.123"), Decimal("20.456"), Decimal("30.789")]
total = sum(amounts)  # 중간 과정은 정밀도 유지
final = total.quantize(Decimal("1"), rounding=ROUND_HALF_UP)  # 마지막에만 반올림
```

---

## 참고

- **Python 공식 문서**: [decimal — Decimal fixed point and floating point arithmetic](https://docs.python.org/3/library/decimal.html)
- **금융 표준**: IEEE 854 (Decimal Arithmetic)
- **관련 VO**: `Money` (@backend/src/snowball/domain/value_objects.py)
- **관련 패턴**:
  - @docs/solutions/domain/value-object-design.md
  - @docs/solutions/financial/ratio-validation.md

---

## 이력

- 2026-02-16: 초기 문서 작성 (Phase 1 - Compound Engineering 적용)
