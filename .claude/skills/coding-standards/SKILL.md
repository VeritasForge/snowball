---
name: coding-standards
description: 코딩 규칙과 Clean Architecture 원칙
---

# Coding Standards

## Clean Architecture (Snowball 프로젝트)

### 계층 구조

```
┌─────────────────────────────────────────┐
│           Infrastructure                │  ← Frameworks, I/O
├─────────────────────────────────────────┤
│             Adapters                    │  ← API, Repository
├─────────────────────────────────────────┤
│            Use Cases                    │  ← Application Flow
├─────────────────────────────────────────┤
│              Domain                     │  ← Pure Business Logic
└─────────────────────────────────────────┘
```

### 의존성 방향

**Domain ← Use Cases ← Adapters ← Infrastructure**

항상 **안쪽으로만** 의존합니다.

### 계층별 규칙

| 계층 | 허용 | 금지 |
|------|------|------|
| Domain | 순수 Python, dataclass | FastAPI, SQLModel, Pydantic |
| Use Cases | Domain 참조 | 직접 DB 접근, HTTP 호출 |
| Adapters | Use Cases, Domain 참조 | Infrastructure 세부사항 |
| Infrastructure | 모든 계층 참조 | - |

## Python (Backend)

### 버전 및 도구
- Python 3.12+
- Pydantic V2
- FastAPI (async def 필수)
- SQLModel (AsyncSession)

### 타입 힌트
```python
# ✅ 권장
def get_assets(account_id: int) -> list[Asset]:
    ...

# ❌ 금지 (typing 모듈 사용)
from typing import List
def get_assets(account_id: int) -> List[Asset]:
    ...
```

### 명명 규칙
- 클래스: `PascalCase`
- 함수/변수: `snake_case`
- 상수: `UPPER_SNAKE_CASE`

## TypeScript (Frontend)

### 버전 및 도구
- Next.js 14+ (App Router)
- TypeScript strict 모드
- Tailwind CSS
- Recharts

### 타입 안전성
```typescript
// ✅ 권장
interface Asset {
  id: number;
  ticker: string;
  quantity: number;
}

// ❌ 금지
const asset: any = fetchAsset();
```

## 파일 크기 제한

| 항목 | 최대 | 권장 |
|------|------|------|
| 파일 | 800줄 | 300-400줄 |
| 함수 | 50줄 | 20-30줄 |
| 중첩 깊이 | 4단계 | 2-3단계 |

## 참조 규칙

- `.claude/rules/coding-style.md`
- `.claude/rules/snowball-domain.md`
