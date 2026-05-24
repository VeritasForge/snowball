---
tags: [testing, typescript, fixtures, vitest]
applies-to: [frontend/tests]
---

# 도메인 인터페이스 타입으로 Mock 객체 선언 패턴

## 문제

인라인 테스트 픽스처에 타입 명시 없이 리터럴 객체를 생성하면 두 가지 문제가 발생한다:

1. **도메인 계약 이탈 탐지 불가**: 인터페이스에 필드가 추가/변경되어도 타입 에러가 나지 않아 테스트가 잘못된 형태로 통과한다.
2. **중복 픽스처**: 동일한 객체 구조를 테스트마다 반복 선언하여 유지보수 비용이 증가한다.

## 해결책

### 1. 모듈 레벨 상수로 픽스처 추출 + 타입 명시

```typescript
// ❌ 인라인 리터럴 (타입 없음, 반복)
const mockAsset = {
  id: 1, name: 'Samsung', action: 'BUY' as const, ...
};

// ✅ 모듈 레벨 상수 + 도메인 타입
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

### 2. 테스트에서 재사용

```typescript
it('[Happy] BUY 자산 매수 버튼 렌더링', () => {
  render(<AssetTable assets={[BUY_ASSET]} />);
  expect(screen.getByText('매수')).toBeInTheDocument();
});

it('[Boundary] SELL 자산 매도 브랜치 커버', async () => {
  const accountWithSell = { ...mockAccount, assets: [SELL_ASSET] };
  // ...
});
```

## 효과

- **타입 안전성**: `Asset` 인터페이스 변경 시 픽스처 전체가 컴파일 에러 → 즉시 감지
- **중복 제거**: 동일 픽스처를 한 곳에서 관리
- **`as const` 불필요**: 타입 명시로 `action: 'BUY' as const` 캐스트 제거 가능

## 네이밍 컨벤션

```
HOLD_ASSET  — action: 'HOLD' 상태 (기본 픽스처)
BUY_ASSET   — HOLD에서 spread + BUY 필드 오버라이드
SELL_ASSET  — HOLD에서 spread + SELL 필드 오버라이드
mockAccount — Account 타입 기본 픽스처
```
