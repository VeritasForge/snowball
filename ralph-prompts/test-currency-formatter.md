# Ralph Loop Test: Currency Formatter

## 목표
todos/001-ready-p1-add-currency-formatter.md 작업을 완료하세요.

## 워크플로우

### 1. 작업 읽기
- `todos/001-ready-p1-add-currency-formatter.md` 읽기
- Acceptance Criteria 확인

### 2. TDD 워크플로우 (RED → GREEN → REFACTOR)

#### RED: 실패하는 테스트 작성
```bash
# 테스트 파일 생성
backend/tests/unit/utils/test_formatting.py

# 테스트 작성 (모두 실패해야 함)
- test_format_currency_basic()
- test_format_currency_with_commas()
- test_format_currency_rounding()
- test_format_currency_usd()
- test_format_currency_negative()
- test_format_currency_zero()
- test_format_currency_large_number()

# 테스트 실행 (실패 확인)
cd backend && uv run pytest tests/unit/utils/test_formatting.py -v
```

#### GREEN: 테스트 통과하는 최소 코드
```bash
# 구현 파일 생성
backend/src/snowball/utils/formatting.py

# 함수 구현
- format_currency(amount: Decimal, currency: str = "KRW") -> str

# 테스트 실행 (통과 확인)
cd backend && uv run pytest tests/unit/utils/test_formatting.py -v
```

#### REFACTOR: 코드 개선
- Docstring 추가
- 타입 힌트 명확화
- 코드 간결화
- 테스트 여전히 통과 확인

### 3. 전체 테스트 실행
```bash
# 기존 테스트가 깨지지 않았는지 확인
cd backend && uv run pytest -v

# 타입 체크
cd backend && uv run mypy src/
```

### 4. Compound 단계 (선택)
완료되면:
- docs/solutions/utils/currency-formatting.md 문서 생성 (선택)
- CLAUDE.md에 패턴 추가 (선택)

## 안전 규칙

### 절대 하지 말 것
- ❌ 기존 테스트 깨뜨리지 마세요
- ❌ Domain 레이어 수정하지 마세요 (Utils 레이어만)
- ❌ Money Value Object 의존하지 마세요
- ❌ 타입 힌트 생략하지 마세요

### 필수 체크
- ✅ 모든 테스트 통과
- ✅ 타입 체크 통과 (mypy)
- ✅ 8개 테스트 케이스 모두 작성
- ✅ Docstring 포함

## 완료 조건

다음 조건을 **모두** 충족하면 <promise>FORMATTER_COMPLETE</promise>를 출력하세요:

- [ ] backend/src/snowball/utils/formatting.py 생성
- [ ] backend/tests/unit/utils/test_formatting.py 생성
- [ ] format_currency() 함수 구현 완료
- [ ] 8개 테스트 케이스 모두 작성
- [ ] 모든 테스트 통과 (cd backend && uv run pytest -v)
- [ ] 타입 체크 통과 (cd backend && uv run mypy src/)
- [ ] Docstring 작성 완료

**중요**: 위 조건이 **모두 TRUE**가 아니면 절대 <promise>를 출력하지 마세요.

완료되지 않았다면:
- 어떤 단계에서 막혔는지 설명
- 다음 반복에서 수정
- 절대 거짓말하지 마세요

---

## 참고
- @.claude/rules/testing.md
- @.claude/rules/coding-style.md
- @docs/solutions/financial/decimal-precision.md (Decimal 사용법)
