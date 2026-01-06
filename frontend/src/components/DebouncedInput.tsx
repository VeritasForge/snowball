import React, { useState, useEffect } from 'react';

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
  debounce?: number;
}

export const DebouncedInput = ({ 
  value: initialValue, 
  onChange, 
  debounce = 500, 
  ...props 
}: DebouncedInputProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
        // Only trigger onChange if value changed from initial (to avoid loop on sync)
        // But initialValue changes when parent updates.
        // Actually, for typical debounce input:
        if (value !== initialValue) {
            onChange(String(value));
        }
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, debounce, initialValue, onChange]);

  return (
    <input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
};
