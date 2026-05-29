import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { LogIn, ShieldCheck, User, ChevronRight } from 'lucide-react';

const Login = ({ isAdminMode = false }) => {
  // Admin form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Staff login form
  const [phoneNumber, setPhoneNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, staffLogin } = useAuth();
  const navigate = useNavigate();

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(username, password);
      toast.success('Welcome back, Admin!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await staffLogin(phoneNumber.trim());
      toast.success('Welcome! Redirecting to your portal...');
      navigate('/staff-portal');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 px-4 overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[5%] w-72 h-72 md:w-[450px] md:h-[450px] rounded-full bg-primary-400/20 dark:bg-primary-900/10 blur-[80px] md:blur-[120px]" />
        <div className="absolute bottom-[10%] right-[5%] w-72 h-72 md:w-[450px] md:h-[450px] rounded-full bg-pink-400/15 dark:bg-violet-900/10 blur-[80px] md:blur-[120px]" />
      </div>

      {/* Glass card */}
      <div className="relative z-10 max-w-md w-full bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-800/80 overflow-hidden motion-preset-fade motion-duration-200">
        <div className="p-8 md:p-10">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary-500 rounded-2xl text-white shadow-lg shadow-primary-500/30 transition-all duration-200 hover:scale-105 hover:rotate-3 cursor-pointer">
              {isAdminMode ? <ShieldCheck size={32} /> : <LogIn size={32} />}
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-slate-800 dark:text-white mb-2 tracking-tight">
            {isAdminMode ? 'Admin Dashboard' : 'Staff Lunch Portal'}
          </h2>
          <p className="text-center text-slate-500 dark:text-slate-400 mb-6 font-medium text-sm">
            {isAdminMode ? 'Sign in to manage lunch schedules and orders' : 'Sign in to place your lunch order'}
          </p>

          {/* ── STAFF TAB (Default / Public) ── */}
          {!isAdminMode ? (
            <div className="motion-preset-fade motion-duration-200">
              <form onSubmit={handleStaffLogin} className="space-y-5 motion-preset-fade motion-duration-200">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <input
                    id="staff-phone"
                    type="tel"
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950/50 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-800 dark:text-slate-200 shadow-sm focus:scale-[1.01]"
                    placeholder="e.g. 0xx-xxx-xxxx"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-lg shadow-primary-600/25 transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2 text-sm md:text-base cursor-pointer"
                >
                  {isSubmitting ? 'Signing in...' : (
                    <>Sign In <ChevronRight size={18} /></>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* ── ADMIN TAB (Hidden Route) ── */
            <form onSubmit={handleAdminSubmit} className="space-y-6 motion-preset-fade motion-duration-200">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Username
                </label>
                <input
                  id="admin-username"
                  type="text"
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950/50 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-800 dark:text-slate-200 shadow-sm focus:scale-[1.01]"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950/50 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-800 dark:text-slate-200 shadow-sm focus:scale-[1.01]"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-2xl shadow-lg transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center text-sm md:text-base cursor-pointer"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In as Admin'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
