# Feature Specification: Asset Allocation Donut Chart

**Feature Branch**: `002-asset-allocation-donut`
**Created**: 2026-01-09
**Status**: Draft
**Input**: User description: "자산 배분을 하면 실제로 배분된 비율을 도넛 그래프로 표현하고자 해..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Asset Allocation (Priority: P1)

As an investor, I want to view my current asset allocation as a donut chart on the dashboard so that I can intuitively understand my portfolio composition at a glance.

**Why this priority**: Visualizing allocation is the core value proposition of this feature.

**Independent Test**: Can be tested by loading the dashboard with a known set of assets and verifying the chart appears with correct segments.

**Acceptance Scenarios**:

1. **Given** a portfolio with multiple assets (e.g., Stock A: $60, Bond B: $40), **When** the dashboard loads, **Then** a donut chart is displayed on the right side of the summary section showing segments corresponding to the assets.
2. **Given** the dashboard layout, **When** viewed on a desktop screen, **Then** the summary statistics (Total Asset, P&L, etc.) are displayed in a compact format on the left, and the donut chart is on the right.

---

### User Story 2 - Chart Updates on Portfolio Action (Priority: P2)

As an investor, I want the donut chart to update when I manually modify my portfolio (Add/Edit Asset, Execute Trade) so that the visualization reflects my confirmed decisions, without being distracted by real-time market fluctuations.

**Why this priority**: Ensures data consistency with user actions while maintaining a stable view.

**Independent Test**: Can be tested by performing an "Execute Trade" or "Add Asset" action and verifying the chart updates, while ensuring background price updates do not trigger a redraw.

**Acceptance Scenarios**:

1. **Given** the dashboard with existing assets, **When** I add a new asset or edit an existing one, **Then** the donut chart immediately redraws to include the changes.
2. **Given** the dashboard, **When** I click the "Buy" or "Sell" button to execute a trade (committing changes to the database), **Then** the chart updates to reflect the new actual allocation.
3. **Given** the dashboard is open, **When** background market prices change (without user interaction), **Then** the donut chart **DOES NOT** update automatically.

---

### Edge Cases

- **Zero Assets**: What happens when the portfolio is empty? (Should show a placeholder or empty state).
- **Zero Value Assets**: How are assets with 0 value or 0 price handled in the chart? (Should be excluded from segments or shown with a minimal slice if quantity > 0).
- **Many Assets**: How does the chart handle a portfolio with a large number of assets (e.g., 20+)? (Legend readability, segment visibility).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a Donut Chart component on the main Dashboard.
- **FR-002**: The Donut Chart MUST be positioned to the right of the Portfolio Summary section.
- **FR-003**: The Portfolio Summary section (Total Asset, Total P&L, Invested Asset, Cash) MUST be resized/compacted to accommodate the chart.
- **FR-004**: The Donut Chart MUST represent the **Current Valuation (Actual Allocation)** of the portfolio (`Asset Current Value / Total Portfolio Value`).
- **FR-005**: The Donut Chart MUST update **ONLY** when the portfolio composition changes via user action (Asset Creation, Update, Deletion, or Trade Execution). It MUST NOT update automatically due to real-time market price fluctuations.
- **FR-006**: Existing dashboard functionalities (Trade Execution, Asset CRUD) MUST remain unchanged.

### Key Entities *(include if feature involves data)*

- **Asset**: Represents an investment item with Quantity, Current Price, and Calculated Value.
- **Portfolio Summary**: Aggregated financial data (Total Value, Cash, etc.) derived from Assets.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Donut chart renders correctly for portfolios with 1 to 20 assets.
- **SC-002**: Dashboard layout remains responsive and usable on standard desktop resolutions (1024px width and above).
- **SC-003**: Chart updates reflect portfolio changes within < 200ms of user completion of an action (e.g., trade execution).
- **SC-004**: All existing User Journeys (Adding Asset, Calculating Rebalancing) continue to function without regression.