<!--
Sync Impact Report:
- Version Change: Template -> 1.2.0
- Added Principles: Clean Architecture, Strict TDD Protocol, Modern Python & Pydantic V2, AI Workflow & Chain of Thought
- Added Regression Prevention Protocol (Test First, Context Maintenance)
- Added Decoupling Guidelines (Isolation)
-->

# Snowball Constitution

## Core Principles

### I. Clean Architecture (Inward Dependency)
Dependencies MUST strictly flow inwards.
- **Domain (`src/snowball/domain`)**: Pure Python business rules. Depends on NOTHING. No frameworks (FastAPI, SQLModel) allowed.
- **Use Cases (`src/snowball/use_cases`)**: Business orchestration. Depends ONLY on Domain.
- **Adapters (`src/snowball/adapters`)**: Interface conversion (API, DB Repositories). Depends on Use Cases & Domain.
- **Infrastructure (`src/snowball/infrastructure`)**: Frameworks & I/O. Depends on Adapters.

### II. Strict TDD Protocol (Non-Negotiable)
Follow Robert C. Martin's 3 Rules of TDD:
1.  **Red**: Do not write production code unless it is to pass a failing unit test.
2.  **Green**: Do not write more code than is sufficient to pass the test.
3.  **Refactor**: Do not add functionality while refactoring.
*   **Test Layers**: Unit (10ms, Mocked Ports) -> Integration (DB/SQLModel) -> E2E (API/TestClient).

### III. Modern Python & Conventions
Code MUST adhere to Python 3.12+ and Pydantic V2 standards.
-   **Type Hints**: Use built-in generics (`list[str]`, `dict`, `str | None`) instead of `typing` module aliases.
-   **Pydantic V2**: Use `model_config`, `model_dump()`, and validators.
-   **FastAPI**: All routes MUST be `async def`. Logic MUST be in Use Cases, not Routes.
-   **SQLModel**: Use `AsyncSession` exclusively.

### IV. AI Workflow & Chain of Thought
AI Agents and Developers MUST follow this workflow for complex tasks:
1.  **Plan**: Analyze requirements & propose architecture.
2.  **Chain of Thought**: Explicitly state Situation -> Strategy -> Plan -> Verify for complex problems.
3.  **Test (Red)**: Write failing tests first.
4.  **Implement (Green)**: Minimal implementation to pass.
5.  **Refine**: Type safety and Pydantic V2 compliance check.

### V. Documentation Language (Korean)
All documentation artifacts, including Specifications, Implementation Plans, and Tasks, MUST be written in **Korean** (Hangul).
- Technical terms (e.g., API, React, Database, TDD) and acronyms may be kept in English for clarity.
- While markdown headings in templates may remain in English, the content provided within them MUST be in Korean.

## VI. Regression Prevention & Context Maintenance (New)

### 6.1 Pre-Coding Verification (Test First)
**Before generating any new code or modifying existing code**, you MUST verify the system's current health.
-   **Action**: Run all existing tests for the relevant scope (Backend: `uv run pytest`, Frontend: `npm test`).
-   **Rule**: If any existing test fails, you MUST NOT proceed with new feature implementation until the regression is fixed.

### 6.2 Context Maintenance
**Before marking a task as complete (Finish)**, you MUST update the project documentation.
-   **Action**: Review `.gemini/GEMINI.md` and update the "Current Implementation Context" section to reflect any new features, schema changes, or architectural shifts.
-   **Goal**: Ensure the AI context never rots and always reflects the actual codebase state.

### 6.3 Decoupling & Isolation Strategy
To prevent "spaghetti code" and unintentional side effects:
-   **Prefer Addition over Modification**: When adding a feature, prefer creating a new class, function, or component file over modifying a large existing one. (OCP)
-   **Chunking**: Break down large tasks into small, isolated units.
-   **Explicit Boundaries**: Use Interfaces (Ports) to define boundaries between components.

## Architecture Constraints

### Domain Layer Isolation
The Domain Layer is the heart of the software. It MUST remain ignorant of the database, the web framework, and the UI.
-   **Forbidden Imports in Domain**: `fastapi`, `sqlmodel` (except for pure schema definition if unavoidable, prefer `dataclasses`), `sqlalchemy`, `pydantic` (settings/infra).
-   **Allowed**: Standard library, strictly defined Value Objects, Entities.

### Asynchronous I/O
The system is built on an Async-First principle using FastAPI and AsyncSQLModel.
-   Blocking I/O operations (network requests, disk I/O) MUST be awaited.
-   Database access MUST use `await session.exec(...)`.

## Development Standards

### Testing Strategy
-   **Given/When/Then**: All tests MUST follow this structure, explicitly commented.
-   **Single Concept**: One test function per behavior verification.
-   **Parametrization**: Use `pytest.mark.parametrize` for data-driven tests instead of loops.
-   **Descriptive Naming**: `test_should_return_error_when_invalid_input()` over `test_input()`.

## Governance

### Amendment Process
1.  This Constitution is the supreme source of engineering truth for the Snowball project.
2.  Any changes to architectural patterns or tech stack MUST be ratified here first.
3.  Amendments follow Semantic Versioning (Major for breaking rule changes, Minor for additions).

### Compliance
-   All Pull Requests MUST be verified against these principles.
-   Code violating Clean Architecture (e.g., Domain importing Infrastructure) MUST be rejected.
-   Code without corresponding tests (violating TDD) MUST be rejected.

**Version**: 1.2.0 | **Ratified**: 2026-01-05 | **Last Amended**: 2026-01-05
