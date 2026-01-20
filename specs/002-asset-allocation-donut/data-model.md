# Data Model: Asset Allocation Donut Chart

> **Note**: This feature does not create physical database tables. It only defines interfaces for visualizing existing data in the frontend.

## Chart Data Structure (Frontend)
Data structure transformed from existing `Asset` entity to pass to chart component (`recharts`).

| Field | Type | Description | Source |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Asset Name | `Asset.name` |
| `value` | `number` | Current Value | `Asset.current_value` |
| `category` | `string` | Asset Category (Stock, Bond, etc.) | `Asset.category` |
| `color` | `string` | Chart Slice Color | Mapped in frontend based on category |

## State Management
- **Data Source**: `usePortfolioData` hook (Zustand store).
- **Update Trigger**: Immediately recalculated in memory when `activeAccount.assets` changes (Asset Add/Edit/Delete or Trade Execution).
- **Persistence**: **None**. (Visual purpose only, no DB save).

## API Changes
No new backend API needed. Use existing APIs.
- `GET /api/v1/accounts`: For retrieving asset list.
- `POST /api/v1/assets/execute`: Triggers asset info update and chart reflection on trade execution.
