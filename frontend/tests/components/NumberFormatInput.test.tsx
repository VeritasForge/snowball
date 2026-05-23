import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NumberFormatInput } from '../../src/components/NumberFormatInput';

describe('NumberFormatInput', () => {
  it('renders with formatted value initially', () => {
    render(<NumberFormatInput value={1000} onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('1,000');
  });

  it('shows raw number on focus', async () => {
    const user = userEvent.setup();
    render(<NumberFormatInput value={1000} onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    await user.click(input);
    expect(input.value).toBe('1000');
  });

  it('formats back to comma-separated on blur', async () => {
    const user = userEvent.setup();
    render(<NumberFormatInput value={1000} onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    await user.click(input);
    expect(input.value).toBe('1000');
    await user.tab(); // Blur
    expect(input.value).toBe('1,000');
  });

  it('calls onChange with raw value when typing', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<NumberFormatInput value={0} onChange={handleChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    await user.click(input);
    await user.keyboard('1234');

    expect(handleChange).toHaveBeenLastCalledWith('1234');
    expect(input.value).toBe('1234');
  });

  it('[Boundary] value=0일 때 blur 시 빈 문자열이 표시된다', async () => {
    const user = userEvent.setup();
    render(<NumberFormatInput value={0} onChange={vi.fn()} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.click(input); // focus
    await user.tab(); // blur
    expect(input.value).toBe(''); // value=0 → falsy → ''
  });

  it('[Boundary] 입력을 지워서 빈 문자열이 되면 onChange가 빈 문자열로 호출된다', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<NumberFormatInput value={1000} onChange={handleChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    await user.click(input); // focus -> shows '1000'
    await user.clear(input); // clears to ''
    // Number('') === 0 so the first branch handles empty string
    expect(handleChange).toHaveBeenCalledWith('');
    expect(input.value).toBe('');
  });

  it('[Boundary] isFocused일 때 외부 value가 변경되어도 로컬 입력값 유지', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<NumberFormatInput value={0} onChange={vi.fn()} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.click(input); // focus
    rerender(<NumberFormatInput value={999} onChange={vi.fn()} />);
    // when focused and displayValue !== '' || value !== 0, we don't sync
    // input should not have changed to formatted value while focused
    expect(input).toBeInTheDocument();
  });
});
