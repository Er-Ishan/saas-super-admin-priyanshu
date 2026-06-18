import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Plus, Globe, Loader2, Sparkles, X,
  Search, Edit2, Trash2, XCircle, AlertTriangle
} from 'lucide-react';
import api from '../lib/axios';
import { cn } from '../lib/utils';

interface Airport {
  airport_id: number;
  airport_name: string;
  iata_code: string;
  icao_code?: string;
  country?: string;
  city?: string;
  total_terminals?: number;
  airport_type: string;
  website?: string;
  is_active: number;
}

const Dash = () => <span className="text-slate-700">—</span>;

const TH = ({ children, center }: { children: React.ReactNode; center?: boolean }) => (
  <th className={cn(
    "text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2.5 whitespace-nowrap bg-slate-900/60",
    center ? "text-center" : "text-left"
  )}>
    {children}
  </th>
);

const Cell = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={cn("px-3 py-2.5 text-xs text-slate-300 whitespace-nowrap align-middle", className)}>
    {children}
  </td>
);

const Airports: React.FC = () => {
  const navigate = useNavigate();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Airport | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    airport_name: '',
    iata_code: '',
    icao_code: '',
    country: '',
    city: '',
    total_terminals: 0,
    airport_type: 'international',
    website: '',
    is_active: 1,
  });

  const filteredAirports = airports.filter(a =>
    a.airport_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.iata_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.city?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (a.country?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => { fetchAirports(); }, []);

  const fetchAirports = async () => {
    try {
      const res = await api.get('/airports');
      setAirports(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post('/airports', formData);
      fetchAirports();
      setShowModal(false);
      resetForm();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Operation failed.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (airport: Airport) => {
    navigate(`/airports/${airport.airport_id}/edit`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/airports/${deleteTarget.airport_id}`);
      setAirports(prev => prev.filter(a => a.airport_id !== deleteTarget.airport_id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({ airport_name: '', iata_code: '', icao_code: '', country: '', city: '', total_terminals: 0, airport_type: 'international', website: '', is_active: 1 });
    setError(null);
  };

  const typeBadgeClass = (type: string) => {
    const map: Record<string, string> = {
      international: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      domestic: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      private: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      military: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };
    return map[type] || 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <div className="w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Plane className="w-6 h-6 text-sky-400 shrink-0" />Global Airports</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage the airport registry used across all parking operators.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-sky-500 transition-colors" />
            <input
              type="text"
              placeholder="Search name, IATA, city, country…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-48 sm:w-64 bg-slate-900/60 border border-slate-800 rounded-lg py-2 pl-8 pr-3 text-xs text-white focus:ring-2 focus:ring-sky-500/40 outline-none placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 group whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            Add Airport
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
        </div>
      ) : filteredAirports.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
          <Plane className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">No airports found</p>
          <p className="text-slate-500 text-sm mb-4">
            {searchTerm ? `No results for "${searchTerm}"` : 'No airports have been added yet.'}
          </p>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-sky-400 text-sm font-semibold hover:text-sky-300">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-500">
              {filteredAirports.length} {filteredAirports.length === 1 ? 'airport' : 'airports'}
              {searchTerm && ` matching "${searchTerm}"`}
            </span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    <TH>S.N</TH>
                    <TH center>Actions</TH>
                    <TH>Airport Name</TH>
                    <TH center>IATA</TH>
                    <TH center>ICAO</TH>
                    <TH>City</TH>
                    <TH>Country</TH>
                    <TH>Type</TH>
                    <TH center>Terminals</TH>
                    <TH>Website</TH>
                    <TH center>Status</TH>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredAirports.map((airport, i) => (
                    <motion.tr
                      key={airport.airport_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* S.N */}
                      <Cell className="text-slate-600 font-mono">{i + 1}</Cell>

                      {/* Actions */}
                      <Cell className="text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => handleEdit(airport)}
                            title="Edit"
                            className="p-1 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(airport)}
                            title="Delete"
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </Cell>

                      {/* Airport Name */}
                      <Cell>
                        <div className="flex items-center gap-2 min-w-[180px]">
                          <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center border border-slate-700 shrink-0">
                            <Plane className="w-3 h-3 text-slate-500" />
                          </div>
                          <span className="font-semibold text-white truncate max-w-[200px]" title={airport.airport_name}>
                            {airport.airport_name}
                          </span>
                        </div>
                      </Cell>

                      {/* IATA */}
                      <Cell className="text-center">
                        <span className="font-mono font-black text-sky-400 text-sm tracking-wider">
                          {airport.iata_code}
                        </span>
                      </Cell>

                      {/* ICAO */}
                      <Cell className="text-center">
                        <span className="font-mono text-slate-400">{airport.icao_code || <Dash />}</span>
                      </Cell>

                      {/* City */}
                      <Cell><span className="text-slate-400">{airport.city || <Dash />}</span></Cell>

                      {/* Country */}
                      <Cell><span className="text-slate-400">{airport.country || <Dash />}</span></Cell>

                      {/* Type */}
                      <Cell>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border capitalize",
                          typeBadgeClass(airport.airport_type)
                        )}>
                          {airport.airport_type}
                        </span>
                      </Cell>

                      {/* Terminals */}
                      <Cell className="text-center">
                        <span className="text-slate-400">{airport.total_terminals ?? <Dash />}</span>
                      </Cell>

                      {/* Website */}
                      <Cell>
                        {airport.website ? (
                          <a
                            href={airport.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 truncate max-w-[160px] transition-colors"
                            title={airport.website}
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{airport.website.replace(/^https?:\/\//, '')}</span>
                          </a>
                        ) : <Dash />}
                      </Cell>

                      {/* Status */}
                      <Cell className="text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded",
                          airport.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-800 text-slate-500 border border-slate-700"
                        )}>
                          <span className={cn("w-1 h-1 rounded-full", airport.is_active ? "bg-emerald-400" : "bg-slate-600")} />
                          {airport.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </Cell>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}

      {/* ── Add / Edit Modal ── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="glass w-full max-w-2xl rounded-2xl overflow-hidden relative z-10 p-6 shadow-2xl border-white/10 my-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-sky-400" />
                  Add New Airport
                </h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-400 text-xs">
                    <XCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Airport Full Name <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input required type="text" value={formData.airport_name}
                        onChange={e => setFormData({ ...formData, airport_name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:ring-2 focus:ring-sky-500/50 outline-none placeholder:text-slate-600"
                        placeholder="e.g. London Heathrow Airport" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">IATA Code <span className="text-red-400">*</span></label>
                    <input required maxLength={3} type="text" value={formData.iata_code}
                      onChange={e => setFormData({ ...formData, iata_code: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white font-mono focus:ring-2 focus:ring-sky-500/50 outline-none placeholder:text-slate-600"
                      placeholder="LHR" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">ICAO Code</label>
                    <input maxLength={4} type="text" value={formData.icao_code}
                      onChange={e => setFormData({ ...formData, icao_code: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white font-mono focus:ring-2 focus:ring-sky-500/50 outline-none placeholder:text-slate-600"
                      placeholder="EGLL" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">City</label>
                    <input type="text" value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white focus:ring-2 focus:ring-sky-500/50 outline-none placeholder:text-slate-600"
                      placeholder="London" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Country</label>
                    <input type="text" value={formData.country}
                      onChange={e => setFormData({ ...formData, country: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white focus:ring-2 focus:ring-sky-500/50 outline-none placeholder:text-slate-600"
                      placeholder="United Kingdom" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Airport Type</label>
                    <select value={formData.airport_type}
                      onChange={e => setFormData({ ...formData, airport_type: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white focus:ring-2 focus:ring-sky-500/50 outline-none">
                      <option value="international">International</option>
                      <option value="domestic">Domestic</option>
                      <option value="private">Private</option>
                      <option value="military">Military</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Total Terminals</label>
                    <input type="number" value={formData.total_terminals}
                      onChange={e => setFormData({ ...formData, total_terminals: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white focus:ring-2 focus:ring-sky-500/50 outline-none" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input type="text" value={formData.website}
                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:ring-2 focus:ring-sky-500/50 outline-none placeholder:text-slate-600"
                        placeholder="https://www.heathrow.com" />
                    </div>
                  </div>

                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-sky-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Airport'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white mb-1">Delete Airport</h3>
                  <p className="text-xs text-slate-400">
                    Are you sure you want to delete{' '}
                    <span className="text-white font-semibold">{deleteTarget.airport_name}</span>{' '}
                    (<span className="font-mono text-sky-400">{deleteTarget.iata_code}</span>)?
                    This cannot be undone.
                  </p>
                </div>
                <button onClick={() => setDeleteTarget(null)} className="p-1 text-slate-600 hover:text-slate-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 text-xs font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-60 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Airports;
