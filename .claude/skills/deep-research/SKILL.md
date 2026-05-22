---
name: deep-research
description: 3단계 심층 조사 프로토콜. 광역 탐색 → 심화 탐색 → 지식 합성을 통해 근거 기반 아키텍처 의사결정을 지원.
allowed-tools: WebSearch, WebFetch, Read, Grep, Glob
---

# Deep Research Skill

## Overview

이 스킬은 아키텍처 의사결정에 필요한 **심층 조사(Deep Research)**를 3단계 프로토콜로 수행합니다.
최신 기술 동향, 패턴 비교, trade-off 분석 등에서 **출처 기반의 근거 있는 정보**를 제공합니다.

```
┌─────────────────────────────────────────────────────────┐
│              Deep Research Protocol (3-Phase)             │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Phase 1: 광역 탐색 (Broad Exploration)                  │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Query Decomposition → Parallel WebSearch (4-7) │     │
│  │  (일반 3-5 + SNS 1-2)                           │     │
│  │  → Source Diversity Check → Key Findings        │     │
│  └─────────────────────┬───────────────────────────┘     │
│                         │                                 │
│  Phase 2: 심화 탐색 (Deep Dive)                          │
│  ┌─────────────────────▼───────────────────────────┐     │
│  │  Refined Queries → WebSearch + WebFetch          │     │
│  │  → Cross-Validation → Contradiction Detection   │     │
│  └─────────────────────┬───────────────────────────┘     │
│                         │                                 │
│  Phase 3: 지식 합성 (Knowledge Synthesis)                │
│  ┌─────────────────────▼───────────────────────────┐     │
│  │  Source Citation → Confidence Tagging            │     │
│  │  → Edge Cases → Structured Output               │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 실행 트리거 조건

다음 조건 중 하나 이상에 해당하면 이 프로토콜을 실행합니다:

| 조건 | 예시 |
|------|------|
| **명시적 조사 요청** | "~에 대해 조사해줘", "최신 동향을 알려줘" |
| **기술 비교/선택** | "A vs B 어떤 것이 나은가?", "기술 스택 추천" |
| **최신 정보 필요** | "2025년 이후 변경사항", "최근 릴리스" |
| **불확실한 trade-off** | "성능과 일관성 중 어떤 것을 우선?", 근거 부족 시 |
| **표준/규정 확인** | "HIPAA 최신 요구사항", "FHIR R5 변경사항" |
| **패턴 적용 사례** | "실제 운영 환경에서 CQRS 적용 사례" |

### 트리거 제외 조건

다음의 경우 Deep Research를 **건너뛰고** 기존 지식으로 응답합니다:

- 이미 잘 알려진 패턴에 대한 단순 설명 요청
- 코드 리뷰/버그 수정 등 조사가 불필요한 작업
- 사용자가 명시적으로 빠른 응답을 요청한 경우

---

## Execution Instructions

### Phase 1: 광역 탐색 (Broad Exploration)

**목적**: 주제의 전체 지형(landscape)을 파악하고 핵심 키워드를 수집

#### Step 1-1: 쿼리 분해 (Query Decomposition)

**mcp__sequential-thinking__sequentialthinking**을 사용하여:

1. 사용자의 요구사항에서 **핵심 질문 3-5개**를 도출
2. 각 질문에 대한 **검색 쿼리**를 영어와 한국어로 각각 작성
3. 검색 전략 수립 (어떤 출처에서 어떤 정보를 얻을지)

```yaml
query_decomposition:
  original_question: "[사용자의 원본 질문]"
  sub_questions:
    - q1: "핵심 질문 1"
      search_queries:
        - en: "English search query"
        - ko: "한국어 검색 쿼리"
    - q2: "핵심 질문 2"
      search_queries:
        - en: "English search query"
        - ko: "한국어 검색 쿼리"
    # ... (3-5개)
