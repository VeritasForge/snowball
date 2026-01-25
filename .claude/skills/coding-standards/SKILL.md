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

### FastAPI Architecture
```python
# ✅ Routes는 thin layer - 비즈니스 로직은 Use Cases에
@app.post("/api/v1/assets")
async def create_asset(
    asset_data: AssetCreate,
    use_case: ManageAssetsUseCase = Depends(get_use_case)
):
    return await use_case.create(asset_data)

# ❌ Routes에 비즈니스 로직 포함 금지
@app.post("/api/v1/assets")
async def create_asset(asset_data: AssetCreate, db: Session = Depends(get_db)):
    # 비즈니스 로직이 route에 있음 - 잘못된 패턴
    if asset_data.quantity < 0:
        raise ValueError("...")
    asset = Asset(**asset_data.dict())
    db.add(asset)
    db.commit()
    return asset
```

### Pydantic V2
```python
# ✅ Pydantic V2 사용법
from pydantic import BaseModel, field_validator, ConfigDict

class AssetCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # V2: model_config

    ticker: str
    quantity: int
    target_ratio: float

    @field_validator('quantity')  # V2: field_validator (not @validator)
    @classmethod
    def quantity_must_be_positive(cls, v: int) -> int:
        if v < 0:
            raise ValueError('quantity must be non-negative')
        return v

# 모델 변환
asset_dict = asset.model_dump()  # V2: model_dump() (not dict())
```

### HTTP Status Codes
```python
# ✅ http.HTTPStatus 사용 (magic number 금지)
from http import HTTPStatus
from fastapi import HTTPException

@app.get("/assets/{asset_id}")
async def get_asset(asset_id: int):
    asset = await repo.get_by_id(asset_id)
    if not asset:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="Asset not found"
        )
    return Response(status_code=HTTPStatus.OK, content=asset)

# ❌ Magic numbers 금지
raise HTTPException(status_code=404, detail="Not found")
return Response(status_code=200, content=asset)
```

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
