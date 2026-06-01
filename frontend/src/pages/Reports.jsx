import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Download,
  CalendarRange,
  Calendar,
  Building,
  Search,
  Utensils
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { addDays, endOfWeek, format, startOfWeek, parseISO } from 'date-fns';
import SearchSelect from '../components/SearchSelect';
import SelectDate from '../components/SelectDate';
import SelectMonth from '../components/SelectMonth';
import { cn } from '../utils/cx';

const branchOptions = [
  { value: '', label: 'All Branches' },
  { value: 'City Mall', label: 'City Mall' },
  { value: 'BYD 6A', label: 'BYD 6A' },
  { value: 'BYD 60M', label: 'BYD 60M' }
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'not_ordered', label: 'Not Ordered' }
];

const periodOptions = [
  { value: 'daily', label: 'Daily Orders' },
  { value: 'weekly', label: 'Weekly Summary' },
  { value: 'monthly', label: 'Daily Report (Matrix)' },
  { value: 'summary', label: 'Summary Report' },
  { value: 'custom', label: 'Custom Range' }
];


const today = new Date();
const tomorrow = addDays(today, 1);
const tomorrowIso = format(tomorrow, 'yyyy-MM-dd');
const tomorrowMonth = format(tomorrow, 'yyyy-MM');

