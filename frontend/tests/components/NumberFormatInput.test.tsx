import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NumberFormatInput } from '../../src/components/NumberFormatInput';
import React from 'react';

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
});
