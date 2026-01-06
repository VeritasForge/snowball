# Project Constitution: Snowball (Asset Allocation Dashboard)

## 1. Technology Stack (Non-Negotiable)
- **Language**: Python 3.12+ (Use PEP 695 type syntax where applicable)
- **Web Framework**: FastAPI (Async-First). All route handlers must be `async def`.
- **ORM**: SQLModel (AsyncSession with asyncio).
    - Pattern: `await session.exec(select(Model)) -> result.all()`.
    - No lazy loading outside session context (use `.options(selectinload(...))`).
- **Validation**: Pydantic V2.
    - Use `model_config = ConfigDict(...)`.
    - Use `model_dump()` instead of `dict()`.

## 2. Architecture Principles (Clean Architecture)
We strictly adhere to **Clean Architecture**. Dependencies must point **Inwards**.

- **Domain Layer (`src/snowball/domain`)**:
    - Pure Python business rules.
    - **FORBIDDEN**: `fastapi`, `sqlmodel`, `pydantic` (except for schemas if absolutely necessary, prefer `dataclasses`), infrastructure imports.
    - **Contains**: Entities, Value Objects, Domain Exceptions, Repository Interfaces (Ports).

- **Use Case Layer (`src/snowball/use_cases`)**:
    - Orchestration of business logic.
    - **Depends on**: Domain Layer ONLY.
    - **Contains**: Interactors implementing Single Responsibility Principle.

- **Interface Adapters (`src/snowball/adapters`)**:
    - Data conversion between external world and domain.
    - **Contains**:
        - `api/`: FastAPI Routers (Controllers). Input parsing, Use Case invocation, Output formatting.
        - `db/`: SQLModel Repository Implementations. Mapping between Entities and DB Models.

- **Infrastructure (`src/snowball/infrastructure`)**:
    - Framework config, DB connections, Environment variables.

## 3. Testing Strategy (TDD Protocol)
**Mandatory Workflow**: Red -> Green -> Refactor.

### 3.1 GWT Pattern with 'And'
All tests must explicitly use the **Given/When/Then** pattern in comments.
- **Given**: Setup state.
- **And**: Additional setup or context (Do not repeat 'Given').
- **When**: Execute action.
- **Then**: Verify result.
- **And**: Additional verification.

### 3.2 Single Concept Principle
- **One Concept per Test**: A test function should verify a single logical concept.
- **One When/Then Cycle**: Do not chain multiple actions and assertions in one test (e.g., do not test "Create AND THEN Update" in one function; split them).

### 3.3 Parametrization
- Use `pytest.mark.parametrize` for testing the same logic with different inputs/outputs (e.g., category inference, validations).

### 3.4 Test Layers
- **Unit Tests (`tests/unit`)**:
    - Targets: Entities, Use Cases.
    - Constraints: <10ms execution, NO DB, Mock all Ports.
- **Integration Tests (`tests/integration`)**:
    - Targets: Repositories (SQLModel).
    - Constraints: Use in-memory SQLite. Verify SQL generation and schema mapping.
- **E2E/API Tests (`tests/e2e`)**:
    - Targets: FastAPI Routes.
    - Constraints: Use `TestClient`. Mock Use Cases via `app.dependency_overrides` if necessary, or test full stack with SQLite.
    - **Status Codes**: Use `http.HTTPStatus` constants (e.g., `HTTPStatus.OK`).
