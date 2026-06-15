import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Settings2, 
  Building2, 
  Truck, 
  LogOut, 
  Menu, 
  X,
  Shield,
  Bell,
  ChevronRight,
  ClipboardList,
  Users,
  MessageSquare,
  Plane
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DashboardLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard, description: 'System dashboard', permission: 'access_overview' },
    { name: 'Users', path: '/users', icon: Users, description: 'User management', permission: 'access_users' },
    { name: 'Field Mappings', path: '/field-mappings', icon: Settings2, description: 'Manage field mappings', permission: 'access_field_mappings' },
    { name: 'Companies', path: '/companies', icon: Building2, description: 'Company management', permission: 'access_companies' },
    { name: 'Bookings', path: '/bookings', icon: ClipboardList, description: 'Company bookings', permission: 'access_bookings' },
    { name: 'Suppliers', path: '/suppliers', icon: Truck, description: 'Supplier management', permission: 'access_suppliers' },
    { name: 'Airports', path: '/airports', icon: Plane, description: 'Global airport registry', permission: 'access_airports' },
    { name: 'Support Center', path: '/support-center', icon: MessageSquare, description: 'Resolved admin tickets', permission: 'resolve_admin_support' },
    { name: 'Access Control', path: '/access-control', icon: Shield, description: 'Manage roles', permission: 'access_access_control' },
  ];

  const { hasPermission } = useAuth();
  const visibleNavItems = navItems.filter(item => hasPermission(item.permission));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-slate-800/50 bg-slate-900/30 backdrop-blur-xl">
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-8 flex items-center gap-3 border-b border-slate-800/50"
        >
          <motion.div 
            className="w-10 h-10 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center border border-sky-500/30 shadow-lg shadow-sky-500/20"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Shield className="w-6 h-6 text-sky-400" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Super <span className="text-sky-400">Box</span></h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Admin Portal</p>
          </div>
        </motion.div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {visibleNavItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                    isActive 
                      ? "bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-[0_0_20px_rgba(14,165,233,0.1)]" 
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div 
                      layoutId="activeNav"
                      className="absolute left-0 w-1 h-6 bg-sky-500 rounded-r-full"
                    />
                  )}
                  
                  {/* Hover background */}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-sky-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  />
                  
                  <Icon className={cn("w-5 h-5 relative z-10 transition-transform duration-200", 
                    isActive ? "text-sky-400" : "group-hover:text-slate-200 group-hover:scale-110"
                  )} />
                  
                  <div className="flex-1 relative z-10">
                    <span className="font-medium block">{item.name}</span>
                    <span className="text-xs opacity-60 block">{item.description}</span>
                  </div>
                  
                  <ChevronRight className={cn(
                    "ml-auto w-4 h-4 transition-all duration-200 relative z-10", 
                    isActive ? "opacity-40" : "opacity-0 group-hover:opacity-100 group-hover:translate-x-1"
                  )} />
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 border-t border-slate-800/50"
        >
          <motion.div 
            className="flex items-center gap-3 mb-6 px-2 group cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 rounded-full border border-slate-600/50 flex items-center justify-center text-sm font-bold text-slate-300">
                {user?.name?.charAt(0)}
              </div>
              <motion.div 
                className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </motion.div>
          
          <motion.button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 rounded-xl transition-all duration-200 font-medium border border-transparent hover:border-rose-500/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </motion.button>
        </motion.div>
      </aside>

      {/* Mobile Header */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="lg:hidden fixed top-0 left-0 right-0 h-16 glass z-40 px-4 flex items-center justify-between border-b border-slate-800/50"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Shield className="w-6 h-6 text-sky-400" />
          </motion.div>
          <span className="font-bold text-white">SuperBox</span>
        </div>
        
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-slate-400 hover:text-white relative"
          >
            <Bell className="w-5 h-5" />
            <motion.div 
              className="absolute top-1 right-1 w-2 h-2 bg-rose-400 rounded-full"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.button>
          
          <motion.button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="lg:hidden fixed inset-0 z-30 bg-slate-950 p-6 pt-24"
          >
            <nav className="space-y-4">
              {visibleNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl",
                      isActive ? "bg-sky-500/10 text-sky-400" : "text-slate-400"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-lg font-medium">{item.name}</span>
                  </Link>
                );
              })}
              <button
                onClick={logout}
                className="w-full flex items-center gap-4 p-4 text-rose-400 border border-rose-500/10 rounded-xl"
              >
                <LogOut className="w-6 h-6" />
                <span className="text-lg font-medium">Sign Out</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:pl-0 pt-16 lg:pt-0 h-screen overflow-y-auto overflow-x-hidden">
        <motion.div 
          className="p-6 lg:p-12 max-w-7xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default DashboardLayout;
