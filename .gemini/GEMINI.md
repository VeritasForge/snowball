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

## 6. AI 사고 프로세스 (Chain of Thought)
복잡한 문제 해결이나 설계 결정이 필요한 경우, 다음 단계를 거쳐 사고 과정을 명시적으로 기술합니다. 
**특히, 사고를 할 때 반드시 `sequentialthinking` MCP 도구를 사용하여 논리적 흐름을 단계별로 구성하고 스스로 검증해야 합니다.**

1.  **상황 분석**: 현재 요청과 관련된 컨텍스트, 제약 조건, 관련 파일들을 파악합니다.
2.  **전략 수립**: 가능한 해결책들을 나열하고 장단점을 비교하여 최적의 전략을 선택합니다.
3.  **단계별 계획**: 선택한 전략을 실행하기 위한 구체적인 단계(Step-by-step)를 정의합니다.
4.  **검증 및 회고**: 계획이 요구사항을 충족하는지, 누락된 부분은 없는지 검토합니다.

## Progress
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

## Final Features
- **Multi-Account Support**: Manage different investment portfolios.
- **Smart Rebalancing**: Automatic BUY/SELL quantity calculation based on target weights.
- **Automated Data**: Real-time market data fetching and category inference (Stock, Bond, Commodity, etc.).
- **TDD Backed**: Reliable financial calculations verified by unit tests.
- **Modern UI**: Dark-themed, responsive dashboard.

## 실행 방법 요약
1.  DB: `docker-compose up -d`
2.  Backend: `cd backend && uv run uvicorn main:app --reload`
3.  Frontend: `cd frontend && npm install && npm run dev` (npm 권한 에러 시 README 참고)

## Active Technologies
- TypeScript 5.x (Frontend) + `recharts` (New), Next.js 14+ (Existing), Tailwind CSS (Existing) (002-asset-allocation-donut)
- N/A (Visualization of existing state) (002-asset-allocation-donut)

## Recent Changes
- Docs: Consolidated root `GEMINI.md` into `.gemini/GEMINI.md` and updated scripts to reference the single source of truth.
- 002-asset-allocation-donut: Added TypeScript 5.x (Frontend) + `recharts` (New), Next.js 14+ (Existing), Tailwind CSS (Existing)

---
## 🚨 Core Constitution (Must Follow)
@.specify/memory/constitution.md
