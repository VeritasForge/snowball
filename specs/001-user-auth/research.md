# Tech Research & Decisions: User Authentication

**Related Feature**: 001-user-auth
**Date**: 2026-01-05

## 1. Authentication Strategy

### Decision: JWT (JSON Web Tokens)
-   **Reasoning**:
    -   Standard for FastAPI and modern Web/App architectures.
    -   Stateless, beneficial for server scalability.
    -   Suitable for communication between Next.js frontend and separated backend.
-   **Alternatives Considered**:
    -   **Server-side Session**: Requires extra infra like Redis, cumbersome for mobile expansion.
-   **Implementation Details**:
    -   `Access Token`: 30min lifetime, stored in memory (Frontend).
    -   `Refresh Token`: 7 days lifetime, stored in `httpOnly` cookie (Security).
    -   Libraries: `PyJWT` (Backend), `next-auth` (Frontend - Considered but custom backend integration might be complex, so implementing manually or using lighter library).
    -   **Frontend Decision**: Direct API calls and state management via Context/Zustand (NextAuth.js might have high overhead).

## 2. Password Hashing

### Decision: Passlib + bcrypt
-   **Reasoning**:
    -   Standard library in Python ecosystem.
    -   `bcrypt` offers proven security.
-   **Implementation Details**:

## 3. Data Sync Strategy

### Decision: Server-First with Migration Support
-   **Scenario**:
        -   **No Data** on Server: Auto-upload local data to server (Migration).
        -   **Data Exists** on Server: Overwrite local data with server data (Follows Spec FR-004).
            -   *Edge Case*: Local data might be significant, so consider UX notification "Replacing with server data" before overwriting. (MVP: Auto replace).
-   **Implementation Location**: `SyncPortfolioUseCase` (Backend) or Frontend logic after login success.
    -   **Backend Recommended**: Send local portfolio data as option when calling Login API -> Backend decides merge/ignore and returns final state.

## 4. Clean Architecture Application
-   **Domain**: `User` entity, `Password` value object (No encryption logic, define interface only).
-   **Use Cases**: `RegisterUser`, `Login`, `AuthenticateRequest` (Token verification).
-   **Adapters**: `AuthRepository` (DB Access), `TokenService` (JWT Issue/Verify).

## 5. Frontend State Management

### Decision: Zustand + LocalStorage
-   **Reasoning**: Lighter than Redux and less boilerplate.
-   **Implementation**:
    -   `useAuthStore`: Manage `user`, `token`, `isAuthenticated`, `isGuest` states.
    -   `PortfolioStore`: Link with `localStorage` (Guest Mode). Switch to API mode on login.
