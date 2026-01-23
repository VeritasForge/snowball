# Git Workflow Rules

Git 사용에 관한 규칙입니다.

## Branch Naming

```
feature/[issue-number]-short-description
bugfix/[issue-number]-short-description
hotfix/[issue-number]-short-description
refactor/short-description
docs/short-description
```

Examples:
- `feature/123-add-multi-currency-support`
- `bugfix/456-fix-rebalancing-calculation`
- `hotfix/789-security-patch`
- `refactor/cleanup-repository-layer`

## Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 포맷팅, 세미콜론 등 (코드 변경 없음)
- `refactor`: 리팩토링 (기능 변경 없음)
- `test`: 테스트 추가/수정
- `chore`: 빌드, 의존성 등

### Scopes (Snowball)
- `domain`: 도메인 레이어
- `api`: API 엔드포인트
- `ui`: 프론트엔드 컴포넌트
- `db`: 데이터베이스
- `deps`: 의존성

### Examples
```
feat(api): add endpoint for portfolio rebalancing

- Add POST /api/v1/portfolio/{id}/rebalance
- Include trade quantity calculations
- Return suggested transactions

Closes #123
```

```
fix(domain): correct decimal precision in Money value object

Use Decimal instead of float to prevent rounding errors
in financial calculations.

Fixes #456
```

## Commit Rules

### Do
- 작은 단위로 자주 커밋
- 하나의 커밋에 하나의 논리적 변경
- 테스트와 구현을 함께 커밋
- 의미 있는 커밋 메시지 작성

### Don't
- 여러 기능을 하나의 커밋에 포함
- "WIP", "fix", "update" 같은 모호한 메시지
- 빌드가 깨진 상태로 커밋
- 민감한 정보 커밋

## Pull Request Process

### PR Title Format
```
[type] Short description (#issue-number)
```

Examples:
- `[feat] Add multi-currency support (#123)`
- `[fix] Correct rebalancing calculation (#456)`

### PR Description Template
```markdown
## Summary
[1-3 bullet points describing the change]

## Changes
- [Specific change 1]
- [Specific change 2]

## Test Plan
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if UI change)
[Before/After screenshots]

## Related Issues
Closes #123
```

### PR Checklist
- [ ] 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 문서 업데이트 (필요시)
- [ ] 브레이킹 체인지 없음 (있다면 명시)

## Protected Branches

### main
- 직접 푸시 금지
- PR을 통해서만 머지
- 최소 1명 리뷰 필수
- CI 통과 필수

## Rebase vs Merge

```bash
# Feature branch 업데이트
git fetch origin
git rebase origin/main

# Merge 시 squash 사용 (깔끔한 히스토리)
# GitHub PR: "Squash and merge"
```

## Dangerous Commands (Use with Caution)

```bash
# ⚠️ 강제 푸시 (개인 브랜치만)
git push --force-with-lease

# ❌ main에 절대 사용 금지
git push --force origin main
git reset --hard origin/main
```

## Pre-commit Hooks

자동으로 실행되는 검사:

```bash
# Backend
uv run ruff check .
uv run ruff format --check .
uv run pytest tests/unit/

# Frontend
npm run lint
npx tsc --noEmit
```
