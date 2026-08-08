import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Save,
  MessageSquare,
  Clock,
  Lock,
  KeyRound,
  Send,
  Bell,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sunrise,
  Sun,
  Sunset,
  Sparkles,
  RefreshCw,
  Play
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
    report_time: '',
    supply_bot_token: '',
    supply_group_id: '',
    supply_report_time: '',
    supply_custom_message: '',
    lunch_reminder_enabled: 'false',
    lunch_reminder_time: '15:00',
    lunch_reminder_message_en: '',
    lunch_reminder_message_kh: '',

    // 3 reminder slots (07:00 AM, 12:00 PM, 03:00 PM)
    reminder_07_enabled: 'true',
    reminder_07_time: '07:00',
    reminder_07_message_en: '',
    reminder_07_message_kh: '',

    reminder_12_enabled: 'true',
    reminder_12_time: '12:00',
    reminder_12_message_en: '',
    reminder_12_message_kh: '',

    reminder_15_enabled: 'true',
    reminder_15_time: '15:00',
    reminder_15_message_en: '',
    reminder_15_message_kh: ''
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
  const [activeTab, setActiveTab] = useState('global');

  const tabs = [
    { id: 'global', name: 'Global Settings' },
    { id: 'byd_6a', name: 'BYD 6A' },
    { id: 'city_mall', name: 'City Mall' },
    { id: 'supply', name: 'Supplier' },
    { id: 'reminder', name: 'Reminder' }
  ];

  useEffect(() => {
    fetchSettings();
    fetchAccounts();
  }, [admin]);

  useEffect(() => {
    if (activeTab === 'reminder') {
      fetchReminderLogs(1);
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/settings');
      const normalizedData = {};
      Object.keys(res.data).forEach(key => {
        if (key.endsWith('_time')) {
          normalizedData[key] = normalizeTimeValue(res.data[key]);
        } else {
          normalizedData[key] = res.data[key];
        }
      });
      setSettings((current) => ({
        ...current,
        ...normalizedData
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

  const [sendingReport, setSendingReport] = useState(false);
  const [sendingSupply, setSendingSupply] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [sendingSlot, setSendingSlot] = useState({ '07': false, '12': false, '15': false });
  const [reminderLogs, setReminderLogs] = useState([]);
  const [reminderLogsPage, setReminderLogsPage] = useState(1);
  const [reminderLogsTotalPages, setReminderLogsTotalPages] = useState(1);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const handleSendToSupply = async () => {
    setSendingSupply(true);
    try {
      const res = await api.post('/api/settings/send-to-supply');
      toast.success(res.data.message || 'Supplier order summary sent!');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to send supplier order summary';
      toast.error(msg);
    } finally {
      setSendingSupply(false);
    }
  };

  const handleSendReportNow = async () => {
    if (!window.confirm('Are you sure you want to send the daily report(s) to Telegram now?')) {
      return;
    }
    setSendingReport(true);
    try {
      const res = await api.post('/api/settings/send-now');
      toast.success(res.data.message || 'Daily report(s) sent successfully');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to send daily report(s)';
      toast.error(msg);
    } finally {
      setSendingReport(false);
    }
  };

  const handleSendLunchReminder = async (slotKey = null) => {
    if (slotKey) {
      setSendingSlot(prev => ({ ...prev, [slotKey]: true }));
    } else {
      setSendingReminder(true);
    }
    try {
      const res = await api.post('/api/settings/send-lunch-reminder', { slotKey });
      toast.success(res.data.message || 'Lunch reminder sent!');
      fetchReminderLogs(1);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to send lunch reminder';
      toast.error(msg);
    } finally {
      if (slotKey) {
        setSendingSlot(prev => ({ ...prev, [slotKey]: false }));
      } else {
        setSendingReminder(false);
      }
    }
  };

  const fetchReminderLogs = async (page = 1) => {
    setLoadingLogs(true);
    try {
      const res = await api.get(`/api/settings/reminder-logs?page=${page}&limit=10`);
      setReminderLogs(res.data.logs);
      setReminderLogsPage(res.data.page);
      setReminderLogsTotalPages(res.data.totalPages);
    } catch (error) {
      console.error('Failed to fetch reminder logs:', error);
    } finally {
      setLoadingLogs(false);
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

      {/* Elegant Tab Switcher */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 gap-4 sm:gap-6 overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap outline-none cursor-pointer ${activeTab === tab.id
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
              }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 motion-preset-fade motion-duration-200"
      >
        {activeTab === 'global' && (
          <div className="space-y-8 motion-preset-fade motion-duration-200">
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
          </div>
        )}

        {activeTab !== 'global' && activeTab !== 'supply' && activeTab !== 'reminder' && (
          <div className="space-y-6 motion-preset-fade motion-duration-200">
            {/* Override Toggle */}
            <div className="flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white">
                  Enable custom settings for {activeTab === 'byd_6a' ? 'BYD 6A' : activeTab === 'city_mall' ? 'City Mall' : 'BYD 60M'}
                </h4>
                <p className="text-slate-500 text-xs mt-0.5">Override global configurations and schedule for this branch</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings[`branch_enabled_${activeTab}`] === 'true'}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      [`branch_enabled_${activeTab}`]: e.target.checked ? 'true' : 'false'
                    });
                  }}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-650 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {settings[`branch_enabled_${activeTab}`] !== 'true' ? (
              <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  This branch is currently inheriting all <strong className="text-primary-500">Global Settings</strong>.
                </p>
                <div className="text-xs text-slate-400 dark:text-slate-500 max-w-md mx-auto grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60">
                  <div className="text-left font-semibold">Telegram Group ID:</div>
                  <div className="text-right font-mono font-bold text-slate-600 dark:text-slate-300">{settings.group_id || 'Not configured'}</div>
                  <div className="text-left font-semibold">Order Window:</div>
                  <div className="text-right font-mono font-bold text-slate-600 dark:text-slate-300">{settings.order_start_time || '07:00'} - {settings.order_end_time || '16:00'}</div>
                  <div className="text-left font-semibold">Daily Report Time:</div>
                  <div className="text-right font-mono font-bold text-slate-600 dark:text-slate-300">{settings.report_time || '16:20'}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Branch Telegram Config */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <MessageSquare className="text-primary-500" size={20} />
                    <h3 className="font-bold text-slate-800 dark:text-white">Telegram Configuration ({activeTab === 'byd_6a' ? 'BYD 6A' : activeTab === 'city_mall' ? 'City Mall' : 'BYD 60M'})</h3>
                  </div>
                  <div className="p-4 sm:p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bot Token</label>
                        <input
                          type="password"
                          disabled
                          className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-none rounded-xl outline-none text-slate-400 cursor-not-allowed"
                          placeholder="Bot token is system-wide"
                          value={settings.bot_token}
                        />
                        <span className="text-[10px] sm:text-xs text-slate-400 block mt-1">System-wide parameters cannot be customized per branch.</span>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Branch Group ID</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition text-slate-800 dark:text-slate-200"
                          placeholder="Leave blank to use global Group ID"
                          value={settings[`branch_group_id_${activeTab}`] || ''}
                          onChange={(e) => setSettings({ ...settings, [`branch_group_id_${activeTab}`]: e.target.value })}
                        />
                        <span className="text-[10px] sm:text-xs text-slate-400 block mt-1">If empty, notifications fallback to main group: {settings.group_id || 'Not set'}.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Branch Schedule Config */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <Clock className="text-primary-500" size={20} />
                    <h3 className="font-bold text-slate-800 dark:text-white">Schedule Settings ({activeTab === 'byd_6a' ? 'BYD 6A' : activeTab === 'city_mall' ? 'City Mall' : 'BYD 60M'})</h3>
                  </div>
                  <div className="p-4 sm:p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Order Start Time</label>
                        <TimePicker
                          value={settings[`branch_order_start_time_${activeTab}`] || ''}
                          onChange={(e) => setSettings({ ...settings, [`branch_order_start_time_${activeTab}`]: e.target.value })}
                        />
                        <span className="text-[10px] sm:text-xs text-slate-400 block mt-1">Fallback: {settings.order_start_time || '07:00'}</span>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Order End Time</label>
                        <TimePicker
                          value={settings[`branch_order_end_time_${activeTab}`] || ''}
                          onChange={(e) => setSettings({ ...settings, [`branch_order_end_time_${activeTab}`]: e.target.value })}
                        />
                        <span className="text-[10px] sm:text-xs text-slate-400 block mt-1">Fallback: {settings.order_end_time || '16:00'}</span>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Report Send Time</label>
                        <TimePicker
                          value={settings[`branch_report_time_${activeTab}`] || ''}
                          onChange={(e) => setSettings({ ...settings, [`branch_report_time_${activeTab}`]: e.target.value })}
                        />
                        <span className="text-[10px] sm:text-xs text-slate-400 block mt-1">Fallback: {settings.report_time || '16:20'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'supply' && (
          <div className="space-y-8 motion-preset-fade motion-duration-200">
            {/* Supply Telegram Config */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <MessageSquare className="text-emerald-500" size={20} />
                <h3 className="font-bold text-slate-800 dark:text-white">Supplier Telegram Configuration</h3>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Configure a separate Telegram bot and group to receive the daily supplier order summary.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Supplier Bot Token</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition text-slate-800 dark:text-slate-200"
                      placeholder="Enter supplier bot token"
                      value={settings.supply_bot_token}
                      onChange={(e) => setSettings({ ...settings, supply_bot_token: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Supply Group ID</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition text-slate-800 dark:text-slate-200"
                      placeholder="-100xxxxxxxxx"
                      value={settings.supply_group_id}
                      onChange={(e) => setSettings({ ...settings, supply_group_id: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Supply Schedule Config */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Clock className="text-emerald-500" size={20} />
                <h3 className="font-bold text-slate-800 dark:text-white">Auto Send Schedule</h3>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Set a time to automatically send the supplier order summary daily. Leave empty to disable auto-send.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Auto Send Time</label>
                    <TimePicker
                      value={settings.supply_report_time}
                      onChange={(e) => setSettings({ ...settings, supply_report_time: e.target.value })}
                    />
                    <span className="text-[10px] sm:text-xs text-slate-400 block mt-1">
                      {settings.supply_report_time ? `Auto-send enabled at ${settings.supply_report_time}` : 'Disabled — use manual "Send to Supplier" button'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Supply Customize Message */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <FileText className="text-emerald-500" size={20} />
                <h3 className="font-bold text-slate-800 dark:text-white">Customize Message</h3>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Add an optional note from the admin that will be appended at the bottom of the supplier order summary. Leave empty to omit.
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Admin Note</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition text-slate-800 dark:text-slate-200 resize-none"
                    placeholder={"e.g. Please prepare by 11:00 AM. Thank you!"}
                    value={settings.supply_custom_message}
                    onChange={(e) => setSettings({ ...settings, supply_custom_message: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reminder' && (
          <div className="space-y-8 motion-preset-fade motion-duration-200">
            {/* Header Info Banner */}
            <div className="p-6 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20 shrink-0">
                  <Bell size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Daily Telegram Reminder Schedules</h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Configure automated lunch order reminders sent to all Telegram groups (Branch groups &amp; Main group) at 3 customizable daily schedules (07:00 AM, 12:00 PM, 03:00 PM).
                  </p>
                </div>
              </div>
            </div>

            {/* 1. Slot 07:00 AM */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-900/50">
                    <Sunrise size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 dark:text-white">Morning Reminder</h3>
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {settings.reminder_07_time || '07:00'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Start send: 07:00 AM morning order reminder</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {settings.reminder_07_enabled !== 'false' ? 'Active' : 'Disabled'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.reminder_07_enabled !== 'false'}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          reminder_07_enabled: e.target.checked ? 'true' : 'false'
                        });
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-650 peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock size={16} className="text-amber-500" />
                      <span>Start Send Time</span>
                    </label>
                    <TimePicker
                      value={settings.reminder_07_time || '07:00'}
                      onChange={(e) => setSettings({ ...settings, reminder_07_time: e.target.value })}
                    />
                    <span className="text-[10px] sm:text-xs text-slate-400 block mt-1">
                      {settings.reminder_07_enabled !== 'false'
                        ? `Auto-send enabled at ${settings.reminder_07_time || '07:00'}`
                        : 'Auto-send disabled'}
                    </span>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Customize English Text
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition text-slate-800 dark:text-slate-200 resize-none text-sm"
                      placeholder="Good morning everyone! Please place your lunch order for today. Thank you!"
                      value={settings.reminder_07_message_en}
                      onChange={(e) => setSettings({ ...settings, reminder_07_message_en: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Customize Khmer Text
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition text-slate-800 dark:text-slate-200 resize-none text-sm"
                    placeholder="អរុណសួស្តីអ្នកទាំងអស់គ្នា! សូមធ្វើការកម្មង់អាហារថ្ងៃត្រង់សម្រាប់ថ្ងៃនេះ។ អរគុណ! 🌤️"
                    value={settings.reminder_07_message_kh}
                    onChange={(e) => setSettings({ ...settings, reminder_07_message_kh: e.target.value })}
                  />
                </div>

                {/* Slot 07 Preview & Test Button */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Bell size={14} className="text-amber-500" />
                      Telegram Preview (07:00 AM)
                    </span>
                    <button
                      type="button"
                      disabled={sendingSlot['07'] || saving}
                      onClick={() => handleSendLunchReminder('07')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-amber-600/20 transition cursor-pointer disabled:opacity-50"
                    >
                      {sendingSlot['07'] ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Sending 07:00 AM...</span>
                        </>
                      ) : (
                        <>
                          <Send size={12} />
                          <span>Send 07:00 AM Now</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap border border-slate-100 dark:border-slate-800">
                    {(settings.reminder_07_message_en?.trim() || settings.lunch_reminder_message_en?.trim() || 'Good morning everyone!\n\nPlease place your lunch order for today. Thank you!')}
                    {'\n\n'}
                    {(settings.reminder_07_message_kh?.trim() || settings.lunch_reminder_message_kh?.trim() || 'អរុណសួស្តីអ្នកទាំងអស់គ្នា! សូមធ្វើការកម្មង់អាហារថ្ងៃត្រង់សម្រាប់ថ្ងៃនេះ។ អរគុណ! 🌤️')}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Slot 12:00 PM */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-900/50">
                    <Sun size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 dark:text-white">Midday Reminder</h3>
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {settings.reminder_12_time || '12:00'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Start send: 12:00 PM / midday follow-up reminder</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {settings.reminder_12_enabled !== 'false' ? 'Active' : 'Disabled'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.reminder_12_enabled !== 'false'}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          reminder_12_enabled: e.target.checked ? 'true' : 'false'
                        });
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-650 peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock size={16} className="text-amber-500" />
                      <span>Start Send Time</span>
                    </label>
                    <TimePicker
                      value={settings.reminder_12_time || '12:00'}
                      onChange={(e) => setSettings({ ...settings, reminder_12_time: e.target.value })}
                    />
                    <span className="text-[10px] sm:text-xs text-slate-400 block mt-1">
                      {settings.reminder_12_enabled !== 'false'
                        ? `Auto-send enabled at ${settings.reminder_12_time || '12:00'}`
                        : 'Auto-send disabled'}
                    </span>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Customize English Text
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition text-slate-800 dark:text-slate-200 resize-none text-sm"
                      placeholder="Hello everyone! Please remember to place your lunch order before the cutoff time. Thank you!"
                      value={settings.reminder_12_message_en}
                      onChange={(e) => setSettings({ ...settings, reminder_12_message_en: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Customize Khmer Text
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition text-slate-800 dark:text-slate-200 resize-none text-sm"
                    placeholder="សួស្តីអ្នកទាំងអស់គ្នា! សូមកុំភ្លេចធ្វើការកម្មង់អាហារថ្ងៃត្រង់មុនពេលផុតកំណត់។ អរគុណ! 🍱"
                    value={settings.reminder_12_message_kh}
                    onChange={(e) => setSettings({ ...settings, reminder_12_message_kh: e.target.value })}
                  />
                </div>

                {/* Slot 12 Preview & Test Button */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Bell size={14} className="text-amber-500" />
                      Telegram Preview (12:00 PM)
                    </span>
                    <button
                      type="button"
                      disabled={sendingSlot['12'] || saving}
                      onClick={() => handleSendLunchReminder('12')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-amber-600/20 transition cursor-pointer disabled:opacity-50"
                    >
                      {sendingSlot['12'] ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Sending 12:00 PM...</span>
                        </>
                      ) : (
                        <>
                          <Send size={12} />
                          <span>Send 12:00 PM Now</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap border border-slate-100 dark:border-slate-800">
                    {(settings.reminder_12_message_en?.trim() || settings.lunch_reminder_message_en?.trim() || 'Hello everyone!\n\nPlease remember to place your lunch order before the cutoff time. Thank you!')}
                    {'\n\n'}
                    {(settings.reminder_12_message_kh?.trim() || settings.lunch_reminder_message_kh?.trim() || 'សួស្តីអ្នកទាំងអស់គ្នា! សូមកុំភ្លេចធ្វើការកម្មង់អាហារថ្ងៃត្រង់មុនពេលផុតកំណត់។ អរគុណ! 🍱')}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Slot 03:00 PM */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-900/50">
                    <Sunset size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 dark:text-white">Afternoon Reminder</h3>
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {settings.reminder_15_time || '15:00'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Start send: 03:00 PM next-day lunch reminder</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {settings.reminder_15_enabled !== 'false' ? 'Active' : 'Disabled'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.reminder_15_enabled !== 'false'}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          reminder_15_enabled: e.target.checked ? 'true' : 'false'
                        });
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-650 peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock size={16} className="text-amber-500" />
                      <span>Start Send Time</span>
                    </label>
                    <TimePicker
                      value={settings.reminder_15_time || '15:00'}
                      onChange={(e) => setSettings({ ...settings, reminder_15_time: e.target.value })}
                    />
                    <span className="text-[10px] sm:text-xs text-slate-400 block mt-1">
                      {settings.reminder_15_enabled !== 'false'
                        ? `Auto-send enabled at ${settings.reminder_15_time || '15:00'}`
                        : 'Auto-send disabled'}
                    </span>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Customize English Text
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition text-slate-800 dark:text-slate-200 resize-none text-sm"
                      placeholder="Hello everyone, Please place your lunch order for tomorrow. Thank you!"
                      value={settings.reminder_15_message_en}
                      onChange={(e) => setSettings({ ...settings, reminder_15_message_en: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Customize Khmer Text
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition text-slate-800 dark:text-slate-200 resize-none text-sm"
                    placeholder="សួស្តីអ្នកទាំងអស់គ្នា សូមធ្វើការកម្មង់អាហារថ្ងៃត្រង់សម្រាប់ថ្ងៃស្អែក។ អរគុណ!😘"
                    value={settings.reminder_15_message_kh}
                    onChange={(e) => setSettings({ ...settings, reminder_15_message_kh: e.target.value })}
                  />
                </div>

                {/* Slot 15 Preview & Test Button */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Bell size={14} className="text-amber-500" />
                      Telegram Preview (03:00 PM)
                    </span>
                    <button
                      type="button"
                      disabled={sendingSlot['15'] || saving}
                      onClick={() => handleSendLunchReminder('15')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-amber-600/20 transition cursor-pointer disabled:opacity-50"
                    >
                      {sendingSlot['15'] ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Sending 03:00 PM...</span>
                        </>
                      ) : (
                        <>
                          <Send size={12} />
                          <span>Send 03:00 PM Now</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap border border-slate-100 dark:border-slate-800">
                    {(settings.reminder_15_message_en?.trim() || settings.lunch_reminder_message_en?.trim() || 'Hello everyone,\n\nPlease place your lunch order for tomorrow. Thank you!')}
                    {'\n\n'}
                    {(settings.reminder_15_message_kh?.trim() || settings.lunch_reminder_message_kh?.trim() || 'សួស្តីអ្នកទាំងអស់គ្នា សូមធ្វើការកម្មង់អាហារថ្ងៃត្រង់សម្រាប់ថ្ងៃស្អែក។ អរគុណ!😘')}
                  </div>
                </div>
              </div>
            </div>

            {/* Global Default Bilingual Message Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <FileText className="text-amber-500" size={20} />
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Default Fallback Reminder Message</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Used automatically if any schedule slot has empty custom text</p>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Default English Message</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition text-slate-800 dark:text-slate-200 resize-none text-sm"
                      placeholder="Hello everyone, Please place your lunch order for tomorrow. Thank you!"
                      value={settings.lunch_reminder_message_en}
                      onChange={(e) => setSettings({ ...settings, lunch_reminder_message_en: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Default Khmer Message</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition text-slate-800 dark:text-slate-200 resize-none text-sm"
                      placeholder="សួស្តីអ្នកទាំងអស់គ្នា សូមធ្វើការកម្មង់អាហារថ្ងៃត្រង់សម្រាប់ថ្ងៃស្អែក។ អរគុណ!😘"
                      value={settings.lunch_reminder_message_kh}
                      onChange={(e) => setSettings({ ...settings, lunch_reminder_message_kh: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Log */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="text-amber-500" size={20} />
                  <h3 className="font-bold text-slate-800 dark:text-white">Sent Reminders Log</h3>
                </div>
                <button
                  type="button"
                  onClick={() => fetchReminderLogs(1)}
                  className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
              <div className="p-4 sm:p-6">
                {reminderLogs.length === 0 && !loadingLogs ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No reminders sent yet. Use &quot;Send Now&quot; or enable auto-send to get started.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                            <th className="pb-3 pr-4 font-semibold">Date &amp; Time</th>
                            <th className="pb-3 pr-4 font-semibold">Group / Schedule</th>
                            <th className="pb-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {reminderLogs.map((log, i) => (
                            <tr key={log._id || i} className="text-slate-700 dark:text-slate-300">
                              <td className="py-2.5 pr-4 whitespace-nowrap text-xs font-mono">
                                {new Date(log.sent_at).toLocaleString('en-US', {
                                  year: 'numeric', month: 'short', day: '2-digit',
                                  hour: '2-digit', minute: '2-digit', hour12: true
                                })}
                              </td>
                              <td className="py-2.5 pr-4 whitespace-nowrap text-xs font-semibold">{log.group_label}</td>
                              <td className="py-2.5 whitespace-nowrap">
                                {log.status === 'success' ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 size={14} /> Sent
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400" title={log.error_message}>
                                    <AlertCircle size={14} /> Error
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {reminderLogsTotalPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          disabled={reminderLogsPage <= 1 || loadingLogs}
                          onClick={() => fetchReminderLogs(reminderLogsPage - 1)}
                          className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          &larr; Previous
                        </button>
                        <span className="text-xs text-slate-400">Page {reminderLogsPage} of {reminderLogsTotalPages}</span>
                        <button
                          type="button"
                          disabled={reminderLogsPage >= reminderLogsTotalPages || loadingLogs}
                          onClick={() => fetchReminderLogs(reminderLogsPage + 1)}
                          className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Next &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 flex-col sm:flex-row">
          {activeTab === 'supply' && (
            <button
              type="button"
              disabled={sendingSupply || saving}
              onClick={handleSendToSupply}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingSupply ? 'Sending...' : (
                <>
                  <Send size={20} />
                  <span>Send to Supplier</span>
                </>
              )}
            </button>
          )}

          {activeTab === 'reminder' && (
            <button
              type="button"
              disabled={sendingReminder || saving}
              onClick={() => handleSendLunchReminder(null)}
              className="flex items-center gap-2 px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-600/20 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingReminder ? 'Sending...' : (
                <>
                  <Bell size={20} />
                  <span>Send All Reminders Now</span>
                </>
              )}
            </button>
          )}

          {activeTab !== 'supply' && activeTab !== 'reminder' && (
            <button
              type="button"
              disabled={sendingReport || saving}
              onClick={handleSendReportNow}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingReport ? 'Sending...' : (
                <>
                  <Send size={20} />
                  <span>Send Report Now</span>
                </>
              )}
            </button>
          )}

          <button
            type="submit"
            disabled={saving || sendingReport || sendingSupply}
            className="flex items-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-600/20 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto justify-center disabled:opacity-50"
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
