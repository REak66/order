import React, { useState, useEffect, useCallback } from 'react';
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
  Phone,
  RefreshCw,
  Loader2,
  CalendarDays,
  Pencil,
  Check,
  X,
  Lock
} from 'lucide-react';

const BRANCH_OPTIONS = ['City Mall', 'BYD 6A', 'BYD 60M'];

const StatusBadge = ({ status }) => {
  const configs = {
    ordered: {
      label: 'Ordered ✓',
      class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50',
      icon: CheckCircle2
    },
    cancelled: {
      label: 'Cancelled',
      class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50',
      icon: XCircle
    },
    not_ordered: {
      label: 'Not Ordered',
      class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50',
      icon: AlertCircle
    }
  };
  const cfg = configs[status] || configs.not_ordered;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${cfg.class}`}>
      <Icon size={16} />
      {cfg.label}
    </span>
  );
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
      
      // Update the user state locally so is_first_login is false
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

  const handleOrder = async () => {
    setActionLoading(true);
    try {
      await api.post('/api/portal/order');
      toast.success('🍱 Lunch ordered successfully!');
      await fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await api.post('/api/portal/cancel');
      toast.success('Order cancelled.');
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
      // Update the stored user info
      const stored = JSON.parse(localStorage.getItem('staffUser') || '{}');
      const updated = { ...stored, branch: selectedBranch };
      localStorage.setItem('staffUser', JSON.stringify(updated));
      // Refresh page data by updating auth context via re-fetch
      toast.success(`Branch updated to ${selectedBranch} ✓`);
      setEditingBranch(false);
      // Reload so auth context re-fetches staff-me
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
  const isWithinWindow = win?.allowed;
  const orderStatus = orderData?.status || 'not_ordered';
  const lunchDate = orderData?.order_date;

  const formattedDate = lunchDate
    ? new Date(lunchDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      })
    : '';

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
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500 rounded-xl text-white shadow-md shadow-primary-500/25">
              <UtensilsCrossed size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">LunchOrder</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Staff Portal</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Welcome Card */}
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-3xl p-6 text-white shadow-xl shadow-primary-600/20 motion-preset-fade motion-duration-200">
            <p className="text-primary-200 text-sm font-medium mb-1">Welcome back 👋</p>
            <h2 className="text-2xl font-bold mb-4 leading-tight">
              {user?.full_name || 'Staff Member'}
            </h2>

            <div className="flex flex-wrap gap-3 items-center">
              {/* Branch — editable */}
              {!editingBranch ? (
                <button
                  onClick={() => { setSelectedBranch(user?.branch || 'City Mall'); setEditingBranch(true); }}
                  className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-xl px-3 py-1.5 text-sm font-medium transition-all group"
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
                  {/* Confirm */}
                  <button
                    onClick={handleSaveBranch}
                    disabled={branchSaving}
                    className="p-1 bg-white/20 hover:bg-white/35 rounded-lg transition-colors"
                    title="Save"
                  >
                    {branchSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  </button>
                  {/* Cancel */}
                  <button
                    onClick={() => setEditingBranch(false)}
                    className="p-1 bg-white/10 hover:bg-white/25 rounded-lg transition-colors"
                    title="Cancel"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Phone */}
              {user?.phone_number && (
                <div className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5 text-sm font-medium">
                  <Phone size={14} />
                  {user.phone_number}
                </div>
              )}
            </div>
          </div>

          {/* Time Window Info */}
          <div className={`rounded-2xl p-4 border flex items-center justify-between gap-4 motion-preset-fade motion-duration-200 ${
            isWithinWindow
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isWithinWindow ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-amber-100 dark:bg-amber-900/40'}`}>
                <Clock size={20} className={isWithinWindow ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${isWithinWindow ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
                  {isWithinWindow ? '✅ Ordering is Open' : '⏸ Ordering is Closed'}
                </p>
                {win && (
                  <p className={`text-xs mt-0.5 ${isWithinWindow ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    Allowed window: <strong>{win.startTime}</strong> – <strong>{win.endTime}</strong>
                  </p>
                )}
              </div>
            </div>
            <div className={`text-right text-sm font-semibold tabular-nums ${isWithinWindow ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
              <LiveClock />
            </div>
          </div>

          {/* Order Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden motion-preset-fade motion-duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-primary-500" />
                  <h3 className="font-bold text-slate-800 dark:text-white">Tomorrow's Lunch</h3>
                </div>
                <button
                  onClick={() => { setLoading(true); fetchOrder(); }}
                  className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              {formattedDate && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-7">{formattedDate}</p>
              )}
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 size={32} className="animate-spin text-primary-500" />
                  <p className="text-slate-500 text-sm">Loading order status...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Your status</span>
                    <StatusBadge status={orderStatus} />
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {!isWithinWindow && (
                      <div className="flex items-start gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          Actions are disabled outside the ordering window ({win?.startTime} – {win?.endTime}). Please try again within that time.
                        </p>
                      </div>
                    )}

                    {/* Order Button */}
                    <button
                      onClick={handleOrder}
                      disabled={!isWithinWindow || actionLoading || orderStatus === 'ordered'}
                      className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2
                        ${isWithinWindow && orderStatus !== 'ordered'
                          ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                    >
                      {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                      {orderStatus === 'ordered' ? 'Already Ordered' : 'Order Lunch'}
                    </button>

                    {/* Cancel Button */}
                    <button
                      onClick={handleCancel}
                      disabled={!isWithinWindow || actionLoading || orderStatus !== 'ordered'}
                      className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2
                        ${isWithinWindow && orderStatus === 'ordered'
                          ? 'border-2 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer hover:scale-[1.01] active:scale-[0.98]'
                          : 'border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                        }`}
                    >
                      {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                      Cancel Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-600 pb-4">
            Order status auto-refreshes every minute. Tap the branch to change it.
          </p>
        </div>
      </main>
    </div>
  );
};

export default StaffPortal;
