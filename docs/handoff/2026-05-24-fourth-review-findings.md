# 4차 ce-code-review 핸드오프

**기준 커밋**: `5052e65` → **HEAD**: `f9d3b72`
**리뷰 명령**: `ce-code-review mode:report-only base:5052e65`
**날짜**: 2026-05-24
**상태**: 작업 중단, 다음 세션에서 계속

## 전체 작업 검증 명령

```bash
cd frontend && npm run test:coverage
# 목표: 100% Stmts / Branch / Funcs / Lines, 0 failures
```

---

## P1 — 즉시 수정 필요

### [#1] AssetRow.tsx — 삭제 버튼 3개 aria-label 누락 ⭐ safe_auto

**파일**: `frontend/src/components/AssetRow.tsx:148-152`

```tsx
// 현재 (line ~148):
<button onClick={() => onDeleteAsset(item.id!)} className="bg-danger text-white p-1.5 rounded-lg">
<button onClick={() => onSetDeleteConfirmId(null)} className="bg-secondary p-1.5 rounded-lg text-muted">
// ...
<button onClick={() => onSetDeleteConfirmId(item.id!)} className="text-muted hover:text-danger ...">

// 수정 후:
<button onClick={() => onDeleteAsset(item.id!)} aria-label="자산 삭제 확인" className="bg-danger text-white p-1.5 rounded-lg">
<button onClick={() => onSetDeleteConfirmId(null)} aria-label="자산 삭제 취소" className="bg-secondary p-1.5 rounded-lg text-muted">
// ...
<button onClick={() => onSetDeleteConfirmId(item.id!)} aria-label="자산 삭제" className="text-muted hover:text-danger ...">
```

---

### [#2] Home.test.tsx — BUY/SELL 픽스처 타입 누락 ⭐ safe_auto

**파일**: `frontend/tests/integration/Home.test.tsx`
**위치**: 줄 ~225, 253, 444, 475, 505, 532 (총 6개)

```typescript
// 현재:
const mockAssetWithBuy = {
  id: 1, account_id: 1, name: 'Samsung', code: '005930', category: '주식',
  target_weight: 60, current_price: 70000, avg_price: 65000, quantity: 10,
  ...
};

// 수정 후 (모든 BUY/SELL 픽스처 객체에 ': Asset' 추가):
const mockAssetWithBuy: Asset = {
  id: 1, account_id: 1, name: 'Samsung', code: '005930', category: '주식',
  target_weight: 60, current_price: 70000, avg_price: 65000, quantity: 10,
  current_value: 700000, invested_amount: 650000, pl_amount: 50000, pl_rate: 7.69,
  current_weight: 50, target_value: 840000, diff_value: 140000, action: 'BUY',
  action_quantity: 2,
};
```

---

### [#3] Home.test.tsx — `undefined as unknown as number` 이중 캐스트 ⚠️ gated (결정 필요)

**파일**: `frontend/tests/integration/Home.test.tsx:314`

```typescript
// 현재:
const accountWithNoCash = { ...mockAccount, cash: undefined as unknown as number };
```

**결정 필요 (어느 쪽을 선택할지 알려주세요)**:

**옵션 A**: `types.ts`에서 `Account.cash`를 `number | undefined`로 변경
```typescript
// frontend/src/types.ts
export interface Account {
  cash: number | undefined;  // number → number | undefined
  // ...
}
```

**옵션 B**: 이 분기 커버리지를 포기하고 `/* v8 ignore */` 추가 후 테스트 제거
```typescript
// page.tsx에서 해당 줄에:
const cashAmount = activeAccount.cash /* v8 ignore next */ ?? 0;
// 그리고 Home.test.tsx:314 테스트 삭제
```

> **추천**: 옵션 A. `Account.cash`가 실제로 없을 수 있는 상황(API 응답 불완전 등)을 타입에 반영하는 것이 더 정직함.

---

### [#4] Home.test.tsx — HOLD/BUY 픽스처 중복 9개 → 모듈 레벨 상수 추출 ⭐ manual

**파일**: `frontend/tests/integration/Home.test.tsx`
**위치**: `mockAccount` 상수 선언 바로 아래에 추가

