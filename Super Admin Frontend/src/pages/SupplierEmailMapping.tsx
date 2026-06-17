import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Tags, Loader2, Save, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import api from '../lib/axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SupplierEmailMapping: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mappingFields, setMappingFields] = useState<string[]>([]);
  const [currentMapping, setCurrentMapping] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`company-suppliers/${id}/mapping`);
      setMappingFields(response.data.fields);
      setCurrentMapping(response.data.mapping || {});
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Check connection';
      showToast('error', 'Failed to load mapping: ' + msg);
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
      showToast('success', response.data.message || 'Mapping saved successfully');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save';
      showToast('error', msg);
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
    <div className="w-full min-w-0">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={cn(
              "fixed top-20 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium",
              toast.type === 'success'
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            )}
          >
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <XCircle className="w-4 h-4 shrink-0" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 shrink-0 bg-slate-900/50 rounded-xl flex items-center justify-center border border-slate-800 hover:border-sky-500/50 hover:text-sky-400 transition-all text-slate-400 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">Email Details Mapping</h1>
              <span className="bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-slate-700">
                {mappingFields.length} fields
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">Map supplier email labels to system fields for parsing</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Apply & Sync
        </button>
      </div>

      {/* Main content: guide + table */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Configuration Guide */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Configuration Guide</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { text: 'Enter the exact labels used by the supplier in their email (e.g. "Booking Ref", "Ref ID").' },
                { text: <>Use <span className="text-white font-semibold">commas</span> to separate multiple aliases for the same field.</> },
                { text: 'The system automatically ignores case sensitivity during parsing.' },
                { text: 'Changes are applied immediately to this supplier and also boost the global parsing engine.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-w-0">
      {mappingFields.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
          <Tags className="w-9 h-9 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium text-sm">No mapping fields available.</p>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800">
                  {['S.N', 'System Field', 'Supplier Label(s)', 'Status'].map(h => (
                    <th
                      key={h}
                      className={cn(
                        "text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap bg-slate-900/60",
                        h === 'S.N' || h === 'Status' ? 'text-center' : 'text-left'
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {mappingFields.map((field, index) => {
                  const value = currentMapping[field] || '';
                  const isMapped = value.trim().length > 0;
                  return (
                    <motion.tr
                      key={field}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* S.N */}
                      <td className="px-4 py-3 text-xs text-slate-600 font-mono text-center whitespace-nowrap">
                        {index + 1}
                      </td>

                      {/* System Field */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 shrink-0">
                            <Tags className="w-3.5 h-3.5 text-indigo-400" />
                          </div>
                          <span className="text-sm font-semibold text-white capitalize">
                            {field.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>

                      {/* Input */}
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setCurrentMapping({ ...currentMapping, [field]: e.target.value })}
                          className="w-full bg-slate-900/60 border border-slate-800 rounded-lg py-2 px-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 outline-none transition-all placeholder:text-slate-700 font-mono"
                          placeholder={`e.g. ${field.replace(/_/g, ' ')}, alias...`}
                        />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border",
                          isMapped
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-slate-800 text-slate-600 border-slate-700"
                        )}>
                          <span className={cn("w-1 h-1 rounded-full", isMapped ? "bg-emerald-400" : "bg-slate-600")} />
                          {isMapped ? 'Mapped' : 'Empty'}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>{/* end table col */}
      </div>{/* end flex row */}
    </div>
  );
};

export default SupplierEmailMapping;
