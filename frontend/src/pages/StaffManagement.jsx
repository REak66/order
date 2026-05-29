import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SearchSelect from '../components/SearchSelect';

const branchOptions = [
  { value: 'City Mall', label: 'City Mall' },
  { value: 'BYD 6A', label: 'BYD 6A' },
  { value: 'BYD 60M', label: 'BYD 60M' }
];


const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    branch: 'City Mall',
    password: ''
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/api/staff');
      setStaff(res.data);
    } catch (error) {
      toast.error('Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await api.put(`/api/staff/${editingStaff._id || editingStaff.id}`, formData);
        toast.success('Staff updated successfully');
      } else {
        await api.post('/api/staff', formData);
        toast.success('Staff added successfully');
      }
      setIsModalOpen(false);
      fetchStaff();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff?')) {
      try {
        await api.delete(`/api/staff/${id}`);
        toast.success('Staff deleted');
        fetchStaff();
      } catch (error) {
        toast.error('Delete failed');
      }
    }
  };

  const handleEdit = (member) => {
    setEditingStaff(member);
    setFormData({
      username: member.username || '',
      full_name: member.full_name || '',
      branch: member.branch || 'City Mall',
      password: ''
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingStaff(null);
    setFormData({
      username: '',
      full_name: '',
      branch: 'City Mall',
      password: ''
    });
  };

  const filteredStaff = staff.filter(s =>
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Staff Management</h2>
          <p className="text-slate-500">Manage company staff and their branches</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition cursor-pointer font-semibold shadow-md shadow-primary-600/10 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={20} />
          <span>Add Staff</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search staff name, username, or ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Full Name</th>
                <th className="px-6 py-4 font-semibold">Username</th>
                <th className="px-6 py-4 font-semibold">Branch</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={`loading-${i}`} className="animate-pulse">
                      <td colSpan="5" className="px-6 py-4"><div className="h-6 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                    </tr>
                  ))
                ) : filteredStaff.length === 0 ? (
                  <tr
                    key="empty"
                    className="motion-preset-fade motion-duration-200"
                  >
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">No staff found</td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => (
                    <tr
                      key={member._id || member.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors motion-preset-fade motion-duration-200"
                    >
                      <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{member.full_name}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{member.username}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 rounded-full text-xs font-semibold">
                          {member.branch}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(member)}
                          className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(member._id || member.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={`loading-card-${i}`} className="p-4 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded w-full mt-2" />
              </div>
            ))
          ) : filteredStaff.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No staff found</div>
          ) : (
            filteredStaff.map((member) => (
              <div key={member._id || member.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                {/* Header: Name and username */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-base leading-snug">{member.full_name}</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{member.username}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
                    {member.branch}
                  </span>
                </div>

                {/* Details deleted since phone is removed */}

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    onClick={() => handleEdit(member)}
                    className="flex-1 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-900/30 inline-flex items-center justify-center gap-1.5 font-semibold text-xs transition min-h-[38px] cursor-pointer"
                  >
                    <Edit2 size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(member._id || member.id)}
                    className="flex-1 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/20 inline-flex items-center justify-center gap-1.5 font-semibold text-xs transition min-h-[38px] cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Animated Overlay Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm motion-preset-fade motion-duration-200"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Animated Modal Dialog */}
          <div
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 motion-preset-fade motion-duration-200 max-h-[calc(100vh-40px)] flex flex-col"
          >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {editingStaff ? 'Edit Staff' : 'Add New Staff'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-slate-200"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Username (for Login)</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-slate-200"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                      {editingStaff ? '(leave blank to keep unchanged)' : '(leave blank to default to 123456)'}
                    </span>
                  </label>
                  <input
                    type="password"
                    placeholder={editingStaff ? "••••••••" : "Enter password (optional)"}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-slate-200"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Branch</label>
                  <SearchSelect
                    options={branchOptions}
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    placeholder="Select Branch"
                    hasSearch={true}
                    className="w-full font-semibold"
                  />
                </div>

                <div className="pt-4 flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition shadow-lg shadow-primary-600/15 cursor-pointer"
                  >
                    {editingStaff ? 'Save Changes' : 'Add Staff'}
                  </button>
                </div>
              </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
