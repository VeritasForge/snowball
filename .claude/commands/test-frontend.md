# /test-frontend - Run Frontend Tests

프론트엔드 테스트를 실행합니다.

## Usage

```
/test-frontend              # 전체 테스트
/test-frontend --watch      # 워치 모드
/test-frontend --coverage   # 커버리지 리포트
/test-frontend [파일경로]    # 특정 파일만
```

## Commands

```bash
# 전체 테스트
cd frontend && npm test

# 워치 모드
cd frontend && npm run test:watch

# 커버리지
cd frontend && npm run test:coverage

# 특정 파일
cd frontend && npm test -- --testPathPattern="AssetTable"

# 스냅샷 업데이트
cd frontend && npm test -- -u
```

## Test Structure

```
frontend/src/
├── components/
│   └── __tests__/
│       ├── AssetTable.test.tsx
│       ├── DonutChart.test.tsx
│       └── NumberFormatInput.test.tsx
├── lib/
│   └── __tests__/
│       └── api.test.ts
└── __tests__/
    └── integration/
        └── Dashboard.test.tsx
```

## Testing Patterns

### Component Test
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AssetTable } from '../AssetTable';

describe('AssetTable', () => {
  it('renders asset list', () => {
    const assets = [
      { id: 1, name: 'TIGER S&P500', marketValue: 1000000 }
    ];

    render(<AssetTable assets={assets} />);

    expect(screen.getByText('TIGER S&P500')).toBeInTheDocument();
  });

  it('calls onUpdate when edit button clicked', () => {
    const onUpdate = jest.fn();
    render(<AssetTable assets={[]} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(onUpdate).toHaveBeenCalled();
  });
});
```

### API Mock
```tsx
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/v1/assets', (req, res, ctx) => {
    return res(ctx.json([{ id: 1, name: 'Test Asset' }]));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Coverage Requirements

- **Components**: 70% minimum
- **Utilities**: 90% minimum
- **API Client**: 80% minimum
