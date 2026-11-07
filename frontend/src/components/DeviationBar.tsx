import { describeDeviation } from '../lib/deviation';

interface DeviationBarProps {
  current: number;
  target: number;
}

const toPercent = (value: number) => (Number.isFinite(value) ? value : 0);
const toBarPosition = (value: number) => Math.min(100, Math.max(0, value));

export function DeviationBar({ current, target }: DeviationBarProps) {
  const cur = toPercent(current);
  const tgt = toPercent(target);
  const { label } = describeDeviation(cur, tgt);

  return (
    <div className="w-full">
      <div
        role="img"
        aria-label={`현재 ${cur.toFixed(1)}%, 목표 ${tgt.toFixed(1)}%, ${label}`}
        className="relative h-1.5 w-full rounded-full bg-secondary"
      >
        <div
          data-testid="deviation-fill"
          className="h-full rounded-full bg-muted"
          style={{ width: `${toBarPosition(cur)}%` }}
        />
        <div
          data-testid="deviation-target"
          className="absolute -top-0.5 h-2.5 w-0.5 bg-foreground"
          style={{ left: `${toBarPosition(tgt)}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] font-mono tabular-nums text-muted">{label}</div>
    </div>
  );
}
