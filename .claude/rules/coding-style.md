# Coding Style Rules

일관된 코드 스타일을 유지하기 위한 규칙입니다.

## General Principles

### 1. Immutability First
```python
# ✅ Use frozen dataclasses for Value Objects
@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str = "KRW"

# ✅ Return new instances instead of mutating
def add(self, other: Money) -> Money:
    return Money(self.amount + other.amount, self.currency)
```

```typescript
// ✅ Use const and readonly
const config = { apiUrl: 'http://localhost:8000' } as const;

// ✅ Spread operator for updates
const updatedAsset = { ...asset, quantity: newQuantity };
```

### 2. Single Responsibility
```python
# ❌ Too many responsibilities
class AssetManager:
    def create_asset(self): ...
    def calculate_rebalancing(self): ...
    def send_notification(self): ...
    def generate_report(self): ...

# ✅ Single responsibility
class AssetRepository:
    def create(self, asset: Asset) -> Asset: ...
    def get_by_id(self, id: int) -> Asset | None: ...

class RebalancingService:
    def calculate(self, assets: list[Asset]) -> RebalancingResult: ...
```

### 3. Explicit over Implicit
```python
# ❌ Implicit behavior
def process(data):
    return data.get('value', 0) * 100  # What if data is None?

# ✅ Explicit typing and handling
def process(data: dict[str, Any] | None) -> int:
    if data is None:
        raise ValueError("Data cannot be None")
    return int(data.get('value', 0)) * 100
```

## Python Conventions

### Naming
```python
# Classes: PascalCase
class AssetRepository: ...

# Functions/methods: snake_case
def calculate_market_value(): ...

# Constants: UPPER_SNAKE_CASE
MAX_RETRY_COUNT = 3
DEFAULT_CURRENCY = "KRW"

# Private: leading underscore
def _internal_helper(): ...
```

### Imports
```python
# Standard library
import os
from datetime import datetime

# Third-party
from fastapi import FastAPI, Depends
from sqlmodel import Session

# Local
from snowball.domain.entities import Asset
from snowball.use_cases import ManageAssetsUseCase
```

### Type Hints
```python
# ✅ Always use type hints
def get_assets(account_id: int) -> list[Asset]:
    ...

# ✅ Use Optional for nullable
def get_by_id(asset_id: int) -> Asset | None:
    ...
```

## TypeScript Conventions

### Naming
```typescript
// Interfaces: PascalCase with I prefix (optional)
interface Asset { ... }

// Types: PascalCase
type AssetStatus = 'active' | 'inactive';

// Components: PascalCase
function AssetTable({ assets }: Props) { ... }

// Functions: camelCase
function calculateMarketValue() { ... }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
```

### React Components
```typescript
// ✅ Functional components with explicit Props
interface AssetTableProps {
  assets: Asset[];
  onUpdate: (asset: Asset) => void;
}

export function AssetTable({ assets, onUpdate }: AssetTableProps) {
  // Hooks at the top
  const [loading, setLoading] = useState(false);

  // Handlers
  const handleUpdate = () => { ... };

  // Early returns for edge cases
  if (assets.length === 0) {
    return <EmptyState />;
  }

  // Main render
  return ( ... );
}
```

### Avoid `any`
```typescript
// ❌ Never use any
const data: any = await fetch('/api');

// ✅ Use proper types
interface ApiResponse {
  assets: Asset[];
  total: number;
}
const data: ApiResponse = await fetch('/api').then(r => r.json());
```

## File Organization

### Max File Length
- **Hard limit**: 800 lines
- **Recommended**: 300-400 lines
- If exceeding, consider splitting

### Max Function Length
- **Hard limit**: 50 lines
- **Recommended**: 20-30 lines
- If exceeding, extract helper functions

### Max Nesting Depth
- **Hard limit**: 4 levels
- Use early returns to reduce nesting

```python
# ❌ Deep nesting
def process(data):
    if data:
        if data.valid:
            if data.items:
                for item in data.items:
                    if item.active:
                        # process

# ✅ Early returns
def process(data):
    if not data or not data.valid:
        return None
    if not data.items:
        return []
    return [process_item(item) for item in data.items if item.active]
```
