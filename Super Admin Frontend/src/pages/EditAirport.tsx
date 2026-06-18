import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plane, Globe, Loader2, Save, XCircle } from 'lucide-react';
import api from '../lib/axios';
import { cn } from '../lib/utils';

const EditAirport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (id) fetchAirport();
  }, [id]);

  const fetchAirport = async () => {
    try {
      const res = await api.get(`/airports/${id}`);
      const a = res.data.data;
      setFormData({
        airport_name: a.airport_name,
        iata_code: a.iata_code,
        icao_code: a.icao_code || '',
        country: a.country || '',
        city: a.city || '',
        total_terminals: a.total_terminals || 0,
        airport_type: a.airport_type,
        website: a.website || '',
        is_active: a.is_active,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load airport.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.put(`/airports/${id}`, formData);
      navigate('/airports');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Update failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  const inputCls = "w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 outline-none transition-all placeholder:text-slate-600";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/airports')}
            className="w-10 h-10 shrink-0 bg-slate-900/50 rounded-xl flex items-center justify-center border border-slate-800 hover:border-sky-500/50 hover:text-sky-400 transition-all text-slate-400 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Plane className="w-4 h-4 text-sky-400" />
              <h1 className="text-2xl font-bold text-white">Edit Airport</h1>
            </div>
            <p className="text-slate-500 text-xs">
              Update details for <span className="text-slate-300 font-semibold">{formData.airport_name || '—'}</span>
              {formData.iata_code && <span className="ml-1.5 font-mono text-sky-400">({formData.iata_code})</span>}
            </p>
          </div>
        </div>

        <button
          form="edit-airport-form"
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 self-start sm:self-auto"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <form id="edit-airport-form" onSubmit={handleSubmit}>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-6">
            {error && (
              <div className="mb-5 flex items-center gap-2.5 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                <XCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Airport Name */}
              <div className="md:col-span-2">
                <Field label="Airport Full Name" required>
                  <div className="relative">
                    <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      required
                      type="text"
                      value={formData.airport_name}
                      onChange={e => setFormData({ ...formData, airport_name: e.target.value })}
                      className={cn(inputCls, "pl-10")}
                      placeholder="e.g. London Heathrow Airport"
                    />
                  </div>
                </Field>
              </div>

              {/* IATA */}
              <Field label="IATA Code" required>
                <input
                  required
                  maxLength={3}
                  type="text"
                  value={formData.iata_code}
                  onChange={e => setFormData({ ...formData, iata_code: e.target.value.toUpperCase() })}
                  className={cn(inputCls, "font-mono tracking-widest")}
                  placeholder="LHR"
                />
              </Field>

              {/* ICAO */}
              <Field label="ICAO Code">
                <input
                  maxLength={4}
                  type="text"
                  value={formData.icao_code}
                  onChange={e => setFormData({ ...formData, icao_code: e.target.value.toUpperCase() })}
                  className={cn(inputCls, "font-mono tracking-widest")}
                  placeholder="EGLL"
                />
              </Field>

              {/* City */}
              <Field label="City">
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className={inputCls}
                  placeholder="London"
                />
              </Field>

              {/* Country */}
              <Field label="Country">
                <input
                  type="text"
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                  className={inputCls}
                  placeholder="United Kingdom"
                />
              </Field>

              {/* Type */}
              <Field label="Airport Type">
                <select
                  value={formData.airport_type}
                  onChange={e => setFormData({ ...formData, airport_type: e.target.value })}
                  className={inputCls}
                >
                  <option value="international">International</option>
                  <option value="domestic">Domestic</option>
                  <option value="private">Private</option>
                  <option value="military">Military</option>
                </select>
              </Field>

              {/* Terminals */}
              <Field label="Total Terminals">
                <input
                  type="number"
                  min={0}
                  value={formData.total_terminals}
                  onChange={e => setFormData({ ...formData, total_terminals: parseInt(e.target.value) || 0 })}
                  className={inputCls}
                />
              </Field>

              {/* Website */}
              <div className="md:col-span-2">
                <Field label="Website">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type="text"
                      value={formData.website}
                      onChange={e => setFormData({ ...formData, website: e.target.value })}
                      className={cn(inputCls, "pl-10")}
                      placeholder="https://www.heathrow.com"
                    />
                  </div>
                </Field>
              </div>

              {/* Active Status */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer group w-fit">
                  <div
                    onClick={() => setFormData({ ...formData, is_active: formData.is_active ? 0 : 1 })}
                    className={cn(
                      "w-11 h-6 rounded-full transition-all duration-300 relative border cursor-pointer",
                      formData.is_active ? "bg-emerald-500/20 border-emerald-500/50" : "bg-slate-800 border-slate-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full transition-all duration-300",
                      formData.is_active ? "left-6 bg-emerald-400" : "left-1 bg-slate-500"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Active Status</p>
                    <p className="text-[10px] text-slate-500">{formData.is_active ? 'Airport is active and visible' : 'Airport is inactive'}</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditAirport;
