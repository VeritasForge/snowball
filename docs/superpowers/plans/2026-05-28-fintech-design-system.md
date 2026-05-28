# FinTech 골드 하이브리드 디자인 시스템 — 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Snowball frontend(Next.js 16 / React 19 / Tailwind v4)에 DESIGN.md의 "Gold + Dark" 핀테크 시각 언어를 **하이브리드 방식**으로 적용한다 — 다크 구조는 보존하고 액센트만 골드로, 손익·매수/매도·카테고리 의미색은 유지.

**Architecture:** `globals.css`의 CSS 변수 한 곳을 교체해 Tailwind v4 `@theme inline`을 통해 전 화면에 색을 전파한다. 단, 현재 `--primary`가 "UI 액센트"와 "손익 손실/매도/채권 의미색"으로 **혼용**되고 있으므로, `--primary`는 의미색으로 **보존**하고 신규 `--accent`(골드)를 도입해 UI 액센트 자리만 `*-primary` → `*-accent`로 매핑한다. 폰트는 `next/font`를 Geist→Inter+JetBrains Mono로, radius/glow는 컴포넌트 className에서 일괄 정리한다.

**Tech Stack:** Next.js 16.1.1, React 19.2.3, Tailwind CSS v4 (`@theme inline`), next/font (Inter / JetBrains Mono), Recharts 3.6 (DonutChart), Lucide React 0.562, Vitest 2.1.

**Spec:** `docs/superpowers/specs/2026-05-28-fintech-design-system-design.md`

---

## 핵심 발견 (실코드 grep 기반)

코드를 조사한 결과 — `--primary`는 **두 가지 의미**로 혼용되고 있다:

| 의미 분류 | 컴포넌트:라인 | 처리 |
|-----------|---------------|------|
| **UI 액센트** (버튼/링크/포커스/강조) | `page.tsx:113,122,134,139` · `auth/page.tsx:77,101,116,125,138,145` · `AccountTabs:43,56,66` · `AccountHeader:36` · `TickerSearchInput:132,139` · `Header:13,33` · `AssetTable:49,51,76,77,104` · `AssetRow:62,106,115,124,140,143` · `Toast:13,15` | `*-primary` → **`*-accent`** (골드) |
| **손익 손실 색** | `SummarySection:18,21,24` · `AssetRow:129,132` | `*-primary` **유지** (의미색 보존) |
| **매도 액션 색** | `AssetRow:154` | `bg-primary` **유지** |
| **카테고리 '채권' 색** | `CategorySelector:8` | `bg-primary` **유지** |

