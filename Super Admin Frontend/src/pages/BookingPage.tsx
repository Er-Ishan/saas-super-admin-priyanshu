import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Calendar,
  ChevronDown,
  Loader2,
  ExternalLink,
  Filter,
  RefreshCw,
  ClipboardList,
  Plane
} from 'lucide-react';
import api from '../lib/axios';
import axios from 'axios';
import { cn } from '../lib/utils';
import BookingDetailsPopup from '../components/Bookings/BookingDetailsPopup';

interface Company {
  id: number;
  name: string;
  email?: string;
  active: number;
}

interface Booking {
  id: number;
  ref_no: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  product_name: string;
  travelling_from: string;
  drop_off_date: string;
  return_date: string;
  status: string;
  total_payable: number;
  created_at: string;
}

const BookingPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies');
      if (response.data.success) {
        setCompanies(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const fetchBookings = async (companyId: number) => {
    setLoading(true);
    try {
      // We need to call /api/getalldata which is NOT under /api/superadmin
      // The superadmin token should work as the backend header middleware extracts companyId
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:9000/api/superadmin').replace('/superadmin', '');
      const token = localStorage.getItem('super_admin_token');

      const response = await axios.get(`${baseUrl}/getalldata`, {
        params: { limit: 100 },
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-company-id': companyId
        }
      });

      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    fetchBookings(company.id);
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch =
      booking.ref_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${booking.first_name} ${booking.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
      case 'Confirmed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Cancelled':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Amended':
      case 'Extended':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center border border-sky-500/20">
              <ClipboardList className="w-6 h-6 text-sky-400" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Booking <span className="text-sky-400">Ledger</span></h1>
          </div>
          <p className="text-slate-400 max-w-lg">Audit and inspect bookings across all platform operators. Select a company to begin visualization.</p>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          {/* Company Selector */}
          <div className="relative group">
            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-2 ml-1">Select Company</label>
            <div className="relative min-w-[280px]">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-11 pr-10 text-sm text-white appearance-none focus:ring-2 focus:ring-sky-500/50 outline-none transition-all cursor-pointer"
                onChange={(e) => {
                  const company = companies.find(c => c.id === parseInt(e.target.value));
                  if (company) handleCompanySelect(company);
                }}
                value={selectedCompany?.id || ''}
              >
                <option value="" disabled>{companiesLoading ? 'Loading companies...' : 'Choose a platform operator'}</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>

          {selectedCompany && (
            <button
              onClick={() => fetchBookings(selectedCompany.id)}
              disabled={loading}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all text-slate-400 hover:text-white disabled:opacity-50 group mb-[2px]"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedCompany ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass rounded-[2.5rem] p-20 text-center border-dashed border-2 border-slate-800/50"
          >
            <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl border border-slate-800">
              <Building2 className="w-10 h-10 text-slate-600 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Company Selected</h2>
            <p className="text-slate-500 max-w-sm mx-auto">Please select a company from the dropdown menu to view its booking records and transaction history.</p>
          </motion.div>
        ) : (
          <motion.div
            key={selectedCompany.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-sky-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by reference, name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900/40 border border-slate-800/50 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-800/50 p-1 rounded-2xl">
                {['All', 'Active', 'Pending', 'Amended', 'Cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                      statusFilter === status
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Section */}
            <div className="glass rounded-[2.5rem] overflow-hidden border-slate-800/50">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800/50">
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reference</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customer</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Product</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dates</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <Loader2 className="w-10 h-10 text-sky-500 animate-spin mx-auto mb-4" />
                          <p className="text-slate-500 animate-pulse">Retrieving booking vault...</p>
                        </td>
                      </tr>
                    ) : filteredBookings.length > 0 ? (
                      filteredBookings.map((booking, idx) => (
                        <motion.tr
                          key={booking.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="group hover:bg-slate-400/5 transition-colors"
                        >
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors">{booking.ref_no}</span>
                              <span className="text-[10px] text-slate-600 font-mono tracking-tighter">#{booking.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">
                                {booking.first_name?.[0]}{booking.last_name?.[0]}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-200">{booking.first_name} {booking.last_name}</span>
                                <span className="text-xs text-slate-500 truncate max-w-[150px]">{booking.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-300 font-medium">{booking.product_name}</span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Plane className="w-3 h-3" /> {booking.travelling_from}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Calendar className="w-3 h-3 text-emerald-500" />
                                <span>{new Date(booking.drop_off_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Calendar className="w-3 h-3 text-rose-500 rotate-180" />
                                <span>{new Date(booking.return_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={cn(
                              "px-2.5 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-tighter",
                              getStatusColor(booking.status)
                            )}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setIsPopupOpen(true);
                              }}
                              className="p-2.5 bg-slate-800/50 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 rounded-xl border border-slate-700 hover:border-sky-500/30 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-800">
                            <Filter className="w-8 h-8 text-slate-700" />
                          </div>
                          <h3 className="text-white font-bold mb-1">No matches found</h3>
                          <p className="text-slate-500 text-sm">No bookings found for the current search or filter criteria.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Popup */}
      <BookingDetailsPopup
        open={isPopupOpen}
        booking={selectedBooking}
        onClose={() => {
          setIsPopupOpen(false);
          setSelectedBooking(null);
        }}
      />
    </div>
  );
};

export default BookingPage;
