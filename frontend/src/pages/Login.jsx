import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(username, password);
      toast.success('Login successful!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 px-4 overflow-hidden">
      {/* Decorative Animated Mesh Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-[10%] left-[5%] w-72 h-72 md:w-[450px] md:h-[450px] rounded-full bg-primary-400/20 dark:bg-primary-900/10 blur-[80px] md:blur-[120px] motion-preset-fade motion-duration-200"
        />
        <div
          className="absolute bottom-[10%] right-[5%] w-72 h-72 md:w-[450px] md:h-[450px] rounded-full bg-pink-400/15 dark:bg-violet-900/10 blur-[80px] md:blur-[120px] motion-preset-fade motion-duration-200"
        />
      </div>

      {/* Main glass card container */}
      <div
        className="relative z-10 max-w-md w-full bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-800/80 overflow-hidden motion-preset-fade motion-duration-200"
      >
        <div className="p-8 md:p-10">
          <div className="flex justify-center mb-6">
            <div
              className="p-4 bg-primary-500 rounded-2xl text-white shadow-lg shadow-primary-500/30 transition-all duration-200 hover:scale-105 hover:rotate-3 active:scale-95 cursor-pointer"
            >
              <LogIn size={32} />
            </div>
          </div>

          <h2 
            className="text-2xl md:text-3xl font-extrabold text-center text-slate-800 dark:text-white mb-2 tracking-tight"
          >
            Staff Lunch Admin
          </h2>
          
          <p 
            className="text-center text-slate-500 dark:text-slate-400 mb-8 font-medium text-sm"
          >
            Enter credentials to manage company lunch schedules
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Username
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950/50 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 outline-none transition-all text-slate-800 dark:text-slate-200 shadow-sm focus:scale-[1.01]"
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
                type="password"
                required
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950/50 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 outline-none transition-all text-slate-800 dark:text-slate-200 shadow-sm focus:scale-[1.01]"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-lg shadow-primary-600/25 transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center text-sm md:text-base cursor-pointer"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