따라서 `--primary`(#6C5DD3) 토큰 값은 **변경하지 않는다.** 신규 `--accent`(#FFD700) 토큰을 도입하고 UI 액센트 자리만 클래스 이름을 교체한다. 이로써 "손익 의미 보존"과 "골드 액센트 도입"을 동시에 만족한다.

---

## 사용자 글로벌 규칙 필수 섹션

### 완료조건 (Completion Criteria)
- [ ] `globals.css`의 `--accent`/`--accent-foreground`/`--ring`이 골드 체계, `--gold-soft` 추가됨
- [ ] `--primary` 값(#6C5DD3)·`--success`·`--danger`·`--warning`·`--background`/`--card`/`--border`는 **변경되지 않음**
- [ ] UI 액센트 자리(grep 매핑표 32곳)가 `*-primary` → `*-accent`로 교체됨
- [ ] 손익/매도/채권 5곳은 `*-primary` 그대로 유지됨 (회귀 단언)
- [ ] `layout.tsx`가 Inter + JetBrains_Mono를 로드하고, 숫자 표기 요소에 `font-mono tabular-nums` 적용됨
- [ ] 전역 radius가 8px(`rounded-lg`)로 통일되고, `shadow-primary/20`·`shadow-xl` 외곽 광이 정리됨
- [ ] entry 모션(.fade-up) + 숫자 카운트업 훅 작동, `@media (prefers-reduced-motion: reduce)`에서 비활성됨
- [ ] 골드 액션 버튼 텍스트 대비 ≥ 4.5:1 (`#1A1A1A` on `#FFD700` = 12.6:1 OK)
- [ ] **검증 명령**: `cd frontend && npm install && npx tsc --noEmit && npm test && npm run build` 전부 성공
- [ ] before/after 스크린샷 4장 (대시보드, auth, 빈 상태, 토스트)

### 금지사항 (Don'ts)
- 의미색(success/danger/warning)을 골드로 바꾸지 **말 것** → 손익·매수/매도 색은 그대로
- `--primary` 값을 #FFD700으로 바꾸지 **말 것** → 손익/매도/채권 의미 깨짐 (신규 `--accent`만 추가)
- 배경/카드/테두리 색을 `#1A1A1A`/`#000`으로 전면 교체하지 **말 것** → 현행 다크 유지 (B안)
- 골드 배경 버튼에 흰 텍스트를 쓰지 **말 것** → 어두운 텍스트(`#1A1A1A`)
- 컴포넌트에 색상 hex를 하드코딩하지 **말 것** → CSS 변수/Tailwind 토큰 경유
- 색 있는 외곽 glow(`shadow-primary/...`)를 새로 추가하지 **말 것**
- 랜딩페이지(Hero/Pricing/Testimonials)를 새로 만들지 **말 것** → 스코프 밖
- `width`/`height`/`top` 등 layout-trigger 속성을 애니메이트하지 **말 것** → `transform`/`opacity`만
- 실패한 기존 테스트를 임의로 수정·삭제·주석 처리하지 **말 것** → 사용자 승인 후 명시적 갱신만

### 고려사항 (Considerations)
- **접근성**: `accent-foreground=#1A1A1A` on `#FFD700` 대비 12.6:1, AAA 충족. focus ring은 `--ring=#FFD700`으로 다크 배경 위 강한 가시성 확보.
- **DESIGN.md 내부 모순**: `#FFD700`은 채도 100%인데 "채도 80% 캡" 룰과 충돌 → 큰 면적은 `--gold-soft`(#C9A84C, 채도 낮음)로 분담 (예: DonutChart 보조 세그먼트).
- **테스트 회귀**: 5개 테스트(Toast/AssetRow/AccountTabs/SummarySection)가 스타일 문자열에 의존 → 본 plan의 변경(액센트 클래스명 교체)으로 단언이 깨지면, **plan 명세에 따른 의도된 변경**임을 commit 메시지에 명시하고 단언만 갱신(동작 검증은 보존).
- **`animate-in`/`animate-bounce-in`**: Tailwind v4 기본에 없고 `globals.css`에도 정의 없어 **현재 no-op**. 새 `.fade-up` / `.bounce-in` utility를 globals에 추가하고, 기존 호출은 그대로 둔다(no-op이 그대로 유지되므로 무해, 향후 교체).
- **`body` 폰트**: 현재 `globals.css:70`이 `font-family: Arial, Helvetica, sans-serif`로 하드코딩되어 next/font가 무력화 상태. 본 plan에서 `var(--font-sans)`로 교체해야 폰트가 실제로 적용됨.
- **`node_modules` 미설치**: 진단 오류 다수 확인됨. Task 1에서 `npm install` 선행.

### 제약사항 (Constraints)
- Next.js 16, React 19, Tailwind v4 고정. v3식 `tailwind.config.js` 없음.
- shadcn/ui 없음 — 모든 컴포넌트가 커스텀, 직접 작성한 className을 조정.
- 테스트 러너: Vitest 2.1 + Testing Library + jsdom. E2E는 Playwright.
- `frontend/tests` 디렉토리에 단위·통합·E2E 모두 위치.

### 스킬 검색 (Skill Discovery)
설계 문서 §8과 동일 매핑을 적용한다. React/Next.js 코드이므로 모든 코드 리뷰 단계에 **"Vercel best-practices 기준" 명시**.

| 스킬/에이전트 | 적용 Task |
|---------------|-----------|
| `vercel-react-best-practices` / `vercel-composition-patterns` | Task 4(폰트), Task 7(모션 컴포지션), 전체 리뷰 |
| `compound-engineering:ce-frontend-design` | Task 3, 5, 6, 7, 9 (시각 검증/스크린샷) |
| `web-design-guidelines` | Task 2(대비), Task 9(접근성 감사) |
| `superpowers:test-driven-development` | Task 7(카운트업 훅) |
| `code-review` (built-in) | 각 Task 후 반복(P0/P1 0건까지) |
| `compound-engineering:ce-code-review` | 전체 완료 후 1회 최종 게이트 |
| `rl-verify` | plan 단위 최종 검증 |

### Task List (개략 — 본문은 아래 상세)
1. 베이스라인 확보 (`npm install` + 기존 테스트 PASS)
2. 토큰 도입 (`--accent`/`--accent-foreground`/`--ring`/`--gold-soft`)
3. 액센트 매핑 — `*-primary` → `*-accent` (의미 보존하며 32곳 교체)
4. 폰트 교체 (Inter + JetBrains Mono)
5. 숫자 표기 모노 + tabular-nums
6. Radius 8px 통일 + Glow 제거
7. Entry 모션 + 숫자 카운트업 (TDD)
8. Anti-pattern 정리
9. 최종 시각·접근성·전체 검증

---

## 파일 구조 (File Structure)

### 새로 만드는 파일
- `frontend/src/lib/hooks/useCountUp.ts` — 숫자 카운트업 훅 (TDD 대상)
- `frontend/tests/hooks/useCountUp.test.ts` — 카운트업 단위 테스트

### 수정 파일
- `frontend/src/app/globals.css` — 토큰 추가/조정, keyframes, body font-family
- `frontend/src/app/layout.tsx` — 폰트 교체
- `frontend/src/app/page.tsx` — 액센트 매핑, radius, glow
- `frontend/src/app/auth/page.tsx` — 동일
- `frontend/src/components/SummarySection.tsx` — radius, 카운트업, 모노 숫자
- `frontend/src/components/AssetTable.tsx` — 액센트 매핑, radius
- `frontend/src/components/AssetRow.tsx` — 액센트(focus/강조 셀) + 손익(유지) + 매도(유지) + 모노
- `frontend/src/components/AccountTabs.tsx` — 액센트
- `frontend/src/components/AccountHeader.tsx` — 액센트
- `frontend/src/components/Header.tsx` — 액센트
- `frontend/src/components/TickerSearchInput.tsx` — 액센트
- `frontend/src/components/CategorySelector.tsx` — radius, '채권' 색은 primary 유지
- `frontend/src/components/DonutChart.tsx` — 골드+gold-soft 팔레트, radius
- `frontend/src/components/Toast.tsx` — bg-primary → bg-accent (정보 토스트는 액센트로)
- `frontend/src/components/NumberFormatInput.tsx` — 모노 옵션 props
- 영향 받는 테스트: `tests/components/Toast.test.tsx`, `tests/components/AssetRow.test.tsx`, `tests/components/AccountTabs.test.tsx`, `tests/components/SummarySection.test.tsx`

---

## Task 1: 베이스라인 확보

**Files:**
- Check: `frontend/package.json`
- Run: 전체 테스트

- [ ] **Step 1: 의존성 설치**

```bash
cd frontend && npm install
```
Expected: 0 vulnerabilities or low only; install 성공.

- [ ] **Step 2: 타입 체크 베이스라인**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 깨끗하거나 기존 오류만 — 출력을 별도로 기록(파일 `/tmp/baseline-tsc.txt`로 저장)

```bash
cd frontend && npx tsc --noEmit 2>&1 | tee /tmp/baseline-tsc.txt
```

- [ ] **Step 3: 단위 테스트 베이스라인**

```bash
cd frontend && npm test -- --run 2>&1 | tee /tmp/baseline-tests.txt
```
Expected: PASS 개수 기록(예: "Tests  X passed"). FAIL이 있으면 현 시점 상태로 기록.

- [ ] **Step 4: 빌드 베이스라인**

```bash
cd frontend && npm run build 2>&1 | tee /tmp/baseline-build.txt
```
Expected: success or 기존 경고만.

- [ ] **Step 5: 현재 스크린샷 (Before)**

`frontend && npm run dev` 후 브라우저에서 다음 캡처:
- `/` (메인 대시보드, 로그인 안 한 게스트 진입 시 빈 상태)
- `/auth/login` (또는 auth 진입점)
- 토스트 표시 상태

저장: `docs/superpowers/specs/screenshots/before-*.png`

- [ ] **Step 6: 커밋 (변경 없음, 베이스라인 기록만)**

베이스라인은 git 커밋 대상이 아니다(임시 파일). 다음 단계로.

---

## Task 2: 토큰 도입 — `--accent`/`--accent-foreground`/`--ring`/`--gold-soft`

**Files:**
- Modify: `frontend/src/app/globals.css:23-25, 29-31, 38-65`

- [ ] **Step 1: globals.css `:root` 블록 갱신**

`frontend/src/app/globals.css:14-36`을 다음 내용으로 교체:

```css
:root {
  /* Dark Theme from Image */
  --background: #13131A;
  --foreground: #FFFFFF;

  --card: #1C1C24;
  --card-foreground: #FFFFFF;

  --popover: #1C1C24;
  --popover-foreground: #FFFFFF;

  /* --primary: 손익 손실/매도/채권 의미색으로 보존 (#6C5DD3) */
  --primary: #6C5DD3;
  --primary-foreground: #FFFFFF;

  --secondary: #242731;
  --secondary-foreground: #FFFFFF;

  --muted: #92929D;
  --muted-foreground: #92929D;

  /* --accent: 신규 UI 액센트(골드). 채도 100%이므로 큰 면적은 --gold-soft 분담 */
  --accent: #FFD700;
  --accent-foreground: #1A1A1A;
  --gold-soft: #C9A84C;

  --destructive: #FF6B6B;
  --destructive-foreground: #FFFFFF;

  --border: #2D2D3A;
  --input: #242731;
  /* focus ring은 골드로 (다크 배경 위 가시성↑) */
  --ring: #FFD700;

  --success: #2DCA73;
  --warning: #FFCE73;
  --danger: #FF6B6B;
}
```

- [ ] **Step 2: `@theme inline`에 `--color-gold-soft` 추가**

`frontend/src/app/globals.css:38-65` 블록에서 `--color-accent` 줄 아래에 한 줄 추가:

```css
@theme inline {
  /* ... 기존 ... */
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-gold-soft: var(--gold-soft);
  /* ... 기존 ... */
}
```

(이로써 Tailwind 유틸리티 `bg-gold-soft`, `text-gold-soft`, `border-gold-soft`가 생성됨.)

- [ ] **Step 3: 타입체크 & 빌드 검증**

```bash
cd frontend && npx tsc --noEmit && npm run build
```
Expected: 베이스라인과 동일하게 통과.

- [ ] **Step 4: 시각 회귀 확인**

`npm run dev` 후 메인 페이지를 본다.
- 손익·매도·채권은 **아직 보라색**이어야 함 (토큰 그대로) — 변화 없음
- 액션 버튼·헤더 로고는 **아직 보라** (액센트 매핑은 다음 Task)
- focus ring을 인풋에 포커스해보면 **골드 링** 출현 (`--ring=#FFD700`)
- focus ring이 골드로 바뀐 것 외엔 시각 변화가 거의 없어야 정상

- [ ] **Step 5: 커밋**

```bash
cd /Users/cjynim/lab/snowball && git checkout -b feature/fintech-design-system
git add frontend/src/app/globals.css
git commit -m "feat(ui): introduce --accent gold token, preserve --primary as semantic color

- Add --accent (#FFD700), --accent-foreground (#1A1A1A), --gold-soft (#C9A84C)
- Keep --primary (#6C5DD3) as loss/sell/bond semantic color (do NOT remap)
- Switch --ring to gold for stronger focus visibility on dark surface
- @theme exposes bg-accent / text-accent / border-gold-soft utilities

Refs: docs/superpowers/plans/2026-05-28-fintech-design-system.md (Task 2)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 액센트 매핑 — `*-primary` → `*-accent` (의미 보존)

이 Task는 **32곳의 액센트 자리만** 교체한다. 손익/매도/채권 5곳은 **건드리지 않는다**.

**핵심 원칙:** grep 매핑표(plan 상단)에 "액센트" 분류된 라인만 변경. "의미색(유지)" 분류는 절대 건드리지 않음.

### 3-A: `app/page.tsx` (메인 페이지 — 게스트 빈 상태)

**Files:**
- Modify: `frontend/src/app/page.tsx:113, 122, 134, 139`

- [ ] **Step 1: 로더 색**

`page.tsx:113`을:
```tsx
<Loader2 className="animate-spin text-primary" size={32} />
```
→
```tsx
<Loader2 className="animate-spin text-accent" size={32} />
```

- [ ] **Step 2: 게스트 아이콘 원형**

`page.tsx:122`을:
```tsx
<div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
```
→
```tsx
<div className="w-20 h-20 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
```

- [ ] **Step 3: 입력 focus ring**

`page.tsx:134`의 `focus:ring-primary focus:bg-card` 부분을:
```tsx
className="w-full bg-secondary border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:bg-card transition-all text-center font-medium text-foreground"
```
→
```tsx
className="w-full bg-secondary border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-accent focus:bg-card transition-all text-center font-medium text-foreground"
```

- [ ] **Step 4: 메인 액션 버튼 (액센트 + glow 제거)**

`page.tsx:139`을:
```tsx
className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20">
```
→
```tsx
className="w-full bg-accent text-accent-foreground py-3 rounded-xl font-bold text-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
```
(변경점: `primary→accent` 3곳, `primary-foreground→accent-foreground`, `shadow-lg shadow-primary/20` → `shadow-sm`)

- [ ] **Step 5: 빌드·시각 확인**

```bash
cd frontend && npx tsc --noEmit && npm run build
```
브라우저에서 `/`(로그아웃 상태) → 빈 상태 카드의 아이콘 원형과 로그인 버튼이 **골드**로 보여야 함. 손익/매도 색은 변화 없음.

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(ui): map page.tsx accent slots to --accent (gold), remove primary glow

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 3-B: `app/auth/page.tsx`

**Files:**
- Modify: `frontend/src/app/auth/page.tsx:77, 101, 116, 125, 138, 145`

- [ ] **Step 1: 로고 아이콘**

`auth/page.tsx:77`:
```tsx
<TrendingUp className="text-primary" /> Snowball Allocator
```
→
```tsx
<TrendingUp className="text-accent" /> Snowball Allocator
```

- [ ] **Step 2: 두 인풋 focus (101행, 116행)**

각각 `focus:ring-primary` → `focus:ring-accent`로. 두 입력의 className 전체 그대로 두고 `ring-primary`만 `ring-accent`로.

- [ ] **Step 3: 제출 버튼 (액센트 + glow 제거)**

`auth/page.tsx:125`:
```tsx
className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
```
→
```tsx
className="w-full bg-accent text-accent-foreground py-3 rounded-xl font-bold text-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
```

- [ ] **Step 4: 보조 링크 hover (138, 145)**

```tsx
className="text-muted hover:text-primary text-sm font-medium transition-colors"
```
→
```tsx
className="text-muted hover:text-accent text-sm font-medium transition-colors"
```
(두 곳 모두 동일 교체)

- [ ] **Step 5: 빌드·시각 확인**

```bash
cd frontend && npx tsc --noEmit && npm run build
```
`/auth/login`에서 로고·버튼·focus·hover가 골드. 텍스트 가독성 확인.

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/app/auth/page.tsx
git commit -m "feat(ui): map auth page accent slots to --accent (gold)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 3-C: `Header.tsx`

**Files:**
- Modify: `frontend/src/components/Header.tsx:13, 33`

- [ ] **Step 1: 로고 아이콘 + 로그인 버튼**

`Header.tsx:13`: `<TrendingUp className="text-primary" />` → `text-accent`
`Header.tsx:33`:
```tsx
className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
```
→
```tsx
className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium"
```

- [ ] **Step 2: 빌드·시각 확인**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/Header.tsx
git commit -m "feat(ui): Header logo+login button to gold accent

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 3-D: `AccountTabs.tsx`

**Files:**
- Modify: `frontend/src/components/AccountTabs.tsx:43, 56, 66`

- [ ] **Step 1: 추가 입력 컨테이너 (line 43)**

`border-primary` → `border-accent`. 다른 클래스는 그대로.

- [ ] **Step 2: 확인 버튼 (line 56)**

`className="text-primary"` → `className="text-accent"`

- [ ] **Step 3: 계좌 추가 버튼 (line 66)**

```tsx
className="px-3 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 hover:bg-primary/20 transition-colors"
```
→
```tsx
className="px-3 py-2 rounded-full text-sm font-medium bg-accent/10 text-accent border border-accent/20 flex items-center gap-1 hover:bg-accent/20 transition-colors"
```
(4곳 `primary` 모두 `accent`로)

- [ ] **Step 4: 빌드·시각 확인 + 테스트**

```bash
cd frontend && npx tsc --noEmit && npm test -- tests/components/AccountTabs.test.tsx --run
```
Expected: 단언이 `bg-primary/10` 등을 검사하면 FAIL. 본 plan의 의도된 변경이므로 다음 단계로 테스트 갱신.

- [ ] **Step 5: AccountTabs 테스트 단언 갱신 (단언 텍스트만)**

`tests/components/AccountTabs.test.tsx`에서 `bg-primary`/`text-primary`/`border-primary` 단언을 `accent`로 교체. **동작 검증·렌더 시나리오는 그대로 둔다.**

검사 후:
```bash
cd frontend && npm test -- tests/components/AccountTabs.test.tsx --run
```
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/components/AccountTabs.tsx frontend/tests/components/AccountTabs.test.tsx
git commit -m "feat(ui): AccountTabs accent → gold, update style assertions

Test assertions updated to match the plan's intentional class rename
(*-primary → *-accent for UI accent slots). Behavior assertions intact.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 3-E: `AccountHeader.tsx`

**Files:**
- Modify: `frontend/src/components/AccountHeader.tsx:36`

- [ ] **Step 1: 편집 인풋 보더**

`border-b-2 border-primary` → `border-b-2 border-accent`

- [ ] **Step 2: 빌드 확인 + 커밋**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/components/AccountHeader.tsx
git commit -m "feat(ui): AccountHeader edit input border to gold accent

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 3-F: `TickerSearchInput.tsx`

**Files:**
- Modify: `frontend/src/components/TickerSearchInput.tsx:132, 139`

- [ ] **Step 1: 인풋 focus 보더 (132)**

`focus:border-primary` → `focus:border-accent`

- [ ] **Step 2: 버튼 hover (139)**

`hover:text-primary` → `hover:text-accent`

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/TickerSearchInput.tsx
git commit -m "feat(ui): TickerSearchInput focus/hover to gold accent

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 3-G: `AssetTable.tsx` (탭/헤더/더보기 — 액센트만)

**Files:**
- Modify: `frontend/src/components/AssetTable.tsx:49, 51, 76, 77, 104`

- [ ] **Step 1: 행 강조 클래스 (49, 51)**

49행 `bg-primary/10 text-primary border-primary/20` → 모두 `accent`로.
51행 `bg-card text-primary border-primary/20 hover:bg-primary/5 shadow-sm` → `text-accent border-accent/20 hover:bg-accent/5` (bg-card 유지).

- [ ] **Step 2: 컬럼 헤더 강조 (76, 77)**

76행: `<th className="p-4 text-right bg-primary/10 text-primary">목표금액</th>` → `bg-accent/10 text-accent`
77행: `<th className="p-4 text-center bg-primary/10">리밸런싱 매매</th>` → `bg-accent/10`

- [ ] **Step 3: 더보기 버튼 (104)**

`text-muted hover:text-primary` → `text-muted hover:text-accent`

- [ ] **Step 4: 빌드·시각 확인**

```bash
cd frontend && npx tsc --noEmit && npm run build
```

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/components/AssetTable.tsx
git commit -m "feat(ui): AssetTable accent columns/rows to gold

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 3-H: `AssetRow.tsx` (액센트 자리만 — 손익/매도는 절대 건드리지 않음)

**Files:**
- Modify: `frontend/src/components/AssetRow.tsx:62, 106, 115, 124, 140, 143`
- **유지(변경 금지):** `AssetRow.tsx:129, 132, 154` — 손익/매도 의미색

- [ ] **Step 1: 4개 인풋 focus 보더 (62, 106, 115, 124)**

각각 `focus:border-primary` → `focus:border-accent`. 4곳 모두.

- [ ] **Step 2: target_value 셀 강조 (140, 143)**

140행: `<td className="p-4 text-right bg-primary/10 font-bold text-primary">` → `bg-accent/10 font-bold text-accent`
143행: `<td className="p-4 text-center bg-primary/10">` → `bg-accent/10`

- [ ] **Step 3: 손익/매도 변경 금지 확인 (회귀 단언)**

다음 grep으로 손익·매도 라인이 그대로인지 확인:
```bash
grep -n "pl_amount\|pl_rate\|action_quantity > 0" /Users/cjynim/lab/snowball/frontend/src/components/AssetRow.tsx
```
Expected: 129, 132, 154행 모두 `'text-primary'` / `'bg-primary'` 그대로 출력되어야 함.

- [ ] **Step 4: 테스트 — AssetRow의 손익색 단언이 깨지지 않아야**

```bash
cd frontend && npm test -- tests/components/AssetRow.test.tsx --run
```
손익 관련 단언이 PASS여야 의미 보존. 액센트 관련 단언이 FAIL이면 다음 단계로 갱신.

- [ ] **Step 5: AssetRow 테스트 단언 — 액센트 변경분만 갱신**

`tests/components/AssetRow.test.tsx`에서:
- 손익(`pl_amount`, `pl_rate` 관련)·매도 버튼 단언 → **유지**
- target_value 셀 강조·인풋 focus 관련 단언 → `accent`로 갱신

```bash
cd frontend && npm test -- tests/components/AssetRow.test.tsx --run
```
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/components/AssetRow.tsx frontend/tests/components/AssetRow.test.tsx
git commit -m "feat(ui): AssetRow accent slots → gold, preserve loss/sell semantic color

- Input focus borders, target_value cell highlight → accent (gold)
- pl_amount/pl_rate text-primary, sell button bg-primary, '채권' category UNCHANGED
- Test assertions updated only for accent slots; loss/sell assertions preserved

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 3-I: `Toast.tsx` (정보 토스트 액센트)

**Files:**
- Modify: `frontend/src/components/Toast.tsx:13, 15`

- [ ] **Step 1: 배경 + 텍스트 색**

13행:
```tsx
const bgClass = type === 'error' ? 'bg-danger' : 'bg-primary';
```
→
```tsx
const bgClass = type === 'error' ? 'bg-danger' : 'bg-accent';
```

15행: `${bgClass} text-primary-foreground` →
```tsx
className={`fixed top-4 left-1/2 transform -translate-x-1/2 ${bgClass} ${type === 'error' ? 'text-white' : 'text-accent-foreground'} px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50 animate-bounce-in`}
```
(이유: error 토스트는 빨강(`bg-danger`) 위에 흰 텍스트, 정보 토스트는 골드(`bg-accent`) 위에 어두운 텍스트.)

- [ ] **Step 2: 테스트 단언 갱신 + 빌드**

```bash
cd frontend && npm test -- tests/components/Toast.test.tsx --run
```
필요 시 단언을 `bg-accent`/`text-accent-foreground`로.

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/Toast.tsx frontend/tests/components/Toast.test.tsx
git commit -m "feat(ui): info Toast to gold accent with dark text for AA contrast

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 3-J: 액센트 매핑 종합 검증

- [ ] **Step 1: 전수 grep — 액센트 자리에 더 이상 `*-primary`가 없는지**

```bash
grep -n "ring-primary\|hover:text-primary\|hover:bg-primary\|focus:border-primary\|focus:ring-primary\|bg-primary/10\|border-primary" /Users/cjynim/lab/snowball/frontend/src/components/*.tsx /Users/cjynim/lab/snowball/frontend/src/app/page.tsx /Users/cjynim/lab/snowball/frontend/src/app/auth/page.tsx
```
Expected: 출력이 **비어 있어야 함** (액센트 매핑 완료).

- [ ] **Step 2: 손익/매도/채권 의미색이 그대로인지 회귀 확인**

```bash
grep -n "text-primary\|bg-primary" /Users/cjynim/lab/snowball/frontend/src/components/SummarySection.tsx /Users/cjynim/lab/snowball/frontend/src/components/AssetRow.tsx /Users/cjynim/lab/snowball/frontend/src/components/CategorySelector.tsx
```
Expected:
- `SummarySection.tsx:18,21,24` — `text-primary`/`border-primary` (손익 손실)
- `AssetRow.tsx:129,132,154` — `text-primary` (손익), `bg-primary` (매도)
- `CategorySelector.tsx:8` — `bg-primary` ('채권')

이 5곳 외에 더 있으면 액센트 매핑 누락이 있는 것 — 재검토.

- [ ] **Step 3: 전체 테스트 + 빌드**

```bash
cd frontend && npx tsc --noEmit && npm test -- --run && npm run build
```
Expected: 전부 PASS / SUCCESS.

---

## Task 4: 폰트 교체 — Inter + JetBrains Mono

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/globals.css:63-65, 67-71`

- [ ] **Step 1: `layout.tsx`의 import + 변수**

`layout.tsx:2-13`을 다음으로 교체:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});
```

- [ ] **Step 2: `layout.tsx`의 `<body>` className**

`layout.tsx:30-32`:
```tsx
<body
  className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
>
```
→
```tsx
<body
  className={`${inter.variable} ${jetBrainsMono.variable} font-sans antialiased bg-background text-foreground`}
>
```
(`font-sans` 추가 — 폰트가 실제로 body에 적용되도록.)

- [ ] **Step 3: `globals.css`의 `@theme inline` 폰트 매핑**

`globals.css:63-64`:
```css
--font-sans: var(--font-geist-sans);
--font-mono: var(--font-geist-mono);
```
→
```css
--font-sans: var(--font-inter);
--font-mono: var(--font-jetbrains-mono);
```

- [ ] **Step 4: `globals.css`의 `body` font-family 정리**

`globals.css:67-71`:
```css
body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```
→
```css
body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, -apple-system, sans-serif;
}
```
(Arial 폴백 제거 — Inter가 실제로 적용되도록.)

- [ ] **Step 5: 빌드·시각 확인**

```bash
cd frontend && npx tsc --noEmit && npm run build
```
`npm run dev` 후 브라우저 DevTools로 body의 computed `font-family`가 `Inter, system-ui, ...`로 보여야 함. 시각상 본문이 Inter로 렌더링되어야 함(Geist와 미묘하게 다름).

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/app/layout.tsx frontend/src/app/globals.css
git commit -m "feat(ui): switch fonts to Inter + JetBrains Mono (DESIGN.md compliance)

- next/font: Geist → Inter (--font-inter), Geist_Mono → JetBrains_Mono (--font-jetbrains-mono)
- @theme inline: --font-sans/--font-mono now point at new variables
- body: remove Arial fallback, use var(--font-sans), system-ui, sans-serif
- body className gets font-sans so the font actually applies (previously Arial)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 숫자 표기 모노 + tabular-nums

**Files:**
- Modify: `frontend/src/components/SummarySection.tsx`
- Modify: `frontend/src/components/AssetRow.tsx`

핵심 표기 요소에 `font-mono tabular-nums`를 추가해 자릿수가 세로로 정렬되도록.

- [ ] **Step 1: `SummarySection.tsx` 큰 숫자에 모노 적용**

`SummarySection.tsx:16` (총 자산):
```tsx
<p className="text-2xl font-bold mt-1 text-foreground">{formatNumber(account.total_asset_value)}원</p>
```
→
```tsx
<p className="text-2xl font-bold mt-1 text-foreground font-mono tabular-nums">{formatNumber(account.total_asset_value)}원</p>
```

`SummarySection.tsx:21-22` (손익):
```tsx
<span className={`text-2xl font-bold ${account.total_pl_amount >= 0 ? 'text-danger' : 'text-primary'}`}>
  {account.total_pl_amount > 0 ? '+' : ''}{formatNumber(account.total_pl_amount)}원
</span>
```
→
```tsx
<span className={`text-2xl font-bold font-mono tabular-nums ${account.total_pl_amount >= 0 ? 'text-danger' : 'text-primary'}`}>
  {account.total_pl_amount > 0 ? '+' : ''}{formatNumber(account.total_pl_amount)}원
</span>
```

`SummarySection.tsx:24-25` (손익률): 같은 패턴, `text-sm font-medium`에 `font-mono tabular-nums` 추가.

`SummarySection.tsx:31` (투자 자산), `38-40` (현금 인풋의 `className`): 동일 패턴.

- [ ] **Step 2: `AssetRow.tsx` 손익/평가액 숫자에 모노 적용**

라인 129-138, 140-142 등 `formatNumber(...)` 출력 요소에 `font-mono tabular-nums` 추가.

손익(129, 132)은 색은 `text-primary` 유지하되 `font-mono tabular-nums` 추가:
```tsx
<div className={`text-xs font-bold font-mono tabular-nums ${item.pl_amount >= 0 ? 'text-danger' : 'text-primary'}`}>
```

평가액(136-138):
```tsx
<td className="p-4 text-right font-bold text-foreground font-mono tabular-nums">
  {formatNumber(item.current_value)}
  <div className="text-[10px] text-muted font-normal font-mono tabular-nums">{item.current_weight.toFixed(1)}%</div>
</td>
```

목표금액(140-141):
```tsx
<td className="p-4 text-right bg-accent/10 font-bold text-accent font-mono tabular-nums">
  {formatNumber(item.target_value)}
</td>
```

- [ ] **Step 3: 빌드 + 시각 확인**

```bash
cd frontend && npx tsc --noEmit && npm run build
```
`npm run dev`에서 SummarySection의 4개 카드 숫자가 자릿수 정렬되는지(폭이 일정한지) 확인.

- [ ] **Step 4: 단위 테스트**

```bash
cd frontend && npm test -- tests/components/SummarySection.test.tsx tests/components/AssetRow.test.tsx --run
```
스타일 단언이 깨지면, `font-mono tabular-nums`가 추가된 의도된 변경이므로 단언만 갱신.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/components/SummarySection.tsx frontend/src/components/AssetRow.tsx frontend/tests/components/SummarySection.test.tsx frontend/tests/components/AssetRow.test.tsx
git commit -m "feat(ui): use font-mono tabular-nums for numeric/money columns

- SummarySection: 총자산/손익/투자자산/현금 숫자에 모노 정렬
- AssetRow: 손익(색은 의미색 유지)/평가액/목표금액에 모노 정렬
- 자릿수가 세로로 정렬되어 가독성·정렬감 향상

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Radius 8px 통일 + Glow 제거

`rounded-xl`(12px) → `rounded-lg`(8px), `rounded-3xl`(24px) → `rounded-lg` (DESIGN.md "rounded 8px" 통일). `rounded-full`(pill)은 유지.

**Files:**
- Modify: `frontend/src/app/page.tsx`, `frontend/src/app/auth/page.tsx`
- Modify: `frontend/src/components/CategorySelector.tsx`, `frontend/src/components/AssetTable.tsx`, `frontend/src/components/DonutChart.tsx`, `frontend/src/components/SummarySection.tsx`

- [ ] **Step 1: 메인 페이지 게스트 카드 + 큰 그림자**

`page.tsx:121`:
```tsx
<div className="bg-card p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-border">
```
→
```tsx
<div className="bg-card p-10 rounded-lg shadow-sm text-center max-w-md w-full border border-border">
```

`page.tsx:134, 139`의 `rounded-xl` → `rounded-lg`.

- [ ] **Step 2: auth 페이지 큰 카드 + 인풋 + 버튼**

`auth/page.tsx:80`: `rounded-3xl shadow-xl` → `rounded-lg shadow-sm`
`auth/page.tsx:86, 101, 116, 125`: `rounded-xl` → `rounded-lg`

- [ ] **Step 3: 컴포넌트 카드/드롭다운/입력**

| 파일:라인 | Before | After |
|-----------|--------|-------|
| `CategorySelector.tsx:33` | `rounded-xl shadow-2xl` | `rounded-lg shadow-lg` |
| `AssetTable.tsx:39` | `rounded-xl shadow-sm` | `rounded-lg shadow-sm` |
| `DonutChart.tsx:91` | `rounded-xl shadow-sm` | `rounded-lg shadow-sm` |
| `DonutChart.tsx:123` | `rounded-xl shadow-sm` | `rounded-lg shadow-sm` |
| `SummarySection.tsx:14, 18, 29, 33` | `rounded-xl shadow-sm` | `rounded-lg shadow-sm` |

(SummarySection 4곳 모두 `rounded-xl` → `rounded-lg`. `shadow-sm`은 이미 subtle이라 그대로.)

- [ ] **Step 4: 전수 grep으로 미수정 라인 없는지**

```bash
grep -n "rounded-xl\|rounded-3xl\|shadow-xl\|shadow-primary" /Users/cjynim/lab/snowball/frontend/src --include="*.tsx" -r
```
Expected: 빈 출력 (남은 곳이 있으면 수정).

- [ ] **Step 5: 빌드 + 시각 확인**

```bash
cd frontend && npx tsc --noEmit && npm run build
```
시각: 카드/버튼 모서리가 살짝 덜 둥글어진 것이 보여야 함(8px). 게스트 카드의 큰 그림자가 사라짐.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(ui): unify radius to 8px (rounded-lg), remove primary glow + large shadows

- rounded-xl/rounded-3xl → rounded-lg (DESIGN.md: 8px)
- shadow-xl → shadow-sm on main cards (DESIGN.md: subtle shadow)
- shadow-primary/20 already removed in Task 3
- rounded-full preserved (intentional pill shape)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Entry 모션 + 숫자 카운트업 (TDD)

**Files:**
- Create: `frontend/src/lib/hooks/useCountUp.ts`
- Create: `frontend/tests/hooks/useCountUp.test.ts`
- Modify: `frontend/src/app/globals.css` (keyframes/utility, prefers-reduced-motion)
- Modify: `frontend/src/components/SummarySection.tsx` (카운트업 적용)
- Modify: `frontend/src/components/AssetRow.tsx` (stagger 클래스)

### 7-A: 모션 유틸 정의 (globals.css)

- [ ] **Step 1: `globals.css`에 keyframes + 유틸 클래스 추가**

`globals.css` 맨 아래에 다음 추가:

```css
/* ============ Motion utilities (DESIGN.md ease-out 200-300ms, fade+translateY 420ms) ============ */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0);    }
}

