import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../utils/cx';

/**
 * Reusable premium SearchBar component.
 * Features consistent typography, primary focus ring, left Search icon,
 * optional uppercase section label, and quick clear button.
 */
const SearchBar = ({
  value = '',
  onChange,
  placeholder = 'Search staff, branch, or status...',
  label = 'Search Staff',
  hasLabel = true,
  className = '',
  inputClassName = '',
  disabled = false,
  ...props
}) => {
  const handleClear = () => {
    if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div className={cn("w-full", hasLabel && label && "space-y-1.5", className)}>
      {hasLabel && label && (
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <Search size={13} className="text-primary-500 shrink-0" />
          <span>{label}</span>
        </label>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
        <input
          type="text"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition text-slate-800 dark:text-slate-200 text-sm font-semibold",
            inputClassName
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded-full"
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
