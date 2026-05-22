# Deep Research: Compound Engineering

**조사 일자**: 2026-02-16
**조사 범위**: Compound Engineering 개념, 철학, 방법론, Claude Code와의 연관성

---

## Executive Summary

**Compound Engineering**은 "각 단위의 엔지니어링 작업이 후속 작업을 더 쉽게 만들어야 한다"는 원칙에 기반한 AI 네이티브 개발 철학입니다. 전통적 개발에서는 코드베이스 복잡성 증가로 인해 개발 속도가 감소하는 반면, Compound Engineering은 이를 역전시켜 **버그 수정이 향후 버그 범주 전체를 제거**하고 **패턴이 도구로 변환**되도록 설계합니다.

**핵심 특징**:
- 4단계 워크플로우: Plan (80%) → Work (20%) → Review → Compound
- Claude Code 공식 플러그인 기반 자동화
- 26개 전문화 에이전트, 23개 워크플로우 명령어
- 개발 속도 5-10배 향상

---

## 1. Compound Engineering의 정의와 핵심 철학

### 정의
- **확신도**: [Confirmed]
- **출처**: [Compound Engineering: Make Every Unit of Work Compound Into the Next](https://every.to/guides/compound-engineering), [Compound Engineering: How Every Codes With Agents](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents)

> "각 단위의 엔지니어링 작업이 후속 작업을 더 쉽게 만들어야 한다"

전통적 개발:
```
코드 증가 → 복잡성 증가 → 속도 감소
```

Compound Engineering:
```
코드 증가 → 지식 증가 → 속도 증가
```

### 핵심 철학

**전환해야 할 믿음**:

| 버려야 할 믿음 | 채택할 믿음 |
|----------------|-------------|
| "코드를 직접 작성해야 한다" | "결과물의 품질만 중요하다" |
| "모든 라인을 수동 검토해야 한다" | "자동화 시스템이 더 효율적이다" |
| "첫 시도가 좋아야 한다" | "첫 시도 95% 쓸모없음, 반복이 정상" |
| "더 많은 타이핑 = 더 많은 학습" | "검토와 이해가 더 중요한 학습" |

- **확신도**: [Confirmed]
- **근거**: Every.to 공식 가이드에서 명시적으로 강조

---

## 2. 핵심 원칙 7가지

### (1) 모든 작업이 다음 작업을 용이하게
- **확신도**: [Confirmed]
- **설명**: 코드, 문서, 도구가 서로 구축되어야 하며, 미래 작업을 느리게 하지 않는 설계가 필요

### (2) 취향을 검토가 아닌 시스템에 내장
- **확신도**: [Confirmed]
- **설명**: 수동 검토는 확장되지 않으므로 자동화된 확인 시스템을 구축
  - CLAUDE.md에 선호도 문서화
  - 스타일 가이드를 스킬 파일로 변환

### (3) 시스템 개선에 50% 시간 할당
- **확신도**: [Confirmed]
- **시간 배분**:
  - 기능 개발: 50%
  - 제도 개선 (에이전트, 패턴 문서화): 50%
- **대비**: 전통 모델은 기능 90%, 기타 10%

### (4) 안전망 구축, 수동 검토 대체
- **확신도**: [Confirmed]
- **설명**: 자동화된 테스트와 모니터링으로 신뢰 구축
- **원칙**: "AI 출력을 신뢰할 수 없으면, 시스템을 수정하라"

### (5) 에이전트 네이티브 환경 구성
- **확신도**: [Confirmed]
- **요구사항**: 개발자가 할 수 있는 모든 작업을 AI도 가능하게
  - 테스트 실행
  - 로그 접근
  - PR 생성

### (6) 병렬화를 활용
- **확신도**: [Confirmed]
- **방법**: 다중 에이전트 동시 실행, 클라우드 기반 분산 실행

### (7) 계획을 새로운 코드로
- **확신도**: [Confirmed]
- **원칙**: "계획 문서가 가장 중요한 산출물"
  - 코드 작성 전에 결정 사항 정의
  - 에이전트가 참고할 소스 문서 역할

---

## 3. 핵심 워크플로우: 4단계 루프

### 전체 흐름
```
Plan → Work → Review → Compound → Repeat
```

- **확신도**: [Confirmed]
- **출처**: [Compound Engineering: The Definitive Guide](https://every.to/source-code/compound-engineering-the-definitive-guide), [GitHub Plugin](https://github.com/EveryInc/compound-engineering-plugin)

### 1단계: Plan (계획) - 80% 중 절반
**목적**: 요구사항 이해 및 상세 설계

**활동**:
1. 요구사항 이해
2. 코드베이스 연구
3. 외부 도구/프레임워크 조사
4. 솔루션 설계
5. 계획 검증

**산출물**: 상세 구현 계획 (요구사항, 접근법, 엣지 케이스 포함)

### 2단계: Work (실행) - 20%
**목적**: 계획에 따른 자동화 구현

**활동**:
1. Git 워크트리로 격리
2. 에이전트가 단계별 구현
3. 각 변경 후 테스트/린팅 실행
4. 진행 상황 추적 및 문제 처리

**산출물**: Pull Request

**특징**: 개발자는 구현 과정을 감독하지 않고, 완성된 PR만 검토

### 3단계: Review (검토) - 80% 중 절반
**목적**: 다차원 품질 검증

**방식**: 14개 이상의 전문화된 리뷰 에이전트 병렬 실행

| 검토 영역 | 내용 |
|-----------|------|
| **보안** | OWASP 취약점, 인증/권한 검증 |
| **성능** | N+1 쿼리, 캐싱 기회 감지 |
| **아키텍처** | 시스템 설계, 의존성 분석 |
| **데이터** | 마이그레이션, 참조 무결성 |
| **코드품질** | 단순성, 프레임워크 규칙 |
| **배포** | 체크리스트, 롤백 계획 |

**우선순위 분류**:
- P1 (필수): 반드시 수정
- P2 (권장): 권장 사항
- P3 (선택): 선택 사항

### 4단계: Compound (가장 중요!)
**목적**: 시스템을 개선하는 피드백 루프

**활동**:
1. 해결책 문서화 (YAML 프론트매터 포함)
2. 검색 가능하도록 태그/카테고리 추가
3. CLAUDE.md에 새로운 패턴 업데이트
4. 새로운 에이전트/스킬 생성
5. 다음 반복에서 자동 적용 확인

**핵심**: 처음 3단계는 기능을 생성하지만, **4단계가 시스템을 개선**

---

## 4. 시간 배분의 역전

- **확신도**: [Confirmed]
- **출처**: Every.to 공식 가이드

| 활동 | 비율 |
|------|------|
| **계획 + 검토** | 80% |
| **실행 + 최적화** | 20% |

**철학**: "대부분의 사고는 코드 작성 전후에 발생"

이는 전통적 개발의 90/10 비율을 완전히 역전시킨 것입니다.

---

## 5. Claude Code 플러그인 구성

### 5.1 전문화 에이전트 (26개)

| 유형 | 개수 | 역할 |
|------|------|------|
| **리뷰 에이전트** | 14개 | 보안, 성능, 아키텍처, 데이터, 품질, 배포 등 |
| **연구 에이전트** | - | 코드베이스, 문서 조사 |
| **설계 에이전트** | - | UI, Figma 동기화 |
| **자동화 에이전트** | - | 반복 작업 자동화 |
| **문서화 에이전트** | - | 패턴 문서화 |

- **확신도**: [Confirmed]
- **출처**: Every.to 가이드 및 GitHub 플러그인

### 5.2 워크플로우 명령어 (23개)

핵심 명령어:

| 명령어 | 목적 |
|--------|------|
| `/workflows:brainstorm` | 아이디어 정리 |
| `/workflows:plan` | 상세 계획 생성 |
| `/workflows:work` | 코드 구현 |
| `/workflows:review` | 자동 코드 검토 |
| `/workflows:compound` | 솔루션 문서화 |
| `/lfg` | 전체 파이프라인 자동화 (아이디어→PR) |

- **확신도**: [Confirmed]
- **출처**: [GitHub Plugin README](https://github.com/EveryInc/compound-engineering-plugin)

### 5.3 스킬 (13개)

- 에이전트 네이티브 아키텍처
- 스타일 가이드
- 도메인 특화 지식

### 5.4 파일 구조

```
프로젝트/
├── CLAUDE.md                # 에이전트 지시사항, 선호도, 패턴 (가장 중요!)
├── docs/
│   ├── brainstorms/         # 아이디어 정리 출력
│   ├── solutions/           # 해결책 (분류됨)
│   └── plans/               # 계획 문서
└── todos/
    ├── 001-ready-p1-*.md
    └── 002-pending-p2-*.md
```

**CLAUDE.md**가 가장 중요 - 에이전트가 매 세션마다 읽음

- **확신도**: [Confirmed]

---

## 6. AI 도구와의 연관성

### 6.1 AI 채택 단계 (5단계)

| 단계 | 설명 | 도구 예시 |
|------|------|----------|
| **0** | 수동 개발 (AI 없음) | - |
| **1** | 채팅 기반 | ChatGPT, Claude 웹 |
| **2** | 에이전트 도구 + 행별 검토 | Cursor, Claude Code (기본) |
| **3** | **계획 우선, PR 검토만** | ← **Compound 시작 지점** |
| **4** | 아이디어→PR (단일 머신) | Claude Code + Compound Plugin |
| **5** | 클라우드 병렬 실행 + 자동 모니터링 | 미래 비전 |

- **확신도**: [Confirmed]
- **출처**: Every.to 가이드

### 6.2 Claude Code와의 직접 연관성

**Compound Engineering은 Claude Code를 위해 설계됨**:
- **확신도**: [Confirmed]
- **근거**: Every.to가 Claude Code 공식 플러그인 개발

**통합 방법**:
1. Claude Code 플러그인 마켓플레이스에서 설치
   ```bash
   /plugin marketplace add https://github.com/EveryInc/compound-engineering-plugin
   /plugin install compound-engineering
   ```

2. 다중 플랫폼 지원 (변환 도구 제공):
   - OpenCode, Codex, Droid, Cursor, Pi, Gemini

- **확신도**: [Confirmed]
- **출처**: [GitHub Plugin](https://github.com/EveryInc/compound-engineering-plugin)

---

## 7. TDD와의 관계

### 7.1 호환성 분석
- **확신도**: [Likely]
- **출처**: [TorqSoftware Reading List](https://reading.torqsoftware.com/notes/software/ai-ml/agentic-coding/2026-01-19-compound-engineering-claude-code/)

**결론**: **상보적 관계** (mutually complementary)

### 7.2 TDD의 위치

Compound Engineering에서 TDD는:

| 측면 | 설명 |
|------|------|
| **여전히 중요** | "테스트는 신뢰의 기반" |
| **자동화 강조** | 수동 테스트 작성보다는 자동화된 검증 프레임워크 |
| **피드백 루프** | "피드백 루프가 제한 요소. 코드 생성이 빠를수록 테스트가 중요" |
| **안전망** | "신뢰를 구축하는 것이 Compound Engineering의 기초 작업" |

### 7.3 차이점

| 측면 | 전통적 TDD | Compound Engineering |
|------|------------|---------------------|
| **테스트 작성** | 개발자가 수동 작성 | AI 에이전트가 계획 기반 자동 생성 |
| **초점** | RED → GREEN → REFACTOR | Plan → Work → Review → **Compound** |
| **시간 배분** | 50/50 (테스트/구현) | 80/20 (계획·검토/실행) |
| **학습 방식** | 개발자 개인 경험 | 시스템에 문서화되어 팀 전체 공유 |

### 7.4 통합 가능성

**가능한 통합 모델**:

```
Compound Engineering (메타 프레임워크)
    │
    ├─ Plan 단계: 테스트 전략 수립
    │
    ├─ Work 단계: TDD 사이클 (RED → GREEN → REFACTOR)
    │   └─ AI 에이전트가 자동 실행
    │
    ├─ Review 단계: 테스트 품질 검토
    │   └─ 커버리지, 엣지 케이스, 테스트 품질
    │
    └─ Compound 단계: 테스트 패턴 문서화
        └─ 다음 반복에서 재사용
```

**결론**: TDD를 제거하는 것이 아니라, **TDD를 시스템화하고 자동화**하는 것

---

## 8. Clean Architecture / DDD와의 관계

### 8.1 직접적 언급
- **확신도**: [Unverified]
- **근거**: 검색 결과에서 Compound Engineering과 Clean Architecture/DDD의 직접적 통합 사례를 찾지 못함

### 8.2 철학적 호환성 분석
- **확신도**: [Likely] (논리적 추론 기반)

**공통점**:

| 측면 | Clean Architecture/DDD | Compound Engineering |
|------|------------------------|----------------------|
| **핵심 가치** | 도메인 중심 | 시스템 학습 중심 |
| **계층 분리** | 명확한 경계 | 명확한 워크플로우 단계 |
| **테스트 우선** | 테스트 가능성 중시 | 안전망 구축 중시 |
| **문서화** | 유비쿼터스 언어 | CLAUDE.md, 솔루션 문서 |
| **패턴 재사용** | 도메인 패턴 | 컴파운딩 패턴 |

**차이점**:

| 측면 | Clean Architecture/DDD | Compound Engineering |
|------|------------------------|----------------------|
| **초점** | 아키텍처 구조 | 개발 프로세스 |
| **범위** | 코드 조직 | 전체 워크플로우 |
| **도구** | 프레임워크 독립성 | AI 에이전트 의존 |
| **학습** | 개발자 개인 | 시스템 자동화 |

### 8.3 통합 가능성

**통합 모델 제안**:

```
Compound Engineering (프로세스)
    │
    ├─ Plan 단계
    │   └─ DDD: 도메인 모델링, 유비쿼터스 언어 정의
    │   └─ Clean Arch: 레이어 설계, 의존성 방향 결정
    │
    ├─ Work 단계
    │   └─ Clean Arch 규칙에 따라 구현
    │   └─ DDD 패턴 (Entity, VO, Aggregate) 적용
    │
    ├─ Review 단계
    │   └─ 아키텍처 에이전트: 의존성 규칙 검증
    │   └─ 도메인 에이전트: 비즈니스 규칙 검증
    │
    └─ Compound 단계
        └─ 도메인 패턴 문서화
        └─ 아키텍처 결정 기록 (ADR)
```

**결론**: Compound Engineering은 **아키텍처 패러다임과 독립적**이며, Clean Architecture/DDD를 포함한 모든 아키텍처 스타일과 함께 사용 가능

---

## 9. 실용적 권장사항

### 9.1 권한 요청 건너뛰기 (--dangerously-skip-permissions)

**언제 사용**:
- 신뢰할 수 있는 계획이 있을 때
- 좋은 검토 시스템이 있을 때

**언제 미사용**:
- 학습 초기
- 프로덕션 코드 작업 시

**안전장치**: Git 워크트리와 테스트가 안전망 역할

- **확신도**: [Confirmed]

### 9.2 Vibe Coding

**적합한 경우**:
- 개인 프로젝트/프로토타입
- 계획 없이 빠르게 결과를 원할 때
- "뭔가 작동하는가?" 검증용

**주의**: 최종 구현은 별도의 계획을 통해 수행

- **확신도**: [Confirmed]

### 9.3 팀 협업

| 측면 | 권장사항 |
|------|---------|
| **계획 승인** | 명시적 승인 필수 (침묵 ≠ 동의) |
| **PR 소유** | 작업 시작자가 책임 |
| **인간 검토 초점** | 의도와 접근법 (구문/보안은 에이전트가 처리) |
| **기본 협업 방식** | 비동기 (미팅 없이 문서로 진행) |

- **확신도**: [Confirmed]

---

## 10. 세 가지 검증 질문

AI 출력 승인 전 반드시 질문:

1. **"가장 어려운 결정이 무엇이었나?"**
   → AI의 판단 지점 노출

2. **"거절한 대안과 그 이유?"**
   → 대체안 고려 여부 확인

3. **"가장 불안한 부분?"**
   → AI의 약점 자인 확인

- **확신도**: [Confirmed]
- **출처**: Every.to 가이드

---

## 11. CLAUDE.md의 역할

### 11.1 위치와 중요성
- **파일**: 프로젝트 루트의 `CLAUDE.md`
- **역할**: 매 세션 시작 시 에이전트가 읽는 **프로젝트 헌법**
- **확신도**: [Confirmed]

### 11.2 포함 내용

```yaml
# 스타일 선호도
colors:
  primary: "#4F46E5"
  background: "#F9FAFB"

# 패턴 (과거 실수로부터 학습)
patterns:
  auth_flow: "See docs/solutions/auth-pattern"

# 선호 라이브러리/도구
libraries:
  http: "axios"
  testing: "jest"

# 주의사항 및 금지 사항
caveats:
  - "Never use eval()"
  - "Always validate user input"
```

### 11.3 업데이트 주기

변경 후 문서화 → 다음 반복부터 자동 반영

---

## 12. 핵심 요약 테이블

| 측면 | 전통 개발 | Compound Engineering |
|------|---------|----------------------|
| **검토 방식** | 수동 라인별 | 자동화 + 인간 검토 |
| **시간 분배** | 기능 90% | 기능 50% / 시스템 50% |
| **에이전트 역할** | 보조 | 핵심 작업자 |
| **문서화** | 사후 (선택) | 사전 (필수) |
| **피드백 루프** | 인적 | 자동화된 학습 |
| **확장성** | 인력 의존 | 컴퓨트 의존 |
| **개발 속도** | 1x | 5-10x |

---

## 13. Edge Cases & Caveats

### 13.1 전환 과정의 저항

일반적 저항과 극복 전략:

| 저항 | 극복 전략 |
|------|----------|
| "덜 타이핑 = 덜 일하는 것" | 지휘가 구현보다 어려움을 인식 |
| "에이전트 위임 = 통제 상실" | 제약/규칙/검토 시스템으로 통제 유지 |
| "AI가 작성하면 부정행위" | 계획/검토/품질보증 = 핵심 업무 |
| "타이핑 안 하면 배우지 못함" | 이해와 검토가 더 중요한 학습 |

- **확신도**: [Confirmed]

### 13.2 적용 한계

**부적합한 경우**:
- 명확한 요구사항이 없는 탐색적 프로젝트
- 에이전트가 접근할 수 없는 레거시 시스템
- 극도로 민감한 보안 요구사항 (에이전트 신뢰 부족)

- **확신도**: [Likely] (논리적 추론)

### 13.3 학습 곡선

**초기 투자 필요**:
1. CLAUDE.md 작성 (프로젝트 컨텍스트)
2. 검토 시스템 구축
3. 에이전트 신뢰 구축
4. 팀원 교육

**투자 회수**: 3-4주 후부터 생산성 증가 체감

- **확신도**: [Likely] (Every 팀 경험 기반)

---

## 14. Contradictions Found

**없음** - 모든 출처가 일관된 메시지 전달

---

## 15. Sources

### 공식 문서
1. [Compound Engineering: Make Every Unit of Work Compound Into the Next](https://every.to/guides/compound-engineering) — 공식 가이드
2. [Compound Engineering: The Definitive Guide](https://every.to/source-code/compound-engineering-the-definitive-guide) — 상세 가이드
3. [Compound Engineering: How Every Codes With Agents](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents) — Dan Shipper 원저자 포스트

### GitHub 플러그인
4. [GitHub - EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) — 공식 Claude Code 플러그인

### 기술 블로그
5. [Compound Engineering - The Next Paradigm Shift | Vinci Rufus](https://www.vincirufus.com/posts/compound-engineering/) — 패러다임 분석
6. [Compound Engineering: AI-Assisted Software Development Methodology - Reading List](https://reading.torqsoftware.com/notes/software/ai-ml/agentic-coding/2026-01-19-compound-engineering-claude-code/) — TDD 호환성 분석
7. [Compound Engineering With Claude Code - by Martin](https://www.thisisuncharted.co/p/ai-agents-100x-engineers-every) — 실무 적용 사례
8. [Claude Code: The Proven Plan → Work → Review → Compound Method | Dev Genius](https://blog.devgenius.io/claude-code-the-proven-plan-work-review-compound-method-cbf07c24ae85) — 워크플로우 상세

### 패턴 카탈로그
9. [Compounding Engineering Pattern - Awesome Agentic Patterns](https://agentic-patterns.com/patterns/compounding-engineering-pattern/) — 패턴 정리
10. [Compounding Engineering: Building Self-Improving Development Systems | Killer Code](https://cc.deeptoai.com/docs/en/advanced/compounding-engineering) — 자기 개선 시스템

---

## 16. Research Metadata

- **검색 쿼리 수**: 10 (일반 8 + SNS 2)
- **수집 출처 수**: 10
- **출처 유형 분포**:
  - 공식 문서: 3
  - 1차 자료: 2
  - 기술 블로그: 4
  - 커뮤니티: 0
  - SNS: 0
- **확신도 분포**:
  - Confirmed: 대부분 (핵심 원칙, 워크플로우, 플러그인 구조)
  - Likely: 일부 (TDD 호환성, Clean Arch 통합 가능성)
  - Uncertain: 없음
  - Unverified: 일부 (Clean Arch 직접 통합)
- **SNS 출처**: Reddit 0건, Twitter 0건 (검색 실패)
- **SNS 접근 방법**: "WebSearch site: operator"

---

## 결론

Compound Engineering은 단순한 개발 방법론이 아니라, **AI 시대의 소프트웨어 개발 철학 전환**을 의미합니다. 핵심은 "컴파운딩"—각 작업이 다음 작업을 용이하게 하는 복리 효과—입니다.

**성공의 핵심 요소**:
1. ✅ 계획 우선 (80% 투자)
2. ✅ 자동화된 검토 시스템
3. ✅ 체계적 학습 문서화 (Compound 단계)
4. ✅ 에이전트 신뢰 구축
5. ✅ 팀 문화 전환

Every.to 팀의 경험에 따르면, **5-10배 개발 속도 향상**과 함께 **코드 품질 유지**가 가능합니다.
