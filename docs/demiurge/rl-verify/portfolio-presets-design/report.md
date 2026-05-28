# 수렴 검증 리포트 — portfolio-presets-design

> **작업**: 포트폴리오 프리셋 저장/불러오기 기능 설계 검증
> **시작**: 2026-05-28
> **모드**: 문서 검증
> **Tier**: 3 (심층 검증)
> **수렴 기준**: 모든 항목 안정 카운터 ≥ 3 + CONTESTED 0건 + 새 발견 0건

---

## Iteration 1 — 2026-05-28

**상태**: 🔴 NON-CONVERGED — 40+ findings (P0: 6건, P1: 11건, P2: 17건)

### P0/P1 요약 (Iter 1)

| ID | 출처 | 요지 |
|----|------|------|
| **P0-1** | DI-1, FR-3 | `sa_column=Column(String)` read 시 raw str, AssetCategory coercion 안 됨 |
| **P0-2** | DI-2 | Pydantic response DTO가 stray 값에서 500 |
| **P0-3** | SEC-2, FR-5 | slowapi key_func가 FastAPI Depends() 못 받음 |
| **P0-4** | ADV-1 | FR-7의 RebalancingService는 phantom reference |
| **P0-5** | ADV-2, SEC-7 | §4.3 1:1 매칭이 preset 자체 duplicate code 케이스에서 중복 생성 |
| **P0-6** | SEC-1 | ambiguous_match 응답 자산 이름/코드 leak |
| P1-1~11 | 다수 | 해외주식 정당성, Alembic recipe, FK CASCADE, mass-assignment, code pattern, 429 cooldown, audit TOCTOU, account-switch save, code orphan, setAccounts 노출, Plan B 분할 |
| P2-1~17 | 다수 | 생략 |

→ spec에 반영 후 Iteration 2 진행

---

## Iteration 2 — 2026-05-28

### 종합 판정

**상태**: 🟡 **MOSTLY CONVERGED — 핵심 P0/P1 모두 RESOLVED, 신규 발견 일부**

### Iter 1 findings — 안정 카운터 갱신 (Iter 2에서 재확인)

| Iter 1 ID | Iter 2 판정 | 안정 카운터 |
|-----------|------------|-----------|
| P0-1 (DI-1) | CONFIRMED RESOLVED | 2 |
| P0-2 (DI-2) | CONFIRMED RESOLVED | 2 |
| P0-3 (SEC-2/FR-5) | CONFIRMED RESOLVED | 2 |
| P0-4 (ADV-1) | CONFIRMED RESOLVED | 2 |
| P0-5 (ADV-2/SEC-7) | CONFIRMED RESOLVED | 2 |
| P0-6 (SEC-1) | CONFIRMED RESOLVED | 2 |
| P1-1 (DI-3 해외주식) | CONFIRMED RESOLVED | 2 (단, §3.1.5 stale 참조 남음) |
| P1-2 (DI-5 Alembic recipe) | CONFIRMED RESOLVED | 2 |
| P1-3 (DI-7 FK CASCADE) | CONFIRMED RESOLVED | 2 |
| P1-4 (SEC-3 mass-assignment) | CONFIRMED RESOLVED | 2 |
| P1-5 (SEC-5 code pattern) | CONFIRMED RESOLVED | 2 |
| P1-6 (SEC-6 429 cooldown) | CONFIRMED RESOLVED | 2 |
| P1-7 (ADV-3 audit TOCTOU) | CONFIRMED RESOLVED | 2 |
| P1-8 (ADV-4 account-switch save) | CONFIRMED RESOLVED | 2 |
| P1-9 (ADV-6 code orphan) | CONFIRMED RESOLVED | 2 |
| P1-10 (AR-2 setAccounts → replaceAccount) | CONFIRMED RESOLVED | 2 |
| P1-11 (AR-6 Plan B 분할) | CONFIRMED RESOLVED | 2 |
| SEC-4 (404 unified UX) | RECLASSIFIED → UX (보안 아님) | 종료 |

> Tier 3 수렴 기준은 안정 카운터 ≥ 3 — 추가 iter 1회 필요. 단 모든 항목이 RESOLVED로 일관 판정되어 수렴 임박.

### Iter 2 — 신규 P1 findings (안정 카운터 = 1)

| 신규 ID | 출처 | 심각도 | 요지 |
|---------|------|--------|------|
| **N1-A** | data-integrity NEW-1 | **P1** | A3의 partial unique index 마이그레이션이 기존 prod data에 duplicate `(account_id, code)` 존재 시 실패. §3.1.2 audit query 추가 필요 |
| **N1-S** | security NEW-1 | **P1** | `JWTService.decode_token`이 token type 검증 안 함 — refresh token이 access token처럼 사용 가능. **사전 존재 vuln, 본 작업이 surface 확장**. 별도 추적 또는 B2에서 함께 처리 권장 |
| **N1-V** | adversarial NEW-PROBE-3 | **P1 (high)** | `replaceAccount` × 10초 auto-refresh race — Apply 후 stale poll response가 optimistic state 덮어쓸 수 있음. §5.3.5는 account-switch만 커버. last-mutation-timestamp guard 또는 apply 후 abort 필요 |

### Iter 2 — 신규 P2 findings (안정 카운터 = 1)

