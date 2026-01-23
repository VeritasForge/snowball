# Snowball Domain Rules

스노우볼 프로젝트의 도메인 특화 규칙입니다.

## Financial Calculations

### Decimal Precision
```python
# ❌ NEVER use float for money
price = 15000.50  # Float precision issues

# ✅ ALWAYS use Decimal
from decimal import Decimal, ROUND_HALF_UP

price = Decimal("15000.50")
quantity = Decimal("10")
total = (price * quantity).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
```

### Ratio Validation
```python
# ✅ Always validate ratios
def validate_portfolio_ratios(assets: list[Asset]) -> None:
    total_ratio = sum(a.target_ratio for a in assets)
    if not Decimal("0.99") <= total_ratio <= Decimal("1.01"):
        raise ValueError(f"Total ratio must be ~100%, got {total_ratio * 100}%")
```

### Rebalancing Formula
```python
# 리밸런싱 계산 공식
total_value = sum(asset.market_value for asset in assets) + cash

for asset in assets:
    target_value = total_value * asset.target_ratio
    current_value = asset.current_price * asset.quantity
    diff = target_value - current_value
    trade_quantity = int(diff / asset.current_price)
```

## Value Objects

모든 도메인 값은 Value Object로 래핑:

```python
@dataclass(frozen=True)
class Money:
    """금액을 나타내는 Value Object"""
    amount: Decimal
    currency: str = "KRW"

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")

@dataclass(frozen=True)
class Quantity:
    """수량을 나타내는 Value Object"""
    value: int

    def __post_init__(self):
        if self.value < 0:
            raise ValueError("Quantity cannot be negative")

@dataclass(frozen=True)
class Ratio:
    """비율(0~1)을 나타내는 Value Object"""
    value: Decimal

    def __post_init__(self):
        if not Decimal("0") <= self.value <= Decimal("1"):
            raise ValueError("Ratio must be between 0 and 1")
```

## Entity Rules

### Asset Entity
```python
class Asset:
    id: int
    account_id: int  # 소속 계좌
    ticker: str      # 종목코드 (unique per account)
    name: str        # 종목명
    category: AssetCategory  # 주식, 채권, 원자재 등
    target_ratio: Ratio      # 목표 비중
    quantity: Quantity       # 보유 수량
    current_price: Money     # 현재가

    @property
    def market_value(self) -> Money:
        """평가금액 = 현재가 × 수량"""
        return Money(self.current_price.amount * self.quantity.value)
```

### Account Entity
```python
class Account:
    id: int
    user_id: int     # 소유자
    name: str        # 계좌명
    cash: Money      # 예수금

    # Invariant: 한 계좌 내 ticker는 유일해야 함
```

## Business Rules

### 1. 비중 합계 = 100%
포트폴리오 내 모든 자산의 target_ratio 합계는 100%여야 함

### 2. 자산 삭제 시 리밸런싱
자산 삭제 시 남은 자산들의 비중을 재조정해야 할 수 있음

### 3. 매매 단위
- 국내 주식: 1주 단위
- 해외 주식: 소수점 가능 (브로커에 따라 다름)

### 4. 데이터 격리
사용자는 자신의 계좌만 조회/수정 가능 (account.user_id 검증 필수)

## API Response Format

```python
# 성공 응답
{
    "data": {...},
    "meta": {
        "timestamp": "2024-01-23T12:00:00Z"
    }
}

# 에러 응답
{
    "error": {
        "code": "ASSET_NOT_FOUND",
        "message": "Asset with id 123 not found"
    }
}

# 리밸런싱 응답
{
    "data": {
        "total_value": 10000000,
        "cash": 500000,
        "assets": [
            {
                "ticker": "SPY",
                "current_ratio": 0.45,
                "target_ratio": 0.50,
                "trade_action": "BUY",
                "trade_quantity": 5,
                "trade_amount": 250000
            }
        ]
    }
}
```

## Testing Requirements

### Domain Layer Tests
```python
# 모든 Value Object 생성/검증 테스트
def test_money_cannot_be_negative():
    with pytest.raises(ValueError):
        Money(Decimal("-100"))

# 모든 비즈니스 규칙 테스트
def test_portfolio_ratio_must_sum_to_100():
    ...

# 경계값 테스트
def test_rebalancing_with_zero_cash():
    ...

def test_rebalancing_with_single_asset():
    ...
```
