export interface Deviation {
  /** 현재 비중 - 목표 비중 (%p, 소수 첫째 자리 반올림) */
  delta: number;
  label: string;
}

export function describeDeviation(current: number, target: number): Deviation {
  // + 0 은 반올림 결과가 -0 이 되는 경우를 0 으로 정리한다.
  const delta = Math.round((current - target) * 10) / 10 + 0;
  if (delta === 0) return { delta, label: '목표 도달' };
  if (delta < 0) return { delta, label: `${delta.toFixed(1)}%p 부족` };
  return { delta, label: `+${delta.toFixed(1)}%p 초과` };
}
