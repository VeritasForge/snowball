# 프로젝트 컨텍스트: 스노우볼 (자산배분 대시보드)

@README.md

이 파일은 Claude Code가 이 프로젝트에서 작업할 때 참고하는 AI 전용 컨텍스트입니다.
사용자용 정보(설치, 실행, 주요 기능)는 @README.md를 참조하세요.

---

## 1. 현재 구현 현황 (Current Implementation Context)

### 1.1 Backend (`backend/`)
*   **Domain (`src/snowball/domain`)**:
    *   **Entities**: `Asset` (주식/채권 등 자산 정보), `Portfolio` (계좌 및 자산 집합), `Account` (계좌 정보).
    *   **Value Objects**: `Money`, `Quantity`, `Ratio` (타입 안전성을 위한 VO).
    *   **Services**: `RebalancingService` (리밸런싱 로직 계산 - 순수 비즈니스 로직).

*   **Use Cases (`src/snowball/use_cases`)**:
    *   `CalculatePortfolioUseCase`: 포트폴리오 자산 조회 및 리밸런싱 계산 실행.
    *   `ManageAssetsUseCase`: 자산 추가/수정/삭제.
    *   `ManageAccountsUseCase`: 계좌 생성/수정/삭제.

*   **Adapters (`src/snowball/adapters`)**:
    *   **API**: RESTful API Endpoints (`/api/v1/assets`, `/api/v1/accounts`).
    *   **Persistence**: `SQLModelAssetRepository`, `SQLModelAccountRepository` (DB 접근).
    *   **External Interfaces**: `FinanceDataReader`를 이용한 실시간 주가 조회 어댑터.

### 1.2 Frontend (`frontend/`)
*   **Components (`src/components/`)**:
    *   `DashboardClient`: 메인 대시보드 컨테이너. 데이터 로딩 및 상태 관리.
    *   `AssetTable`: 자산 목록 테이블. CRUD 동작 및 리밸런싱 결과 표시.
    *   `Header`: 네비게이션 및 사용자 정보.
    *   `AddAssetDialog`: 자산 추가 모달.
    *   `NumberFormatInput`: 금액 입력 포맷팅 컴포넌트.
    *   `CategorySelector`: 자산군(주식, 채권 등) 선택 UI.
    *   `DonutChart`: Asset allocation visualization using `recharts`. Shows portfolio breakdown including cash.
    *   `SummarySection`: Portfolio summary statistics (Total, P&L, Invested, Cash) in a responsive grid.

*   **Features**:
    *   **Multi-Account**: 다중 계좌 지원 및 계좌 간 전환.
    *   **Real-time Updates**: 10초 주기로 자산 현재가 자동 갱신.
    *   **Interactive Calculation**: 목표 비중 수정 시 즉시 리밸런싱 수량/금액 재계산.
    *   **Trade Execution**: 매수/매도 버튼 클릭 시 모의 체결(DB 반영) 기능.
    *   **Theme**: Dark Mode Dashboard (Dark Blue/Grey palette with Teal/Purple accents) matching strict visual design.
    *   **Visualization**: Donut chart showing current asset allocation with cash segment.

---

## 2. Claude Code Configuration

### 2.1 Directory Structure
```
.claude/
├── settings.local.json    # 권한, hooks, 모델 설정
├── agents/                # 실행 에이전트 (도구)
│   ├── tdd-developer.md   # ★ 핵심: RED → GREEN → REFACTOR
│   ├── code-reviewer.md   # 코드 품질 검토
│   ├── test-reviewer.md   # 테스트 품질 검토
│   └── security-reviewer.md # 보안 검토
├── commands/              # 슬래시 명령어
│   ├── speckit.*.md       # spec-kit 워크플로우 (9개)
│   ├── tdd.md             # /tdd - 빠른 TDD
│   ├── review.md          # /review - 코드 리뷰
│   ├── test-backend.md    # /test-backend
│   ├── test-frontend.md   # /test-frontend
│   └── build-fix.md       # /build-fix
├── rules/                 # 항상 준수할 규칙
│   ├── security.md        # 보안 규칙
│   ├── coding-style.md    # 코딩 스타일
│   ├── testing.md         # 테스트 규칙
│   ├── git-workflow.md    # Git 워크플로우
│   └── snowball-domain.md # 도메인 규칙
└── skills/                # 지식 레이어 (원칙/철학)
    ├── tdd-workflow/SKILL.md      # TDD 철학
    ├── coding-standards/SKILL.md  # 코딩 규칙
    └── test-writing/SKILL.md      # 테스트 작성 표준
```

