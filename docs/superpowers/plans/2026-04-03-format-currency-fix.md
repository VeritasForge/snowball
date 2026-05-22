# format_currency Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `format_currency`의 두 가지 버그 수정 — USD 음수 포맷 오류(`$-5,000` → `-$5,000`)와 미지원 통화 코드의 무음 KRW 폴백 제거.

**Architecture:** 단일 유틸리티 함수(`format_currency`) 수정. 통화 코드를 대소문자 무관하게 정규화하고, 지원하지 않는 코드는 `ValueError`로 빠른 실패. 음수 금액은 절댓값으로 포맷 후 부호를 앞에 붙임.

**Tech Stack:** Python, Decimal, pytest

---

## 완료조건

- `format_currency(Decimal("-5000"), "USD")` → `-$5,000`
- `format_currency(Decimal("1000"), "usd")` → `$1,000` (대소문자 무관)
- `format_currency(Decimal("1000"), "EUR")` → `ValueError: Unsupported currency: EUR`
- 기존 테스트 전부 통과
- `cd backend && uv run pytest tests/unit/utils/test_formatting.py -v` 전원 PASS

## 금지사항

- 기존 KRW 음수 동작 변경 금지: `-5,000원` 그대로 유지
- `any` 타입 사용 금지
- 다른 유틸리티 파일 수정 금지 (범위 초과)

## 파일 구조

| 파일 | 변경 |
|------|------|
| `backend/src/snowball/utils/formatting.py` | 수정 |
| `backend/tests/unit/utils/test_formatting.py` | 수정 (테스트 추가) |

---

### Task 1: USD 음수 포맷 + 통화 코드 정규화/검증 버그 수정

**Files:**
- Modify: `backend/src/snowball/utils/formatting.py:6-43`
- Test: `backend/tests/unit/utils/test_formatting.py`

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/unit/utils/test_formatting.py` 파일 끝에 아래 3개 테스트를 추가한다:

```python
def test_format_currency_negative_usd():
    """Test negative USD amount has sign before dollar symbol."""
    # Given
    amount = Decimal("-5000")

    # When
    result = format_currency(amount, "USD")

    # Then
    assert result == "-$5,000"


def test_format_currency_usd_lowercase():
    """Test lowercase currency code is accepted."""
    # Given
    amount = Decimal("1000")

    # When
    result = format_currency(amount, "usd")

    # Then
    assert result == "$1,000"


def test_format_currency_unsupported_currency_raises():
    """Test unsupported currency code raises ValueError."""
    # Given
    amount = Decimal("1000")

    # When / Then
    with pytest.raises(ValueError, match="Unsupported currency: EUR"):
        format_currency(amount, "EUR")
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd backend && uv run pytest tests/unit/utils/test_formatting.py::test_format_currency_negative_usd tests/unit/utils/test_formatting.py::test_format_currency_usd_lowercase tests/unit/utils/test_formatting.py::test_format_currency_unsupported_currency_raises -v
```

Expected: 3개 모두 FAIL

- [ ] **Step 3: 구현 수정**

`backend/src/snowball/utils/formatting.py`를 아래 내용으로 교체한다:

```python
"""Currency formatting utilities."""

from decimal import Decimal, ROUND_HALF_UP

_SUPPORTED_CURRENCIES = ("KRW", "USD")


def format_currency(amount: Decimal, currency: str = "KRW") -> str:
    """
    Format a decimal amount as currency with thousand separators.

    Rounds to integer (원 단위) and adds appropriate currency symbol.

    Args:
        amount: The amount to format (supports Decimal for precision)
        currency: Currency code ("KRW" or "USD", case-insensitive, default: "KRW")

    Returns:
        Formatted currency string with thousand separators and symbol

    Raises:
        ValueError: If currency code is not supported

    Examples:
        >>> format_currency(Decimal("1000000"))
        '1,000,000원'
        >>> format_currency(Decimal("15000.50"))
        '15,001원'
        >>> format_currency(Decimal("1000"), "USD")
        '$1,000'
        >>> format_currency(Decimal("-5000"), "USD")
        '-$5,000'
        >>> format_currency(Decimal("-5000"))
        '-5,000원'

    """
    currency = currency.upper()
    if currency not in _SUPPORTED_CURRENCIES:
        raise ValueError(f"Unsupported currency: {currency}")

    # Round to integer (원 단위)
    rounded = amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    amount_int = int(rounded)

    # Format absolute value with thousand separators, prepend sign
    sign = "-" if amount_int < 0 else ""
    abs_formatted = f"{abs(amount_int):,}"

    if currency == "USD":
        return f"{sign}${abs_formatted}"
    else:  # KRW
        return f"{sign}{abs_formatted}원"
```

- [ ] **Step 4: 전체 테스트 통과 확인**

```bash
cd backend && uv run pytest tests/unit/utils/test_formatting.py -v
```

Expected: 전체 11개 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/src/snowball/utils/formatting.py backend/tests/unit/utils/test_formatting.py
git commit -m "fix(utils): correct USD negative sign position and reject unsupported currencies"
```
