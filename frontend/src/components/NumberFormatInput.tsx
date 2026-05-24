import React, { useState, useEffect } from 'react';

interface NumberFormatInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: string) => void;
}

export const NumberFormatInput = ({ value, onChange, className, ...props }: NumberFormatInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    // When focused, user input drives local state — no sync needed to avoid cursor jumping
    if (!isFocused) {
      setDisplayValue(value ? value.toLocaleString('ko-KR') : '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (!isNaN(Number(raw))) {
        setDisplayValue(raw);
        onChange(raw);
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