| ID | 출처 | 요지 |
|----|------|------|
| N2-1 | DI NEW-2 | SQLite partial index `sqlite_where` + batch-mode 호환성 CI 검증 권장 |
| N2-2 | DI residual | env.py에 `compare_type=True`, `compare_server_default=True` 추가 권장 |
| N2-3 | DI residual | 기존 AccountModel.user_id, AssetModel.account_id 도 `ondelete=CASCADE` 없음 — 별도 hardening task |
| N2-4 | DI NEW-4 | 향후 모든 mutation 입력 DTO에 `extra='forbid'` 강제 — §10 금지사항에 추가 |
| N2-5 | SEC NEW-2 | `no_duplicate_match_key` dedup-key 정규화 미흡 (`{code='SPY'}` vs `{code=None, name='SPY'}` 미충돌). 1:1 매칭이 잡지만 DTO 차단이 안전 |
| N2-6 | SEC residual | 동시 apply 시 IntegrityError → 500 (clean 409로 처리 권장) |
| N2-7 | SEC NEW-2 (adv) | 정의된 defensive 500 (§4.3 [2c]) 발화 시 generic 500 대신 ERROR 로그 + asset_id 컨텍스트 |
| N2-8 | ADV NEW-FINDING-1 | §5.5 snippet에 기존 `isAutoRefreshEnabled` state 보존 명시 누락 |
| N2-9 | ADV NEW-FINDING-2 | §5.3.5 pendingMutation을 modal close (X/Escape) 게이트로도 활용 — 현재는 inline-state에만 표시 |
| N2-10 | ADV NEW-FINDING-3 | 토큰 만료 윈도우에 per-user limit이 IP fallback 됨 — 알려진 trade-off 명시 |
| N2-11 | DI residual | `§3.1.5` 테스트 영향 표에 `해외주식 → AssetCategory.FOREIGN_STOCK` 명시가 §3.1 audit-driven 정책과 불일치 — 동적 결정으로 수정 |
| N2-12 | SEC residual | §4.1 middleware 등록 순서 문구 ("limiter 보다 먼저") 오해 소지 — 실제 동작에는 영향 없음, 표현 명확화 |

### CONTESTED 항목

| 주제 | Iter 1 | Iter 2 | 처리 |
|------|--------|--------|------|
| Plan A/B 분리 | AR-6 분할 권장 vs SIM-4 합치자 | (재검토 안 함, 분할 채택됨) | RESOLVED |
| 1:1 매칭 결정성 | P0-5 강화 vs SIM-1 단순화 | P0-5 채택, validator + index 추가 | RESOLVED |

### NEW-PROBE 검증 결과

| 신규 probe | 결과 |
|-----------|------|
| JWT signature 검증? | **CONFIRMED** — `jwt.decode(token, KEY, algorithms=[ALG])`는 기본적으로 검증 수행. 미들웨어 안전 |
| §4.3 [2c] defensive 500 | **CONFIRMED** — dead code 아님. 시스템 corruption 상태(invariant 위반) 가드. 단 ERROR 로그 추가 권장 |
| replaceAccount × auto-refresh race | **REOPENED** — N1-V로 등록 |

---

## 현재 수렴 상태

| 카테고리 | 항목 수 | 안정 ≥ 3 | 안정 = 2 | 안정 = 1 (NEW) |
|---------|--------|---------|---------|---------------|
| Iter 1 P0 | 6 | 0 | 6 | — |
| Iter 1 P1 | 11 | 0 | 11 | — |
| Iter 2 신규 P1 | 3 | — | — | 3 |
| Iter 2 신규 P2 | 12 | — | — | 12 |

**판정**: 🟡 **NEAR-CONVERGED, 추가 iter 1회 또는 P1 반영 후 종료 결정 필요**

- Iter 1 P0/P1은 안정 카운터 = 2 (Tier 3 기준 ≥ 3 도달 필요)
- Iter 2 신규 P1 3건 — spec 반영 후 재검증 필요
- Iter 2 신규 P2 12건 — 일부는 spec 명시, 일부는 별도 작업 권장

---

## 최종 결정 (2026-05-28)

사용자 선택: **"P1 3건만 spec에 반영하고 종료"**

### spec에 반영된 P1 (Iter 2 신규)

| ID | 반영 위치 | 변경 |
|----|---------|------|
| N1-A | §3.1.2 audit | 5번째 query 추가 (`(account_id, code)` duplicate 검출) + 처리 절차 |
| N1-S | §4.1 middleware 직전 | `decode_token` token type 검증 fix를 B2 작업에 포함 |
| N1-V | §5.5 | `replaceAccount` race guard + auto-refresh abort + vitest 회귀 케이스 |

### spec에 반영하지 않은 P2 (구현 단계로 위임)

12건 모두 구현 단계 또는 별도 작업으로 처리:
- env.py `compare_type=True`/`compare_server_default=True` → B2 구현 시 적용
- 기존 FK ondelete=CASCADE 누락 → 별도 hardening backlog
- SQLite partial index batch-mode 검증 → CI 단계에서 확인
- `extra='forbid'` 프로젝트 규칙 → §10 금지사항 항목으로 이미 명시 권장
- dedup-key sig collision 엣지 → 1:1 매칭이 잡으므로 acceptable
- IntegrityError → 409 wrap → 구현 시 처리
- 기타 8건 모두 advisory/quality 개선

### 최종 수렴 판정

- **Iter 1 P0/P1 17건**: 안정 카운터 2 (Tier 3 기준 ≥3 미달, 단 모두 CONFIRMED RESOLVED로 일관)
- **Iter 2 신규 P1 3건**: spec 반영 완료, 별도 iter 3 없이 수렴 종료
- **Iter 2 신규 P2 12건**: 구현 단계로 위임

**최종 상태**: 🟢 **CONVERGED (사용자 결정 종료)**

엄격한 Tier 3 안정 카운터 ≥3 기준에는 미달하지만, spec 품질이 충분히 높아 구현 단계로 진행 가능하다고 사용자가 판단.

