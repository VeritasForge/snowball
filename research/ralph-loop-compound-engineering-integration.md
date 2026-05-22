# Deep Research: Ralph Loop + Compound Engineering 통합 전략

**조사 일자**: 2026-02-16
**조사 범위**: Ralph Loop와 Compound Engineering을 결합한 밤새 자율 코딩 시스템
**대상 프로젝트**: Snowball (자산배분 대시보드)

---

## Executive Summary

**Ralph Loop**와 **Compound Engineering**을 결합하면 **자가 개선하는 밤샘 자율 개발 시스템**을 구축할 수 있습니다. Every.to팀은 이 방식으로 1인이 5인의 작업을 수행하는 생산성을 달성했습니다.

**핵심 메커니즘**:
- Ralph Loop: 각 반복마다 신선한 컨텍스트로 시작, 완료 시까지 자율 반복
- Compound Engineering: Plan → Work → Review → Compound 워크플로우
- 통합: 각 Ralph 반복에서 Compound 워크플로우 실행, CLAUDE.md에 학습 축적

**예상 효과**:
- 🌙 **밤새 자율 실행**: 잠자는 동안 2-3개 기능 구현
- 🔄 **자가 개선**: 각 반복마다 코드베이스 지식 축적
- 🛡️ **안전 보장**: Docker Sandbox + 타입 체킹 + 테스트로 파괴적 변경 방지
- 📈 **생산성**: 1인이 5인의 작업량 수행 (Every 사례)

---

## 1. 핵심 개념

### 1.1 Ralph Loop란?

**정의**: "각 반복에서 새로운 AI 에이전트 인스턴스를 생성하는 bash 루프"

