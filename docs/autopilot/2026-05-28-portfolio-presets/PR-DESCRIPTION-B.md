# [feat] Portfolio Presets — Backend (Plan B: B1 + B2)

> ⚠️ **Merge order**: Plan A (`feature/asset-category-strenum-migration`) **먼저** 머지 → 그 다음 이 PR. 이 브랜치는 Plan A 위에 분기되어 있습니다.

## Summary
- 사용자가 자산 배분 목표비중을 **프리셋**으로 저장하고, 특정 계좌에 **적용(덧써쓰기)** 할 수 있는 백엔드 전체 구현 (도메인 → use case → adapter → API).
- 프리셋은 **user 범위**, items는 종목명·코드·분류·목표비중만 저장 (avg_price/quantity/current_price 미보관).
- Apply는 **결정적 1:1 매칭** (code → name → tier-2 name+code-backfill), `target_weight`만 덮어쓰고 사용자 편집값(평단/수량/현재가) 보존.

## Changes

### B1 — 도메인 + Repository
- `Preset`, `PresetItem` 엔티티 (PresetItem은 Preset aggregate의 child — 자체 id/preset_id 미노출).
- `AbstractPresetRepository` 포트 + `SqlAlchemyPresetRepository` (명시적 `AssetCategory` coercion).
- `PresetModel`/`PresetItemModel` + `UserModel.presets` cascade.
- Alembic `0003_preset_tables` — preset/preset_item 테이블 + FK CASCADE + category CHECK constraint.
  - 다층 안전망: `__table_args__` CHECK + migration inline CHECK + `elif` repair branch + dirty-data fail-fast audit.

### B2 — Use cases + API + Security
- `decode_token`이 `type='access'` 게이트 (refresh-as-access 차단, rl-verify N1-S).
- DTO: `PresetCreate`/`PresetItemCreate` (`extra='forbid'`, `no_duplicate_match_key`, code pattern, target_weight 0~100), `PresetResponse`/`ApplyPresetResponse`.
- Use cases: `Create`/`List`/`Delete`/`ApplyPresetUseCase` — server-derived `user_id` 바인딩(mass-assignment 차단), **404-unified IDOR** 정책(not-found와 wrong-owner 동일 404 → existence oracle 차단).
- API: 4 endpoints with **per-user rate limiting** (`user_id_key_func` — `request.state.user_id` 우선, IP fallback).
  | Endpoint | Limit |
  |----------|-------|
  | `GET /api/v1/presets` | 60/min |
  | `POST /api/v1/presets` | 10/min |
  | `DELETE /api/v1/presets/{id}` | 30/min |
  | `POST /api/v1/presets/{id}/apply/{account_id}` | 30/min |

## Test Plan
- [x] Unit: 엔티티, DTO validators, use cases(Happy/Boundary/Error), security token-type, route helpers
- [x] Integration: repository CRUD + cascade + downgrade
- [x] e2e: CRUD + apply(create/overwrite/name-match) + 422 + **404-unified** + 429 rate-limit
- [x] Alembic round-trip + drift + CHECK-constraint regression pair
- [x] **303 passed, coverage 100% (line+branch)**

## ⚠️ 리뷰어 참고 (의도적 결정 — DIGEST 참조)
1. **404 vs 403 divergence**: preset 라우트는 wrong-owner에 **404-unified**(보안 강화), 기존 account/asset 라우트는 403 유지. 의도적 — 전체 통일은 별도 마이그레이션 task로 분리(기존 403 단정 회귀 방지).
2. **`PresetItemResponse.id` = `int | None`**: PresetItem은 aggregate child로 자체 id 미노출 → `null` 반환. frontend 타입 `id?: number`와 정합. placeholder 0 대신 정직한 null.

## Related
- Spec: `docs/superpowers/specs/2026-05-28-portfolio-presets-design.md`
- Plan: `docs/superpowers/plans/2026-05-28-portfolio-presets.md`
- Frontend (B3.1~B3.6): **후속 PR** (이 PR은 백엔드만)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
