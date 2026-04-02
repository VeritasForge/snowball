# 시세 갱신 아키텍처 개선 설계

**날짜:** 2026-04-02
**상태:** 승인됨

---

## 문제 정의

현재 구현에서 세 가지 문제가 발견됨:

1. **클라이언트가 서버 배치 작업을 트리거** — 프론트엔드가 10초마다 `POST /assets/update-all-prices`를 호출하여 서버가 외부 시세 API를 조회하도록 지시. 브라우저 탭이 여러 개이면 중복 호출, 브라우저를 닫으면 시세 갱신이 멈춤.
2. **N+1 쿼리** — 계좌 조회 후 계좌 수만큼 `SELECT asset` 쿼리가 반복 실행됨.
3. **이중 round-trip** — 가격 갱신 후 계좌 데이터를 별도 요청으로 다시 조회.

---

## 설계 결정

### 아키텍처 변경

**Before:**
```
클라이언트 (10초마다)
  ├→ POST /assets/update-all-prices  ← 외부 시세 조회 트리거
  └→ GET /accounts                  ← 결과 조회
```

**After:**
```
Cronicle (cron 배치)
  └→ uv run python backend/scripts/manage.py update-prices
       └→ 외부 시세 조회 → DB 저장 (모든 유저)

클라이언트 (10초마다)
  └→ GET /accounts  ← 최신 계산 결과만 요청
```

**원칙:** 웹 서버는 HTTP 요청 처리만. 배치 작업은 외부 스케줄러(Cronicle)가 별도 프로세스로 실행.

---

## 변경 상세

### 1. `scripts/manage.py` — `update-prices` 커맨드 추가

```python
@app.command()
def update_prices():
    """모든 사용자 자산의 현재가를 시장 데이터로 갱신"""
    # UpdateAssetPricesUseCase.execute() 호출
    # 갱신된 자산 수 출력
```

Cronicle에서 실행할 커맨드:
```bash
cd /path/to/snowball && uv run python backend/scripts/manage.py update-prices
```

### 2. `AssetRepository` — `list_all_with_code()` 추가

```python
def list_all_with_code(self) -> list[Asset]:
    """종목코드(code)가 있는 모든 자산을 단일 쿼리로 반환"""
    # SELECT asset WHERE code IS NOT NULL AND code != ''
```

### 3. `UpdateAssetPricesUseCase` — `list_all_with_code()` 사용

```python
# Before: 계좌 순회 → N+1
accounts = account_repo.list_all()
for account in accounts:
    assets = asset_repo.list_by_account(account.id)

# After: 단일 쿼리
assets = asset_repo.list_all_with_code()
```

### 4. `AccountRepository` — `list_by_user_with_assets()` 추가

```python
def list_by_user_with_assets(self, user_id: UserId) -> list[Account]:
    """유저의 계좌와 자산을 JOIN으로 단일 쿼리 반환 (joinedload)"""
    # SELECT account LEFT JOIN asset WHERE user_id = ?
```

### 5. `GET /accounts` route — `list_by_user_with_assets()` 사용

```python
@router.get("/accounts")
def list_accounts(current_user, account_repo):
    accounts = account_repo.list_by_user_with_assets(current_user.id)
    # asset_repo.list_by_account() 호출 제거
```

### 6. `POST /assets/update-all-prices` 엔드포인트 제거

배치 커맨드로 대체되므로 엔드포인트 삭제.

### 7. 프론트엔드 — `usePriceRefresh.ts` 삭제

```typescript
// 제거
import { usePriceRefresh } from './usePriceRefresh';
const { updateAllPrices } = usePriceRefresh(...)
setInterval(() => updateAllPrices(), 10000)

// 유지
setInterval(() => fetchAccounts(), 10000)
```

### 8. `Makefile` — `make update-prices` 추가

```makefile
update-prices:
    cd backend && uv run python scripts/manage.py update-prices
```

---

## 변경 범위 요약

| 파일 | 변경 유형 |
|------|---------|
| `backend/scripts/manage.py` | 수정 — `update-prices` 커맨드 추가 |
| `backend/src/snowball/adapters/db/repositories.py` | 수정 — `list_all_with_code()`, `list_by_user_with_assets()` 추가 |
| `backend/src/snowball/use_cases/assets.py` | 수정 — `list_all_with_code()` 사용 |
| `backend/src/snowball/adapters/api/routes.py` | 수정 — `list_by_user_with_assets()` 사용, `update-all-prices` 제거 |
| `frontend/src/lib/hooks/usePriceRefresh.ts` | **삭제** |
| `frontend/src/app/page.tsx` | 수정 — `updateAllPrices` 인터벌 → `fetchAccounts` 인터벌 |
| `Makefile` | 수정 — `make update-prices` 추가 |

---

## 완료 조건

- [ ] `make update-prices` 실행 시 모든 자산 현재가 갱신 및 갱신 수 출력
- [ ] `GET /accounts` 호출 시 SQLAlchemy 로그에 `SELECT asset` 쿼리가 계좌 수와 무관하게 1회만 발생
- [ ] `POST /assets/update-all-prices` 엔드포인트 404 반환
- [ ] 프론트엔드 자동 갱신이 `GET /accounts`만 호출 (Network 탭에서 확인)
- [ ] 기존 테스트 전체 통과

---

## 고려사항

- `list_all_with_code()`는 배치 전용 메서드로, 인증 없이 모든 유저 자산을 조회함. 웹 API가 아닌 CLI 커맨드에서만 호출되어야 함.
- Cronicle 배치 주기는 운영 환경에 따라 조정 (권장: 30분 이상, 시세 API 호출 비용 고려).
- `usePriceRefresh.ts` 삭제 후 `usePortfolioData.ts`에서 해당 import 제거 필요.
