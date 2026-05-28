import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { format, parseISO } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    let formattedDate = label;
    try {
      const date = parseISO(label);
      if (!isNaN(date.getTime())) {
        formattedDate = format(date, 'EEEE, MMM dd, yyyy');
      }
    } catch (e) {
      // fallback
    }

    return (
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl transition-all duration-300">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">{formattedDate}</p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Orders: <span className="text-primary-500 dark:text-primary-400 text-base font-extrabold ml-1">{payload[0].value}</span>
          </p>
        </div>
      </div>
    );
  }

  return null;
};


const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStaff: 0,
    lunchDate: '',
    ordered: 0,
    cancelled: 0,
    notOrdered: 0
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, chartRes] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/dashboard/charts')
      ]);
      setStats(statsRes.data);
      setChartData(chartRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Staff', value: stats.totalStaff, icon: Users, color: 'bg-blue-500' },
    { label: 'Ordered', value: stats.ordered, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'bg-red-500' },
    { label: 'Not Ordered', value: stats.notOrdered, icon: AlertCircle, color: 'bg-orange-500' },
  ];

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
    </div>
    <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
  </div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Overview</h2>
        <p className="text-slate-500">
          Real-time lunch order statistics for tomorrow{stats.lunchDate ? ` (${stats.lunchDate})` : ''}
        </p>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 motion-preset-fade motion-duration-200"
      >
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-none"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl text-white ${card.color}`}>
                <card.icon size={24} />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{card.value}</h3>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div
        className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 motion-preset-fade motion-duration-200 motion-delay-150"
      >
        <div className="flex items-center gap-2 mb-8">
          <TrendingUp className="text-primary-500" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Last 7 Days Orders</h3>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200/60 dark:stroke-slate-800/60" stroke="none" />
              <XAxis
                dataKey="order_date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                dy={10}
                tickFormatter={(value) => {
                  try {
                    const date = parseISO(value);
                    if (!isNaN(date.getTime())) {
                      return format(date, 'MMM dd');
                    }
                  } catch (e) { }
                  return value;
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                content={<CustomTooltip />}
              />
              <Bar
                dataKey="total"
                radius={[6, 6, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill="url(#orderGradient)"
                    opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.45}
                    onMouseEnter={() => setHoveredIndex(index)}
                    className="transition-all duration-300 cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
