import React from 'react';
import { render, screen, fireEvent, act, createEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TickerSearchInput } from '../../src/components/TickerSearchInput';

const originalFetch = global.fetch;

const defaultProps = {
  value: '',
  onChange: vi.fn(),
  onSelect: vi.fn(),
  onSearch: vi.fn(),
  onError: vi.fn(),
  isLoading: false,
};

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe('TickerSearchInput', () => {
  // [Happy] 초기 렌더링 — placeholder와 검색 버튼 표시
  it('[Happy] placeholder와 검색 버튼이 렌더링된다', () => {
    render(<TickerSearchInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('CODE / 종목명')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '종목 정보 조회' })).toBeInTheDocument();
  });

  // [Happy] 검색 버튼 클릭 → onSearch 호출
  it('[Happy] 검색 버튼 클릭 시 onSearch 호출된다', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<TickerSearchInput {...defaultProps} onSearch={onSearch} />);
    await user.click(screen.getByRole('button', { name: '종목 정보 조회' }));
    expect(onSearch).toHaveBeenCalled();
  });

  // [Boundary] Enter 키 → onSearch 호출
  it('[Boundary] Enter 키 입력 시 onSearch 호출된다', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<TickerSearchInput {...defaultProps} onSearch={onSearch} />);
    await user.click(screen.getByPlaceholderText('CODE / 종목명'));
    await user.keyboard('{Enter}');
    expect(onSearch).toHaveBeenCalled();
  });

  // [Happy] 한글 입력 → debounce 후 fetch → 드롭다운 표시
  it('[Happy] 한글 입력 후 debounce → 드롭다운 결과 표시', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { name: '삼성전자', code: '005930', market: 'KOSPI' },
      ],
    });
    render(<TickerSearchInput {...defaultProps} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(screen.getByText('삼성전자')).toBeInTheDocument();
    expect(screen.getByText('005930')).toBeInTheDocument();
  });

  // [Happy] 드롭다운 항목 클릭 → onSelect 호출 → 드롭다운 닫힘
  it('[Happy] 드롭다운 항목 클릭 시 onSelect(code, name) 호출되고 닫힌다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: '삼성전자', code: '005930', market: 'KOSPI' }],
    });
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<TickerSearchInput {...defaultProps} onSelect={onSelect} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    await user.click(screen.getByText('삼성전자'));
    expect(onSelect).toHaveBeenCalledWith('005930', '삼성전자');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // [Boundary] 검색 결과 0개 → "검색 결과 없음" 표시
  it('[Boundary] 검색 결과 0개 → "검색 결과 없음" 표시', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    render(<TickerSearchInput {...defaultProps} value="없는종목이름" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '없는종목이름' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(screen.getByText('검색 결과 없음')).toBeInTheDocument();
  });

  // [Boundary] ESC 키 → 드롭다운 닫힘
  it('[Boundary] ESC 키 입력 시 드롭다운이 닫힌다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: '삼성전자', code: '005930', market: 'KOSPI' }],
    });
    const user = userEvent.setup();
    render(<TickerSearchInput {...defaultProps} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // [Boundary] 외부 클릭 → 드롭다운 닫힘
  it('[Boundary] 외부 영역 클릭 시 드롭다운이 닫힌다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: '삼성전자', code: '005930', market: 'KOSPI' }],
    });
    render(
      <div>
        <TickerSearchInput {...defaultProps} value="삼성" />
        <div data-testid="outside">외부</div>
      </div>
    );
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // [Error] fetch 실패 → onError 호출
  it('[Error] fetch 실패 시 onError 호출된다', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const onError = vi.fn();
    render(<TickerSearchInput {...defaultProps} onError={onError} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(onError).toHaveBeenCalledWith('종목 검색에 실패했습니다.');
  });

  // [Boundary] isLoading=true → 검색 버튼 비활성화 + 스피너
  it('[Boundary] isLoading=true 시 검색 버튼이 비활성화된다', () => {
    render(<TickerSearchInput {...defaultProps} isLoading={true} />);
    expect(screen.getByRole('button', { name: '종목 정보 조회' })).toBeDisabled();
  });

  // [Boundary] onChange 콜백 호출 확인
  it('[Boundary] 입력 값 변경 시 onChange가 호출된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TickerSearchInput {...defaultProps} onChange={onChange} />);
    await user.type(screen.getByPlaceholderText('CODE / 종목명'), 'A');
    expect(onChange).toHaveBeenCalled();
  });

  // [Boundary] input에서 ESC keyDown → handleKeyDown의 Escape 브랜치 커버
  it('[Boundary] input에서 ESC keyDown 시 드롭다운이 닫힌다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: '삼성전자', code: '005930', market: 'KOSPI' }],
    });
    render(<TickerSearchInput {...defaultProps} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // 공통: 결과 2개 드롭다운을 연 뒤 input을 반환
  const openDropdown = async (items: { name: string; code: string; market: string }[]) => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => items });
  };
  const TWO = [
    { name: '삼성전자', code: '005930', market: 'KOSPI' },
    { name: '삼성SDI', code: '006400', market: 'KOSPI' },
  ];

  // [Happy] input에서 ArrowDown → 첫 옵션으로 실제 focus 이동 (roving)
  it('[Happy] input ArrowDown 시 첫 옵션으로 focus가 이동한다', async () => {
    await openDropdown(TWO);
    render(<TickerSearchInput {...defaultProps} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getAllByRole('option')[0]);
  });

  // [Happy] 옵션에서 ArrowDown/ArrowUp → 인접 옵션으로 focus 이동
  it('[Happy] 옵션에서 ArrowDown/ArrowUp으로 focus가 이동한다', async () => {
    await openDropdown(TWO);
    render(<TickerSearchInput {...defaultProps} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(options[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[1]);
    fireEvent.keyDown(options[1], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(options[0]);
  });

  // [Boundary] 첫 옵션에서 ArrowUp → 입력창으로 focus 복귀
  it('[Boundary] 첫 옵션에서 ArrowUp 시 입력창으로 focus 복귀', async () => {
    await openDropdown(TWO);
    render(<TickerSearchInput {...defaultProps} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getAllByRole('option')[0], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(input);
  });

  // [Boundary] 마지막 옵션에서 ArrowDown → 제자리 (clamp)
  it('[Boundary] 마지막 옵션에서 ArrowDown은 제자리에 머문다', async () => {
    await openDropdown(TWO);
    render(<TickerSearchInput {...defaultProps} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(options[0], { key: 'ArrowDown' }); // → option1 (마지막)
    fireEvent.keyDown(options[1], { key: 'ArrowDown' }); // 제자리
    expect(document.activeElement).toBe(options[1]);
  });

  // [Happy] 옵션에서 Enter → onSelect 호출, onSearch 미호출, 드롭다운 닫힘
  it('[Happy] 옵션에서 Enter 시 onSelect 호출되고 onSearch 미호출', async () => {
    await openDropdown([{ name: '삼성전자', code: '005930', market: 'KOSPI' }]);
    const onSelect = vi.fn();
    const onSearch = vi.fn();
    render(<TickerSearchInput {...defaultProps} onSelect={onSelect} onSearch={onSearch} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getAllByRole('option')[0], { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('005930', '삼성전자');
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // [Happy] 옵션에서 Space → onSelect 호출 + 기본 스크롤 방지
  it('[Happy] 옵션에서 Space 시 onSelect 호출되고 기본 동작이 방지된다', async () => {
    await openDropdown([{ name: '삼성전자', code: '005930', market: 'KOSPI' }]);
    const onSelect = vi.fn();
    render(<TickerSearchInput {...defaultProps} onSelect={onSelect} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const option = screen.getAllByRole('option')[0];
    const ev = createEvent.keyDown(option, { key: ' ' });
    fireEvent(option, ev);
    expect(onSelect).toHaveBeenCalledWith('005930', '삼성전자');
    expect(ev.defaultPrevented).toBe(true);
  });

  // [Boundary] 옵션에서 Escape → 드롭다운 닫힘 + 입력창 복귀
  it('[Boundary] 옵션에서 Escape 시 드롭다운이 닫히고 입력창으로 복귀', async () => {
    await openDropdown([{ name: '삼성전자', code: '005930', market: 'KOSPI' }]);
    render(<TickerSearchInput {...defaultProps} value="삼성" />);
    const input = screen.getByPlaceholderText('CODE / 종목명');
    fireEvent.change(input, { target: { value: '삼성' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getAllByRole('option')[0], { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(input);
  });

  // [Boundary] 결과 0개에서 input ArrowDown → no-op (focus 입력창 유지)
  it('[Boundary] 결과 0개에서 ArrowDown은 아무 동작도 하지 않는다', async () => {
    await openDropdown([]);
    render(<TickerSearchInput {...defaultProps} value="없는종목" />);
    const input = screen.getByPlaceholderText('CODE / 종목명') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '없는종목' } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    input.focus();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(input);
  });

  // [Boundary] disabled=true → input이 비활성화된다
  it('[Boundary] disabled=true 시 입력창이 비활성화된다', () => {
    render(<TickerSearchInput {...defaultProps} disabled={true} />);
    expect(screen.getByPlaceholderText('CODE / 종목명')).toBeDisabled();
  });
});
