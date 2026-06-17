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
  ClipboardList,
  Users,
  MessageSquare,
  Plane,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DashboardLayout: React.FC = () => {
  const { logout, user, hasPermission } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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

  const visibleNavItems = navItems.filter(item => hasPermission(item.permission));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-40 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 flex items-center px-4 sm:px-6"
      >
        {/* Logo — left anchor */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 z-10">
          <motion.div
            className="w-9 h-9 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center border border-sky-500/30 shadow-lg shadow-sky-500/20"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Shield className="w-5 h-5 text-sky-400" />
          </motion.div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-white tracking-tight leading-none">
              Super <span className="text-sky-400">Box</span>
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Admin Portal</p>
          </div>
        </Link>

        {/* Desktop Nav Links — absolutely centered so they're always in the middle */}
        <nav className="hidden xl:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
          {visibleNavItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Link
                  to={item.path}
                  className={cn(
                    "relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 whitespace-nowrap group",
                    isActive
                      ? "text-sky-400 bg-sky-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  )}
                >
                  <Icon className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-transform duration-200",
                    isActive ? "text-sky-400" : "group-hover:scale-110"
                  )} />
                  {item.name}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavTop"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-sky-500 rounded-full"
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Medium nav: icons only centered (lg screens) */}
        <nav className="hidden lg:flex xl:hidden items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {visibleNavItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                title={item.name}
              >
                <Link
                  to={item.path}
                  className={cn(
                    "relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 group",
                    isActive
                      ? "text-sky-400 bg-sky-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  )}
                >
                  <Icon className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    isActive ? "text-sky-400" : "group-hover:scale-110"
                  )} />
                  {isActive && (
                    <motion.div
                      layoutId="activeNavMd"
                      className="absolute bottom-0 left-1 right-1 h-0.5 bg-sky-500 rounded-full"
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Right side: Bell + User */}
        <div className="ml-auto flex items-center gap-2 z-10">
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

          {/* User dropdown — desktop */}
          <div className="relative hidden lg:block">
            <motion.button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 rounded-full border border-slate-600/50 flex items-center justify-center text-xs font-bold text-slate-300">
                  {user?.name?.charAt(0)}
                </div>
                <motion.div
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-white leading-none">{user?.name}</p>
                <p className="text-[10px] text-slate-500 leading-none mt-0.5 max-w-[120px] truncate">{user?.email}</p>
              </div>
              <ChevronDown className={cn(
                "w-3.5 h-3.5 text-slate-500 transition-transform duration-200",
                isUserMenuOpen && "rotate-180"
              )} />
            </motion.button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl shadow-black/40 overflow-hidden"
                >
                  <motion.button
                    onClick={() => { logout(); setIsUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                    whileHover={{ x: 2 }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hamburger — visible below lg (lg+ shows nav directly) */}
          <motion.button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden fixed top-16 inset-x-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/50 px-4 py-4"
          >
            <nav className="space-y-1">
              {visibleNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                      isActive ? "bg-sky-500/10 text-sky-400" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <div>
                      <span className="block">{item.name}</span>
                      <span className="text-xs opacity-60">{item.description}</span>
                    </div>
                  </Link>
                );
              })}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-rose-400 border border-rose-500/10 rounded-xl hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 pt-16 overflow-y-auto overflow-x-auto">
        <motion.div
          className="p-4 lg:p-6 w-full"
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