```typescript
// 추가할 위치: mockAccount 상수 아래
const HOLD_ASSET: Asset = {
  id: 1, account_id: 1, name: 'Samsung', code: '005930', category: '주식',
  target_weight: 50, current_price: 70000, avg_price: 65000, quantity: 10,
  current_value: 700000, invested_amount: 650000, pl_amount: 50000, pl_rate: 7.69,
  current_weight: 50, target_value: 700000, diff_value: 0, action: 'HOLD',
  action_quantity: 0,
};

const BUY_ASSET: Asset = {
  ...HOLD_ASSET,
  target_weight: 60,
  target_value: 840000,
  diff_value: 140000,
  action: 'BUY',
  action_quantity: 2,
};

const SELL_ASSET: Asset = {
  ...HOLD_ASSET,
  target_weight: 40,
  target_value: 560000,
  diff_value: -140000,
  action: 'SELL',
  action_quantity: -2,
};
```

그리고 기존의 모든 인라인 픽스처 객체를 이 상수로 교체.

---

### [#5] Home.test.tsx — `계좌 추가 확인` 버튼 통합 테스트 누락 ⭐ manual

**파일**: `frontend/tests/integration/Home.test.tsx`
**위치**: `계좌 추가` 관련 테스트 블록 끝에 추가

```typescript
it('[Happy] 계좌 추가 확인 버튼 클릭 시 handleCreateAccount 호출', async () => {
  // Given
  const createAccount = vi.fn().mockResolvedValue({ success: true, id: 2 });
  mockUsePortfolioData.mockReturnValue(createMockReturn({
    accounts: [mockAccount],
    createAccount,
  }));
  const user = userEvent.setup();
  render(<Home />);

  // When: 계좌 추가 버튼 클릭 후 이름 입력 후 확인
  await act(async () => {
    await user.click(screen.getByText('계좌 추가'));
  });
  await act(async () => {
    await user.type(screen.getByPlaceholderText('계좌명'), '새 계좌');
    await user.click(screen.getByRole('button', { name: '계좌 추가 확인' }));
  });

  // Then
  expect(createAccount).toHaveBeenCalled();
});
```

---

### [#6] Home.test.tsx — bare `userEvent.click()` 4개를 `userEvent.setup()` 패턴으로 교체 ⭐ safe_auto

**파일**: `frontend/tests/integration/Home.test.tsx`
**위치**: 줄 ~91, 106, 119, 565 (delete 관련 테스트 4개)

```typescript
// 현재 패턴:
await act(async () => {
  await userEvent.click(screen.getByText('계좌 삭제'));
});

// 수정 후:
const user = userEvent.setup();
// ...
await act(async () => {
  await user.click(screen.getByText('계좌 삭제'));
});
```

4개 테스트 각각 `const user = userEvent.setup();`을 테스트 함수 첫 줄에 추가하고 `userEvent.click` → `user.click`으로 교체.

---

## P2 — 코드 품질 개선 (다음 ce-code-review 전에 수정 권장)

### [#7] Home.test.tsx — 토스트 DOM 내용 검증 누락 (7개 테스트)

**파일**: `frontend/tests/integration/Home.test.tsx`
**대상 테스트**: "토스트"가 포함된 이름의 테스트 7개
  - 계좌 삭제 성공/실패 토스트
  - handleCreateAccount 실패 토스트
  - fetchAssetInfo 성공/실패 토스트

```typescript
// 각 테스트에서 expect(fn).toHaveBeenCalled() 다음에 추가:
expect(screen.getByRole('button', { name: '토스트 닫기' })).toBeInTheDocument();
// 또는 메시지 검증:
expect(screen.getByText('계좌 삭제 실패')).toBeInTheDocument();
```

---

### [#8] Home.test.tsx:125 — 탭 전환 assertion이 vacuously true

```typescript
// 현재 (DOM에 이미 존재하는 텍스트로 검증 → 의미 없음):
expect(screen.getByText('Account 2')).toBeInTheDocument();

// 수정 후 (탭 전환 후 달라지는 내용으로 검증):
expect(screen.getByText('Account 2 현황')).toBeInTheDocument();
```

---

### [#9] Home.test.tsx:27-37 — `vi.fn() as Mock` 중복 캐스트 제거 ⭐ safe_auto

```typescript
// 현재:
import type { Mock } from 'vitest'
// ...
fetchAccounts: vi.fn() as Mock,
fetchAssets: vi.fn() as Mock,
// (12개)

// 수정 후:
// import type { Mock } from 'vitest' 줄 삭제
// ...
fetchAccounts: vi.fn(),
fetchAssets: vi.fn(),
// (as Mock 전부 제거)
```

