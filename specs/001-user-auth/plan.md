# Implementation Plan: User Authentication & Multi-Account Support

**Branch**: `001-user-auth` | **Date**: 2026-01-05 | **Spec**: [specs/001-user-auth/spec.md](../spec.md)
**Input**: Feature specification from `/specs/001-user-auth/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

이 기능은 사용자 인증(회원가입, 로그인) 및 게스트 모드를 구현하여 다중 계정 지원의 기초를 마련합니다.
핵심 요구사항은 다음과 같습니다:
1.  **게스트 모드**: 로그인 없이 사용 가능하며, 데이터는 브라우저 Local Storage에 보존.
2.  **인증 시스템**: JWT 기반(예정)의 이메일/비밀번호 인증.
3.  **데이터 동기화**: 로그인 시 서버 데이터를 우선으로 하되, 로컬 데이터 처리 전략 수립.
4.  **보안**: 비밀번호 해싱 및 안전한 세션 관리.

## Technical Context

**Language/Version**: Python 3.12+ (Backend), TypeScript (Frontend)
**Primary Dependencies**: FastAPI, SQLModel, Pydantic V2, Passlib, PyJWT (Backend); Next.js, Tailwind CSS (Frontend)
**Storage**: PostgreSQL (Backend), Local Storage (Frontend)
**Testing**: pytest (Backend), Jest (Frontend)
**Target Platform**: Linux container (Backend), Modern Web Browsers (Frontend)
**Project Type**: Web application (Backend API + Next.js Frontend)
**Performance Goals**: Login API < 200ms
**Constraints**: Clean Architecture 준수, TDD 필수

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Clean Architecture**: Domain layer MUST NOT depend on Auth libraries directly. Auth logic should be in Use Cases/Adapters.
- [x] **TDD Protocol**: Auth logic requires comprehensive unit tests before implementation.
- [x] **Modern Python**: Use Pydantic V2 for Auth DTOs.
- [x] **Korean Documentation**: All docs in Korean.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
backend/
├── src/snowball/
│   ├── domain/           # User Entity, Password Value Object
│   ├── use_cases/        # Login, Register, SyncPortfolio Interactors
│   ├── adapters/
│   │   ├── api/          # Auth Router (Login/Register endpoints)
│   │   └── db/           # UserRepository
│   └── infrastructure/   # JWT Service, Password Hasher
└── tests/

frontend/
├── src/
│   ├── app/              # Login/Register Pages
│   ├── components/       # Auth Forms, Header User Menu
│   ├── lib/              # Auth Store (Zustand/Context), LocalStorage Utils
│   └── services/         # Auth API Client
└── tests/
```

**Structure Decision**: Clean Architecture를 준수하여 백엔드는 Domain/Use Cases/Adapters로 분리하고, 프론트엔드는 Next.js App Router 구조를 따릅니다.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (None) | | |