# /wrap - Update Project Documentation

작업 완료 후 프로젝트 문서(README.md, CLAUDE.md)를 현재 코드베이스 상태에 맞게 업데이트합니다.

## Usage

```
/wrap              # 현재 코드베이스 분석 후 문서 업데이트
/wrap --check      # 문서와 코드의 일치 여부만 확인 (업데이트 없음)
```

## Document Structure

이 프로젝트는 다음과 같은 문서 구조를 따릅니다:

- **README.md**: 사용자용 문서 (설치, 설정, 사용법, 주요 기능, 기술 스택)
- **CLAUDE.md**: AI용 컨텍스트 (아키텍처, 규약, TDD 워크플로우)
  - `@README.md`로 사용자 정보 참조
  - **중복 금지**: 사용자 정보는 README.md에만, AI 컨텍스트는 CLAUDE.md에만
- **`.specify/memory/constitution.md`**: 프로젝트 헌법 (Core Principles, Architecture Constraints)
  - ⚠️ **헌법 파일**: 수정 시 **반드시 사용자 승인 필요**
  - Spec-Kit을 사용하는 프로젝트에서 필수

## Workflow

1. **Analyze Codebase**: 현재 디렉토리 구조 및 파일 분석
2. **Read Documents**: README.md, CLAUDE.md 읽기
3. **Detect Changes**: 문서와 코드 간 불일치 탐지
4. **Update Documents**: 변경사항 반영
5. **Report**: 업데이트 내역 보고

## Steps

### Step 1: Analyze Codebase

현재 프로젝트의 구조를 분석합니다.

```bash
# Backend 구조
tree backend/src/snowball -L 3

# Frontend 구조
tree frontend/src -L 2

# 주요 의존성 확인
cat backend/pyproject.toml | grep -A 20 "dependencies"
cat frontend/package.json | grep -A 10 "dependencies"
```

**분석 대상:**
- 디렉토리 구조 변경 (새 모듈, 삭제된 모듈)
- 외부 의존성 변경 (새 패키지, 버전 업데이트)
- API 엔드포인트 변경 (라우터 파일)
- 환경변수 변경 (.env.example)
- 실행 방법 변경 (docker-compose.yml, scripts/)

### Step 2: Read Current Documents

기존 문서를 읽고 내용을 파악합니다.

```bash
# 사용자용 문서
cat README.md

# AI용 컨텍스트
cat CLAUDE.md
```

### Step 3: Detect Changes

문서와 코드 간 불일치를 탐지합니다.

**체크리스트:**

#### README.md (User-Facing)
- [ ] Prerequisites: 외부 의존성이 문서와 일치하는가?
- [ ] Setup: 설치 명령어가 최신인가?
- [ ] 주요 기능: 새 기능이 추가되었는가?
- [ ] 기술 스택: 의존성 버전이 최신인가?
- [ ] 실행 방법: 명령어가 최신인가?
- [ ] 테스트 실행: 테스트 명령어가 최신인가?

#### CLAUDE.md (AI Context)
- [ ] @README.md import: 상단에 올바르게 참조하는가?
- [ ] Section 1 (현재 구현 현황): 아키텍처 변경사항 반영되었는가?
- [ ] Section 2 (Claude Code Configuration): 명령어/에이전트 변경사항 반영되었는가?
- [ ] Section 5 (Recent Changes): 최신 변경사항 추가되었는가?
- [ ] 중복 체크: README.md와 내용이 중복되지 않는가?

#### `.specify/memory/constitution.md` (Project Constitution)
- [ ] ⚠️ **사용자 승인 필요**: 헌법 수정이 필요한 경우 사용자에게 제안
- [ ] Core Principles: 새로운 아키텍처 원칙이 추가되었는가?
- [ ] Architecture Constraints: 레이어 구조나 의존성 규칙이 변경되었는가?
- [ ] Tech Stack: 핵심 기술 스택이 변경되었는가? (예: Python 3.12+ → 3.13+)
- [ ] Version: 수정 시 버전 번호 업데이트 (Semantic Versioning)

### Step 4: Update Documents

탐지된 변경사항에 따라 문서를 업데이트합니다.

#### README.md Update Rules

