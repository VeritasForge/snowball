# 시세 갱신 아키텍처 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프론트엔드가 직접 트리거하던 시세 갱신을 서버 사이드 배치 커맨드로 분리하고, N+1 쿼리를 제거한다.

**Architecture:** `manage.py`에 `update-prices` CLI 커맨드를 추가해 Cronicle이 주기적으로 실행한다. `AssetRepository`에 `list_all_with_code()` 단일 쿼리 메서드를 추가해 배치의 N+1을 제거한다. `AccountRepository`에 `list_by_user_with_assets()` joinedload 메서드를 추가해 `GET /accounts`의 N+1을 제거한다. 프론트엔드는 `usePriceRefresh` 훅을 제거하고 `GET /accounts` 폴링만 유지한다.

**Tech Stack:** Python/FastAPI/SQLModel (backend), TypeScript/Next.js (frontend), typer (CLI), SQLAlchemy joinedload

---

## 파일 구조

| 파일 | 변경 유형 | 내용 |
|------|---------|------|
| `backend/src/snowball/adapters/db/repositories.py` | 수정 | `list_all_with_code()`, `list_by_user_with_assets()` 추가 |
| `backend/src/snowball/use_cases/assets.py` | 수정 | `account_repo` 의존성 제거, `list_all_with_code()` 사용 |
| `backend/scripts/manage.py` | 수정 | `update-prices` 커맨드 추가 |
| `backend/src/snowball/adapters/api/routes.py` | 수정 | `list_by_user_with_assets()` 사용, `update-all-prices` 엔드포인트 제거 |
| `backend/tests/unit/scripts/test_manage.py` | 수정 | `update-prices` 커맨드 테스트 추가 |
| `backend/tests/integration/test_repositories.py` | 수정 | 신규 repository 메서드 테스트 추가 |
| `frontend/src/lib/hooks/usePriceRefresh.ts` | **삭제** | 배치로 대체됨 |
| `frontend/src/lib/hooks/usePortfolioData.ts` | 수정 | `usePriceRefresh` import 제거, `updateAllPrices` 반환 제거 |
| `frontend/src/app/page.tsx` | 수정 | `updateAllPrices` 인터벌 → `fetchAccounts` 인터벌 교체 |
| `Makefile` | 수정 | `make update-prices` 추가 |

---

### Task 1: `list_all_with_code()` — AssetRepository에 단일 쿼리 메서드 추가

**Files:**
- Modify: `backend/src/snowball/adapters/db/repositories.py`
- Modify: `backend/tests/integration/test_repositories.py`

- [ ] **Step 1: 기존 테스트 통과 확인 (베이스라인)**

```bash
cd backend && uv run pytest tests/integration/test_repositories.py -v
```

Expected: 전체 PASS (실패 있으면 먼저 수정)

- [ ] **Step 2: 실패하는 테스트 작성**

`backend/tests/integration/test_repositories.py` 파일 끝에 추가:

