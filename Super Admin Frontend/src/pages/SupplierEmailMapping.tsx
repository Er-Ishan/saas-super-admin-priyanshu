import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Tags, Loader2, Save, Info, CheckCircle2 } from 'lucide-react';
import api from '../lib/axios';

const SupplierEmailMapping: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mappingFields, setMappingFields] = useState<string[]>([]);
  const [currentMapping, setCurrentMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`company-suppliers/${id}/mapping`);
      setMappingFields(response.data.fields);
      setCurrentMapping(response.data.mapping || {});
      // In a real scenario, we might want to fetch more supplier details, but we'll assume they're passed or fetched.
      // For now, let's just focus on the mapping.
    } catch (err: any) {
      console.error('Error fetching mapping data:', err);
      const msg = err.response?.data?.message || err.message || 'Check connection';
      alert('Failed to load mapping: ' + msg);
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const response = await api.post(`company-suppliers/${id}/mapping`, { mapping: currentMapping });
      if (response.data.success) {
        alert(response.data.message);
      }
    } catch (err: any) {
      console.error('Failed to save mapping:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/suppliers')}
            className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Email Details Mapping</h1>
            <p className="text-slate-400">Configure how supplier-specific email fields are parsed into the system.</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Apply & Sync Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Help Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-8 rounded-3xl border-slate-800 bg-indigo-500/5">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20">
              <Info className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Configuration Guide</h3>
            <ul className="space-y-4 text-sm text-slate-400">
              <li className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>Enter the exact labels used by the supplier in their email (e.g. "Booking Ref", "Ref ID").</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>Use <b>commas</b> to separate multiple aliases for the same field.</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>The system automatically ignores case sensitivity during parsing.</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>Changes are applied immediately to this supplier and also boost the global parsing engine.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Form Panel */}
        <div className="lg:col-span-2 space-y-4">
          {mappingFields.map((field) => (
            <motion.div
              layout
              key={field}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass p-6 rounded-3xl border-slate-800 hover:border-slate-700 transition-colors group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 group-focus-within:text-indigo-400 transition-colors">
                    {field.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    value={currentMapping[field] || ''}
                    onChange={(e) => setCurrentMapping({ ...currentMapping, [field]: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-4 px-5 text-white focus:ring-2 focus:ring-indigo-500/50 border-slate-700/50 outline-none transition-all placeholder:text-slate-700"
                    placeholder={`e.g. ${field.replace(/_/g, ' ')}, Label...`}
                  />
                </div>
                <div className="hidden md:flex p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 items-center justify-center">
                  <Tags className="w-5 h-5 text-slate-700 group-focus-within:text-indigo-500 transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}

          {mappingFields.length === 0 && (
            <div className="py-20 text-center glass rounded-3xl border-slate-800">
              <Loader2 className="w-8 h-8 text-slate-800 mx-auto animate-spin mb-4" />
              <p className="text-slate-600">Loading available fields...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierEmailMapping;
