# FinTech 골드 하이브리드 디자인 시스템 적용 — 설계 문서

- **작성일**: 2026-05-28
- **상태**: 승인됨 (브레인스토밍 완료 → writing-plans 대기)
- **원천**: `DESIGN.md` (FinTech Plataforma Financeira — Gold/Dark 시스템)
- **대상**: `frontend/` (Next.js 16 + React 19 + Tailwind CSS 4)

---

## 1. 개요 및 목적

`DESIGN.md`의 "Gold + Dark, premium/trust" 핀테크 시각 언어를 Snowball **대시보드 앱**에 입힌다.
단, `DESIGN.md`는 본래 **마케팅 랜딩페이지** 시스템이므로, 랜딩 전용 요소(Hero/Pricing/Testimonials)는 만들지 않고
**디자인 토큰·컴포넌트 스타일·모션 원칙만** 기존 대시보드/인증 화면에 흡수한다.

### 1.1 브레인스토밍 결정 요약

| 결정 | 선택 | 비고 |
|------|------|------|
| 색상 정체성 | **B. 골드 액센트 하이브리드** | 다크 구조 유지 + 액센트만 Purple→Gold |
| 적용 범위 | **기존 화면 전체** | 대시보드 + `auth/`. 신규 랜딩페이지 제작 없음 |
| 폰트 | **Inter + JetBrains Mono** | 현재 Geist 교체. 숫자/금액/티커는 모노 |
| Radius / Glow | **8px 통일 + 외곽 glow 제거** | DESIGN.md "No outer glows" |
| 모션 | **Entry 애니메이션 + 숫자 카운트업** | transform/opacity만, reduced-motion 존중 |
| Anti-pattern | **정리 채택** | 이모지→Lucide, dvh, 채도 캡 |

### 1.2 핵심 원리 (왜 토큰부터인가)

색을 컴포넌트마다 바꾸지 않는다. `globals.css`의 CSS 변수는 이미 `@theme inline`으로 Tailwind에 연결돼 있어,
**변수 한 곳만 바꾸면 전 화면에 전파**된다. (조명 색만 바꿔 방 전체 분위기를 바꾸는 것과 같다.)
컴포넌트에서 직접 손대는 것은 색이 아니라 **radius·glow·폰트 클래스·모션**뿐이다.

---

## 2. 아키텍처: 토큰 레이어

### 2.1 색상 토큰 매핑 (`frontend/src/app/globals.css`)

| 토큰 | 현재 | 변경 후 | 근거 |
|------|------|---------|------|
| `--primary` | `#6C5DD3` | `#FFD700` | 골드 액센트 |
| `--accent` | `#6C5DD3` | `#FFD700` | primary와 동일 유지 |
| `--primary-foreground` | `#FFFFFF` | **`#1A1A1A`** | ⚠️ 골드 배경 위 흰 텍스트는 대비 미달 → 어두운 텍스트 필수 |
| `--accent-foreground` | `#FFFFFF` | **`#1A1A1A`** | 동일 |
| `--ring` | `#6C5DD3` | `#FFD700` | focus 링 |
| `--gold-soft` *(신규)* | — | `#C9A84C` | 큰 면적·hover·차트 보조 세그먼트 |
| `--background` | `#13131A` | **유지** | 하이브리드: 다크 구조 보존 |
| `--card` | `#1C1C24` | **유지** | 동일 |
| `--secondary` | `#242731` | **유지** | 동일 |
| `--border` / `--input` | `#2D2D3A` / `#242731` | **유지** | 동일 |
| `--muted` | `#92929D` | **유지** | 동일 |
| `--success` | `#2DCA73` | **유지** | 이익·매수 의미색 |
| `--danger` / `--destructive` | `#FF6B6B` | **유지** | 손실·매도 의미색 |
| `--warning` | `#FFCE73` | **유지** | 현금·경고 |

신규 토큰은 `:root`와 `@theme inline`(`--color-gold-soft: var(--gold-soft)`) 양쪽에 등록한다.

### 2.2 골드 적용 규칙 (어디에 쓰고 어디에 안 쓰는가)