```python
def test_list_all_with_code_returns_only_assets_with_code(session):
    # Given
    from uuid import uuid4
    from src.snowball.adapters.db.models import UserModel, AccountModel, AssetModel
    user = UserModel(id=uuid4(), email="batch@test.com", password_hash="h")
    session.add(user)
    session.commit()
    account = AccountModel(name="A", cash=0.0, user_id=user.id)
    session.add(account)
    session.commit()

    asset_with_code = AssetModel(
        account_id=account.id, name="삼성전자", code="005930",
        category="주식", target_weight=50.0,
        current_price=70000.0, avg_price=65000.0, quantity=10.0
    )
    asset_no_code = AssetModel(
        account_id=account.id, name="현금성자산", code=None,
        category="기타", target_weight=50.0,
        current_price=0.0, avg_price=0.0, quantity=0.0
    )
    session.add(asset_with_code)
    session.add(asset_no_code)
    session.commit()

    # When
    repo = SqlAlchemyAssetRepository(session)
    result = repo.list_all_with_code()

    # Then
    assert len(result) == 1
    assert result[0].code == "005930"
    assert result[0].name == "삼성전자"


def test_list_all_with_code_excludes_empty_string_code(session):
    # Given
    from uuid import uuid4
    from src.snowball.adapters.db.models import UserModel, AccountModel, AssetModel
    user = UserModel(id=uuid4(), email="batch2@test.com", password_hash="h")
    session.add(user)
    session.commit()
    account = AccountModel(name="B", cash=0.0, user_id=user.id)
    session.add(account)
    session.commit()

    asset_empty_code = AssetModel(
        account_id=account.id, name="빈코드자산", code="",
        category="주식", target_weight=100.0,
        current_price=0.0, avg_price=0.0, quantity=0.0
    )
    session.add(asset_empty_code)
    session.commit()

    # When
    repo = SqlAlchemyAssetRepository(session)
    result = repo.list_all_with_code()

    # Then
    assert len(result) == 0
```

- [ ] **Step 3: 테스트 실행 — FAIL 확인**

```bash
cd backend && uv run pytest tests/integration/test_repositories.py::test_list_all_with_code_returns_only_assets_with_code tests/integration/test_repositories.py::test_list_all_with_code_excludes_empty_string_code -v
```

Expected: FAIL with `AttributeError: 'SqlAlchemyAssetRepository' object has no attribute 'list_all_with_code'`

- [ ] **Step 4: `list_all_with_code()` 구현**

`backend/src/snowball/adapters/db/repositories.py`의 `SqlAlchemyAssetRepository` 클래스 끝 (`list_by_account` 메서드 다음)에 추가:

```python
    def list_all_with_code(self) -> List[Asset]:
        statement = select(AssetModel).where(
            AssetModel.code != None,
            AssetModel.code != ""
        )
        models = self.session.exec(statement).all()
        return [self._to_entity(m) for m in models]
```

- [ ] **Step 5: 테스트 실행 — PASS 확인**

```bash
cd backend && uv run pytest tests/integration/test_repositories.py -v
```

Expected: 전체 PASS

- [ ] **Step 6: 커밋**

```bash
git add backend/src/snowball/adapters/db/repositories.py backend/tests/integration/test_repositories.py
git commit -m "feat(db): add list_all_with_code() to AssetRepository"
```

---

### Task 2: `list_by_user_with_assets()` — AccountRepository에 joinedload 메서드 추가

**Files:**
- Modify: `backend/src/snowball/adapters/db/repositories.py`
- Modify: `backend/tests/integration/test_repositories.py`

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/integration/test_repositories.py` 파일 끝에 추가:

```python
def test_list_by_user_with_assets_returns_accounts_with_assets(session):
    # Given
    from uuid import uuid4
    from src.snowball.adapters.db.models import UserModel, AccountModel, AssetModel
    user = UserModel(id=uuid4(), email="joined@test.com", password_hash="h")
    session.add(user)
    session.commit()

    account = AccountModel(name="내계좌", cash=100000.0, user_id=user.id)
    session.add(account)
    session.commit()

    asset = AssetModel(
        account_id=account.id, name="애플", code="AAPL",
        category="해외주식", target_weight=100.0,
        current_price=180.0, avg_price=150.0, quantity=5.0
    )
    session.add(asset)
    session.commit()

    # When
    from src.snowball.domain.entities import UserId
    repo = SqlAlchemyAccountRepository(session)
    result = repo.list_by_user_with_assets(UserId(user.id))

    # Then
    assert len(result) == 1
    assert result[0].name == "내계좌"
    assert len(result[0].assets) == 1
    assert result[0].assets[0].code == "AAPL"