```

#### Step 1-2: 병렬 WebSearch (4-7회)

도출된 검색 쿼리로 **WebSearch**를 **병렬로** 실행합니다:

##### 일반 검색 (3-5회)

- 각 검색은 서로 다른 관점/키워드를 사용
- 출처 다양성 확보: 공식 문서, 기술 블로그, 학술 자료, 커뮤니티 등

##### SNS 검색 (1-2회)

일반 검색과 병렬로 **SNS 전용 검색**을 수행합니다:

```yaml
sns_search_strategy:
  # WebSearch site: 연산자 기반 (기본)
  method: "WebSearch site: operator"

  search_patterns:
    reddit: "site:reddit.com {keyword} {year}"      # 우선순위 1
    twitter: "site:twitter.com {keyword}"            # 우선순위 2
    instagram: "site:instagram.com {keyword}"        # 우선순위 3
    facebook: "site:facebook.com {keyword}"          # 우선순위 4

  # MCP 서버 사용 가능 시 직접 API 호출로 전환
  # mcp_fallback:
  #   reddit: mcp__reddit__search(subreddit, query)
  #   twitter: mcp__twitter__search(query, filters)
```

**SNS 플랫폼 선택 기준**: Reddit을 최우선으로 검색합니다. 주제에 따라 X(Twitter)를 추가합니다.
Instagram/Facebook은 시각적 자료나 커뮤니티 의견이 필요한 경우에만 사용합니다.

#### Step 1-3: 출처 다양성 확인

수집된 출처를 다음 기준으로 분류:

| 출처 유형 | 신뢰도 | 예시 |
|-----------|--------|------|
| **공식 문서** | 최고 | RFC, 공식 가이드, 표준 문서 |
| **1차 자료** | 높음 | 원저자 블로그, 컨퍼런스 발표, 논문 |
| **기술 블로그** | 중간 | Engineering blog, 기술 기사 |
| **커뮤니티** | 참고 | Stack Overflow, GitHub Issues |
| **SNS/소셜 미디어** | 참고 (교차 검증 필수) | Reddit r/programming, X 전문가 스레드 |

**최소 2개 이상의 출처 유형**이 포함되어야 합니다. 부족하면 추가 검색을 수행합니다.

##### SNS 플랫폼별 조사 적합도

| SNS | 조사 적합도 | 주요 용도 |
|-----|------------|----------|
| **Reddit** | 높음 | 기술 토론, 실사용 경험, 패턴 비교 (r/programming, r/softwarearchitecture 등) |
| **X (Twitter)** | 중간 | 전문가 의견, 최신 트렌드, 릴리스 소식 |
| **Instagram** | 낮음 | 시각적 다이어그램, 인포그래픽 |
| **Facebook** | 낮음 | 그룹 토론, 커뮤니티 의견 |

#### Step 1-4: Phase 1 결과 정리

```yaml
phase1_findings:
  key_themes:
    - "[주요 테마 1]"
    - "[주요 테마 2]"
  sources_collected: N
  source_diversity:
    official_docs: N
    primary_sources: N
    tech_blogs: N
    community: N
    sns: N
  keywords_for_phase2:
    - "[심화 검색용 키워드 1]"
    - "[심화 검색용 키워드 2]"
  initial_findings:
    - finding: "[발견 1]"
      source: "[출처]"
    - finding: "[발견 2]"
      source: "[출처]"
