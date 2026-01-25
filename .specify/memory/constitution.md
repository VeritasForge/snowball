<!--
Sync Impact Report:
- Version: 1.4.0 (Current, comprehensive constitution)
- Last Amendment: 2026-01-25
- Previous Versions:
  * Template → 1.2.0 (Initial creation)
  * 1.2.0 → 1.4.0 (2026-01-14, Added AI Interaction Protocols & Regression Prevention)
  * 1.4.0 → 1.0.0 (2026-01-23, Attempted restructure - reverted)
  * Reverted to 1.4.0 (2026-01-25, Comprehensive approach preferred)

- Current Principles (v1.4.0):
  I. Clean Architecture (Inward Dependency) - Core architectural pattern
  II. Strict TDD Protocol (Non-Negotiable) - Robert C. Martin's 3 Rules
  III. Modern Python & Conventions - Python 3.12+, Pydantic V2, FastAPI, HTTP Status
  IV. AI Workflow & Chain of Thought - AI agent development protocol
  V. Documentation Language (Korean) - Documentation standard
  VI. AI Interaction Protocols - Edge cases, deep thinking, clarification
  VII. Regression Prevention & Context Maintenance - Pre-coding verification, context updates

- Supporting Artifacts Status:
  ✅ `.claude/skills/coding-standards/SKILL.md` - Comprehensive coding standards
    * Includes Clean Architecture layers
    * Python backend conventions (Type Hints, Pydantic V2, FastAPI Architecture)
    * HTTP Status Codes guidelines (http.HTTPStatus usage)
    * TypeScript frontend conventions
    * File size limits
  ✅ `.claude/skills/tdd-workflow/SKILL.md` - TDD methodology and practices
  ✅ `.claude/skills/test-writing/SKILL.md` - Test writing standards
  ✅ `.claude/rules/coding-style.md` - Immutability, SRP, explicit over implicit
  ✅ `.claude/rules/security.md` - Security mandatory checks
  ✅ `.claude/rules/testing.md` - Coverage requirements and TDD workflow
  ✅ `.claude/rules/snowball-domain.md` - Domain-specific rules (Decimal, Value Objects)
  ✅ `.claude/rules/git-workflow.md` - Git conventions and PR process
  ✅ `CLAUDE.md` - Project context and AI interaction guidelines

- Architecture Philosophy:
  * Constitution remains comprehensive with all critical principles
  * Skills provide detailed implementation guidance (how-to)
  * Rules enforce specific constraints (must/must-not)
  * No principle fragmentation - constitution is single source of truth
  * Supporting docs amplify but don't replace constitutional principles

- Compliance Gates:
  ✅ All core principles documented in constitution
  ✅ Skills aligned with constitutional principles
  ✅ Rules enforce constitutional mandates
  ✅ No contradictions between constitution and supporting docs
  ✅ Version tracking active
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

**Testing Strategy & Style Guide (Detailed):**
1.  **Given/When/Then Structure**: All tests MUST follow this structure, explicitly commented.
    -   *Example*: `Given: User created -> And: Logged in -> When: Click button -> Then: Show modal`.
2.  **Single Concept**: Verify one concept per test function.
3.  **Parametrized Test**: Use `pytest.mark.parametrize` for data-driven tests.
4.  **Descriptive Naming**: `test_should_return_error_when_invalid_input()` over `test_input()`.

### III. Modern Python & Conventions
Code MUST adhere to Python 3.12+ and Pydantic V2 standards.
-   **Type Hints**: Use built-in generics (`list[str]`, `dict`, `str | None`) instead of `typing` module aliases.
-   **Pydantic V2**: Use `model_config`, `model_dump()`, and validators.
-   **FastAPI**: All routes MUST be `async def`. Logic MUST be in Use Cases, not Routes.
-   **SQLModel**: Use `AsyncSession` exclusively.
-   **Naming**: Snake_case for variables/functions, PascalCase for classes.
-   **HTTP Status Codes**: Avoid magic numbers. Use Python's built-in `http.HTTPStatus` (e.g., `HTTPStatus.OK`, `HTTPStatus.NOT_FOUND`).

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

### VI. AI Interaction Protocols
1.  **Edge Cases & Error Handling**: Always consider edge cases and error handling.
2.  **Deep Thinking**: Always think deeply. Use `sequentialthinking` for complex analysis.
3.  **Interactive Clarification**: Ask questions about unknown or ambiguous parts. Do not assume; verify with the user.

## VII. Regression Prevention & Context Maintenance (New)

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

## Architecture Constraints & Guidelines

### Domain Layer Isolation
The Domain Layer is the heart of the software. It MUST remain ignorant of the database, the web framework, and the UI.
-   **Forbidden Imports in Domain**: `fastapi`, `sqlmodel` (except for pure schema definition if unavoidable, prefer `dataclasses`), `sqlalchemy`, `pydantic` (settings/infra).
-   **Allowed**: Standard library, strictly defined Value Objects, Entities.

### Asynchronous I/O
The system is built on an Async-First principle using FastAPI and AsyncSQLModel.
-   Blocking I/O operations (network requests, disk I/O) MUST be awaited.
-   Database access MUST use `await session.exec(...)`.

### OOP & SOLID Principles (Best Practices)
We aim for flexible and maintainable code.
1.  **Single Responsibility Principle (SRP)**:
    -   Classes/Functions should have one reason to change.
    -   *Bad*: `AssetService` handles DB storage AND email sending.
    -   *Good*: `AssetRepository` stores, `NotificationService` notifies.
2.  **Open/Closed Principle (OCP)**:
    -   Open for extension, closed for modification.
    -   *Strategy*: Create new files/classes instead of modifying existing complex logic.
3.  **Liskov Substitution Principle (LSP)**:
    -   Prefer Composition over Inheritance.
4.  **Interface Segregation Principle (ISP)**:
    -   Prefer specific interfaces over general ones.
5.  **Dependency Inversion Principle (DIP)**:
    -   High-level modules must not depend on low-level modules. Both should depend on abstractions (Ports).

### Clean Code Principles
1.  **Intention-Revealing Names**: `days_since_creation` over `d`.
2.  **Small Functions**: Do one thing well.
3.  **No Side Effects**: Do not change hidden state.
4.  **Minimal Comments**: Code should explain itself; comments explain "Why".
5.  **Low Coupling & High Cohesion**.

## Frontend Rules
-   **Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS.
-   **Component Isolation**: Split files > 200 lines. Use wrapper components/hooks for new features.

## Governance

### Amendment Process
1.  This Constitution is the supreme source of engineering truth for the Snowball project.
2.  Any changes to architectural patterns or tech stack MUST be ratified here first.
3.  Amendments follow Semantic Versioning (Major for breaking rule changes, Minor for additions).

### Compliance
-   All Pull Requests MUST be verified against these principles.
-   Code violating Clean Architecture (e.g., Domain importing Infrastructure) MUST be rejected.
-   Code without corresponding tests (violating TDD) MUST be rejected.

**Version**: 1.4.0 | **Ratified**: 2026-01-05 | **Last Amended**: 2026-01-25
