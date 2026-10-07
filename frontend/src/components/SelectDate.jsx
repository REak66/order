import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../utils/cx';
import 'cally';

/**
 * Reusable premium SelectDate component powered by Cally Web Components.
 * Supports date formatting, custom styling, React controlled state, min/max restrictions,
 * and portal rendering so dropdown is never clipped by overflow-hidden containers.
 */
const SelectDate = ({
  value = '',
  onChange,
  className = '',
  disabled = false,
  min = '',
  max = '',
  placeholder = 'Select date',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const calendarRef = useRef(null);

  // Position calculation relative to viewport
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popupWidth = 310;
    const popupHeight = 350;

    // Determine if space below is limited
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < popupHeight && rect.top > popupHeight;

    let top = openUpwards
      ? Math.max(8, rect.top - popupHeight - 8)
      : Math.min(window.innerHeight - popupHeight - 8, rect.bottom + 8);

    // Safeguard bounds so it never overflows screen edges
    top = Math.max(8, Math.min(Math.max(8, window.innerHeight - popupHeight - 8), top));

    let left = align === 'right'
      ? rect.right - popupWidth
      : rect.left;

    // Keep within horizontal window bounds
    if (left + popupWidth > window.innerWidth - 12) {
      left = window.innerWidth - popupWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    setCoords({ top, left });
  }, [align]);

  // Update position on open, scroll, or resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const handleScrollOrResize = () => updatePosition();

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close calendar when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleClickOutside = (event) => {
      const isInsideContainer = containerRef.current && containerRef.current.contains(event.target);
      const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);

      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Listen to Cally's custom 'change' event via ref to support React 18 & 19 seamlessly
  useEffect(() => {
    const calendarEl = calendarRef.current;
    if (!calendarEl) return;

    const handleDateChange = (e) => {
      const selectedDate = e.target.value;
      if (onChange) {
        // Construct standard event object structure matching native inputs
        onChange({ target: { value: selectedDate } });
      }
      setIsOpen(false);
    };

    calendarEl.addEventListener('change', handleDateChange);
    return () => {
      calendarEl.removeEventListener('change', handleDateChange);
    };
  }, [isOpen, onChange]);

  // Format the date for the display button (e.g. "MMM dd, yyyy")
  const displayValue = () => {
    if (!value) return placeholder;
    try {
      const date = parseISO(value);
      if (isValid(date)) {
        return format(date, 'MMM dd, yyyy');
      }
    } catch (e) {
      console.error('Invalid date format passed to SelectDate:', e);
    }
    return value;
  };

  return (
    <div className={cn("relative", className || "inline-block")} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-10 sm:h-10.5 flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl outline-none transition text-xs sm:text-sm text-slate-700 dark:text-slate-200 text-left relative font-medium shadow-xs hover:bg-slate-100/50 dark:hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          isOpen && "ring-2 ring-primary-500/20 border-primary-500 dark:border-primary-400 bg-white dark:bg-slate-800"
        )}
      >
        <span className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
          <CalendarIcon size={15} className={cn("text-slate-400 dark:text-slate-500 transition-colors shrink-0", isOpen && "text-primary-500 dark:text-primary-400")} />
          <span className="truncate whitespace-nowrap">{displayValue()}</span>
        </span>
        <ChevronDown size={15} className="text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Click-catcher backdrop */}
              <div
                className="fixed inset-0 z-[99998] bg-black/20 sm:bg-transparent"
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 99999,
              }}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-[310px] max-w-[calc(100vw-1.5rem)] text-slate-900 dark:text-white"
            >
              <calendar-date
                ref={calendarRef}
                value={value}
                min={min || undefined}
                max={max || undefined}
              >
                <svg aria-label="Previous" slot="previous" className="size-4 text-slate-700 dark:text-slate-300 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                <svg aria-label="Next" slot="next" className="size-4 text-slate-700 dark:text-slate-300 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
                <calendar-month />
              </calendar-date>
            </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default SelectDate;