**골드로 강조 (액센트)**
- 주요 버튼: 리밸런싱 실행 (배경 골드 + **어두운 텍스트** `#1A1A1A`)
- 활성 탭/네비 인디케이터, focus ring
- 카드 좌측 강조 보더, 헤더 로고
- 도넛 차트 주요 세그먼트 (보조는 `--gold-soft`)

**골드 안 씀 (의미색 유지)**
- 이익=초록 / 손실=빨강, 매수 버튼=초록 / 매도 버튼=빨강
- 현금·경고=노랑
- 배경·카드·테두리=현행 다크

### 2.3 타이포그래피 (`frontend/src/app/layout.tsx`)

- `next/font/google`에서 `Geist`/`Geist_Mono` → **`Inter`** + **`JetBrains_Mono`** 로 교체
- CSS 변수: 기존 `--font-geist-sans`/`--font-geist-mono`를 의미 중립 이름(`--font-sans`/`--font-mono`)으로 교체하고, `layout.tsx`의 body className과 `globals.css`의 `body { font-family }` 참조를 **함께** 갱신 (한쪽만 바꾸면 폰트 미적용)
- 숫자·금액·티커 표기 요소에 `font-mono` + `tabular-nums` 적용 → 자릿수 세로 정렬
- 적용 후보: `SummarySection`(총자산/손익/원금/현금), `AssetRow`(평가액/비중/수량/단가), `NumberFormatInput`

### 2.4 모션 (`frontend/src/app/globals.css` keyframes + 유틸 클래스)

- entry: `fade + translateY(16px→0)` 420ms ease-out; 리스트 80ms stagger
- 숫자 카운트업: 총자산/평가손익 등 핵심 수치
- **`transform`/`opacity`만** 애니메이트 (layout-trigger 금지)
- `@media (prefers-reduced-motion: reduce)`에서 애니메이션 무력화

---

## 3. 컴포넌트 영향 범위

색상은 토큰으로 자동 전파되므로, 아래는 **radius·glow·폰트·모션 클래스 조정** 중심이다.
(전 경로 실재 확인 완료: `frontend/src/components/`, `frontend/src/app/`)

| 파일 | 변경 내용 |
|------|-----------|
| `app/globals.css` | 토큰 교체/추가, keyframes, reduced-motion |
| `app/layout.tsx` | 폰트 교체 (Inter/JetBrains Mono) |
| `components/SummarySection.tsx` | 카드 radius 8px, 숫자 모노, entry 모션, 카운트업 |
| `components/AssetTable.tsx` / `AssetRow.tsx` | radius 8px, 숫자 모노, 행 stagger, 버튼 의미색 유지 |
| `components/AccountTabs.tsx` | 활성 탭 골드 인디케이터, radius |
| `components/AccountHeader.tsx` | 골드 액센트, radius |
| `components/Header.tsx` | 로고 골드 액센트 |
| `components/DonutChart.tsx` | 주요 세그먼트 골드 + `gold-soft` 팔레트 |
| `components/AddAssetDialog.tsx` *(존재 시 모달)* | radius, glow 제거, 버튼 |
| `components/CategorySelector.tsx` / `TickerSearchInput.tsx` / `DebouncedInput.tsx` / `NumberFormatInput.tsx` | 인풋 radius, focus ring 골드 |
| `components/Toast.tsx` | radius, glow 제거 |
| `app/auth/**` | 토큰 자동 전파 + radius/glow/폰트 정리 |

> 참고: `AddAssetDialog`는 CLAUDE.md 문서엔 있으나 `components/` 직접 목록엔 없었다. 구현 단계에서 실제 위치(모달 트리거 위치)를 재확인한다.

---

## 4. 완료조건 (Completion Criteria)

