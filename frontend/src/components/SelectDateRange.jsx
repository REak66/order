import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  CheckCircle,
  X,
  Zap,
  CalendarRange,
  CalendarDays
} from 'lucide-react';
import {
  format,
  parseISO,
  isValid,
  isWeekend,
  addDays,
  endOfMonth,
  startOfMonth,
  addMonths,
  eachDayOfInterval,
  isBefore
} from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import SelectDate from './SelectDate';
import { cn } from '../utils/cx';

/**
 * Reusable premium SelectDateRange component.
 * Allows picking a startDate and endDate, with quick presets,
 * weekend filtering, and date array generation.
 * 
 * Props:
 * - startDate: 'YYYY-MM-DD'
 * - endDate: 'YYYY-MM-DD'
 * - onApply: ({ startDate, endDate, dates: string[], excludeWeekends: boolean }) => void
 * - excludeWeekendsDefault: boolean (default true)
 * - min: string ('YYYY-MM-DD')
 * - className: string
 * - align: 'left' | 'right'
 */
const SelectDateRange = ({
  startDate = '',
  endDate = '',
  onApply,
  excludeWeekendsDefault = true,
  min = '',
  className = '',
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [excludeWeekends, setExcludeWeekends] = useState(excludeWeekendsDefault);

  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sync internal state when props change
  useEffect(() => {
    if (startDate) setTempStart(startDate);
    if (endDate) setTempEnd(endDate);
  }, [startDate, endDate]);

  // Viewport-aware position calculation
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popupWidth = 420;
    const popupHeight = 440;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < popupHeight && rect.top > popupHeight;

    const top = openUpwards
      ? Math.max(8, rect.top - popupHeight - 8)
      : Math.min(window.innerHeight - popupHeight - 8, rect.bottom + 8);

    let left = align === 'right'
      ? rect.right - popupWidth
      : rect.left;

    if (left + popupWidth > window.innerWidth - 12) {
      left = window.innerWidth - popupWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    setCoords({ top, left });
  }, [align]);

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

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideContainer = containerRef.current && containerRef.current.contains(event.target);
      const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute calculated dates from tempStart and tempEnd
  const computedDates = useMemo(() => {
    if (!tempStart || !tempEnd) return [];
    try {
      const s = parseISO(tempStart);
      const e = parseISO(tempEnd);
      if (!isValid(s) || !isValid(e) || isBefore(e, s)) return [];

      return eachDayOfInterval({ start: s, end: e })
        .filter(d => !excludeWeekends || !isWeekend(d))
        .map(d => format(d, 'yyyy-MM-dd'));
    } catch {
      return [];
    }
  }, [tempStart, tempEnd, excludeWeekends]);

  // Preset Handlers
  const applyPresetNext5Workdays = () => {
    const tomorrow = addDays(new Date(), 1);
    let days = [];
    let curr = tomorrow;
    while (days.length < 5) {
      if (!isWeekend(curr)) {
        days.push(curr);
      }
      curr = addDays(curr, 1);
    }
    setTempStart(format(days[0], 'yyyy-MM-dd'));
    setTempEnd(format(days[days.length - 1], 'yyyy-MM-dd'));
    setExcludeWeekends(true);
  };

  const applyPresetNext2Weeks = () => {
    const tomorrow = addDays(new Date(), 1);
    let days = [];
    let curr = tomorrow;
    while (days.length < 10) {
      if (!isWeekend(curr)) {
        days.push(curr);
      }
      curr = addDays(curr, 1);
    }
    setTempStart(format(days[0], 'yyyy-MM-dd'));
    setTempEnd(format(days[days.length - 1], 'yyyy-MM-dd'));
    setExcludeWeekends(true);
  };

  const applyPresetRestOfMonth = () => {
    const tomorrow = addDays(new Date(), 1);
    const end = endOfMonth(new Date());
    setTempStart(format(tomorrow, 'yyyy-MM-dd'));
    setTempEnd(format(end, 'yyyy-MM-dd'));
    setExcludeWeekends(true);
  };

  const applyPresetNextMonth = () => {
    const nextMonth = addMonths(new Date(), 1);
    const start = startOfMonth(nextMonth);
    const end = endOfMonth(nextMonth);
    setTempStart(format(start, 'yyyy-MM-dd'));
    setTempEnd(format(end, 'yyyy-MM-dd'));
    setExcludeWeekends(true);
  };

  const handleApply = () => {
    if (!tempStart || !tempEnd) return;
    if (onApply) {
      onApply({
        startDate: tempStart,
        endDate: tempEnd,
        dates: computedDates,
        excludeWeekends
      });
    }
    setIsOpen(false);
  };

  const displayButtonLabel = () => {
    if (startDate && endDate) {
      try {
        const s = parseISO(startDate);
        const e = parseISO(endDate);
        if (isValid(s) && isValid(e)) {
          return `${format(s, 'MMM dd')} - ${format(e, 'MMM dd, yyyy')}`;
        }
      } catch {
        return `${startDate} - ${endDate}`;
      }
    }
    return 'Select Date Range';
  };

  return (
    <div className={cn("relative inline-block", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl outline-none transition text-sm text-slate-700 dark:text-slate-200 text-left font-medium shadow-sm hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer",
          isOpen && "ring-2 ring-primary-500/20 border-primary-500 dark:border-primary-400 bg-white dark:bg-slate-800"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon size={16} className={cn("text-slate-400 dark:text-slate-500 transition-colors shrink-0", isOpen && "text-primary-500 dark:text-primary-400")} />
          <span className="truncate">{displayButtonLabel()}</span>
        </span>
        <ChevronDown size={16} className="text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
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
              className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-[420px] max-w-[calc(100vw-1.5rem)] text-slate-900 dark:text-white space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
                    <CalendarIcon size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                      Order Date Range Picker
                    </h4>
                    <p className="text-[11px] text-slate-400">Select start and end dates to order across multiple days</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={applyPresetNext5Workdays}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 border border-slate-200/60 dark:border-slate-700/60 transition cursor-pointer text-center"
                  >
                    <Zap size={13} className="text-amber-500 shrink-0" />
                    <span>5 Workdays</span>
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetNext2Weeks}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 border border-slate-200/60 dark:border-slate-700/60 transition cursor-pointer text-center"
                  >
                    <CalendarRange size={13} className="text-blue-500 shrink-0" />
                    <span>2 Weeks</span>
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetRestOfMonth}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 border border-slate-200/60 dark:border-slate-700/60 transition cursor-pointer text-center"
                  >
                    <CalendarIcon size={13} className="text-emerald-500 shrink-0" />
                    <span>This Month</span>
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetNextMonth}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 border border-slate-200/60 dark:border-slate-700/60 transition cursor-pointer text-center"
                  >
                    <CalendarDays size={13} className="text-violet-500 shrink-0" />
                    <span>Next Month</span>
                  </button>
                </div>
              </div>

              {/* Start & End Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Start Date
                  </label>
                  <SelectDate
                    value={tempStart}
                    onChange={(e) => {
                      setTempStart(e.target.value);
                      if (tempEnd && e.target.value > tempEnd) {
                        setTempEnd(e.target.value);
                      }
                    }}
                    min={min}
                    placeholder="Start date"
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    End Date
                  </label>
                  <SelectDate
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    min={tempStart || min}
                    placeholder="End date"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Options & Working Days Switch */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Exclude Weekends (Mon-Fri only)
                  </span>
                  <p className="text-[10px] text-slate-400">Skip Saturdays & Sundays automatically</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={excludeWeekends}
                    onChange={(e) => setExcludeWeekends(e.target.checked)}
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Selection Summary Pill */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Selected Days:</span>
                <span className={cn(
                  "font-bold px-2 py-0.5 rounded-full text-xs",
                  computedDates.length > 0
                    ? "bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                )}>
                  {computedDates.length > 0 ? `${computedDates.length} Days Selected` : 'None'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setTempStart('');
                    setTempEnd('');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={computedDates.length === 0}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CheckCircle size={14} />
                  <span>Apply Date Range ({computedDates.length} days)</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default SelectDateRange;
