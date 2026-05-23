import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { CategorySelector, CATEGORIES } from '../../src/components/CategorySelector';

describe('CategorySelector', () => {
  it('[Happy] 현재 카테고리의 첫 글자가 표시된다', () => {
    render(<CategorySelector current="주식" onSelect={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByTitle('카테고리: 주식')).toBeInTheDocument();
  });

  it('[Boundary] current가 없는 값이면 기본 카테고리(주식)를 사용한다', () => {
    render(<CategorySelector current="알수없음" onSelect={vi.fn()} />);
    // Falls back to CATEGORIES[0] which is 주식
    expect(screen.getByTitle('카테고리: 주식')).toBeInTheDocument();
  });

  it('[Happy] 버튼 클릭 시 드롭다운이 열린다', async () => {
    const user = userEvent.setup();
    render(<CategorySelector current="주식" onSelect={vi.fn()} />);
    await user.click(screen.getByRole('button'));
    // All categories should now be visible
    for (const cat of CATEGORIES) {
      expect(screen.getByText(cat.label, { selector: 'span' })).toBeInTheDocument();
    }
  });

  it('[Happy] 카테고리 선택 시 onSelect 호출 및 드롭다운 닫힘', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<CategorySelector current="주식" onSelect={onSelect} />);
    await user.click(screen.getByRole('button'));
    // Click 채권 option
    const bondButtons = screen.getAllByRole('button');
    const bondBtn = bondButtons.find(btn => btn.textContent?.includes('채권'));
    if (bondBtn) await user.click(bondBtn);
    expect(onSelect).toHaveBeenCalledWith('채권');
    // Dropdown should be closed now
    expect(screen.queryByText('원자재', { selector: 'span' })).not.toBeInTheDocument();
  });

  it('[Boundary] 현재 선택된 카테고리는 bold 스타일이 적용된다', async () => {
    const user = userEvent.setup();
    render(<CategorySelector current="채권" onSelect={vi.fn()} />);
    await user.click(screen.getByRole('button'));
    const spans = screen.getAllByText('채권', { selector: 'span' });
    // One of them should have font-bold class
    const boldSpan = spans.find(s => s.className.includes('font-bold'));
    expect(boldSpan).toBeTruthy();
  });

  it('[Error] 버튼 클릭 후 다시 클릭하면 드롭다운이 닫힌다', async () => {
    const user = userEvent.setup();
    render(<CategorySelector current="주식" onSelect={vi.fn()} />);
    const btn = screen.getByRole('button');
    await user.click(btn);
    // dropdown open - 원자재 visible
    expect(screen.getByText('원자재', { selector: 'span' })).toBeInTheDocument();
    await user.click(btn);
    // dropdown closed
    expect(screen.queryByText('원자재', { selector: 'span' })).not.toBeInTheDocument();
  });
});
