import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { Header } from '../../src/components/Header';
import { useAuthStore } from '../../src/lib/auth';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('Header', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it('[Happy] 로그인하지 않은 경우 로그인 링크가 표시된다', () => {
    render(<Header />);
    expect(screen.getByText('로그인 / 회원가입')).toBeInTheDocument();
  });

  it('[Happy] 인증된 사용자의 이메일이 표시된다', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com' },
      token: 'mock-token',
      refreshToken: 'mock-refresh',
    });
    render(<Header />);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('[Happy] 로그아웃 버튼 클릭 시 로그아웃된다', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com' },
      token: 'mock-token',
      refreshToken: 'mock-refresh',
    });
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByText('로그아웃'));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('[Boundary] Snowball Allocator 타이틀이 표시된다', () => {
    render(<Header />);
    expect(screen.getByText('Snowball Allocator')).toBeInTheDocument();
  });

  it('[Error] user.email이 null일 경우 크래시 없이 렌더링된다', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: '1', email: '' },
      token: 'mock-token',
      refreshToken: 'mock-refresh',
    });
    render(<Header />);
    expect(screen.getByText('로그아웃')).toBeInTheDocument();
  });
});
