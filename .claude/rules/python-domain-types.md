# Python Domain Types Rules

도메인 의미를 가진 값을 타입 안전하게 표현하기 위한 규칙입니다.

## 1. 타입 힌트 — `X | None` 사용 (Python 3.10+)

```python
# ❌ 구형 스타일
from typing import Optional
def get(id: int) -> Optional[Asset]: ...

# ✅ 현대 스타일 (Python 3.12 프로젝트)
def get(id: int) -> Asset | None: ...
```

`Optional`, `Union`, `List`, `Dict`, `Tuple` 모두 소문자 built-in 또는 `|` 문법으로 대체:

| ❌ 구형 | ✅ 현대 |
|---------|---------|
| `Optional[X]` | `X \| None` |
| `Union[X, Y]` | `X \| Y` |
| `List[X]` | `list[X]` |
| `Dict[K, V]` | `dict[K, V]` |
| `Tuple[X, Y]` | `tuple[X, Y]` |

## 2. 도메인 값 — StrEnum 사용 (magic string 금지)

유한한 값 집합을 가진 도메인 필드(분류, 상태, 타입 등)는 반드시 `StrEnum`으로 정의할 것.

```python
# ❌ magic string — 오타, 잘못된 값 방지 불가
category: str = "주식"
if asset.category == "채권": ...
return "원자재"

# ✅ StrEnum — 타입 안전, IDE 자동완성 지원
from enum import StrEnum

class AssetCategory(StrEnum):
    STOCK     = "주식"
    BOND      = "채권"
    COMMODITY = "원자재"
    CASH      = "현금"
    OTHER     = "기타"

category: AssetCategory = AssetCategory.STOCK
if asset.category == AssetCategory.BOND: ...
return AssetCategory.COMMODITY
```

### StrEnum 적용 기준

| 기준 | 예시 | 처리 |
|------|------|------|
| 값이 유한하고 고정됨 | 자산 분류, 매매 액션, 상태 | ✅ StrEnum |
| 값이 개방형 (임의 문자열) | 티커 코드, 종목명, 이름 | `str \| None` 유지 |

### 계층별 일관 적용

StrEnum은 도메인 경계를 넘는 **모든 계층**에서 동일하게 적용한다:

```
domain/enums.py       → StrEnum 정의 (단일 출처)
domain/entities.py    → 엔티티 필드에 StrEnum 사용
adapters/db/models.py → SQLModel 컬럼에 StrEnum 사용 (값은 그대로 DB 저장)
adapters/api/dtos.py  → Pydantic 모델에 StrEnum 사용 (JSON 직렬화 자동 처리)
domain/services.py    → 반환 타입도 StrEnum
tests/               → 테스트에서도 StrEnum 값 참조 (magic string 단정 금지)
```

### 테스트에서의 사용

```python
# ❌ 테스트에서도 magic string 금지
assert asset.category == "채권"
Asset(name="SPY", category="주식", ...)

# ✅ StrEnum 참조
from src.snowball.domain.enums import AssetCategory
assert asset.category == AssetCategory.BOND
Asset(name="SPY", category=AssetCategory.STOCK, ...)
```

> **예외**: e2e/API 테스트에서 JSON 응답값을 검증할 때는 `"주식"` 같은 문자열 비교가 허용된다.
> StrEnum은 JSON 직렬화 시 문자열 값으로 출력되므로 `AssetCategory.STOCK == "주식"` 은 True이지만,
> 가능하면 `AssetCategory.STOCK` 상수를 사용하는 것이 의도를 명확히 한다.

## 3. 새 도메인 필드 추가 시 체크리스트

- [ ] 값이 유한한가? → StrEnum으로 정의
- [ ] `domain/enums.py`에 추가했는가?
- [ ] 모든 계층(entities, models, dtos, services)에 적용했는가?
- [ ] 관련 테스트도 StrEnum 상수로 업데이트했는가?
