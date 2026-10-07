import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LogOut,
  MapPin,
  RefreshCw,
  Loader2,
  CalendarDays,
  Calendar,
  Pencil,
  Check,
  X,
  Lock,
  Sparkles,
  Shield,
  CheckSquare,
  Square,
  Palmtree
} from 'lucide-react';
import { cn } from '../utils/cx';
import ThemeToggle from '../components/ThemeToggle';
import StatusBadge from '../components/StatusBadge';

const BRANCH_OPTIONS = ['City Mall', 'BYD 6A', 'BYD 60M'];

// Helper: check if current local time is within start–end window
const isTimeWithinWindow = (startTime, endTime) => {
  if (!startTime || !endTime) return true; // fallback: assume open if no window info
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="font-mono tabular-nums">
      {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
    </span>
  );
};

const StaffPortal = () => {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Multi-date selection state
  const [selectedDates, setSelectedDates] = useState([]);
  const [isMultiDateMode, setIsMultiDateMode] = useState(false);
  const isInitialLoad = useRef(true);

  // Branch editing state
  const [editingBranch, setEditingBranch] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(user?.branch || 'City Mall');
  const [branchSaving, setBranchSaving] = useState(false);

  // Forced password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePwdLoading, setChangePwdLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast.error('Password must be at least 4 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setChangePwdLoading(true);
    try {
      await api.put('/api/portal/change-password', { password: newPassword });
      toast.success('Password changed successfully! Welcome to your portal.');
      setUser(prev => ({ ...prev, is_first_login: false }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangePwdLoading(false);
    }
  };

  const fetchOrder = useCallback(async () => {
    try {
      const res = await api.get('/api/portal/my-order');
      setOrderData(res.data);
      // Initialize selected date on initial mount only
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        if (res.data?.order_date) {
          setSelectedDates([res.data.order_date]);
        }
      }
    } catch (err) {
      toast.error('Failed to load order info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 60000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  // Keep selectedBranch in sync with user
  useEffect(() => {
    if (user?.branch) setSelectedBranch(user.branch);
  }, [user?.branch]);

  const horizonDays = useMemo(() => {
    return orderData?.horizon || [];
  }, [orderData?.horizon]);

  // Toggle or select date in horizon
  const toggleDateSelection = (dateStr) => {
    if (!isMultiDateMode) {
      setSelectedDates([dateStr]);
      return;
    }

    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr].sort());
    }
  };

  const handleSelectTomorrow = () => {
    if (orderData?.order_date) {
      setSelectedDates([orderData.order_date]);
    }
  };

  const handleSelectWorkdays = () => {
    if (!horizonDays.length) return;
    const workdays = horizonDays
      .filter(d => !d.isWeekend && (!d.holiday || user?.is_standby))
      .slice(0, 5)
      .map(d => d.date);

    if (workdays.length > 0) {
      setIsMultiDateMode(true);
      setSelectedDates(workdays);
      toast.success(`Selected ${workdays.length} upcoming working days`);
    }
  };

  // Selected days analysis
  const selectedHorizonDays = useMemo(() => {
    return horizonDays.filter(h => selectedDates.includes(h.date));
  }, [horizonDays, selectedDates]);

  const countOrdered = selectedHorizonDays.filter(h => h.status === 'ordered').length;
  const countNotOrdered = selectedHorizonDays.filter(h => h.status !== 'ordered').length;
  const countIneligible = selectedHorizonDays.filter(h => !h.eligibility?.eligible).length;

  const handleOrder = async () => {
    const tomorrowDate = orderData?.order_date || horizonDays[0]?.date;
    const datesToOrder = isMultiDateMode
      ? selectedHorizonDays.filter(h => h.status !== 'ordered' && h.eligibility?.eligible).map(h => h.date)
      : (tomorrowDate ? [tomorrowDate] : []);

    if (datesToOrder.length === 0) {
      toast.error(isMultiDateMode
        ? 'All selected dates are already ordered or ineligible'
        : 'Tomorrow is already ordered or not eligible');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post('/api/portal/order', { order_dates: datesToOrder });
      toast.success(res.data?.message || 'Lunch ordered successfully!');
      if (isMultiDateMode) {
        setSelectedDates([]);
      }
      await fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const tomorrowDate = orderData?.order_date || horizonDays[0]?.date;
    const datesToCancel = isMultiDateMode
      ? selectedHorizonDays.filter(h => h.status === 'ordered').map(h => h.date)
      : (tomorrowDate ? [tomorrowDate] : []);

    if (datesToCancel.length === 0) {
      toast.error(isMultiDateMode
        ? 'None of the selected dates have active orders to cancel'
        : 'Tomorrow does not have an active order to cancel');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post('/api/portal/cancel', { order_dates: datesToCancel });
      toast.success(res.data?.message || 'Order cancelled.');
      if (isMultiDateMode) {
        setSelectedDates([]);
      }
      await fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveBranch = async () => {
    if (selectedBranch === user?.branch) {
      setEditingBranch(false);
      return;
    }
    setBranchSaving(true);
    try {
      await api.patch('/api/portal/branch', { branch: selectedBranch });
      const stored = JSON.parse(localStorage.getItem('staffUser') || '{}');
      const updated = { ...stored, branch: selectedBranch };
      localStorage.setItem('staffUser', JSON.stringify(updated));
      toast.success(`Branch updated to ${selectedBranch}`);
      setEditingBranch(false);
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update branch');
    } finally {
      setBranchSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const win = orderData?.window;
  const [liveWithinWindow, setLiveWithinWindow] = useState(win?.allowed ?? false);
  useEffect(() => {
    if (!win) return;
    const checkWindow = () => {
      const allowed = isTimeWithinWindow(win.startTime, win.endTime);
      setLiveWithinWindow(prev => (prev !== allowed ? allowed : prev));
    };
    checkWindow();
    const timer = setInterval(checkWindow, 15000);
    return () => clearInterval(timer);
  }, [win?.startTime, win?.endTime]);

  const isWithinWindow = liveWithinWindow;

  // Single date primary display: strictly tomorrow when !isMultiDateMode
  const tomorrowDay = horizonDays.find(h => h.date === orderData?.order_date) || horizonDays[0] || null;
  const singleActiveDay = isMultiDateMode ? (selectedHorizonDays[0] || tomorrowDay) : tomorrowDay;
  const singleDateStatus = singleActiveDay?.status || orderData?.status || 'not_ordered';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Forced Password Change Modal */}
      {user?.is_first_login && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center text-center motion-preset-fade motion-duration-300">
            <div className="p-4 bg-primary-500 rounded-2xl text-white shadow-lg shadow-primary-500/30 mb-4 animate-bounce">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Change Your Password</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              For security reasons, you must change your default password upon first login.
            </p>
            <form onSubmit={handleChangePassword} className="w-full text-left space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-slate-200"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-slate-200"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={changePwdLoading}
                className="w-full mt-2 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                {changePwdLoading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-xs transition-colors">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-600 rounded-xl text-white shadow-md shadow-primary-500/25">
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">LunchOrder</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Staff Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-semibold cursor-pointer"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-3.5 sm:p-6 pb-28 sm:pb-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5">

          {/* Welcome Card */}
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl shadow-primary-600/20 motion-preset-fade motion-duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div>
                <p className="text-primary-200 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Welcome back</p>
                <h2 className="text-lg sm:text-2xl font-bold leading-tight">
                  {user?.full_name || 'Staff Member'}
                </h2>
              </div>

              {/* Standby Status Pill */}
              {user?.is_standby && (
                <div className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold">
                  <Shield size={13} className="text-amber-300" />
                  <span>Standby Staff (Holidays Unlocked)</span>
                </div>
              )}
            </div>

            <div className="mt-3 sm:mt-4 flex flex-wrap gap-2.5 sm:gap-3 items-center">
              {/* Branch — editable */}
              {!editingBranch ? (
                <button
                  onClick={() => { setSelectedBranch(user?.branch || 'City Mall'); setEditingBranch(true); }}
                  className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-xl px-3 py-1.5 text-sm font-medium transition-all group cursor-pointer"
                  title="Change branch"
                >
                  <MapPin size={14} />
                  {user?.branch || '—'}
                  <Pencil size={12} className="opacity-60 group-hover:opacity-100 transition-opacity ml-0.5" />
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-1.5">
                  <MapPin size={14} className="shrink-0" />
                  <select
                    className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    autoFocus
                  >
                    {BRANCH_OPTIONS.map(b => (
                      <option key={b} value={b} className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800">
                        {b}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveBranch}
                    disabled={branchSaving}
                    className="p-1 bg-white/20 hover:bg-white/35 rounded-lg transition-colors cursor-pointer"
                    title="Save"
                  >
                    {branchSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  </button>
                  <button
                    onClick={() => setEditingBranch(false)}
                    className="p-1 bg-white/10 hover:bg-white/25 rounded-lg transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Time Window Info Banner */}
          <div className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border flex items-center justify-between gap-2.5 sm:gap-4 motion-preset-fade motion-duration-200 ${
            isWithinWindow
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
          }`}>
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className={`p-1.5 sm:p-2 rounded-xl shrink-0 ${isWithinWindow ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-amber-100 dark:bg-amber-900/40'}`}>
                <Clock size={18} className={isWithinWindow ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs sm:text-sm font-semibold truncate ${isWithinWindow ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
                  {isWithinWindow ? 'Ordering is Open' : 'Ordering is Closed'}
                </p>
                {win && (
                  <p className={`text-[11px] sm:text-xs mt-0.5 truncate ${isWithinWindow ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    Allowed window: <strong>{win.startTime}</strong> – <strong>{win.endTime}</strong>
                  </p>
                )}
              </div>
            </div>
            <div className={`text-right text-xs sm:text-sm font-semibold tabular-nums shrink-0 ${isWithinWindow ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
              <LiveClock />
            </div>
          </div>

          {/* Multi-Date Horizon Selector Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden motion-preset-fade motion-duration-200">
            <div className={cn("p-3.5 sm:p-5 space-y-3", isMultiDateMode && "border-b border-slate-100 dark:border-slate-800")}>
              {/* Card Header Top Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="p-2 sm:p-2.5 rounded-xl text-white bg-primary-600 shadow-sm shadow-primary-600/20 shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white">Order Date Horizon</h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/50">
                        {isMultiDateMode
                          ? `${selectedDates.length} ${selectedDates.length === 1 ? 'day' : 'days'} selected`
                          : 'Tomorrow Only'}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden xs:block">
                      {isMultiDateMode
                        ? 'Choose single or multiple dates within the ordering horizon'
                        : 'Single Date mode orders for tomorrow only. Switch to Multi-Date to select multiple dates.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setLoading(true); fetchOrder(); }}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors shrink-0"
                  title="Refresh status"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Mode Toggle & Quick Helpers Sub-Row */}
              <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:justify-between pt-0.5">
                {/* Segmented Mode Toggle */}
                <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMultiDateMode(false);
                      const tomorrowIso = orderData?.order_date || horizonDays[0]?.date;
                      if (tomorrowIso) setSelectedDates([tomorrowIso]);
                    }}
                    className={cn(
                      "flex-1 xs:flex-none px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer",
                      !isMultiDateMode
                        ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    Single Date
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMultiDateMode(true)}
                    className={cn(
                      "flex-1 xs:flex-none px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer",
                      isMultiDateMode
                        ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    Multi-Date
                  </button>
                </div>

                {/* Quick Preset Buttons (only visible in Multi-Date mode) */}
                {isMultiDateMode && (
                  <div className="flex items-center gap-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={handleSelectTomorrow}
                      className="flex-1 xs:flex-none px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer whitespace-nowrap text-center"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectWorkdays}
                      className="flex-1 xs:flex-none px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <Sparkles size={12} className="text-amber-500" />
                      <span>5 Workdays</span>
                    </button>
                    {selectedDates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDates([])}
                        className="flex-1 xs:flex-none px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer whitespace-nowrap text-center"
                      >
                        Deselect
                      </button>
                    )}
                  </div>
                )}

                {/* Single Date Target Info Indicator */}
                {!isMultiDateMode && tomorrowDay && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                    <CalendarDays size={13} className="text-primary-500 shrink-0" />
                    <span>Target Date: <strong className="text-slate-900 dark:text-white font-bold">{tomorrowDay.formattedDate}</strong> ({tomorrowDay.dayName})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Date Horizon Grid: Shown ONLY in Multi-Date mode */}
            {isMultiDateMode && (
              <div className="p-4 sm:p-6">
                {loading && !orderData ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 size={32} className="animate-spin text-primary-500" />
                    <p className="text-slate-500 text-sm">Loading upcoming order horizon...</p>
                  </div>
                ) : horizonDays.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500 dark:text-slate-400 gap-2">
                    <Calendar size={28} className="text-slate-400" />
                    <p className="text-sm font-medium">No orderable dates available.</p>
                    <button
                      type="button"
                      onClick={() => { setLoading(true); fetchOrder(); }}
                      className="mt-1 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      Refresh Horizon
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
                    {horizonDays.map((day) => {
                      const isSelected = selectedDates.includes(day.date);
                      const isHoliday = !!day.holiday;
                      const isEligible = day.eligibility?.eligible;
                      const status = day.status;

                      return (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => toggleDateSelection(day.date)}
                          className={cn(
                            "p-3 rounded-2xl text-left border transition-all cursor-pointer relative flex flex-col justify-between min-h-[96px]",
                            isSelected
                              ? "border-primary-500 dark:border-primary-400 bg-primary-50/80 dark:bg-primary-950/70 ring-2 ring-primary-500/40 dark:ring-primary-400/40 shadow-sm shadow-primary-500/10"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs",
                            isHoliday && !isSelected && "border-amber-300 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 hover:border-amber-400",
                            !isEligible && "opacity-75"
                          )}
                        >
                          {/* Top: Day and checkbox indicator */}
                          <div className="flex items-center justify-between w-full">
                            <span className={cn(
                              "text-xs font-bold uppercase tracking-wider",
                              isSelected ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"
                            )}>
                              {day.dayName}
                            </span>
                            {isMultiDateMode ? (
                              isSelected ? (
                                <CheckSquare size={14} className="text-primary-600 dark:text-primary-400 shrink-0" />
                              ) : (
                                <Square size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
                              )
                            ) : (
                              isSelected && (
                                <span className="w-2 h-2 rounded-full bg-primary-500" />
                              )
                            )}
                          </div>

                          {/* Middle: Date */}
                          <div className="my-1.5">
                            <span className={cn(
                              "text-sm font-extrabold tracking-tight",
                              isSelected ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-200"
                            )}>
                              {day.formattedDate}
                            </span>
                          </div>

                          {/* Bottom: Status Pill / Tag */}
                          <div className="flex flex-col gap-1 w-full">
                            {status === 'ordered' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Ordered
                              </span>
                            ) : status === 'cancelled' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-red-900/40 dark:text-red-300 border border-rose-300 dark:border-red-800/60">
                                Cancelled
                              </span>
                            ) : isHoliday ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 truncate" title={day.holiday?.name}>
                                <Palmtree size={11} className="shrink-0" />
                                <span className="truncate">{day.holiday?.name || 'Holiday'}</span>
                              </span>
                            ) : day.isWeekend ? (
                              <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Weekend
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Not Ordered
                              </span>
                            )}

                            {!isEligible && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                                <Lock size={9} /> Standby only
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Order Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden motion-preset-fade motion-duration-200">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-primary-500" />
                  <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white">
                    {isMultiDateMode
                      ? `Selected Dates (${selectedDates.length})`
                      : singleActiveDay?.fullFormattedDate || "Tomorrow's Lunch"}
                  </h3>
                </div>
                {!isMultiDateMode && (
                  <StatusBadge status={singleDateStatus} />
                )}
              </div>

              {isMultiDateMode && (
                <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2 items-center text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Selection:</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-semibold text-[11px]">
                    {countOrdered} Ordered
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-semibold text-[11px]">
                    {countNotOrdered} Not Ordered
                  </span>
                  {countIneligible > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-semibold text-[11px]">
                      {countIneligible} Ineligible
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                {/* Notice for Ineligible or Holiday Dates */}
                {!isMultiDateMode && singleActiveDay?.holiday && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        {singleActiveDay.holiday.name} (Public Holiday)
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        {user?.is_standby
                          ? 'You are on Standby duty and can order lunch on this holiday.'
                          : 'Orders on public holidays are reserved strictly for Standby staff.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Ordering Window Notice */}
                {!isWithinWindow && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                    <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Actions are disabled outside the ordering window ({win?.startTime || '07:00'} – {win?.endTime || '16:00'}). Please try again within that time.
                    </p>
                  </div>
                )}

                {/* Action Buttons: Visible on sm: and above (tablet/desktop) */}
                <div className="hidden sm:block space-y-3">
                  {/* Order Button */}
                  <button
                    onClick={handleOrder}
                    disabled={
                      !isWithinWindow ||
                      actionLoading ||
                      (!isMultiDateMode && (singleDateStatus === 'ordered' || !singleActiveDay?.eligibility?.eligible)) ||
                      (isMultiDateMode && countNotOrdered === 0)
                    }
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                      isWithinWindow &&
                        ((!isMultiDateMode && singleDateStatus !== 'ordered' && singleActiveDay?.eligibility?.eligible) ||
                         (isMultiDateMode && countNotOrdered > 0))
                        ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    )}
                  >
                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    {isMultiDateMode
                      ? `Order Lunch for Selected Dates (${countNotOrdered})`
                      : singleDateStatus === 'ordered'
                        ? 'Already Ordered'
                        : !singleActiveDay?.eligibility?.eligible
                          ? 'Date Ineligible to Order'
                          : 'Order Lunch'}
                  </button>

                  {/* Cancel Button */}
                  <button
                    onClick={handleCancel}
                    disabled={
                      !isWithinWindow ||
                      actionLoading ||
                      (!isMultiDateMode && singleDateStatus !== 'ordered') ||
                      (isMultiDateMode && countOrdered === 0)
                    }
                    className={cn(
                      "w-full py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
                      isWithinWindow &&
                        ((!isMultiDateMode && singleDateStatus === 'ordered') ||
                         (isMultiDateMode && countOrdered > 0))
                        ? 'border-2 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                        : 'border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    )}
                  >
                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                    {isMultiDateMode
                      ? `Cancel Active Orders (${countOrdered})`
                      : 'Cancel Order'}
                  </button>
                </div>

                {/* Mobile In-Card Status Note */}
                <div className="sm:hidden p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0",
                      singleDateStatus === 'ordered' ? 'bg-emerald-500' : 'bg-primary-500 animate-pulse'
                    )} />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {isMultiDateMode
                        ? `${countNotOrdered} pending · ${countOrdered} ordered`
                        : singleDateStatus === 'ordered'
                          ? 'Lunch is ordered for this day'
                          : 'Ready to order'}
                    </span>
                  </div>
                  <span className="text-xs text-primary-600 dark:text-primary-400 font-bold shrink-0 flex items-center gap-1">
                    Use bar below ↓
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-600 pb-4">
            Order status auto-refreshes every minute. Tap the branch to change it.
          </p>
        </div>
      </main>

      {/* Floating Bottom Action Bar for Mobile Screens */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 py-3 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.12)] transition-colors">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
              {isMultiDateMode
                ? `${selectedDates.length} ${selectedDates.length === 1 ? 'day' : 'days'} selected`
                : singleActiveDay?.formattedDate || 'Tomorrow'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn(
                "w-2 h-2 rounded-full shrink-0",
                (!isMultiDateMode ? singleDateStatus === 'ordered' : countOrdered > 0) ? 'bg-emerald-500' : 'bg-amber-500'
              )} />
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {isMultiDateMode
                  ? countOrdered > 0 ? `${countOrdered} ordered` : 'Not Ordered'
                  : singleDateStatus === 'ordered' ? 'Ordered' : 'Not Ordered'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile Cancel Button */}
            {((!isMultiDateMode && singleDateStatus === 'ordered') || (isMultiDateMode && countOrdered > 0)) && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={!isWithinWindow || actionLoading}
                className="px-4 py-2.5 rounded-xl border border-rose-300 dark:border-red-800/60 text-rose-600 dark:text-red-400 font-bold text-sm active:scale-95 transition-transform cursor-pointer min-h-[44px]"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : 'Cancel'}
              </button>
            )}

            {/* Mobile Order Button */}
            <button
              type="button"
              onClick={handleOrder}
              disabled={
                !isWithinWindow ||
                actionLoading ||
                (!isMultiDateMode && (singleDateStatus === 'ordered' || !singleActiveDay?.eligibility?.eligible)) ||
                (isMultiDateMode && countNotOrdered === 0)
              }
              className={cn(
                "px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 active:scale-95 transition-all shadow-md cursor-pointer min-h-[44px]",
                isWithinWindow &&
                  ((!isMultiDateMode && singleDateStatus !== 'ordered' && singleActiveDay?.eligibility?.eligible) ||
                   (isMultiDateMode && countNotOrdered > 0))
                  ? "bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/25"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none"
              )}
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              <span>
                {isMultiDateMode
                  ? `Order (${countNotOrdered})`
                  : singleDateStatus === 'ordered'
                    ? 'Ordered'
                    : 'Order Lunch'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffPortal;
