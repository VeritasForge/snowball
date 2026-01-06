# Quickstart: 사용자 인증 기능 개발

**브랜치**: `001-user-auth`

## 1. 환경 설정

### Backend
1.  패키지 설치:
    ```bash
    cd backend
    uv add "passlib[bcrypt]" "pyjwt"
    ```
2.  환경 변수 설정 (`.env`):
    ```bash
    SECRET_KEY="your_secret_key_here"
    ALGORITHM="HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    ```

### Frontend
1.  상태 관리 라이브러리 설치 (필요 시):
    ```bash
    cd frontend
    npm install zustand
    ```

## 2. 개발 순서 (추천)

1.  **Backend Domain**: `User` 엔티티 및 `Password` 객체 정의.
2.  **Backend Adapter (DB)**: `User` SQLModel 정의 및 Migration (`alembic` 사용 여부 확인, 혹은 `create_db_and_tables` 갱신).
3.  **Backend Use Cases**:
    -   `RegisterUser`: 비밀번호 해싱 후 DB 저장.
    -   `Login`: 비밀번호 검증 후 JWT 발급.
4.  **Backend API**: `/auth` 라우터 구현 및 테스트.
5.  **Frontend**:
    -   로그인/회원가입 페이지 구현.
    -   `useAuth` 훅 구현 (Zustand + LocalStorage + API).
    -   API 클라이언트에 `Authorization` 헤더 주입 로직 추가.

## 3. 테스트 전략

-   **Backend**: `tests/unit/use_cases/test_auth.py`에서 인증 로직 TDD 수행.
-   **Integration**: DB에 실제 유저 생성 후 로그인 및 토큰 발급 테스트.
-   **Frontend**: 비로그인 상태에서 데이터 입력 -> 로그인 -> 데이터 유지 확인 (매뉴얼/E2E).
