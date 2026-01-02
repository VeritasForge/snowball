# 프로젝트 컨텍스트: 스노우볼 (자산배분 대시보드)

## 프로젝트 개요
투자 포트폴리오를 관리하고, 설정한 목표 비중에 따라 리밸런싱이 필요한 매수/매도 수량과 금액을 계산해주는 웹 기반 대시보드입니다.

## 핵심 기능
1.  **자산 관리**: 자산명과 목표 비중(%) 등록 및 수정.
    *   예: 미국주식 TIGER S&P500: 20.0%
2.  **포트폴리오 현황**: 각 자산의 현재가, 보유 수량 및 예수금 입력.
3.  **리밸런싱 계산기**:
    *   총 자산 = (각 자산 평가금액 합계) + 예수금.
    *   자산별 목표 금액 = 총 자산 * 목표 비중.
    *   매매 가이드: (목표 금액 - 현재 평가액)을 계산하여 매수/매도 필요 금액 및 수량 제시.

## 기술 스택
-   **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS.
-   **Backend**: Python, FastAPI, `uv` (패키지 매니저), SQLModel (ORM).
-   **Database**: PostgreSQL (Docker Compose).

## Coding Conventions
-   **TDD (Test-Driven Development)**:
    -   Write tests *before* implementing new features or fixing bugs.
    -   Ensure all tests pass before committing.
    -   Backend: Use `pytest` for unit and integration tests.
    -   Frontend: Use `Jest` and `React Testing Library` (if applicable).
-   **Style**: Follow existing project structure and naming conventions.

## Progress
-   [x] Project Initialization
-   [x] Frontend Setup (UI Refactored)
-   [x] Backend Setup (API & DB Refactored)
-   [x] TDD Environment Setup & Test Coverage (Backend tests implemented & passing)
-   [ ] Database Integration (Docker Compose ready)
-   [ ] Feature Implementation (Rebalancing logic added)

## 실행 방법 요약
1.  DB: `docker-compose up -d`
2.  Backend: `cd backend && uv run uvicorn main:app --reload`
3.  Frontend: `cd frontend && npm install && npm run dev` (npm 권한 에러 시 README 참고)