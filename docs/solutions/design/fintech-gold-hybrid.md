# Snowball Gold Hybrid Design System 적용

- **적용일**: 2026-05-28
- **브랜치**: `feature/fintech-design-system`
- **스펙**: docs/superpowers/specs/2026-05-28-fintech-design-system-design.md
- **플랜**: docs/superpowers/plans/2026-05-28-fintech-design-system.md

## 핵심 패턴

### 1. CSS 변수 의미 분리 (가장 중요)

`--primary`는 두 의미로 혼용되고 있었다 (UI 액센트 + 손익/매도/채권 의미색).
- `--primary` (#6C5DD3): **의미색으로 보존** — 손익 손실 / 매도 버튼 / 채권 카테고리
- `--accent` (#FFD700): **신규 UI 액센트** — 버튼, focus, 활성 탭, 강조 border

새 컴포넌트 작성 시:
- **강조/UI 액센트** → `*-accent`
- **손실/하락/매도** → `*-primary`

### 2. 접근성 우선

- 골드 위 텍스트: `accent-foreground` (#1A1A1A) — AAA 대비 (≈11.82:1 실측)
- focus ring: 골드 (`--ring`) — 다크 위 강한 가시성 (≈12.50:1 실측)
- `prefers-reduced-motion`: fade-up/bounce-in/stagger 모두 disable, useCountUp 즉시 snap

**실측 대비 (WCAG 공식)**:

| 색상 페어 | 대비 | WCAG 등급 |
|-----------|------|-----------|
| `#1A1A1A` on `#FFD700` (골드 위 텍스트) | 11.82:1 | AAA ✅ |
| `#FFD700` on `#13131A` (다크 배경 위 골드) | 12.50:1 | AAA ✅ |
| `#6C5DD3` on `#13131A` (primary 의미색) | 3.65:1 | 대형 텍스트 AA ⚠️ |

> ⚠️ primary (#6C5DD3)은 소형 텍스트 기준 AA 미달 (3.65:1 < 4.5:1). 손실/매도/채권 의미색으로만 사용하며, 배경 위 단독 텍스트 용도로 사용하지 말 것. 이는 알려진 제한사항 (A9 범위 외).

### 3. 모션 토큰

`globals.css`의 motion utilities:
- `.fade-up` — 단일 요소 entry (420ms ease-out)
- `.fade-up-stagger` — 자식 80ms stagger cascade (5개까지, 6+는 400ms cap)
- `.animate-bounce-in` — Toast 알림
- 모두 reduced-motion 존중

### 4. 숫자 표기 — 모노 + tabular-nums

금액/손익/평가액에는 `font-mono tabular-nums` 적용 — JetBrains Mono로 자릿수 세로 정렬.

### 5. useCountUp 훅

```tsx
const value = useCountUp(start, end, duration = 600);
```
- `start`는 **첫 렌더만** 사용. 이후 갱신은 **현재 표시값에서** 새 `end`로 보간 (refresh flicker 방지).
- ease-out cubic, NaN/Infinity 안전 fallback, reduced-motion 존중.

## 향후 주의 (안티패턴 피하기)

- ❌ `--primary` 값을 `#FFD700`으로 바꾸지 말 것 — 의미색 깨짐.
- ❌ 새 액센트 위 텍스트에 흰색 쓰지 말 것 — 대비 미달. `text-accent-foreground` 사용.
- ❌ `shadow-primary/N` (purple glow) 새로 추가하지 말 것 — DESIGN.md "No outer glows".
- ❌ `rounded-xl`, `rounded-3xl`, `shadow-xl` 사용하지 말 것 — 8px 통일.
- ❌ `h-screen` 사용하지 말 것 — `min-h-[100dvh]` 사용 (iOS Safari URL bar 대응).
- ❌ UI 이모지 사용하지 말 것 — Lucide 아이콘 + `aria-hidden` + sr-only label.
- ❌ `font-mono` 다음 `tabular-nums` 빠뜨리지 말 것 — 자릿수 정렬 핵심.
- ❌ `hover:bg-primary/80` 등 primary hover를 액센트 버튼에 쓰지 말 것 — 매도 버튼 전용.

## 시각 위계 (Shadow scale)

- `shadow-sm` — 일반 카드, 인풋, stat 카드
- `shadow-md` — Hero 카드 (게스트 빈 상태, auth 카드)
- `shadow-lg` — 드롭다운, 토스트
- `shadow-inner` — 인셋 강조 (현재 비활성 게스트 아이콘)
- **금지**: `shadow-xl`, `shadow-2xl`, `shadow-primary/N`

## 라이브러리 / 환경 메모

- next/font: `Inter` (variable: `--font-inter`) + `JetBrains_Mono` (variable: `--font-jetbrains-mono`)
- 한글 fallback: `"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR"` (라틴 서브셋만 로드되므로 한글은 OS 폰트 사용)
- `font-display: swap` 명시
- `<html lang="ko">` (스크린 리더 언어 일치)

## 변경 통계

- 적용 task 수: 9 (+ fix-up 4)
- 변경 commits: 약 22
- 테스트: 베이스라인 291 → 최종 302 (+11 신규 검증)
- 새 파일: `useCountUp.ts`, `useCountUp.test.ts`
- 영향 컴포넌트: 12 + 2 페이지 (page.tsx, auth/page.tsx)
- 토큰 변경: 4 (--accent, --accent-foreground, --ring, --gold-soft 신규)
