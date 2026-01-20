# Project Context: Snowball (Asset Allocation Dashboard)

## 1. Project Overview
A web-based dashboard that manages investment portfolios and calculates buy/sell quantities and amounts required for rebalancing based on target weights.

## 2. Core Features
1.  **Asset Management**: Register and modify asset names and target weights (%).
    *   e.g., US Stock TIGER S&P500: 20.0%
2.  **Portfolio Status**: Input current price, quantity, and deposit for each asset.
3.  **Rebalancing Calculator**:
    *   Total Assets = (Sum of Asset Values) + Deposit.
    *   Target Amount per Asset = Total Assets * Target Weight.
    *   Trading Guide: Suggests required buy/sell amounts and quantities by calculating (Target Amount - Current Value).

## 3. Current Implementation Status

### 3.1 Backend (`backend/`)
*   **Domain (`src/snowball/domain`)**:
    *   **Entities**: `Asset` (Asset info like Stock/Bond), `Portfolio` (Account and Asset set), `Account` (Account info).
    *   **Value Objects**: `Money`, `Quantity`, `Ratio` (VO for type safety).
    *   **Services**: `RebalancingService` (Rebalancing logic calculation - Pure business logic).

*   **Use Cases (`src/snowball/use_cases`)**:
    *   `CalculatePortfolioUseCase`: Retrieve portfolio assets and execute rebalancing calculation.
    *   `ManageAssetsUseCase`: Add/Modify/Delete assets.
    *   `ManageAccountsUseCase`: Create/Modify/Delete accounts.

*   **Adapters (`src/snowball/adapters`)**:
    *   **API**: RESTful API Endpoints (`/api/v1/assets`, `/api/v1/accounts`).
    *   **Persistence**: `SQLModelAssetRepository`, `SQLModelAccountRepository` (DB Access).
    *   **External Interfaces**: Real-time price lookup adapter using `FinanceDataReader`.

### 3.2 Frontend (`frontend/`)
*   **Components (`src/components/`)**:
    *   `DashboardClient`: Main dashboard container. Data loading and state management.
    *   `AssetTable`: Asset list table. CRUD operations and rebalancing result display.
    *   `Header`: Navigation and user info.
    *   `AddAssetDialog`: Add asset modal.
    *   `NumberFormatInput`: Amount input formatting component.
    *   `CategorySelector`: Asset category (Stock, Bond, etc.) selection UI.
    *   `DonutChart`: Asset allocation visualization using `recharts`. Shows portfolio breakdown including cash.
    *   `SummarySection`: Portfolio summary statistics (Total, P&L, Invested, Cash) in a responsive grid.

*   **Features**:
    *   **Multi-Account**: Multi-account support and switching.
    *   **Real-time Updates**: Auto-refresh asset current prices every 10 seconds.
    *   **Interactive Calculation**: Immediately recalculate rebalancing qty/amount when target weight changes.
    *   **Trade Execution**: Simulated execution (DB update) when Buy/Sell button is clicked.
    *   **Theme**: Dark Mode Dashboard (Dark Blue/Grey palette with Teal/Purple accents) matching strict visual design.
    *   **Visualization**: Donut chart showing current asset allocation with cash segment.

## 6. AI Chain of Thought
When complex problem solving or design decisions are needed, explicitly describe the thought process through the following steps.
**Especially, you must use the `sequentialthinking` MCP tool to organize the logical flow step-by-step and verify it yourself.**

1.  **Situation Analysis**: Identify context, constraints, and related files for the current request.
2.  **Strategy Formulation**: List possible solutions and compare pros/cons to select the best strategy.
3.  **Step-by-step Plan**: Define specific steps to execute the selected strategy.
4.  **Verification & Reflection**: Review if the plan meets requirements and if anything is missing.

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

## Execution Summary
1.  DB: `docker-compose up -d`
2.  Backend: `cd backend && uv run uvicorn main:app --reload`
3.  Frontend: `cd frontend && npm install && npm run dev` (Refer to README for npm permission errors)

## Active Technologies
- TypeScript 5.x (Frontend) + `recharts` (New), Next.js 14+ (Existing), Tailwind CSS (Existing) (002-asset-allocation-donut)
- N/A (Visualization of existing state) (002-asset-allocation-donut)

## Recent Changes
- Docs: Consolidated root `GEMINI.md` into `.gemini/GEMINI.md` and updated scripts to reference the single source of truth.
- 002-asset-allocation-donut: Added TypeScript 5.x (Frontend) + `recharts` (New), Next.js 14+ (Existing), Tailwind CSS (Existing)

---
## 🚨 Core Constitution (Must Follow)
@.specify/memory/constitution.md
