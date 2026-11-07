import { describe, it, expect } from 'vitest';
import { describeDeviation } from '../../src/lib/deviation';

describe('describeDeviation', () => {
  it('목표보다 낮으면 부호와 "부족"을 붙인다', () => {
    expect(describeDeviation(42.3, 50)).toEqual({ delta: -7.7, label: '-7.7%p 부족' });
  });

  it('목표보다 높으면 부호와 "초과"를 붙인다', () => {
    expect(describeDeviation(55, 50)).toEqual({ delta: 5, label: '+5.0%p 초과' });
  });

  it('0.05%p 미만 차이는 목표 도달로 본다', () => {
    expect(describeDeviation(50.04, 50).label).toBe('목표 도달');
    expect(describeDeviation(49.96, 50).label).toBe('목표 도달');
  });

  it('부동소수점 오차를 한 자리로 반올림해 delta에 담는다', () => {
    expect(describeDeviation(0.3, 0.1).delta).toBe(0.2);
  });
});