---

### [#10] Home.test.tsx:53 — fake timers 미사용으로 showToast 타이머 누수

```typescript
// beforeEach에 추가:
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mockUsePortfolioData.mockReturnValue(createMockReturn({ accounts: [mockAccount] }));
});

// afterEach에 추가:
afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
```

---

### [#11] AccountHeader.tsx:31 — Enter/Escape 키보드 테스트 누락

**파일**: `frontend/tests/integration/Home.test.tsx`
**위치**: AccountHeader 관련 테스트 블록에 추가

```typescript
it('[Boundary] 계좌명 편집 중 Enter 키 → 변경 저장', async () => {
  const user = userEvent.setup();
  render(<Home />);
  await act(async () => {
    await user.click(screen.getByRole('button', { name: '계좌명 편집' }));
  });
  await act(async () => {
    await user.clear(screen.getByDisplayValue('Test Account'));
    await user.type(screen.getByDisplayValue(''), '새이름{Enter}');
  });
  expect(mockUsePortfolioData().updateAccountName).toHaveBeenCalledWith(1, '새이름');
});

it('[Boundary] 계좌명 편집 중 Escape 키 → 편집 취소', async () => {
  const user = userEvent.setup();
  render(<Home />);
  await act(async () => {
    await user.click(screen.getByRole('button', { name: '계좌명 편집' }));
  });
  await act(async () => {
    await user.keyboard('{Escape}');
  });
  expect(screen.getByRole('button', { name: '계좌명 편집' })).toBeInTheDocument();
});
```

---

### [#12] Home.test.tsx:598 — updateAccountName 호출 인자 미검증

```typescript
// 현재:
expect(updateAccountName).toHaveBeenCalled();

// 수정 후:
expect(updateAccountName).toHaveBeenCalledWith(mockAccount.id, '새 계좌명');
```

---

### [#13] AccountTabs.tsx:32 — 불필요한 non-null assertion (`!`)

**파일**: `frontend/src/components/AccountTabs.tsx:32`

```typescript
// 현재:
onSelectAccount(acc.id!)

// 수정 후 (Account.id: number는 non-optional이므로 ! 불필요):
onSelectAccount(acc.id)
```

AssetRow.tsx의 `item.id!` 패턴도 동일하게 수정.

---

## Advisory (문서화 작업)

### [#14] Home.test.tsx — Given-When-Then 주석 구조 추가

현재 30개 테스트 중 일부만 GWT 주석 있음. 모든 테스트에 통일.

### [#15] docs/solutions/ 문서 생성 (compound 단계)

다음 3개 파일 생성:
- `docs/solutions/testing/brittle-selector-migration.md` — CSS 클래스 선택자 → aria-label role query 마이그레이션 패턴
- `docs/solutions/testing/vitest-spy-cleanup.md` — vi.restoreAllMocks in afterEach 패턴
- `docs/solutions/testing/typed-test-fixtures.md` — 도메인 인터페이스 타입으로 mock 객체 선언 패턴

---

## 작업 순서 (권장)

```
1. [#1]  AssetRow.tsx — 3개 aria-label (5분)
2. [#6]  Home.test.tsx — 4개 userEvent.setup() 패턴 (10분)
3. [#2]  Home.test.tsx — 6개 ': Asset' 타입 추가 (5분)
4. [#9]  Home.test.tsx — as Mock 캐스트 제거 (5분)
5. [#13] AccountTabs.tsx + AssetRow.tsx — id! 제거 (5분)
6. → npm run test:coverage 실행하여 100% 확인
7. [#3]  결정 후 cash 타입 처리 (결정에 따라 5~15분)
8. [#4]  픽스처 상수 추출 (20분)
9. [#5]  계좌 추가 확인 통합 테스트 (15분)
10. → npm run test:coverage 재확인
11. [#7~#12] P2 수정들 (필요에 따라)
12. → ce-code-review mode:report-only base:5052e65 재실행하여 P1 0건 확인
```

---

## Git 상태

```
Branch: main
HEAD: f9d3b72  fix(tests): resolve third ce-code-review P1/P2 findings
17 commits ahead of origin/main
Working tree: clean
Coverage: 100% (FE + BE 모두)
```

## 5차 리뷰 목표

위 P1 6개 (#1~#6) 전부 수정 후 `ce-code-review mode:report-only base:5052e65` 재실행.
**성공 기준**: P0/P1 0건.
