import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Tags, Loader2, Save, CheckCircle2, XCircle, ShieldCheck, Info, X } from 'lucide-react';
import api from '../lib/axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SupplierEmailMapping: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const supplierName = searchParams.get('supplierName') || '';
  const companyName = searchParams.get('companyName') || '';

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mappingFields, setMappingFields] = useState<string[]>([]);
  const [currentMapping, setCurrentMapping] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

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
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 shrink-0 bg-slate-900/50 rounded-xl flex items-center justify-center border border-slate-800 hover:border-sky-500/50 hover:text-sky-400 transition-all text-slate-400 group mt-0.5"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Tags className="w-6 h-6 text-sky-400 shrink-0" />Email Details Mapping</h1>
              <span className="bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-slate-700 shrink-0">
                {mappingFields.length} fields
              </span>
              {(supplierName || companyName) && (
                <div className="flex items-center gap-2 self-center flex-wrap">
                  <span className="text-slate-700 hidden sm:inline">·</span>
                  {supplierName && <span className="text-sm font-semibold text-white">{supplierName}</span>}
                  {supplierName && companyName && <span className="text-slate-600 text-xs">via</span>}
                  {companyName && <span className="text-xs text-slate-400 font-mono">{companyName}</span>}
                </div>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-0.5">Map supplier email labels to system fields for parsing</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowGuide(true)}
            title="Configuration Guide"
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-all"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Apply & Sync
          </button>
        </div>
      </div>

      {/* Configuration Guide Popup */}
      <AnimatePresence>
        {showGuide && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowGuide(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-bold text-white uppercase tracking-wider">Configuration Guide</span>
                  </div>
                  <button
                    onClick={() => setShowGuide(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {[
                    'Enter the exact labels used by the supplier in their email (e.g. "Booking Ref", "Ref ID").',
                    <span>Use <span className="text-white font-semibold">commas</span> to separate multiple aliases for the same field.</span>,
                    'The system automatically ignores case sensitivity during parsing.',
                    'Changes are applied immediately to this supplier and also boost the global parsing engine.',
                  ].map((text, i) => (
                    <div key={i} className="flex gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="w-full min-w-0">
      {mappingFields.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
          <Tags className="w-9 h-9 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium text-sm">No mapping fields available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {mappingFields.map((field, index) => {
            const value = currentMapping[field] || '';
            const isMapped = value.trim().length > 0;
            return (
              <motion.div
                key={field}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-700 transition-colors"
              >
                {/* Header row: number + field name + status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-slate-600 font-mono shrink-0">{index + 1}</span>
                    <div className="w-6 h-6 bg-slate-800 rounded-md flex items-center justify-center border border-slate-700 shrink-0">
                      <Tags className="w-3 h-3 text-indigo-400" />
                    </div>
                    <span className="text-sm font-semibold text-white capitalize truncate">
                      {field.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border shrink-0",
                    isMapped
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-slate-800 text-slate-600 border-slate-700"
                  )}>
                    <span className={cn("w-1 h-1 rounded-full", isMapped ? "bg-emerald-400" : "bg-slate-600")} />
                    {isMapped ? 'Mapped' : 'Empty'}
                  </span>
                </div>

                {/* Input */}
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setCurrentMapping({ ...currentMapping, [field]: e.target.value })}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 outline-none transition-all placeholder:text-slate-700 font-mono"
                  placeholder={`e.g. ${field.replace(/_/g, ' ')}, alias...`}
                />
              </motion.div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};

export default SupplierEmailMapping;
