# Data Model: Asset Allocation Donut Chart

> **참고**: 이 기능은 물리적인 데이터베이스 테이블을 생성하지 않습니다. 기존 데이터를 프론트엔드에서 시각화하기 위한 인터페이스만 정의합니다.

## UI Data Interface (Frontend Only)

### DonutChartData
차트 컴포넌트(`recharts`)에 전달하기 위해 기존 `Asset` 엔티티에서 변환된 데이터 구조입니다.

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `name` | `string` | 종목명 | `Asset.name` |
| `value` | `number` | 현재 평가 금액 | `Asset.current_value` |
| `category` | `string` | 자산군 (주식, 채권 등) | `Asset.category` |
| `color` | `string` | 차트 조각 색상 | 카테고리에 따라 프론트엔드에서 매핑 |

## State Management

- **데이터 소스**: `usePortfolioData` 훅 (Zustand store).
- **업데이트 트리거**: `activeAccount.assets`가 변경될 때 (종목 추가/수정/삭제 또는 매매 체결 시) 메모리 내에서 즉시 재계산됨.
- **영속성 (Persistence)**: **없음**. (단순 시각화 용도이며 DB 저장 안 함)

## API Contracts

새로운 백엔드 API는 필요하지 않습니다. 기존의 API를 그대로 활용합니다.
- `GET /api/v1/accounts`: 자산 목록 조회용.
- `POST /api/v1/assets/execute`: 매매 체결 시 자산 정보 업데이트 및 차트 반영 트리거.