**✅ 수정 대상:**
```markdown
## 주요 기능 (새 기능 추가 시)
1. 새로운 기능 설명

## 기술 스택 (의존성 변경 시)
- **Backend**: Python 3.12+, FastAPI, ...
- **Frontend**: TypeScript 5.x, Next.js 14+, ...

## Prerequisites (외부 의존성 변경 시)
- Docker
- Node.js 18+
- Python 3.12+

## 시작하기 (설치 명령어 변경 시)
```bash
# 업데이트된 실행 명령어
```

## 테스트 실행 방법 (테스트 명령어 변경 시)
```bash
# 업데이트된 테스트 명령어
```
```

**❌ 수정하지 않음:**
- 프로젝트 설명 (목적이 변경되지 않는 한)

#### CLAUDE.md Update Rules

**✅ 수정 대상:**
```markdown
## 1. 현재 구현 현황 (Current Implementation Context)
### 1.1 Backend
- **새 모듈 추가 또는 기존 모듈 변경사항 반영**
- Domain, Use Cases, Adapters 구조 변경

### 1.2 Frontend
- **새 컴포넌트/기능 추가 또는 변경사항 반영**
- Components, Features 목록 업데이트

## 2. Claude Code Configuration (명령어/에이전트 변경 시)
- Available Commands 테이블 업데이트
- Development Agents 목록 업데이트

## 5. Recent Changes (최상단에 추가)
- [New Entry]: [Description]
```

**❌ 수정하지 않음:**
- @README.md import (항상 유지)
- AI 사고 프로세스 (철학 변경 시만)
- Test Protection Protocol (프로세스 변경 시만)
- Key Rules (규칙 변경 시만)

**절대 추가하지 말 것:**
- 실행 명령어 (README.md에만)
- 기술 스택 (README.md에만)
- 주요 기능 설명 (README.md에만)
- Prerequisites (README.md에만)

#### `.specify/memory/constitution.md` Update Rules

⚠️ **중요**: Constitution은 프로젝트의 헌법입니다. 수정이 필요한 경우 **반드시 사용자 승인**을 받아야 합니다.

**🔍 수정이 필요한 경우 (사용자에게 제안):**

1. **새로운 아키텍처 패턴 도입**
   - 예: CQRS 패턴 도입, Event Sourcing 추가
   - 제안: "Clean Architecture에 CQRS 패턴을 추가하시겠습니까?"

2. **핵심 기술 스택 변경**
   - 예: Python 3.12+ → 3.13+, Pydantic V2 → V3
   - 제안: "Python 버전 요구사항을 3.13+으로 변경하시겠습니까?"

3. **레이어 구조 변경**
   - 예: 새로운 레이어 추가 (Presentation, Application)
   - 제안: "Domain/Use Cases/Adapters 외에 Presentation 레이어를 추가하시겠습니까?"

4. **테스트 전략 변경**
   - 예: TDD 3 Rules에 새 규칙 추가
   - 제안: "TDD Protocol에 Mutation Testing을 추가하시겠습니까?"

**📋 제안 형식:**

```markdown
⚠️ Constitution Update Required

**변경 내용:**
- Section: III. Modern Python & Conventions
- 현재: Python 3.12+, Pydantic V2
- 제안: Python 3.13+, Pydantic V3

**이유:**
Python 3.13의 성능 개선 및 Pydantic V3의 새로운 기능을 활용하기 위해

**영향:**
- 모든 개발 환경에서 Python 3.13+ 필요
- Pydantic V3 마이그레이션 작업 필요

**승인 여부:**
이 변경을 Constitution에 반영하시겠습니까?
- YES → Constitution 업데이트 후 Version 1.5.0으로 업그레이드
- NO → 현재 상태 유지
```

**✅ 자동 업데이트 가능 (사용자 승인 불필요):**

1. **Version 번호**
   - Minor 변경 시 자동 업데이트
   - 예: 1.4.0 → 1.4.1 (오타 수정, 설명 개선)

2. **Sync Impact Report (주석)**
   - Supporting Artifacts Status 업데이트
   - 예: 새로운 규칙 파일 추가 시 체크리스트 업데이트

3. **예시 코드 개선**
   - 원칙은 그대로, 예시만 더 명확하게

**❌ 절대 자동 수정하지 말 것:**
- Core Principles (I-VII)
- Architecture Constraints
- TDD Protocol
- Tech Stack 요구사항
- SOLID Principles