### 2.2 Development Agents (실행 도구)

| Agent | 역할 | 실행 방식 |
|-------|------|----------|
| `tdd-developer` | RED → GREEN → REFACTOR 수행 | 순차 (작업별) |
| `code-reviewer` | 코드 품질 검토 | 병렬 (리뷰 시) |
| `test-reviewer` | 테스트 품질 검토 | 병렬 (리뷰 시) |
| `security-reviewer` | 보안 검토 | 병렬 (리뷰 시) |

#### Context 전달 규칙

> **중요**: Subagent는 **zero context**로 시작합니다.
> Main agent의 context가 자동 전달되지 않으므로,
> prompt에 필요한 정보를 명시적으로 전달해야 합니다.

Agent 호출 시 반드시 포함할 정보:
- 작업 대상 파일 경로
- 관련 spec/plan 요약
- 이전 단계 결과 (리뷰어의 경우)

#### TDD Development Loop

```
tdd-developer (개발)
      ↓ 완료
┌─────┼─────┐
↓     ↓     ↓  ← 병렬 실행
code  test  security
      ↓
결과 종합 → PASS? → 완료
      ↓ FAIL
피드백 → tdd-developer로 돌아감
```

### 2.3 Available Commands

#### Spec-Kit Workflow (핵심)
| Command | Description |
|---------|-------------|
| `/speckit.specify` | 기능 명세 작성 |
| `/speckit.clarify` | 명세 명확화 질문 |
| `/speckit.plan` | 기술 계획 수립 |
| `/speckit.tasks` | 작업 분해 |
| `/speckit.implement` | TDD Loop 실행 |
| `/speckit.analyze` | 일관성 분석 |

#### Utility Commands
| Command | Description |
|---------|-------------|
| `/tdd` | 빠른 TDD 워크플로우 |
| `/review` | 코드 리뷰 실행 |
| `/test-backend` | 백엔드 테스트 실행 |
| `/test-frontend` | 프론트엔드 테스트 실행 |
| `/build-fix` | 빌드 오류 진단 및 수정 |
| `/wrap` | 프로젝트 문서 업데이트 (README.md, CLAUDE.md) |
| `/commit` | 작업 마무리 및 커밋/푸시 |

### 2.4 Key Rules (Always Follow)
1. **Security**: 하드코딩된 비밀 금지, 입력 검증 필수
2. **Testing**: 80% 이상 커버리지, TDD 준수
3. **Coding Style**: 불변성 우선, 단일 책임 원칙
4. **Domain**: Decimal 사용, Value Object 래핑

자세한 규칙은 다음 파일들을 참조하세요:
- @.claude/rules/security.md - 보안 규칙
- @.claude/rules/testing.md - 테스트 규칙
- @.claude/rules/coding-style.md - 코딩 스타일
- @.claude/rules/snowball-domain.md - 도메인 규칙

---

## 3. AI 사고 프로세스 (Chain of Thought)
복잡한 문제 해결이나 설계 결정이 필요한 경우, 다음 단계를 거쳐 사고 과정을 명시적으로 기술합니다.
**특히, 사고를 할 때 반드시 `sequentialthinking` MCP 도구를 사용하여 논리적 흐름을 단계별로 구성하고 스스로 검증해야 합니다.**

1.  **상황 분석**: 현재 요청과 관련된 컨텍스트, 제약 조건, 관련 파일들을 파악합니다.
2.  **전략 수립**: 가능한 해결책들을 나열하고 장단점을 비교하여 최적의 전략을 선택합니다.
3.  **단계별 계획**: 선택한 전략을 실행하기 위한 구체적인 단계(Step-by-step)를 정의합니다.
4.  **검증 및 회고**: 계획이 요구사항을 충족하는지, 누락된 부분은 없는지 검토합니다.

---

## 4. Test Protection Protocol

코드 변경 시 기존 테스트 보호를 위한 **필수** 워크플로우입니다. 모든 코드 수정 전/후 반드시 수행해야 합니다.

### 변경 전 (Pre-Change Validation)

1. **테스트 존재 확인**
   - Backend: `backend/tests/` 디렉토리 확인
   - Frontend: `frontend/` 내 테스트 파일 확인

2. **기존 테스트 실행 (베이스라인 확보)**
   ```bash
   # Backend
   cd backend && uv run pytest -v

   # Frontend
   cd frontend && npm test
   ```

