# Frontend Refactoring Design
Date: 2026-03-31

## 목표

`frontend/src/app/page.tsx` (533줄 God Component)와 `usePortfolioData.ts` (525줄 God Hook)를
Vercel React Best Practices 기준에 맞게 분해한다. **동작 변경 없음.**

## 적용 스킬 및 근거

| 스킬 | 적용 규칙 | 위반 내용 |
|------|---------|---------|
| `vercel-react-best-practices` | `rerender-no-inline-components` | Toast, CategorySelector가 page.tsx 안에 정의 |
| `vercel-react-best-practices` | `rerender-split-combined-hooks` | usePortfolioData 525줄, 독립 관심사 혼재 |
| `vercel-react-best-practices` | `rerender-dependencies` | fetchAccounts deps에 arrays(assets) 포함 |
| `vercel-composition-patterns` | `architecture-avoid-boolean-props` | isGuest boolean이 모든 함수에 if/else로 퍼짐 |
| `frontend-design` (Module C) | 기존 패턴 준수 | "use client" 유지, Tailwind 토큰 유지 |

---

## 완료 조건 (Completion Criteria)

- [ ] `page.tsx` 100줄 이하
- [ ] 각 분리된 컴포넌트 파일 200줄 이하
- [ ] `usePortfolioData.ts` 200줄 이하 (하위호환 export 유지)
- [ ] `any` 타입 0개 (`npx tsc --noEmit` 통과)
- [ ] `console.log` 0개 (`grep -r "console.log" src/` 결과 없음)
- [ ] 기존 테스트 전부 통과 (`npm test`)
- [ ] `localStorage.getItem('token')` 버그 수정 확인

## 금지사항 (Don'ts)

- Server Component 도입 금지 → "use client" 유지
- 기존 동작 변경 금지 → 리팩토링은 구조만
- 테스트 삭제/수정 금지 → 기존 테스트가 깨지면 코드 수정
- `any` 타입 신규 추가 금지

## 고려사항 (Considerations)

- `usePortfolioData`는 `page.tsx`에서 단일 import로 사용 중 → 하위호환 export 유지
- `AssetTable`은 200줄 초과 가능성 → `AssetRow.tsx` 추가 분리 고려
- `isGuest` 전략 패턴은 `usePortfolioData` 내부에서만 처리, 컴포넌트에 노출 최소화

## 제약사항 (Constraints)

- Next.js 16.1.1, React 19, Tailwind v4 유지
- 기존 테스트(`frontend/tests/`) 유지
- `zustand` store 구조 변경 없음

---

## 파일 구조 (목표)

```
frontend/src/
├── app/
│   ├── layout.tsx              (metadata 수정: "Create Next App" → "스노우볼")
│   └── page.tsx                (100줄 이하, 조립만)
│
├── components/
│   ├── Toast.tsx               (page.tsx:24-34에서 분리)
│   ├── CategorySelector.tsx    (page.tsx:36-69에서 분리)
│   ├── AccountTabs.tsx         (page.tsx:261-281에서 분리)
│   ├── AccountHeader.tsx       (page.tsx:285-330에서 분리)
│   ├── AssetTable.tsx          (page.tsx:343-519에서 분리)
│   └── AssetRow.tsx            (AssetTable 내 tr 1행, 필요시)
│
└── lib/
    ├── hooks/
    │   ├── useAccounts.ts          (계좌 목록 조회)
    │   ├── useAssetActions.ts      (자산 CRUD)
    │   ├── usePriceRefresh.ts      (10초 갱신)
    │   └── usePortfolioData.ts     (위 3개 조합, 하위호환 export)
    └── services/
        ├── guestPortfolioService.ts  (Zustand store 기반 구현)
        └── authPortfolioService.ts   (API 호출 기반 구현)
```

---

## Phase별 작업 목록

### Phase 1: 컴포넌트 분해
**완료조건**: page.tsx 100줄 이하, 각 컴포넌트 파일 독립 존재, `npm test` 통과

1. `Toast.tsx` 분리
2. `CategorySelector.tsx` 분리
3. `AccountTabs.tsx` 분리
4. `AccountHeader.tsx` 분리
5. `AssetTable.tsx` (+ `AssetRow.tsx`) 분리
6. `page.tsx` 정리 (조립 코드만 남기기)

### Phase 2: 훅 분해
**완료조건**: usePortfolioData.ts 200줄 이하, 하위호환 export 유지, `npm test` 통과

1. `useAccounts.ts` 분리 (fetchAccounts, accounts 상태)
2. `useAssetActions.ts` 분리 (addAsset, updateAsset, deleteAsset, updateCash)
3. `usePriceRefresh.ts` 분리 (updateAllPrices, 10초 인터벌)
4. `usePortfolioData.ts` 재작성 (3개 훅 조합)
5. `rerender-dependencies` 수정: deps 배열에서 `assets` 배열 제거

### Phase 3: isGuest 전략 분리
**완료조건**: isGuest if/else 분기가 서비스 레이어로 이동, 컴포넌트에 isGuest 노출 최소화

1. `guestPortfolioService.ts` 작성 (Zustand 기반)
2. `authPortfolioService.ts` 작성 (API fetch 기반)
3. 각 액션 훅에서 서비스 선택 로직 적용

### Phase 4: 버그 수정 + 품질
**완료조건**: `npx tsc --noEmit` 통과, `grep console.log` 결과 없음, 버그 수정 확인

1. `localStorage.getItem('token')` → `'access_token'` 수정 (page.tsx:167)
2. `console.log` 3곳 제거 (usePortfolioData.ts:345, 353, 388)
3. `any` 타입 → 명시적 타입 교체 (updateAsset field/value 파라미터)
4. `layout.tsx` metadata title 수정
5. `.env.example` 생성, `NEXT_PUBLIC_API_URL` 환경변수화

---

## 스킬 매핑 테이블

| Phase | 작업 | 적용 스킬/규칙 |
|-------|------|--------------|
| 1 | 컴포넌트 분리 | `rerender-no-inline-components` |
| 2 | 훅 분해 | `rerender-split-combined-hooks`, `rerender-dependencies` |
| 3 | isGuest 전략 | `architecture-avoid-boolean-props` |
| 4 | 버그/품질 | coding-style.md, security.md |
| 전체 | 시각 검증 | `frontend-design` Module C (Playwright) |
