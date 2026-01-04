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

**테스트 전략:**
- **구조**: 모든 테스트는 **Given/When/Then** 패턴을 명시적으로 따르는 주석을 포함해야 합니다.
    - Given: 테스트 초기 상태 설정.
    - When: 테스트 대상 행동 실행.
    - Then: 결과 검증 및 단언(Assert).
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
