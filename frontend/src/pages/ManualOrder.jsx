import React, { useEffect, useMemo, useState, useCallback, useDeferredValue } from 'react';
import api from '../utils/api';
import {
  Calendar,
  CheckCircle,
  Search,
  Utensils,
  XCircle,
  RotateCcw,
  Sparkles,
  X,
  Layers,
  Shield,
  Palmtree
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { addDays, format } from 'date-fns';
import SearchSelect from '../components/SearchSelect';
import SelectDate from '../components/SelectDate';
import SelectDateRange from '../components/SelectDateRange';
import ConfirmModal from '../components/ConfirmModal';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { cn } from '../utils/cx';

const todayIso = format(new Date(), 'yyyy-MM-dd');
const tomorrowIso = format(addDays(new Date(), 1), 'yyyy-MM-dd');
const branches = ['City Mall', 'BYD 6A', 'BYD 60M'];

const branchOptions = branches.map(branch => ({ value: branch, label: branch }));

const ManualOrderRow = React.memo(({
  member,
  branch,
  currentStatus,
  isRowSaving,
  isSavingOrder,
  isSavingCancel,
  isSavingClear,
  isMulti,
  selectedDatesLength,
  isCancelDisabled,
  onBranchChange,
  onSaveOrder
}) => {
  const memberId = member._id || member.id;
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors motion-preset-fade motion-duration-200">
      <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">
        <div className="flex items-center gap-2">
          <span>{member.full_name}</span>
          {member.is_standby && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
              <Shield size={11} className="shrink-0" />
              <span>Standby</span>
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{member.username || 'N/A'}</td>
      <td className="px-6 py-4">
        <SearchSelect
          options={branchOptions}
          value={branch}
          onChange={(e) => onBranchChange(memberId, e.target.value)}
          placeholder="Select Branch"
          hasSearch={true}
          className="min-w-[145px]"
        />
      </td>
      <td className="px-6 py-4 text-center">
        {member.is_standby ? (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            Standby Staff
          </span>
        ) : (
          <span className="text-xs text-slate-400 font-medium">
            Normal Staff
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        {isMulti ? (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/60 inline-block">
            Apply to {selectedDatesLength} Dates
          </span>
        ) : (
          <StatusBadge status={currentStatus} />
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="inline-flex items-center gap-2 justify-end">
          {/* Order Button */}
          {(isMulti || currentStatus !== 'ordered') && (
            <button
              type="button"
              onClick={() => onSaveOrder(member, 'ordered')}
              disabled={isRowSaving}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={14} />
              <span>{isSavingOrder ? 'Saving...' : isMulti ? `Order (${selectedDatesLength})` : 'Order'}</span>
            </button>
          )}

          {/* Cancel Button */}
          {(isMulti || currentStatus !== 'cancelled') && (
            <button
              type="button"
              onClick={() => onSaveOrder(member, 'cancelled')}
              disabled={isRowSaving || isCancelDisabled}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/10 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none dark:disabled:bg-slate-800"
              title={isCancelDisabled ? 'Cancellation cannot be performed on past dates' : 'Cancel Order'}
            >
              <XCircle size={14} />
              <span>{isSavingCancel ? 'Saving...' : isMulti ? `Cancel (${selectedDatesLength})` : 'Cancel'}</span>
            </button>
          )}

          {/* Clear Button */}
          {(isMulti || currentStatus !== 'not_ordered') && (
            <button
              type="button"
              onClick={() => onSaveOrder(member, 'not_ordered')}
              disabled={isRowSaving}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={14} />
              <span>{isSavingClear ? 'Clearing...' : isMulti ? `Clear (${selectedDatesLength})` : 'Clear'}</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});
ManualOrderRow.displayName = 'ManualOrderRow';

const ManualOrderCard = React.memo(({
  member,
  branch,
  currentStatus,
  isRowSaving,
  isSavingOrder,
  isSavingCancel,
  isSavingClear,
  isMulti,
  selectedDatesLength,
  isCancelDisabled,
  onBranchChange,
  onSaveOrder
}) => {
  const memberId = member._id || member.id;
  return (
    <div className="p-4 space-y-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-bold text-slate-800 dark:text-white text-base leading-snug">{member.full_name}</h4>
            {member.is_standby && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Shield size={10} className="shrink-0" />
                <span>Standby</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{member.username || 'N/A'}</p>
        </div>

        {isMulti ? (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/60 uppercase tracking-wider shrink-0">
            {selectedDatesLength} Dates
          </span>
        ) : (
          <StatusBadge status={currentStatus} size="sm" />
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Branch</label>
        <SearchSelect
          options={branchOptions}
          value={branch}
          onChange={(e) => onBranchChange(memberId, e.target.value)}
          placeholder="Select Branch"
          hasSearch={true}
          className="w-full"
        />
      </div>

      <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
        {(isMulti || currentStatus !== 'ordered') && (
          <button
            type="button"
            onClick={() => onSaveOrder(member, 'ordered')}
            disabled={isRowSaving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/10 disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px]"
          >
            <CheckCircle size={14} />
            <span>{isSavingOrder ? 'Saving...' : isMulti ? `Order (${selectedDatesLength})` : 'Order'}</span>
          </button>
        )}

        {(isMulti || currentStatus !== 'cancelled') && (
          <button
            type="button"
            onClick={() => onSaveOrder(member, 'cancelled')}
            disabled={isRowSaving || isCancelDisabled}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/10 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none dark:disabled:bg-slate-800 min-h-[38px]"
            title={isCancelDisabled ? 'Cancellation cannot be performed on past dates' : 'Cancel Order'}
          >
            <XCircle size={14} />
            <span>{isSavingCancel ? 'Saving...' : isMulti ? `Cancel (${selectedDatesLength})` : 'Cancel'}</span>
          </button>
        )}

        {(isMulti || currentStatus !== 'not_ordered') && (
          <button
            type="button"
            onClick={() => onSaveOrder(member, 'not_ordered')}
            disabled={isRowSaving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px]"
          >
            <RotateCcw size={14} />
            <span>{isSavingClear ? 'Clearing...' : isMulti ? `Clear (${selectedDatesLength})` : 'Clear'}</span>
          </button>
        )}
      </div>
    </div>
  );
});
ManualOrderCard.displayName = 'ManualOrderCard';

const ManualOrder = () => {
  const [staff, setStaff] = useState([]);
  const [orderStatuses, setOrderStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDates, setSelectedDates] = useState([tomorrowIso]);
  const [selectedBranches, setSelectedBranches] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [isMultiDateMode, setIsMultiDateMode] = useState(false);
  const [rangeStart, setRangeStart] = useState(tomorrowIso);
  const [rangeEnd, setRangeEnd] = useState(format(addDays(new Date(), 5), 'yyyy-MM-dd'));
  const [bulkSaving, setBulkSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    confirmText: 'Confirm',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchStaff();
    fetchHolidays();
    fetchDefaultDate();
  }, []);

  useEffect(() => {
    // If single date, fetch statuses for that date
    if (selectedDates.length === 1) {
      fetchOrderStatuses(selectedDates[0]);
    }
  }, [selectedDates]);

  const fetchHolidays = async () => {
    try {
      const res = await api.get('/api/holidays');
      setHolidays(res.data);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  };

  const holidaysMap = useMemo(() => {
    const map = {};
    holidays.forEach(h => {
      if (h.is_active) map[h.date] = h;
    });
    return map;
  }, [holidays]);

  // Horizon pills for upcoming 7 days (1 full working week)
  const upcomingDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const d = addDays(new Date(), i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const holiday = holidaysMap[dateStr];
      days.push({
        dateStr,
        dayName: format(d, 'EEE'),
        formattedDate: format(d, 'dd MMM'),
        isWeekend,
        holiday
      });
    }
    return days;
  }, [holidaysMap]);

  const fetchDefaultDate = async () => {
    try {
      const res = await api.get('/api/dashboard/stats');
      if (res.data && res.data.lunchDate) {
        setSelectedDates([res.data.lunchDate]);
      }
    } catch (error) {
      console.error('Failed to fetch default order date:', error);
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/staff');
      setStaff(res.data);
      setSelectedBranches(prev => {
        const next = { ...prev };
        res.data.forEach(member => {
          const id = member._id || member.id;
          if (!next[id]) {
            next[id] = member.branch || 'City Mall';
          }
        });
        return next;
      });
    } catch (error) {
      toast.error('Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderStatuses = async (date) => {
    try {
      const res = await api.get('/api/reports', {
        params: {
          period: 'daily',
          date: date
        }
      });
      const statusMap = Object.fromEntries(
        res.data.map(item => [item.user_id, item.status])
      );
      setOrderStatuses(statusMap);
    } catch (error) {
      console.error('Failed to fetch order statuses:', error);
    }
  };

  const toggleDateSelection = (dateStr) => {
    if (!isMultiDateMode) {
      setSelectedDates([dateStr]);
      return;
    }

    if (selectedDates.includes(dateStr)) {
      if (selectedDates.length === 1) {
        toast.error('At least one order date must remain selected');
        return;
      }
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr].sort());
    }
  };

  const handleSelectTomorrowOnly = () => {
    setSelectedDates([tomorrowIso]);
  };

  const handleSelectWorkdays = () => {
    const workdays = upcomingDays
      .filter(d => !d.isWeekend)
      .slice(0, 5)
      .map(d => d.dateStr);
    setIsMultiDateMode(true);
    setSelectedDates(workdays);
  };

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const isCancelDisabled = useMemo(() => {
    return selectedDates.some(d => d < todayIso);
  }, [selectedDates]);

  const filteredStaff = useMemo(() => {
    let result = staff;

    const term = deferredSearchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(member => (
        member.full_name?.toLowerCase().includes(term) ||
        member.username?.toLowerCase().includes(term) ||
        member.branch?.toLowerCase().includes(term)
      ));
    }

    if (statusFilter && selectedDates.length === 1) {
      result = result.filter(member => {
        const memberId = member._id || member.id;
        const currentStatus = orderStatuses[memberId] || 'not_ordered';
        return currentStatus === statusFilter;
      });
    }

    return result;
  }, [staff, deferredSearchTerm, statusFilter, orderStatuses, selectedDates.length]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset page when search or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, statusFilter, selectedDates.length]);

  const totalItems = filteredStaff.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const clampedPage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedStaff = useMemo(() => {
    const startIndex = (clampedPage - 1) * pageSize;
    return filteredStaff.slice(startIndex, startIndex + pageSize);
  }, [filteredStaff, clampedPage, pageSize]);

  const updateSelectedBranch = useCallback((memberId, branch) => {
    setSelectedBranches(current => ({
      ...current,
      [memberId]: branch
    }));
  }, []);

  const executeManualOrder = useCallback(async (member, targetStatus, overrideStandby = false) => {
    const memberId = member._id || member.id;
    const branch = selectedBranches[memberId] || member.branch || 'City Mall';

    setSavingId(`${memberId}-${targetStatus}`);
    try {
      await api.post('/api/reports/manual-order', {
        userId: memberId,
        orderDates: selectedDates,
        status: targetStatus,
        branch,
        overrideStandby
      });

      const dateCountLabel = selectedDates.length > 1 ? ` for ${selectedDates.length} dates` : '';
      toast.success(
        targetStatus === 'ordered' 
          ? `Manual order saved${dateCountLabel}` 
          : targetStatus === 'cancelled' 
            ? `Manual cancel saved${dateCountLabel}` 
            : `Manual order cleared${dateCountLabel}`
      );

      fetchStaff();
      if (selectedDates.length === 1) {
        fetchOrderStatuses(selectedDates[0]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save manual order');
    } finally {
      setSavingId('');
    }
  }, [selectedBranches, selectedDates]);

  const saveManualOrder = useCallback((member, targetStatus) => {
    if (targetStatus === 'cancelled' && isCancelDisabled) {
      toast.error('Cancellation is not allowed for past dates');
      return;
    }

    // Check if any date in selectedDates is a Public Holiday
    if (targetStatus === 'ordered') {
      const holidayDates = selectedDates.filter(d => holidaysMap[d]);
      if (holidayDates.length > 0 && !member.is_standby) {
        const holidayList = holidayDates
          .map(d => `• ${d}: ${holidaysMap[d].name}`)
          .join('\n');

        setConfirmModal({
          isOpen: true,
          title: 'Standby Permission Notice',
          message: `Staff "${member.full_name}" is NOT designated as Standby duty.\n\nThe following selected date(s) are registered Public Holidays:\n${holidayList}\n\nDo you want to proceed and override to place this order anyway?`,
          variant: 'warning',
          confirmText: 'Override & Order',
          onConfirm: async () => {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            await executeManualOrder(member, targetStatus, true);
          }
        });
        return;
      }
    }

    executeManualOrder(member, targetStatus, false);
  }, [isCancelDisabled, selectedDates, holidaysMap, executeManualOrder]);

  const handleDateRangeApply = ({ startDate, endDate, dates }) => {
    if (!dates || dates.length === 0) {
      toast.error('No valid dates found in selected range');
      return;
    }
    setRangeStart(startDate);
    setRangeEnd(endDate);
    setIsMultiDateMode(true);
    setSelectedDates(dates);
    toast.success(`Selected ${dates.length} dates (${startDate} → ${endDate})`);
  };

  const handleRemoveDate = (dateStr) => {
    if (selectedDates.length <= 1) {
      toast.error('At least one order date must remain selected');
      return;
    }
    setSelectedDates(prev => prev.filter(d => d !== dateStr));
  };

  const executeBulkAction = async (targetStatus) => {
    setBulkSaving(true);
    let successCount = 0;
    try {
      const chunkSize = 5;
      for (let i = 0; i < filteredStaff.length; i += chunkSize) {
        const chunk = filteredStaff.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (member) => {
            const memberId = member._id || member.id;
            const branch = selectedBranches[memberId] || member.branch || 'City Mall';
            await api.post('/api/reports/manual-order', {
              userId: memberId,
              orderDates: selectedDates,
              status: targetStatus,
              branch,
              overrideStandby: false
            });
            successCount++;
          })
        );
      }
      toast.success(`Bulk ${targetStatus} completed for ${successCount} staff across ${selectedDates.length} dates!`);
      setSelectedDates([tomorrowIso]);
      setIsMultiDateMode(false);
      fetchStaff();
      if (selectedDates.length === 1) {
        fetchOrderStatuses(selectedDates[0]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed during bulk order process');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkAction = (targetStatus) => {
    if (filteredStaff.length === 0 || selectedDates.length === 0) return;

    if (targetStatus === 'cancelled' && selectedDates.some(d => d < todayIso)) {
      toast.error('Cancellation is not allowed for past dates');
      return;
    }

    const actionWord = targetStatus === 'ordered' ? 'place orders for' : targetStatus === 'cancelled' ? 'cancel orders for' : 'clear orders for';
    setConfirmModal({
      isOpen: true,
      title: `Bulk ${targetStatus === 'ordered' ? 'Order' : targetStatus === 'cancelled' ? 'Cancel' : 'Clear'} Confirmation`,
      message: `Are you sure you want to ${actionWord} ${filteredStaff.length} staff member(s) across ${selectedDates.length} selected date(s)?`,
      variant: targetStatus === 'cancelled' ? 'danger' : 'primary',
      confirmText: `Confirm Bulk ${targetStatus === 'ordered' ? 'Order' : targetStatus === 'cancelled' ? 'Cancel' : 'Clear'}`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await executeBulkAction(targetStatus);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Manual Staff Order</h2>
          <p className="text-slate-500 text-xs sm:text-sm">Place, cancel, or clear lunch orders for single or multiple dates with holiday and standby awareness</p>
        </div>
      </div>

      {/* Multi-Date Horizon Selector Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl text-white bg-primary-600 shadow-sm shadow-primary-600/20">
              <Calendar size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Order Date Horizon</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  {selectedDates.length} selected
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select target lunch date(s) or pick a date range for bulk staff ordering
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Segmented Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              <button
                type="button"
                onClick={() => {
                  setIsMultiDateMode(false);
                  if (selectedDates.length > 1) setSelectedDates([selectedDates[0]]);
                }}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer",
                  !isMultiDateMode
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm font-bold"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Single Date
              </button>
              <button
                type="button"
                onClick={() => setIsMultiDateMode(true)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer",
                  isMultiDateMode
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm font-bold"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Multi-Date
              </button>
            </div>

            <button
              type="button"
              onClick={handleSelectTomorrowOnly}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={handleSelectWorkdays}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles size={12} className="text-amber-500" />
              <span>5 Workdays</span>
            </button>

            {/* Quick Date Range Launcher */}
            <SelectDateRange
              startDate={rangeStart}
              endDate={rangeEnd}
              onApply={handleDateRangeApply}
              min={tomorrowIso}
              align="right"
              className="w-auto"
            />
          </div>
        </div>

        {/* Date Horizon Pills (Balanced 7-Day Grid) */}
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
            {upcomingDays.map((day) => {
              const isSelected = selectedDates.includes(day.dateStr);
              const isHoliday = !!day.holiday;

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => toggleDateSelection(day.dateStr)}
                  className={cn(
                    "p-2.5 sm:p-3 rounded-xl text-left border transition-all cursor-pointer relative flex flex-col justify-between min-h-[72px] sm:min-h-[82px]",
                    isSelected
                      ? "border-primary-500 dark:border-primary-400 bg-primary-50/80 dark:bg-primary-950/70 ring-1 ring-primary-500/40 dark:ring-primary-400/40 shadow-sm shadow-primary-500/10"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs",
                    isHoliday && !isSelected && "border-amber-500/30 dark:border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 hover:border-amber-500/50"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      isSelected ? "text-primary-600 dark:text-primary-400" : "text-slate-400 dark:text-slate-500"
                    )}>
                      {day.dayName}
                    </span>
                    {isSelected ? (
                      <CheckCircle size={15} className="text-primary-600 dark:text-primary-400" />
                    ) : isHoliday ? (
                      <Palmtree size={13} className="text-amber-500 shrink-0" title={day.holiday.name} />
                    ) : null}
                  </div>

                  <div className="my-1">
                    <span className={cn(
                      "text-sm sm:text-base font-extrabold",
                      isSelected ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-200"
                    )}>
                      {day.formattedDate}
                    </span>
                  </div>

                  <div className="min-h-[16px]">
                    {isHoliday ? (
                      <span
                        className="text-[10px] font-bold text-amber-600 dark:text-amber-400 truncate flex items-center justify-center gap-1 leading-tight"
                        title={day.holiday.name}
                      >
                        <Palmtree size={11} className="shrink-0" />
                        <span className="truncate">{day.holiday.name.split('(')[0].trim()}</span>
                      </span>
                    ) : day.isWeekend ? (
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block">
                        Weekend
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400/60 dark:text-slate-500/60 block">
                        Working Day
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Summary & Custom Date Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1">
              Target ({selectedDates.length}):
            </span>
            {selectedDates.map(d => {
              const hol = holidaysMap[d];
              return (
                <span
                  key={d}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold text-xs transition group",
                    hol
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                      : "bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {hol ? <Palmtree size={12} className="shrink-0 text-amber-700 dark:text-amber-300" /> : <Calendar size={12} className="shrink-0 text-primary-600 dark:text-primary-400" />}
                    <span>{d} {hol ? `(${hol.name.split('(')[0].trim()})` : ''}</span>
                  </span>
                  {selectedDates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDate(d)}
                      className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded transition cursor-pointer p-0.5"
                      title="Deselect this date"
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">Single:</span>
              <SelectDate
                value={selectedDates[0] || tomorrowIso}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDates([e.target.value]);
                  }
                }}
                align="right"
                className="w-36 sm:w-40"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">Range:</span>
              <SelectDateRange
                startDate={rangeStart}
                endDate={rangeEnd}
                onApply={handleDateRangeApply}
                min={tomorrowIso}
                align="right"
                className="w-44 sm:w-52"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Date Bulk Action Banner (Shown when multiple dates are selected) */}
      {selectedDates.length > 1 && (
        <div className="p-4 bg-gradient-to-r from-primary-50 via-primary-50/80 to-indigo-50/50 dark:from-primary-950/40 dark:via-primary-950/30 dark:to-slate-900 border border-primary-200/80 dark:border-primary-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-600 text-white shadow-sm shadow-primary-600/20">
              <Layers size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  Multi-Date Mode Active ({selectedDates.length} Dates)
                </h4>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
                  {selectedDates[0]} → {selectedDates[selectedDates.length - 1]}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Table buttons apply to all {selectedDates.length} dates. Use bulk buttons to process all {filteredStaff.length} filtered staff at once.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            <button
              type="button"
              disabled={bulkSaving || filteredStaff.length === 0}
              onClick={() => handleBulkAction('ordered')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-sm shadow-primary-600/20 transition cursor-pointer disabled:opacity-50"
            >
              <CheckCircle size={14} />
              <span>{bulkSaving ? 'Saving...' : `Bulk Order All (${filteredStaff.length})`}</span>
            </button>
            <button
              type="button"
              disabled={bulkSaving || filteredStaff.length === 0 || isCancelDisabled}
              onClick={() => handleBulkAction('cancelled')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-600/20 transition cursor-pointer disabled:opacity-50"
              title={isCancelDisabled ? 'Cannot cancel past dates' : 'Cancel for all filtered staff'}
            >
              <XCircle size={14} />
              <span>Bulk Cancel All ({filteredStaff.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-end">
        <div className="space-y-1 w-full">
          <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
            <Utensils size={12} />
            Status (Single Date View)
          </label>
          <SearchSelect
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'ordered', label: 'Ordered' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'not_ordered', label: 'Not Ordered' }
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="All Statuses"
            hasSearch={false}
            className="w-full"
            disabled={selectedDates.length > 1}
          />
        </div>

        <div className="space-y-1 w-full sm:col-span-2 lg:col-span-2">
          <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
            <Search size={12} />
            Search Staff
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border-none focus:ring-2 focus:ring-primary-500 transition text-slate-800 dark:text-slate-200"
              placeholder="Search name, username, branch, or standby..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Staff Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Staff Name</th>
                <th className="px-6 py-4 font-semibold">Username</th>
                <th className="px-6 py-4 font-semibold">Branch</th>
                <th className="px-6 py-4 font-semibold text-center">Duty Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  [1, 2, 3].map(item => (
                    <tr key={`loading-${item}`} className="animate-pulse">
                      <td colSpan="6" className="px-6 py-4">
                        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded" />
                      </td>
                    </tr>
                  ))
                ) : filteredStaff.length === 0 ? (
                  <tr
                    key="empty"
                    className="motion-preset-fade motion-duration-200"
                  >
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No staff found</td>
                  </tr>
                ) : (
                  paginatedStaff.map(member => {
                    const memberId = member._id || member.id;
                    return (
                      <ManualOrderRow
                        key={memberId}
                        member={member}
                        branch={selectedBranches[memberId] || member.branch || 'City Mall'}
                        currentStatus={orderStatuses[memberId] || 'not_ordered'}
                        isRowSaving={!!savingId && savingId.startsWith(memberId)}
                        isSavingOrder={savingId === `${memberId}-ordered`}
                        isSavingCancel={savingId === `${memberId}-cancelled`}
                        isSavingClear={savingId === `${memberId}-not_ordered`}
                        isMulti={selectedDates.length > 1}
                        selectedDatesLength={selectedDates.length}
                        isCancelDisabled={isCancelDisabled}
                        onBranchChange={updateSelectedBranch}
                        onSaveOrder={saveManualOrder}
                      />
                    );
                  })
                )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            [1, 2, 3].map(item => (
              <div key={`loading-card-${item}`} className="p-4 animate-pulse space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                </div>
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mt-2" />
              </div>
            ))
          ) : filteredStaff.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No staff found</div>
          ) : (
            paginatedStaff.map(member => {
              const memberId = member._id || member.id;
              return (
                <ManualOrderCard
                  key={`card-${memberId}`}
                  member={member}
                  branch={selectedBranches[memberId] || member.branch || 'City Mall'}
                  currentStatus={orderStatuses[memberId] || 'not_ordered'}
                  isRowSaving={!!savingId && savingId.startsWith(memberId)}
                  isSavingOrder={savingId === `${memberId}-ordered`}
                  isSavingCancel={savingId === `${memberId}-cancelled`}
                  isSavingClear={savingId === `${memberId}-not_ordered`}
                  isMulti={selectedDates.length > 1}
                  selectedDatesLength={selectedDates.length}
                  isCancelDisabled={isCancelDisabled}
                  onBranchChange={updateSelectedBranch}
                  onSaveOrder={saveManualOrder}
                />
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {!loading && filteredStaff.length > 0 && (
          <Pagination
            currentPage={clampedPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default ManualOrder;
