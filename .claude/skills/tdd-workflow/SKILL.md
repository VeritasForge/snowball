---
name: tdd-workflow
description: TDD 철학과 Red-Green-Refactor 사이클
---

# TDD Workflow

## 철학

테스트 주도 개발은 "테스트를 먼저 작성한다"가 아니라 **"설계를 테스트로 표현한다"**는 철학입니다.

## Red-Green-Refactor 사이클

### 1. RED (실패하는 테스트)

- 구현하려는 기능의 기대 동작을 테스트로 표현
- 컴파일/실행 가능한 최소한의 테스트
- 테스트가 실패하는 것을 확인

```python
# Given-When-Then 구조
def test_should_create_money_with_positive_amount():
    # Given
    amount = Decimal("1000")

    # When
    money = Money(amount)

    # Then
    assert money.amount == amount
```

### 2. GREEN (최소 구현)

- 테스트를 통과시키는 **가장 간단한** 코드
- "완벽한" 코드가 아닌 "동작하는" 코드
- 하드코딩도 허용 (다음 테스트가 일반화 강제)

### 3. REFACTOR (개선)

- 테스트 통과 상태 유지하며 코드 개선
- 중복 제거, 명확성 향상
- 테스트 코드도 리팩토링 대상

## Given-When-Then 구조

모든 테스트는 다음 구조로 작성:

| 섹션 | 역할 | 예시 |
|------|------|------|
| **Given** | 초기 상태/조건 | 사용자가 로그인한 상태 |
| **When** | 테스트 대상 동작 | 자산 추가 버튼 클릭 |
| **Then** | 기대 결과 | 자산이 목록에 추가됨 |

## 테스트 명명 규칙

```
test_should_[expected_behavior]_when_[condition]
```

예시:
- `test_should_return_error_when_amount_is_negative`
- `test_should_calculate_rebalancing_when_ratio_changed`

## 참조 규칙

- `.claude/rules/testing.md` - 테스트 커버리지 요구사항
- `.claude/rules/snowball-domain.md` - 금융 도메인 규칙
