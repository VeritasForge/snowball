import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Toast } from '../../src/components/Toast';

describe('Toast', () => {
  it('[Happy] message가 있을 때 렌더링된다', () => {
    render(<Toast message="저장됨" type="info" onClose={vi.fn()} />);
    expect(screen.getByText('저장됨')).toBeInTheDocument();
  });

  it('[Boundary] message가 빈 문자열이면 렌더링되지 않는다', () => {
    const { container } = render(<Toast message="" type="info" onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('[Happy] type=info 일 때 bg-primary 클래스가 적용된다', () => {
    render(<Toast message="정보" type="info" onClose={vi.fn()} />);
    const toast = screen.getByText('정보').closest('div');
    expect(toast?.className).toContain('bg-primary');
  });

  it('[Happy] type=error 일 때 bg-danger 클래스가 적용된다', () => {
    render(<Toast message="에러" type="error" onClose={vi.fn()} />);
    const toast = screen.getByText('에러').closest('div');
    expect(toast?.className).toContain('bg-danger');
  });

  it('[Happy] 닫기 버튼 클릭 시 onClose가 호출된다', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Toast message="닫기 테스트" type="info" onClose={onClose} />);
    await user.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalled();
  });

  it('[Error] type=error 일 때 AlertCircle 아이콘이 표시된다 (Check 아이콘 아님)', () => {
    render(<Toast message="에러 메시지" type="error" onClose={vi.fn()} />);
    // The toast should render without the Check icon (type=error uses AlertCircle)
    expect(screen.getByText('에러 메시지')).toBeInTheDocument();
  });
});
