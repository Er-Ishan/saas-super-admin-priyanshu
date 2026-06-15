import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Truck, Database, Activity, TrendingUp, Users, ArrowUp, ArrowDown, Clock, CheckCircle } from 'lucide-react';
import api from '../lib/axios';

const Overview: React.FC = () => {
  const [stats, setStats] = useState({
    companies: 0,
    suppliers: 0,
    mappings: 0,
    uptime: '99.9%'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [companiesRes, suppliersRes, mappingsRes] = await Promise.all([
          api.get('/companies'),
          api.get('/suppliers'),
          api.get('/field-mappings')
        ]);
        setStats({
          companies: companiesRes.data.data?.length || 0,
          suppliers: suppliersRes.data.data?.length || 0,
          mappings: mappingsRes.data.data?.length || 0,
          uptime: '99.9%'
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { name: 'Total Companies', value: stats.companies, icon: Building2, color: 'sky', change: '+12%', trend: 'up' },
    { name: 'Total Suppliers', value: stats.suppliers, icon: Truck, color: 'indigo', change: '+8%', trend: 'up' },
    { name: 'Active Mappings', value: stats.mappings, icon: Database, color: 'emerald', change: '+23%', trend: 'up' },
    { name: 'System Status', value: stats.uptime, icon: Activity, color: 'amber', change: 'Stable', trend: 'stable' },
  ];

  return (
    <div>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Systems Overview
            </h1>
            <p className="text-slate-400 text-lg">Welcome to the Super Admin control center.</p>
          </div>
          <motion.div 
            className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/20 rounded-xl"
            animate={{
              boxShadow: ['0 0 20px rgba(14, 165, 233, 0.1)', '0 0 30px rgba(14, 165, 233, 0.2)', '0 0 20px rgba(14, 165, 233, 0.1)']
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
            <span className="text-sky-400 text-sm font-medium">System Online</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass p-6 rounded-2xl group hover:border-sky-500/30 transition-all duration-300 relative overflow-hidden"
              whileHover={{ scale: 1.02, y: -5 }}
            >
              {/* Card background glow */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                style={{
                  backgroundImage: card.color === 'sky' ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' :
                                 card.color === 'indigo' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' :
                                 card.color === 'emerald' ? 'linear-gradient(135deg, #10b981, #14b8a6)' :
                                 'linear-gradient(135deg, #f59e0b, #ef4444)'
                }}
              />
              
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                  card.color === 'sky' && "bg-sky-500/20 text-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.1)]",
                  card.color === 'indigo' && "bg-indigo-500/20 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.1)]",
                  card.color === 'emerald' && "bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
                  card.color === 'amber' && "bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                
                {card.trend !== 'stable' && (
                  <motion.div 
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                      card.trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                  >
                    {card.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {card.change}
                  </motion.div>
                )}
              </div>
              
              <div className="relative z-10">
                <p className="text-slate-400 text-sm font-medium mb-2">{card.name}</p>
                <h2 className="text-3xl font-bold text-white">
                  {loading ? (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ...
                    </motion.div>
                  ) : (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      {card.value}
                    </motion.span>
                  )}
                </h2>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Onboarding Trends */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="glass p-8 rounded-3xl relative overflow-hidden"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <TrendingUp className="w-5 h-5 text-sky-400" />
              </motion.div>
              Onboarding Trends
            </h3>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
              Coming Soon
            </span>
          </div>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/20">
            <div className="text-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              </motion.div>
              <p className="text-slate-600 text-sm italic">Analytics visualization will appear here</p>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="glass p-8 rounded-3xl relative overflow-hidden"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Users className="w-5 h-5 text-indigo-400" />
              </motion.div>
              Recent System Activity
            </h3>
            <motion.div 
              className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
              animate={{
                opacity: [1, 0.7, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Live</span>
            </motion.div>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {[
                { type: 'onboard', msg: 'New company "Aero Park" onboarded', time: '12m ago', icon: Building2, color: 'sky' },
                { type: 'mapping', msg: 'Updated Ref No field mappings', time: '45m ago', icon: Database, color: 'indigo' },
                { type: 'supplier', msg: 'Added supplier for company #2', time: '2h ago', icon: Truck, color: 'emerald' },
                { type: 'auth', msg: 'Super Admin login from new device', time: '5h ago', icon: CheckCircle, color: 'amber' }
              ].map((activity, i) => {
                const Icon = activity.icon;
                return (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-800/30 transition-all duration-200 group"
                    whileHover={{ x: 5 }}
                  >
                    <motion.div 
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activity.color === 'sky' ? 'bg-sky-500/20 text-sky-400' :
                        activity.color === 'indigo' ? 'bg-indigo-500/20 text-indigo-400' :
                        activity.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Icon className="w-4 h-4" />
                    </motion.div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-300 font-medium">{activity.msg}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <Clock className="w-3 h-3" />
                      {activity.time}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Utility function for conditional classes
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default Overview;
