# 포트폴리오 프리셋 저장/불러오기 기능 설계

**작성일**: 2026-05-28
**작성자**: brainstorming session (Claude Sonnet 4.6 + 사용자)
**관련 컴포넌트**: `AssetTable`, `DashboardClient`

---

## 1. 배경 및 목적

스노우볼 사용자는 AssetTable에서 종목별 목표비중(target_weight)을 입력해 자산 배분을 정의한다. 현재는 매번 수동으로 입력해야 하며, 동일한 배분 전략(예: S&P500 3-Fund, All-Weather Portfolio)을 여러 계좌에 적용하거나 재사용할 방법이 없다.

본 기능은 **자산 배분 비중을 프리셋으로 저장하고, 다른 계좌나 시점에 재사용할 수 있게** 한다.

---

## 2. 요구사항

### 2.1 기능 요구사항

| ID | 요구사항 |
|----|----------|
| FR-1 | 사용자는 현재 계좌의 자산 목록을 프리셋으로 저장할 수 있다 |
| FR-2 | 프리셋에는 **종목명·코드·분류·목표비중**만 저장된다 (평단가·수량·현재가 제외) |
| FR-3 | 프리셋은 **사용자 범위**다 — 한 사용자의 어떤 계좌에도 적용 가능 |
| FR-4 | 사용자는 자신의 프리셋 목록을 조회/삭제할 수 있다 |
| FR-5 | 프리셋을 계좌에 적용 시 **덧써쓰기** 방식으로 동작 — 기존 자산은 유지, 일치하는 종목은 비중 업데이트, 신규 종목은 추가 |
| FR-6 | 프리셋 관리 UI는 AssetTable 툴바의 `📂 프리셋 관리` 버튼으로 진입하는 전용 모달 |
| FR-7 | 프리셋 저장/적용 시 `target_weight` 합계가 100%를 넘거나 미달해도 허용한다. 사용자에게는 기존 AssetTable의 잔여비중 표시(`초과 N.N%` / `잔여 N.N%`)로 피드백된다 |

### 2.2 비기능 요구사항

| ID | 요구사항 |
|----|----------|
| NFR-1 | 모든 프리셋 데이터는 서버 DB에 영속 저장 (localStorage 미사용) |
| NFR-2 | 모든 API는 JWT 인증 필수 |
| NFR-3 | IDOR 방지 — 모든 프리셋·계좌 접근 시 user_id 검증 |
| NFR-4 | 백엔드 테스트 커버리지 100% (프로젝트 기준 동일) |
| NFR-5 | React 19 / Next.js 16 컴포넌트는 Vercel best-practices 준수 (`bundle-dynamic-imports`, `architecture-avoid-boolean-props`, `rerender-functional-setstate`, `react19-no-forwardref`) |

### 2.3 범위 외 (Out of Scope)

- 프리셋 공유 (사용자 간)
- 프리셋 추천 (관리자 제공)
- 프리셋 버전 관리
- 적용 전 프리뷰 화면
- 적용 후 undo
- 프리셋에 cash 비중 포함

---

## 3. 데이터 모델

### 3.1 AssetCategory StrEnum 도입 (기존 코드 마이그레이션 포함)

현재 코드베이스는 `category: str = "주식"` magic string을 사용 중. 본 기능의 PresetItem에 StrEnum을 적용하면서, **기존 Asset 코드까지 함께 마이그레이션**한다.

```python
# backend/src/snowball/domain/enums.py (신규)
from enum import StrEnum

class AssetCategory(StrEnum):
    STOCK     = "주식"
    BOND      = "채권"
    COMMODITY = "원자재"
    CASH      = "현금"
    OTHER     = "기타"
```

### 3.2 도메인 엔티티

```python
# backend/src/snowball/domain/entities.py (추가)
from .enums import AssetCategory

@dataclass
class PresetItem:
    name: str
    category: AssetCategory
    target_weight: float
    id: int | None = None
    preset_id: int | None = None
    code: str | None = None

@dataclass
class Preset:
    name: str
    user_id: UserId
    id: int | None = None
    created_at: datetime | None = None
    items: list[PresetItem] = field(default_factory=list)
```