def test_list_by_user_with_assets_only_returns_current_user_accounts(session):
    # Given — 두 유저, 각각 계좌 1개
    from uuid import uuid4
    from src.snowball.adapters.db.models import UserModel, AccountModel
    user_a = UserModel(id=uuid4(), email="a@test.com", password_hash="h")
    user_b = UserModel(id=uuid4(), email="b@test.com", password_hash="h")
    session.add(user_a)
    session.add(user_b)
    session.commit()

    session.add(AccountModel(name="A계좌", cash=0.0, user_id=user_a.id))
    session.add(AccountModel(name="B계좌", cash=0.0, user_id=user_b.id))
    session.commit()

    # When
    from src.snowball.domain.entities import UserId
    repo = SqlAlchemyAccountRepository(session)
    result = repo.list_by_user_with_assets(UserId(user_a.id))

    # Then
    assert len(result) == 1
    assert result[0].name == "A계좌"
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd backend && uv run pytest tests/integration/test_repositories.py::test_list_by_user_with_assets_returns_accounts_with_assets tests/integration/test_repositories.py::test_list_by_user_with_assets_only_returns_current_user_accounts -v
```

Expected: FAIL with `AttributeError: 'SqlAlchemyAccountRepository' object has no attribute 'list_by_user_with_assets'`

- [ ] **Step 3: `list_by_user_with_assets()` 구현**

`backend/src/snowball/adapters/db/repositories.py` 상단 import에 `selectinload` 추가:

```python
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
```

`SqlAlchemyAccountRepository` 클래스의 `list_by_user` 메서드 다음에 추가:

```python
    def list_by_user_with_assets(self, user_id: UserId) -> List[Account]:
        statement = (
            select(AccountModel)
            .where(AccountModel.user_id == user_id)
            .options(selectinload(AccountModel.assets))
        )
        models = self.session.exec(statement).all()
        return [self._to_entity(m) for m in models]
```

> **참고:** SQLModel은 `joinedload`보다 `selectinload`가 안정적으로 동작함. `selectinload`는 2개의 쿼리(accounts 1개 + assets 1개)로 N+1을 해소함.

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
cd backend && uv run pytest tests/integration/test_repositories.py -v
```

Expected: 전체 PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/src/snowball/adapters/db/repositories.py backend/tests/integration/test_repositories.py
git commit -m "feat(db): add list_by_user_with_assets() to AccountRepository"
```

---

### Task 3: `UpdateAssetPricesUseCase` — `list_all_with_code()` 사용하도록 리팩터

**Files:**
- Modify: `backend/src/snowball/use_cases/assets.py`

- [ ] **Step 1: 기존 use case 테스트 확인**

```bash
cd backend && uv run pytest tests/ -v -k "asset"
```

Expected: PASS (현재 테스트 상태 확인)

- [ ] **Step 2: `UpdateAssetPricesUseCase` 수정**

`backend/src/snowball/use_cases/assets.py`의 `UpdateAssetPricesUseCase`를 다음으로 교체:

```python
class UpdateAssetPricesUseCase:
    def __init__(self, asset_repo: AssetRepository, market_data: MarketDataProvider):
        self.asset_repo = asset_repo
        self.market_data = market_data

    def execute(self) -> int:
        assets = self.asset_repo.list_all_with_code()
        updated_count = 0

        for asset in assets:
            new_price = self.market_data.fetch_price(asset.code)
            if new_price is not None:
                asset.current_price = new_price
                self.asset_repo.save(asset)
                updated_count += 1

        return updated_count
```

> `account_repo` 파라미터가 제거됨. `list_all_with_code()`는 code가 있는 자산만 반환하므로 `if not asset.code` 조건 불필요.

- [ ] **Step 3: 전체 테스트 실행 — PASS 확인**

```bash
cd backend && uv run pytest tests/ -v
```

Expected: 전체 PASS. `UpdateAssetPricesUseCase`의 생성자 시그니처가 바뀌었으므로 호출부 오류 확인.

- [ ] **Step 4: `routes.py`에서 `UpdateAssetPricesUseCase` 호출부 수정**

`backend/src/snowball/adapters/api/routes.py`의 `update_all_prices` 함수:

```python
# Before
@router.post("/assets/update-all-prices")
def update_all_prices(
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)],
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    market_data: Annotated[RealMarketDataProvider, Depends(get_market_data)]
):
    use_case = UpdateAssetPricesUseCase(asset_repo, account_repo, market_data)
    count = use_case.execute()
    return {"ok": True, "updated_count": count}