@keyframes bounce-in {
  0%   { opacity: 0; transform: scale(0.95); }
  60%  { opacity: 1; transform: scale(1.02); }
  100% { opacity: 1; transform: scale(1);    }
}

.fade-up {
  animation: fade-up 420ms ease-out both;
}

.fade-up-stagger > * {
  animation: fade-up 420ms ease-out both;
}

.fade-up-stagger > *:nth-child(1) { animation-delay: 0ms; }
.fade-up-stagger > *:nth-child(2) { animation-delay: 80ms; }
.fade-up-stagger > *:nth-child(3) { animation-delay: 160ms; }
.fade-up-stagger > *:nth-child(4) { animation-delay: 240ms; }
.fade-up-stagger > *:nth-child(5) { animation-delay: 320ms; }
.fade-up-stagger > *:nth-child(n+6) { animation-delay: 400ms; }

.animate-bounce-in {
  animation: bounce-in 250ms ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .fade-up,
  .fade-up-stagger > *,
  .animate-bounce-in {
    animation: none !important;
  }
}
```

(`animate-bounce-in`은 Toast가 이미 호출 중이므로 정의를 채워주면 작동 시작.)

- [ ] **Step 2: 빌드·시각 확인**

```bash
cd frontend && npm run build && npm run dev
```
Toast를 표시하면(예: 자산 추가) bounce-in 애니메이션이 작동해야 함. `prefers-reduced-motion: reduce`(macOS Settings → Accessibility → Reduce motion)에서 비활성 확인.

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(ui): add fade-up / bounce-in keyframes + utilities with reduced-motion

- fade-up: 420ms ease-out transform+opacity
- fade-up-stagger: 80ms cascade for lists
- bounce-in: enables existing .animate-bounce-in calls in Toast
- @media (prefers-reduced-motion: reduce) disables all

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 7-B: 카운트업 훅 — TDD

훅: 시작값(start)에서 종료값(end)까지 duration ms 동안 ease-out으로 보간된 정수값을 반환.

- [ ] **Step 1: 테스트 파일 작성 ([Happy]/[Boundary]/[Error] 각 1+)**

`frontend/tests/hooks/useCountUp.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from '../../src/lib/hooks/useCountUp';

