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

### 3.2 Frontend (`frontend/`)
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

## 4. 아키텍처 가이드라인 및 모범 사례 (Architectural Guidelines)

### 4.1 객체 지향 및 SOLID 원칙 (OOP & SOLID)
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

### 4.2 Clean Code 원칙
*   **의도를 드러내는 이름**: `d` 대신 `days_since_creation`을 사용하세요.
*   **작은 함수**: 함수는 한 가지 일만 해야 하며, 짧을수록 좋습니다.
*   **부수 효과(Side Effect) 제거**: 함수 이름이 약속한 일 외에 다른 상태를 몰래 변경하지 마세요.
*   **주석 최소화**: 코드로 의도를 표현할 수 있다면 주석을 쓰지 마세요. 주석은 '왜(Why)'를 설명할 때만 사용합니다.

### 4.3 결합도(Coupling)와 응집도(Cohesion)
*   **Low Coupling (낮은 결합도)**: 모듈 간의 상호 의존성을 줄이세요. 한 모듈을 변경할 때 다른 모듈을 수정할 필요가 없어야 합니다.
*   **High Cohesion (높은 응집도)**: 관련된 기능은 하나의 모듈 안에 모으세요.

## 5. 백엔드 컨텍스트 (@backend/**)
**이 섹션의 내용은 `backend` 디렉토리 내의 작업에만 엄격하게 적용됩니다.**

### 5.1 핵심 아키텍처 원칙 (타협 불가)
우리는 클린 아키텍처(Clean Architecture)를 준수합니다. 의존성은 반드시 **내부(Inwards)**를 향해야 합니다.

- **도메인 레이어 (`src/snowball/domain`)**:
    - 순수 Python 비즈니스 규칙입니다.
    - **금지**: `fastapi`, `sqlmodel`, `pydantic`(순수 스키마 용도 외 금지, `dataclasses` 선호), 인프라스트럭처로부터의 import 금지.
    - **포함**: 엔티티(Entities), 값 객체(Value Objects), 도메인 예외, 리포지토리 인터페이스(Ports).

- **유스케이스 레이어 (`src/snowball/use_cases`)**:
    - 비즈니스 로직의 오케스트레이션(조정)을 담당합니다.
    - **의존성**: 오직 `domain` 레이어에만 의존합니다.
    - **포함**: 단일 책임 원칙을 구현하는 인터랙터(Interactor) 클래스.

- **인터페이스 어댑터 (`src/snowball/adapters`)**:
    - 외부 세계와 도메인 간의 데이터 변환을 담당합니다.
    - **포함**:
        - `api/`: FastAPI 라우터(Controller). HTTP 요청 처리, DTO 검증, 유스케이스 호출.
        - `db/`: SQLModel 리포지토리 구현체. 엔티티와 DB 모델 간의 매핑.

- **인프라스트럭처 (`src/snowball/infrastructure`)**:
    - 프레임워크 설정, DB 연결, 환경 변수 설정 등을 포함합니다.

### 5.2 기술 스택 및 코딩 컨벤션
- **Python 3.12+**
    - 현대적인 타입 힌트 사용: `list[str]`, `dict[str, Any]`, `str | None` (`List`, `Dict`, `Optional`, `Union` 지양).
    - 고유 ID 타입을 위해 `typing.NewType` 사용 (예: `UserId`, `AssetId`).
- **FastAPI (Async-First)**
    - 모든 루트 핸들러는 `async def`로 작성.
    - 루트에 비즈니스 로직 금지: 컨트롤러는 입력 파싱, 유스케이스 호출, 출력 포맷팅만 수행.
    - 의존성 주입 시 `Annotated` 사용 (예: `repo: Annotated[Repository, Depends(...)]`).
- **SQLModel 및 데이터베이스**
    - 오직 `AsyncSession`만 사용.
    - 패턴: `await session.exec(select(Model)) -> result.all()`.
    - 세션 컨텍스트 외부에서 지연 로딩(lazy-loaded) 관계 접근 금지. 쿼리 시 `.options(selectinload(...))` 사용.