기존 `Asset` 엔티티의 `category: str`도 `category: AssetCategory`로 변경.

### 3.3 DB 모델

```python
# backend/src/snowball/adapters/db/models.py (추가)
class PresetModel(SQLModel, table=True):
    __tablename__ = "preset"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    user_id: UUID = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: UserModel | None = Relationship(back_populates="presets")
    items: list["PresetItemModel"] = Relationship(
        back_populates="preset",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class PresetItemModel(SQLModel, table=True):
    __tablename__ = "preset_item"
    id: int | None = Field(default=None, primary_key=True)
    preset_id: int = Field(foreign_key="preset.id", index=True)
    name: str
    code: str | None = None
    category: AssetCategory = AssetCategory.STOCK
    target_weight: float = 0.0

    preset: PresetModel | None = Relationship(back_populates="items")
```

`UserModel.presets` 역방향 관계도 추가 (cascade delete).

### 3.4 마이그레이션 범위 (기존 코드 변경)

| 파일 | 변경 |
|------|------|
| `domain/enums.py` | **신규** — `AssetCategory` 정의 |
| `domain/entities.py` | `Asset.category: str` → `AssetCategory`; `Optional[X]` → `X \| None`; PresetItem/Preset 추가 |
| `domain/services.py` | `infer_category()` 반환 타입 `str` → `AssetCategory` |
| `adapters/db/models.py` | `AssetModel.category: str` → `AssetCategory`; PresetModel/PresetItemModel 추가 |
| `adapters/api/dtos.py` | `category: str`/`Optional[str]` → `AssetCategory`/`AssetCategory \| None` |
| `use_cases/sync.py` | `"주식"` 기본값 → `AssetCategory.STOCK` |

### 3.5 테스트 코드 영향

| 파일 | 변경 |
|------|------|
| `tests/unit/domain/test_services.py` | parametrize `"주식"/"채권"/...` → `AssetCategory.STOCK/BOND/...` |
| `tests/unit/use_cases/test_asset_use_cases.py` | mock 데이터 `"category": "주식"` → `AssetCategory.STOCK` |
| `tests/integration/test_repositories.py` | `category="주식"` → `AssetCategory.STOCK` |
| `tests/unit/scripts/test_manage.py` | `category="주식"` → `AssetCategory.STOCK` |
| `tests/e2e/test_finance.py` | JSON 응답 비교는 수정 불필요 (StrEnum 직렬화 = 동일 문자열) |

---

## 4. API 설계

### 4.1 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/v1/presets` | 내 프리셋 목록 (items 포함) |
| `POST` | `/api/v1/presets` | 프리셋 생성 |
| `DELETE` | `/api/v1/presets/{preset_id}` | 프리셋 삭제 |
| `POST` | `/api/v1/presets/{preset_id}/apply/{account_id}` | 계좌에 적용 (덧써쓰기) |

### 4.2 DTOs

```python
# Request
class PresetItemCreate(BaseModel):
    name: str
    code: str | None = None
    category: AssetCategory
    target_weight: float = Field(ge=0, le=100)

class PresetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    items: list[PresetItemCreate] = Field(min_length=1)

# Response
class PresetItemResponse(BaseModel):
    id: int
    name: str
    code: str | None
    category: AssetCategory
    target_weight: float

class PresetResponse(BaseModel):
    id: int
    name: str
    created_at: str
    items: list[PresetItemResponse]
```

### 4.3 적용(apply) 알고리즘 — 덧써쓰기

```
입력: preset_id, account_id (둘 다 current_user 소유여야 함)

1. preset_id로 PresetItem 목록 조회
2. account_id로 계좌의 Asset 목록 조회
3. 프리셋 각 item에 대해:
   a. 매칭 로직:
      - item.code가 있으면 → account.assets 중 code 일치 자산 검색
      - item.code가 없으면 → account.assets 중 name 일치 자산 검색
   b. 매칭됨 → asset.target_weight, category, name을 item 값으로 업데이트
              (avg_price, quantity, current_price는 보존)
   c. 매칭 안됨 → 신규 Asset 생성 (avg_price=0, quantity=0, current_price=0)
4. CalculatePortfolioUseCase 실행 후 결과 반환
```

