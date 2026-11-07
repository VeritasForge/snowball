---
name: Snowball
description: 목표 비중과 현재 비중의 차이를 읽고 매수/매도 방향을 정하는, 어두운 톤의 자산배분 대시보드
colors:
  midnight-ink: "#13131A"
  slate-panel: "#1C1C24"
  dusk-slate: "#242731"
  hairline-slate: "#2D2D3A"
  fog-grey: "#92929D"
  paper-white: "#FFFFFF"
  bullion-gold: "#FFD700"
  soft-bullion: "#C9A84C"
  gold-ink: "#1A1A1A"
  dusk-violet: "#6C5DD3"
  coral-signal: "#FF6B6B"
  ledger-green: "#2DCA73"
  amber-notice: "#FFCE73"
typography:
  heading:
    fontFamily: "Inter, Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
  body:
    fontFamily: "Inter, Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  body-medium:
    fontFamily: "Inter, Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
  label:
    fontFamily: "Inter, Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1rem"
  table-head:
    fontFamily: "Inter, Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.05em"
  numeric:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
    fontFeature: "tnum"
rounded:
  lg: "8px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "20px"
components:
  button-accent:
    backgroundColor: "{colors.bullion-gold}"
    textColor: "{colors.gold-ink}"
    typography: "{typography.body-medium}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-confirm-trade:
    backgroundColor: "{colors.ledger-green}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.lg}"
    padding: "4px 8px"
  card:
    backgroundColor: "{colors.slate-panel}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  tab-chip:
    backgroundColor: "{colors.dusk-slate}"
    textColor: "{colors.paper-white}"
    typography: "{typography.body-medium}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  toast-notice:
    backgroundColor: "{colors.bullion-gold}"
    textColor: "{colors.gold-ink}"
    typography: "{typography.body-medium}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  toast-error:
    backgroundColor: "{colors.coral-signal}"
    textColor: "{colors.paper-white}"
    typography: "{typography.body-medium}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
---

# Design System: Snowball

## Overview

**Creative North Star: "The Compass Board"**

스노우볼의 화면은 나침반 판처럼 읽힙니다. 사용자가 확인하려는 것은 "지금 목표에서 얼마나 벗어나 있고, 어느 방향으로 가야 하는가"이므로, 목표 비중과 현재 비중의 차이, 그리고 매수/매도 방향이 화면의 중심에 놓입니다. 장식은 이 판독을 돕는 경우에만 허용합니다.

분위기는 정밀하고, 절제되어 있으며, 차분합니다. 어두운 면 위에 숫자가 정렬되어 있고, 색은 의미를 전달할 때에만 사용합니다. 골드는 목표 영역과 사용자가 취할 행동을 가리키는 신호이며, 면 전체를 채우는 장식 색이 아닙니다. 밀도는 높은 편이지만, 숫자는 항상 같은 자리에 같은 폭으로 놓여 눈이 흔들리지 않게 합니다.

**Key Characteristics:**
- 어두운 면의 밝기 차이(톤 레이어링)로 구조를 만들고, 그림자는 떠 있는 요소에만 쓴다.
- 금액, 수량, 비중은 JetBrains Mono와 tabular-nums로 자릿수를 정렬한다.
- 골드는 목표와 행동 지시에, 코랄과 보라는 수익과 손실에, 녹색은 완료와 체결에 쓴다.
- 모션은 ease-out 200~420ms의 fade와 translateY뿐이며, `prefers-reduced-motion`에서는 모두 끈다.

## Colors

어두운 남색 계열의 중성 면 위에 골드 하나가 신호를 맡고, 코랄과 보라가 수익과 손실을 가르는 팔레트입니다.

