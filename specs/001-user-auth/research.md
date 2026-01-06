# 기술 조사 및 의사결정: 사용자 인증

**관련 기능**: 001-user-auth
**작성일**: 2026-01-05

## 1. 인증 방식 (Authentication Strategy)

### 결정: JWT (JSON Web Tokens)
-   **선택 이유**:
    -   FastAPI 및 현대적인 웹/앱 아키텍처의 표준.
    -   Stateless하여 서버 확장성에 유리함.
    -   Next.js 프론트엔드와 분리된 백엔드 통신에 적합.
-   **대안 고려**:
    -   **Server-side Session**: Redis 등 추가 인프라 필요, 모바일 확장 시 번거로움.
-   **구현 상세**:
    -   `Access Token`: 수명 30분, 메모리 저장 (프론트).
    -   `Refresh Token`: 수명 7일, `httpOnly` 쿠키 저장 (보안 강화).
    -   라이브러리: `PyJWT` (Backend), `next-auth` (Frontend - 고려했으나, 커스텀 백엔드와 연동이 복잡할 수 있어 직접 구현 or 가벼운 라이브러리 사용).
    -   **Frontend 결정**: 직접 API 호출 및 Context/Zustand로 상태 관리 (NextAuth.js는 오버헤드가 클 수 있음).

## 2. 비밀번호 암호화 (Password Hashing)

### 결정: Passlib + bcrypt
-   **선택 이유**:
    -   Python 생태계의 표준 라이브러리.
    -   `bcrypt`는 검증된 보안성을 제공.
-   **구현 상세**:
    -   `passlib.context.CryptContext(schemes=["bcrypt"], deprecated="auto")`

## 3. 데이터 동기화 전략 (Sync Strategy)

### 결정: 서버 우선 정책 (Server-First with Migration Support)
-   **시나리오**:
    1.  **Guest -> Login**:
        -   서버에 데이터가 **없음**: 로컬 데이터를 서버로 자동 업로드 (마이그레이션).
        -   서버에 데이터가 **있음**: 서버 데이터를 로컬로 덮어씌움 (Spec FR-004 준수).
            -   *Edge Case*: 로컬 데이터가 유의미할 수 있으므로, 덮어쓰기 전 "서버 데이터로 교체됩니다" 알림 정도는 UX 차원에서 고려. (MVP는 자동 교체).
-   **구현 위치**: `SyncPortfolioUseCase` (Backend) 또는 로그인 성공 후 프론트엔드 로직.
    -   **Backend 처리 권장**: 로그인 API 호출 시 로컬 포트폴리오 데이터를 옵션으로 함께 전송 -> 백엔드에서 판단 후 병합/무시 결정하여 최종 상태 반환.

## 4. 클린 아키텍처 적용 (Clean Architecture)

-   **Domain**: `User` 엔티티, `Password` 값 객체 (암호화 로직 포함 X, 인터페이스만 정의).
-   **Use Cases**: `RegisterUser`, `Login`, `AuthenticateRequest` (토큰 검증).
-   **Adapters**: `AuthRepository` (DB 접근), `TokenService` (JWT 발급/검증).
-   **Infrastructure**: `PasslibHasher`, `PyJWTService`.

## 5. 프론트엔드 상태 관리

### 결정: Zustand + LocalStorage
-   **선택 이유**: Redux보다 가볍고 보일러플레이트가 적음.
-   **구현**:
    -   `useAuthStore`: `user`, `token`, `isAuthenticated`, `isGuest` 상태 관리.
    -   `PortfolioStore`: `localStorage` 연동 (Guest 모드). 로그인 시 API 모드로 전환.
