# Research: Asset Allocation Donut Chart

## Decisions

### 1. Charting Library: Recharts
- **Decision**: Use `recharts` library.
- **Rationale**: 
    - Native React SVG rendering (no canvas wrappers).
    - Highly composable component-based API.
    - Lightweight and tree-shakeable.
    - Strong integration with Tailwind CSS (via `className`).
    - Standard choice for Next.js applications.
- **Alternatives**:
    - `chart.js` / `react-chartjs-2`: Canvas-based, good for large datasets but harder to style with CSS/Tailwind.
    - `nivo`: Powerful but heavier bundle size.
    - `visx`: Too low-level for simple needs.

### 2. Layout Strategy
- **Decision**: Use a CSS Grid layout with `2fr 1fr` ratio (or similar) for Desktop.
- **Rationale**:
    - Left column (`2fr`): Portfolio Summary Cards (Total Asset, P&L, etc.) arranged in a grid or flexible list.
    - Right column (`1fr`): Donut Chart.
    - Mobile: Stack vertically (Summary first, then Chart).
- **Implementation**:
    - Wrapper `div` with `grid grid-cols-1 md:grid-cols-3 gap-6`.
    - Summary Container: `md:col-span-2 grid grid-cols-2 gap-4`.
    - Chart Container: `md:col-span-1 bg-card rounded-xl p-4`.

### 3. Data Flow
- **Decision**: Pass `activeAccount.assets` directly to the Chart component.
- **Rationale**: 
    - `Asset` objects already contain `current_value` and `category`.
    - No need for new API calls.
    - Updates flow naturally from `usePortfolioData` hook.