```

---

### Phase 2: 심화 탐색 (Deep Dive)

**목적**: Phase 1에서 발견한 핵심 주제를 깊이 파고들어 교차 검증

#### Step 2-1: 정제된 검색

Phase 1의 `keywords_for_phase2`를 사용하여:

1. **WebSearch**로 정제된 검색 2-3회 수행
2. 유망한 출처에 대해 **WebFetch**로 상세 내용 확인
3. 특정 기술/패턴의 공식 문서를 직접 조회

#### Step 2-1-1: SNS 심화 조사 (선택)

Phase 1에서 수집된 SNS 출처 중 유용한 토론/스레드가 있는 경우, **WebFetch**로 상세 내용을 확인합니다.

**SNS 데이터 신뢰도 판정 규칙**:

| 조건 | 확신도 태그 | 설명 |
|------|------------|------|
| SNS 단독 출처 (교차 검증 없음) | `[Unverified]` | 참고용으로만 사용 |
| 공식 문서/기술 블로그와 교차 검증 완료 | `[Likely]`로 승격 | 신뢰도 상향 |
| Reddit 높은 upvote + 다수 동의 댓글 | 커뮤니티 검증으로 간주 | `[Likely]` 부여 가능 |
| 전문가 계정(verified/known)의 X 스레드 | `[Likely]` 부여 가능 | 저자 권위성 고려 |

```yaml
sns_deep_dive:
  useful_threads:
    - platform: "reddit"
      url: "[URL]"
      relevance: "[관련성 설명]"
      community_signal: "upvotes: N, comments: N"
    - platform: "twitter"
      url: "[URL]"
      relevance: "[관련성 설명]"
      author_credibility: "[저자 신뢰도]"
```

#### Step 2-2: 교차 검증 (Cross-Validation)

수집된 정보를 교차 검증합니다:

```yaml
cross_validation:
  confirmed:       # 2개 이상 출처에서 일치
    - claim: "[주장]"
      sources: ["출처1", "출처2"]

  contradicted:    # 출처 간 모순 발견
    - claim_a: "[주장 A]"
      source_a: "[출처 A]"
      claim_b: "[주장 B (반대)]"
      source_b: "[출처 B]"
      resolution: "[어떤 것이 더 신뢰할 수 있는지, 왜]"

  single_source:   # 단일 출처만 존재
    - claim: "[주장]"
      source: "[출처]"
      note: "추가 검증 필요"
```

#### Step 2-3: 모순 식별 및 해결

출처 간 모순이 발견된 경우:

1. 각 출처의 **발행 시점** 확인 (최신이 우선)
2. 출처의 **권위성** 비교 (공식 문서 > 블로그)
3. **맥락 차이** 확인 (다른 버전, 다른 환경에서의 차이일 수 있음)
4. 해결이 불가능한 경우 **두 관점 모두 기록**

---

### Phase 3: 지식 합성 (Knowledge Synthesis)

**목적**: 수집된 정보를 구조화하고 확신도를 태깅하여 최종 결과물 생성

#### Step 3-1: 확신도 태깅 (Confidence Tagging)

모든 주요 주장/결론에 다음 태그를 부여합니다:

| 태그 | 기준 | 의미 |
|------|------|------|
| `[Confirmed]` | 2개 이상 독립 출처에서 검증됨 | 높은 확신으로 의사결정에 사용 가능 |
| `[Likely]` | 신뢰할 수 있는 1개 출처 + 논리적 타당성 | 대부분의 경우 신뢰 가능 |
| `[Uncertain]` | 출처 간 모순 또는 제한된 근거 | 추가 검증 권장 |
| `[Unverified]` | 검증할 수 있는 출처를 찾지 못함 | 참고용으로만 사용 |

#### Step 3-2: Edge Case 명시

```yaml
edge_cases:
  - scenario: "[특수 상황 설명]"
    impact: "[이 경우 결론이 어떻게 달라지는지]"
    recommendation: "[권고사항]"
```

#### Step 3-3: 최종 출력 형식

```markdown
## Deep Research: [주제]

### Executive Summary
[핵심 결론 3-5줄 요약]

### Findings

#### 1. [주요 발견 1]
[상세 설명]
- **확신도**: [Confirmed] / [Likely] / [Uncertain] / [Unverified]
- **출처**: [URL 또는 문서명]
- **근거**: [왜 이 결론에 도달했는지]

#### 2. [주요 발견 2]
...