```

이 엔드포인트는 Task 5에서 제거되므로 지금은 생성자만 수정:

```python
@router.post("/assets/update-all-prices")
def update_all_prices(
    asset_repo: Annotated[SqlAlchemyAssetRepository, Depends(get_asset_repo)],
    market_data: Annotated[RealMarketDataProvider, Depends(get_market_data)]
):
    use_case = UpdateAssetPricesUseCase(asset_repo, market_data)
    count = use_case.execute()
    return {"ok": True, "updated_count": count}
```

- [ ] **Step 5: 테스트 전체 통과 확인**

```bash
cd backend && uv run pytest tests/ -v
```

Expected: 전체 PASS

- [ ] **Step 6: 커밋**

```bash
git add backend/src/snowball/use_cases/assets.py backend/src/snowball/adapters/api/routes.py
git commit -m "refactor(use-case): remove account_repo dependency from UpdateAssetPricesUseCase"
```

---

### Task 4: `manage.py` — `update-prices` 커맨드 추가

**Files:**
- Modify: `backend/scripts/manage.py`
- Modify: `backend/tests/unit/scripts/test_manage.py`

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/tests/unit/scripts/test_manage.py` 파일 끝에 추가:

```python
def test_update_prices_reports_updated_count(db_engine):
    from uuid import uuid4
    from src.snowball.adapters.db.models import AccountModel, AssetModel

    with Session(db_engine) as session:
        user = UserModel(id=uuid4(), email="prices@test.com", password_hash="h")
        session.add(user)
        session.commit()
        account = AccountModel(name="계좌", cash=0.0, user_id=user.id)
        session.add(account)
        session.commit()
        asset = AssetModel(
            account_id=account.id, name="삼성전자", code="005930",
            category="주식", target_weight=100.0,
            current_price=70000.0, avg_price=65000.0, quantity=10.0
        )
        session.add(asset)
        session.commit()

    with patch("scripts.manage.engine", db_engine), \
         patch("scripts.manage.RealMarketDataProvider") as mock_provider_cls:
        mock_provider = mock_provider_cls.return_value
        mock_provider.fetch_price.return_value = 75000.0

        result = runner.invoke(app, ["update-prices"])

    assert result.exit_code == 0
    assert "1" in result.output  # 1개 갱신


def test_update_prices_no_assets_with_code(db_engine):
    with patch("scripts.manage.engine", db_engine), \
         patch("scripts.manage.RealMarketDataProvider"):
        result = runner.invoke(app, ["update-prices"])

    assert result.exit_code == 0
    assert "0" in result.output  # 0개 갱신
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
cd backend && uv run pytest tests/unit/scripts/test_manage.py::test_update_prices_reports_updated_count tests/unit/scripts/test_manage.py::test_update_prices_no_assets_with_code -v
```

Expected: FAIL with `No such command 'update-prices'`

- [ ] **Step 3: `update-prices` 커맨드 구현**

`backend/scripts/manage.py`에 import 추가 및 커맨드 작성:

