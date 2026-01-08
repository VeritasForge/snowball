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

## 2. 백엔드 컨텍스트 (@backend/**)
**이 섹션의 내용은 `backend` 디렉토리 내의 작업에만 엄격하게 적용됩니다.**

### 2.1 핵심 아키텍처 원칙 (타협 불가)
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

### 2.2 기술 스택 및 코딩 컨벤션
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

## 3. 프론트엔드 컨텍스트 (@frontend/**)
- **Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS.
- **Testing**: Jest, React Testing Library.

## 4. TDD 프로토콜 (Robert C. Martin 표준)
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

## 5. 구현 워크플로우 (AI 지침)
기능 구현 요청 시 다음 단계를 따릅니다:
1. **계획 (Plan)**: 요구사항을 분석하고 디렉토리 구조 변경(엔티티, 포트, DTO 등)을 제안합니다.
2. **테스트 (Red)**: 단위 테스트 코드를 먼저 작성합니다.
3. **구현 (Green)**: 테스트를 통과하기 위한 최소한의 구현을 제공합니다.
4. **개선 (Refine)**: 타입 안정성 및 Pydantic V2 준수 여부를 확인합니다.

## 6. AI 사고 프로세스 (Chain of Thought)
복잡한 문제 해결이나 설계 결정이 필요한 경우, 다음 단계를 거쳐 사고 과정을 명시적으로 기술합니다:
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

## Final Features
- **Multi-Account Support**: Manage different investment portfolios.
- **Smart Rebalancing**: Automatic BUY/SELL quantity calculation based on target weights.
- **Automated Data**: Real-time market data fetching and category inference (Stock, Bond, Commodity, etc.).
- **TDD Backed**: Reliable financial calculations verified by unit tests.


## 실행 방법 요약
1.  DB: `docker-compose up -d`
2.  Backend: `cd backend && uv run uvicorn main:app --reload`
    - 또는 루트에서 `make be` 실행
3.  Frontend: `cd frontend && npm install && npm run dev` (npm 권한 에러 시 README 참고)
    - 또는 루트에서 `make fe` 실행

### 편의 기능 (Makefile)
루트 디렉토리에서 `make` 명령어를 사용하여 서버를 쉽게 실행할 수 있습니다.
- `make be`: 백엔드 서버 실행
- `make fe`: 프론트엔드 서버 실행