- [ ] `globals.css`의 `--primary`/`--accent`/`--ring`/`*-foreground`가 골드 체계로 교체되고, `--gold-soft` 추가됨
- [ ] `--success`/`--danger`/`--warning`/배경 계열 토큰은 **변경되지 않음** (의미색 보존 회귀 테스트)
- [ ] `layout.tsx`가 Inter + JetBrains Mono를 로드하고, 숫자 표기 요소에 모노+tabular-nums 적용됨
- [ ] 전역 radius가 8px(`rounded-lg`)로 통일되고, `shadow-*primary*` 외곽 glow가 제거됨
- [ ] entry 모션 + 숫자 카운트업 동작, `prefers-reduced-motion`에서 비활성화됨
- [ ] 골드 버튼 텍스트 대비 ≥ 4.5:1 (WCAG AA) 충족
- [ ] **검증 명령**:
  - `cd frontend && npx tsc --noEmit` 통과
  - `cd frontend && npm test` (기존 테스트) 통과 — 회귀 0건
  - `cd frontend && npm run build` 성공
  - before/after 스크린샷 확보 (대시보드 + auth)

---

## 5. 금지사항 (Don'ts)

- 의미색(success/danger/warning)을 골드로 바꾸지 **말 것** → 손익·매수/매도 색은 그대로 둔다
- 배경/카드/테두리 색을 `#1A1A1A`/`#000`으로 전면 교체하지 **말 것** → 현행 다크 네이비 유지 (A안이 아니라 B안)
- 골드 배경 버튼에 흰 텍스트를 쓰지 **말 것** → 어두운 텍스트(`#1A1A1A`) 사용
- 컴포넌트에 색상 hex를 하드코딩하지 **말 것** → 반드시 CSS 변수/Tailwind 토큰 경유
- 외곽 glow(box-shadow 광)를 새로 추가하지 **말 것** → subtle shadow만
- 랜딩페이지(Hero/Pricing/Testimonials)를 새로 만들지 **말 것** → 이번 스코프 밖
- `layout`-trigger 속성(width/height/top 등)을 애니메이트하지 **말 것** → transform/opacity만

---

## 6. 고려사항 (Considerations)