```python
import sys
from pathlib import Path

_root = Path(__file__).parent.parent
for _p in [str(_root), str(_root / "src")]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from datetime import datetime

import typer
from sqlmodel import Session, select

from src.snowball.adapters.db.models import UserModel
from src.snowball.adapters.db.repositories import SqlAlchemyAuthRepository, SqlAlchemyAssetRepository
from src.snowball.adapters.external.market_data import RealMarketDataProvider
from src.snowball.infrastructure.db import engine
from src.snowball.infrastructure.security import PasswordHasher
from src.snowball.use_cases.assets import UpdateAssetPricesUseCase

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


@app.command()
def update_prices():
    """모든 사용자 자산의 현재가를 시장 데이터로 갱신 (배치 전용)"""
    with Session(engine) as session:
        asset_repo = SqlAlchemyAssetRepository(session)
        market_data = RealMarketDataProvider()
        use_case = UpdateAssetPricesUseCase(asset_repo, market_data)
        count = use_case.execute()
        typer.echo(f"✅ {count}개 자산 현재가 갱신 완료")


if __name__ == "__main__":
    app()
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
cd backend && uv run pytest tests/unit/scripts/test_manage.py -v
```

Expected: 전체 PASS

- [ ] **Step 5: 수동 확인 (선택)**

```bash
cd backend && uv run python scripts/manage.py update-prices
```

Expected: `✅ N개 자산 현재가 갱신 완료`

- [ ] **Step 6: 커밋**

```bash
git add backend/scripts/manage.py backend/tests/unit/scripts/test_manage.py
git commit -m "feat(cli): add update-prices command to manage.py"
```

---

### Task 5: `GET /accounts` N+1 제거 + `POST /update-all-prices` 엔드포인트 삭제

**Files:**
- Modify: `backend/src/snowball/adapters/api/routes.py`
- Modify: `backend/tests/e2e/test_accounts.py`

- [ ] **Step 1: 기존 e2e 테스트 통과 확인**

```bash
cd backend && uv run pytest tests/e2e/test_accounts.py -v
```

Expected: 전체 PASS

- [ ] **Step 2: `routes.py` 수정 — `list_accounts` 함수**

`backend/src/snowball/adapters/api/routes.py`에서 `list_accounts` 함수를 수정하고 `update_all_prices` 함수를 제거:

```python
# list_accounts 수정 (line 166-173 교체)
@router.get("/accounts", response_model=List[AccountCalculatedResponse])
def list_accounts(
    account_repo: Annotated[SqlAlchemyAccountRepository, Depends(get_account_repo)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    accounts = account_repo.list_by_user_with_assets(current_user.id)
    use_case = CalculatePortfolioUseCase()
    return [map_calculation_result(use_case.execute(acc)) for acc in accounts]
```

`update_all_prices` 함수 전체 삭제:
```python
# 이 함수 전체 삭제
@router.post("/assets/update-all-prices")
def update_all_prices(...):
    ...
```

`UpdateAssetPricesUseCase` import도 제거:
```python
# Before
from ...use_cases.assets import UpdateAssetPricesUseCase, FetchAssetInfoUseCase

# After
from ...use_cases.assets import FetchAssetInfoUseCase
```

- [ ] **Step 3: e2e 테스트에 `update-all-prices` 404 테스트 추가**

`backend/tests/e2e/test_accounts.py` 끝에 추가:

```python
def test_update_all_prices_endpoint_removed(client):
    """배치 커맨드로 대체됨 — 엔드포인트 존재하지 않아야 함"""
    response = client.post("/assets/update-all-prices")
    assert response.status_code == 404
```

- [ ] **Step 4: 전체 테스트 실행 — PASS 확인**

```bash
cd backend && uv run pytest tests/ -v
```

