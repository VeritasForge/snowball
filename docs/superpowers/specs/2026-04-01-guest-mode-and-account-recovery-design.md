# Guest Mode UX Fix & Account Recovery

**Date:** 2026-04-01
**Status:** Approved

---

## Problem Statement

1. **Guest Mode:** The app forces users to log in due to a bug in `fetchWithAuth.ts` that redirects to `/auth` when a token expires. Users with stale auth state in localStorage get stuck at the login page with no way back without knowing to manually navigate to `/`.

2. **Account Recovery:** Users who forget their email or password have no way to recover their account.

---

## Feature 1: Guest Mode UX Fix

### Root Cause

`fetchWithAuth.ts` contains:
```typescript
if (isAuthenticated) {
    logout();
    window.location.href = '/auth';  // ← forces redirect
}
```

When a user has stale `isAuthenticated: true` in localStorage (from a previous session) and the token is expired, any API call triggers a 401 → refresh fails → redirect to `/auth`. The auth page has no "continue as guest" option, so users are stuck.

### Design

**Core principle:** Never force-redirect to `/auth`. The user decides when to log in.

#### `frontend/src/lib/fetchWithAuth.ts`
- Remove `window.location.href = '/auth'`
- On token refresh failure: call `logout()` (clears tokens/state) and return the 401 response
- The caller (guest-aware hooks) already handles 401 gracefully for guests

#### `frontend/src/app/auth/page.tsx`
- Add a "← 게스트로 계속하기" link below the login/register form
- Links to `/`
- Styled as a subtle secondary action (not competing with login)

#### `frontend/src/components/Header.tsx`
- No changes needed (already shows "로그인/회원가입" for guests, email+logout for authenticated users)

### User Flow

```
앱 접속 (/)
  → 게스트 모드 대시보드 (localStorage 데이터 표시)
  → 헤더 "로그인/회원가입" 클릭
  → /auth 페이지
  → 로그인 성공
  → / (인증 모드, 게스트 데이터 서버 동기화)
```

Token expiry flow:
```
토큰 만료 → API 401 → refresh 실패
  → logout() (토큰 제거, isAuthenticated: false)
  → 게스트 모드로 자동 전환 (리다이렉트 없음)
  → 헤더에 "로그인/회원가입" 버튼 표시
```

### What Does NOT Change
- Guest data logic (`useAccounts`, `usePortfolioStore`) — already correct
- Routing/middleware — none needed
- Authenticated API calls — unchanged

---

## Feature 2: Account Recovery CLI (`manage.py`)

### Design

New file: `backend/scripts/manage.py`
New dependency: `typer` (added to `pyproject.toml`)

#### Commands

```bash
# 가입된 사용자 목록 조회 (아이디 찾기)
uv run python scripts/manage.py list-users

# 비밀번호 재설정
uv run python scripts/manage.py reset-password your@email.com newpassword123
```

#### `list-users` output
```
등록된 사용자:
  1. your@email.com    (가입일: 2024-01-15)
  2. test@gmail.com    (가입일: 2024-02-20)

총 2명
```

#### `reset-password` output
```
✅ 비밀번호가 변경되었습니다: your@email.com
```

#### Error cases
```
# 존재하지 않는 이메일
❌ 사용자를 찾을 수 없습니다: wrong@email.com

# 빈 비밀번호
❌ 비밀번호는 1자 이상이어야 합니다.
```

### Implementation Details
- Reuses existing `PasswordHasher` (bcrypt) for hashing
- Reuses existing `SqlAlchemyAuthRepository` for DB access
- Reuses existing `get_session` / DB engine setup
- No new auth endpoints — CLI only

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/lib/fetchWithAuth.ts` | Remove forced redirect to `/auth` |
| `frontend/src/app/auth/page.tsx` | Add "게스트로 계속하기" link |
| `backend/pyproject.toml` | Add `typer` dependency |
| `backend/scripts/manage.py` | New CLI (list-users, reset-password) |

---

## Completion Criteria

- [ ] Visiting `/` with no auth state shows guest dashboard (no redirect)
- [ ] Visiting `/` with expired token shows guest dashboard (no redirect to `/auth`)
- [ ] `/auth` page has visible link to return to guest mode
- [ ] `uv run python scripts/manage.py list-users` prints registered users
- [ ] `uv run python scripts/manage.py reset-password email pw` changes the password and can login with new password
- [ ] `uv run python scripts/manage.py --help` shows usage

---

## Out of Scope

- Email-based password reset
- Admin web UI
- Multi-user admin roles
