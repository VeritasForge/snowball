# /tdd - Test-Driven Development Workflow

TDD 방법론에 따라 기능을 구현합니다.

## Usage

```
/tdd [기능 설명]
```

## Workflow

1. **인터페이스 정의**: 먼저 타입/인터페이스를 정의합니다
2. **RED**: 실패하는 테스트를 작성합니다
3. **GREEN**: 테스트를 통과하는 최소한의 코드를 작성합니다
4. **REFACTOR**: 코드를 개선합니다 (테스트는 계속 통과해야 함)

## Example

```
/tdd 자산 삭제 시 연관된 거래 내역도 함께 삭제되어야 함
```

## Steps

### Step 1: Interface Definition
```python
# 먼저 인터페이스를 정의합니다
class AssetRepository(Protocol):
    def delete_with_transactions(self, asset_id: int) -> None: ...
```

### Step 2: Write Failing Test (RED)
```python
def test_delete_asset_cascades_to_transactions():
    # Given
    asset = create_test_asset()
    transaction = create_test_transaction(asset_id=asset.id)

    # When
    repo.delete_with_transactions(asset.id)

    # Then
    assert repo.get_by_id(asset.id) is None
    assert transaction_repo.get_by_asset_id(asset.id) == []
```

### Step 3: Implement (GREEN)
```python
def delete_with_transactions(self, asset_id: int) -> None:
    # 최소한의 구현
    self.transaction_repo.delete_by_asset_id(asset_id)
    self.session.query(Asset).filter(Asset.id == asset_id).delete()
    self.session.commit()
```

### Step 4: Refactor
```python
def delete_with_transactions(self, asset_id: int) -> None:
    with self.session.begin():
        self.transaction_repo.delete_by_asset_id(asset_id)
        self._delete_asset(asset_id)
```

## Test Commands

```bash
# Backend
cd backend && uv run pytest tests/ -v

# Frontend
cd frontend && npm test
```

## Coverage Target

- Minimum: 80%
- Critical paths (financial calculations): 100%
