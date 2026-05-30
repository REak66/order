import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Save,
  MessageSquare,
  Clock,
  Lock,
  KeyRound
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import SearchSelect from '../components/SearchSelect';
import TimePicker from '../components/TimePicker';

const normalizeTimeValue = (value) => {
  if (!value) return '';
  const match = String(value).match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
};

const Settings = () => {
  const { admin } = useAuth();
  const [settings, setSettings] = useState({
    bot_token: '',
    group_id: '',
    order_start_time: '',
    order_end_time: '',
    report_time: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    targetUserKey: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    fetchSettings();
    fetchAccounts();
  }, [admin]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/settings');
      setSettings((current) => ({
        ...current,
        ...res.data,
        order_start_time: normalizeTimeValue(res.data.order_start_time),
        order_end_time: normalizeTimeValue(res.data.order_end_time),
        report_time: normalizeTimeValue(res.data.report_time)
      }));
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const [adminsRes, staffRes] = await Promise.all([
        api.get('/api/auth/admins'),
        api.get('/api/staff')
      ]);

      const adminOpts = adminsRes.data.map(a => ({
        value: `admin-${a._id || a.id}`,
        label: `🔑 Admin: ${a.username}`,
        rawId: a._id || a.id,
        type: 'admin'
      }));

      const staffOpts = staffRes.data.map(s => ({
        value: `staff-${s._id || s.id}`,
        label: `👤 Staff: ${s.full_name} (${s.username || ''})`,
        rawId: s._id || s.id,
        type: 'staff'
      }));

      const combined = [...adminOpts, ...staffOpts];
      setAccounts(combined);

      if (admin) {
        const currentAdminId = admin.id || admin._id;
        const selfOpt = adminOpts.find(o => o.rawId === currentAdminId);
        if (selfOpt) {
          setPasswordForm(prev => ({
            ...prev,
            targetUserKey: selfOpt.value
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/settings', settings);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    const selectedAcc = accounts.find(a => a.value === passwordForm.targetUserKey);
    const targetUserId = selectedAcc ? selectedAcc.rawId : (admin?.id || admin?._id);
    const targetType = selectedAcc ? selectedAcc.type : 'admin';

    setChangingPassword(true);
    try {
      await api.post('/api/auth/change-password', {
        targetUserId,
        targetType,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password updated successfully');
      setPasswordForm(prev => ({
        ...prev,
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update password';
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-6">
    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
  </div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">System Settings</h2>
        <p className="text-slate-500 text-xs sm:text-sm">Configure Telegram bot and system-wide parameters</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 motion-preset-fade motion-duration-200"
      >
        {/* Telegram Config */}
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <MessageSquare className="text-primary-500" size={20} />
            <h3 className="font-bold text-slate-800 dark:text-white">Telegram Configuration</h3>
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bot Token</label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition text-slate-800 dark:text-slate-200"
                  placeholder="Enter your bot token"
                  value={settings.bot_token}
                  onChange={(e) => setSettings({ ...settings, bot_token: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Group ID</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition text-slate-800 dark:text-slate-200"
                  placeholder="-100xxxxxxxxx"
                  value={settings.group_id}
                  onChange={(e) => setSettings({ ...settings, group_id: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Config */}
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Clock className="text-primary-500" size={20} />
            <h3 className="font-bold text-slate-800 dark:text-white">Schedule Settings</h3>
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Order Start Time</label>
                <TimePicker
                  value={settings.order_start_time}
                  onChange={(e) => setSettings({ ...settings, order_start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Order End Time</label>
                <TimePicker
                  value={settings.order_end_time}
                  onChange={(e) => setSettings({ ...settings, order_end_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Report Send Time</label>
                <TimePicker
                  value={settings.report_time}
                  onChange={(e) => setSettings({ ...settings, report_time: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-600/20 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto justify-center"
          >
            {saving ? 'Saving...' : (
              <>
                <Save size={20} />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Reset User / Admin Password Card */}
      <form
        onSubmit={handlePasswordSubmit}
        className="space-y-6 motion-preset-fade motion-duration-200 pt-4"
      >
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Lock className="text-rose-500" size={20} />
            <h3 className="font-bold text-slate-800 dark:text-white">Reset User / Admin Password</h3>
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            {/* User Select Row */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select User Account</label>
                <SearchSelect
                  options={accounts}
                  value={passwordForm.targetUserKey}
                  onChange={(e) => setPasswordForm({ ...passwordForm, targetUserKey: e.target.value })}
                  placeholder="Select Admin or Staff user..."
                  hasSearch={true}
                  className="w-full font-semibold"
                />
              </div>
            </div>

            {/* Passwords Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-rose-500 transition text-slate-800 dark:text-slate-200"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-rose-500 transition text-slate-800 dark:text-slate-200"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={changingPassword}
            className="flex items-center gap-2 px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto justify-center"
          >
            {changingPassword ? 'Resetting...' : (
              <>
                <KeyRound size={20} />
                <span>Reset User Password</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
