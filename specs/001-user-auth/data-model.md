# 데이터 모델 정의: 사용자 인증

**관련 기능**: 001-user-auth
**작성일**: 2026-01-05

## 엔티티 (Entities)

### 1. User (신규)
사용자 계정을 나타내는 최상위 엔티티입니다.

| 필드명 | 타입 | 필수 여부 | 설명 |
|---|---|---|---|
| `id` | `UUID` | Yes | 고유 식별자 |
| `email` | `str` | Yes | 로그인 ID (Unique) |
| `password_hash` | `str` | Yes | bcrypt로 해싱된 비밀번호 |
| `created_at` | `datetime` | Yes | 가입 일시 |
| `updated_at` | `datetime` | Yes | 수정 일시 |

### 2. Account (수정)
기존 `Account` 엔티티에 소유자(`user_id`) 정보를 추가합니다.

| 필드명 | 타입 | 필수 여부 | 설명 |
|---|---|---|---|
| `id` | `int` | Yes | 고유 식별자 |
| `user_id` | `UUID` | Yes (FK) | **(신규)** 소유자 User ID |
| `name` | `str` | Yes | 계좌명 (예: "내 연금저축") |
| `cash` | `float` | Yes | 예수금 |
| `assets` | `List[Asset]` | No | 보유 자산 목록 |

### 3. Asset (기존 유지)
`Account`에 종속되므로 스키마 변경 불필요.

## 검증 규칙 (Validation Rules)

1.  **Email**: 유효한 이메일 형식이어야 함.
2.  **Password**: 최소 8자 이상 (정책에 따라 조정).
3.  **Account Ownership**: 모든 `Account`는 반드시 유효한 `User`에게 귀속되어야 함.

## 데이터베이스 스키마 (SQLModel)

```python
class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    accounts: List["Account"] = Relationship(back_populates="user")

class Account(SQLModel, table=True):
    # ... 기존 필드 ...
    user_id: UUID = Field(foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="accounts")
```
