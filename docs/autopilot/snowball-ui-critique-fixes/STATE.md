# 상태 — 스노우볼 critique 후속 수정
- 모드: 만들기
- 목표: critique(19/40) 우선순위 항목을 colorize → 접근성 harden → layout/adapt → polish → 재평가 순으로 수정한다
- 완료조건: colorize·접근성 harden 변경이 끝나고 `cd frontend && npm test -- --run`, `npm run test:coverage`(전 항목 100%), `npx tsc --noEmit`이 종료코드 0인 출력이 대화에 있으며, layout/adapt는 shape 결과와 사용자 결정이 필요하므로 그 질문과 남은 위험이 대화 본문에 보고되었음 — 또는 docs/autopilot/snowball-ui-critique-fixes/BLOCKED.md 의 막힌 사유가 대화 본문에 보고되었음.
- 턴: 1 (colorize, 접근성 harden 일부, polish 일부 완료 → 사용자 결정 대기)
- 커밋: 하지 않는다 (사용자 지시 없음. 프로젝트 규칙: 승인 없이 커밋/푸시 금지). 푸시는 §0에 따라 금지.

## 확정된 것
- [확정] 접근성: 목표 비중 포커스 링, 입력 밑줄 border-muted, 휴지통 키보드·터치 노출, Toast role, 계좌 aria-current. 이모지 2곳 제거. 384건 통과·커버리지 100%·tsc 0
- [확정] clarify·harden(매매 확인 단계 문구, 폴링 중지) 완료, 테스트 370건 통과, 커버리지 100% — 근거: 직전 턴 실행 출력
- [확정] 베이스라인: 26파일 367건 통과(변경 전). 현재 370건
- [확정] 색 띠 유지, 투자 자산·현금 띠는 border-muted로 정리 — 근거: 사용자 답변 + DESIGN.md(success=달성·체결)
- [확정] colorize 완료: 매수/삭제확인 버튼 글자 text-accent-foreground, 도넛 툴팁 var(--card) 수정. 376건 통과, 커버리지 100%, tsc 0

## 기각한 것
- [기각] 기존 테스트의 `getByText('체결')` 수정 — 이유: 버튼 글자를 바꾸면 기존 테스트 3곳이 깨지고, 프로젝트 규칙상 테스트 수정은 승인이 필요함
- [기각] 색 띠 제거 — 이유: 사용자가 "유지하고 색만 정리"를 선택함

## 보류
- [보류] 예수금 A→B 표시 — 필요한 것: AssetTable에서 AssetRow로 cash를 내려주는 구조 변경 결정
- [확정] 목표 대비 비중 패널 제거, 도넛 유지 — 근거: 사용자 결정(평가금액 칸에 편차 표시 있음)

- [보류] Toast 에러 글자색(white on coral 2.78:1) — 필요한 것: Toast.test.tsx 44행 근처 text-white 단정 테스트 수정 승인
- [보류] 카테고리 색을 의미 색(코랄·보라)과 분리 — 필요한 것: 카테고리 팔레트 결정(도넛 hex와 칩 토큰도 서로 다름)

- [보류] 손실 글자 대비(text-primary 3.34:1 → 밝은 보라 토큰) — 필요한 것: AssetRow.test.tsx:73, SummarySection.test.tsx:32의 text-primary 단정을 새 클래스로 바꾸는 승인

## 다음에 할 일
- [x] colorize (카테고리 색 분리는 보류로 이동)
- [x] 접근성 harden (손실 글자 대비는 테스트 수정 승인 필요로 보류)
- [x] layout/adapt 구현: 편차 막대(A), 목표 대비 막대 패널(B), 행동 열 sticky, 보조 패널 2xl 배치. 403건·커버리지 100%·tsc 0. 1440px 화면 확인함. 900px 이하는 도구 한계로 미확인
- [x] polish 일부: DESIGN.md 포커스 문장, 이모지 2곳 제거
- [ ] polish 나머지: 확인 단계 문구 크기, loss 글자 토큰 DESIGN.md 반영(승인 후)

## 주의
- 테스트는 항상 먼저 쓴다(RED 확인 후 구현). 기존 실패 테스트는 자동 수정 금지, 보고한다.
- 사용자가 확인해야 할 판단은 DECISIONS.md의 "원래 물으려던 것"/"세운 가정"을 채운다.
- 반대 담당 경합 대상: 색 띠 두 곳을 어떤 의미 색으로 바꿀지