### Comparisons (해당 시)

| 기준 | Option A | Option B | Option C |
|------|----------|----------|----------|
| ... | ... | ... | ... |

**권장**: [권장 옵션] — [Confirmed] 근거: ...

### Edge Cases & Caveats
- [특수 상황 1]: [영향]
- [특수 상황 2]: [영향]

### Contradictions Found
- [모순 1]: [출처 A] vs [출처 B] → [해결/미해결]

### Sources
1. [출처 1 제목](URL) — [출처 유형]
2. [출처 2 제목](URL) — [출처 유형]
...

### Research Metadata
- 검색 쿼리 수: N (일반 N + SNS N)
- 수집 출처 수: N
- 출처 유형 분포: 공식 N, 1차 N, 블로그 N, 커뮤니티 N, SNS N
- 확신도 분포: Confirmed N, Likely N, Uncertain N, Unverified N
- SNS 출처: Reddit N건, X N건, Instagram N건, Facebook N건
- SNS 접근 방법: "WebSearch site: operator" | "MCP API"
```

---

## Quick Research (간소화 모드)

시간이 제한적이거나 단순 확인이 필요한 경우 **Quick Research**를 사용합니다:

### 트리거
- 사용자가 "빠르게", "간단히" 등의 표현 사용
- 단일 질문에 대한 사실 확인
- 이미 알고 있는 내용의 최신 업데이트 확인

### 실행 방법
- Phase 1만 수행 (WebSearch 1-2회)
- 교차 검증 생략
- 간단한 결과 형식:

```markdown
## Quick Research: [주제]

### 결과
[핵심 내용 — 확신도 태그 포함]

### 출처
- [출처 1](URL)
- [출처 2](URL)

### 주의
Quick Research 결과입니다. 중요한 의사결정에는 Full Research를 권장합니다.
```

---

## 오케스트레이션 연계

### Mode A: 개별 Agent 직접 호출

개별 아키텍트 에이전트가 직접 사용하는 경우:

```
User → Agent → Phase 1 → Phase 2 → Phase 3 → 응답에 통합
```

- 에이전트가 자신의 도메인 관점에서 3단계 모두 수행
- 결과를 리뷰/권고사항에 근거로 포함

### Mode B: 오케스트레이션 연계

`architect-orchestration` 스킬과 함께 사용하는 경우:

```
Orchestrator ─── Phase 1 (광역 탐색) ───────────────┐
                                                      │
              ┌───────────────────────────────────────┤
              ▼              ▼             ▼          │
         Agent A         Agent B       Agent C        │
         Phase 2         Phase 2       Phase 2        │
        (자기 도메인)   (자기 도메인)  (자기 도메인)   │
              └──────────────┬────────────┘           │
                             ▼                        │
                        Phase 3 (합성)                │
                     (오케스트레이터)                  │
```

1. **오케스트레이터가 Phase 1** 수행 → `research_context` 생성
2. `research_context`를 각 Agent 프롬프트에 주입
3. **각 Agent가 자기 도메인에 대해 Phase 2** 수행 (필요 시)
4. **오케스트레이터가 Phase 3** 수행 → 최종 합성

#### research_context 형식

```yaml
research_context:
  topic: "[조사 주제]"
  phase1_summary: "[Phase 1 핵심 발견 요약]"
  key_findings:
    - finding: "[발견]"
      confidence: "[Confirmed/Likely/Uncertain/Unverified]"
      source: "[출처]"
  relevant_to:
    security: "[보안 관련 발견]"
    data: "[데이터 관련 발견]"
    integration: "[통합 관련 발견]"
    # ... 관련 도메인별 요약
