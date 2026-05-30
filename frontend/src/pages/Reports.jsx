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
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' }
];


const today = new Date();
const todayIso = format(today, 'yyyy-MM-dd');
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
  const isDetailedReport = !isSummaryReport && !isMonthlyReport;
  const selectedMonth = filters.month || tomorrowMonth;
  const monthlyBaseDate = new Date(`${selectedMonth}-01T00:00:00`);
  const daysInMonth = new Date(monthlyBaseDate.getFullYear(), monthlyBaseDate.getMonth() + 1, 0).getDate();
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const displayedReports = normalizedSearchTerm
    ? reports.filter(report => (
      report.full_name?.toLowerCase().includes(normalizedSearchTerm) ||
      report.branch?.toLowerCase().includes(normalizedSearchTerm) ||
      report.status?.toLowerCase().includes(normalizedSearchTerm)
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
      const filenameRange = isMonthlyReport
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


  const updatePeriod = (period) => {
    const range = getPeriodRange(period, new Date(`${filters.date}T00:00:00`));
    setFilters({
      ...filters,
      period,
      ...range,
      date: period === 'daily' ? range.startDate : filters.date,
      month: period === 'monthly' ? filters.month : filters.month
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
    setFilters({
      ...filters,
      month: month || tomorrowMonth
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Lunch Reports</h2>
          <p className="text-slate-500 text-xs sm:text-sm">View and export lunch order reports by day, week, month, or date range</p>
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

      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 items-end">
        <div className="space-y-1 w-full">
          <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
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
        <div className="space-y-1 w-full">
          <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
            <Calendar size={12} />
            {isMonthlyReport ? 'Month' : filters.period === 'daily' ? 'Order Date' : 'Base Date'}
          </label>
          {isMonthlyReport ? (
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
            <div className="space-y-1 w-full">
              <label className="text-xs font-semibold text-slate-500 uppercase">Start Date</label>
              <SelectDate
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-1 w-full">
              <label className="text-xs font-semibold text-slate-500 uppercase">End Date</label>
              <SelectDate
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full"
              />
            </div>
          </>
        )}
        <div className="space-y-1 w-full">
          <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
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
          <div className="space-y-1 w-full">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
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
          <div className="space-y-1 w-full sm:col-span-2 lg:col-span-1">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Search size={12} />
              Search Staff
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border-none focus:ring-2 focus:ring-primary-500 transition"
                placeholder="Search staff, branch, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {isMonthlyReport && (
          <>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 text-center shrink-0">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                Report For {format(monthlyBaseDate, 'MMMM-yyyy')} ({filters.branch || 'All Branches'})
              </h3>
            </div>
            {/* Horizontal Swipe Tip Banner for Monthly Sheet on Mobile */}
            <div className="md:hidden bg-primary-50 dark:bg-primary-950/20 px-4 py-2.5 text-center border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center justify-center gap-1.5 animate-pulse shrink-0">
              <span>💡 Tip: Swipe horizontally on the calendar below to view all days</span>
            </div>
          </>
        )}

        {/* ── Desktop View Table ── */}
        <div className={cn("overflow-x-auto", !isMonthlyReport && "hidden md:block")}>
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-sm uppercase tracking-wider">
              {isMonthlyReport ? (
                <tr>
                  <th className="px-3 py-4 font-semibold text-center">No</th>
                  <th className="px-4 py-4 font-semibold min-w-[180px]">Staff Name</th>
                  <th className="px-4 py-4 font-semibold min-w-[130px]">Brand</th>
                  {Array.from({ length: daysInMonth }, (_, index) => (
                    <th key={index + 1} className="px-2 py-4 font-semibold text-center min-w-10">
                      {index + 1}
                    </th>
                  ))}
                  <th className="px-4 py-4 font-semibold text-center">Total</th>
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
                      <td colSpan={isMonthlyReport ? daysInMonth + 4 : isSummaryReport ? 6 : 4} className="px-6 py-4"><div className="h-6 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                    </tr>
                  ))
                ) : displayedReports.length === 0 ? (
                  <tr
                    key="empty"
                    className="motion-preset-fade motion-duration-200"
                  >
                    <td colSpan={isMonthlyReport ? daysInMonth + 4 : isSummaryReport ? 6 : 4} className="px-6 py-12 text-center text-slate-500">No records found for the selected criteria</td>
                  </tr>
                ) : (
                  displayedReports.map((report, index) => {
                    const rowKey = isMonthlyReport 
                      ? (report.user_id || `monthly-${index}`) 
                      : isSummaryReport 
                        ? `${report.order_date}-${report.branch}-${index}` 
                        : `${report.user_id}-${report.order_date}-${index}`;

                    return isMonthlyReport ? (
                      <tr
                        key={rowKey}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors motion-preset-fade motion-duration-200"
                      >
                        <td className="px-3 py-3 text-center text-slate-500 dark:text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{report.full_name}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{report.branch}</td>
                        {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                          const day = dayIndex + 1;
                          const status = report.days?.[day];
                          return (
                            <td key={day} className="px-1 py-2">
                              <div className={cn(
                                "mx-auto h-7 w-9 border border-slate-200 dark:border-slate-700 rounded-sm transition-colors duration-200",
                                status === 'ordered' && "bg-green-500 border-green-500",
                                status !== 'ordered' && "bg-red-500 border-red-500"
                              )} />
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center font-semibold text-slate-800 dark:text-white">{report.total}</td>
                      </tr>
                    ) : isSummaryReport ? (
                      <tr
                        key={rowKey}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors motion-preset-fade motion-duration-200"
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
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors motion-preset-fade motion-duration-200"
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
            </tbody>
          </table>
        </div>

        {/* ── Mobile View Card List (Not for Monthly reports) ── */}
        {!isMonthlyReport && (
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={`loading-card-${i}`} className="p-4 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                </div>
              ))
            ) : displayedReports.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No records found for the selected criteria</div>
            ) : (
              displayedReports.map((report, index) => {
                const cardKey = isSummaryReport 
                  ? `card-sum-${report.order_date}-${report.branch}-${index}` 
                  : `card-det-${report.user_id}-${report.order_date}-${index}`;

                return isSummaryReport ? (
                  /* Summary Card */
                  <div key={cardKey} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-base leading-snug">
                          {report.order_date ? format(parseISO(report.order_date), 'MMM dd, yyyy') : '-'}
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Summary Report</p>
                      </div>
                      <span className="px-2.5 py-1 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
                        {report.branch}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                        <span className="block text-slate-400 dark:text-slate-500 font-medium">Total Staff</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">{report.total_staff}</span>
                      </div>
                      <div className="p-2 bg-green-50/50 dark:bg-green-950/10 rounded-lg">
                        <span className="block text-green-600/70 dark:text-green-500/70 font-medium">Ordered</span>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400 font-mono">{report.ordered}</span>
                      </div>
                      <div className="p-2 bg-red-50/50 dark:bg-red-950/10 rounded-lg">
                        <span className="block text-red-600/70 dark:text-red-500/70 font-medium">Cancelled</span>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400 font-mono">{report.cancelled}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                        <span className="block text-slate-400 dark:text-slate-500 font-medium">Not Ordered</span>
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 font-mono">{report.not_ordered}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Detailed Card */
                  <div key={cardKey} className="p-4 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">{index + 1}</span>
                        <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-base leading-snug">{report.full_name}</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
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
