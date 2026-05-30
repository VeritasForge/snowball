---
category: frontend
tags: [react, race-condition, a11y, modal, next-dynamic, rate-limit, coverage, vitest]
created: 2026-05-29
updated: 2026-05-29
---

# Lazy Modal + Optimistic Apply 패턴 (Portfolio Presets, Plan B3)

프리셋 관리 모달(저장/적용)을 대시보드에 통합하며 얻은 프론트엔드 패턴 모음. React 19 / Next.js 16 / Vitest(100% line+branch) 기준.

## 1. 낙관적 단일-계좌 교체 + race guard

Apply 후 서버가 재계산한 계좌를 받아 **refetch 없이** 로컬 상태의 해당 계좌만 교체한다. 단, 10초 폴링이 in-flight면 stale 스냅샷이 방금 적용한 결과를 덮어쓸 수 있다.

```ts
const lastMutationRef = useRef(0);  // 단조 증가 카운터 (state 아님 — 리렌더 X)

const replaceAccount = useCallback((account: Account) => {
  lastMutationRef.current += 1;                      // 진행 중 폴링 무효화
  setAccounts(prev => prev.map(a => a.id === account.id ? account : a));  // functional setState
}, []);

// 폴링 fetchAccounts 안에서:
const mutationAtStart = lastMutationRef.current;
const data = await res.json();
startTransition(() => {
  // ⚠️ 커밋 시점에 재검사 — startTransition이 setAccounts 커밋을 지연시키므로
  //    guard를 호출 前에 두면 guard 통과~flush 사이 mutation이 덮어쓸 수 있다.
  if (lastMutationRef.current !== mutationAtStart) { setIsLoading(false); return; }
  setAccounts(data);
  setIsLoading(false);
});
```

> **교훈**: `startTransition`은 커밋을 지연시킨다. race guard는 **transition 콜백 내부(커밋 시점)** 에서 재검사해야 deferred-commit 윈도우가 닫힌다. `abortRef`로는 부족하다 — replaceAccount는 새 fetch를 만들지 않아 이전 요청을 abort하지 못한다.

## 2. 클라이언트 dry-run은 백엔드 매칭을 정확히 미러해야 한다

적용 전 "기존 N개 / 신규 M개" 미리보기를 클라이언트에서 계산한다면, **백엔드 알고리즘을 1:1로 복제**해야 한다. 백엔드가 `sorted(account.assets, key=lambda a: a.id or 0)` 후 single-pass 매칭하면, 클라이언트도 **id 오름차순 정렬 후** 같은 순서로 매칭해야 한다.

```ts
// ❌ account.assets를 배열 순서대로 스캔 → DB가 순서 보장 안 하면 divergence
// ✅ id 정렬 사본으로 스캔 (백엔드 sorted(...key=id) 미러)
const available = [...account.assets].sort((a, b) => a.id - b.id);
```

> **교훈**: 중복 이름 계좌 + 비-id 순서에서 카운트가 갈린다(예: 정렬 시 1 updated/1 created vs 비정렬 시 2 updated/0 created). DB relationship에 `order_by`가 없으면 순서는 계약이 아니다.

## 3. Rate-limit 쿨다운: Retry-After를 Number.isFinite로 가드

서버 429의 `Retry-After`를 sessionStorage에 쿨다운으로 영속화할 때, 헤더가 비숫자(RFC 9110은 http-date도 허용)면 `Number()`가 `NaN`을 반환하고 `??`는 NaN을 못 잡는다 → 쿨다운 타임스탬프가 NaN → `NaN > Date.now()`는 항상 false → **쿨다운이 조용히 무력화**된다(부하 시 안전망이 정확히 그때 작동 안 함).

```ts
const raw = Number(res.headers.get("Retry-After"));
const retryAfter = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_COOLDOWN_SECONDS;
sessionStorage.setItem(KEY, String(Date.now() + retryAfter * 1000));
```

또한 `onError?.()` 옵셔널 체이닝이 여러 곳에 흩어지면 branch가 폭증한다 → 단일 `notify` 헬퍼로 수렴(한 곳의 `?.`만 커버하면 됨).

## 4. 모달 a11y: focus 복원 + run-once mount effect

- **mount-once effect (`[]` deps)**: 초기 fetch + focus 이동 + opener 캡처. inline 콜백(`onError: msg => showToast(...)`)을 deps에 넣으면 매 렌더 identity가 바뀌어 **매 렌더 re-fetch + 닫기 버튼으로 focus 강탈**한다(테스트 mock이 이 버그를 가린다).
- **focus 복원**: 닫을 때 opener로 focus 반환(WAI-ARIA dialog 패턴).

```ts
useEffect(() => {
  const opener = document.activeElement as HTMLElement | null;
  fetchPresets();
  closeRef.current?.focus();
  return () => opener?.focus();  // unmount(=모든 close 경로) 시 복원
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- **focus trap**: `role="dialog" aria-modal` + Tab/Shift+Tab wrap. 탭 버튼은 disabled 안 되므로 항상 ≥1 focusable.
- **tabs**: `role="tab"`만으로 부족 — `role="tabpanel"` + `aria-controls`/`aria-labelledby`로 연결.
- **composition**: 탭별 explicit variant 서브컴포넌트(LoadTab/SaveTab)로 분리(Vercel `patterns-explicit-variants`), boolean 모드 플래그 금지.

## 5. 100% coverage 테크닉

- **next/dynamic 모달 테스트**: `vi.mock`으로 모달을 stub하고 `await screen.findByTestId(...)`로 dynamic resolve를 기다린다. 통합 테스트에서 열기→닫기 wiring을 검증.
- **미커버 함수 추적**: line/branch는 100%인데 func<100%면 lcov `lcovonly` 리포트의 `FNDA:0,<name>`으로 호출 0회 함수를 정확히 짚는다(예: mock이 호출 안 한 onError 콜백, 클릭 안 된 탭 onClick).
- **uncoverable 방어 분기 정리**: 버튼이 `disabled`로 막는 handler 내부 guard는 도달 불가 → 제거(disabled가 진짜 게이트). 단, backdrop/Escape/effect 등 **비-disabled 경로**의 guard는 유지(도달 가능).
- **통합 글루는 `/* v8 ignore */`**: next/dynamic loader 등 jsdom에서 깔끔히 테스트 못 하는 모듈 레벨 글루는 프로젝트 관례대로 v8 ignore.

## 적용 위치

- `frontend/src/lib/hooks/useAccounts.ts` — replaceAccount + race guard (B3.1)
- `frontend/src/lib/hooks/usePresets.ts` — 429 cooldown + notify (B3.3)
- `frontend/src/components/PresetManagerModal.tsx` — 모달 a11y + dry-run (B3.4)
- `frontend/src/app/page.tsx` — next/dynamic 마운트 (B3.5)

## 관련

- 백엔드 매칭/IDOR: [idor-prevention.md](../security/idor-prevention.md)
- 테스트 픽스처: [typed-test-fixtures.md](../testing/typed-test-fixtures.md), [vitest-spy-cleanup.md](../testing/vitest-spy-cleanup.md)
