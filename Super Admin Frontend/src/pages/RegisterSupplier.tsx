import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Mail, Plus, Trash2, Loader2, ArrowLeft, Truck } from 'lucide-react';
import api from '../lib/axios';

const RegisterSupplier: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    supplier_name: '',
    from_email_addresses: [''] as string[],
    commission: '0',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await api.post('add-supplier', {
        supplier_name: formData.supplier_name,
        from_email_address: formData.from_email_addresses.filter(e => e.trim()),
        commission: parseFloat(formData.commission),
      });
      if (response.data.success) {
        navigate('/suppliers');
      }
    } catch (err) {
      console.error('Failed to register supplier:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEmail = () =>
    setFormData({ ...formData, from_email_addresses: [...formData.from_email_addresses, ''] });

  const removeEmail = (idx: number) =>
    setFormData({
      ...formData,
      from_email_addresses: formData.from_email_addresses.filter((_, i) => i !== idx),
    });

  const updateEmail = (idx: number, value: string) => {
    const updated = [...formData.from_email_addresses];
    updated[idx] = value;
    setFormData({ ...formData, from_email_addresses: updated });
  };

  return (
    <div className="max-w-2xl mx-auto pb-20 px-4">
      {/* Header */}
      <div className="mb-10">
        <button
          onClick={() => navigate('/suppliers')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Suppliers
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Globe className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Truck className="w-6 h-6 text-sky-400 shrink-0" />Register New Supplier</h1>
            <p className="text-slate-400 mt-1">Add a master supplier to the global registry.</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl border border-slate-800 p-8"
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Legal Supplier Name */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Legal Supplier Name <span className="text-rose-400">*</span>
            </label>
            <input
              required
              type="text"
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder-slate-600"
              placeholder="e.g. Purple Parking LTD"
            />
          </div>

          {/* Master Parsing Emails */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-400">
                Master Parsing Emails (Defaults) <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={addEmail}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Another
              </button>
            </div>
            <div className="space-y-3">
              {formData.from_email_addresses.map((email, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(idx, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder-slate-600"
                      placeholder="noreply@supplier.com"
                    />
                  </div>
                  {formData.from_email_addresses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(idx)}
                      className="p-3 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-slate-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Commission */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Commission (%) <span className="text-rose-400">*</span>
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.commission}
              onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
            />
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={() => navigate('/suppliers')}
              className="flex-1 py-4 rounded-2xl font-bold border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-white text-slate-950 rounded-2xl py-4 font-bold shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Registration'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default RegisterSupplier;
