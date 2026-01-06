import React, { useState, useEffect } from 'react';

interface NumberFormatInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: string) => void;
}

export const NumberFormatInput = ({ value, onChange, className, ...props }: NumberFormatInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  // Sync display value with props when not focused (or first load)
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value ? value.toLocaleString('ko-KR') : '');
    } else {
        // When focused, we keep the raw number (but as string to allow intermediate states like "1.")
        // But if prop updates externally while focused (e.g. calculation), we might need to sync?
        // Optimistic update handles this.
        // Let's just keep local state driven by user input when focused.
        if (displayValue === '' && value === 0) return; // Keep empty if 0 and focused? or show 0?
        // We do nothing here to avoid cursor jumping, rely on onChange updating parent
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (!isNaN(Number(raw))) {
        setDisplayValue(raw);
        onChange(raw);
    } else if (raw === '') {
        setDisplayValue('');
        onChange('0');
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Remove commas on focus
    setDisplayValue(value === 0 ? '' : value.toString());
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format on blur
    setDisplayValue(value ? value.toLocaleString('ko-KR') : '');
  };

  return (
    <input
      type="text" // Always text to handle commas
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      {...props}
    />
  );
};
