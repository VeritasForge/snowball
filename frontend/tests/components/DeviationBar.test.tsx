import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DeviationBar } from '../../src/components/DeviationBar';

describe('DeviationBar', () => {
  it('편차 문구를 텍스트로 표시한다', () => {
    render(<DeviationBar current={43.2} target={50} />);
    expect(screen.getByText('-6.8%p 부족')).toBeInTheDocument();
  });

  it('막대 채움 폭은 현재 비중, 목표선 위치는 목표 비중이다', () => {
    render(<DeviationBar current={43.2} target={50} />);
    expect(screen.getByTestId('deviation-fill')).toHaveStyle({ width: '43.2%' });
    expect(screen.getByTestId('deviation-target')).toHaveStyle({ left: '50%' });
  });

  it('스크린리더에는 현재·목표·편차를 한 문장으로 알린다', () => {
    render(<DeviationBar current={43.2} target={50} />);
    expect(
      screen.getByRole('img', { name: '현재 43.2%, 목표 50.0%, -6.8%p 부족' }),
    ).toBeInTheDocument();
  });

  it('0~100 범위를 벗어난 값은 막대 안으로 제한한다', () => {
    render(<DeviationBar current={130} target={-5} />);
    expect(screen.getByTestId('deviation-fill')).toHaveStyle({ width: '100%' });
    expect(screen.getByTestId('deviation-target')).toHaveStyle({ left: '0%' });
  });

  it('NaN 입력은 0으로 취급한다', () => {
    render(<DeviationBar current={NaN} target={NaN} />);
    expect(screen.getByText('목표 도달')).toBeInTheDocument();
    expect(screen.getByTestId('deviation-fill')).toHaveStyle({ width: '0%' });
  });

  it('편차 문구는 코랄·보라 같은 손익 의미 색을 쓰지 않는다', () => {
    render(<DeviationBar current={43.2} target={50} />);
    const label = screen.getByText('-6.8%p 부족');
    expect(label.className).not.toMatch(/danger|primary/);
  });
});
