---
description: "Task list template for feature implementation"
---

# Tasks: 사용자 인증 및 다중 계정 지원

**Input**: Design documents from `/specs/001-user-auth/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD Protocol이 필수이므로 모든 구현에 앞서 테스트 작성 태스크를 포함합니다.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 프로젝트 초기 설정 및 의존성 추가

- [x] T001 Install auth libraries (passlib, pyjwt, zustand) in backend/pyproject.toml and frontend/package.json
- [x] T002 Configure env variables (SECRET_KEY, ALGORITHM) in backend/.env

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 사용자 스토리가 의존하는 핵심 인프라 구축

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create User entity and Password VO in backend/src/snowball/domain/entities.py
- [x] T004 Create AccountModel user_id FK migration in backend/src/snowball/adapters/db/models.py
- [x] T005 [P] Implement PasswordHasher infrastructure in backend/src/snowball/infrastructure/security.py
- [x] T006 [P] Implement JWTService infrastructure in backend/src/snowball/infrastructure/security.py
- [x] T007 Create AuthRepository interface in backend/src/snowball/domain/ports.py
- [x] T008 Implement AuthRepository in backend/src/snowball/adapters/db/repositories.py

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 게스트 접근 및 로컬 저장 (Priority: P1) 🎯 MVP

**Goal**: 비로그인 상태에서도 브라우저 새로고침 시 데이터 유지

**Independent Test**: 게스트 모드에서 자산 추가 후 새로고침 -> 데이터 유지 확인

### Tests for User Story 1 ⚠️

- [x] T009 [US1] Create unit test for PortfolioStore (Guest Logic) in frontend/tests/store/test_portfolio_store.ts
- [x] T010 [US1] Implement PortfolioStore with Zustand & persist middleware in frontend/src/lib/store.ts
- [x] T011 [US1] Update Header component to show Login button in frontend/src/components/Header.tsx
- [x] T012 [US1] Verify guest data persistence logic in frontend/src/app/page.tsx

**Checkpoint**: 게스트 모드 데이터 영속성 검증 완료

---

## Phase 4: User Story 2 - 회원가입 및 로그인 (Priority: P2)

**Goal**: 이메일/비밀번호 가입 및 로그인, 서버 세션 생성

**Independent Test**: 회원가입 -> 로그인 -> 토큰 발급 확인

- [x] T013 [P] [US2] Create unit test for RegisterUserUseCase in backend/tests/unit/use_cases/test_auth.py
- [x] T014 [P] [US2] Create unit test for LoginUseCase in backend/tests/unit/use_cases/test_auth.py
- [x] T015 [US2] Implement RegisterUserUseCase in backend/src/snowball/use_cases/auth.py
- [x] T016 [US2] Implement LoginUseCase in backend/src/snowball/use_cases/auth.py
- [x] T017 [US2] Create AuthRouter (Register/Login) in backend/src/snowball/adapters/api/routes.py
- [x] T018 [US2] Implement Login/Register UI Pages in frontend/src/app/auth/page.tsx
- [x] T019 [US2] Integrate Auth API with frontend store in frontend/src/lib/auth.ts

**Checkpoint**: 회원가입/로그인 정상 동작 확인

---

## Phase 5: User Story 3 - 인증된 사용자를 위한 서버 동기화 (Priority: P3)

**Goal**: 로그인 시 로컬 데이터를 서버로 동기화 및 서버 데이터 우선 처리

**Independent Test**: 게스트 데이터 생성 -> 로그인 -> 서버 DB에 데이터 병합 확인

### Tests for User Story 3 ⚠️

- [x] T020 [US3] Create unit test for SyncPortfolioUseCase in backend/tests/unit/use_cases/test_sync.py
- [x] T021 [US3] Implement SyncPortfolioUseCase (Server-First Logic) in backend/src/snowball/use_cases/sync.py
- [x] T022 [US3] Add Sync endpoint to AuthRouter in backend/src/snowball/adapters/api/routes.py
- [x] T023 [US3] Trigger sync on frontend login success in frontend/src/lib/auth.ts
- [x] T024 [US3] Update PortfolioStore to switch source to API on login in frontend/src/lib/store.ts

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: 보안 강화 및 예외 처리

- [x] T025 [P] Add detailed error messages for duplicate email/invalid password
- [x] T026 Refactor frontend store to handle storage quota exceeded gracefully
- [x] T027 Security audit: Check token storage security (httpOnly vs memory)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup - Blocks US1, US2, US3 (Shared Entities/Infra)
- **User Story 1 (P1)**: Depends on Setup (Frontend Store)
- **User Story 2 (P2)**: Depends on Foundational (Backend Auth)
- **User Story 3 (P3)**: Depends on US1 (Guest Data) & US2 (Auth)

### Parallel Opportunities

- **Backend & Frontend**:
  - Backend Auth Logic (T013~T017) can run parallel to Frontend Store (T009~T012)
- **Within Stories**:
  - Tests (T013, T014) can be written parallel to Implementation
  - UI (T018) can be built parallel to API (T017) after contract agreement

---

## Implementation Strategy

### MVP First (User Story 1)

1. Setup (Phase 1)
2. Implement Guest Persistence (US1) -> **Deployable Value: Better Guest UX**
3. Foundational (Phase 2)
4. User Auth (US2) -> **Deployable Value: Accounts**
5. Sync (US3) -> **Deployable Value: Multi-device support**

### Incremental Delivery

1. **Step 1**: Frontend-only update for Guest Persistence (US1).
2. **Step 2**: Backend Auth System deployment (Phase 2 + US2).
3. **Step 3**: Full Sync feature rollout (US3).
