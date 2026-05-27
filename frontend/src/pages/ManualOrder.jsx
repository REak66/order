import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { Calendar, CheckCircle, Search, Utensils, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { addDays, format } from 'date-fns';
import SearchSelect from '../components/SearchSelect';
import { cn } from '../utils/cx';

const todayIso = format(new Date(), 'yyyy-MM-dd');
const tomorrowIso = format(addDays(new Date(), 1), 'yyyy-MM-dd');
const branches = ['City Mall', 'BYD 6A', 'BYD 60M'];

const branchOptions = branches.map(branch => ({ value: branch, label: branch }));
const statusOptions = [
  { value: 'ordered', label: 'Ordered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'not_ordered', label: 'Not Order' }
];


const ManualOrder = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderDate, setOrderDate] = useState(tomorrowIso);
  const [status, setStatus] = useState('ordered');
  const [selectedBranches, setSelectedBranches] = useState({});

  useEffect(() => {
    fetchStaff();
  }, []);

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

  const saveManualOrder = async (member) => {
    const memberId = member._id || member.id;
    const branch = selectedBranches[memberId] || member.branch || 'City Mall';

    if (status === 'cancelled' && orderDate !== todayIso) {
      toast.error('Cancel order is allowed only for today');
      return;
    }

    setSavingId(memberId);
    try {
      await api.post('/api/reports/manual-order', {
        userId: memberId,
        orderDate,
        status,
        branch
      });
      toast.success(status === 'ordered' ? 'Manual order saved' : status === 'cancelled' ? 'Manual cancel saved' : 'Manual order cleared');
      fetchStaff();
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
          <input
            type="date"
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none border-none focus:ring-2 focus:ring-primary-500 transition"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
            <Utensils size={12} />
            Status
          </label>
          <SearchSelect
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="Select Status"
            hasSearch={false}
            className="min-w-[160px]"
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
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">

                {loading ? (
                  [1, 2, 3].map(item => (
                    <tr key={`loading-${item}`} className="animate-pulse">
                      <td colSpan="5" className="px-6 py-4">
                        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded" />
                      </td>
                    </tr>
                  ))
                ) : filteredStaff.length === 0 ? (
                  <tr
                    key="empty"
                    className="motion-preset-fade motion-duration-350"
                  >
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">No staff found</td>
                  </tr>
                ) : (
                  filteredStaff.map(member => {
                    const memberId = member._id || member.id;
                    const isSaving = savingId === memberId;
                    const isCancelBlocked = status === 'cancelled' && orderDate !== todayIso;

                    return (
                      <tr
                        key={memberId}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors motion-preset-fade motion-duration-350"
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
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => saveManualOrder(member)}
                            disabled={isSaving || isCancelBlocked}
                            className={cn(
                              "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
                              isSaving || isCancelBlocked
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 hover:scale-100 active:scale-100"
                                : status === 'cancelled'
                                  ? "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/10"
                                  : "bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-600/10"
                            )}
                          >
                            {status === 'cancelled' ? <XCircle size={16} /> : <CheckCircle size={16} />}
                            <span>{isSaving ? 'Saving...' : status === 'ordered' ? 'Save Order' : status === 'cancelled' ? 'Save Cancel' : 'Clear Order'}</span>
                          </button>
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
