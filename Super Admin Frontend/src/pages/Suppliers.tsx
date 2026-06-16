import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Plus, Mail, Building2, Loader2, AlertCircle, X, Settings2, Trash2, CheckCircle2, Globe, Tags, Pencil } from 'lucide-react';

import api from '../lib/axios';
import { cn } from '../lib/utils';

interface GlobalSupplier {
  supplier_id: number;
  supplier_name: string;
  reg_no: string;
  supplier_contact: string;
  supplier_email: string;
  supplier_address: string;
  from_email_address: string;
  director_name: string;
  director_email: string;
  director_phone: string;
  supplier_active: number;
  all_sender_emails: string[];
  commission: number;
}

interface CompanySupplier {
  id: number;
  company_id: number;
  supplier_id: number;
  supplier_from_email: string;
  active: number;
  data_from: 'csv' | 'body' | 'both';
  commission: string;
  booking_count: number;
  supplier_name: string;
  supplier_email: string;
  supplier_contact: string;
}

interface Company {
  id: number;
  name: string;
}

const Suppliers: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'registry' | 'assignments'>((searchParams.get('tab') as any) || 'registry');
  const [globalSuppliers, setGlobalSuppliers] = useState<GlobalSupplier[]>([]);
  const [companySuppliers, setCompanySuppliers] = useState<CompanySupplier[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(searchParams.get('companyId') || '');

  const [loading, setLoading] = useState(true);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [assignmentFormData, setAssignmentFormData] = useState({
    company_id: '',
    supplier_id: '',
    supplier_from_emails: [''] as string[],
    commission: '0',
    data_from: 'both' as 'csv' | 'body' | 'both',
    syncToRegistry: false // Added sync flag
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchCompanySuppliers(selectedCompanyId);
    } else {
      setCompanySuppliers([]);
    }
  }, [selectedCompanyId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [suppliersRes, companiesRes] = await Promise.all([
        api.get('suppliers'),
        api.get('companies')
      ]);
      setGlobalSuppliers(suppliersRes.data.data);
      setCompanies(companiesRes.data.data);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanySuppliers = async (companyId: string) => {
    try {
      const response = await api.get(`companies/${companyId}/suppliers`);
      setCompanySuppliers(response.data.data);
    } catch (err) {
      console.error('Error fetching company suppliers:', err);
    }
  };

  const handleAssignSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...assignmentFormData,
        company_id: parseInt(assignmentFormData.company_id),
        supplier_id: parseInt(assignmentFormData.supplier_id),
        commission: parseFloat(assignmentFormData.commission)
      };
      const response = await api.post('company-suppliers/assign', {
        ...payload,
        supplier_from_email: assignmentFormData.supplier_from_emails.filter(e => e.trim())
      });
      if (response.data.success) {
        setShowAssignmentModal(false);
        if (selectedCompanyId === assignmentFormData.company_id) {
          fetchCompanySuppliers(selectedCompanyId);
        }
        setAssignmentFormData({
          company_id: selectedCompanyId,
          supplier_id: '',
          supplier_from_emails: [''],
          commission: '0',
          data_from: 'both',
          syncToRegistry: false
        });
      }
    } catch (err) {
      console.error('Failed to assign supplier:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (assignment: CompanySupplier) => {
    try {
      await api.put(`company-suppliers/${assignment.id}`, {
        active: assignment.active ? 0 : 1,
        commission: assignment.commission,
        data_from: assignment.data_from,
        supplier_from_email: assignment.supplier_from_email // Already a JSON string or array from backend
      });
      fetchCompanySuppliers(selectedCompanyId);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!window.confirm('Are you sure you want to unassign this supplier?')) return;
    try {
      await api.delete(`company-suppliers/${id}`);
      fetchCompanySuppliers(selectedCompanyId);
    } catch (err) {
      console.error('Failed to delete assignment:', err);
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this supplier from the registry?')) return;
    try {
      await api.delete(`suppliers/${id}`);
      fetchInitialData();
    } catch (err) {
      console.error('Failed to delete supplier:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-3">Suppliers Management</h1>
          <p className="text-slate-400">Manage the global supplier registry and company-specific data pipelines.</p>
        </div>
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('registry')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center gap-2",
              activeTab === 'registry' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white"
            )}
          >
            <Globe className="w-4 h-4" />
            Registry
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center gap-2",
              activeTab === 'assignments' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white"
            )}
          >
            <Settings2 className="w-4 h-4" />
            Company Links
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'registry' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Master Supplier Registry</h2>
                <button
                  onClick={() => navigate('/suppliers/register')}
                  className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-bold border border-white/10 transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Register New Supplier
                </button>
              </div>

              <div className="glass rounded-3xl overflow-hidden border-slate-800">
                <table className="w-full text-left order-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-800">
                      <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Supplier</th>
                      <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Master Email (From)</th>
                      <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Commission</th>
                      <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {globalSuppliers.map((s) => (
                      <tr key={s.supplier_id} className="hover:bg-slate-800/20 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                              <Truck className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                              <p className="font-bold text-white">{s.supplier_name}</p>
                              
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2">
                            {s.all_sender_emails?.map((email, idx) => (
                              <div key={idx} className="inline-flex items-center gap-1.5 bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300">
                                <Mail className="w-3 h-3 text-sky-500" />
                                {email}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-white font-bold">
                            {s.commission != null ? `${s.commission}%` : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                            s.supplier_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          )}>
                            {s.supplier_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/suppliers/${s.supplier_id}/edit`)}
                              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                              title="Edit supplier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(s.supplier_id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                              title="Delete supplier"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {globalSuppliers.length === 0 && (
                  <div className="py-20 text-center">
                    <AlertCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500">No master suppliers registered.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-6 rounded-3xl border border-slate-800">
                <div className="flex-1 max-w-md">
                  <label className="block text-sm font-medium text-slate-500 mb-2">Select Operator / Company</label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  >
                    <option value="">Choose a company to manage...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id.toString()}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {selectedCompanyId && (
                  <button
                    onClick={() => {
                      setAssignmentFormData({ ...assignmentFormData, company_id: selectedCompanyId });
                      setShowAssignmentModal(true);
                    }}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group h-fit"
                  >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    Assign Supplier to Company
                  </button>
                )}
              </div>

              {!selectedCompanyId ? (
                <div className="py-32 text-center glass rounded-3xl border-dashed border-2 border-slate-800">
                  <Building2 className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-slate-400 mb-2">No Company Selected</h3>
                  <p className="text-slate-600">Select a company above to view and manage its data suppliers.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {companySuppliers.map((cs) => (
                    <motion.div
                      layout
                      key={cs.id}
                      className="glass rounded-3xl border-slate-800 p-6 flex flex-col group relative overflow-hidden"
                    >
                      <div className={cn(
                        "absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10",
                        cs.active ? "bg-emerald-500" : "bg-rose-500"
                      )} />

                      <div className="flex items-start justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner">
                          <Truck className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div className="flex gap-2 relative z-10">
                          <button
                            onClick={() => navigate(`mapping/${cs.id}`)}
                            title="Email Details Mapping"
                            className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-500/10 rounded-lg transition-all"
                          >
                            <Tags className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(cs.id)}
                            className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-white mb-1">{cs.supplier_name}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <CheckCircle2 className={cn("w-3.5 h-3.5", cs.active ? "text-emerald-500" : "text-slate-700")} />
                          {cs.active ? "Actively Syncing" : "Paused"}
                        </div>
                      </div>

                      <div className="space-y-4 mb-8 flex-1">
                        <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Company-Specific Parsing</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {(() => {
                              try {
                                const emails = typeof cs.supplier_from_email === 'string' 
                                  ? JSON.parse(cs.supplier_from_email) 
                                  : cs.supplier_from_email;
                                return Array.isArray(emails) ? emails.map((email: string, idx: number) => (
                                  <div key={idx} className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-indigo-300">
                                    <Mail className="w-2.5 h-2.5 shadow-sm" />
                                    {email}
                                  </div>
                                )) : (
                                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-indigo-300">
                                    <Mail className="w-2.5 h-2.5" />
                                    {cs.supplier_from_email}
                                  </div>
                                );
                              } catch {
                                return (
                                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-indigo-300">
                                    <Mail className="w-2.5 h-2.5" />
                                    {cs.supplier_from_email}
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Commission</p>
                            <p className="text-lg font-bold text-white">{cs.commission}%</p>
                          </div>
                          <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Data Source</p>
                            <p className="text-sm font-bold text-white capitalize">{cs.data_from}</p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleActive(cs)}
                        className={cn(
                          "w-full py-3 rounded-2xl font-bold text-sm transition-all border",
                          cs.active
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                            : "bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
                        )}
                      >
                        {cs.active ? "Deactivate Sync" : "Activate Sync"}
                      </button>
                    </motion.div>
                  ))}
                  {companySuppliers.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-600">
                      No suppliers assigned to this company yet.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* Assignment Modal */}
      <AnimatePresence>
        {showAssignmentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssignmentModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass w-full max-w-xl rounded-3xl overflow-hidden relative z-10 p-8 shadow-2xl border-white/10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Plus className="w-6 h-6 text-indigo-400" />
                  Assign Supplier
                </h2>
                <button onClick={() => setShowAssignmentModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><X className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleAssignSupplier} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Select Master Supplier</label>
                  <select
                    required
                    value={assignmentFormData.supplier_id}
                    onChange={(e) => setAssignmentFormData({ ...assignmentFormData, supplier_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  >
                    <option value="">Choose from registry...</option>
                    {globalSuppliers
                      .filter(gs => !companySuppliers.some(cs => cs.supplier_id === gs.supplier_id))
                      .map(s => (
                        <option key={s.supplier_id} value={s.supplier_id.toString()}>{s.supplier_name}</option>
                      ))
                    }
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    Supplier not in the list? {' '}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssignmentModal(false);
                        setActiveTab('registry');
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors underline decoration-indigo-400/30 underline-offset-4"
                    >
                      Register a new master supplier
                    </button>
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-400">Company-Specific Parsing Emails</label>
                    <button
                      type="button"
                      onClick={() => setAssignmentFormData({
                        ...assignmentFormData,
                        supplier_from_emails: [...assignmentFormData.supplier_from_emails, '']
                      })}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Another
                    </button>
                  </div>
                  
                  {/* Master Email Suggestions */}
                  {assignmentFormData.supplier_id && (
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50 border-dashed">
                      <p className="w-full text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Master Registry Suggestions</p>
                      {globalSuppliers
                        .find(s => s.supplier_id === parseInt(assignmentFormData.supplier_id))
                        ?.from_email_address && (() => {
                          const masterEmails = (() => {
                            const val = globalSuppliers.find(s => s.supplier_id === parseInt(assignmentFormData.supplier_id))?.from_email_address;
                            try { return typeof val === 'string' ? JSON.parse(val) : (val || []); } catch { return val ? [val] : []; }
                          })();
                          
                          return (Array.isArray(masterEmails) ? masterEmails : [masterEmails]).map((email: string, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (!assignmentFormData.supplier_from_emails.includes(email)) {
                                  const baseEmails = assignmentFormData.supplier_from_emails.filter(e => e.trim() !== '');
                                  setAssignmentFormData({
                                    ...assignmentFormData,
                                    supplier_from_emails: [...baseEmails, email]
                                  });
                                }
                              }}
                              className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-500/20 transition-all flex items-center gap-1.5"
                            >
                              <Plus className="w-3 h-3" />
                              {email}
                            </button>
                          ));
                        })()
                      }
                    </div>
                  )}

                  <div className="space-y-3">
                    {assignmentFormData.supplier_from_emails.map((email, idx) => (
                      <div key={idx} className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            required
                            type="email"
                            value={email}
                            onChange={(e) => {
                              const newEmails = [...assignmentFormData.supplier_from_emails];
                              newEmails[idx] = e.target.value;
                              setAssignmentFormData({ ...assignmentFormData, supplier_from_emails: newEmails });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                            placeholder="e.g. bookings@heathrow-elite.co.uk"
                          />
                        </div>
                        {assignmentFormData.supplier_from_emails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newEmails = assignmentFormData.supplier_from_emails.filter((_, i) => i !== idx);
                              setAssignmentFormData({ ...assignmentFormData, supplier_from_emails: newEmails });
                            }}
                            className="p-3 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-slate-800"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Sync Toggle */}
                  <label className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 cursor-pointer group hover:bg-slate-800/50 transition-all">
                    <input
                      type="checkbox"
                      checked={assignmentFormData.syncToRegistry}
                      onChange={(e) => setAssignmentFormData({ ...assignmentFormData, syncToRegistry: e.target.checked })}
                      className="w-5 h-5 rounded-lg border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500/50"
                    />
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Sync to Master Registry</p>
                      <p className="text-[10px] text-slate-500">Promote these emails to the global supplier defaults.</p>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Commission (%)</label>
                    <input required type="number" step="0.01" value={assignmentFormData.commission} onChange={(e) => setAssignmentFormData({ ...assignmentFormData, commission: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Data Source</label>
                    <select value={assignmentFormData.data_from} onChange={(e) => setAssignmentFormData({ ...assignmentFormData, data_from: e.target.value as any })} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none">
                      <option value="both">Both (CSV & Body)</option>
                      <option value="csv">CSV Attachment Only</option>
                      <option value="body">Email Body Only</option>
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl py-4 font-bold shadow-xl shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Establish Connection"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Suppliers;
