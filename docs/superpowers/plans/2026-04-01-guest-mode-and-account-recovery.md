# Guest Mode UX Fix & Account Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove forced redirect to `/auth` so the app always starts in guest mode, add a "continue as guest" link on the auth page, and provide a Typer-based CLI for account recovery.

**Architecture:** Three independent changes: (1) remove `window.location.href = '/auth'` from `fetchWithAuth.ts` so token expiry silently demotes to guest mode, (2) add a link on `/auth` to return to guest mode, (3) a `manage.py` CLI script using Typer that talks directly to the DB engine.

**Tech Stack:** Next.js/React/Zustand (frontend), FastAPI/SQLModel/Typer (backend), pytest + vitest (tests)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/lib/fetchWithAuth.ts` | Modify | Remove forced `/auth` redirect on token refresh failure |
| `frontend/tests/hooks/usePortfolioData.test.ts` | Modify | Update test expecting redirect → expect guest mode instead |
| `frontend/src/app/auth/page.tsx` | Modify | Add "게스트로 계속하기" link |
| `backend/pyproject.toml` | Modify | Add `typer` dependency |
| `backend/scripts/__init__.py` | Create | Makes scripts a package (empty) |
| `backend/scripts/manage.py` | Create | Typer CLI: `list-users`, `reset-password` |
| `backend/tests/unit/scripts/test_manage.py` | Create | Unit tests for CLI commands |

---

## Task 1: Fix fetchWithAuth — Remove Forced Redirect

**Files:**
- Modify: `frontend/src/lib/fetchWithAuth.ts:29-36`
- Modify: `frontend/tests/hooks/usePortfolioData.test.ts:72-123`

- [ ] **Step 1: Update the existing test to expect new behavior (no redirect)**

Open `frontend/tests/hooks/usePortfolioData.test.ts` and replace the test at line 72:

```typescript
test('인증된 사용자 - 토큰 갱신 실패 시 게스트 모드로 전환 (리다이렉트 없음)', async () => {
  // Given: isAuthenticated = true, 유효하지 않은 토큰
  useAuthStore.setState({
    isAuthenticated: true,
    token: 'invalid-token',
    refreshToken: 'invalid-refresh',
    user: { id: '1', email: 'test@example.com' }
  });
  localStorage.setItem('access_token', 'invalid-token');
  localStorage.setItem('refresh_token', 'invalid-refresh');

  const mockFetch = vi.fn()
    .mockResolvedValueOnce({
      status: 401, ok: false,
      text: async () => 'Unauthorized',
      json: async () => ({ detail: 'Unauthorized' })
    })
    .mockResolvedValueOnce({
      status: 401, ok: false,
      text: async () => 'Invalid refresh token',
      json: async () => ({ detail: 'Invalid refresh token' })
    });

  global.fetch = mockFetch;

  const { result } = renderHook(() => usePortfolioData());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  }, { timeout: 3000 });

  // Then: 리다이렉트 없음, 게스트 모드로 전환
  expect(window.location.href).not.toContain('/auth');
  expect(result.current.isGuest).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it now FAILS (current code still redirects)**

```bash
cd frontend && npx vitest run tests/hooks/usePortfolioData.test.ts
```

Expected: FAIL — "인증된 사용자 - 토큰 갱신 실패 시 게스트 모드로 전환" fails because current code still redirects.

- [ ] **Step 3: Fix fetchWithAuth.ts — remove the redirect**

Replace the 401 handling block in `frontend/src/lib/fetchWithAuth.ts`. The full updated file:

```typescript
import { useAuthStore, refreshAccessToken } from './auth';

export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('access_token');

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            res = await fetch(url, {
                ...options,
                headers: {
                    ...(options.headers as Record<string, string>),
                    'Authorization': `Bearer ${newToken}`
                }
            });
        } else {
            // 갱신 실패 시 로그아웃하여 게스트 모드로 전환 (강제 리다이렉트 없음)
            useAuthStore.getState().logout();
        }
    }

    return res;
};
```

- [ ] **Step 4: Run all frontend tests to verify they pass**

```bash
cd frontend && npx vitest run tests/hooks/usePortfolioData.test.ts
```

Expected: ALL PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/fetchWithAuth.ts frontend/tests/hooks/usePortfolioData.test.ts
git commit -m "fix(auth): remove forced redirect to /auth on token refresh failure

