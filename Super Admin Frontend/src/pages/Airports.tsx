import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Plus, Globe, MapPin, Loader2, Sparkles, X, Search, Edit2, Trash2, XCircle } from 'lucide-react';
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

const Airports: React.FC = () => {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null);
  const [formData, setFormData] = useState({
    airport_name: '',
    iata_code: '',
    icao_code: '',
    country: '',
    city: '',
    total_terminals: 0,
    airport_type: 'international',
    website: '',
    is_active: 1
  });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAirports = airports.filter(airport => 
    airport.airport_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.iata_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (airport.city && airport.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    fetchAirports();
  }, []);

  const fetchAirports = async () => {
    try {
      const response = await api.get('/airports');
      setAirports(response.data.data);
    } catch (err) {
      console.error('Error fetching airports:', err);
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (editingAirport) {
        await api.put(`/airports/${editingAirport.airport_id}`, formData);
      } else {
        await api.post('/airports', formData);
      }
      fetchAirports();
      setShowModal(false);
      resetForm();
    } catch (err: unknown) {
      console.error('Operation failed:', err);
      const errorMessage = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Operation failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (airport: Airport) => {
    setEditingAirport(airport);
    setFormData({
      airport_name: airport.airport_name,
      iata_code: airport.iata_code,
      icao_code: airport.icao_code || '',
      country: airport.country || '',
      city: airport.city || '',
      total_terminals: airport.total_terminals || 0,
      airport_type: airport.airport_type,
      website: airport.website || '',
      is_active: airport.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this airport?')) return;
    try {
      await api.delete(`/airports/${id}`);
      fetchAirports();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete airport');
    }
  };

  const resetForm = () => {
    setEditingAirport(null);
    setFormData({
      airport_name: '',
      iata_code: '',
      icao_code: '',
      country: '',
      city: '',
      total_terminals: 0,
      airport_type: 'international',
      website: '',
      is_active: 1
    });
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-3">Global Airports</h1>
          <p className="text-slate-400">Manage the global airport registry used by all parking operators.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative group min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-sky-500 transition-colors" />
            <input
              type="text"
              placeholder="Search airports by name, IATA or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none transition-all placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group w-full md:w-auto"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            Add New Airport
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAirports.length > 0 ? (
            filteredAirports.map((airport, index) => (
            <motion.div
              key={airport.airport_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass p-5 rounded-2xl hover:border-sky-500/30 transition-all duration-300 relative group flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-slate-800/80 rounded-xl flex items-center justify-center border border-slate-700 group-hover:bg-sky-500/10 group-hover:border-sky-500/30 transition-colors">
                  <Plane className="w-5 h-5 text-slate-400 group-hover:text-sky-400" />
                </div>
                <div className="flex flex-col items-end gap-1">
                   <span className={cn(
                     "text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded",
                     airport.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"
                   )}>
                     {airport.is_active ? 'Active' : 'Inactive'}
                   </span>
                   <span className="text-xl font-black text-sky-500 font-mono">{airport.iata_code}</span>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{airport.airport_name}</h3>
              <p className="text-xs text-slate-500 mb-4">{airport.icao_code || '---'} | {airport.airport_type}</p>

              <div className="space-y-2 text-xs text-slate-400 flex-1">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                  <span className="truncate">{airport.city}, {airport.country}</span>
                </div>
                {airport.website && (
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                    <span className="truncate">{airport.website}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-700 rounded-sm">T</div>
                  <span>{airport.total_terminals} Terminals</span>
                </div>
              </div>
              
              <div className="mt-5 pt-4 border-t border-slate-800/50 flex justify-between items-center">
                 <button 
                  onClick={() => handleEdit(airport)}
                  className="p-2 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-lg transition-all"
                 >
                   <Edit2 className="w-4 h-4" />
                 </button>
                 <button 
                  onClick={() => handleDelete(airport.airport_id)}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center glass rounded-3xl border-dashed border-2 border-slate-800">
               <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Plane className="w-10 h-10 text-slate-600" />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">No airports found</h3>
               <p className="text-slate-500">We couldn't find any airports matching "{searchTerm}"</p>
               <button 
                onClick={() => setSearchTerm('')}
                className="mt-6 text-sky-400 font-bold hover:text-sky-300 transition-colors"
               >
                 Clear search filters
               </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Overlay */}
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass w-full max-w-2xl rounded-3xl overflow-hidden relative z-10 p-8 shadow-2xl border-white/10 my-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-sky-400" />
                  {editingAirport ? 'Edit Airport' : 'Add New Airport'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
                    <XCircle className="w-5 h-5 opacity-50" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Airport Full Name</label>
                    <div className="relative">
                      <Plane className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input
                        required
                        type="text"
                        value={formData.airport_name}
                        onChange={(e) => setFormData({ ...formData, airport_name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none"
                        placeholder="e.g. London Heathrow Airport"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">IATA Code</label>
                    <input
                      required
                      maxLength={3}
                      type="text"
                      value={formData.iata_code}
                      onChange={(e) => setFormData({ ...formData, iata_code: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none font-mono"
                      placeholder="LHR"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">ICAO Code</label>
                    <input
                      maxLength={4}
                      type="text"
                      value={formData.icao_code}
                      onChange={(e) => setFormData({ ...formData, icao_code: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none font-mono"
                      placeholder="EGLL"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none"
                      placeholder="London"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none"
                      placeholder="United Kingdom"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Airport Type</label>
                    <select
                      value={formData.airport_type}
                      onChange={(e) => setFormData({ ...formData, airport_type: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none"
                    >
                      <option value="international">International</option>
                      <option value="domestic">Domestic</option>
                      <option value="private">Private</option>
                      <option value="military">Military</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Total Terminals</label>
                    <input
                      type="number"
                      value={formData.total_terminals}
                      onChange={(e) => setFormData({ ...formData, total_terminals: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Website</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none"
                        placeholder="https://www.heathrow.com"
                      />
                    </div>
                  </div>

                  {editingAirport && (
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div 
                          onClick={() => setFormData({ ...formData, is_active: formData.is_active ? 0 : 1 })}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all duration-300 relative border",
                            formData.is_active ? "bg-emerald-500/20 border-emerald-500/50" : "bg-slate-800 border-slate-700"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 rounded-full transition-all duration-300",
                            formData.is_active ? "left-7 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "left-1 bg-slate-500"
                          )} />
                        </div>
                        <span className="text-sm font-medium text-slate-300">Active Status</span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl py-4 font-bold shadow-xl shadow-sky-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingAirport ? "Update Airport" : "Create Airport")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Airports;