const getPeriodRange = (period, baseDate = today) => {
  if (period === 'weekly') {
    return {
      startDate: format(startOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      endDate: format(endOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    };
  }

  if (period === 'monthly' || period === 'summary') {
    const y = baseDate.getFullYear();
    const m = baseDate.getMonth();
    const firstDay = format(new Date(y, m, 1), 'yyyy-MM-dd');
    const lastDay = format(new Date(y, m + 1, 0), 'yyyy-MM-dd');
    return {
      startDate: firstDay,
      endDate: lastDay
    };
  }

  return {
    startDate: tomorrowIso,
    endDate: tomorrowIso
  };
};

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    period: 'daily',
    date: tomorrowIso,
    month: tomorrowMonth,
    startDate: tomorrowIso,
    endDate: tomorrowIso,
    branch: '',
    status: ''
  });
  const isMonthlyReport = filters.period === 'monthly';
  const isSummaryReport = filters.period === 'weekly';
  const isCustomSummaryReport = filters.period === 'summary';
  const isDetailedReport = filters.period === 'daily' || filters.period === 'custom';
  const selectedMonth = filters.month || tomorrowMonth;
  const monthlyBaseDate = new Date(`${selectedMonth}-01T00:00:00`);
  const daysInMonth = new Date(monthlyBaseDate.getFullYear(), monthlyBaseDate.getMonth() + 1, 0).getDate();
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  
  const displayedReports = normalizedSearchTerm
    ? reports.filter(report => (
      report.full_name?.toLowerCase().includes(normalizedSearchTerm) ||
      report.branch?.toLowerCase().includes(normalizedSearchTerm) ||
      report.status?.toLowerCase().includes(normalizedSearchTerm) ||
      report.position?.toLowerCase().includes(normalizedSearchTerm) ||
      report.department?.toLowerCase().includes(normalizedSearchTerm) ||
      report.byd_id?.toLowerCase().includes(normalizedSearchTerm) ||
      report.hx_id?.toLowerCase().includes(normalizedSearchTerm)
    ))
    : reports;

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/reports', { params: filters });
      setReports(res.data);
    } catch (error) {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      const res = await api.get(`/api/reports/export/${type}`, {
        params: {
          ...filters,
          template: isMonthlyReport ? 'monthly' : filters.period
        },
        responseType: 'blob'
      });
      const extension = type === 'excel' ? 'xlsx' : 'pdf';
      const contentType = type === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      const filenameRange = isMonthlyReport || isCustomSummaryReport
        ? selectedMonth
        : filters.startDate === filters.endDate
          ? filters.startDate
          : `${filters.startDate}-to-${filters.endDate}`;
      link.download = `lunch-report-${filenameRange}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} exported`);
    } catch (error) {
      toast.error(`Failed to export ${type.toUpperCase()}`);
    }
  };

  const getSummaryDateHeaderLabel = () => {
    try {
      const start = new Date(`${filters.startDate}T00:00:00`);
      const end = new Date(`${filters.endDate}T00:00:00`);
      const getOrdinal = (d) => {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
          case 1:  return "st";
          case 2:  return "nd";
          case 3:  return "rd";
          default: return "th";
        }
      };
      const startStr = `${String(start.getDate()).padStart(2, '0')}${getOrdinal(start.getDate())}`;
      const endStr = `${String(end.getDate()).padStart(2, '0')}${getOrdinal(end.getDate())}`;
      const monthYear = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return `${startStr}-${endStr} ${monthYear}`;
    } catch (e) {
      return 'Total Meals';
    }
  };

  const updatePeriod = (period) => {
    const range = getPeriodRange(period, new Date(`${filters.date}T00:00:00`));
    setFilters({
      ...filters,
      period,
      ...range,
      date: period === 'daily' ? range.startDate : filters.date,
      month: filters.month
    });
  };

  const updateDate = (date) => {
    const baseDate = new Date(`${date}T00:00:00`);
    const range = filters.period === 'daily'
      ? { startDate: date, endDate: date }
      : getPeriodRange(filters.period, baseDate);

    setFilters({
      ...filters,
      date,
      ...range
    });
  };

  const updateMonth = (month) => {
    const selected = month || tomorrowMonth;
    const baseDate = new Date(`${selected}-01T00:00:00`);
    const range = getPeriodRange(filters.period, baseDate);
    setFilters({
      ...filters,
      month: selected,
      ...range
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Lunch Reports</h2>
          <p className="text-xs text-slate-500 sm:text-sm">View and export lunch order reports by day, week, month, or date range</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition cursor-pointer font-semibold shadow-md shadow-green-600/10 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition cursor-pointer font-semibold shadow-md shadow-red-600/10 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download size={18} />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      <div className="grid items-end grid-cols-1 gap-3 p-3 bg-white border shadow-sm dark:bg-slate-900 sm:p-4 rounded-2xl border-slate-100 dark:border-slate-800 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 sm:gap-4">
        <div className="w-full space-y-1">
          <label className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
            <CalendarRange size={12} />
            Range
          </label>
          <SearchSelect
            options={periodOptions}
            value={filters.period}
            onChange={(e) => updatePeriod(e.target.value)}
            placeholder="Select Range"
            hasSearch={false}
            className="w-full"
          />
        </div>
        <div className="w-full space-y-1">
          <label className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
            <Calendar size={12} />
            {(isMonthlyReport || isCustomSummaryReport) ? 'Month' : filters.period === 'daily' ? 'Order Date' : 'Base Date'}
          </label>
          {(isMonthlyReport || isCustomSummaryReport) ? (
            <SelectMonth
              value={filters.month}
              onChange={(e) => updateMonth(e.target.value)}
              className="w-full"
            />
          ) : (
            <SelectDate
              value={filters.date}
              onChange={(e) => updateDate(e.target.value)}
              className="w-full"
            />
          )}
        </div>
        {filters.period === 'custom' && (
          <>
            <div className="w-full space-y-1">
              <label className="text-xs font-semibold uppercase text-slate-500">Start Date</label>
              <SelectDate
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="w-full space-y-1">
              <label className="text-xs font-semibold uppercase text-slate-500">End Date</label>
              <SelectDate
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full"
              />
            </div>
          </>
        )}
        <div className="w-full space-y-1">
          <label className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
            <Building size={12} />
            Branch
          </label>
          <SearchSelect
            options={branchOptions}
            value={filters.branch}
            onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
            placeholder="All Branches"
            hasSearch={true}
            className="w-full"
          />
        </div>
        {isDetailedReport && (
          <div className="w-full space-y-1">
            <label className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
              <Utensils size={12} />
              Status
            </label>
            <SearchSelect
              options={statusOptions}
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              placeholder="All Statuses"
              hasSearch={false}
              className="w-full"
            />
          </div>
        )}
        {!isSummaryReport && (
          <div className="w-full space-y-1 sm:col-span-2 lg:col-span-1">
            <label className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
              <Search size={12} />
              Search Staff
            </label>
            <div className="relative">
              <Search className="absolute -translate-y-1/2 left-3 top-1/2 text-slate-400" size={18} />
              <input
                type="text"
                className="w-full py-2 pl-10 pr-4 transition border-none outline-none bg-slate-50 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500"
                placeholder="Search staff, branch, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden bg-white border shadow-sm dark:bg-slate-900 rounded-2xl border-slate-100 dark:border-slate-800">
        {(isMonthlyReport || isCustomSummaryReport) && (
          <>
            <div className="px-6 py-4 text-center border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {isMonthlyReport ? 'Daily Report' : 'Summary Report'} For {format(monthlyBaseDate, 'MMMM-yyyy')} ({filters.branch || 'All Branches'})
              </h3>
            </div>
            {/* Horizontal Swipe Tip Banner for Monthly/Summary Sheet on Mobile */}
            <div className="md:hidden bg-primary-50 dark:bg-primary-950/20 px-4 py-2.5 text-center border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center justify-center gap-1.5 animate-pulse shrink-0">
              <span>💡 Tip: Swipe horizontally to view all columns</span>
            </div>
          </>
        )}

        {/* ── Desktop View Table ── */}
        <div className={cn("overflow-x-auto", !isMonthlyReport && !isCustomSummaryReport && "hidden md:block")}>
          <table className="w-full text-left">
            <thead className="text-sm tracking-wider uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500">
              {isMonthlyReport ? (
                <tr>
                  <th className="px-3 py-4 font-semibold text-center">No</th>
                  <th className="px-4 py-4 font-semibold min-w-[180px]">Staff Name</th>
                  <th className="px-4 py-4 font-semibold text-center min-w-[90px]">Price</th>
                  {Array.from({ length: daysInMonth }, (_, index) => (
                    <th key={index + 1} className="px-2 py-4 font-semibold text-center min-w-10">
                      {monthlyBaseDate.getMonth() + 1}/{index + 1}
                    </th>
                  ))}
                  <th className="px-4 py-4 font-semibold text-center min-w-[100px]">Total Meal</th>
                  <th className="px-4 py-4 font-semibold text-center min-w-[100px]">Total Cost</th>
                </tr>
              ) : isCustomSummaryReport ? (
                <tr>
                  <th className="px-3 py-4 font-semibold text-center">No</th>
                  <th className="px-4 py-4 font-semibold min-w-[100px]">BYD ID</th>
                  <th className="px-4 py-4 font-semibold min-w-[100px]">HX ID</th>
                  <th className="px-4 py-4 font-semibold min-w-[180px]">Staff Name</th>
                  <th className="px-4 py-4 font-semibold min-w-[160px]">Position</th>
                  <th className="px-4 py-4 font-semibold min-w-[140px]">Department</th>
                  <th className="px-4 py-4 font-semibold text-center min-w-[120px]">Price Charge</th>
                  <th className="px-4 py-4 font-semibold text-center min-w-[140px]">{getSummaryDateHeaderLabel()}</th>
                  <th className="px-4 py-4 font-semibold text-center min-w-[160px]">Free for Staff</th>
                  <th className="px-4 py-4 font-semibold text-center min-w-[140px]">Total Amount</th>
                </tr>
              ) : isSummaryReport ? (
                <tr>
                  <th className="px-6 py-4 font-semibold">Order Date</th>
                  <th className="px-6 py-4 font-semibold">Branch</th>
                  <th className="px-6 py-4 font-semibold">Total Staff</th>
                  <th className="px-6 py-4 font-semibold">Ordered</th>
                  <th className="px-6 py-4 font-semibold">Cancelled</th>
                  <th className="px-6 py-4 font-semibold">Not Ordered</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-4 font-semibold">Staff Name</th>
                  <th className="px-6 py-4 font-semibold">Branch</th>
                  <th className="px-6 py-4 font-semibold">Order Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={`loading-${i}`} className="animate-pulse">
                      <td colSpan={isMonthlyReport ? daysInMonth + 5 : isCustomSummaryReport ? 10 : isSummaryReport ? 6 : 4} className="px-6 py-4">
                        <div className="h-6 rounded bg-slate-100 dark:bg-slate-800" />
                      </td>
                    </tr>
                  ))
                ) : displayedReports.length === 0 ? (
                  <tr
                    key="empty"
                    className="motion-preset-fade motion-duration-200"
                  >
                    <td colSpan={isMonthlyReport ? daysInMonth + 5 : isCustomSummaryReport ? 10 : isSummaryReport ? 6 : 4} className="px-6 py-12 text-center text-slate-500">No records found for the selected criteria</td>
                  </tr>
                ) : (
                  displayedReports.map((report, index) => {
                    const rowKey = isMonthlyReport 
                      ? (report.user_id || `monthly-${index}`) 
                      : isCustomSummaryReport
                        ? `summary-${report.user_id}-${index}`
                        : isSummaryReport 
                          ? `${report.order_date}-${report.branch}-${index}` 
                          : `${report.user_id}-${report.order_date}-${index}`;

                    return isMonthlyReport ? (
                      <tr
                        key={rowKey}
                        className="text-sm font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 motion-preset-fade motion-duration-200 text-slate-700 dark:text-slate-200"
                      >
                        <td className="px-3 py-3 font-mono text-xs text-center text-slate-500 dark:text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{report.full_name}</td>
                        <td className="px-4 py-3 font-mono text-center text-slate-500 dark:text-slate-400">
                          {report.price === undefined || report.price === 0 ? '$ -' : `$ ${report.price.toFixed(2)}`}
                        </td>
                        {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                          const day = dayIndex + 1;
                          const status = report.days?.[day];
                          return (
                            <td key={day} className="px-1 py-2 text-center">
                              {status === 'ordered' ? (
                                <div className="mx-auto h-6 w-8 bg-emerald-500 border border-emerald-600 rounded flex items-center justify-center text-white text-[11px] font-black font-mono">1</div>
                              ) : (
                                <div className="w-8 h-6 mx-auto border rounded bg-rose-500/10 border-rose-200/50 dark:border-rose-950/50" />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 font-mono font-bold text-center text-slate-800 dark:text-white">{report.total_meal ?? 0}</td>
                        <td className="px-4 py-3 font-mono font-bold text-center text-slate-800 dark:text-white">
                          {report.total_cost === undefined || report.total_cost === 0 ? '$ -' : `$ ${report.total_cost.toFixed(2)}`}
                        </td>
                      </tr>
                    ) : isCustomSummaryReport ? (
                      <tr
                        key={rowKey}
                        className="text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 motion-preset-fade motion-duration-200 text-slate-700 dark:text-slate-200"
                      >
                        <td className="px-3 py-3 font-mono text-xs text-center text-slate-500 dark:text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{report.byd_id || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{report.hx_id || '—'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{report.full_name}</td>
                        <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 font-mono">{report.position || '—'}</td>
                        <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 font-mono">{report.department || '—'}</td>
                        <td className="px-4 py-3 font-mono text-center text-slate-500 dark:text-slate-400">
                          {report.price === undefined || report.price === 0 ? '$ -' : `$ ${report.price.toFixed(2)}`}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-center text-slate-800 dark:text-white">{report.total_meal ?? 0}</td>
                        <td className="px-4 py-3 font-mono text-center text-slate-500 dark:text-slate-400">
                          {report.free_amount === undefined || report.free_amount === 0 ? '$ -' : `$ ${report.free_amount.toFixed(2)}`}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-center text-slate-800 dark:text-white">
                          {report.total_amount === undefined || report.total_amount === 0 ? '$ -' : `$ ${report.total_amount.toFixed(2)}`}
                        </td>
                      </tr>
                    ) : isSummaryReport ? (
                      <tr
                        key={rowKey}
                        className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 motion-preset-fade motion-duration-200"
                      >
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {report.order_date ? format(parseISO(report.order_date), 'MMM dd, yyyy') : '-'}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{report.branch}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{report.total_staff}</td>
                        <td className="px-6 py-4 font-semibold text-green-600 dark:text-green-400">{report.ordered}</td>
                        <td className="px-6 py-4 font-semibold text-red-600 dark:text-red-400">{report.cancelled}</td>
                        <td className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">{report.not_ordered}</td>
                      </tr>
                    ) : (
                      <tr
                        key={rowKey}
                        className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 motion-preset-fade motion-duration-200"
                      >
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{report.full_name}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{report.branch}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {report.order_date ? format(parseISO(report.order_date), 'MMM dd, yyyy') : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200",
                            report.status === 'ordered' && "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
                            report.status === 'cancelled' && "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
                            report.status === 'not_ordered' && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          )}>
                            {report.status === 'not_ordered' ? 'Not Order' : report.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
                
                {/* ── Daily Report Bottom Summary Row ── */}
                {!loading && displayedReports.length > 0 && isMonthlyReport && (
                  <tr className="font-bold border-t-2 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
                    <td className="px-3 py-3.5 text-center"></td>
                    <td className="px-4 py-3.5 text-left font-black">TOTAL ORDER:</td>
                    <td className="px-4 py-3.5"></td>
                    {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                      const day = dayIndex + 1;
                      let dayCount = 0;
                      displayedReports.forEach(r => {
                        if (r.days?.[day] === 'ordered') {
                          dayCount += 1;
                        }
                      });
                      return (
                        <td key={`sum-${day}`} className="px-1 py-3.5 text-center font-black font-mono text-[11px]">
                          {dayCount}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3.5"></td>
                    <td className="px-4 py-3.5 text-center font-black font-mono text-emerald-600 dark:text-emerald-400">
                      ${displayedReports.reduce((acc, r) => acc + (r.total_cost || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                )}
                
                {/* ── Summary Report Bottom Summary Rows ── */}
                {!loading && displayedReports.length > 0 && isCustomSummaryReport && (() => {
                  const totalMeals = displayedReports.reduce((acc, r) => acc + (r.total_meal || 0), 0);
                  const totalStaffPay = displayedReports.reduce((acc, r) => acc + (r.total_amount || 0), 0);
                  const totalFullPrice = (totalMeals * 3.25).toFixed(2);
                  const formattedStaffPay = totalStaffPay === 0 ? '$ -' : `$ ${totalStaffPay.toFixed(2)}`;

                  return (
                    <>
                      {/* TOTAL Staff Pay: */}
                      <tr className="font-bold border-t-2 bg-amber-500/10 dark:bg-amber-950/20 border-slate-200 dark:border-slate-700 text-amber-700 dark:text-amber-400">
                        <td colSpan={7} className="px-4 py-3.5 text-right font-black">TOTAL Staff Pay:</td>
                        <td className="px-4 py-3.5 text-center font-black font-mono">
                          {totalMeals}
                        </td>
                        <td className="px-4 py-3.5 text-center font-black font-mono">$ -</td>
                        <td className="px-4 py-3.5 text-center font-black font-mono">
                          {formattedStaffPay}
                        </td>
                      </tr>
                      
                      {/* TOTAL Full Price: */}
                      <tr className="font-bold bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-white">
                        <td colSpan={6} className="px-4 py-3.5 text-right font-black">TOTAL Full Price:</td>
                        <td className="px-4 py-3.5 text-center font-black font-mono">$ 3.25</td>
                        <td className="px-4 py-3.5 text-center font-black font-mono">
                          ${totalFullPrice}
                        </td>
                        <td className="px-4 py-3.5 text-center font-black font-mono">$ -</td>
                        <td className="px-4 py-3.5 text-center font-black font-mono">---</td>
                      </tr>
                      
                      {/* TOTAL: */}
                      <tr className="font-bold border-b-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700">
                        <td colSpan={9} className="px-4 py-3.5 text-right font-black text-base">TOTAL (Grand Total):</td>
                        <td className="px-4 py-3.5 text-center font-black font-mono text-base text-emerald-600 dark:text-emerald-400">
                          ${totalFullPrice}
                        </td>
                      </tr>
                    </>
                  );
                })()}
            </tbody>
          </table>
        </div>

        {/* ── Mobile View Card List (Not for Monthly/Summary reports) ── */}
        {!isMonthlyReport && !isCustomSummaryReport && (
          <div className="block text-sm font-medium divide-y md:hidden divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-350">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={`loading-card-${i}`} className="p-4 space-y-3 animate-pulse">
                  <div className="w-1/3 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="w-1/2 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="w-1/4 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ))
            ) : displayedReports.length === 0 ? (
              <div className="p-8 font-normal text-center text-slate-500">No records found for the selected criteria</div>
            ) : (
              displayedReports.map((report, index) => {
                const cardKey = isSummaryReport 
                  ? `card-sum-${report.order_date}-${report.branch}-${index}` 
                  : `card-det-${report.user_id}-${report.order_date}-${index}`;

                return isSummaryReport ? (
                  /* Summary Card */
                  <div key={cardKey} className="p-4 space-y-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-bold leading-snug text-slate-800 dark:text-white">
                          {report.order_date ? format(parseISO(report.order_date), 'MMM dd, yyyy') : '-'}
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-normal">Summary Report</p>
                      </div>
                      <span className="px-2.5 py-1 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
                        {report.branch}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800/60">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="block font-medium text-slate-400 dark:text-slate-500">Total Staff</span>
                        <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{report.total_staff}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-green-50/50 dark:bg-green-950/10">
                        <span className="block font-medium text-green-600/70 dark:text-green-500/70">Ordered</span>
                        <span className="font-mono text-sm font-bold text-green-600 dark:text-green-400">{report.ordered}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-red-50/50 dark:bg-red-950/10">
                        <span className="block font-medium text-red-600/70 dark:text-red-500/70">Cancelled</span>
                        <span className="font-mono text-sm font-bold text-red-600 dark:text-red-400">{report.cancelled}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="block font-medium text-slate-400 dark:text-slate-500">Not Ordered</span>
                        <span className="font-mono text-sm font-bold text-slate-500 dark:text-slate-400">{report.not_ordered}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Detailed Card */
                  <div key={cardKey} className="p-4 space-y-2 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0 mt-0.5 font-bold font-mono">{index + 1}</span>
                        <div>
                        <h4 className="text-base font-bold leading-snug text-slate-800 dark:text-white">{report.full_name}</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
                          {report.order_date ? format(parseISO(report.order_date), 'MMM dd, yyyy') : '-'}
                        </p>
                        </div>
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block shrink-0",
                        report.status === 'ordered' && "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
                        report.status === 'cancelled' && "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
                        report.status === 'not_ordered' && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {report.status === 'not_ordered' ? 'Not Order' : report.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span className="font-semibold text-slate-400 dark:text-slate-500">Branch:</span>
                      <span className="font-medium">{report.branch}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};



export default Reports;
