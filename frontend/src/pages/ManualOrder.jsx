import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { Calendar, CheckCircle, Search, Utensils, XCircle, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { addDays, format } from 'date-fns';
import SearchSelect from '../components/SearchSelect';
import SelectDate from '../components/SelectDate';
import { cn } from '../utils/cx';

const todayIso = format(new Date(), 'yyyy-MM-dd');
const tomorrowIso = format(addDays(new Date(), 1), 'yyyy-MM-dd');
const branches = ['City Mall', 'BYD 6A', 'BYD 60M'];

const branchOptions = branches.map(branch => ({ value: branch, label: branch }));


const ManualOrder = () => {
  const [staff, setStaff] = useState([]);
  const [orderStatuses, setOrderStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderDate, setOrderDate] = useState(tomorrowIso);
  const [selectedBranches, setSelectedBranches] = useState({});

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchOrderStatuses(orderDate);
  }, [orderDate]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/staff');
      setStaff(res.data);
      setSelectedBranches(Object.fromEntries(
        res.data.map(member => [member._id || member.id, member.branch || 'City Mall'])
      ));
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

  const filteredStaff = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return staff;

    return staff.filter(member => (
      member.full_name?.toLowerCase().includes(term) ||
      member.username?.toLowerCase().includes(term) ||
      member.telegram_id?.toString().includes(term) ||
      member.branch?.toLowerCase().includes(term)
    ));
  }, [staff, searchTerm]);

  const updateSelectedBranch = (memberId, branch) => {
    setSelectedBranches(current => ({
      ...current,
      [memberId]: branch
    }));
  };

  const saveManualOrder = async (member, targetStatus) => {
    const memberId = member._id || member.id;
    const branch = selectedBranches[memberId] || member.branch || 'City Mall';

    if (targetStatus === 'cancelled' && orderDate !== todayIso) {
      toast.error('Cancel order is allowed only for today');
      return;
    }

    setSavingId(`${memberId}-${targetStatus}`);
    try {
      await api.post('/api/reports/manual-order', {
        userId: memberId,
        orderDate,
        status: targetStatus,
        branch
      });
      toast.success(
        targetStatus === 'ordered' 
          ? 'Manual order saved' 
          : targetStatus === 'cancelled' 
            ? 'Manual cancel saved' 
            : 'Manual order cleared'
      );
      fetchStaff();
      fetchOrderStatuses(orderDate);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save manual order');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Manual Staff Order</h2>
          <p className="text-slate-500">Add lunch orders for staff and update their branch when needed</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
            <Calendar size={12} />
            Order Date
          </label>
          <SelectDate
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            className="w-[180px]"
          />
        </div>

        <div className="space-y-1 min-w-[260px] flex-1">
          <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
            <Search size={12} />
            Search Staff
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border-none focus:ring-2 focus:ring-primary-500 transition"
              placeholder="Search name, username, ID, or branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Staff Name</th>
                <th className="px-6 py-4 font-semibold">Username</th>
                <th className="px-6 py-4 font-semibold">Telegram ID</th>
                <th className="px-6 py-4 font-semibold">Branch</th>
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
                  filteredStaff.map(member => {
                    const memberId = member._id || member.id;
                    const currentStatus = orderStatuses[memberId] || 'not_ordered';
                    const isSavingOrder = savingId === `${memberId}-ordered`;
                    const isSavingCancel = savingId === `${memberId}-cancelled`;
                    const isSavingClear = savingId === `${memberId}-not_ordered`;
                    const isRowSaving = !!savingId && savingId.startsWith(memberId);
                    
                    const isCancelDisabled = orderDate !== todayIso;

                    return (
                      <tr
                        key={memberId}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors motion-preset-fade motion-duration-200"
                      >
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{member.full_name}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">@{member.username || 'N/A'}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-sm">{member.telegram_id}</td>
                        <td className="px-6 py-4">
                          <SearchSelect
                            options={branchOptions}
                            value={selectedBranches[memberId] || member.branch || 'City Mall'}
                            onChange={(e) => updateSelectedBranch(memberId, e.target.value)}
                            placeholder="Select Branch"
                            hasSearch={true}
                            className="min-w-[145px]"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 inline-block",
                            currentStatus === 'ordered' && "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
                            currentStatus === 'cancelled' && "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
                            currentStatus === 'not_ordered' && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          )}>
                            {currentStatus === 'not_ordered' ? 'Not Order' : currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            {/* Order Button */}
                            {currentStatus !== 'ordered' && (
                              <button
                                type="button"
                                onClick={() => saveManualOrder(member, 'ordered')}
                                disabled={isRowSaving}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <CheckCircle size={14} />
                                <span>{isSavingOrder ? 'Saving...' : 'Order'}</span>
                              </button>
                            )}

                            {/* Cancel Button */}
                            {currentStatus !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => saveManualOrder(member, 'cancelled')}
                                disabled={isRowSaving || isCancelDisabled}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/10 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none dark:disabled:bg-slate-800"
                                title={isCancelDisabled ? 'Cancellation is allowed for today\'s date only' : 'Cancel Order'}
                              >
                                <XCircle size={14} />
                                <span>{isSavingCancel ? 'Saving...' : 'Cancel'}</span>
                              </button>
                            )}

                            {/* Clear Button */}
                            {currentStatus !== 'not_ordered' && (
                              <button
                                type="button"
                                onClick={() => saveManualOrder(member, 'not_ordered')}
                                disabled={isRowSaving}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <RotateCcw size={14} />
                                <span>{isSavingClear ? 'Clearing...' : 'Clear'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
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



export default ManualOrder;
