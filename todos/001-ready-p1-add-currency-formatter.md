---
priority: P1
status: ready
estimated_tokens: 5000
---

# Add Currency Formatter Utility

## Description
금액을 사용자 친화적으로 표시하기 위한 포맷팅 유틸리티 함수를 추가합니다.
예: `1000000` → `"1,000,000원"`, `Decimal("15000.50")` → `"15,000원"` (반올림)

## Acceptance Criteria
- [ ] `backend/src/snowball/utils/formatting.py` 파일 생성
- [ ] `format_currency(amount: Decimal, currency: str = "KRW") -> str` 함수 구현
- [ ] 천 단위 쉼표 추가
- [ ] 소수점 반올림 (원 단위)
- [ ] 통화 기호 추가 (KRW → "원", USD → "$")
- [ ] 테스트 작성 (tests/unit/utils/test_formatting.py)
- [ ] 엣지 케이스 테스트:
  - [ ] 0원
  - [ ] 음수 (마이너스 표시)
  - [ ] 매우 큰 수 (1억 이상)
  - [ ] Decimal 입력
- [ ] 타입 힌트 포함
- [ ] Docstring 작성

## Constraints
- Decimal 타입 입력 지원 필수
- Money Value Object는 사용하지 않음 (순수 유틸리티)
- Clean Architecture: Domain 레이어가 아닌 Utils 레이어에 위치
- 기존 테스트 모두 통과 유지

## Example Usage
```python
from decimal import Decimal
from snowball.utils.formatting import format_currency

# 기본 사용
format_currency(Decimal("1000000"))  # "1,000,000원"
format_currency(Decimal("15000.50"))  # "15,001원" (반올림)

# 다른 통화
format_currency(Decimal("1000"), "USD")  # "$1,000"

# 음수
format_currency(Decimal("-5000"))  # "-5,000원"
```

## Notes
- 프론트엔드에서도 사용할 수 있도록 API 응답에 포함 가능
- 향후 i18n 지원 고려 (현재는 KRW, USD만)