### Primary
- **Bullion Gold** (#FFD700): 주요 행동 버튼, focus ring, 목표금액·리밸런싱 영역 표시, 알림 토스트에 쓰입니다. 채도가 매우 높아서 큰 면적에는 쓰지 않고, 면 전체가 필요하면 10% 투명도 틴트(`accent/10`)나 Soft Bullion을 씁니다.
- **Soft Bullion** (#C9A84C): 골드가 필요하지만 면적이 큰 자리에 쓰는 낮은 채도의 골드입니다.
- **Gold Ink** (#1A1A1A): 골드 면 위에 올리는 글자색입니다.

### Secondary
- **Dusk Violet** (#6C5DD3): 평가 손실(음수 손익)의 의미색입니다. 손익 카드의 왼쪽 띠와 손익 숫자에 쓰입니다.

### Neutral
- **Midnight Ink** (#13131A): 페이지 배경입니다.
- **Slate Panel** (#1C1C24): 카드, 팝오버, 드롭다운의 면입니다.
- **Dusk Slate** (#242731): 입력 필드, 칩, 표 머리글 같은 보조 면입니다.
- **Hairline Slate** (#2D2D3A): 카드와 표의 1px 테두리, 행 구분선입니다.
- **Fog Grey** (#92929D): 라벨, 보조 설명, 비활성 텍스트입니다.
- **Paper White** (#FFFFFF): 본문 텍스트와 숫자입니다. 배경으로는 쓰지 않습니다.

### Semantic
- **Coral Signal** (#FF6B6B): 평가 수익(양수 손익)을 나타내며, 오류 토스트와 삭제 확인에도 쓰입니다.
- **Ledger Green** (#2DCA73): 목표 비중 100% 달성과 매매 체결을 나타냅니다.
- **Amber Notice** (#FFCE73): 목표 비중 합계가 100%에 못 미칠 때의 경고와 입력 중 강조선입니다.

### Named Rules
**The Gold Is a Signal Rule.** 골드는 "여기를 보고 행동하라"는 자리에만 쓴다. 목표금액·리밸런싱 열, 주요 버튼, focus ring, 알림 토스트가 그 자리이며, 장식과 큰 면의 채움에는 쓰지 않는다.

**The Korean Convention Rule.** 수익과 상승은 코랄(빨강 계열), 손실과 하락은 보라 계열로 표시한다. 한국 증시의 관례를 따르며, 서구 관례(수익 녹색, 손실 빨강)로 뒤집지 않는다.

**The Never Color Alone Rule.** 상태는 색에만 의존하지 않는다. 목표 비중 100% 달성은 녹색과 함께 CheckCircle2 아이콘과 스크린리더용 "완료" 텍스트로 전달한다.

## Typography

**Display Font:** Inter (한글은 Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR으로 fallback)
**Body Font:** Inter (같은 fallback)
**Label/Mono Font:** JetBrains Mono (금액, 수량, 비중)

**Character:** 본문은 중립적인 산세리프로 물러서 있고, 숫자만 고정폭으로 또렷하게 서 있는 조합입니다. Inter는 라틴 서브셋만 로드하므로 한글 글리프는 OS 폰트가 맡습니다.

### Hierarchy
- **Heading** (700, 1.5rem, 2rem): 페이지 제목과 요약 카드의 핵심 숫자.
- **Body** (400, 0.875rem, 1.25rem): 표 본문, 설명 문장.
- **Body Medium** (500, 0.875rem, 1.25rem): 버튼, 칩, 카드 라벨.
- **Label** (400, 0.75rem, 1rem): 표 위 안내 문구, 보조 설명.
- **Table Head** (700, 11px, 자간 0.05em, 대문자): 표 머리글.
- **Numeric** (JetBrains Mono, 700, 1.5rem, tnum): 총 자산, 손익, 보유 현금처럼 눈에 먼저 들어와야 하는 금액.

### Named Rules
**The Numbers Are Mono Rule.** 금액, 수량, 비중은 항상 `font-mono tabular-nums`로 쓴다. 자릿수가 바뀌어도 열이 흔들리지 않아야 한다.

## Layout

페이지는 가로 전체 폭을 쓰는 단일 컬럼이며 바깥 여백은 16px입니다. 최소 높이는 `h-screen`이 아니라 `min-h-[100dvh]`로 잡아 모바일 주소창 변화에도 흔들리지 않게 합니다. 상단에는 헤더와 계좌 탭이 오고, 그 아래 요약 카드 4개(총 자산, 평가 손익, 투자 자산, 보유 현금)가 `md` 이상에서 4열 그리드, 그보다 좁으면 1열로 쌓입니다. 그 아래에 자산 표가 전체 폭으로 놓이고 표는 가로 스크롤로 넘칩니다.

간격은 4px 기반의 Tailwind 단계를 따르며, 카드 내부는 20px(요약 카드) 또는 16px(헤더, 표 셀), 카드 사이 간격은 16px, 섹션 사이는 24px입니다. 목록과 카드 그룹은 80ms 간격으로 순차 등장합니다.

## Elevation & Depth

깊이는 톤 레이어링이 맡습니다. 페이지 배경(Midnight Ink) 위에 카드(Slate Panel), 그 위에 보조 면(Dusk Slate)을 올리는 세 단계이며, 경계는 1px Hairline Slate 테두리로 보강합니다. 어두운 배경에서는 그림자가 거의 보이지 않으므로, 평소 구조를 그림자에 의존하지 않습니다.

### Shadow Vocabulary
- **Resting** (`shadow-sm`): 카드와 헤더에 깔리는 미세한 그림자입니다. 시각적 효과보다 일관성을 위한 기본값입니다.
- **Floating** (`shadow-lg`): 드롭다운, 토스트처럼 다른 요소 위에 떠 있는 요소에만 씁니다.

### Named Rules
**The Tonal First Rule.** 새 카드는 그림자 없이 면의 밝기 차이로 먼저 만든다. 그림자는 위에 떠 있는 요소(popover, toast, dropdown)에만 쓴다.

## Shapes

형태는 두 가지 어휘로 정리됩니다. 카드, 버튼, 입력, 드롭다운 같은 면과 컨트롤은 8px의 완만한 모서리(`rounded-lg`)를 쓰고, 계좌 탭, 칩, 토스트, 분류 아이콘처럼 "하나의 선택지"나 "하나의 알림"인 요소는 완전한 알약형(`rounded-full`)을 씁니다. 카드의 왼쪽에 4px 색 띠(`border-l-4`)를 두어 의미(수익, 손실, 강조)를 표시하는 방식이 요약 카드의 고유한 형태입니다. 표는 `divide-y`의 가로 구분선만 쓰고 세로선은 쓰지 않습니다.

## Components

### Buttons
- **Shape:** 8px 모서리(`rounded-lg`).
- **Primary (accent):** Bullion Gold 면에 Gold Ink 글자, 패딩 8px 16px, 500 굵기. Hover 시 `accent/90`으로 약간 어두워집니다.
- **체결(trade confirm):** Ledger Green 면에 흰 글자, 작은 크기(10px, 700), 패딩 4px 8px. Hover 시 `success/80`.
- **삭제 확인:** Coral Signal 면에 흰 글자의 작은 아이콘 버튼.
- **Ghost/Text:** 테두리 없이 Fog Grey 글자이며 hover 시 Gold 또는 Paper White로 바뀝니다.

### Chips (계좌 탭)
- **Style:** 알약형, 패딩 8px 16px, 14px 500, 1px 테두리.
- **계좌 추가:** `accent/10` 배경에 `accent/20` 테두리와 골드 글자. 입력 중에는 골드 테두리의 알약 안에 이름 입력과 확인/취소 아이콘이 들어갑니다.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** Slate Panel.
- **Shadow Strategy:** Resting 그림자와 Hairline Slate 테두리(표 컨테이너). 요약 카드는 테두리 대신 왼쪽 4px 색 띠를 씁니다.
- **Internal Padding:** 요약 카드 20px, 헤더와 표 머리 영역 16px.

### Inputs / Fields
- **Style:** 금액 입력은 Dusk Slate 면 또는 투명 배경에 아래쪽 2px 선을 쓰며, 숫자는 JetBrains Mono로 씁니다.
- **Focus:** 보유 현금처럼 편집 중인 입력은 Amber Notice 계열 선(`warning`)으로 강조하고, 나머지 입력의 focus는 Bullion Gold입니다. 목표 비중 칸은 `ring-2` 금색 링을 두르고, 밑줄형 입력(종목명·평단가·현재가·수량)은 밑줄이 금색으로 바뀝니다.

### Navigation
- 헤더는 Slate Panel 카드 안에 제목(골드 TrendingUp 아이콘 포함), 부제, 로그인 상태를 둡니다. 로그인 링크는 Primary 버튼, 사용자 표시는 Dusk Slate 알약입니다.

### Summary Card (signature)
왼쪽 4px 색 띠와 라벨(Fog Grey 14px), 핵심 숫자(Numeric)로 이루어진 카드입니다. 총 자산은 골드 띠, 평가 손익은 수익이면 코랄, 손실이면 보라 띠를 쓰고, 숫자는 count-up으로 올라갑니다.

### Rebalancing Columns (signature)
자산 표에서 "목표금액"과 "리밸런싱 매매" 열만 `accent/10` 배경 틴트로 구분해 사용자가 행동할 자리를 한눈에 찾게 합니다. 목표 비중 합계는 열 머리글 아래에 상태 문구(100% 완료, 초과 n%, 잔여 n%)로 표시되며, 각각 녹색, 코랄, 앰버를 씁니다.

### Donut Chart
Recharts 도넛이 자산군별 비중과 현금을 표시합니다. 자산군 색은 별도 팔레트(주식 #ef4444, 채권 #3b82f6, 원자재 #eab308, 현금 #22c55e, 기타 #94a3b8)를 쓰며 위의 시맨틱 색 토큰과는 독립입니다.

### Toast
알약형이며 상단 중앙에 고정됩니다. 일반 알림은 Bullion Gold, 오류는 Coral Signal 면을 쓰고 250ms의 bounce-in으로 등장합니다.

## Do's and Don'ts

### Do:
- **Do** 금액, 수량, 비중에 `font-mono tabular-nums`를 쓴다.
- **Do** 골드는 목표 영역, 주요 행동, focus ring, 알림에 한정하고, 면적이 큰 곳은 `accent/10` 틴트나 Soft Bullion(#C9A84C)을 쓴다.
- **Do** 수익은 코랄, 손실은 보라로 표시하는 한국 증시 관례를 유지한다.
- **Do** 상태를 색과 함께 아이콘 또는 텍스트로 전달한다(예: CheckCircle2와 sr-only "완료").
- **Do** 애니메이션은 `transform`과 `opacity`만 쓰고, ease-out 200~420ms를 지키며, `prefers-reduced-motion`에서는 끈다.
- **Do** 아이콘은 Lucide로 통일한다.
- **Do** 전체 높이는 `min-h-[100dvh]`로 잡는다.

### Don't:
- **Don't** UI에 이모지를 쓰지 않는다. 아이콘 시스템(Lucide)만 쓴다.
- **Don't** 순백(#FFFFFF)을 배경으로 쓰지 않는다. 배경은 항상 Midnight Ink 계열이다.
- **Don't** 새 카드에 그림자를 먼저 얹지 않는다. 그림자는 드롭다운, 토스트처럼 떠 있는 요소에만 쓴다.
- **Don't** 골드를 큰 면의 채움이나 장식에 쓰지 않는다.
- **Don't** 레이아웃을 움직이는 속성(width, height, margin 등)을 애니메이션하지 않는다.
- **Don't** `h-screen`을 쓰지 않는다.
