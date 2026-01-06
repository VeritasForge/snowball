@.specify/memory/constitution.md

# Project: Snowball Backend Context

## Quick Start Commands
- **Run Tests**: `cd backend && uv run pytest tests/`
- **Run Server**: `cd backend && uv run uvicorn main:app --reload`
- **Lint**: `ruff check .`

## Directory Map
- `backend/src/snowball/domain`: Entities and Repository Interfaces (Ports)
- `backend/src/snowball/use_cases`: Business Logic Interactors
- `backend/src/snowball/adapters`: FastAPI Routes and SQLModel Repositories
- `backend/src/snowball/infrastructure`: DB Config and Main App Entry
- `backend/tests`: Unit, Integration, and E2E Tests

## Notes
- See `constitution.md` for strict architectural and testing rules.
- Do not modify existing tests to make code pass; fix the implementation.