응답: `AccountCalculatedResponse` (기존 portfolio 계산 결과와 동일 형식)

### 4.4 보안

- 모든 엔드포인트: `get_current_user` 의존성 주입
- 프리셋 접근 시 `preset.user_id != current_user.id` → 403
- apply 시 `account.user_id != current_user.id` → 403
- preset_id, account_id 둘 다 not found → 404

---

## 5. 프론트엔드 설계

### 5.1 신규 파일

```
frontend/src/
├── components/
│   └── PresetManagerModal.tsx     # 프리셋 관리 모달
└── lib/hooks/
    └── usePresets.ts              # 프리셋 CRUD 훅
```

### 5.2 usePresets 훅

```typescript
// rerender-functional-setstate 적용
export function usePresets(options?: { onError?: (msg: string) => void }) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPresets = async () => { /* GET /presets */ }
  const createPreset = async (name: string, items: PresetItemInput[]) => {
    /* POST /presets, setPresets(prev => [...prev, newPreset]) */
  }
  const deletePreset = async (presetId: number) => {
    /* DELETE /presets/:id, setPresets(prev => prev.filter(...)) */
  }
  const applyPreset = async (presetId: number, accountId: number)
    : Promise<Account> => { /* POST /presets/:id/apply/:accountId */ }

  return { presets, isLoading, fetchPresets, createPreset, deletePreset, applyPreset }
}
```

### 5.3 PresetManagerModal 컴포넌트

```typescript
// architecture-avoid-boolean-props 적용: isOpen prop 없음, 부모가 조건부 마운트
interface PresetManagerModalProps {
  account: Account                // 현재 계좌 (저장 시 items 추출 + 적용 대상)
  onClose: () => void
  onApplied: (updated: Account) => void
  showToast: (msg: string, type?: 'info' | 'error') => void
}
```

내부 구조 (목업 옵션 C):
- 탭: `[불러오기]` `[현재 배분 저장]`
- **불러오기**: 프리셋 목록 + 각 행 `적용` 버튼 + `삭제` 아이콘
- **저장**: 이름 입력 + 현재 계좌 종목 미리보기(chips) + `저장` 버튼

### 5.4 AssetTable 변경

```diff
interface AssetTableProps {
  ...
+ onOpenPresetManager: () => void
}

// 툴바 (실시간 시세 버튼 옆)
+ <button onClick={onOpenPresetManager}>📂 프리셋 관리</button>
```

### 5.5 DashboardClient 통합

```tsx
// bundle-dynamic-imports 적용
import dynamic from 'next/dynamic'
const PresetManagerModal = dynamic(() =>
  import('./PresetManagerModal').then(m => ({ default: m.PresetManagerModal }))
)

const [isPresetModalOpen, setIsPresetModalOpen] = useState(false)

return (
  <>
    <AssetTable
      ...
      onOpenPresetManager={() => setIsPresetModalOpen(true)}
    />

    {/* architecture-avoid-boolean-props: 조건부 마운트 */}
    {isPresetModalOpen && (
      <PresetManagerModal
        account={activeAccount}
        onClose={() => setIsPresetModalOpen(false)}
        onApplied={(updated) => {
          setAccounts(prev =>
            prev.map(a => a.id === updated.id ? updated : a)
          )
        }}
        showToast={showToast}
      />
    )}
  </>
)
```

### 5.6 적용 Vercel 룰 요약

| 룰 | 적용 위치 |
|----|----------|
| `bundle-dynamic-imports` | `PresetManagerModal` import 시 `next/dynamic` |
| `architecture-avoid-boolean-props` | `isOpen` prop 제거, 부모가 조건부 마운트 |
| `rerender-functional-setstate` | `usePresets`의 모든 setState |
| `react19-no-forwardref` | Context 사용 시 `useContext` 대신 `use()` |