- **접근성**: 골드(#FFD700) 위 텍스트 대비. 어두운 텍스트로 AA 충족 확인. focus 가시성 유지.
- **DESIGN.md 내부 모순**: `#FFD700`은 채도 100%인데 anti-pattern은 "채도 80% 캡"을 요구 → 모순. 해소책: 액센트 포인트엔 `#FFD700` 유지하되, **큰 면적/보조엔 `--gold-soft`(#C9A84C)** 로 분담해 쨍함 완화.
- **성능**: 모션은 transform/opacity로 GPU 합성, reflow 없음.
- **회귀 위험**: 토큰 교체가 전 화면 전파 → 의외의 곳(차트 색, 호버) 변색 가능. 스크린샷 회귀로 감지.
- **테스트 보호**: 기존 테스트가 특정 색/클래스 문자열에 의존하면 깨질 수 있음 → CLAUDE.md Test Protection Protocol 준수(임의 수정 금지, 변경 의도 확인).
- **다크 모드 전용**: DESIGN.md는 라이트 모드 없음(✗). 현행도 다크 전용이라 일치.

---

## 7. 제약사항 (Constraints)

- **기술 스택 고정**: Next.js 16.1.1, React 19.2.3, Tailwind CSS 4, Recharts 3.6, Zustand 5, Lucide React. 신규 무거운 의존성 추가 지양.
- **node_modules 미설치 상태**: 현재 frontend 의존성이 설치돼 있지 않음(진단 오류 확인됨). 빌드/테스트/스크린샷 검증 전 `npm install` 필요.
- **Tailwind v4**: 설정이 `@theme`/PostCSS 기반이라 v3식 `tailwind.config` 가정 금지. 변수는 `globals.css`에서 관리.
- **shadcn/ui 미사용**: 커스텀 컴포넌트뿐 → 라이브러리 토큰이 아니라 직접 작성한 className을 조정해야 함.

---

## 8. 스킬 검색 (Skill Discovery)

- **Memory 확인**: `MEMORY.md`에 스킬 매핑 테이블 없음 → fresh 검색 수행.
- **교차 비교 결과**: 아래는 현재 세션에 실재하는 스킬/에이전트 기준 매핑. (Memory 저장 여부는 문서 말미에서 사용자 확인)

| 스킬/에이전트 | 용도 | 적용 Task |
|---------------|------|-----------|
| `vercel-react-best-practices` | React/Next.js 성능·패턴 (필수) | 폰트(next/font), 컴포넌트 수정, 리뷰 |
| `vercel-composition-patterns` | 컴포넌트 합성 패턴 | 모션/카운트업 컴포넌트 설계 |
| `compound-engineering:ce-frontend-design` / `frontend-design` | 비주얼 디자인 품질 (slop 방지, 스크린샷 검증) | 골드 적용·타이포·모션 구현 |
| `web-design-guidelines` | 접근성·웹 표준 감사 | 대비/포커스/모션 접근성 검증 |
| `code-review` (built-in) | 경량 반복 리뷰 (P0/P1 0건까지) | 각 코드 Task 후 |
| `compound-engineering:ce-code-review` | 다관점 정밀 최종 게이트 | 전체 완료 후 1회 |
| `superpowers:writing-plans` | 구현 계획 작성 | 본 문서 다음 단계 |
| `superpowers:test-driven-development` / `tdd` | 모션/카운트업 등 로직 TDD | 카운트업 유틸 등 |
| `rl` / `rl-verify` | 검증 루프 / 기술 타당성 | Task별·플랜 최종 검증 |

> React/Next.js 코드이므로 `/code-review`·`/ce-code-review` 호출 시 **"Vercel best-practices 기준" 명시** (사용자 글로벌 규칙).

---

## 9. Task List (개략 — writing-plans에서 정밀화)

순차 실행. 각 코드 Task 후 `/code-review`(P0/P1 0건까지) → 전체 완료 후 `/ce-code-review` 1회.

1. **디자인 토큰 교체** (`globals.css`)
   - 완료조건: primary/accent/ring/foreground 골드화 + gold-soft 추가, 의미색·배경 불변. `tsc`/`build` 통과.
   - 스킬: vercel-react-best-practices, web-design-guidelines(대비)
2. **폰트 교체** (`layout.tsx` + 숫자 표기 요소)
   - 완료조건: Inter/JetBrains Mono 로드, 숫자 모노+tabular-nums 적용. 빌드 통과.
   - 스킬: vercel-react-best-practices
3. **Radius 8px 통일 + Glow 제거** (전 컴포넌트 className)
   - 완료조건: rounded-xl→rounded-lg, shadow primary-glow 제거. 시각 회귀 확인.
   - 스킬: ce-frontend-design
4. **Entry 모션 + 숫자 카운트업**
   - 완료조건: 애니메이션 동작 + reduced-motion 비활성. transform/opacity만. TDD(카운트업 로직).
   - 스킬: test-driven-development, vercel-composition-patterns
5. **Anti-pattern 정리**
   - 완료조건: UI 이모지→Lucide, h-screen→min-h-[100dvh], 채도 캡 점검.
   - 스킬: web-design-guidelines
6. **시각·접근성 최종 검증**
   - 완료조건: before/after 스크린샷, 대비 AA, 전체 테스트·tsc·build 통과.
   - 스킬: ce-frontend-design, web-design-guidelines, rl-verify

---

## 10. 테스트 / 검증 전략

- **회귀 우선**: 변경 전 `npm test` 베이스라인 확보(CLAUDE.md Test Protection Protocol).
- **단위**: 숫자 카운트업/포맷 로직은 TDD([Happy]/[Boundary]/[Error] 각 1+).
- **시각**: 대시보드·auth 화면 before/after 스크린샷.
- **접근성**: 골드 버튼/링크 대비, focus 가시성, reduced-motion.
- **타입/빌드**: `npx tsc --noEmit`, `npm run build`.

---

## 11. DESIGN.md 모순/갭 메모

- **채도 캡 vs #FFD700**: §6 고려사항 해소책 적용.
- **랜딩 전용 체크리스트(§8)**: Navbar+Hero/Pricing/Testimonials/CTA/SEO는 대시보드 앱에 부적용 → 스코프 제외(원칙만 흡수).
- **폰트 스케일(§10)**: Hero clamp 등은 랜딩용. 대시보드는 기존 스케일 유지하되 폰트 패밀리만 교체.
