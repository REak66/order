import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Laptop } from 'lucide-react';
import { cn } from '../utils/cx';

/**
 * Modern theme switcher component.
 * Can be rendered as a toggle button (default) or a segmented pill selector.
 */
export const ThemeToggle = ({
  variant = 'button', // 'button' | 'segmented' | 'compact'
  className = '',
  showLabel = false,
}) => {
  const { theme, isDark, toggleTheme, setTheme } = useTheme();

  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          "inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs",
          className
        )}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
            theme === 'light'
              ? "bg-white text-amber-600 shadow-sm font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          )}
          title="Light Mode"
        >
          <Sun size={14} className={theme === 'light' ? 'text-amber-500' : ''} />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
            theme === 'dark'
              ? "bg-slate-900 text-sky-400 shadow-sm font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          )}
          title="Dark Mode"
        >
          <Moon size={14} className={theme === 'dark' ? 'text-sky-400' : ''} />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
            theme === 'system'
              ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          )}
          title="System Preference"
        >
          <Laptop size={14} />
          <span>System</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "relative p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2",
        "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80",
        "dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700/80",
        "focus:outline-none focus:ring-2 focus:ring-primary-500/30",
        "hover:scale-105 active:scale-95 shadow-xs",
        className
      )}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {isDark ? (
          <Moon size={18} className="text-sky-400 transition-transform duration-300 rotate-0 scale-100" />
        ) : (
          <Sun size={18} className="text-amber-500 transition-transform duration-300 rotate-0 scale-100" />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-semibold select-none">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
