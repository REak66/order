import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Upload,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SearchSelect from '../components/SearchSelect';
import * as XLSX from 'xlsx';

const branchOptions = [
  { value: 'City Mall', label: 'City Mall' },
  { value: 'BYD 6A', label: 'BYD 6A' },
  { value: 'BYD 60M', label: 'BYD 60M' }
];

const CustomSelect = ({ label, placeholder, options, value, onChange, onAddNew, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition text-sm text-slate-700 dark:text-slate-200 text-left pr-8 relative font-semibold shadow-sm hover:bg-slate-100/50 dark:hover:bg-slate-800/60 flex justify-between items-center cursor-pointer min-h-[46px]"
      >
        <span className={value ? "text-slate-800 dark:text-slate-200 font-semibold" : "text-slate-400 dark:text-slate-500 font-normal"}>
          {value || placeholder}
        </span>
        <svg className={`shrink-0 size-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 max-h-52 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <div
            onClick={() => { onChange(''); setIsOpen(false); }}
            className={`text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors px-3 py-2 flex items-center justify-between cursor-pointer ${!value ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
          >
            <span>{placeholder}</span>
            {!value && (
              <svg className="shrink-0 size-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </div>
          
          {options.map((opt) => {
            const isSelected = value === opt;
            return (
              <div
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors px-3 py-2 flex items-center justify-between cursor-pointer group ${isSelected ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
              >
                <span>{opt}</span>
                <div className="flex items-center gap-1.5">
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(opt);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title={`Delete ${opt}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  {isSelected && (
                    <svg className="shrink-0 size-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
          
          <div className="border-t border-slate-100 dark:border-slate-800/60 my-1 pt-1 shrink-0">
            <div
              onClick={() => { onAddNew(); setIsOpen(false); }}
              className="text-sm font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/10 rounded-lg transition-colors px-3 py-2 flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕ Add New...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TableBranchSelect = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef(null);
  const options = ['City Mall', 'BYD 6A', 'BYD 60M'];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary-500 font-semibold flex justify-between items-center cursor-pointer min-h-[30px] shadow-sm hover:bg-slate-100/50 dark:hover:bg-slate-800/60"
      >
        <span>{value}</span>
        <svg className={`shrink-0 size-3 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 z-50 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-lg p-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((opt) => {
            const isSelected = value === opt;
            return (
              <div
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md transition-colors px-2.5 py-1.5 flex items-center justify-between cursor-pointer ${isSelected ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
              >
                <span>{opt}</span>
                {isSelected && (
                  <svg className="shrink-0 size-3 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const [showNewPositionInput, setShowNewPositionInput] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [showNewDepartmentInput, setShowNewDepartmentInput] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    branch: 'City Mall',
    password: '',
    byd_id: '',
    hx_id: '',
    position: '',
    department: ''
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [importFileName, setImportFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);

  const handleDownloadTemplate = () => {
    const headers = [
      ['Full Name', 'Username', 'Branch', 'Password', 'BYD ID', 'HX ID', 'Position', 'Department'],
      ['Chao Vireak', 'vireak_chao', 'City Mall', '123456', 'BYD-001', 'HX-901', 'Software Engineer', 'Technology'],
      ['Ly Sokha', 'sokha_ly', 'BYD 6A', '123456', 'BYD-002', 'HX-902', 'QA Engineer', 'Technology']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Template');
    XLSX.writeFile(wb, 'staff_import_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        
        const mapped = rows.map((row) => ({
          full_name: row['Full Name'] || '',
          username: row['Username'] || '',
          branch: row['Branch'] || 'City Mall',
          password: row['Password'] || '',
          byd_id: row['BYD ID'] || '',
          hx_id: row['HX ID'] || '',
          position: row['Position'] || '',
          department: row['Department'] || ''
        }));
        
        setParsedRows(mapped);
      } catch (err) {
        toast.error('Failed to parse Excel file');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleGenerate = () => {
    if (parsedRows.length === 0) {
      toast.error('Please browse and select a valid Excel file first');
      return;
    }
    setImportStep(2);
  };

  const handleParsedRowChange = (index, field, val) => {
    setParsedRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: val } : row));
  };

  const handleParsedRowDelete = (index) => {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmImport = async () => {
    const invalid = parsedRows.some(r => !r.full_name?.trim() || !r.username?.trim());
    if (invalid) {
      toast.error('All rows must have a Full Name and a Username');
      return;
    }

    try {
      const res = await api.post('/api/staff/import', parsedRows);
      const { importedCount, skippedCount } = res.data;
      
      if (importedCount > 0) {
        toast.success(`Imported ${importedCount} staff members!`);
      }
      
      if (skippedCount > 0) {
        toast.error(`${skippedCount} duplicate or invalid usernames were skipped.`, { duration: 5000 });
      }
      
      setIsImportModalOpen(false);
      setImportStep(1);
      setImportFileName('');
      setParsedRows([]);
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk import failed');
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchPositions();
    fetchDepartments();
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

  const fetchPositions = async () => {
    try {
      const res = await api.get('/api/staff/positions');
      setPositions(res.data.map(p => p.name));
    } catch (error) {
      console.error('Failed to fetch positions', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/api/staff/departments');
      setDepartments(res.data.map(d => d.name));
    } catch (error) {
      console.error('Failed to fetch departments', error);
    }
  };

  const handleAddNewPosition = async () => {
    if (!newPositionName || !newPositionName.trim()) {
      toast.error('Position name is required');
      return;
    }
    try {
      const res = await api.post('/api/staff/positions', { name: newPositionName.trim() });
      toast.success('Position added successfully');
      setPositions(prev => [...prev, res.data.name].sort());
      setFormData(prev => ({ ...prev, position: res.data.name }));
      setShowNewPositionInput(false);
      setNewPositionName('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add position');
    }
  };

  const handleAddNewDepartment = async () => {
    if (!newDepartmentName || !newDepartmentName.trim()) {
      toast.error('Department name is required');
      return;
    }
    try {
      const res = await api.post('/api/staff/departments', { name: newDepartmentName.trim() });
      toast.success('Department added successfully');
      setDepartments(prev => [...prev, res.data.name].sort());
      setFormData(prev => ({ ...prev, department: res.data.name }));
      setShowNewDepartmentInput(false);
      setNewDepartmentName('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add department');
    }
  };

  const handleDeletePosition = async (posName) => {
    if (!window.confirm(`Are you sure you want to delete the position "${posName}"?`)) {
      return;
    }
    try {
      await api.delete(`/api/staff/positions/${encodeURIComponent(posName)}`);
      toast.success(`Deleted position "${posName}"`);
      setPositions(prev => prev.filter(p => p !== posName));
      if (formData.position === posName) {
        setFormData(prev => ({ ...prev, position: '' }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to delete position "${posName}"`);
    }
  };

  const handleDeleteDepartment = async (deptName) => {
    if (!window.confirm(`Are you sure you want to delete the department "${deptName}"?`)) {
      return;
    }
    try {
      await api.delete(`/api/staff/departments/${encodeURIComponent(deptName)}`);
      toast.success(`Deleted department "${deptName}"`);
      setDepartments(prev => prev.filter(d => d !== deptName));
      if (formData.department === deptName) {
        setFormData(prev => ({ ...prev, department: '' }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to delete department "${deptName}"`);
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
      password: '',
      byd_id: member.byd_id || '',
      hx_id: member.hx_id || '',
      position: member.position || '',
      department: member.department || ''
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingStaff(null);
    setFormData({
      username: '',
      full_name: '',
      branch: 'City Mall',
      password: '',
      byd_id: '',
      hx_id: '',
      position: '',
      department: ''
    });
    setShowNewPositionInput(false);
    setNewPositionName('');
    setShowNewDepartmentInput(false);
    setNewDepartmentName('');
  };

  const filteredStaff = staff.filter(s => {
    // 1. Text Search Filter
    const matchesSearch = !searchTerm.trim() || (
      s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.byd_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.hx_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // 2. Position Select Filter
    const matchesPosition = !selectedPosition || s.position === selectedPosition;
    
    // 3. Department Select Filter
    const matchesDepartment = !selectedDepartment || s.department === selectedDepartment;
    
    // 4. Branch Select Filter
    const matchesBranch = !selectedBranch || s.branch === selectedBranch;
    
    return matchesSearch && matchesPosition && matchesDepartment && matchesBranch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Staff Management</h2>
          <p className="text-slate-500 text-xs sm:text-sm">Manage company staff and their details</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              setImportStep(1);
              setImportFileName('');
              setParsedRows([]);
              setIsImportModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer font-semibold shadow-md shadow-emerald-600/10 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto text-sm shrink-0"
          >
            <Upload size={18} />
            <span>Import Excel</span>
          </button>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition cursor-pointer font-semibold shadow-md shadow-primary-600/10 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto text-sm shrink-0"
          >
            <Plus size={20} />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          <div className="relative w-full xl:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search staff, ID, name..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition text-slate-800 dark:text-slate-200 text-sm font-semibold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full xl:w-auto xl:min-w-[600px] shrink-0">
            <div>
              <SearchSelect
                options={positions.map(p => ({ value: p, label: p }))}
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                placeholder="All Positions"
                hasSearch={true}
                className="w-full font-semibold"
              />
            </div>
            <div>
              <SearchSelect
                options={departments.map(d => ({ value: d, label: d }))}
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                placeholder="All Departments"
                hasSearch={true}
                className="w-full font-semibold"
              />
            </div>
            <div>
              <SearchSelect
                options={branchOptions}
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                placeholder="All Branches"
                hasSearch={false}
                className="w-full font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left table-auto">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-4 font-semibold text-center w-12">No.</th>
                <th className="px-4 py-4 font-semibold">BYD ID</th>
                <th className="px-4 py-4 font-semibold">HX ID</th>
                <th className="px-4 py-4 font-semibold">Full Name</th>
                <th className="px-4 py-4 font-semibold">Username</th>
                <th className="px-4 py-4 font-semibold">Position</th>
                <th className="px-4 py-4 font-semibold">Department</th>
                <th className="px-4 py-4 font-semibold">Branch</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={`loading-${i}`} className="animate-pulse">
                      <td colSpan="9" className="px-6 py-4"><div className="h-6 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                    </tr>
                  ))
                ) : filteredStaff.length === 0 ? (
                  <tr
                    key="empty"
                    className="motion-preset-fade motion-duration-200"
                  >
                    <td colSpan="9" className="px-6 py-12 text-center text-slate-500">No staff found</td>
                  </tr>
                ) : (
                  filteredStaff.map((member, index) => (
                    <tr
                      key={member._id || member.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors motion-preset-fade motion-duration-200"
                    >
                      <td className="px-4 py-4 text-center font-medium text-slate-400 dark:text-slate-500">{index + 1}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">{member.byd_id || <span className="text-slate-300 dark:text-slate-700">—</span>}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">{member.hx_id || <span className="text-slate-300 dark:text-slate-700">—</span>}</td>
                      <td className="px-4 py-4 font-medium text-slate-800 dark:text-white">{member.full_name}</td>
                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400">{member.username}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                        {member.position ? (
                          <span className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium">
                            {member.position}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                        {member.department ? (
                          <span className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium">
                            {member.department}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-3 py-1 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 rounded-full text-xs font-semibold">
                          {member.branch}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleEdit(member)}
                          className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(member._id || member.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors cursor-pointer"
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
            filteredStaff.map((member, index) => (
              <div key={member._id || member.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                {/* Header: Name and username */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">#{index + 1}</span>
                      <h4 className="font-bold text-slate-800 dark:text-white text-base leading-snug">{member.full_name}</h4>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{member.username}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
                    {member.branch}
                  </span>
                </div>

                {/* Details Badges */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-b border-slate-50 dark:border-slate-800/40 py-2.5 my-2">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Position</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{member.position || <span className="text-slate-300 dark:text-slate-700">—</span>}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Department</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{member.department || <span className="text-slate-300 dark:text-slate-700">—</span>}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">BYD ID</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">{member.byd_id || <span className="text-slate-300 dark:text-slate-700">—</span>}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold tracking-wider">HX ID</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">{member.hx_id || <span className="text-slate-300 dark:text-slate-700">—</span>}</span>
                  </div>
                </div>

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
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Animated Overlay Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm motion-preset-fade motion-duration-200"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Animated Modal Dialog */}
          {/* Animated Modal Dialog */}
          <form
            onSubmit={handleSubmit}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 motion-preset-fade motion-duration-200 max-h-[calc(100vh-40px)] flex flex-col"
          >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {editingStaff ? 'Edit Staff' : 'Add New Staff'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-slate-200"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-slate-200"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Branch *</label>
                    <SearchSelect
                      options={branchOptions}
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      placeholder="Select Branch"
                      hasSearch={true}
                      className="w-full font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Password <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                        {editingStaff ? '(leave blank to keep unchanged)' : '(defaults to 123456)'}
                      </span>
                    </label>
                    <input
                      type="password"
                      placeholder={editingStaff ? "••••••••" : "Enter password (optional)"}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-slate-200"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">BYD ID (optional)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-slate-200"
                      value={formData.byd_id}
                      onChange={(e) => setFormData({ ...formData, byd_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">HX ID (optional)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-slate-200"
                      value={formData.hx_id}
                      onChange={(e) => setFormData({ ...formData, hx_id: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  {showNewPositionInput ? (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Position (optional)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter new position"
                          className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-slate-200"
                          value={newPositionName}
                          onChange={(e) => setNewPositionName(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleAddNewPosition}
                          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold cursor-pointer shrink-0"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewPositionInput(false);
                            setFormData({ ...formData, position: '' });
                          }}
                          className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <CustomSelect
                      label="Position (optional)"
                      placeholder="Select Position"
                      options={positions}
                      value={formData.position}
                      onChange={(val) => setFormData({ ...formData, position: val })}
                      onAddNew={() => {
                        setShowNewPositionInput(true);
                        setNewPositionName('');
                      }}
                      onDelete={handleDeletePosition}
                    />
                  )}
                </div>

                <div>
                  {showNewDepartmentInput ? (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Department (optional)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter new department"
                          className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-slate-200"
                          value={newDepartmentName}
                          onChange={(e) => setNewDepartmentName(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleAddNewDepartment}
                          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold cursor-pointer shrink-0"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewDepartmentInput(false);
                            setFormData({ ...formData, department: '' });
                          }}
                          className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <CustomSelect
                      label="Department (optional)"
                      placeholder="Select Department"
                      options={departments}
                      value={formData.department}
                      onChange={(val) => setFormData({ ...formData, department: val })}
                      onAddNew={() => {
                        setShowNewDepartmentInput(true);
                        setNewDepartmentName('');
                      }}
                      onDelete={handleDeleteDepartment}
                    />
                  )}
                </div>

                {/* Spacer to prevent absolute select dropdown clipping at the bottom of the scroll container */}
                <div className="h-32 shrink-0" />
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition shadow-lg shadow-primary-600/15 cursor-pointer animate-duration-200 text-sm"
                >
                  {editingStaff ? 'Save Changes' : 'Add Staff'}
                </button>
              </div>
          </form>
        </div>,
        document.body
      )}

      {/* Import Modal */}
      {isImportModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Animated Overlay Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm motion-preset-fade motion-duration-200"
            onClick={() => setIsImportModalOpen(false)}
          />

          {/* Animated Modal Dialog */}
          <div
            className={`relative w-full ${importStep === 1 ? 'max-w-lg' : 'max-w-6xl'} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 motion-preset-fade motion-duration-200 max-h-[calc(100vh-40px)] flex flex-col transition-all duration-300`}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Upload className="text-emerald-600 dark:text-emerald-400" size={24} />
                <span>{importStep === 1 ? 'Import File' : 'Check & Confirm Import'}</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            {importStep === 1 ? (
              <div className="p-6 space-y-6">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  Select an Excel file (`.xlsx`, `.xls`) to import staff list. Make sure the file matches the required template format.
                </p>

                {/* Browse input field container matching screenshot */}
                <div className="flex border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary-500/20 transition">
                  <input
                    type="text"
                    readOnly
                    placeholder="Upload File..."
                    className="flex-1 px-4 py-3 bg-transparent text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none text-sm font-semibold"
                    value={importFileName}
                  />
                  <label className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold border-l border-slate-200 dark:border-slate-700 cursor-pointer transition flex items-center justify-center text-sm shrink-0 select-none">
                    Browse
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60 shrink-0 w-full">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/80 transition flex items-center justify-center gap-1.5 cursor-pointer text-sm shrink-0 w-full sm:w-auto"
                  >
                    <X size={16} />
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-sm shadow-md shadow-emerald-600/10 shrink-0 w-full sm:w-auto"
                  >
                    <Download size={16} />
                    Download Template
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-sm shadow-md shadow-primary-600/10 shrink-0 w-full sm:w-auto"
                  >
                    <Upload size={16} />
                    Generate
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden min-h-0 w-full">
                {/* Spacious spreadsheet scroll block */}
                <div className="flex-1 overflow-auto px-6 py-2 min-h-0 w-full">
                  <table className="w-full text-left table-auto border-collapse min-w-[1000px] border border-slate-200 dark:border-slate-800">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] uppercase font-bold tracking-wider z-10">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-12 border-b border-slate-200 dark:border-slate-800">No.</th>
                        <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">BYD ID</th>
                        <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">HX ID</th>
                        <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">Full Name *</th>
                        <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">Username *</th>
                        <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">Position</th>
                        <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">Department</th>
                        <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">Branch *</th>
                        <th className="px-3 py-2.5 text-center w-16 border-b border-slate-200 dark:border-slate-800">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="px-3 py-2 text-center text-slate-400 font-bold border-r border-slate-100 dark:border-slate-800/60 w-12 shrink-0">
                            {idx + 1}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary-500 font-medium"
                              value={row.byd_id}
                              onChange={(e) => handleParsedRowChange(idx, 'byd_id', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary-500 font-medium"
                              value={row.hx_id}
                              onChange={(e) => handleParsedRowChange(idx, 'hx_id', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              required
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary-500 font-medium"
                              value={row.full_name}
                              onChange={(e) => handleParsedRowChange(idx, 'full_name', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              required
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary-500 font-medium"
                              value={row.username}
                              onChange={(e) => handleParsedRowChange(idx, 'username', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary-500 font-medium"
                              value={row.position}
                              onChange={(e) => handleParsedRowChange(idx, 'position', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary-500 font-medium"
                              value={row.department}
                              onChange={(e) => handleParsedRowChange(idx, 'department', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <TableBranchSelect
                              value={row.branch}
                              onChange={(val) => handleParsedRowChange(idx, 'branch', val)}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleParsedRowDelete(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-end gap-3 shrink-0 w-full">
                  <button
                    type="button"
                    onClick={() => setImportStep(1)}
                    className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/80 transition flex items-center justify-center gap-1.5 cursor-pointer text-sm shrink-0 w-full sm:w-auto"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md shadow-primary-600/10 transition flex items-center justify-center gap-1.5 cursor-pointer text-sm shrink-0 w-full sm:w-auto"
                  >
                    Confirm Import
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StaffManagement;
