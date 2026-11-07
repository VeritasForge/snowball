# 막힘 — 사용자 결정 필요
분류: 결정 불가 (4건). 자율로 진행할 수 있는 나머지는 모두 끝났다.

## 1. layout/adapt (가장 큰 항목)
시도한 것: critique·DESIGN.md·실제 화면(게스트 모드)을 확인했다. 편차 표시는 새 화면 요소라 방향이 갈린다.
선택지:
- A. 표의 현재 비중 칸에 편차 숫자(+n.n%p)와 작은 막대를 넣는다. 구조 변경 최소. 도넛 유지.
- B. 도넛을 목표 대비 막대(bullet chart)로 교체한다. critique의 North Star와 가장 맞지만 변경이 크다.
- C. 도넛은 유지하고 표에 편차 열을 추가한다. 열이 12개가 되어 가로 스크롤이 더 심해진다.
행동 열(매수/매도): 표의 오른쪽 sticky 고정, 또는 종목명 바로 옆으로 이동 중 선택. 좁은 폭(1024px 이하)에서 실제로 밀리는지는 아직 화면으로 확인하지 못했다.
권장: A + 행동 열 sticky 고정.

## 2. 손실 글자 대비 (3.34:1)
필요한 것: AssetRow.test.tsx:73, SummarySection.test.tsx:32의 text-primary 단정을 새 토큰(예: text-loss #9B8FFF)으로 바꾸는 승인.

## 3. Toast 에러 글자색 (white on coral 2.78:1)
필요한 것: Toast.test.tsx의 text-white 단정을 text-accent-foreground로 바꾸는 승인.

## 4. 카테고리 5색을 코랄·보라(손익·매수·매도)와 분리
필요한 것: 팔레트 결정. 현재 칩(토큰)과 도넛(Tailwind hex)이 서로 다른 값이라 함께 정리해야 한다.
