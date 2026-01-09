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

*   **Features**:
    *   **Multi-Account**: 다중 계좌 지원 및 계좌 간 전환.
    *   **Real-time Updates**: 10초 주기로 자산 현재가 자동 갱신.
    *   **Interactive Calculation**: 목표 비중 수정 시 즉시 리밸런싱 수량/금액 재계산.
    *   **Trade Execution**: 매수/매도 버튼 클릭 시 모의 체결(DB 반영) 기능.
    *   **Theme**: Dark Mode Dashboard (Dark Blue/Grey palette with Teal/Purple accents) matching strict visual design.

## Progress
-   [x] Project Initialization
-   [x] Frontend Setup (UI Refactored with Lucide Icons)
-   [x] Backend Setup (API & DB Refactored)
-   [x] TDD Environment Setup & Test Coverage (Backend tests passing)
-   [x] Real-time Price Integration (FinanceDataReader polling every 10s)
-   [x] Asset Intelligence (Auto name/price/category lookup)
-   [x] Database Integration (PostgreSQL via Docker)
-   [x] UI Theme Overhaul (Dark Mode Implementation)

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

---
## 🚨 Core Constitution (Must Follow)
@.specify/memory/constitution.md