Expected: 전체 PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/src/snowball/adapters/api/routes.py backend/tests/e2e/test_accounts.py
git commit -m "feat(api): remove update-all-prices endpoint, use list_by_user_with_assets for GET /accounts"
```

---

### Task 6: 프론트엔드 — `usePriceRefresh` 제거, `fetchAccounts` 폴링으로 교체

**Files:**
- Delete: `frontend/src/lib/hooks/usePriceRefresh.ts`
- Modify: `frontend/src/lib/hooks/usePortfolioData.ts`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: 프론트엔드 테스트 현황 확인**

```bash
cd frontend && npm test -- --run 2>&1 | tail -20
```

Expected: 현재 테스트 통과 상태 확인

- [ ] **Step 2: `usePriceRefresh.ts` 삭제**

```bash
rm frontend/src/lib/hooks/usePriceRefresh.ts
```

- [ ] **Step 3: `usePortfolioData.ts` 수정 — `usePriceRefresh` 제거**

`frontend/src/lib/hooks/usePortfolioData.ts`를 다음으로 교체:

```typescript
import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../auth';
import { usePortfolioStore } from '../store';
import { fetchWithAuth } from '../fetchWithAuth';
import { useAccounts } from './useAccounts';
import { useAssetActions } from './useAssetActions';

