# Tasks: Asset Allocation Donut Chart

**Feature Branch**: `002-asset-allocation-donut`
**Status**: Ready
**Spec**: [specs/002-asset-allocation-donut/spec.md](spec.md)

## Phase 1: Setup

- [x] T001 Install `recharts` library in `frontend/`

## Phase 2: Foundational

- [x] T002 Extract Summary Cards from `frontend/src/app/page.tsx` into new component `frontend/src/components/SummarySection.tsx`
- [x] T003 Create `DonutChart` component shell in `frontend/src/components/DonutChart.tsx`

## Phase 3: User Story 1 - View Asset Allocation (Priority: P1)

**Goal**: Display current asset allocation as a donut chart.
**Independent Test**: Dashboard loads with chart on the right side of summary.

- [x] T004 [US1] Create unit tests for `DonutChart` (Data transformation, Rendering) in `frontend/tests/components/DonutChart.test.tsx`
- [x] T005 [US1] Implement data transformation logic in `frontend/src/components/DonutChart.tsx` (Asset list -> Chart Data with colors)
- [x] T006 [US1] Implement Chart rendering using `recharts` in `frontend/src/components/DonutChart.tsx`
- [x] T007 [US1] Integrate `DonutChart` into `frontend/src/components/SummarySection.tsx` with Responsive Grid Layout (2fr/1fr)
- [x] T008 [US1] Update `frontend/src/app/page.tsx` to use the new `SummarySection` component

## Phase 4: User Story 2 - Chart Updates on Portfolio Action (Priority: P2)

**Goal**: Ensure chart updates only on user actions (Trade/CRUD), not background polling.
**Independent Test**: Execute trade -> Chart updates. Price poll -> Chart stays.

- [x] T009 [US2] Implement `useMemo` in `DonutChart.tsx` to memoize chart data dependent ONLY on asset quantities/IDs (ignoring price fluctuations)
- [x] T010 [US2] Verify layout responsiveness (Mobile Stack vs Desktop Grid) in `frontend/src/components/SummarySection.tsx`
- [x] T011 [US2] [Polish] Add tooltips and legend to `DonutChart` for better readability

## Implementation Strategy

1.  **MVP (Phase 1-3)**: Deliver the static chart visualization integrated into the dashboard.
2.  **Refinement (Phase 4)**: Apply the strict update logic to satisfy the "No Real-time Flux" requirement.

## Dependencies

- T001 -> T006
- T002 -> T007
- T003 -> T004
- T004 -> T005 -> T006 -> T007