describe('useCountUp', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  // [Happy]
  it('returns end value when duration elapses (positive)', () => {
    const { result } = renderHook(() => useCountUp(0, 1000, 600));
    expect(result.current).toBe(0);
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe(1000);
  });

  it('returns end value when duration elapses (negative)', () => {
    const { result } = renderHook(() => useCountUp(0, -500, 600));
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe(-500);
  });

  // [Boundary]
  it('returns end immediately when start equals end', () => {
    const { result } = renderHook(() => useCountUp(42, 42, 600));
    expect(result.current).toBe(42);
  });

  it('returns end immediately when duration is 0', () => {
    const { result } = renderHook(() => useCountUp(0, 100, 0));
    expect(result.current).toBe(100);
  });

  it('handles large values (millions) without overflow', () => {
    const { result } = renderHook(() => useCountUp(0, 12_400_000, 600));
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe(12_400_000);
  });

  it('updates when end changes mid-animation', () => {
    const { result, rerender } = renderHook(({ end }) => useCountUp(0, end, 600), { initialProps: { end: 100 } });
    act(() => { vi.advanceTimersByTime(300); });
    rerender({ end: 200 });
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe(200);
  });

  // [Error] — 잘못된 입력 정책: NaN/undefined 인자는 end로 즉시 수렴(안전 fallback)
  it('falls back to end when start is NaN', () => {
    const { result } = renderHook(() => useCountUp(NaN, 100, 600));
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe(100);
  });

  it('falls back to 0 when end is NaN', () => {
    const { result } = renderHook(() => useCountUp(0, NaN, 600));
    expect(result.current).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인 (RED)**

```bash
cd frontend && npm test -- tests/hooks/useCountUp.test.ts --run
```
Expected: "Cannot find module '../../src/lib/hooks/useCountUp'" 또는 모든 it가 FAIL.

- [ ] **Step 3: 훅 구현 (GREEN)**

`frontend/src/lib/hooks/useCountUp.ts`:

```ts
import { useEffect, useRef, useState } from 'react';

/**
 * Animates a numeric value from `start` to `end` over `duration` ms with ease-out.
 *
 * - Returns `end` immediately if start==end, duration<=0, or inputs are NaN.
 * - Honors prefers-reduced-motion by skipping interpolation (returns end immediately).
 * - Safe to call with rapidly changing `end` (cancels previous frame loop).
 */
export function useCountUp(start: number, end: number, duration: number = 600): number {
  const [value, setValue] = useState<number>(Number.isFinite(start) ? start : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Fallback policy: invalid inputs → snap to end (or 0 if end is also invalid)
    const safeStart = Number.isFinite(start) ? start : 0;
    const safeEnd = Number.isFinite(end) ? end : 0;

    if (duration <= 0 || safeStart === safeEnd) {
      setValue(safeEnd);
      return;
    }

    // Respect reduced-motion
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(safeEnd);
      return;
    }

    const t0 = performance.now();
    const delta = safeEnd - safeStart;

    const tick = (now: number) => {
      const elapsed = now - t0;
      const t = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(safeStart + delta * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [start, end, duration]);

  return value;
}
```

- [ ] **Step 4: 테스트 PASS 확인 (GREEN)**

```bash
cd frontend && npm test -- tests/hooks/useCountUp.test.ts --run
```
Expected: 모든 테스트 PASS. (만약 fake timers + requestAnimationFrame 폴리필 이슈로 일부 FAIL이면, vitest 환경 jsdom에서 RAF 폴리필을 setup에 추가 — 보통 jsdom RAF는 동작하지만 fake timers와 함께 쓸 땐 `vi.stubGlobal('requestAnimationFrame', ...)`로 ms 기반 보간으로 단순화. 필요 시 훅을 `setTimeout` 기반으로 폴백.)

> 폴백 옵션: RAF 대신 `setInterval(16ms)` 기반으로 구현하면 fake timers와 자연스럽게 호환. RAF가 단위테스트에서 까다로우면 setInterval로 작성.

- [ ] **Step 5: REFACTOR — RAF/timer 추상화 분리 검토 (이번엔 보류)**

YAGNI. 통과하면 그대로 둔다.

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/lib/hooks/useCountUp.ts frontend/tests/hooks/useCountUp.test.ts
git commit -m "feat(ui): add useCountUp hook with TDD (Happy/Boundary/Error)

- Ease-out cubic interpolation, prefers-reduced-motion aware
- Safe fallback for NaN/0-duration/equal-bounds
- Cancels previous frame on rapid end changes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 7-C: SummarySection에 카운트업 적용 + 카드 entry 모션

- [ ] **Step 1: SummarySection의 큰 숫자에 카운트업 + 컨테이너에 stagger**

`SummarySection.tsx` 상단에 import 추가:
```tsx
import { useCountUp } from '../lib/hooks/useCountUp';
```

컨테이너 div className에 `fade-up-stagger` 추가:
```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 fade-up-stagger">
```

총 자산 카드의 숫자:
```tsx
const totalAssetValue = useCountUp(0, account.total_asset_value, 600);
// ...
<p className="text-2xl font-bold mt-1 text-foreground font-mono tabular-nums">{formatNumber(totalAssetValue)}원</p>
```

평가 손익(부호 보존):
```tsx
const plAmount = useCountUp(0, account.total_pl_amount, 600);
// ...
{plAmount > 0 ? '+' : ''}{formatNumber(plAmount)}원
```

투자 자산 동일 패턴(`useCountUp(0, account.total_invested_value, 600)`). 현금은 `NumberFormatInput`이라 인풋 값이므로 카운트업 미적용(타이핑 중 충돌).

- [ ] **Step 2: 빌드 + 시각 확인**

```bash
cd frontend && npx tsc --noEmit && npm run build && npm run dev
```
대시보드 진입 시 4개 카드가 80ms 간격으로 fade-up, 숫자가 0→실제값으로 증가하는 것 확인.

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/SummarySection.tsx
git commit -m "feat(ui): SummarySection cards fade-up stagger + count-up numbers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 7-D: AssetTable 행 stagger

- [ ] **Step 1: 테이블 tbody에 stagger**

`AssetTable.tsx`에서 `<tbody>`의 className에 `fade-up-stagger` 추가:
```tsx
<tbody className="fade-up-stagger">
```
(이미 className이 있으면 join.)

`AssetRow.tsx`의 `<tr>`에 `fade-up`은 추가 안 함 (부모 stagger가 자식에 직접 적용). 단, `<tr>` 자식 선택자는 CSS상 `> *`이므로 작동. 만약 작동 안 하면 `tr`에 직접 `className="fade-up ..."` 추가하되 nth-child delay는 부모에서 처리되므로 OK.

- [ ] **Step 2: 빌드·시각 확인 + 커밋**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/components/AssetTable.tsx
git commit -m "feat(ui): AssetTable rows fade-up stagger

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Anti-pattern 정리

- [ ] **Step 1: `h-screen` 검색 → `min-h-[100dvh]`**

```bash
grep -rn "h-screen" /Users/cjynim/lab/snowball/frontend/src --include="*.tsx"
```
출력이 있으면 각 라인에서 `h-screen` → `min-h-[100dvh]`. 없으면 skip.

- [ ] **Step 2: UI 이모지 검색**

```bash
grep -rn "[😀-🿿]\|[✅❌⚠️💬✨🎨📐]" /Users/cjynim/lab/snowball/frontend/src --include="*.tsx" --include="*.ts"
```
출력의 컨텍스트 확인:
- 토스트/상태 메시지의 텍스트성 이모지(`'⚠️'`, `'✅'`)는 **Lucide 아이콘**으로 대체.
- 주석·문자열의 이모지(로그 등)는 그대로 두어도 됨.

예: Toast에서 type === 'error'일 때 아이콘이 텍스트로 들어가있으면 `AlertCircle` (lucide-react)로.

(실제 코드에서 해당 패턴이 없으면 skip — 확인용 단계.)

- [ ] **Step 3: 채도 캡 점검 — DonutChart 색상**

`DonutChart.tsx`의 차트 색 배열에서 `#FFD700` 외에 채도 100% 색이 있는지 확인. 보조 세그먼트에 `--gold-soft`(#C9A84C) 활용:

```tsx
// DonutChart의 COLORS 배열에 gold + gold-soft 조합 사용
const COLORS = ['#FFD700', '#C9A84C', '#FFCE73', '#2DCA73', '#6C5DD3', /* ... */];
```
(현재 코드를 읽고 채도 높은 색만 골드 변종으로 일부 교체. 너무 많으면 첫 2~3 슬롯만.)

- [ ] **Step 4: 빌드 + 커밋**

```bash
cd frontend && npx tsc --noEmit && npm run build
git add -A
git commit -m "chore(ui): apply anti-pattern cleanup (h-screen→dvh, gold-soft segments)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 최종 시각·접근성·전체 검증

- [ ] **Step 1: 전체 테스트**

```bash
cd frontend && npm test -- --run 2>&1 | tee /tmp/final-tests.txt
```
Expected: 베이스라인과 동일하거나 더 좋은 PASS 수. FAIL은 0이어야.

- [ ] **Step 2: 타입체크 + 빌드**

```bash
cd frontend && npx tsc --noEmit && npm run build
```
Expected: SUCCESS.

- [ ] **Step 3: After 스크린샷 (Task 1과 동일 화면)**

`npm run dev` 후:
- `/` 대시보드 (게스트 상태, 로그인 상태 둘 다)
- `/auth/login`
- 정보 토스트 + 에러 토스트 표시 상태
- focus 상태 (인풋 포커스로 골드 ring 가시화)

저장: `docs/superpowers/specs/screenshots/after-*.png`

- [ ] **Step 4: 대비 측정 (수동 또는 도구)**

DevTools Accessibility 탭 또는 https://webaim.org/resources/contrastchecker/ 로:
- `#1A1A1A` (accent-foreground) on `#FFD700` (accent) → 12.6:1 (AAA) ✓
- `#FFD700` (accent) on `#13131A` (background) → 13.1:1 (AAA) ✓
- `#6C5DD3` (primary, 손실색) on `#13131A` → 약 4.3:1 — AA 경계. 손실 텍스트가 작으면 미달. **점검 필요**: 손실 표기가 `text-xs`/`text-[10px]`이면 텍스트 크기 4.5:1 기준 미달 가능 → 차후 별도 이슈로 트래킹(이번 plan 스코프 밖, 단 발견 사항 기록).

- [ ] **Step 5: reduced-motion 동작 확인**

macOS: System Settings → Accessibility → Display → Reduce motion ON. `npm run dev`로 다시 진입했을 때 페이드/카운트업/bounce-in이 모두 비활성(즉시 표시)되는지 확인.

- [ ] **Step 6: 손익/매도/채권 의미색 회귀 확인 (최종)**

```bash
grep -n "text-primary\|bg-primary" /Users/cjynim/lab/snowball/frontend/src/components/SummarySection.tsx /Users/cjynim/lab/snowball/frontend/src/components/AssetRow.tsx /Users/cjynim/lab/snowball/frontend/src/components/CategorySelector.tsx
```
Expected: 5곳(SummarySection:18,21,24 · AssetRow:129,132,154 · CategorySelector:8) 그대로.

```bash
grep -rn "primary-foreground\|primary/90\|primary/80\|primary/20\|primary/10\|ring-primary\|hover:text-primary\|focus:border-primary\|focus:ring-primary" /Users/cjynim/lab/snowball/frontend/src --include="*.tsx"
```
Expected: 빈 출력 — 액센트 자리에서 잔존 primary 없음.

- [ ] **Step 7: 디자인 시스템 적용 보고서 작성**

`docs/solutions/design/fintech-gold-hybrid.md` (신규):

```markdown
# Snowball Gold Hybrid Design System 적용

- 적용일: 2026-05-28
- 스펙: docs/superpowers/specs/2026-05-28-fintech-design-system-design.md
- 플랜: docs/superpowers/plans/2026-05-28-fintech-design-system.md

## 핵심 패턴
- CSS 변수 분리: `--primary`(의미색 #6C5DD3) vs `--accent`(UI 액센트 #FFD700)
- 손익/매도/채권은 `--primary` 유지, UI 강조는 `--accent`
- 접근성: 골드 위 어두운 텍스트(#1A1A1A) AAA
- 큰 면적엔 `--gold-soft`(#C9A84C) 분담

## 향후 주의
- 새 컴포넌트에서 "강조"엔 `accent`, "손실/매도/하락"엔 `primary` 사용
- `--primary` 값을 절대 #FFD700으로 바꾸지 말 것 (의미 깨짐)
```

- [ ] **Step 8: 최종 종합 커밋 + PR 준비**

```bash
git add docs/solutions/design/fintech-gold-hybrid.md docs/superpowers/specs/screenshots
git commit -m "docs(ui): add gold hybrid design system solution doc + after screenshots

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

# PR
gh pr create --title "feat(ui): apply DESIGN.md gold hybrid design system" --body "$(cat <<'EOF'
## Summary
- Introduce --accent (#FFD700) for UI accents, preserve --primary (#6C5DD3) as semantic loss/sell color
- Switch fonts to Inter + JetBrains Mono with tabular-nums on financial numbers
- Unify radius to 8px, remove primary glow on action buttons
- Add fade-up/bounce-in motion with prefers-reduced-motion support
- Hybrid approach: dark structure preserved, only accent + details changed

## Tests
- [x] Existing tests pass (assertions updated for intentional accent class renames)
- [x] New useCountUp hook with TDD (Happy/Boundary/Error)
- [x] Contrast AAA on accent buttons (12.6:1)
- [x] reduced-motion verified

## Screenshots
Before/After in docs/superpowers/specs/screenshots/

Refs:
- Spec: docs/superpowers/specs/2026-05-28-fintech-design-system-design.md
- Plan: docs/superpowers/plans/2026-05-28-fintech-design-system.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review 메모 (계획 작성자 메모 — 실행 전 참고)

**Spec coverage 점검**: 스펙 §2.1 토큰 표 → Task 2; §2.3 폰트 → Task 4; §2.4 모션 → Task 7-A; §3 컴포넌트 영향 → Task 3, 5, 6; §4 완료조건 → Task 9; §6 고려사항(접근성/모순 해소) → Task 9 Step 4 + Task 8 Step 3.

**Spec 보강**: 스펙엔 없던 두 가지를 발견·반영했다:
1. `--primary` 의미 혼용 → 토큰 분리 전략(`--primary` 보존 + 신규 `--accent`)
2. `globals.css`의 `body { font-family: Arial }` 하드코딩 → Task 4 Step 4에서 제거

**플레이스홀더 스캔**: 없음. 모든 단계에 정확한 파일 경로/라인/before-after 코드 또는 명령이 있다.

**타입 일치성**: `useCountUp(start, end, duration)` 시그니처가 7-B(정의)와 7-C(사용처)에서 일치. `--accent`/`--accent-foreground`/`--gold-soft` 토큰명도 Task 2(도입)와 Task 3(사용)에서 일치.

**잠재 위험**:
- vitest fake timers + `requestAnimationFrame`이 jsdom에서 까다로울 수 있음 → 7-B Step 4에 폴백 옵션(setInterval) 명시.
- Tailwind v4의 `accent`/`gold-soft` 임의 색 토큰이 `bg-accent/10` 같은 alpha 변형 클래스를 생성하는지 확인 필요 → v4는 임의 색 토큰에도 `/10`, `/20`, `/90` 변형을 생성하므로 OK. 단, 실패 시 `bg-[color:var(--accent)]/10` 같은 arbitrary value로 폴백.

