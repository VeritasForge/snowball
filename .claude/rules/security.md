# Security Rules

모든 코드 작성 및 커밋 전 반드시 준수해야 하는 보안 규칙입니다.

## Mandatory Checks

### 1. No Hardcoded Secrets
```python
# ❌ NEVER do this
API_KEY = "sk-proj-abc123..."
DATABASE_URL = "postgresql://user:password@host/db"
JWT_SECRET = "my-secret-key"

# ✅ Always use environment variables
import os
API_KEY = os.environ.get("API_KEY")
DATABASE_URL = os.environ.get("DATABASE_URL")
JWT_SECRET = os.environ.get("JWT_SECRET")
```

```typescript
// ❌ NEVER do this
const apiKey = "sk-proj-abc123...";

// ✅ Always use environment variables
const apiKey = process.env.NEXT_PUBLIC_API_KEY;
```

### 2. Input Validation
```python
# ✅ Validate all user inputs
from pydantic import BaseModel, validator

class AssetCreate(BaseModel):
    ticker: str
    quantity: int
    target_ratio: float

    @validator('quantity')
    def quantity_must_be_positive(cls, v):
        if v < 0:
            raise ValueError('quantity must be non-negative')
        return v

    @validator('target_ratio')
    def ratio_must_be_valid(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('target_ratio must be between 0 and 1')
        return v
```

### 3. SQL Injection Prevention
```python
# ❌ NEVER do this
query = f"SELECT * FROM assets WHERE ticker = '{ticker}'"

# ✅ Use parameterized queries (SQLModel handles this)
asset = session.exec(
    select(Asset).where(Asset.ticker == ticker)
).first()
```

### 4. XSS Prevention
```typescript
// ❌ NEVER do this
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ React automatically escapes by default
<div>{userInput}</div>

// ✅ If HTML is needed, sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
```

### 5. IDOR Prevention
```python
# ❌ Vulnerable to IDOR
@app.get("/assets/{asset_id}")
async def get_asset(asset_id: int):
    return repo.get_by_id(asset_id)

# ✅ Verify ownership
@app.get("/assets/{asset_id}")
async def get_asset(asset_id: int, current_user: User = Depends(get_current_user)):
    asset = repo.get_by_id(asset_id)
    if asset.account.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return asset
```

### 6. Error Messages
```python
# ❌ Exposes sensitive information
except Exception as e:
    return {"error": str(e)}  # May reveal stack traces, DB structure

# ✅ Generic error messages
except Exception as e:
    logger.error(f"Error: {e}")  # Log details for debugging
    return {"error": "An error occurred"}  # Generic message to user
```

## Files to Never Commit

```gitignore
# .gitignore - MUST include
.env
.env.local
.env.*.local
*.pem
*.key
credentials.json
secrets.yaml
```

## Response Protocol

보안 이슈 발견 시:
1. **즉시 작업 중단**
2. **이슈 심각도 평가** (Critical/High/Medium/Low)
3. **수정 계획 수립**
4. **노출된 비밀은 즉시 로테이션**
5. **전체 코드베이스 유사 이슈 스캔**
