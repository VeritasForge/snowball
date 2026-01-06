# API 계약서: 사용자 인증

**버전**: v1
**기본 URL**: `/api/v1`

## 1. 인증 (Auth)

### 회원가입
`POST /auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "strongpassword123"
}
```

**Response (201 Created)**:
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "created_at": "2026-01-05T12:00:00Z"
}
```

**Response (400 Bad Request)**:
- 이메일 형식이 잘못됨
- 이미 존재하는 이메일

---

### 로그인
`POST /auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "strongpassword123"
}
```

**Response (200 OK)**:
```json
{
  "access_token": "eyJhbG...",
  "token_type": "bearer"
}
```

---

### 현재 사용자 정보
`GET /users/me`
**Header**: `Authorization: Bearer <token>`

**Response (200 OK)**:
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "accounts": [
    { "id": 1, "name": "기본 계좌" }
  ]
}
```

## 2. 데이터 동기화 (Sync)

### 포트폴리오 동기화
`POST /users/sync`
**Header**: `Authorization: Bearer <token>`
**설명**: 로컬 스토리지에 있던 계좌/자산 데이터를 서버로 전송하여 병합합니다.

**Request Body**:
```json
{
  "accounts": [
    {
      "name": "내 계좌",
      "cash": 1000000,
      "assets": [
        { "name": "삼성전자", "code": "005930", ... }
      ]
    }
  ]
}
```

**Response (200 OK)**:
- 병합된 최종 계좌 목록 반환

## 3. 기존 API 변경 사항

### 계좌 관리
모든 `/accounts/*` 및 `/assets/*` API는 이제 `Authorization` 헤더가 필수입니다.
- **GET /accounts**: 현재 로그인한 사용자의 계좌만 반환.
- **POST /accounts**: 현재 로그인한 사용자의 계좌로 생성.
