---
target: dashboard main screen (frontend/src/app/page.tsx)
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/jaeyoungcho/lab/snowball/frontend/src/app/page.tsx"
target_fingerprint: "sha256:e63dd700b91edd29455ad6ff10be64359a490892a4a9390f5dcd765d98aed7e9"
target_path: /Users/jaeyoungcho/lab/snowball/frontend/src/app/page.tsx
timestamp: 2026-11-06T13-42-39Z
slug: frontend-src-app-page-tsx
---
Method: dual-agent (A: general-purpose · B: general-purpose)

검증 범위: 앱을 렌더링하지 못했다(frontend/node_modules 없음, 3000 포트는 다른 프로젝트가 점유). 시각 판단은 소스와 계산한 대비 수치에 근거하며 레이아웃 폭은 추정이다.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | 토스트 3초 소멸, aria-live 없음, 10초 폴링 변화 미안내 |
| 2 | Match System / Real World | 2 | 영문 H1, 체결이 모의인지 불명확 |
| 3 | User Control and Freedom | 2 | 체결 되돌리기 없음, 계좌 삭제만 confirm() |
| 4 | Consistency and Standards | 2 | 확인 패턴 3종, 손익률 부호 표기 불일치 |
| 5 | Error Prevention | 2 | 확인 단계에 수량·금액·예수금 변화 없음 |
| 6 | Recognition Rather Than Recall | 2 | 카테고리 10px 한 글자, 입력 밑줄 대비 1.25:1 |
| 7 | Flexibility and Efficiency | 2 | 정렬·일괄 체결·잔여 비중 자동 채움 없음 |
| 8 | Aesthetic and Minimalist Design | 2 | 11열 표, 이모지 잔존 |
| 9 | Error Recovery | 2 | 실패 토스트 3초 소멸, 낙관적 업데이트 실패 표시 없음 |
| 10 | Help and Documentation | 1 | 10~12px 회색 두 줄이 전부 |
| **Total** | | **19/40** | **Poor (47.5%, 경계)** |

## Design Specificity Verdict

부분적으로 이 제품을 위해 만들어졌으나 핵심 판독 장면은 범용 CRUD 테이블이다. DESIGN.md의 North Star(목표 대비 편차와 방향)가 UI에 형태로 없다. 디텍터: side-tab 4건(SummarySection.tsx 22/26/37/41), bounce-easing 4건(globals.css 107/108/114, Toast.tsx 16; 사실상 bounce-in 1건 중복 집계).

## Priority Issues

- [P1] 현재 비중과 목표 비중의 편차가 화면 어디에도 없음 (layout, clarify)
- [P1] 매매 실행 UX: "모의" 표기 0건, AssetTable.tsx 44행은 "실제 반영됩니다", 확인 정보 없음, 체결 버튼 대비 2.14:1, 매수 버튼 2.78:1 (clarify, harden)
- [P1] 행동 열이 11열 표의 10~11번째라 가로 스크롤 바깥으로 밀림, 소스 기반 추정 (layout, adapt)
- [P1] 접근성: AssetRow 입력 5곳 outline-none, 목표 비중 입력은 포커스 표시 없음, 손실 텍스트 3.34:1, 입력 경계 1.25:1, 휴지통 hover 전용, aria-live 0건 (audit, harden, colorize)
- [P2] 코랄·보라가 수익/오류/삭제/주식, 손실/매도/채권에 중복 사용, 도넛 툴팁 hsl(var(--card)) 무효 (colorize, polish)

## Persona Red Flags

Alex: 종목별 비중 개별 입력, 10번 클릭 리밸런싱, 일괄 체결·정렬 없음.
Sam: 포커스 미표시, 휴지통 키보드 불가시, 드롭다운 Esc 불가, 체결 결과 음성 안내 없음.
월/분기 리밸런서: 편차 불가시, 매수 열이 표 끝, 10초 갱신이 소음, 모의 체결이 실주문처럼 보임, 기록 비교 없음.

## Minor Observations

브랜드 표기 3종, hover:text-red-600 토큰 밖 색, isLoadingPrices 항상 false, 투자 자산·현금 카드 띠 색이 DESIGN.md 의미와 불일치, 계좌 탭 tablist/aria-selected 없음, NumberFormatInput이 음수·지수 표기 허용.

## Questions to Consider

1. 매수/매도가 주인공이라면 왜 10번째 열에서 11px로 숨어 있는가?
2. 분기에 한 번 오는 사용자에게 10초 갱신이 기본이어야 하는가?
3. "모의 체결"이 차별점이라면 왜 "모의"라고 쓰지 않는가?
4. 도넛보다 목표 대비 막대(bullet chart)가 더 맞지 않는가?
