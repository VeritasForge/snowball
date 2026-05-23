import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DebouncedInput } from '../../src/components/DebouncedInput';

describe('DebouncedInput', () => {
  it('[Happy] 초기값이 렌더링된다', () => {
    render(<DebouncedInput value="hello" onChange={vi.fn()} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('hello');
  });

  it('[Happy] 사용자 입력 후 debounce 시간 경과 시 onChange가 호출된다', async () => {
    const onChange = vi.fn();
    render(<DebouncedInput value="initial" onChange={onChange} debounce={300} />);
    const input = screen.getByRole('textbox');
    // Use fireEvent to avoid userEvent timer issues
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(input, { target: { value: 'new value' } });
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(onChange).toHaveBeenCalledWith('new value');
  });

  it('[Boundary] debounce 기본값(500ms) 이전에는 onChange 호출되지 않는다', async () => {
    const onChange = vi.fn();
    render(<DebouncedInput value="abc" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(input, { target: { value: 'xyz' } });
    // Before 500ms, onChange should not be called
    expect(onChange).not.toHaveBeenCalled();
    // After 500ms+, onChange should be called
    await act(async () => { await new Promise(r => setTimeout(r, 550)); });
    expect(onChange).toHaveBeenCalled();
  });

  it('[Boundary] props value가 변경되면 내부 값이 동기화된다', async () => {
    const { rerender } = render(<DebouncedInput value="first" onChange={vi.fn()} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('first');
    rerender(<DebouncedInput value="second" onChange={vi.fn()} />);
    expect(input.value).toBe('second');
  });

  it('[Boundary] 숫자 값도 올바르게 렌더링된다', () => {
    render(<DebouncedInput value={42} onChange={vi.fn()} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('42');
  });

  it('[Error] 값이 initialValue와 같으면 onChange가 호출되지 않는다', async () => {
    const onChange = vi.fn();
    // value and current input are both 'same'
    render(<DebouncedInput value="same" onChange={onChange} debounce={100} />);
    // No typing, just time passes
    await act(async () => { await new Promise(r => setTimeout(r, 150)); });
    expect(onChange).not.toHaveBeenCalled();
  });
});
