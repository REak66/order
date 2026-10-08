import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import {
  Calendar,
  CalendarDays,
  Plus,
  Trash2,
  Edit2,
  X,
  Search,
  RotateCcw,
  Sparkles,
  Palmtree
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../utils/cx';
import SearchSelect from '../components/SearchSelect';
import SelectDate from '../components/SelectDate';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import SearchBar from '../components/SearchBar';

const Holidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [holidayFilterYear, setHolidayFilterYear] = useState('2026');
  const [holidaySearch, setHolidaySearch] = useState('');
  const [holidayFilterStatus, setHolidayFilterStatus] = useState('all');
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState(null);
  const [deletingHoliday, setDeletingHoliday] = useState(false);
  const [importingHolidays, setImportingHolidays] = useState(false);

  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/holidays');
      setHolidays(res.data || []);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
      toast.error('Failed to fetch public holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenHolidayModal = (holiday = null) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setHolidayForm({
        date: holiday.date,
        name: holiday.name,
        description: holiday.description || '',
        is_active: holiday.is_active !== undefined ? holiday.is_active : true
      });
    } else {
      setEditingHoliday(null);
      setHolidayForm({
        date: '',
        name: '',
        description: '',
        is_active: true
      });
    }
    setHolidayModalOpen(true);
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    if (!holidayForm.date || !holidayForm.name) {
      toast.error('Date and Holiday Name are required');
      return;
    }
    setSavingHoliday(true);
    try {
      if (editingHoliday) {
        await api.put(`/api/holidays/${editingHoliday._id || editingHoliday.id}`, holidayForm);
        toast.success('Holiday updated successfully');
      } else {
        await api.post('/api/holidays', holidayForm);
        toast.success('Holiday created successfully');
      }
      setHolidayModalOpen(false);
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save holiday');
    } finally {
      setSavingHoliday(false);
    }
  };

  const confirmDeleteHoliday = async () => {
    if (!holidayToDelete) return;
    setDeletingHoliday(true);
    try {
      await api.delete(`/api/holidays/${holidayToDelete._id || holidayToDelete.id}`);
      toast.success('Holiday deleted successfully');
      setHolidayToDelete(null);
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete holiday');
    } finally {
      setDeletingHoliday(false);
    }
  };

  const handleToggleHolidayActive = async (holiday) => {
    try {
      await api.put(`/api/holidays/${holiday._id || holiday.id}`, {
        is_active: !holiday.is_active
      });
      toast.success(`Holiday ${holiday.is_active ? 'disabled' : 'activated'}`);
      setHolidays(prev => prev.map(h => (
        (h._id === holiday._id || h.id === holiday.id) ? { ...h, is_active: !h.is_active } : h
      )));
    } catch (error) {
      toast.error('Failed to update holiday status');
    }
  };

  const handleImportCambodia2026 = async () => {
    setImportingHolidays(true);
    try {
      const res = await api.post('/api/holidays/seed-cambodia-2026');
      toast.success(res.data.message || 'Cambodia 2026 holidays imported!');
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to import holidays');
    } finally {
      setImportingHolidays(false);
    }
  };

  const todayIso = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const availableYears = useMemo(() => {
    const yearsSet = new Set(['2025', '2026', '2027']);
    holidays.forEach(h => {
      if (h.date && h.date.length >= 4) {
        yearsSet.add(h.date.slice(0, 4));
      }
    });
    return Array.from(yearsSet).sort();
  }, [holidays]);

  const yearOptions = useMemo(() => [
    { value: '', label: 'All Years' },
    ...availableYears.map(year => ({ value: year, label: `Year ${year}` }))
  ], [availableYears]);

  const statusFilterOptions = useMemo(() => [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active Only' },
    { value: 'disabled', label: 'Disabled Only' }
  ], []);

  const filteredHolidays = useMemo(() => {
    return holidays
      .filter(h => {
        const matchesYear = !holidayFilterYear || (h.date && h.date.startsWith(holidayFilterYear));
        const matchesSearch = !holidaySearch || (
          (h.name && h.name.toLowerCase().includes(holidaySearch.toLowerCase())) ||
          (h.date && h.date.includes(holidaySearch)) ||
          (h.description && h.description.toLowerCase().includes(holidaySearch.toLowerCase()))
        );
        const matchesStatus =
          holidayFilterStatus === 'all' ||
          (holidayFilterStatus === 'active' ? h.is_active : !h.is_active);
        return matchesYear && matchesSearch && matchesStatus;
      })
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [holidays, holidayFilterYear, holidaySearch, holidayFilterStatus]);

  return (
    <div className="space-y-6 motion-preset-fade motion-duration-200">
      {/* Page Header matching StaffManagement.jsx */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Public Holidays</h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            Manage holidays and automatic lunch ordering restrictions (Standby staff remain permitted)
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={handleImportCambodia2026}
            disabled={importingHolidays}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm disabled:opacity-50 shrink-0"
            title="Import official Cambodia 2026 public holidays"
          >
            {importingHolidays ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Import 2026</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleOpenHolidayModal(null)}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition cursor-pointer font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm shrink-0"
          >
            <Plus size={18} />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      {/* Main Holiday Management Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {/* Filter bar matching StaffManagement toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
          <SearchBar
            hasLabel={false}
            className="md:max-w-sm"
            placeholder="Search holiday name, Khmer, date..."
            value={holidaySearch}
            onChange={(e) => setHolidaySearch(e.target.value)}
          />

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-between md:justify-end">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Year Select */}
              <div className="w-36 sm:w-40">
                <SearchSelect
                  options={yearOptions}
                  value={holidayFilterYear}
                  onChange={(e) => setHolidayFilterYear(e.target.value)}
                  placeholder="All Years"
                  hasSearch={false}
                  className="w-full font-semibold"
                />
              </div>

              {/* Status Select */}
              <div className="w-36 sm:w-44">
                <SearchSelect
                  options={statusFilterOptions}
                  value={holidayFilterStatus}
                  onChange={(e) => setHolidayFilterStatus(e.target.value)}
                  placeholder="All Status"
                  hasSearch={false}
                  className="w-full font-semibold"
                />
              </div>
            </div>

            {/* Reset Filters */}
            {(holidaySearch || holidayFilterYear || holidayFilterStatus !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setHolidaySearch('');
                  setHolidayFilterYear('');
                  setHolidayFilterStatus('all');
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}

            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-auto sm:ml-0">
              Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredHolidays.length}</strong> of {holidays.length}
            </span>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left table-auto">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5 font-semibold text-center w-12">No.</th>
                <th className="px-5 py-3.5 font-semibold">Date</th>
                <th className="px-5 py-3.5 font-semibold">Holiday Name</th>
                <th className="px-5 py-3.5 font-semibold">Description</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                [1, 2, 3, 4].map(i => (
                  <tr key={`loading-${i}`} className="animate-pulse">
                    <td colSpan="6" className="px-6 py-4">
                      <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded" />
                    </td>
                  </tr>
                ))
              ) : filteredHolidays.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto text-slate-400">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                        <CalendarDays size={28} className="text-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No holidays match your criteria</p>
                        <p className="text-xs text-slate-400">Try adjusting your search query, year, or status filter.</p>
                      </div>
                      {(holidaySearch || holidayFilterYear || holidayFilterStatus !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setHolidaySearch('');
                            setHolidayFilterYear('');
                            setHolidayFilterStatus('all');
                          }}
                          className="mt-1 px-3 py-1.5 bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 text-xs font-semibold rounded-xl hover:bg-primary-100 transition cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHolidays.map((h, index) => {
                  const dateObj = new Date(`${h.date}T00:00:00`);
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                  const dayName = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const isToday = h.date === todayIso;

                  // Parse English title vs Khmer subtitle
                  const match = h.name.match(/^(.*?)\s*\((.*?)\)$/);
                  const primaryTitle = match ? match[1].trim() : h.name;
                  const khmerSubtitle = match ? match[2].trim() : null;

                  return (
                    <tr
                      key={h._id || h.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-4 text-center font-medium text-slate-400 dark:text-slate-500 text-xs">
                        {index + 1}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                            {h.date}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider",
                            isWeekend
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          )}>
                            {dayName}
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-rose-500 text-white animate-pulse">
                              Today
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                            <Palmtree size={16} className="text-amber-500 shrink-0" />
                            <span className="leading-snug">{primaryTitle}</span>
                          </span>
                          {khmerSubtitle && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-normal block pl-6 leading-relaxed">
                              {khmerSubtitle}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={h.description || ''}>
                        {h.description || <span className="text-slate-300 dark:text-slate-700">—</span>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleHolidayActive(h)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition shadow-2xs hover:scale-[1.03] active:scale-[0.97]",
                            h.is_active
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-200"
                          )}
                          title="Click to toggle active status"
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", h.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                          <span>{h.is_active ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenHolidayModal(h)}
                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition cursor-pointer"
                            title="Edit holiday"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setHolidayToDelete(h)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition cursor-pointer"
                            title="Delete holiday"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List matching StaffManagement.jsx */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={`loading-mobile-${i}`} className="p-4 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
              </div>
            ))
          ) : filteredHolidays.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <CalendarDays size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No holidays found</p>
              <p className="text-xs text-slate-400">Try adjusting your filters or add a new holiday.</p>
            </div>
          ) : (
            filteredHolidays.map((h, index) => {
              const dateObj = new Date(`${h.date}T00:00:00`);
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
              const dayName = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const isToday = h.date === todayIso;

              const match = h.name.match(/^(.*?)\s*\((.*?)\)$/);
              const primaryTitle = match ? match[1].trim() : h.name;
              const khmerSubtitle = match ? match[2].trim() : null;

              return (
                <div key={h._id || h.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                        #{index + 1}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {h.date}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded uppercase",
                        isWeekend
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {dayName}
                      </span>
                      {isToday && (
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-rose-500 text-white animate-pulse">
                          Today
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleHolidayActive(h)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition shrink-0",
                        h.is_active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", h.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                      <span>{h.is_active ? 'Active' : 'Disabled'}</span>
                    </button>
                  </div>

                  {/* Title & Khmer Subtitle */}
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      <Palmtree size={15} className="text-amber-500 shrink-0" />
                      <span>{primaryTitle}</span>
                    </h4>
                    {khmerSubtitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-normal pl-5 leading-relaxed">
                        {khmerSubtitle}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  {h.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {h.description}
                    </p>
                  )}

                  {/* Footer Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenHolidayModal(h)}
                      className="flex-1 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-xl border border-primary-100 dark:border-primary-900/30 inline-flex items-center justify-center gap-1.5 font-semibold text-xs transition cursor-pointer min-h-[38px]"
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHolidayToDelete(h)}
                      className="flex-1 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/30 inline-flex items-center justify-center gap-1.5 font-semibold text-xs transition cursor-pointer min-h-[38px]"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Holiday Modal */}
      <Modal
        isOpen={holidayModalOpen}
        onClose={() => setHolidayModalOpen(false)}
        title={editingHoliday ? 'Edit Public Holiday' : 'Add New Public Holiday'}
        subtitle={editingHoliday ? 'Update holiday details and status' : 'Define holiday date to block normal orders'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveHoliday} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Holiday Date (YYYY-MM-DD) *
            </label>
            <SelectDate
              value={holidayForm.date}
              onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
              placeholder="Select holiday date (YYYY-MM-DD)"
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Holiday Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Khmer New Year Day 1 (មហាសង្ក្រាន្ត)"
              value={holidayForm.name}
              onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white text-sm transition"
            />
            <span className="text-[11px] text-slate-400 block">
              Tip: Include Khmer translation in parentheses like &quot;Holiday Name (ឈ្មោះបុណ្យ)&quot;
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Description / Notes (Optional)
            </label>
            <textarea
              rows="3"
              placeholder="Additional notes about the holiday or ceremony..."
              value={holidayForm.description}
              onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white text-sm transition"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Active Status</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {holidayForm.is_active ? 'Normal lunch ordering is blocked' : 'Normal lunch ordering is allowed'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={holidayForm.is_active}
                onChange={(e) => setHolidayForm({ ...holidayForm, is_active: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setHolidayModalOpen(false)}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingHoliday}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md shadow-primary-600/20 cursor-pointer transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {savingHoliday ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingHoliday ? 'Save Changes' : 'Create Holiday'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Holiday Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(holidayToDelete)}
        onClose={() => setHolidayToDelete(null)}
        onConfirm={confirmDeleteHoliday}
        title="Delete Public Holiday?"
        message={holidayToDelete ? `Are you sure you want to delete "${holidayToDelete.name}" (${holidayToDelete.date})?\n\nDeleting this holiday will allow normal staff to place lunch orders on this date.` : ''}
        variant="danger"
        confirmText="Delete Holiday"
        loading={deletingHoliday}
      />
    </div>
  );
};

export default Holidays;