**🔄 Version 관리:**
```markdown
- Major (x.0.0): Breaking changes (아키텍처 패턴 변경)
- Minor (1.x.0): 새로운 원칙 추가
- Patch (1.4.x): 오타 수정, 예시 개선
```

### Step 5: Report Changes

업데이트 결과를 보고합니다.

```markdown
## 📄 Documentation Update Report

### README.md
✅ Updated:
- 주요 기능: Added notification feature
- 기술 스택: Updated FastAPI to 0.110.0

❌ No changes needed

### CLAUDE.md
✅ Updated:
- Section 1.1 Backend: Added NotificationService
- Section 5 Recent Changes: Added latest feature

❌ No changes needed

### `.specify/memory/constitution.md`
⚠️ **User Approval Required**:

**Proposed Change:**
- Section: III. Modern Python & Conventions
- Current: Pydantic V2
- Proposed: Pydantic V3

**Reason:** New project using Pydantic V3 features

**Impact:**
- All Pydantic code needs migration
- Breaking changes in validation syntax

**Action:** Awaiting user decision
- [ ] Approved → Update to version 1.5.0
- [ ] Rejected → Keep current version 1.4.0

❌ No changes needed (or user rejected)

### Summary
- 2 files updated
- 1 file pending user approval
- 4 sections modified
- 0 inconsistencies remaining
```

## Update Guidelines

### Language
- **README.md**: 영어로 작성
- **CLAUDE.md**: 기존 언어 유지 (한국어/영어 혼용)

### Tone
- **README.md**: 사용자 친화적, 명확한 지시
- **CLAUDE.md**: 기술적, 구조적, AI가 이해하기 쉽게

### Format
- 기존 문서의 마크다운 형식 유지
- 섹션 번호 체계 유지
- 코드 블록 스타일 일관성 유지

### Anti-Patterns

**❌ Don't:**
- 같은 내용을 두 문서에 중복 작성
- README.md에 AI 전용 컨텍스트 추가 (아키텍처, 규약)
- CLAUDE.md에 사용자 정보 추가 (실행 방법, 기술 스택, 주요 기능)
- @README.md import 제거하거나 수정
- 기존 섹션 구조를 크게 변경
- 문서에 없던 새 섹션을 임의로 추가
- **Constitution을 사용자 승인 없이 수정**
- Constitution의 Core Principles를 임의로 변경
- Constitution의 Architecture Constraints를 무단 수정

**✅ Do:**
- CLAUDE.md 상단에 @README.md import 유지
- 사용자 정보(설치, 실행, 기능)는 README.md에만
- AI 컨텍스트(아키텍처, 규약)는 CLAUDE.md에만
- 기존 형식과 톤 유지
- 명확하고 간결하게
- 변경사항만 업데이트 (불필요한 수정 지양)
- CLAUDE.md는 간결하게 유지 (300줄 이하 목표)
- **Constitution 수정 필요 시 사용자에게 제안하고 승인 대기**
- Constitution 변경 시 Version 번호 업데이트
- Constitution 변경 영향 분석 제공

## Check Mode

`--check` 플래그를 사용하면 업데이트 없이 일치 여부만 확인합니다.

```bash
/wrap --check
```

**Output:**
```markdown
## 📋 Documentation Check Report

### README.md
⚠️ Inconsistencies found:
- Prerequisites: Missing Python 3.12+ requirement
- Environment Variables: NEW_VAR not documented

✅ Consistent sections:
- Setup
- Usage

### CLAUDE.md
⚠️ Inconsistencies found:
- Section 1.1: New service module not documented

✅ Consistent sections:
- AI 사고 프로세스
- Test Protection Protocol

### `.specify/memory/constitution.md`
⚠️ User approval needed:
- Tech Stack: Python 3.13+ introduced (requires constitutional amendment)
- Current version: 1.4.0
- Proposed version: 1.5.0 (Minor - new tech requirement)

✅ No changes needed

### Action Required
Run `/wrap` to update documents automatically.
Constitution changes will require your approval.
```

## Examples

### Example 1: New Feature Added

**Codebase change:**
```python
# backend/src/snowball/domain/services/notification_service.py
class NotificationService:
    """알림 발송 서비스"""
    ...
```

**README.md update:**
```markdown
## 주요 기능
...
7. **알림 발송**: 포트폴리오 변동 알림 ← 추가
```

