# Claude Code Configuration Architecture

Snowball 프로젝트의 Claude Code 설정 구조입니다.

## Directory Structure

```
.claude/
├── README.md                    # 이 파일 (구조 설명)
├── settings.local.json          # 권한, hooks, 모델 설정
│
├── agents/                      # 실행 레이어 (도구)
│   ├── tdd-developer.md         # ★ 핵심: RED → GREEN → REFACTOR
│   ├── code-reviewer.md         # 코드 품질 검토
│   ├── test-reviewer.md         # 테스트 품질 검토
│   └── security-reviewer.md     # 보안 검토
│
├── skills/                      # 지식 레이어 (원칙/철학)
│   ├── tdd-workflow/
│   │   └── SKILL.md             # TDD 철학, Red-Green-Refactor
│   ├── coding-standards/
│   │   └── SKILL.md             # Clean Architecture, 코딩 규칙
│   └── test-writing/
│       └── SKILL.md             # 테스트 작성 표준, 커버리지
│
├── commands/                    # 슬래시 명령어
│   ├── speckit.specify.md       # /speckit.specify - 기능 명세
│   ├── speckit.clarify.md       # /speckit.clarify - 명세 명확화
│   ├── speckit.plan.md          # /speckit.plan - 기술 계획
│   ├── speckit.tasks.md         # /speckit.tasks - 작업 분해
│   ├── speckit.implement.md     # /speckit.implement - TDD Loop 실행
│   ├── speckit.analyze.md       # /speckit.analyze - 일관성 분석
│   ├── speckit.checklist.md     # /speckit.checklist - 체크리스트
│   ├── speckit.constitution.md  # /speckit.constitution - 헌법 관리
│   ├── speckit.taskstoissues.md # /speckit.taskstoissues - GitHub 이슈
│   ├── tdd.md                   # /tdd - 빠른 TDD 워크플로우
│   ├── review.md                # /review - 코드 리뷰
│   ├── test-backend.md          # /test-backend - 백엔드 테스트
│   ├── test-frontend.md         # /test-frontend - 프론트엔드 테스트
│   └── build-fix.md             # /build-fix - 빌드 오류 수정
│
└── rules/                       # 항상 준수할 규칙
    ├── security.md              # 보안 규칙 (OWASP, 비밀 관리)
    ├── coding-style.md          # 코딩 스타일 (Python, TypeScript)
    ├── testing.md               # 테스트 규칙 (커버리지, TDD)
    ├── git-workflow.md          # Git 워크플로우 (브랜치, 커밋)
    └── snowball-domain.md       # 도메인 규칙 (금융 계산)
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      KNOWLEDGE LAYER                            │
│                                                                 │
│   ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐   │
│   │  tdd-workflow   │  │coding-standards │  │ test-writing  │   │
│   │    SKILL.md     │  │    SKILL.md     │  │   SKILL.md    │   │
│   └────────┬────────┘  └────────┬────────┘  └───────┬───────┘   │
│            │                    │                   │           │
│            └────────────────────┼───────────────────┘           │
│                                 │ 참조                          │
├─────────────────────────────────┼───────────────────────────────┤
│                      EXECUTION LAYER                            │
│                                 │                               │
│            ┌────────────────────┴────────────────────┐          │
│            │                                         │          │
│   ┌────────▼────────┐                               │          │
│   │  tdd-developer  │ ◄── 핵심 개발 에이전트         │          │
│   │ RED→GREEN→REFAC │                               │          │
│   └────────┬────────┘                               │          │
│            │ 완료                                    │          │
│   ┌────────┼────────┬────────────┐                  │          │
│   │        │        │            │  병렬 실행        │          │
│   ▼        ▼        ▼            │                  │          │
│ ┌────┐  ┌────┐  ┌────────┐      │                  │          │
│ │code│  │test│  │security│      │                  │          │
│ │rev │  │rev │  │reviewer│      │                  │          │
│ └──┬─┘  └──┬─┘  └───┬────┘      │                  │          │
│    │       │        │           │                  │          │
│    └───────┼────────┘           │                  │          │
│            │ 결과 종합           │                  │          │
│            ▼                    │                  │          │
│       ┌─────────┐               │                  │          │
│       │ PASS?   │───Yes──► Task Complete           │          │
│       └────┬────┘               │                  │          │
│            │ No                 │                  │          │
│            ▼                    │                  │          │
│       Feedback ─────────────────┘                  │          │
│                                                    │          │
├────────────────────────────────────────────────────┴──────────┤
│                      WORKFLOW LAYER                            │
│                                                                │
│   ┌──────────────────────────────────────────────────────┐    │
│   │                   SPEC-KIT                            │    │
│   │                                                       │    │
│   │  specify → clarify → plan → tasks → implement        │    │
│   │     │                                    │            │    │
│   │     └─────────── TDD Loop ◄──────────────┘            │    │
│   └──────────────────────────────────────────────────────┘    │
│                                                                │
│   ┌─────────┐ ┌─────────┐ ┌──────────────┐ ┌───────────┐      │
│   │  /tdd   │ │ /review │ │/test-backend │ │/build-fix │      │
│   └─────────┘ └─────────┘ └──────────────┘ └───────────┘      │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                      RULES LAYER (Always Active)               │
│                                                                │
│   ┌──────────┐ ┌─────────────┐ ┌─────────┐ ┌──────────────┐   │
│   │ security │ │coding-style │ │ testing │ │snowball-domain│  │
│   └──────────┘ └─────────────┘ └─────────┘ └──────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Layer Descriptions

### 1. Knowledge Layer (Skills)

**역할**: 원칙과 철학을 담는 지식 저장소

| Skill | 내용 |
|-------|------|
| `tdd-workflow` | TDD 철학, RED-GREEN-REFACTOR, Given-When-Then |
| `coding-standards` | Clean Architecture, 계층 구조, Python/TS 규칙 |
| `test-writing` | 테스트 구조, 커버리지 요구사항, 안티패턴 |

**참조 위치**: `.specify/memory/constitution.md`

### 2. Execution Layer (Agents)

**역할**: 실제 작업을 수행하는 실행 도구

| Agent | 역할 | 실행 방식 |
|-------|------|----------|
| `tdd-developer` | RED → GREEN → REFACTOR 수행 | 순차 (작업별) |
| `code-reviewer` | 코드 품질 검토 | 병렬 (리뷰 시) |
| `test-reviewer` | 테스트 품질 검토 | 병렬 (리뷰 시) |
| `security-reviewer` | 보안 검토 | 병렬 (리뷰 시) |

**중요**: Subagent는 **zero context**로 시작합니다. 필요한 정보를 prompt로 명시적 전달 필요.

### 3. Workflow Layer (Commands)

**역할**: 사용자가 호출하는 워크플로우

#### Spec-Kit (핵심 개발 프로세스)
```
/speckit.specify  →  기능 명세 작성
        ↓