---

## 6. 에러 처리

### 6.1 Backend

| 케이스 | 응답 |
|--------|------|
| 프리셋 소유자 불일치 | 403 Forbidden |
| 적용 대상 계좌 소유자 불일치 | 403 Forbidden |
| 프리셋·계좌 not found | 404 Not Found |
| `target_weight` 음수 or > 100 | 400 Bad Request (Pydantic) |
| `items` 빈 배열 | 400 Bad Request (Pydantic) |
| `name` 빈 문자열 | 400 Bad Request (Pydantic) |
| **target_weight 합계 > 100%** | **허용** (기존 AssetTable 잔여비중 표시가 처리) |

### 6.2 Frontend

| 시나리오 | 처리 |
|---------|------|
| `fetchPresets` 실패 | 모달 내 인라인 에러 메시지 |
| `createPreset` 실패 | `showToast('프리셋 저장 실패', 'error')` |
| `deletePreset` 실패 | `showToast('삭제 실패', 'error')` |
| `applyPreset` 실패 | `showToast('프리셋 적용 실패', 'error')` |
| `applyPreset` 성공 | 모달 닫기 + `showToast('적용됐습니다', 'info')` |

---

## 7. 테스트 전략

### 7.1 Backend (TDD — Happy/Boundary/Error 3-카테고리)

```
unit/domain/test_preset_entities.py
  [Happy]    PresetItem 정상 생성 (AssetCategory enum 값)
  [Boundary] target_weight=0, items=[]
  [Error]    target_weight 음수 → 검증 실패

unit/use_cases/test_preset_use_cases.py
  [Happy]    create / list / delete / apply 정상 흐름
  [Boundary] apply 시 code 없는 item → name으로 매칭
             apply 시 기존 자산 있음 → weight만 업데이트 (avg_price/quantity 보존)
             apply 시 기존 자산 없음 → 신규 생성
  [Error]    소유자 불일치 → 예외

integration/test_preset_repositories.py
  [Happy]    DB 저장·조회·삭제
  [Boundary] items 1개 / 다수
  [Error]    cascade delete 동작 검증

e2e/test_presets.py
  [Happy]    CRUD + apply 전체 플로우 (JWT 포함)
  [Error]    타인 preset 접근 → 403
             없는 preset_id → 404
```

### 7.2 기존 코드 마이그레이션 검증

```
모든 기존 테스트 PASS 유지 — AssetCategory StrEnum 도입 후에도 회귀 없음
e2e/test_assets.py, integration/test_repositories.py, unit/domain/test_services.py
```

### 7.3 Frontend (Vitest)

```
tests/hooks/usePresets.test.ts
  [Happy]    fetch / create / delete / apply 정상 응답 처리
  [Boundary] 빈 목록 반환
  [Error]    API 실패 → 에러 상태 + onError 호출

tests/components/PresetManagerModal.test.tsx
  [Happy]    불러오기 탭: 목록 렌더링, 적용 버튼 클릭 → onApplied 호출
             저장 탭: 이름 입력, 저장 버튼 클릭 → createPreset 호출
  [Boundary] 프리셋 0개 → 빈 상태 메시지
             account.assets 0개 → 저장 버튼 비활성
  [Error]    apply 실패 → showToast('적용 실패', 'error') 호출 확인
```

---

## 8. 마이그레이션·롤아웃

### 8.1 DB 마이그레이션 순서

1. `AssetCategory` StrEnum 코드 배포 (SQLModel은 enum을 문자열로 저장 → 기존 데이터 호환)
2. `preset`, `preset_item` 테이블 생성 (SQLModel.metadata.create_all 또는 alembic)
3. 기존 `asset.category` 데이터는 변경 없음 (값은 동일)

### 8.2 배포 단계