**CLAUDE.md update:**
```markdown
## 1. 현재 구현 현황

### 1.1 Backend
*   **Services**:
    *   `RebalancingService` (리밸런싱 로직 계산)
    *   `NotificationService` (알림 발송) ← 추가

## 5. Recent Changes
- Feature: Add notification service for portfolio alerts ← 추가
```

### Example 2: Dependency Updated

**Codebase change:**
```toml
# backend/pyproject.toml
dependencies = [
    "fastapi>=0.110.0",  # 0.109.0 → 0.110.0
]
```

**README.md update:**
```markdown
## 기술 스택

- **Backend**: Python 3.12+, FastAPI 0.110.0+, ... ← 업데이트
```

**CLAUDE.md update:**
```markdown
## 5. Recent Changes
- Chore: Update FastAPI to 0.110.0 ← 추가
```

### Example 3: New Component Added

**Codebase change:**
```typescript
// frontend/src/components/NotificationBell.tsx
export function NotificationBell() { ... }
```

**README.md update:**
```markdown
## 주요 기능
...
7. **실시간 알림**: 포트폴리오 변동 알림 벨 ← 추가
```

**CLAUDE.md update:**
```markdown
## 1. 현재 구현 현황

### 1.2 Frontend
*   **Components**:
    ...
    *   `NotificationBell`: 알림 벨 컴포넌트 ← 추가

## 5. Recent Changes
- Feature: Add notification bell component ← 추가
```

### Example 4: Architecture Pattern Change (Constitution Update)

**Codebase change:**
```python
# Introduced CQRS pattern
# backend/src/snowball/commands/
# backend/src/snowball/queries/
```

**Constitution update required:**
```markdown
⚠️ Constitution Update Required

**변경 내용:**
- Section: I. Clean Architecture
- 현재: Domain / Use Cases / Adapters / Infrastructure
- 제안: Domain / Commands / Queries / Adapters / Infrastructure

**이유:**
읽기/쓰기 작업 분리를 위한 CQRS 패턴 도입

**영향:**
- 기존 Use Cases를 Commands/Queries로 분리
- 모든 팀원이 새 패턴 이해 필요
- 기존 코드 리팩토링 필요

**승인 여부:**
이 변경을 Constitution에 반영하시겠습니까?
- YES → Version 2.0.0 (Major breaking change)
- NO → 현재 구조 유지
```

**User response: YES**

**Constitution update:**
```markdown
### I. Clean Architecture (Inward Dependency)
Dependencies MUST strictly flow inwards.
- **Domain**: Pure business rules
- **Commands**: Write operations (Command handlers) ← 추가
- **Queries**: Read operations (Query handlers) ← 추가
- **Adapters**: Interface conversion
- **Infrastructure**: Frameworks & I/O

**Version**: 2.0.0 ← 업데이트 (Major)
```

**CLAUDE.md update:**
```markdown
## 5. Recent Changes
- Architecture: Introduced CQRS pattern (Constitution v2.0.0) ← 추가
```

## Integration with Other Commands

`/wrap`은 다음 명령어들과 함께 사용됩니다:

```bash
# TDD 개발 → 문서 업데이트 → 커밋
/tdd [feature]
/wrap
/commit

# 리뷰 → 문서 업데이트 → 커밋
/review
/wrap
/commit
```

## Pre-Commit Hook

`.claude/settings.local.json`에서 pre-commit hook 설정 시:

```json
{
  "hooks": {
    "preCommit": "Check if /wrap was run before commit"
  }
}
```

## References

- `README.md` - 사용자 문서
- `CLAUDE.md` - AI 컨텍스트
- `.specify/memory/constitution.md` - 프로젝트 헌법
- `.claude/rules/coding-style.md` - 코딩 스타일 규칙

## Notes

- 문서 업데이트는 코드 변경 후 **반드시** 수행해야 합니다
- `/wrap` 없이 `/commit`하면 경고 메시지가 표시될 수 있습니다
- 문서는 항상 현재 코드베이스 상태를 반영해야 합니다
- ⚠️ **Constitution 수정 시**: 반드시 사용자 승인을 받아야 합니다
- Constitution 수정이 필요한 경우 변경 제안과 영향 분석을 먼저 제시합니다
- CLAUDE.md는 간결하게 유지 (300줄 이하 목표)
- Constitution은 Semantic Versioning을 따릅니다 (Major.Minor.Patch)
