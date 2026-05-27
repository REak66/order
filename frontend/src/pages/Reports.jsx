import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Download,
  CalendarRange,
  Calendar,
  Building,
  PlusCircle,
  Search,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import SearchSelect from '../components/SearchSelect';
import { cn } from '../utils/cx';

const branchOptions = [
  { value: '', label: 'All Branches' },
  { value: 'City Mall', label: 'City Mall' },
  { value: 'BYD 6A', label: 'BYD 6A' },
  { value: 'BYD 60M', label: 'BYD 60M' }
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
    branch: ''
  });
  const isMonthlyReport = filters.period === 'monthly';
  const isSummaryReport = filters.period === 'weekly';
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

  const handleManualStatus = async (report, status) => {
    try {
      await api.post('/api/reports/manual-order', {
        userId: report.user_id,
        orderDate: report.order_date,
        status
      });
      toast.success(status === 'ordered' ? 'Manual order saved' : 'Manual cancel saved');
      fetchReports();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save manual status');
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
          <p className="text-slate-500">View and export lunch order reports by day, week, month, or date range</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition"
          >
            <Download size={18} />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
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
            className="min-w-[150px]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
            <Calendar size={12} />
            {isMonthlyReport ? 'Month' : filters.period === 'daily' ? 'Order Date' : 'Base Date'}
          </label>
          <input
            type={isMonthlyReport ? 'month' : 'date'}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border-none focus:ring-2 focus:ring-primary-500 transition"
            value={isMonthlyReport ? filters.month : filters.date}
            onChange={(e) => isMonthlyReport ? updateMonth(e.target.value) : updateDate(e.target.value)}
          />
        </div>
        {filters.period === 'custom' && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Start Date</label>
              <input
                type="date"
                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border-none focus:ring-2 focus:ring-primary-500 transition"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">End Date</label>
              <input
                type="date"
                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border-none focus:ring-2 focus:ring-primary-500 transition"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </>
        )}
        <div className="space-y-1">
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
            className="min-w-[150px]"
          />
        </div>
        {!isSummaryReport && (
          <div className="space-y-1 min-w-[240px] flex-1">
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
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 text-center">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
              Report For {format(monthlyBaseDate, 'MMMM-yyyy')} ({filters.branch || 'All Branches'})
            </h3>
          </div>
        )}
        <div className="overflow-x-auto">
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
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">

                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={`loading-${i}`} className="animate-pulse">
                      <td colSpan={isMonthlyReport ? daysInMonth + 4 : isSummaryReport ? 6 : 5} className="px-6 py-4"><div className="h-6 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                    </tr>
                  ))
                ) : displayedReports.length === 0 ? (
                  <tr
                    key="empty"
                    className="motion-preset-fade motion-duration-350"
                  >
                    <td colSpan={isMonthlyReport ? daysInMonth + 4 : isSummaryReport ? 6 : 5} className="px-6 py-12 text-center text-slate-500">No records found for the selected criteria</td>
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
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors motion-preset-fade motion-duration-350"
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
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors motion-preset-fade motion-duration-350"
                      >
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {report.order_date ? format(new Date(report.order_date), 'MMM dd, yyyy') : '-'}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{report.branch}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{report.total_staff}</td>
                        <td className="px-6 py-4 font-semibold text-green-600 dark:text-green-400">{report.ordered}</td>
                        <td className="px-6 py-4 font-semibold text-red-600 dark:text-red-400">{report.cancelled}</td>
                        <td className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">{report.not_ordered}</td>
                      </tr>
                    ) : (
                      (() => {
                        const canCancelToday = report.order_date === todayIso;
                        const cancelDisabled = report.status === 'cancelled' || !canCancelToday;

                        return (
                          <tr
                            key={rowKey}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors motion-preset-fade motion-duration-350"
                          >
                            <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{report.full_name}</td>
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{report.branch}</td>
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                              {report.order_date ? format(new Date(report.order_date), 'MMM dd, yyyy') : '-'}
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
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleManualStatus(report, 'ordered')}
                                  disabled={report.status === 'ordered'}
                                  className={cn(
                                    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
                                    report.status === 'ordered'
                                      ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 hover:scale-100 active:scale-100"
                                      : "bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/5"
                                  )}
                                >
                                  <PlusCircle size={16} />
                                  <span>{report.status === 'ordered' ? 'Ordered' : 'Order'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleManualStatus(report, 'cancelled')}
                                  disabled={cancelDisabled}
                                  title={!canCancelToday ? 'Cancel is allowed only for today' : undefined}
                                  className={cn(
                                    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
                                    cancelDisabled
                                      ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 hover:scale-100 active:scale-100"
                                      : "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/5"
                                  )}
                                >
                                  <XCircle size={16} />
                                  <span>{report.status === 'cancelled' ? 'Cancelled' : 'Cancel'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })()
                    );
                  })
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};



export default Reports;