```
Step 1: 백엔드 — AssetCategory 마이그레이션 + Preset 모델/API 배포
        (기존 API 응답 형식 동일, 호환성 유지)
Step 2: 프론트엔드 — usePresets, PresetManagerModal, AssetTable 변경 배포
```

---

## 9. 완료 조건

- [ ] `domain/enums.py`에 `AssetCategory` 정의됨
- [ ] 기존 Asset/Service/Model/DTO/Test 코드 모두 `AssetCategory` 적용
- [ ] `PresetModel`, `PresetItemModel` DB 테이블 생성
- [ ] `Preset`, `PresetItem` 도메인 엔티티 + Use case + Repository 구현
- [ ] 4개 엔드포인트 (GET/POST/DELETE/POST apply) 동작
- [ ] `usePresets` 훅 구현
- [ ] `PresetManagerModal` 컴포넌트 구현 (저장/불러오기/삭제/적용)
- [ ] `AssetTable` 툴바에 `📂 프리셋 관리` 버튼 추가 + `DashboardClient` 통합 (dynamic import + 조건부 마운트)
- [ ] 모든 백엔드 테스트 100% 통과 + 커버리지 100%
- [ ] 모든 프론트엔드 테스트 100% 통과
- [ ] 기존 테스트 회귀 없음
- [ ] 수동 검증: 프리셋 저장 → 다른 계좌에 적용 → 자산 추가/비중 업데이트 확인

---

## 10. 금지 사항

- ❌ `Optional[X]` 사용 → ✅ `X | None` 사용
- ❌ `category` magic string 사용 → ✅ `AssetCategory` StrEnum 사용
- ❌ 프리셋에 평단가·수량·현재가 저장 → ✅ 종목명·코드·분류·비중만 저장
- ❌ `PresetManagerModal`을 정적 import → ✅ `next/dynamic` 사용
- ❌ `isOpen` boolean prop 전달 → ✅ 부모가 조건부 마운트
- ❌ `setPresets([...presets, x])` → ✅ `setPresets(prev => [...prev, x])`
- ❌ 프리셋 적용 시 기존 자산 삭제 → ✅ 덧써쓰기 (보존 + 업데이트 + 추가)
- ❌ localStorage 사용 → ✅ 서버 DB 영속 저장

---

## 11. 고려 사항

### 성능
- 프리셋 목록 조회 시 `items` eager loading (N+1 방지)
- 프론트엔드: `PresetManagerModal`은 동적 import로 초기 번들 미포함

### 보안
- IDOR 방지 — 모든 API에서 `current_user.id` 기반 소유권 검증
- 프리셋 이름·종목명 입력은 Pydantic max_length로 제한

### 확장성
- 향후 프리셋 공유 기능 추가 시 `Preset` 테이블에 `is_public` 컬럼 추가로 확장 가능 (이번 범위 아님)
- 향후 적용 전 프리뷰 화면 추가 시 apply 알고리즘을 dry-run 모드로 분리 가능

### UX
- 프리셋 적용은 비파괴적(덧써쓰기)이므로 확인 모달 없음
- 단, 삭제는 확인 모달 필요 (기존 자산 삭제 패턴과 동일)

---

## 12. 제약 사항

- 백엔드: Python 3.12, FastAPI, SQLModel, pytest 100% 커버리지
- 프론트엔드: React 19, Next.js 16, Vitest, Vercel best-practices
- DB: 기존 PostgreSQL/SQLite 호환
- 인증: 기존 JWT 인프라 재사용

---

## 13. 참고 자료

- 사용자 피드백 메모리: `feedback-python-typing-style.md`, `feedback-vercel-skills-timing.md`
- 프로젝트 규칙: `.claude/rules/python-domain-types.md` (StrEnum 사용 규칙)
- Vercel 룰: `bundle-dynamic-imports`, `architecture-avoid-boolean-props`, `rerender-functional-setstate`, `react19-no-forwardref`
- 기존 패턴: API envelope 없음 (`snowball-api-no-envelope-pattern`)
- 도메인 패턴: `docs/solutions/security/idor-prevention.md`
