---
tags: [testing, vitest, cleanup, spies, mocks]
applies-to: [frontend/tests]
---

# Vitest Spy/Mock 정리 패턴

## 문제

`afterEach`에서 스파이/mock을 제대로 정리하지 않으면:
- 테스트 간 spy 상태 누수로 인한 flaky test
- `vi.stubGlobal('fetch', ...)` 후 다음 테스트에서 fetch가 스텁된 채로 실행
- `vi.spyOn(window, 'confirm')` 후 이후 테스트에서 confirm이 항상 true/false 반환

## 해결책

```typescript
beforeEach(() => {
  vi.clearAllMocks(); // 모든 mock 호출 기록 초기화
  mockUsePortfolioData.mockReturnValue(createMockReturn({ accounts: [mockAccount] }));
});

afterEach(() => {
  vi.unstubAllGlobals(); // stubGlobal('fetch', ...) 등 전역 스텁 해제
  vi.restoreAllMocks();  // spyOn으로 생성된 스파이 원복
});
```

## 각 정리 함수의 역할

| 함수 | 역할 | 언제 필요한가 |
|------|------|--------------|
| `vi.clearAllMocks()` | mock 호출 횟수/인자 기록 초기화 | `toHaveBeenCalled` 어설션이 있는 경우 |
| `vi.resetAllMocks()` | clearAllMocks + mock 구현 초기화 | mock 구현을 테스트마다 새로 설정하는 경우 |
| `vi.restoreAllMocks()` | resetAllMocks + spyOn 원본 복원 | `vi.spyOn(window, 'confirm')` 등 사용 시 |
| `vi.unstubAllGlobals()` | `vi.stubGlobal` 전역 값 원복 | `vi.stubGlobal('fetch', ...)` 사용 시 |

## 타이머 정리 (showToast 타이머 누수 방지)

```typescript
beforeEach(() => {
  vi.useFakeTimers();
  // ...
});

afterEach(() => {
  vi.runAllTimers();  // 보류 중인 타이머 모두 실행
  vi.useRealTimers(); // 실제 타이머로 복원
  // ...
});
```

**주의**: `vi.useFakeTimers()`를 사용하면 `setTimeout`/`setInterval`이 가짜로 교체된다.
`act()` 내에서 타이머가 실행되지 않을 수 있으므로 `vi.runAllTimers()` 또는 `vi.advanceTimersByTime(ms)`로 수동 진행 필요.