- **Pydantic V2**
    - `model_config = ConfigDict(...)` 사용.
    - `dict()` 대신 `model_dump()` 사용.
    - `@field_validator` 및 `@model_validator(mode='after')` 사용.

## 6. 프론트엔드 컨텍스트 (@frontend/**)
- **Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS.
- **Testing**: Jest, React Testing Library.

## 7. TDD 프로토콜 (Robert C. Martin 표준)
당신은 숙련된 TDD 실천가입니다. TDD의 3가지 법칙을 엄격히 따릅니다:
1. **Red**: 실패하는 단위 테스트를 통과시키기 위한 목적이 아니라면 어떤 운영 코드도 작성하지 않습니다.
2. **Green**: 테스트를 실패시키기에 충분한 정도 이상의 테스트 코드를 작성하지 않습니다 (컴파일 실패도 실패로 간주).
3. **Refactor**: 현재 실패한 테스트를 통과시키기에 충분한 정도 이상의 운영 코드를 작성하지 않습니다.

**테스트 전략 및 스타일 가이드:**
1.  **Given/When/Then 구조 (필수)**:
    -   모든 테스트는 **Given(준비) / When(실행) / Then(검증)** 패턴을 주석으로 명시해야 합니다.
    -   **And 사용**: Given, When, Then 단계가 여러 줄일 경우, `Given`을 반복하지 않고 `And`를 사용하여 가독성을 높입니다.
        -   *예: Given: 사용자 생성 -> And: 로그인 상태*
2.  **Single Concept (단일 개념)**:
    -   테스트 함수 하나당 하나의 개념(이야기)만 검증합니다.
    -   **One When/Then**: 하나의 테스트 함수 내에서 `When`과 `Then` 사이클은 단 한 번만 수행합니다. 연속된 동작 검증이 필요하면 별도의 테스트로 분리합니다.
3.  **Parametrized Test (매개변수화)**:
    -   로직은 같고 입력값/결과값만 다른 경우, 반복문 대신 `pytest.mark.parametrize`를 사용하여 테스트를 데이터 중심으로 구조화합니다.
4.  **Descriptive Naming (서술적 명명)**:
    -   `test_func()` 대신 `test_should_return_200_when_user_is_logged_in()`과 같이 테스트의 의도와 상황을 명확히 드러내는 이름을 사용합니다.

**테스트 레이어 정의:**
- **단위 테스트 (tests/unit)**:
    - 대상: 엔티티(Entity) 및 유스케이스(Use Case).
    - 제약: 실행 시간 10ms 미만. DB 연결 금지. 모든 포트(Port)는 모킹(Mock) 처리.
- **통합 테스트 (tests/integration)**:
    - 대상: SQLModel 리포지토리.
    - 제약: 실제(Docker) 또는 인메모리 SQLite DB를 사용하여 SQL 생성 및 스키마 매핑을 검증.
- **E2E/API 테스트 (tests/e2e)**:
    - 대상: FastAPI 루트.
    - 제약: `TestClient` 사용. `app.dependency_overrides`를 사용하여 유스케이스를 모킹함으로써 도메인 로직과 분리된 API 레이어를 고립 테스트.

## Progress
-   [x] Project Initialization
-   [x] Frontend Setup (UI Refactored with Lucide Icons)
-   [x] Backend Setup (API & DB Refactored)
-   [x] TDD Environment Setup & Test Coverage (Backend tests passing)
-   [x] Real-time Price Integration (FinanceDataReader polling every 10s)
-   [x] Asset Intelligence (Auto name/price/category lookup)
-   [x] Database Integration (PostgreSQL via Docker)

## Final Features
- **Multi-Account Support**: Manage different investment portfolios.
- **Smart Rebalancing**: Automatic BUY/SELL quantity calculation based on target weights.
- **Automated Data**: Real-time market data fetching and category inference (Stock, Bond, Commodity, etc.).
- **TDD Backed**: Reliable financial calculations verified by unit tests.


## 실행 방법 요약
1.  DB: `docker-compose up -d`
2.  Backend: `cd backend && uv run uvicorn main:app --reload`
3.  Frontend: `cd frontend && npm install && npm run dev` (npm 권한 에러 시 README 참고)