```

---

## 품질 기준

### 충분한 조사의 기준

- [ ] 최소 3개 이상의 독립 출처 확인
- [ ] 2개 이상의 출처 유형 포함
- [ ] 모든 주요 주장에 확신도 태그 부여
- [ ] 발견된 모순점 명시 및 해결 시도
- [ ] Edge case 최소 1개 이상 식별
- [ ] 출처 URL 또는 문서명 명시
- [ ] SNS 출처 최소 1개 확인 시도 (Reddit 우선)
- [ ] SNS 정보는 다른 출처와 교차 검증 완료

### 조사 품질 저하 시

다음 경우 사용자에게 한계를 명시합니다:

- 검색 결과가 부족한 경우
- 출처 간 심각한 모순이 해결되지 않은 경우
- 최신 정보를 찾을 수 없는 경우
- 특정 도메인의 전문 지식이 필요한 경우

---

## SNS 조사 가이드

### 접근 방법 분기

```
SNS 조사 요청
    │
    ├─ MCP 서버 사용 가능? ──── Yes ──→ MCP API 직접 호출
    │                                    (구조화된 데이터, 필터링 가능)
    │
    └─ No ──→ WebSearch site: 연산자 사용
              (현재 기본 방법)
```

### 플랫폼별 검색 쿼리 예시

#### Reddit (우선순위 1)

```
# 기술 토론 검색
"site:reddit.com r/programming CQRS event sourcing"
"site:reddit.com r/softwarearchitecture microservices saga pattern"
"site:reddit.com r/devops kubernetes service mesh 2025"

# 특정 서브레딧 타겟
"site:reddit.com/r/java spring boot virtual threads"
"site:reddit.com/r/golang concurrency patterns"
```

#### X / Twitter (우선순위 2)

```
# 전문가 의견/최신 트렌드
"site:twitter.com CQRS event sourcing architecture"
"site:twitter.com microservices 2025 best practices"

# 특정 인물의 의견 (알려진 전문가)
"site:twitter.com from:martinfowler event driven"
```

#### Instagram / Facebook (우선순위 3-4)

```
# 시각적 자료 (Instagram)
"site:instagram.com software architecture diagram"

# 그룹 토론 (Facebook)
"site:facebook.com groups software architecture discussion"
```

### SNS 정보의 한계와 주의사항

| 항목 | 설명 |
|------|------|
| **편향 가능성** | SNS 의견은 특정 커뮤니티 편향이 있을 수 있음 (예: Reddit은 오픈소스 선호 경향) |
| **시점 의존성** | SNS 게시물은 특정 시점의 의견이며, 이후 변경되었을 수 있음 |
| **권위 부재** | 익명/비전문가 의견이 혼재하여 개별 게시물의 권위성 판단이 어려움 |
| **검증 필수** | SNS 정보는 반드시 공식 문서/기술 블로그와 교차 검증 후 사용 |
| **샘플 편향** | 특정 기술에 대한 부정적/긍정적 경험이 과대 대표될 수 있음 |

### MCP 서버 설정 (향후 참조용)

SNS API에 직접 접근하려면 MCP 서버를 설정합니다. 현재는 WebSearch `site:` 연산자로 충분하며,
API 접근이 필요해지면 아래 구성을 참고하세요:

```jsonc
// .mcp.json 예시 (향후 설정 시)
{
  "mcpServers": {
    "reddit": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-reddit"],
      "env": {
        "REDDIT_CLIENT_ID": "<your-client-id>",
        "REDDIT_CLIENT_SECRET": "<your-client-secret>"
      }
    }
    // Twitter/X API는 별도 MCP 서버 패키지 확인 필요
  }
}
```

> **참고**: MCP 서버 패키지명은 예시이며, 실제 사용 시 최신 패키지를 확인하세요.

---

## 관련 리소스

- 각 아키텍트 에이전트의 도메인 지식 (`.claude/agents/*.md`)
- 아키텍처 패턴 스킬 카드 (`.claude/skills/*/SKILL.md`)
- 오케스트레이션 프로토콜 (`.claude/skills/architect-orchestration/SKILL.md`)
