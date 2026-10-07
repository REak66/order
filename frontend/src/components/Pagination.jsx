import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { cn } from '../utils/cx';

/**
 * Reusable Pagination Component
 * Supporting responsive layout, smart page ellipsis, and optional page-size selector.
 */
const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = ''
}) => {
  if (totalItems <= 0) return null;

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate pagination page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      const leftBound = Math.max(2, currentPage - 1);
      const rightBound = Math.min(totalPages - 1, currentPage + 1);

      if (leftBound > 2) {
        pages.push('ellipsis-left');
      }

      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
      }

      if (rightBound < totalPages - 1) {
        pages.push('ellipsis-right');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={cn(
        'px-4 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400',
        className
      )}
    >
      {/* Left: Summary text & Optional Page Size */}
      <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start w-full sm:w-auto">
        <span>
          Showing <span className="font-bold text-slate-800 dark:text-slate-200">{startItem}</span> to{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">{endItem}</span> of{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems}</span> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
            <span className="text-slate-400">Rows per page:</span>
            <CustomSelect
              value={pageSize}
              options={pageSizeOptions}
              onChange={(val) => onPageSizeChange(Number(val))}
              direction="up"
              size="xs"
            />
          </div>
        )}
      </div>

      {/* Right: Navigation controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="First Page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronsLeft size={15} />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Previous Page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronLeft size={15} />
          </button>

          {/* Numeric Page Buttons (Desktop) */}
          <div className="hidden sm:flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === 'ellipsis-left' || p === 'ellipsis-right') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 select-none">
                    …
                  </span>
                );
              }

              const isCurrent = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={cn(
                    'min-w-8 h-8 px-2 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center justify-center',
                    isCurrent
                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                      : 'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Mobile indicator */}
          <span className="sm:hidden px-2 font-bold text-slate-700 dark:text-slate-300">
            {currentPage} / {totalPages}
          </span>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Next Page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronRight size={15} />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Last Page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronsRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
