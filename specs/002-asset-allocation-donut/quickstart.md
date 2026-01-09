# Quickstart: Asset Allocation Donut Chart

## Prerequisites
- Node.js 18+
- Python 3.12+ (for Backend)

## Setup
1. **Install Dependencies**:
   ```bash
   cd frontend
   npm install recharts
   ```

## Development
1. **Start Backend**:
   ```bash
   make be
   ```
2. **Start Frontend**:
   ```bash
   make fe
   ```
3. **Verify Dashboard**:
   - Open `http://localhost:3000`
   - Ensure "Donut Chart" appears on the right of the summary section.

## Testing
- **Unit Tests (Component)**:
   ```bash
   cd frontend
   npm test -- src/components/DonutChart.test.tsx
   ```
- **E2E Tests**:
   ```bash
   cd frontend
   npx playwright test
   ```
