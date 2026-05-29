import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Clock, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../utils/cx';

// Helper: Parse 'HH:MM' (24-hour) string to 12-hour period parts
const parse24hTo12h = (timeString) => {
  if (!timeString) return { hour: '12', minute: '00', period: 'AM' };
  const parts = timeString.split(':');
  if (parts.length < 2) return { hour: '12', minute: '00', period: 'AM' };

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');

  if (isNaN(hours)) return { hour: '12', minute: '00', period: 'AM' };

  const period = hours >= 12 ? 'PM' : 'AM';
  let hours12 = hours % 12;
  if (hours12 === 0) hours12 = 12;

  return {
    hour: String(hours12).padStart(2, '0'),
    minute: minutes,
    period
  };
};

// Helper: Format 12-hour period parts to 'HH:MM' (24-hour) string
const format12hTo24h = (hour, minute, period) => {
  let hours = parseInt(hour, 10);
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  return `${String(hours).padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

// Generate scroll lists
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

const DROPDOWN_WIDTH = 272; // w-68
const DROPDOWN_HEIGHT = 260; // approximate max height

const TimePicker = ({
  value = '',
  onChange,
  className = '',
  disabled = false,
  placeholder = 'Select time'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  // Column scroll container refs
  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);
  const periodScrollRef = useRef(null);

  // Parse current state value
  const { hour, minute, period } = parse24hTo12h(value);

  // Calculate dropdown position based on button rect
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Determine if dropdown should open upward
    const spaceBelow = viewportHeight - rect.bottom;
    const openUpward = spaceBelow < DROPDOWN_HEIGHT && rect.top > DROPDOWN_HEIGHT;

    let top = openUpward ? rect.top - DROPDOWN_HEIGHT - 8 : rect.bottom + 8;
    let left = rect.left;

    // Clamp to viewport edges
    if (left + DROPDOWN_WIDTH > viewportWidth - 8) {
      left = viewportWidth - DROPDOWN_WIDTH - 8;
    }
    if (left < 8) left = 8;

    setDropdownPos({ top, left });
  }, []);

  // Toggle open and calculate position
  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Close when clicking outside (checks both button and portal dropdown)
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Recalculate position on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => updatePosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, updatePosition]);

  // Smoothly center the active item within its scroll container when opened
  const centerActiveItem = (scrollContainer, activeSelector) => {
    if (!scrollContainer) return;
    const activeEl = scrollContainer.querySelector(activeSelector);
    if (activeEl) {
      const containerHeight = scrollContainer.clientHeight;
      const elOffsetTop = activeEl.offsetTop;
      const elHeight = activeEl.clientHeight;
      scrollContainer.scrollTop = elOffsetTop - (containerHeight / 2) + (elHeight / 2);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        centerActiveItem(hourScrollRef.current, '.active-hour');
        centerActiveItem(minuteScrollRef.current, '.active-minute');
        centerActiveItem(periodScrollRef.current, '.active-period');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, hour, minute, period]);

  // Handle individual component changes
  const handleSelect = (newHour, newMinute, newPeriod) => {
    if (onChange) {
      const formatted24 = format12hTo24h(newHour, newMinute, newPeriod);
      onChange({ target: { value: formatted24 } });
    }
  };

  const displayString = value ? `${hour}:${minute} ${period}` : placeholder;

  // Dropdown rendered via portal
  const dropdown = isOpen
    ? ReactDOM.createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed z-[9999] p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl flex gap-1"
            style={{ top: dropdownPos.top, left: dropdownPos.left, width: DROPDOWN_WIDTH }}
          >
            {/* Hour Wheel */}
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-2">Hour</span>
              <div
                ref={hourScrollRef}
                className="w-full h-44 overflow-y-auto no-scrollbar scroll-smooth pr-1 space-y-0.5"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {HOURS.map((h) => {
                  const isSelected = h === hour;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelect(h, minute, period)}
                      className={cn(
                        "w-full text-center py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer",
                        isSelected
                          ? "active-hour bg-primary-600 text-white shadow-md shadow-primary-600/20"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80"
                      )}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minute Wheel */}
            <div className="flex-1 flex flex-col items-center border-x border-slate-100 dark:border-slate-800/80 px-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-2">Min</span>
              <div
                ref={minuteScrollRef}
                className="w-full h-44 overflow-y-auto no-scrollbar scroll-smooth pr-1 space-y-0.5"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {MINUTES.map((m) => {
                  const isSelected = m === minute;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelect(hour, m, period)}
                      className={cn(
                        "w-full text-center py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer",
                        isSelected
                          ? "active-minute bg-primary-600 text-white shadow-md shadow-primary-600/20"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80"
                      )}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Period Wheel */}
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-2">AM/PM</span>
              <div
                ref={periodScrollRef}
                className="w-full h-44 overflow-y-auto no-scrollbar scroll-smooth pr-1 space-y-0.5 flex flex-col justify-center"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {PERIODS.map((p) => {
                  const isSelected = p === period;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSelect(hour, minute, p)}
                      className={cn(
                        "w-full text-center py-3 text-sm font-semibold rounded-lg transition-all cursor-pointer",
                        isSelected
                          ? "active-period bg-primary-600 text-white shadow-md shadow-primary-600/20"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )
    : null;

  return (
    <div className={cn("relative inline-block w-full", className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl outline-none transition text-sm text-slate-700 dark:text-slate-200 text-left relative font-medium shadow-sm hover:bg-slate-100/50 dark:hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          isOpen && "ring-2 ring-primary-500/20 border-primary-500 dark:border-primary-400 bg-white dark:bg-slate-800"
        )}
      >
        <span className="flex items-center gap-2">
          <Clock size={16} className={cn("text-slate-400 dark:text-slate-500 transition-colors", isOpen && "text-primary-500 dark:text-primary-400")} />
          <span>{displayString}</span>
        </span>
        <ChevronDown size={16} className="text-slate-400 dark:text-slate-500 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>
      {dropdown}
    </div>
  );
};

export default TimePicker;