3. **통과 상태 확인**
   - 모든 테스트가 PASS인지 확인
   - FAIL이 있다면 먼저 수정 후 진행
   - 베이스라인 테스트 결과 기록

### 변경 후 (Post-Change Validation)

1. **전체 테스트 재실행**
   - 변경 범위와 무관하게 **전체 테스트 스위트** 실행
   - 단위 테스트만이 아닌 통합 테스트도 포함

2. **회귀 감지 (Regression Detection)**
   - 변경 전 PASS → 변경 후 FAIL: **Breaking Change 감지**
   - 새로운 FAIL 발생 시 즉시 다음 단계로

3. **개발자 알림 (Immediate Notification)**

   테스트 실패 시 **작업 중단** 후 다음 정보 제공:

   ```
   ⚠️ TEST FAILURE DETECTED

   Failed Test(s):
   - test_rebalancing_calculates_correct_quantities (backend/tests/test_rebalancing.py:45)

   Failure Reason:
   AssertionError: Expected 5, got 3

   Likely Cause:
   [AI 분석] 리밸런싱 로직에서 현금 비중 계산 방식이 변경되어 기존 테스트 가정이 깨졌습니다.

   ❓ Action Required:
   이 변경이 의도된 동작 변경인가요?
   - YES → 테스트 업데이트 승인 필요
   - NO → 코드 수정 필요
   ```

4. **자동 수정 금지**
   - 개발자 승인 없이 실패한 테스트를 수정/삭제/주석 처리하지 않음
   - "테스트가 너무 엄격하다" 판단하지 않음
   - 테스트가 틀렸다고 가정하지 않음

### Breaking Change 대응

| 상황 | AI 행동 | 개발자 행동 |
|------|---------|------------|
| 기존 테스트 FAIL | ❌ 코드 커밋 중단<br>✅ 개발자에게 보고 | 의도 확인 후 승인/거부 |
| 새 기능, 기존 테스트 PASS | ✅ 진행 가능 | - |
| 테스트 없는 코드 | ❌ TDD 위반 경고<br>✅ 테스트 먼저 작성 요청 | 테스트 작성 지시 |

### TDD 워크플로우와의 통합

Test Protection Protocol은 **기존 TDD 워크플로우를 보완**합니다:

```
[TDD Cycle by tdd-developer.md]
RED → GREEN → REFACTOR
  ↓      ↓        ↓
[Test Protection Protocol]
사전 검증 → 구현 → 사후 검증 (회귀 탐지)
```

- **TDD**: 새 기능 개발 시 테스트 우선 작성
- **Test Protection**: 기존 코드 변경 시 회귀 방지

### 적용 범위

이 프로토콜은 다음 상황에 **필수 적용**됩니다:

- ✅ 기존 함수/클래스 수정
- ✅ 기존 API 엔드포인트 변경
- ✅ Domain 로직 변경 (RebalancingService, Value Objects 등)
- ✅ 리팩토링 (동작 변경 없어야 함 검증)
- ❌ 순수 문서 수정 (*.md)
- ❌ 테스트 파일 자체 작성/수정 (단, 실행은 필요)

### 예외 처리

프로토콜 적용이 어려운 경우:

1. **테스트 환경 미구성**: 개발자에게 알림 후 환경 구성 요청
2. **외부 의존성 실패**: Mock/Stub 사용 또는 통합 테스트 스킵 고려
3. **시간 제약**: 없음. 테스트는 항상 우선순위 1순위

### 참고 문서

- `.claude/rules/testing.md` - 테스트 작성 규칙
- `.claude/agents/tdd-developer.md` - TDD 개발 워크플로우
- `.claude/commands/test-backend.md` - 백엔드 테스트 실행
- `.claude/commands/test-frontend.md` - 프론트엔드 테스트 실행

---

## 5. Recent Changes
- Docs: Applied Best Practice - CLAUDE.md중복 제거 및 @import 패턴 (282줄, 12% 감소)
- Commands: Added `/wrap` (문서 업데이트) and `/commit` (작업 마무리) commands
- Commands: Constitution update workflow with user approval protocol
- Test Protection Protocol: Added pre/post-change test validation workflow
- Claude Code Configuration: Added agents, commands, rules, hooks
- Security Hardening: IDOR Fix in Account Listing

---

## 🚨 Core Constitution (Must Follow)
@.specify/memory/constitution.md