토큰 만료 시 /auth로 강제 리다이렉트 대신 로그아웃 후 게스트 모드로 전환.
사용자가 직접 로그인 버튼을 눌러 인증 페이지로 이동하도록 변경."
```

---

## Task 2: Add "게스트로 계속하기" Link to Auth Page

**Files:**
- Modify: `frontend/src/app/auth/page.tsx:135-143`

- [ ] **Step 1: Add the link below the toggle button area in auth/page.tsx**

Replace the closing `</div>` section (after the "아직 계정이 없으신가요?" toggle) in `frontend/src/app/auth/page.tsx`:

Current (lines 135–143):
```tsx
        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-muted hover:text-primary text-sm font-medium transition-colors"
          >
            {isLogin ? '아직 계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
```

Replace with:
```tsx
        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-muted hover:text-primary text-sm font-medium transition-colors"
          >
            {isLogin ? '아직 계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-border text-center">
          <Link href="/" className="text-muted hover:text-primary text-sm transition-colors">
            로그인 없이 게스트로 계속하기 →
          </Link>
        </div>
      </div>
    </div>
```

- [ ] **Step 2: Verify the page renders correctly**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/auth/page.tsx
git commit -m "feat(auth): add guest continue link to auth page

인증 페이지 하단에 '로그인 없이 게스트로 계속하기' 링크 추가.
로그인 없이도 앱을 사용할 수 있음을 명시."
```

---

## Task 3: Backend CLI — `manage.py` with Typer

**Files:**
- Modify: `backend/pyproject.toml`
- Create: `backend/scripts/__init__.py`
- Create: `backend/scripts/manage.py`
- Create: `backend/tests/unit/scripts/__init__.py`
- Create: `backend/tests/unit/scripts/test_manage.py`

- [ ] **Step 1: Write the failing tests first**

Create `backend/tests/unit/scripts/__init__.py` (empty):
```python
```

Create `backend/tests/unit/scripts/test_manage.py`:
```python
import pytest
from typer.testing import CliRunner
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from unittest.mock import patch

# These imports will fail until manage.py is created
from scripts.manage import app
from src.snowball.adapters.db.models import UserModel
from src.snowball.infrastructure.security import PasswordHasher

runner = CliRunner()

@pytest.fixture(name="db_session")
def db_session_fixture():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session, engine
    SQLModel.metadata.drop_all(engine)


def test_list_users_empty(db_session_fixture):
    session, engine = db_session_fixture
    with patch("scripts.manage.engine", engine):
        result = runner.invoke(app, ["list-users"])
    assert result.exit_code == 0
    assert "등록된 사용자가 없습니다" in result.output


def test_list_users_shows_registered_users(db_session_fixture):
    session, engine = db_session_fixture
    # Seed a user
    user = UserModel(email="alice@example.com", password_hash="hash")
    session.add(user)
    session.commit()

    with patch("scripts.manage.engine", engine):
        result = runner.invoke(app, ["list-users"])
    assert result.exit_code == 0
    assert "alice@example.com" in result.output
    assert "총 1명" in result.output


def test_reset_password_success(db_session_fixture):
    session, engine = db_session_fixture
    # Seed a user with known password
    original_hash = PasswordHasher.get_password_hash("oldpassword")
    user = UserModel(email="bob@example.com", password_hash=original_hash)
    session.add(user)
    session.commit()

    with patch("scripts.manage.engine", engine):
        result = runner.invoke(app, ["reset-password", "bob@example.com", "newpassword"])
    assert result.exit_code == 0
    assert "✅" in result.output
    assert "bob@example.com" in result.output

    # Verify password actually changed
    session.refresh(user)
    assert PasswordHasher.verify_password("newpassword", user.password_hash)
    assert not PasswordHasher.verify_password("oldpassword", user.password_hash)


def test_reset_password_user_not_found(db_session_fixture):
    session, engine = db_session_fixture
    with patch("scripts.manage.engine", engine):
        result = runner.invoke(app, ["reset-password", "nobody@example.com", "pw"])
    assert result.exit_code == 1
    assert "❌" in result.output
    assert "nobody@example.com" in result.output
```

- [ ] **Step 2: Run tests to verify they FAIL (manage.py doesn't exist yet)**

```bash
cd backend && uv run pytest tests/unit/scripts/test_manage.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'scripts'`

- [ ] **Step 3: Add typer to pyproject.toml**

In `backend/pyproject.toml`, add `"typer>=0.12.0"` to the `dependencies` list:

```toml
dependencies = [
    "fastapi>=0.128.0",
    "finance-datareader>=0.9.100",
    "lxml>=6.0.2",
    "pandas>=2.3.3",
    "passlib[bcrypt]>=1.7.4",
    "psycopg2-binary>=2.9.11",
    "pydantic>=2.12.5",
    "pyjwt>=2.10.1",
    "requests>=2.32.5",
    "sqlmodel>=0.0.31",
    "typer>=0.12.0",
    "uvicorn>=0.40.0",
]
```

Then install:
```bash
cd backend && uv sync
```

Expected: typer installed successfully.

- [ ] **Step 4: Create scripts/__init__.py**

Create `backend/scripts/__init__.py` (empty file):
```python
```

- [ ] **Step 5: Create manage.py**

Create `backend/scripts/manage.py`:

```python
from datetime import datetime

import typer
from sqlmodel import Session, select

from src.snowball.adapters.db.models import UserModel
from src.snowball.adapters.db.repositories import SqlAlchemyAuthRepository
from src.snowball.infrastructure.db import engine
from src.snowball.infrastructure.security import PasswordHasher

app = typer.Typer(help="Snowball 관리 CLI")


@app.command()
def list_users():
    """가입된 사용자 목록 조회 (아이디 찾기)"""
    with Session(engine) as session:
        users = session.exec(select(UserModel)).all()
        if not users:
            typer.echo("등록된 사용자가 없습니다.")
            return
        typer.echo("등록된 사용자:")
        for i, user in enumerate(users, 1):
            typer.echo(f"  {i}. {user.email}  (가입일: {user.created_at.strftime('%Y-%m-%d')})")
        typer.echo(f"\n총 {len(users)}명")


@app.command()
def reset_password(
    email: str = typer.Argument(..., help="사용자 이메일"),
    new_password: str = typer.Argument(..., help="새 비밀번호"),
):
    """비밀번호 재설정"""
    with Session(engine) as session:
        repo = SqlAlchemyAuthRepository(session)
        user = repo.get_by_email(email)
        if not user:
            typer.echo(f"❌ 사용자를 찾을 수 없습니다: {email}", err=True)
            raise typer.Exit(1)

        user.password_hash = PasswordHasher.get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        repo.save(user)
        typer.echo(f"✅ 비밀번호가 변경되었습니다: {email}")


if __name__ == "__main__":
    app()
```

- [ ] **Step 6: Run tests to verify they PASS**

```bash
cd backend && uv run pytest tests/unit/scripts/test_manage.py -v
```

Expected:
```
PASSED tests/unit/scripts/test_manage.py::test_list_users_empty
PASSED tests/unit/scripts/test_manage.py::test_list_users_shows_registered_users
PASSED tests/unit/scripts/test_manage.py::test_reset_password_success
PASSED tests/unit/scripts/test_manage.py::test_reset_password_user_not_found
```

- [ ] **Step 7: Verify the full backend test suite still passes**

```bash
cd backend && uv run pytest -v
```

Expected: All existing tests still pass.

- [ ] **Step 8: Manual smoke test**

```bash
cd backend && uv run python scripts/manage.py --help
```

Expected:
```
Usage: manage.py [OPTIONS] COMMAND [ARGS]...

  Snowball 관리 CLI

Commands:
  list-users      가입된 사용자 목록 조회 (아이디 찾기)
  reset-password  비밀번호 재설정
```

- [ ] **Step 9: Commit**

```bash
git add backend/pyproject.toml backend/scripts/ backend/tests/unit/scripts/
git commit -m "feat(cli): add manage.py with typer for account recovery

- list-users: 가입된 사용자 목록 조회
- reset-password: 이메일로 비밀번호 재설정
uv run python scripts/manage.py --help 로 사용법 확인"
```

---

## Completion Criteria Checklist

- [ ] `fetchWithAuth.ts`에서 `window.location.href = '/auth'` 코드가 제거됨
- [ ] 토큰 만료된 인증 사용자가 페이지 로드 시 게스트 모드로 전환 (리다이렉트 없음)
- [ ] `/auth` 페이지 하단에 "로그인 없이 게스트로 계속하기" 링크 존재
- [ ] `uv run python scripts/manage.py list-users` 가 사용자 목록 출력
- [ ] `uv run python scripts/manage.py reset-password email pw` 가 비밀번호 변경
- [ ] `uv run python scripts/manage.py --help` 가 사용법 출력
- [ ] 모든 프론트엔드 테스트 통과 (`npx vitest run`)
- [ ] 모든 백엔드 테스트 통과 (`uv run pytest`)
