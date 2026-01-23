# 프로젝트 컨텍스트: 스노우볼 (자산배분 대시보드)

## 1. 프로젝트 개요
투자 포트폴리오를 관리하고, 설정한 목표 비중에 따라 리밸런싱이 필요한 매수/매도 수량과 금액을 계산해주는 웹 기반 대시보드입니다.

## 2. 핵심 기능
1.  **자산 관리**: 자산명과 목표 비중(%) 등록 및 수정.
    *   예: 미국주식 TIGER S&P500: 20.0%
2.  **포트폴리오 현황**: 각 자산의 현재가, 보유 수량 및 예수금 입력.
3.  **리밸런싱 계산기**:
    *   총 자산 = (각 자산 평가금액 합계) + 예수금.
    *   자산별 목표 금액 = 총 자산 * 목표 비중.
    *   매매 가이드: (목표 금액 - 현재 평가액)을 계산하여 매수/매도 필요 금액 및 수량 제시.

## 3. 현재 구현 현황 (Current Implementation Context)

### 3.1 Backend (`backend/`)
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

### 3.2 Frontend (`frontend/`)
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

## 4. Claude Code Configuration

### 4.1 Directory Structure
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

### 4.2 Development Agents (실행 도구)

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

### 4.3 Available Commands

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

### 4.4 Key Rules (Always Follow)
1. **Security**: 하드코딩된 비밀 금지, 입력 검증 필수
2. **Testing**: 80% 이상 커버리지, TDD 준수
3. **Coding Style**: 불변성 우선, 단일 책임 원칙
4. **Domain**: Decimal 사용, Value Object 래핑

---

## 5. AI 사고 프로세스 (Chain of Thought)
복잡한 문제 해결이나 설계 결정이 필요한 경우, 다음 단계를 거쳐 사고 과정을 명시적으로 기술합니다.
**특히, 사고를 할 때 반드시 `sequentialthinking` MCP 도구를 사용하여 논리적 흐름을 단계별로 구성하고 스스로 검증해야 합니다.**

1.  **상황 분석**: 현재 요청과 관련된 컨텍스트, 제약 조건, 관련 파일들을 파악합니다.
2.  **전략 수립**: 가능한 해결책들을 나열하고 장단점을 비교하여 최적의 전략을 선택합니다.
3.  **단계별 계획**: 선택한 전략을 실행하기 위한 구체적인 단계(Step-by-step)를 정의합니다.
4.  **검증 및 회고**: 계획이 요구사항을 충족하는지, 누락된 부분은 없는지 검토합니다.

---

## 6. Progress
-   [x] Project Initialization
-   [x] Frontend Setup (UI Refactored with Lucide Icons)
-   [x] Backend Setup (API & DB Refactored)
-   [x] TDD Environment Setup & Test Coverage (Backend tests passing)
-   [x] Real-time Price Integration (FinanceDataReader polling every 10s)
-   [x] Asset Intelligence (Auto name/price/category lookup)
-   [x] Database Integration (PostgreSQL via Docker)
-   [x] UI Theme Overhaul (Dark Mode Implementation)
-   [x] Asset Allocation Visualization (Donut Chart with Recharts)
-   [x] Constitution Update: AI Interaction Protocols (v1.4.0)
-   [x] Security Hardening (IDOR Fix in Account Listing)
-   [x] Security Hardening (Mutation Endpoints Authorization)
-   [x] Claude Code Configuration (Agents, Commands, Rules, Hooks)

## 7. Final Features
- **Multi-Account Support**: Manage different investment portfolios.
- **Smart Rebalancing**: Automatic BUY/SELL quantity calculation based on target weights.
- **Automated Data**: Real-time market data fetching and category inference (Stock, Bond, Commodity, etc.).
- **TDD Backed**: Reliable financial calculations verified by unit tests.
- **Modern UI**: Dark-themed, responsive dashboard.

---

## 8. 실행 방법 요약
```bash
# 1. Database
docker-compose up -d

# 2. Backend
cd backend && uv run uvicorn main:app --reload

# 3. Frontend
cd frontend && npm install && npm run dev
```

## 9. Active Technologies
- **Backend**: Python 3.12+, FastAPI, SQLModel, PostgreSQL, uv
- **Frontend**: TypeScript 5.x, Next.js 14+, Tailwind CSS, Recharts, Lucide

## 10. Recent Changes
- Security Hardening: Enforced ownership checks on all account and asset mutation endpoints to prevent IDOR/Unauthorized access.
- Claude Code Configuration: Added agents, commands, rules, hooks
- Docs: Consolidated root `GEMINI.md` into `.gemini/GEMINI.md`

---

## 🚨 Core Constitution (Must Follow)
@.specify/memory/constitution.md