/speckit.clarify  →  명세 명확화 (5개 질문)
        ↓
/speckit.plan     →  기술 계획 수립
        ↓
/speckit.tasks    →  작업 분해
        ↓
/speckit.implement → TDD Loop 실행
        ↓
/speckit.analyze  →  일관성 분석
```

#### Utility Commands
| Command | 용도 |
|---------|------|
| `/tdd` | 빠른 TDD (spec-kit 없이) |
| `/review` | 코드 리뷰 |
| `/test-backend` | 백엔드 테스트 실행 |
| `/test-frontend` | 프론트엔드 테스트 실행 |
| `/build-fix` | 빌드 오류 수정 |

### 4. Rules Layer

**역할**: 모든 작업에서 항상 적용되는 규칙

| Rule | 적용 범위 |
|------|----------|
| `security.md` | OWASP Top 10, 비밀 관리, 입력 검증 |
| `coding-style.md` | Python/TypeScript 스타일, 명명 규칙 |
| `testing.md` | 커버리지 기준, TDD 요구사항 |
| `git-workflow.md` | 브랜치 전략, 커밋 메시지 |
| `snowball-domain.md` | Decimal 필수, Value Objects |

---

## Related Files

| 파일 | 위치 | 역할 |
|------|------|------|
| Constitution | `.specify/memory/constitution.md` | 프로젝트 헌법 (Skills 참조) |
| CLAUDE.md | `./CLAUDE.md` | 프로젝트 컨텍스트 (Agents 참조) |
| GEMINI.md | `.gemini/GEMINI.md` | Gemini용 컨텍스트 |

---

## Quick Reference

### TDD Loop 실행
```
/speckit.implement
```

### 빠른 TDD (단일 기능)
```
/tdd
```

### 코드 리뷰 요청
```
/review
```

### 테스트 실행
```
/test-backend
/test-frontend
```

---

**Version**: 1.0.0 | **Created**: 2026-01-23
