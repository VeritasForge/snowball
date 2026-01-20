# Quickstart: User Authentication Development

**Branch**: `001-user-auth`

## 1. Environment Setup
1.  Install packages:
2.  Set environment variables (`.env`):
3.  Install state management library (if needed):

## 2. Development Order (Recommended)
1.  **Backend Domain**: Define `User` entity and `Password` object.
2.  **Backend Adapter (DB)**: Define `User` SQLModel and Migration (Check `alembic` usage or update `create_db_and_tables`).
3.  **Backend Use Cases**:
    -   `RegisterUser`: Save to DB after password hashing.
    -   `Login`: Verify password and issue JWT.
4.  **Backend API**: Implement and test `/auth` router.
5.  **Frontend**:
    -   Implement Login/Signup pages.
    -   Implement `useAuth` hook (Zustand + LocalStorage + API).
    -   Add logic to inject `Authorization` header in API client.

## 3. Test Strategy
-   **Backend**: Perform TDD for auth logic in `tests/unit/use_cases/test_auth.py`.
-   **Integration**: Test login and token issuance after creating actual user in DB.
-   **Frontend**: Verify data persistence: Input data in non-login state -> Login -> Data preserved (Manual/E2E).
