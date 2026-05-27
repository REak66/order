import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Save, 
  MessageSquare, 
  Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const normalizeTimeValue = (value) => {
  if (!value) return '';
  const match = String(value).match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
};

const Settings = () => {
  const [settings, setSettings] = useState({
    bot_token: '',
    group_id: '',
    order_start_time: '',
    order_end_time: '',
    report_time: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

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

  if (loading) return <div className="animate-pulse space-y-6">
    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
  </div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">System Settings</h2>
        <p className="text-slate-500">Configure Telegram bot and system-wide parameters</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 motion-preset-fade motion-duration-3000"
      >
        {/* Telegram Config */}
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <MessageSquare className="text-primary-500" size={20} />
            <h3 className="font-bold text-slate-800 dark:text-white">Telegram Configuration</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Order Start Time</label>
                <input 
                  type="time" 
                  step="60"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition text-slate-800 dark:text-slate-200"
                  value={settings.order_start_time}
                  onChange={(e) => setSettings({ ...settings, order_start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Order End Time</label>
                <input 
                  type="time" 
                  step="60"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition text-slate-800 dark:text-slate-200"
                  value={settings.order_end_time}
                  onChange={(e) => setSettings({ ...settings, order_end_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Report Send Time</label>
                <input
                  type="time"
                  step="60"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-slate-200"
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
            className="flex items-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-600/20 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]"
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
    </div>
  );
};

export default Settings;
