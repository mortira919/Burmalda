import React, { useEffect, useState } from 'react';

// ── Money Input ──────────────────────────────────────────────────────────────
// Displays value with thousands spaces, stores raw number string

function formatThousands(val) {
  const num = String(val).replace(/\D/g, '');
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function MoneyInput({ value, onChange, placeholder, required, className = '' }) {
  const [display, setDisplay] = useState(value ? formatThousands(value) : '');

  useEffect(() => {
    setDisplay(value ? formatThousands(value) : '');
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setDisplay(raw ? formatThousands(raw) : '');
    onChange(raw);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className={`input font-mono ${className}`}
      value={display}
      onChange={handleChange}
      placeholder={placeholder || '0'}
      required={required}
    />
  );
}

// ── Phone Input ──────────────────────────────────────────────────────────────
// Formats as: +7 (777) 123-45-67

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');

  if (!digits) return '';

  // Handle 8 or 7 prefix
  let d = digits;
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (!d.startsWith('7')) d = '7' + d;

  let result = '+7';
  if (d.length > 1) result += ' (' + d.slice(1, 4);
  if (d.length >= 4) result += ')';
  if (d.length > 4) result += ' ' + d.slice(4, 7);
  if (d.length > 7) result += '-' + d.slice(7, 9);
  if (d.length > 9) result += '-' + d.slice(9, 11);

  return result;
}

export function PhoneInput({ value, onChange, placeholder, className = '' }) {
  const [display, setDisplay] = useState(value ? formatPhone(value) : '');

  useEffect(() => {
    setDisplay(value ? formatPhone(value) : '');
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    const formatted = formatPhone(digits);
    setDisplay(formatted);
    // Store in +7XXXXXXXXXX format
    const normalized = digits.startsWith('8') ? '7' + digits.slice(1) : digits.startsWith('7') ? digits : '7' + digits;
    onChange(normalized.slice(0, 11) ? '+' + normalized.slice(0, 11) : '');
  };

  const handleKeyDown = (e) => {
    // Allow backspace to delete formatted chars naturally
    if (e.key === 'Backspace' && display.length > 0) {
      const raw = display.replace(/\D/g, '');
      const shorter = raw.slice(0, -1);
      const formatted = formatPhone(shorter);
      setDisplay(formatted);
      const normalized = shorter.startsWith('8') ? '7' + shorter.slice(1) : shorter;
      onChange(normalized.length > 1 ? '+' + normalized.slice(0, 11) : '');
      e.preventDefault();
    }
  };

  return (
    <input
      type="tel"
      className={`input font-mono ${className}`}
      value={display}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder || '+7 (777) 123-45-67'}
    />
  );
}
