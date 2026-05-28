# 수렴 검증 플랜 — portfolio-presets-design

## 대상
- **작업 설명**: 포트폴리오 프리셋 저장/불러오기 기능 설계 (Plan A: AssetCategory StrEnum 마이그레이션 / Plan B: Preset 기능)
- **모드**: 문서 검증
- **대상 파일 경로**: `/Users/cjynim/lab/snowball/docs/superpowers/specs/2026-05-28-portfolio-presets-design.md`

## Tier
**Tier 3 (심층 검증)**

판별 근거:
- 시스템 전체 영향 (도메인 enum, DB 스키마, API surface, 프론트 통합)
- 되돌리기 어려운 결정 (Alembic 도입, AssetCategory 마이그레이션, SQLModel 컬럼 타입 명시)
- 외부 사실 확인 필요 (SQLAlchemy Enum 매핑 동작, slowapi per-user limiter, Next.js 16 dynamic import)
- 사전 audit 검증 권장

## 검증 항목

| # | 항목 | 검증 방법 | 사용 Agent/Skill |
|---|------|----------|-----------------|
| 1 | AssetCategory StrEnum의 SQLModel `sa_column=Column(String)` 매핑이 실제로 기존 VARCHAR 데이터와 호환되는가? | 공식 문서 + 실제 매핑 동작 검증 | ce-data-integrity-guardian, ce-framework-docs-researcher |
| 2 | Alembic 도입 절차가 정확한가? (`env.py`에서 SQLModel.metadata 사용 가능?) | SQLModel + Alembic 공식 가이드 | ce-framework-docs-researcher |
| 3 | slowapi의 per-user rate limiting (key_func=current_user.id) 구현 방식이 실제로 가능한가? | slowapi 문서 + 기존 코드 참고 | ce-framework-docs-researcher, ce-security-reviewer |
| 4 | 404 unified 정책 (wrong-owner도 404)이 IDOR/existence oracle을 실제로 차단하는가? | 보안 베스트 프랙티스 | ce-security-reviewer |
| 5 | Apply 알고리즘의 1:1 매칭 + 멀티 매치 검출 로직이 결정성·완전성을 보장하는가? | 알고리즘 검증, 엣지케이스 | ce-adversarial-document-reviewer |
| 6 | Clean Architecture 패턴 준수 (`AbstractPresetRepository` ports + SqlAlchemy adapter) — 기존 코드 패턴과 일치하는가? | 기존 `ports.py`, `repositories.py` 구조 분석 | ce-architecture-strategist |
| 7 | Plan A → Plan B 분리가 정당한가? 합치는 게 더 단순하지 않은가? | Contrarian 관점 | ce-adversarial-document-reviewer, ce-code-simplicity-reviewer |
| 8 | FR-7 (target_weight 합계 != 100% 허용)이 도메인 룰(`snowball-domain.md`의 "~100% 강제")과 일관성 있게 해결됐는가? | 룰 vs spec 비교 | ce-adversarial-document-reviewer |
| 9 | Next.js 16 dynamic import 시그너처 + React 19 패턴이 spec 코드 예시와 정확히 일치하는가? | 공식 문서 | ce-framework-docs-researcher |
| 10 | `frontend/src/app/page.tsx` (`Home` 컴포넌트) 통합이 실제 구조와 일치하는가? | 실제 파일 구조 확인 | ce-architecture-strategist |

## 검증 관점 및 Agent 할당

| 관점 | 역할 | 사용 Agent/Skill | 필수 여부 |
|------|------|-----------------|----------|
| DB/마이그레이션 사실 | RESEARCHER + ARCHITECT | ce-data-integrity-guardian | 필수 |
| API 보안 | ARCHITECT | ce-security-reviewer | 필수 |
| 아키텍처 일관성 | ARCHITECT | ce-architecture-strategist | 필수 |
| 반론·premise | CONTRARIAN | ce-adversarial-document-reviewer | 필수 |
| 외부 사실 (프레임워크) | RESEARCHER | ce-framework-docs-researcher | 필수 |
| 단순화 가능성 | SIMPLIFIER | ce-code-simplicity-reviewer | 권장 |

## Agent별 상세 프롬프트

