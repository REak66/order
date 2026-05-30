import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../utils/cx';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_FULL = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

/**
 * Reusable premium SelectMonth component.
 * Value format: 'YYYY-MM' (e.g. '2026-05')
 * onChange receives: { target: { value: 'YYYY-MM' } }
 */
const SelectMonth = ({
  value = '',
  onChange,
  className = '',
  disabled = false,
  placeholder = 'Select month',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse value into year/month
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  const parseValue = (val) => {
    if (!val) return { year: currentYear, month: currentMonth };
    const parts = val.split('-');
    if (parts.length < 2) return { year: currentYear, month: currentMonth };
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10) - 1 // Convert to 0-indexed
    };
  };

  const { year: selectedYear, month: selectedMonth } = parseValue(value);
  const [viewYear, setViewYear] = useState(selectedYear);

  // Sync viewYear when value changes externally
  useEffect(() => {
    const { year } = parseValue(value);
    setViewYear(year);
  }, [value]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMonth = (monthIndex) => {
    const formatted = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    if (onChange) {
      onChange({ target: { value: formatted } });
    }
    setIsOpen(false);
  };

  const handleThisMonth = () => {
    setViewYear(currentYear);
    handleSelectMonth(currentMonth);
  };

  const displayValue = () => {
    if (!value) return placeholder;
    try {
      const date = new Date(`${value}-01T00:00:00`);
      return format(date, 'MMMM yyyy');
    } catch {
      return value;
    }
  };

  const isCurrentMonth = (monthIndex) =>
    viewYear === currentYear && monthIndex === currentMonth;

  const isSelected = (monthIndex) =>
    viewYear === selectedYear && monthIndex === selectedMonth;

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
            className="absolute z-50 mt-2 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl left-0 w-[280px] max-w-[calc(100vw-2rem)]"
          >
            {/* Year Navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewYear(y => y - 1)}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-slate-800 dark:text-white select-none">
                {viewYear}
              </span>
              <button
                type="button"
                onClick={() => setViewYear(y => y + 1)}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Month Grid */}
            <div className="grid grid-cols-4 gap-1.5">
              {MONTH_LABELS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleSelectMonth(index)}
                  className={cn(
                    "py-2.5 px-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer",
                    isSelected(index)
                      ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                      : isCurrentMonth(index)
                        ? "bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/50"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  )}
                  title={MONTH_FULL[index]}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Separator + This Month Shortcut */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => { setViewYear(currentYear); }}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleThisMonth}
                className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors cursor-pointer"
              >
                This month
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SelectMonth;
