# 프로젝트 컨텍스트: 스노우볼 (자산배분 대시보드)

## 1. 프로젝트 개요
투자 포트폴리오를 관리하고, 설정한 목표 비중에 따라 리밸런싱이 필요한 매수/매도 수량과 금액을 계산해주는 웹 기반 대시보드입니다.

## 2. 현재 구현 현황 (Current Implementation Context)

### 2.1 Backend (`backend/`)
**Architecture**: Clean Architecture (Domain, Use Cases, Adapters, Infrastructure)
**Framework**: FastAPI (Async), SQLModel (PostgreSQL)

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

### 2.2 Frontend (`frontend/`)
**Tech Stack**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Lucide Icons.

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

## 3. 아키텍처 가이드라인 및 모범 사례 (Architectural Guidelines)

### 3.1 객체 지향 및 SOLID 원칙 (OOP & SOLID)
우리는 **변경에 유연하고(Flexible)** **유지보수가 쉬운(Maintainable)** 코드를 지향합니다.

*   **Single Responsibility Principle (SRP)**:
    *   클래스와 함수는 단 하나의 이유로만 변경되어야 합니다.
    *   *Bad*: `AssetService`가 DB 저장도 하고 이메일 발송도 함.
    *   *Good*: `AssetRepository`는 저장을, `NotificationService`는 알림을 담당.

*   **Open/Closed Principle (OCP)**:
    *   확장에는 열려 있고, 수정에는 닫혀 있어야 합니다.
    *   *Bad*: 새로운 자산 타입을 추가할 때 `calculate_tax` 함수 내의 `if`문을 수정함.
    *   *Good*: `TaxCalculator` 인터페이스를 정의하고, `StockTaxCalculator`, `BondTaxCalculator` 등으로 구현체를 추가함. (기존 코드 수정 불필요)
    *   **전략**: 기능을 추가할 때 기존 파일을 수정하기보다 **새로운 파일/클래스**를 만드는 것을 선호하세요 (Isolation Strategy).

*   **Liskov Substitution Principle (LSP)**:
    *   상위 타입의 객체를 하위 타입의 객체로 치환해도 프로그램이 정상 작동해야 합니다.
    *   *Check*: 상속보다는 **합성(Composition)**이나 **인터페이스 구현**을 선호하세요.

*   **Interface Segregation Principle (ISP)**:
    *   범용 인터페이스 하나보다 구체적인 여러 인터페이스가 낫습니다.
    *   *Example*: `SmartPhone` 인터페이스 대신 `CallCapable`, `CameraCapable`, `WebBrowsable`로 분리.

*   **Dependency Inversion Principle (DIP)**:
    *   고수준 모듈(비즈니스 로직)이 저수준 모듈(DB, Web)에 의존하면 안 됩니다. 둘 다 추상화에 의존해야 합니다.
    *   *Implement*: Use Case는 `SQLModelRepository`를 직접 import하지 않고, Domain에 정의된 `Repository` 인터페이스(Port)를 import 합니다.

### 3.2 Clean Code 원칙
*   **의도를 드러내는 이름**: `d` 대신 `days_since_creation`을 사용하세요.
*   **작은 함수**: 함수는 한 가지 일만 해야 하며, 짧을수록 좋습니다.
*   **부수 효과(Side Effect) 제거**: 함수 이름이 약속한 일 외에 다른 상태를 몰래 변경하지 마세요.
*   **주석 최소화**: 코드로 의도를 표현할 수 있다면 주석을 쓰지 마세요. 주석은 '왜(Why)'를 설명할 때만 사용합니다.

### 3.3 결합도(Coupling)와 응집도(Cohesion)
*   **Low Coupling (낮은 결합도)**: 모듈 간의 상호 의존성을 줄이세요. 한 모듈을 변경할 때 다른 모듈을 수정할 필요가 없어야 합니다.
*   **High Cohesion (높은 응집도)**: 관련된 기능은 하나의 모듈 안에 모으세요.

## 4. 백엔드 컨텍스트 세부사항 (@backend/**)
**이 섹션의 내용은 `backend` 디렉토리 내의 작업에만 엄격하게 적용됩니다.**

### 4.1 기술 스택 및 코딩 컨벤션
- **Python 3.12+**: 현대적인 타입 힌트 사용 (`list[str]`, `str | None`).
- **FastAPI (Async-First)**: 모든 핸들러는 `async def`. 비즈니스 로직은 Use Case로 위임.
- **SQLModel**: `AsyncSession` 필수 사용.

### 4.2 레이어 구조 (Clean Architecture)
1.  **Domain**: 순수 Python. 외부 의존성 없음. (Entities, VO, Ports)
2.  **Use Cases**: 애플리케이션 고유 비즈니스 규칙. (Interactors)
3.  **Adapters**: 외부 세계와의 인터페이스. (API Controllers, DB Repositories)
4.  **Infrastructure**: 프레임워크 및 드라이버.

## 5. 프론트엔드 컨텍스트 세부사항 (@frontend/**)
**이 섹션의 내용은 `frontend` 디렉토리 내의 작업에만 엄격하게 적용됩니다.**

### 5.1 기술 스택
- **Next.js (App Router)**: 서버 컴포넌트와 클라이언트 컴포넌트(`"use client"`)의 적절한 분리.
- **Tailwind CSS**: 유틸리티 클래스 기반 스타일링.
- **Zustand/Context API**: (필요시) 전역 상태 관리.

### 5.2 컴포넌트 설계 원칙 (Chunking & Isolation)
- **컴포넌트 분리**: 하나의 파일이 200줄을 넘어가면 분리를 고려하세요.
- **Feature Isolation**: 새로운 기능을 추가할 때 기존 컴포넌트에 로직을 욱여넣지 말고, `FeatureNameWrapper` 같은 래퍼 컴포넌트나 별도의 훅(Hook)으로 분리하세요.
- **Props Interface**: 모든 컴포넌트는 명시적인 Props Interface를 가져야 합니다.

## 6. 개발 워크플로우 (AI 지침)
1.  **Plan**: 요구사항 분석 및 설계. (기존 기능 영향도 파악)
2.  **Test First**: 기존 테스트 전체 통과 확인 -> 신규 기능에 대한 실패하는 테스트 작성 (Red).
3.  **Implement**: 테스트 통과를 위한 최소 구현 (Green). 기존 코드 수정 최소화.
4.  **Refactor**: 클린 코드 및 아키텍처 원칙 적용.
5.  **Update Context**: 작업 완료 전 `GEMINI.md`의 기능 목록 업데이트.
