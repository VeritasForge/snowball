# Snowball Constitution
<!-- 자산배분 대시보드 프로젝트 헌법 -->

## Core Principles

### I. Test-Driven Development (NON-NEGOTIABLE)

TDD는 **"테스트를 먼저 작성한다"**가 아니라 **"설계를 테스트로 표현한다"**는 철학입니다.

- RED → GREEN → REFACTOR 사이클 필수
- 테스트 커버리지 80% 이상 유지
- Critical 영역(RebalancingService, Value Objects) 100% 커버리지

**Skills Reference**: `.claude/skills/tdd-workflow/SKILL.md`

### II. Clean Architecture

의존성은 항상 **안쪽으로만** 향합니다.

```
Domain ← Use Cases ← Adapters ← Infrastructure
```

| 계층 | 허용 | 금지 |
|------|------|------|
| Domain | 순수 Python, dataclass | FastAPI, SQLModel, Pydantic |
| Use Cases | Domain 참조 | 직접 DB 접근, HTTP 호출 |
| Adapters | Use Cases, Domain 참조 | Infrastructure 세부사항 |
| Infrastructure | 모든 계층 참조 | - |

**Skills Reference**: `.claude/skills/coding-standards/SKILL.md`

### III. Financial Calculation Integrity

금융 계산의 정확성은 타협할 수 없습니다.

- **Decimal 필수**: `float` 사용 절대 금지
- **Value Objects**: Money, Quantity, Ratio로 래핑
- **경계값 테스트**: 0, 음수, 매우 큰 수, 소수점 정밀도

```python
# ✅ 올바른 예
from decimal import Decimal
money = Money(Decimal("1000.50"))

# ❌ 금지
money = Money(1000.50)  # float 사용 금지
```

### IV. Test Quality Standards

테스트는 코드만큼 중요합니다.

| 계층 | 최소 커버리지 | 목표 |
|------|--------------|------|
| Domain (Entity, VO) | 90% | 100% |
| Use Cases | 85% | 95% |
| Adapters (API, Repo) | 80% | 90% |
| Frontend Components | 70% | 85% |
| **전체** | **80%** | **90%** |

**Skills Reference**: `.claude/skills/test-writing/SKILL.md`

### V. Security First

보안은 기능보다 우선합니다.

- 하드코딩된 비밀 금지 (API 키, 비밀번호, 토큰)
- 모든 사용자 입력 검증
- SQL 인젝션 방지 (파라미터화된 쿼리)
- XSS 방지 (HTML 이스케이프)
- 사용자별 데이터 격리 (account_id 검증)

## Development Workflow

### Spec-Kit 중심 개발

1. `/speckit.specify` → 기능 명세
2. `/speckit.plan` → 기술 계획
3. `/speckit.tasks` → 작업 분해
4. `/speckit.implement` → TDD Loop 실행

### TDD Loop (Implementation Phase)

```
tdd-developer (RED → GREEN → REFACTOR)
      ↓
┌─────┼─────┐
↓     ↓     ↓  ← 병렬 실행
code  test  security
reviewer   reviewer
      ↓
결과 종합 → PASS? → 완료
```

## Governance

- 헌법은 모든 다른 관행보다 우선합니다
- 수정은 문서화, 승인, 마이그레이션 계획이 필요합니다
- 모든 PR/리뷰는 헌법 준수를 검증해야 합니다
- 복잡성은 정당화되어야 합니다

**Version**: 1.0.0 | **Ratified**: 2026-01-23 | **Last Amended**: 2026-01-23