### 관점 1: DB/마이그레이션 사실 정확성 (RESEARCHER + ARCHITECT)
- Agent: `compound-engineering:ce-data-integrity-guardian`
- 프롬프트: spec §3.1 — AssetCategory StrEnum의 SQLModel 컬럼 매핑이 실제로 작동하는가? 특히 `sa_column=Column(String)` 명시가 기존 VARCHAR 데이터와 read/write 양방향 호환되는지, Alembic 도입 시 `env.py`에서 SQLModel.metadata 사용이 가능한지 검증. prod DB audit 절차가 충분한지.

### 관점 2: API 보안 검증 (ARCHITECT)
- Agent: `compound-engineering:ce-security-reviewer`
- 프롬프트: spec §4 — IDOR 방지 (404 unified), per-user rate limiting (slowapi key_func), input validation (Pydantic Field), ambiguous_match 처리가 실제로 안전한가? 누락된 위협 모델은? mass assignment 가능성? 기존 `routes.py`의 보안 패턴과 일관성 있는가?

### 관점 3: 아키텍처 일관성 (ARCHITECT)
- Agent: `compound-engineering:ce-architecture-strategist`
- 프롬프트: spec §3.4, §5.5 — Clean Architecture 준수 (`AbstractPresetRepository` 포트 + adapter 패턴)가 기존 `backend/src/snowball/domain/ports.py`, `adapters/db/repositories.py` 패턴과 일치하는가? 프론트엔드 통합 위치 `frontend/src/app/page.tsx`의 `Home` 컴포넌트가 실제로 dashboard orchestration을 담당하는지 확인.

### 관점 4: 반론·premise (CONTRARIAN)
- Agent: `compound-engineering:ce-adversarial-document-reviewer`
- 프롬프트: 1) Plan A/B 분리가 정말 정당한가? 2) Apply 알고리즘의 1:1 매칭이 엣지케이스(같은 code 여러 자산, name 중복)에서 안전한가? 3) FR-7의 합계 != 100% 허용이 도메인 룰과 충돌하는데 해결 방식이 충분한가? 4) Apply confirm 단계가 ambiguous_match를 미리 잡는다는 가정이 맞는가? 5) 게스트 모드 처리에서 누락된 경로는?

### 관점 5: 외부 사실 검증 (RESEARCHER)
- Agent: `compound-engineering:ce-framework-docs-researcher`
- 프롬프트: 다음을 공식 문서로 검증:
  - Python 3.12 `StrEnum` 동작 (PEP 663 vs 실제 거동)
  - SQLAlchemy 2.x + SQLModel의 `sa_column=Column(String)` + Python StrEnum 매핑 동작
  - Alembic 도입 시 SQLModel.metadata 사용법
  - slowapi의 `key_func` per-user 구현 패턴
  - Next.js 16 + React 19의 `next/dynamic` 시그너처 (특히 named export 처리)
  - React 19에서 `useState`/`setAccounts(prev => ...)` 패턴이 여전히 권장되는지

### 관점 6: 단순화 (SIMPLIFIER, 권장)
- Agent: `compound-engineering:ce-code-simplicity-reviewer`
- 프롬프트: spec에서 over-engineering 또는 YAGNI 위반이 있는가? Apply 알고리즘의 1:1 매칭이 필요 이상으로 복잡한가? `ApplyPresetResponse`의 `updated_count`/`created_count` 메타가 정말 필요한가? Plan A/B 분리가 오히려 과한 복잡성을 만드는가?

### EVALUATOR (main agent가 직접 수행)
- 모든 검증 agent 출력을 종합해 항목별 판정 라벨 부여 (`CONFIRMED` / `REFUTED` / `CONTESTED` / `NEW`)
- 이전 iteration 대비 안정 카운터 업데이트
- report.md 갱신
- Tier 3 기준: 안정 카운터 >= 3

## 수렴/완료 기준

- [ ] 모든 발견사항의 안정 카운터 >= 3 (Tier 3)
- [ ] 새로운 발견 0건
- [ ] CONTESTED 항목 0건

## 하지 말 것

- 검증 대상 spec 문서를 직접 수정하지 마 (Phase 6에서 `/organize` 사용)
- 추측으로 수렴했다고 판단하지 마 — 실제 비교 근거 필요
- subagent를 background로 실행하지 마
- 수렴하지 않았는데 COMPLETE를 출력하지 마
- 이미 ce-doc-review에서 해결된 finding(P0/P1 13건)을 재발견으로 카운트하지 마 — 그것들은 이미 spec에 반영됨