- **확신도**: [Confirmed]
- **출처**: [Ralph Loop and Compound Engineering | Vinci Rufus](https://www.vincirufus.com/posts/ralph-loop-compound-engineering-future-software-development/)

**핵심 특징**:
```
while (작업 완료되지 않음) {
    1. 최우선 미완료 작업 선택
    2. 단일 작업 구현
    3. 품질 검사 실행 (타입 체크, 테스트)
    4. 검사 통과 시 커밋
    5. 작업 목록 업데이트
    6. 진행 사항 파일 기록
    7. <promise>완료 신호 확인</promise>
}
```

**철학**:
> "컨텍스트 저하(context rot)"를 방지하기 위해 각 반복마다 **신선한 컨텍스트**로 시작

이는 인간 개발자의 집중된 작업 세션을 모방하면서 AI의 연속 작업 능력을 활용합니다.

- **확신도**: [Confirmed]

### 1.2 Compound Engineering와의 결합

**통합 모델**:

```
┌────────────────────────────────────────────────────┐
│            Ralph Loop (외부 제어)                    │
│                                                      │
│  Iteration 1 ──────────────────────────────┐       │
│  ├─ Plan (40%)                             │       │
│  │   └─ docs/plans/ 생성                  │       │
│  ├─ Work (20%)                             │       │
│  │   └─ TDD로 구현                         │       │
│  ├─ Review (40%)                           │       │
│  │   └─ 12개 병렬 리뷰 에이전트           │       │
│  └─ Compound ★                             │       │
│      └─ CLAUDE.md 업데이트                 │       │
│      └─ docs/solutions/ 문서화             │       │
│                         ↓                           │
│  Iteration 2 (신선한 컨텍스트) ───────────┐       │
│  ├─ CLAUDE.md 읽기 (이전 학습 로드)       │       │
│  ├─ Plan (이전 패턴 참조)                 │       │
│  ├─ Work                                   │       │
│  ├─ Review                                 │       │
│  └─ Compound (추가 학습 축적)             │       │
│                         ↓                           │
│  Iteration 3...                                     │
│                                                      │
│  <promise>COMPLETE</promise> 발견 시 종료           │
└────────────────────────────────────────────────────┘
```

- **확신도**: [Confirmed]
- **출처**: [Ralph Loop and Compound Engineering](https://www.vincirufus.com/posts/ralph-loop-compound-engineering-future-software-development/)

**시간 배분** (Compound Engineering):
- Plan: 40%
- Work: 20%
- Review: 40%
- Compound: 시스템 학습 (다음 반복에 적용)

- **확신도**: [Confirmed]

---

## 2. 안전장치 (Safety Mechanisms)

### 2.1 필수 피드백 루프

> "Robust한 피드백 루프 없이는 Ralph Loop가 작동하지 않습니다."

- **확신도**: [Confirmed]
- **출처**: Vinci Rufus 블로그

**4대 안전장치**:

| 안전장치 | 목적 | 구현 |
|---------|------|------|
| **타입 체킹** | 타입 오류 즉시 감지 | `mypy`, `pyright` (Python) / `tsc` (TypeScript) |
| **자동화 테스트** | 구현 검증, 회귀 방지 | `pytest`, `jest` |
| **지속적 통합** | 배포 가능 상태 유지 | 커밋 전 테스트 자동 실행 |
| **브라우저 검증** | 시각적/상호작용 검증 | Playwright (프론트엔드) |

- **확신도**: [Confirmed]

### 2.2 Iteration Limits (필수!)

```bash
# ⚠️ 무한 루프 방지
/rl "프롬프트" --max-iterations 20
```

**권장 설정**:
- 단순 작업 (버그 수정, 리팩토링): 10-20회
- 중간 작업 (기능 추가): 20-50회
- 복잡한 작업 (시스템 전반 변경): 50-100회

**비용 고려**:
> "50회 반복 루프는 중간 크기 코드베이스에서 $50-100+ API 비용 발생"

- **확신도**: [Confirmed]
- **출처**: [Ralph Loop Best Practices | Awesome Claude](https://awesomeclaude.ai/ralph-wiggum)

### 2.3 Docker Sandbox (권장)

**목적**: 파괴적 변경으로부터 호스트 시스템 보호

```bash
# Docker Sandbox 기본 구조
docker run --rm --isolation=hyperv \
  --memory=4g \
  --cpus=2 \
  -v $(pwd):/workspace \
  claude-code-sandbox \
  /rl "프롬프트" --max-iterations 20
```

**보안 메커니즘**:
- ✅ MicroVM 기반 하이퍼바이저 수준 격리
- ✅ 리소스 제한 (CPU, 메모리, 디스크)
- ✅ 네트워크 격리
- ✅ 파일시스템 격리

- **확신도**: [Confirmed]
- **출처**: [Docker Sandboxes for Claude Code](https://www.docker.com/blog/docker-sandboxes-run-claude-code-and-other-coding-agents-unsupervised-but-safely/)

### 2.4 Completion Promise 설계

**원칙**: "에이전트가 거짓말하지 않도록 명확하고 검증 가능한 완료 조건"

**❌ 나쁜 예**:
```
--completion-promise "DONE"
```
→ 너무 모호함, 조기 종료 위험

**✅ 좋은 예**:
```
--completion-promise "ALL_TESTS_PASSING"
--completion-promise "FEATURE_X_COMPLETE_AND_TESTED"
--completion-promise "PHASE_1_COMPLETE"
```
→ 명확하고 검증 가능

- **확신도**: [Confirmed]
- **출처**: [Ralph Loop Completion Promise Pattern](https://awesomeclaude.ai/ralph-wiggum)

---

## 3. Snowball 프로젝트 적용 전략

### 3.1 현재 Snowball 워크플로우

```
User Request
    ↓
/tdd (TDD Workflow)
    └─ RED → GREEN → REFACTOR
    ↓
/review (Code Review)
    └─ 4개 리뷰 에이전트
    ↓
Commit & Push
```

**문제점**:
- ❌ 수동 반복 (사용자가 각 단계 실행)
- ❌ 지식 축적 부족 (Compound 단계 없음)
- ❌ 밤새 자율 실행 불가

### 3.2 Ralph Loop + Compound Engineering 통합

**새로운 워크플로우**:

```
┌──────────────────────────────────────────────────┐
│  Ralph Loop (밤새 자율 실행)                      │
│                                                   │
│  Iteration 1 ─────────────────────┐              │
│  ├─ Plan (/workflows:plan)         │             │
│  │   └─ docs/plans/2026-02-16-*.md│             │
│  ├─ Work (/tdd)                    │             │
│  │   └─ RED → GREEN → REFACTOR     │             │
│  ├─ Review (/workflows:review)     │             │
│  │   └─ 14개 리뷰 에이전트         │             │
│  └─ Compound (/workflows:compound) │             │
│      └─ CLAUDE.md 업데이트         │             │
│      └─ docs/solutions/*.md 생성   │             │
│                       ↓                           │
│  Iteration 2 (다음 작업) ─────────┐             │
│  ├─ CLAUDE.md 읽기 (이전 학습)    │             │
│  ├─ Plan (패턴 재사용)            │             │
│  ├─ Work                           │             │
│  ├─ Review                         │             │
│  └─ Compound                       │             │
│                       ↓                           │
│  <promise>ALL_FEATURES_COMPLETE</promise>        │
└──────────────────────────────────────────────────┘
```

### 3.3 구체적 실행 명령어

**1단계: 준비 (Phase 1 완료 후)**

```bash
# 디렉토리 구조 확인
mkdir -p docs/brainstorms docs/solutions docs/plans todos

# CLAUDE.md 보강 (Ralph Loop 지침 추가)
# → 다음 섹션 참조
```

**2단계: Ralph Loop 프롬프트 설계**

**파일**: `ralph-prompts/overnight-feature-development.md`

```markdown
# 밤샘 자율 개발 프롬프트 (Snowball 프로젝트)

## 목표
todos/ 디렉토리의 모든 작업을 완료하여 Snowball 프로젝트의 다음 기능들을 구현하세요.

## 워크플로우 (각 작업마다 반복)

### 1. Plan 단계 (40%)
- `/workflows:plan` 실행
- docs/plans/YYYY-MM-DD-feature-name.md 생성
- 요구사항, 접근법, 엣지 케이스 명시
- 도메인 패턴 참조 (docs/solutions/)

### 2. Work 단계 (20%)
- `/tdd` 실행
- RED: 실패하는 테스트 작성
- GREEN: 테스트 통과하는 최소 코드
- REFACTOR: 코드 개선 (테스트 유지)

### 3. Review 단계 (40%)
- `/workflows:review` 실행
- 14개 리뷰 에이전트 병렬 실행
- P1 이슈 모두 수정
- P2 이슈 가능한 한 수정

### 4. Compound 단계 ★ 가장 중요
- `/workflows:compound` 실행
- 발견한 패턴 문서화 (docs/solutions/)
- CLAUDE.md 업데이트
- 다음 반복에서 재사용 가능하도록 정리

## 안전 규칙 (절대 위반하지 말 것)

### 하지 말 것
- ❌ 테스트 통과하지 않으면 커밋하지 마세요
- ❌ CLAUDE.md의 도메인 규칙 위반하지 마세요
- ❌ 하드코딩된 비밀 (API 키, 패스워드) 절대 금지
- ❌ `git push --force` 절대 금지
- ❌ 데이터베이스 삭제 명령 실행 금지

### 필수 체크
- ✅ 모든 테스트 통과 확인
- ✅ 타입 체크 통과 확인 (`mypy backend/`, `npx tsc --noEmit`)
- ✅ 린트 통과 확인
- ✅ Clean Architecture 레이어 준수 확인

## 진행 상황 추적

각 작업 완료 후:
```yaml
# .ralph-loop/progress.yaml
completed_tasks:
  - id: 001
    feature: "Add multi-currency support"
    status: "DONE"
    tests_passing: true
    commit: "abc123"

  - id: 002
    feature: "Implement rebalancing with fees"
    status: "IN_PROGRESS"
    blocked_by: null
```

## 완료 조건

다음 조건을 **모두** 충족하면 <promise>ALL_FEATURES_COMPLETE</promise>를 출력하세요:

- [ ] todos/ 디렉토리의 모든 작업 완료
- [ ] 모든 테스트 통과 (backend: 80%+, frontend: 70%+)
- [ ] 모든 타입 체크 통과
- [ ] 모든 린트 통과
- [ ] 각 기능에 대한 솔루션 문서 작성 (docs/solutions/)
- [ ] CLAUDE.md 업데이트 완료

**중요**: 위 조건이 모두 TRUE가 아니면 절대 promise를 출력하지 마세요.
거짓말하지 마세요. 완료되지 않았다면 다음 반복을 계속하세요.

---

## 참고 자료

- Snowball 도메인 규칙: @.claude/rules/snowball-domain.md
- 테스트 규칙: @.claude/rules/testing.md
- 보안 규칙: @.claude/rules/security.md
- TDD 워크플로우: @.claude/skills/tdd-workflow/SKILL.md
```

**3단계: Ralph Loop 실행**

```bash
# 밤에 실행 (잠자기 전)
/rl "$(cat ralph-prompts/overnight-feature-development.md)" \
  --max-iterations 30 \
  --completion-promise "ALL_FEATURES_COMPLETE"
```

**4단계: 모니터링 (선택)**

```bash
# 별도 터미널에서 진행 상황 모니터링
watch -n 10 'head -20 .claude/ralph-loop.local.md'

# 또는 로그 파일로 출력
tail -f .claude/ralph-loop.log
```

### 3.4 CLAUDE.md 보강

**추가할 섹션**:

```markdown
## Ralph Loop 지침

### 자율 실행 모드

이 프로젝트는 Ralph Loop를 사용한 밤새 자율 개발을 지원합니다.

**각 Ralph 반복 시작 시**:
1. 이 CLAUDE.md 파일을 읽고 누적된 지식 로드
2. docs/solutions/ 디렉토리의 패턴 참조
3. todos/ 디렉토리에서 다음 작업 선택

**각 Ralph 반복 종료 시**:
1. `/workflows:compound` 실행
2. 새로운 패턴을 docs/solutions/에 문서화
3. 이 CLAUDE.md 파일 업데이트 (새 패턴, 주의사항 추가)

### 누적된 패턴 (Compounded Knowledge)

#### 금융 계산 패턴
- Decimal 정밀도: @docs/solutions/financial/decimal-precision.md
- 비중 검증: @docs/solutions/financial/ratio-validation.md
- 리밸런싱: @docs/solutions/financial/rebalancing-algorithm.md

#### 도메인 패턴
- Value Object 설계: @docs/solutions/domain/value-object-design.md
- Entity 검증: @docs/solutions/domain/entity-validation.md

#### 테스트 전략
- 금융 테스트: @docs/solutions/testing/financial-test-strategy.md
- 엣지 케이스: @docs/solutions/testing/edge-case-checklist.md

### 완료 신호

모든 작업이 완료되면 다음을 출력:
```
<promise>ALL_FEATURES_COMPLETE</promise>
```

**완료 조건**:
- [ ] 모든 테스트 통과
- [ ] 모든 타입 체크 통과
- [ ] 솔루션 문서 작성 완료
- [ ] CLAUDE.md 업데이트 완료
```

---

## 4. 작업 크기 최적화

### 4.1 적절한 작업 단위

**원칙**: "각 작업은 단일 컨텍스트 윈도우 내에서 완료 가능해야"

- **확신도**: [Confirmed]
- **출처**: Vinci Rufus 블로그

**✅ 적절한 크기** (Snowball 예시):

```yaml
# todos/001-ready-p1-add-transaction-fee.md
---
priority: P1
status: ready
estimated_tokens: 8000
---

# Add Transaction Fee Calculation

## Description
리밸런싱 시 거래 수수료를 고려한 최적 매매 수량 계산

## Acceptance Criteria
- [ ] RebalancingService에 fee_rate 파라미터 추가
- [ ] 수수료를 고려한 trade_quantity 계산
- [ ] 테스트: 수수료 0%, 0.1%, 1% 시나리오
- [ ] docs/solutions/financial/transaction-fees.md 문서화

## Constraints
- Domain 레이어만 수정 (Use Cases는 변경 없음)
- 기존 테스트 모두 통과 유지
```

**❌ 너무 큰 작업** (분할 필요):

```yaml
# BAD: 전체 대시보드 구축
# → 10-20개 작은 작업으로 분할

# BAD: 인증 시스템 추가
# → 5-10개 작은 작업으로 분할
```

### 4.2 작업 의존성 관리

```yaml
# todos/002-blocked-p1-display-fees.md
---
priority: P1
status: blocked
blocked_by: [001]  # transaction-fee 구현 완료 후 진행
---

# Display Transaction Fees in UI

## Description
Asset Table에 예상 거래 수수료 표시

## Dependencies
- 001-add-transaction-fee (완료 필요)

## Acceptance Criteria
...
```

---

## 5. 모니터링 및 알림

### 5.1 진행 상황 추적

**파일**: `.ralph-loop/progress.yaml`

```yaml
session:
  started_at: "2026-02-16T22:00:00Z"
  max_iterations: 30
  current_iteration: 5

completed_tasks:
  - id: 001
    feature: "Add transaction fee calculation"
    completed_at: "2026-02-16T22:45:00Z"
    tests_passing: true
    commit: "abc123"
    compound_docs:
      - "docs/solutions/financial/transaction-fees.md"

  - id: 002
    feature: "Display fees in UI"
    completed_at: "2026-02-16T23:30:00Z"
    tests_passing: true
    commit: "def456"

current_task:
  id: 003
  feature: "Add fee calculation to backend API"
  started_at: "2026-02-16T23:31:00Z"
  status: "IN_PROGRESS"
```

### 5.2 에러 알림 (Slack/이메일)

**Slack Webhook 설정**:

```bash
# .claude/hooks/error-notification.sh
#!/bin/bash

ERROR_MESSAGE="$1"
ITERATION="$2"

curl -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d "{
    \"text\": \"🚨 Ralph Loop Error\",
    \"attachments\": [{
      \"color\": \"danger\",
      \"fields\": [
        {\"title\": \"Iteration\", \"value\": \"$ITERATION\", \"short\": true},
        {\"title\": \"Error\", \"value\": \"$ERROR_MESSAGE\", \"short\": false}
      ]
    }]
  }"
```

### 5.3 완료 알림

```bash
# .claude/hooks/completion-notification.sh
#!/bin/bash

COMPLETED_TASKS="$1"

curl -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d "{
    \"text\": \"✅ Ralph Loop Completed!\",
    \"attachments\": [{
      \"color\": \"good\",
      \"fields\": [
        {\"title\": \"Completed Tasks\", \"value\": \"$COMPLETED_TASKS\", \"short\": false}
      ]
    }]
  }"
```

---

## 6. 비용 최적화

### 6.1 비용 추정

**API 사용량**:
- Claude Sonnet 4.5: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- 평균 반복당: 50K input + 20K output tokens
- 비용 = (50K × $3 + 20K × $15) / 1M = **$0.45/반복**

**밤새 실행 (30회 반복)**:
- 총 비용: $0.45 × 30 = **$13.50**

**최적화 전략**:
1. 작업을 작게 분할 (반복당 토큰 감소)
2. Completion promise로 조기 종료
3. Haiku 모델 사용 (간단한 작업)

- **확신도**: [Likely]
- **근거**: Ralph Loop 베스트 프랙티스 문서

### 6.2 Haiku vs Sonnet 전략

```yaml
# ralph-config.yaml
tasks:
  - id: "simple-refactoring"
    model: "haiku"  # 저렴하고 빠름
    estimated_cost: "$0.05/iteration"

  - id: "complex-algorithm"
    model: "sonnet"  # 정확도 우선
    estimated_cost: "$0.45/iteration"

  - id: "critical-security"
    model: "opus"  # 최고 품질
    estimated_cost: "$2.00/iteration"
```

---

## 7. Edge Cases & Caveats

### 7.1 Ralph Loop 한계

**❌ 적합하지 않은 경우**:

| 시나리오 | 이유 |
|---------|------|
| **불명확한 요구사항** | 에이전트가 방향을 잃고 무의미한 코드 생성 |
| **창의적 설계** | 명확한 정답이 없는 경우 반복이 비효율적 |
| **인간 판단 필요** | 트레이드오프 결정, 비즈니스 로직 선택 |
| **레거시 코드** | 컨텍스트 부족으로 깨뜨릴 위험 높음 |

**✅ 적합한 경우**:

| 시나리오 | 이유 |
|---------|------|
| **명확한 PRD** | 검증 가능한 완료 조건 |
| **TDD 워크플로우** | 테스트가 안전망 역할 |
| **반복적 작업** | 패턴이 명확한 CRUD, API 엔드포인트 |
| **리팩토링** | 테스트 유지하며 구조 개선 |

- **확신도**: [Likely]

### 7.2 실패 시나리오

**시나리오 1: 무한 루프 (테스트 실패 반복)**

```
Iteration 1: 테스트 작성 → 실패
Iteration 2: 코드 수정 → 여전히 실패
Iteration 3: 다른 방식 시도 → 여전히 실패
...
Iteration 20: --max-iterations 도달 → 종료
```

**대응책**:
- 명확한 에러 메시지 제공 (테스트에 assert 메시지)
- 작업을 더 작게 분할
- 첫 반복에 디버깅 정보 추가

**시나리오 2: 컨텍스트 부족 (레거시 코드)**

```
Iteration 1: 코드 수정 → 다른 부분 깨짐
Iteration 2: 깨진 부분 수정 → 또 다른 부분 깨짐
...
```

**대응책**:
- CLAUDE.md에 코드베이스 맵 추가
- 영향 분석을 Plan 단계에 포함
- 통합 테스트 강화

- **확신도**: [Likely]

### 7.3 보안 주의사항

**경고**: Docker Sandbox 없이 `--dangerously-skip-permissions` 사용 시 위험!

**2026년 보안 이슈**:
- Claude Desktop Extensions 제로클릭 RCE 취약점 (CVSS 10/10)
- 악의적 캘린더 이벤트로 시스템 침해 가능

**권장 사항**:
1. ✅ 항상 Docker Sandbox 사용
2. ✅ Git 워크트리로 격리
3. ✅ 민감한 데이터는 별도 환경
4. ✅ 정기적인 백업

- **확신도**: [Confirmed]
- **출처**: [Claude Desktop Extensions RCE | LayerX](https://layerxsecurity.com/blog/claude-desktop-extensions-rce/)

---

## 8. 실전 예시: Snowball 밤샘 개발

### 8.1 시나리오

**목표**: "다중 통화 지원" 기능을 밤새 자율 개발

**작업 목록**:
```yaml
todos/
  ├── 001-ready-p1-add-currency-to-money.md
  ├── 002-ready-p1-currency-exchange-service.md
  ├── 003-ready-p2-multi-currency-portfolio.md
  └── 004-ready-p2-currency-selector-ui.md
```

### 8.2 프롬프트

```markdown
# 다중 통화 지원 기능 구현 (Snowball)

## 목표
todos/ 디렉토리의 001-004번 작업을 완료하여 Snowball에 다중 통화 지원 추가

## 워크플로우

각 작업마다 다음 단계 반복:

### 1. Plan (/workflows:plan)
- 작업 PRD 읽기 (todos/*.md)
- 도메인 패턴 참조 (docs/solutions/domain/*.md)
- 상세 계획 작성 (docs/plans/YYYY-MM-DD-*.md)

### 2. Work (/tdd)
- RED: 실패하는 테스트 작성
- GREEN: 최소 구현
- REFACTOR: 코드 개선

### 3. Review (/workflows:review)
- 14개 리뷰 에이전트 실행
- P1 이슈 모두 수정

### 4. Compound (/workflows:compound)
- 패턴 문서화 (docs/solutions/financial/multi-currency.md)
- CLAUDE.md 업데이트

## 안전 규칙

### 하지 말 것
- ❌ 기존 테스트 깨뜨리지 마세요
- ❌ Money Value Object의 불변성 위반하지 마세요
- ❌ Decimal 대신 float 사용 금지

### 필수 체크
- ✅ 모든 테스트 통과 (80%+ 커버리지)
- ✅ 타입 체크 통과 (mypy, tsc)
- ✅ Clean Architecture 레이어 준수

## 완료 조건

다음 조건을 **모두** 충족하면 <promise>MULTI_CURRENCY_COMPLETE</promise> 출력:

- [ ] 001-004번 작업 모두 완료
- [ ] 모든 테스트 통과
- [ ] docs/solutions/financial/multi-currency.md 작성 완료
- [ ] CLAUDE.md에 다중 통화 패턴 추가

완료되지 않았다면 절대 promise를 출력하지 마세요.
```

### 8.3 실행

```bash
# 오후 10시 (잠자기 전)
/rl "$(cat ralph-prompts/multi-currency-feature.md)" \
  --max-iterations 25 \
  --completion-promise "MULTI_CURRENCY_COMPLETE"

# 예상 소요 시간: 6-8시간
# 예상 비용: $11-13
```

### 8.4 아침 확인

```bash
# 오전 7시 (일어나서)
# 1. 진행 상황 확인
cat .ralph-loop/progress.yaml

# 2. 완료된 커밋 확인
git log --oneline --since="last night"

# 3. 테스트 실행
cd backend && uv run pytest -v
cd frontend && npm test

# 4. 솔루션 문서 확인
ls docs/solutions/financial/

# 5. CLAUDE.md 변경사항 확인
git diff HEAD~4 CLAUDE.md
```

**예상 결과**:
```
✅ 4개 작업 완료
✅ 12개 커밋
✅ 모든 테스트 통과
✅ 3개 솔루션 문서 생성
✅ CLAUDE.md 업데이트
```

---

## 9. 베스트 프랙티스 요약

### 9.1 프롬프트 설계

| 원칙 | 설명 | 예시 |
|------|------|------|
| **명확한 완료 조건** | 검증 가능한 체크리스트 | "모든 테스트 통과" ✅ |
| **안전 규칙 명시** | 하지 말 것 목록 | "git push --force 금지" |
| **워크플로우 명시** | 각 단계 설명 | Plan → Work → Review → Compound |
| **컨텍스트 제공** | 참조 문서 링크 | "@docs/solutions/*.md" |
| **Compound 강조** | 학습 축적 필수 | "/workflows:compound 실행" |

- **확신도**: [Confirmed]

### 9.2 작업 분해

**MEOW 원칙** (Molecular Expression of Work):
- 각 작업은 1-2시간 내 완료 가능
- 단일 컨텍스트 윈도우 내 처리
- 명확한 입력/출력
- 테스트 가능

- **확신도**: [Confirmed]
- **출처**: Vinci Rufus 블로그 (Gas Town 개념)

### 9.3 반복 제한

| 작업 복잡도 | 권장 반복 | 예상 시간 | 예상 비용 |
|-------------|----------|----------|----------|
| 단순 (버그 수정) | 5-10 | 1-2시간 | $2-5 |
| 중간 (기능 추가) | 15-25 | 3-6시간 | $7-12 |
| 복잡 (시스템 변경) | 30-50 | 6-12시간 | $14-23 |

- **확신도**: [Likely]

### 9.4 모니터링

**필수 모니터링 항목**:
1. 현재 반복 번호
2. 완료된 작업 수
3. 테스트 통과율
4. 생성된 솔루션 문서 수
5. API 비용 누적

**알림 설정**:
- 에러 발생 시 즉시 알림
- 50% 진행 시 중간 보고
- 완료 시 요약 알림

- **확신도**: [Likely]

---

## 10. Sources

### 1차 자료
1. [Ralph Loop and Compound Engineering | Vinci Rufus](https://www.vincirufus.com/posts/ralph-loop-compound-engineering-future-software-development/) — 통합 가이드
2. [Ralph Loop Best Practices | Awesome Claude](https://awesomeclaude.ai/ralph-wiggum) — Completion Promise 패턴

### 공식 문서
3. [Ralph Loop Implementation | GitHub](https://github.com/snarktank/ralph) — Ralph 오픈소스 구현
4. [Claude Code Security | Official Docs](https://code.claude.com/docs/en/security) — 보안 가이드

### 기술 블로그
5. [Compound Engineering: Plan → Work → Review → Compound | Dev Genius](https://blog.devgenius.io/claude-code-the-proven-plan-work-review-compound-method-cbf07c24ae85) — 워크플로우 상세
6. [Learning from Every's Compound Engineering | Irrational Exuberance](https://lethain.com/everyinc-compound-engineering/) — Every 사례 분석
7. [Running Claude Code 24/7 | How Do I Use AI](https://www.howdoiuseai.com/blog/2026-02-13-running-claude-code-24-7-gives-you-an-autonomous-c) — 무인 실행 가이드

### 도구 및 안전
8. [Docker Sandboxes for Claude Code | Docker Blog](https://www.docker.com/blog/docker-sandboxes-run-claude-code-and-other-coding-agents-unsupervised-but-safely/) — 안전한 샌드박스
9. [Claude Code Safety Net Plugin | GitHub](https://github.com/kenryu42/claude-code-safety-net) — 파괴적 명령 차단
10. [Claude Desktop Extensions RCE Vulnerability | LayerX](https://layerxsecurity.com/blog/claude-desktop-extensions-rce/) — 2026 보안 경고

### 추가 참고
11. [From ReAct to Ralph Loop | Alibaba Cloud](https://www.alibabacloud.com/blog/from-react-to-ralph-loop-a-continuous-iteration-paradigm-for-ai-agents_602799) — AI 에이전트 패러다임
12. [Ralph Loop Implementation | Vercel Labs](https://github.com/vercel-labs/ralph-loop-agent) — AI SDK 통합

---

## 11. Research Metadata

- **검색 쿼리 수**: 7 (일반 5 + SNS 2)
- **수집 출처 수**: 12
- **출처 유형 분포**:
  - 1차 자료: 1
  - 공식 문서: 2
  - 기술 블로그: 4
  - 도구 문서: 2
  - 보안 경고: 1
  - 추가 참고: 2
- **확신도 분포**:
  - Confirmed: 대부분 (핵심 메커니즘, 안전장치, 워크플로우)
  - Likely: 일부 (비용 추정, 실패 시나리오)
  - Uncertain: 없음
  - Unverified: 없음
- **SNS 출처**: Reddit 0건 (검색 실패)
- **SNS 접근 방법**: "WebSearch site: operator"

---

## 결론

Ralph Loop와 Compound Engineering을 결합하면 **밤새 자율로 작동하는 자가 개선 개발 시스템**을 구축할 수 있습니다.

**핵심 성공 요소**:
1. ✅ **명확한 PRD**: 검증 가능한 완료 조건
2. ✅ **강력한 테스트**: 안전망 역할
3. ✅ **Compound 단계**: 학습 축적 (가장 중요!)
4. ✅ **안전장치**: Docker Sandbox + Iteration Limits
5. ✅ **모니터링**: 에러 알림 + 진행 상황 추적

**Snowball 프로젝트 적용**:
- Phase 1 완료 후 즉시 적용 가능
- 예상 효과: 밤새 2-3개 기능 구현
- 투자: 프롬프트 설계 2-3시간, API 비용 $10-20/밤
- 회수: 첫 주부터 생산성 2-3배

**다음 단계**:
1. Phase 1 완료 (Compound Engineering 플러그인 설치)
2. Ralph 프롬프트 템플릿 작성
3. 첫 기능으로 시험 (작은 작업)
4. 점진적 확대 (복잡한 작업)

**Let's Compound Overnight! 🌙**
