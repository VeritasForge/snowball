# Audit Results — asset.category + (account_id, code)

**Date:** 2026-05-29
**Environments:** dev / staging / prod (사용자가 채울 것)

> **Status: PENDING** — 사용자가 SQL을 실제 환경에서 실행 후 결과를 캡처할 예정.

> ⚠️ **이 audit이 끝나야 `alembic upgrade head`로 `0002_asset_constraints`를 적용해도 안전**. 결과 미확인 상태에서 `upgrade head`를 실행하면 CHECK constraint나 partial unique index 생성이 실패하여 partial deploy 위험. 자세한 deploy 흐름은 `backend/docs/alembic-runbook.md` "Phase 1/Phase 2" 참고.
>
> ⛔ **금지**: 기존 환경에서 `alembic stamp head` 사용 (head는 항상 최신 revision=0002. silently skip되어 constraint 미적용). 올바른 명령은 `alembic stamp 0001_baseline`.

## Query 1: DISTINCT category values

### prod

```
SELECT DISTINCT category, COUNT(*) FROM asset GROUP BY category;
```

| category | count |
|----------|-------|
| TBD | TBD |

### staging

| category | count |
|----------|-------|
| TBD | TBD |

### dev

| category | count |
|----------|-------|
| TBD | TBD |

## Query 2: NULL category

```
SELECT COUNT(*) FROM asset WHERE category IS NULL;
```

- prod: TBD rows
- staging: TBD rows
- dev: TBD rows

## Query 3: trailing whitespace

```
SELECT COUNT(*) FROM asset WHERE category != TRIM(category);
```

- prod: TBD
- staging: TBD
- dev: TBD

## Query 4: empty string

```
SELECT COUNT(*) FROM asset WHERE category = '';
```

- prod: TBD
- staging: TBD
- dev: TBD

## Query 5: duplicate (account_id, code) — Plan A3.10 partial unique index 사전 점검

```
SELECT account_id, code, COUNT(*) AS dup_count
FROM asset
WHERE code IS NOT NULL
GROUP BY account_id, code
HAVING COUNT(*) > 1;
```

- prod: TBD rows
- staging: TBD rows
- dev: TBD rows

## Decision

[ ] 모든 값이 AssetCategory 멤버(`주식/채권/원자재/현금/기타`)와 일치 + NULL/whitespace/empty/duplicate 0건 → A3 바로 진행
[ ] 알 수 없는 값 ≤ 5개 → enum에 추가 후 A3 진행
[ ] 알 수 없는 값 > 5개 또는 의미 불명확 → A2.2 backfill migration 작성 후 A3 진행
[ ] NULL/whitespace/empty 존재 → A2.2 backfill 필수
[ ] (account_id, code) duplicate 존재 → A3.10 partial unique index 마이그레이션 전에 수동 정리 또는 추가 backfill

## Post-backfill verification (해당 시)

```
NULL count: TBD ✅
whitespace count: TBD ✅
empty count: TBD ✅
duplicate (account_id, code) count: TBD ✅
```