export type AssetField = 'targetRatio' | 'avgPrice' | 'price' | 'qty' | 'name' | 'category' | 'code';
export type AssetFieldValue = string | number;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export const usePortfolioData = () => {
  const { isAuthenticated, token } = useAuthStore();
  const isGuest = !isAuthenticated;
  const getAuthToken = useCallback(() => token ?? localStorage.getItem('access_token'), [token]);

  const { accounts, setAccounts, isLoading, fetchAccounts } = useAccounts(isGuest);
  const { addAsset, updateAsset, deleteAsset, updateCash, fetchAssetInfo } = useAssetActions({
    isGuest, getAuthToken, accounts, setAccounts, fetchAccounts,
  });

  useEffect(() => { fetchAccounts(); }, [isGuest, token]);

  // Guest mode: refetch when store changes
  const storeAssets = usePortfolioStore(state => state.assets);
  const storeCash = usePortfolioStore(state => state.cash);
  useEffect(() => { if (isGuest) fetchAccounts(); }, [storeAssets, storeCash, isGuest]);

  const createAccount = async (name: string) => {
    if (isGuest) return { success: false, message: '게스트 모드에서는 계좌를 추가할 수 없습니다.' };
    try {
      const res = await fetchWithAuth(`${API_URL}/accounts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, cash: 0 }),
      });
      if (!res.ok) return { success: false, message: `계좌 생성 실패: ${await res.text()}` };
      const newAccount = await res.json();
      await fetchAccounts();
      return { success: true, id: newAccount.id };
    } catch { return { success: false, message: '계좌 생성 실패 (네트워크 오류)' }; }
  };

  const updateAccountName = async (accountId: number, newName: string) => {
    setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, name: newName } : acc));
    if (isGuest) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        await fetchAccounts();
      }
    } catch (e) { console.error(e); await fetchAccounts(); }
  };

  const deleteAccount = async (accountId: number): Promise<{ success: boolean; message?: string }> => {
    if (isGuest) return { success: false, message: '게스트 모드에서는 계좌를 삭제할 수 없습니다.' };
    try {
      const res = await fetchWithAuth(`${API_URL}/accounts/${accountId}`, { method: 'DELETE' });
      if (!res.ok) return { success: false, message: '계좌 삭제 실패' };
      setAccounts(prev => prev.filter(acc => acc.id !== accountId));
      return { success: true };
    } catch { return { success: false, message: '계좌 삭제 실패 (네트워크 오류)' }; }
  };

  return {
    accounts, fetchAccounts, isGuest, isLoading,
    addAsset, updateAsset, deleteAsset, updateCash, fetchAssetInfo,
    createAccount, updateAccountName, deleteAccount,
  };
};
```

- [ ] **Step 4: `page.tsx` 수정 — 인터벌 교체**

`frontend/src/app/page.tsx`에서 다음을 수정:

```typescript
// 1. import에서 updateAllPrices 제거
const {
  accounts, fetchAccounts, isGuest, isLoading,
  addAsset, updateAsset, deleteAsset, updateCash, fetchAssetInfo,
  createAccount: apiCreateAccount,
  updateAccountName: apiUpdateAccountName,
  deleteAccount: apiDeleteAccount,
  // updateAllPrices 제거
} = usePortfolioData();

// 2. isLoadingPrices state 제거
// const [isLoadingPrices, setIsLoadingPrices] = useState(false);  ← 삭제

// 3. 인터벌 교체 (51-57번 줄)
// Before:
// useEffect(() => {
//   if (isGuest || !isAutoRefreshEnabled) return;
//   const run = async () => { setIsLoadingPrices(true); await updateAllPrices(); setIsLoadingPrices(false); };
//   run();
//   const id = setInterval(run, 10000);
//   return () => clearInterval(id);
// }, [isGuest, updateAllPrices, isAutoRefreshEnabled]);

// After:
useEffect(() => {
  if (isGuest || !isAutoRefreshEnabled) return;
  const id = setInterval(() => fetchAccounts(), 10000);
  return () => clearInterval(id);
}, [isGuest, fetchAccounts, isAutoRefreshEnabled]);
```

`isLoadingPrices`를 `AssetTable`에 전달하는 부분도 수정:

```typescript
// Before
isLoadingPrices={isLoadingPrices}

// After
isLoadingPrices={false}
```

- [ ] **Step 5: 빌드 확인**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 6: 프론트엔드 테스트 실행**

```bash
cd frontend && npm test -- --run
```

Expected: 전체 PASS

- [ ] **Step 7: 커밋**

```bash
git add frontend/src/lib/hooks/usePortfolioData.ts frontend/src/app/page.tsx
git rm frontend/src/lib/hooks/usePriceRefresh.ts
git commit -m "feat(frontend): remove usePriceRefresh, poll GET /accounts for auto-refresh"
```

---

### Task 7: Makefile에 `update-prices` 추가

**Files:**
- Modify: `Makefile`

- [ ] **Step 1: Makefile 수정**

`Makefile`에 다음 추가:

```makefile
.PHONY: run be fe help list-users reset-password update-prices

# Default target
help:
	@echo "Available commands:"
	@echo "  make be                              - Run the backend server"
	@echo "  make fe                              - Run the frontend server"
	@echo ""
	@echo "  make list-users                      - 가입된 사용자 목록 조회"
	@echo "  make reset-password EMAIL=? PWD=?    - 비밀번호 재설정"
	@echo "  make update-prices                   - 모든 자산 현재가 갱신 (배치)"

# ...existing targets...

update-prices:
	cd backend && uv run python scripts/manage.py update-prices
```

- [ ] **Step 2: 동작 확인**

```bash
make help
```

Expected: `make update-prices` 항목이 출력됨

- [ ] **Step 3: 커밋**

```bash
git add Makefile
git commit -m "chore: add update-prices to Makefile"
```

---

### Task 8: 최종 검증

- [ ] **Step 1: 백엔드 전체 테스트**

```bash
cd backend && uv run pytest tests/ -v
```

Expected: 전체 PASS

- [ ] **Step 2: 프론트엔드 전체 테스트**

```bash
cd frontend && npm test -- --run
```

Expected: 전체 PASS

- [ ] **Step 3: 서버 실행 후 로그 확인**

```bash
make be
```

서버 실행 후 브라우저에서 대시보드 접속. 10초 대기 후 서버 로그 확인:

- `POST /assets/update-all-prices` 로그가 **없어야 함**
- `GET /accounts` 로그가 10초마다 **1회** 발생해야 함
- `SELECT asset` 쿼리가 계좌 수와 무관하게 **2회 이하** (accounts 쿼리 + assets selectinload 쿼리)여야 함

- [ ] **Step 4: `POST /update-all-prices` 404 확인**

```bash
curl -X POST http://localhost:8000/api/v1/assets/update-all-prices
```

Expected: `{"detail":"Not Found"}`

- [ ] **Step 5: `make update-prices` 동작 확인**

```bash
make update-prices
```

Expected: `✅ N개 자산 현재가 갱신 완료`
