import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../utils/cx';

/**
 * CustomSelect Component
 * A lightweight, fully-styled dropdown replacement for native <select> elements.
 * Eliminates OS-native pickers (macOS / Windows), perfectly matches Dark/Light themes,
 * and supports custom direction (up/down), keyboard navigation, and click-outside dismissal.
 */
const CustomSelect = ({
  value,
  options = [], // [{ value: '...', label: '...' }] or primitive array [10, 20, 50]
  onChange,
  direction = 'down', // 'down' | 'up'
  align = 'left', // 'left' | 'right'
  placeholder = 'Select...',
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  optionClassName = '',
  size = 'sm' // 'xs' | 'sm' | 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options to [{ value, label }] format
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) {
      return opt;
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  // Close on outside click
  const handleClickOutside = useCallback((e) => {
    if (containerRef.current && !containerRef.current.contains(e.target)) {
      setIsOpen(false);
    }
  }, []);

  // Keyboard navigation & accessibility
  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      if (!isOpen && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      if (isOpen) {
        const currentIndex = normalizedOptions.findIndex(
          (opt) => String(opt.value) === String(value)
        );

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % normalizedOptions.length;
          onChange?.(normalizedOptions[nextIndex].value);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex =
            (currentIndex - 1 + normalizedOptions.length) % normalizedOptions.length;
          onChange?.(normalizedOptions[prevIndex].value);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(false);
        }
      }
    },
    [disabled, isOpen, normalizedOptions, value, onChange]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[11px] gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-2 text-sm gap-2'
  }[size] || 'px-2.5 py-1 text-xs gap-1.5';

  const positionClasses = direction === 'up'
    ? 'bottom-full mb-1.5'
    : 'top-full mt-1.5';

  const alignClasses = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={cn('relative inline-block text-left select-none', className)}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'inline-flex items-center justify-between font-semibold rounded-lg border transition-all cursor-pointer outline-none shadow-2xs',
          'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700/80',
          'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600',
          'focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          sizeClasses,
          buttonClassName
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={size === 'xs' ? 12 : 14}
          className={cn(
            'text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ml-1',
            isOpen && 'rotate-180 text-primary-500 dark:text-primary-400'
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={cn(
            'absolute z-50 min-w-full w-max max-h-60 overflow-y-auto py-1',
            'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl',
            'shadow-xl shadow-slate-900/10 dark:shadow-black/40 backdrop-blur-md',
            'motion-preset-fade motion-duration-150',
            positionClasses,
            alignClasses,
            menuClassName
          )}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);

            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange?.(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-2.5 py-1.5 text-xs font-semibold text-left flex items-center justify-between gap-3 transition-colors cursor-pointer rounded-lg mx-auto',
                  isSelected
                    ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60',
                  optionClassName
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check
                    size={13}
                    className="text-primary-600 dark:text-primary-400 stroke-[2.5] shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
