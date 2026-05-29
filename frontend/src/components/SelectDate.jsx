import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../utils/cx';
import 'cally';

/**
 * Reusable premium SelectDate component powered by Cally Web Components.
 * Supports date formatting, custom styling, React controlled state, min/max restrictions, and smooth animations.
 */
const SelectDate = ({
  value = '',
  onChange,
  className = '',
  disabled = false,
  min = '',
  max = '',
  placeholder = 'Select date',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const calendarRef = useRef(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    <div className={cn("relative inline-block", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl outline-none transition text-sm text-slate-700 dark:text-slate-200 text-left relative font-medium shadow-sm hover:bg-slate-100/50 dark:hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          isOpen && "ring-2 ring-primary-500/20 border-primary-500 dark:border-primary-400 bg-white dark:bg-slate-800"
        )}
      >
        <span className="flex items-center gap-2">
          <CalendarIcon size={16} className={cn("text-slate-400 dark:text-slate-500 transition-colors", isOpen && "text-primary-500 dark:text-primary-400")} />
          <span>{displayValue()}</span>
        </span>
        <ChevronDown size={16} className="text-slate-400 dark:text-slate-500 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 mt-2 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl left-0 max-w-sm"
            style={{ width: '310px' }}
          >
            <calendar-date
              ref={calendarRef}
              value={value}
              min={min || undefined}
              max={max || undefined}
            >
              <svg aria-label="Previous" slot="previous" className="size-4 text-slate-500 dark:text-slate-400 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              <svg aria-label="Next" slot="next" className="size-4 text-slate-500 dark:text-slate-400 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              <calendar-month />
            </calendar-date>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SelectDate;

