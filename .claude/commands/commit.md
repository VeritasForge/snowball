# /commit - Complete and Push Changes

작업을 마무리하고 변경사항을 커밋 및 푸시합니다.

## Usage

```
/commit              # 현재 세션의 모든 변경사항을 커밋 및 푸시
/commit [message]    # 커스텀 메시지로 커밋 및 푸시
```

## Workflow

작업 마무리 시 다음 단계를 자동으로 수행합니다:

1. **Context Update**: `CLAUDE.md`의 "Recent Changes" 업데이트
2. **Status Check**: 변경된 파일 확인 (`git status`, `git diff HEAD`)
3. **Commit Message**: Conventional Commits 규칙에 따라 메시지 생성
4. **Commit**: 변경사항 스테이징 및 커밋
5. **Push**: 원격 저장소로 푸시
6. **Report**: 결과 보고

## Steps

### Step 1: Update CLAUDE.md (MANDATORY)

현재 세션에서 수행한 작업을 분석하고 `CLAUDE.md`의 "Recent Changes" 섹션을 업데이트합니다.

```bash
# CLAUDE.md 읽기
cat CLAUDE.md

# Section 11 "Recent Changes" 업데이트
# - 새로운 기능/수정사항을 맨 위에 추가
# - 간결하고 명확한 항목으로 작성
# - 형식: "- [Category]: [Brief description]"
```

**Update 예시:**
```markdown
## 11. Recent Changes
- Test Protection Protocol: Added pre/post-change test validation workflow
- Feature: Add multi-currency support for international portfolios
- Fix: Correct decimal precision in rebalancing calculations
- Refactor: Simplify asset repository layer
```

### Step 2: Check Status

변경된 파일을 확인합니다.

```bash
# 변경 파일 확인
git status

# 변경 내용 상세 확인
git diff HEAD
```

### Step 3: Generate Commit Message

Conventional Commits 규칙에 따라 커밋 메시지를 생성합니다.

**Format:**
```
<type>(<scope>): <subject>

[optional body]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:**
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 의존성 등

**Scopes (Snowball):**
- `domain`: 도메인 레이어
- `api`: API 엔드포인트
- `ui`: 프론트엔드
- `db`: 데이터베이스
- `docs`: 문서
- `config`: 설정

**Example Messages:**
```bash
# Feature
feat(api): add multi-currency support for portfolios

- Add Currency value object
- Update Money to support multiple currencies
- Add currency conversion service

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

# Fix
fix(domain): correct decimal precision in Money calculations

Use ROUND_HALF_UP for financial calculations to prevent
rounding errors in portfolio rebalancing.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

# Docs
docs(claude): add Test Protection Protocol to CLAUDE.md

Added comprehensive pre/post-change test validation workflow
to prevent regression bugs.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Step 4: Commit

변경사항을 스테이징하고 커밋합니다.

```bash
# 모든 변경사항 스테이징 (또는 특정 파일만)
git add .

# HEREDOC을 사용한 커밋 (포맷팅 보장)
git commit -m "$(cat <<'EOF'
feat(api): add multi-currency support

- Add Currency value object
- Update Money to support multiple currencies

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

### Step 5: Push

원격 저장소로 푸시합니다.

```bash
# 현재 브랜치를 원격으로 푸시
git push

# 새 브랜치의 경우 upstream 설정
git push -u origin <branch-name>
```

### Step 6: Report

사용자에게 결과를 보고합니다.

```markdown
✅ Changes successfully committed and pushed!

**Commit:** feat(api): add multi-currency support
**Branch:** feature/multi-currency
**Files Changed:** 5 files (+120, -30)

**Summary:**
- CLAUDE.md updated
- 5 files committed
- Pushed to origin/feature/multi-currency
```

## Edge Cases

### No Changes to Commit

```bash
# 변경사항이 없는 경우
❌ No changes to commit. Working tree is clean.
```

### Push Conflict

```bash
# 푸시 충돌 시
⚠️ Push rejected. Remote has changes.

Suggested action:
git pull --rebase
git push
```

### Uncommitted Changes in CLAUDE.md

CLAUDE.md 업데이트를 잊은 경우:

```bash
⚠️ CLAUDE.md not updated. Please update "Recent Changes" section first.
```

## Pre-Commit Checks

커밋 전 다음 항목을 자동으로 확인합니다:

- [ ] 테스트 통과 (Test Protection Protocol)
- [ ] Linter 통과 (ruff, eslint)
- [ ] 비밀 정보 없음 (하드코딩된 API 키 등)
- [ ] CLAUDE.md 업데이트 완료

## References

- `.claude/rules/git-workflow.md` - Git 워크플로우 규칙
- `.claude/rules/testing.md` - 테스트 규칙
- `CLAUDE.md` Section 11 - Recent Changes

## Example Session

```bash
User: /commit
```