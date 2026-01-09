# Implementation Plan: Asset Allocation Donut Chart

**Branch**: `002-asset-allocation-donut` | **Date**: 2026-01-09 | **Spec**: [specs/002-asset-allocation-donut/spec.md](spec.md)
**Input**: Feature specification from `/specs/002-asset-allocation-donut/spec.md`

## Summary

Implement a Donut Chart on the main Dashboard to visualize the current asset allocation of the active portfolio. The chart will sit alongside the summary statistics, providing an immediate visual breakdown of assets by value. It utilizes the `recharts` library and updates upon user actions (Add/Edit/Trade), reflecting the "Current Valuation".

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend)
**Primary Dependencies**: `recharts` (New), Next.js 14+ (Existing), Tailwind CSS (Existing)
**Storage**: N/A (Visualization of existing state)
**Testing**: Vitest (Unit), Playwright (E2E)
**Target Platform**: Web (Desktop & Mobile Responsive)
**Project Type**: Web Application
**Performance Goals**: Render chart < 100ms
**Constraints**: Minimal layout shift, responsive design

## Constitution Check

*GATE: Passed*
- **Clean Architecture**: No Backend changes. Frontend logic isolated in components.
- **Strict TDD**: Will write tests for `DonutChart` component before implementation.
- **Modern Python**: N/A
- **AI Workflow**: Sequential Thinking applied. Plan -> Test -> Implement.

## Project Structure

### Documentation (this feature)

```text
specs/002-asset-allocation-donut/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── DonutChart.tsx       # [NEW] Chart Component
│   │   └── SummarySection.tsx   # [NEW/REF] Wrapper for Summary + Chart
│   └── app/
│       └── page.tsx             # [MOD] Update layout to include SummarySection
└── tests/
    └── components/
        └── DonutChart.test.tsx  # [NEW] Unit Tests
```

**Structure Decision**: 
- Introduce `DonutChart.tsx` as an isolated presentation component.
- Refactor the "Summary Cards" section in `page.tsx` into a structured layout (possibly extracting to `SummarySection.tsx` for cleanliness, or keeping in `page.tsx` if simple enough). Given the "Constitution" preference for "Addition over Modification" and "Isolation", extracting a `PortfolioSummary` component that includes the cards and the chart is a good strategy to keep `page.tsx` clean.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | | |