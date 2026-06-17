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
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string; type: 'supplier' | 'assignment' } | null>(null);

  const [assignmentFormData, setAssignmentFormData] = useState({
    company_id: '',
    supplier_id: '',
    supplier_from_emails: [''] as string[],
    commission: '0',
    data_from: 'both' as 'csv' | 'body' | 'both',
    syncToRegistry: false
  });

  useEffect(() => { fetchInitialData(); }, []);
  useEffect(() => {
    if (selectedCompanyId) fetchCompanySuppliers(selectedCompanyId);
    else setCompanySuppliers([]);
  }, [selectedCompanyId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [suppliersRes, companiesRes] = await Promise.all([api.get('suppliers'), api.get('companies')]);
      setGlobalSuppliers(suppliersRes.data.data);
      setCompanies(companiesRes.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchCompanySuppliers = async (companyId: string) => {
    try {
      const response = await api.get(`companies/${companyId}/suppliers`);
      setCompanySuppliers(response.data.data);
    } catch (err) { console.error(err); }
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
        if (selectedCompanyId === assignmentFormData.company_id) fetchCompanySuppliers(selectedCompanyId);
        setAssignmentFormData({ company_id: selectedCompanyId, supplier_id: '', supplier_from_emails: [''], commission: '0', data_from: 'both', syncToRegistry: false });
      }
    } catch (err) { console.error(err); }
    finally { setIsSubmitting(false); }
  };

  const handleToggleActive = async (assignment: CompanySupplier) => {
    try {
      await api.put(`company-suppliers/${assignment.id}`, {
        active: assignment.active ? 0 : 1,
        commission: assignment.commission,
        data_from: assignment.data_from,
        supplier_from_email: assignment.supplier_from_email
      });
      fetchCompanySuppliers(selectedCompanyId);
    } catch (err) { console.error(err); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'supplier') {
        await api.delete(`suppliers/${deleteTarget.id}`);
        fetchInitialData();
      } else {
        await api.delete(`company-suppliers/${deleteTarget.id}`);
        fetchCompanySuppliers(selectedCompanyId);
      }
    } catch (err) { console.error(err); }
    finally { setDeleteTarget(null); }
  };

  const getEmails = (raw: string): string[] => {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch { return [raw]; }
  };

  return (
    <div className="w-full min-w-0">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Suppliers Management</h1>
          </div>
          <p className="text-slate-500 text-xs">Manage the global supplier registry and company-specific data pipelines</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('registry')}
            className={cn("px-4 py-2 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5",
              activeTab === 'registry' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white")}
          >
            <Globe className="w-3.5 h-3.5" />Registry
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={cn("px-4 py-2 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5",
              activeTab === 'assignments' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white")}
          >
            <Settings2 className="w-3.5 h-3.5" />Company Links
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Registry Tab ── */}
          {activeTab === 'registry' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Master Supplier Registry</h2>
                  <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-lg text-xs font-bold border border-slate-700">
                    {globalSuppliers.length}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/suppliers/register')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold border border-white/10 rounded-xl transition-all self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />Register New Supplier
                </button>
              </div>

              {globalSuppliers.length === 0 ? (
                <div className="py-16 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
                  <AlertCircle className="w-9 h-9 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No master suppliers registered.</p>
                </div>
              ) : (
                <>
                  <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800">
                            {['S.N', 'Supplier', 'From Emails', 'Commission', 'Status', 'Actions'].map(h => (
                              <th key={h} className={cn(
                                "text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap bg-slate-900/60",
                                ['S.N', 'Commission', 'Status', 'Actions'].includes(h) ? 'text-center' : 'text-left'
                              )}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {globalSuppliers.map((s, index) => (
                            <motion.tr key={s.supplier_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 text-xs text-slate-600 font-mono text-center whitespace-nowrap">{index + 1}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                                    <Truck className="w-4 h-4 text-indigo-400" />
                                  </div>
                                  <span className="text-sm font-bold text-white">{s.supplier_name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {s.all_sender_emails?.map((email, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-[10px] font-mono text-indigo-300">
                                      <Mail className="w-2.5 h-2.5 text-sky-500 shrink-0" />{email}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <span className="text-sm font-bold text-white">{s.commission != null ? `${s.commission}%` : '—'}</span>
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <span className={cn("text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1",
                                  s.supplier_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
                                  <span className={cn("w-1 h-1 rounded-full", s.supplier_active ? "bg-emerald-400" : "bg-rose-400")} />
                                  {s.supplier_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => navigate(`/suppliers/${s.supplier_id}/edit`)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all" title="Edit">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setDeleteTarget({ id: s.supplier_id, name: s.supplier_name, type: 'supplier' })} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all" title="Delete">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </>
              )}
            </motion.div>
          )}

          {/* ── Assignments Tab ── */}
          {activeTab === 'assignments' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Company selector */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 bg-slate-900/50 p-4 md:p-6 rounded-xl border border-slate-800">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Operator / Company</label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  >
                    <option value="">Choose a company to manage...</option>
                    {companies.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                  </select>
                </div>
                {selectedCompanyId && (
                  <button
                    onClick={() => { setAssignmentFormData({ ...assignmentFormData, company_id: selectedCompanyId }); setShowAssignmentModal(true); }}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />Assign Supplier
                  </button>
                )}
              </div>

              {!selectedCompanyId ? (
                <div className="py-20 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
                  <Building2 className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <h3 className="text-base font-bold text-slate-400 mb-1">No Company Selected</h3>
                  <p className="text-slate-600 text-sm">Select a company above to view and manage its data suppliers.</p>
                </div>
              ) : companySuppliers.length === 0 ? (
                <div className="py-16 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
                  <Truck className="w-9 h-9 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No suppliers assigned to this company yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {companySuppliers.map((cs) => {
                    const emails = getEmails(cs.supplier_from_email);
                    return (
                      <motion.div layout key={cs.id} className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 flex flex-col relative overflow-hidden group">
                        <div className={cn("absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full opacity-10", cs.active ? "bg-emerald-500" : "bg-rose-500")} />
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                              <Truck className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{cs.supplier_name}</p>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <CheckCircle2 className={cn("w-3 h-3", cs.active ? "text-emerald-500" : "text-slate-700")} />
                                {cs.active ? 'Actively Syncing' : 'Paused'}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 relative z-10">
                            <button onClick={() => navigate(`mapping/${cs.id}`)} title="Field Mapping" className="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-500/10 rounded-lg transition-all">
                              <Tags className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget({ id: cs.id, name: cs.supplier_name, type: 'assignment' })} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 mb-3">
                          <p className="w-full text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Parsing Emails</p>
                          {emails.map((email, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-[10px] font-mono text-indigo-300">
                              <Mail className="w-2.5 h-2.5 shrink-0" />{email}
                            </span>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/50">
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Commission</p>
                            <p className="text-base font-bold text-white">{cs.commission}%</p>
                          </div>
                          <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/50">
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Data Source</p>
                            <p className="text-sm font-bold text-white capitalize">{cs.data_from}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleActive(cs)}
                          className={cn("w-full py-2.5 rounded-xl font-bold text-sm transition-all border mt-auto",
                            cs.active ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20" : "bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20 hover:scale-[1.02]")}
                        >
                          {cs.active ? 'Deactivate Sync' : 'Activate Sync'}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteTarget(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative z-10 bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-2">
                {deleteTarget.type === 'supplier' ? 'Delete Supplier?' : 'Unassign Supplier?'}
              </h3>
              <p className="text-slate-400 text-sm text-center mb-6">
                <span className="text-white font-semibold">{deleteTarget.name}</span> will be {deleteTarget.type === 'supplier' ? 'removed from the registry' : 'unassigned from this company'}.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-sm font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors">
                  {deleteTarget.type === 'supplier' ? 'Delete' : 'Unassign'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assignment Modal */}
      <AnimatePresence>
        {showAssignmentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssignmentModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-400" />Assign Supplier
                </h2>
                <button onClick={() => setShowAssignmentModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAssignSupplier} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Master Supplier</label>
                  <select required value={assignmentFormData.supplier_id}
                    onChange={(e) => setAssignmentFormData({ ...assignmentFormData, supplier_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none">
                    <option value="">Choose from registry...</option>
                    {globalSuppliers.filter(gs => !companySuppliers.some(cs => cs.supplier_id === gs.supplier_id)).map(s => (
                      <option key={s.supplier_id} value={s.supplier_id.toString()}>{s.supplier_name}</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Not listed?{' '}
                    <button type="button" onClick={() => { setShowAssignmentModal(false); setActiveTab('registry'); }} className="text-indigo-400 hover:text-indigo-300 font-bold underline decoration-indigo-400/30 underline-offset-4">
                      Register a new supplier
                    </button>
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company-Specific Parsing Emails</label>
                    <button type="button" onClick={() => setAssignmentFormData({ ...assignmentFormData, supplier_from_emails: [...assignmentFormData.supplier_from_emails, ''] })}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      <Plus className="w-3 h-3" />Add Another
                    </button>
                  </div>

                  {assignmentFormData.supplier_id && (() => {
                    const supplier = globalSuppliers.find(s => s.supplier_id === parseInt(assignmentFormData.supplier_id));
                    if (!supplier?.from_email_address) return null;
                    const masterEmails = (() => { try { return typeof supplier.from_email_address === 'string' ? JSON.parse(supplier.from_email_address) : (supplier.from_email_address || []); } catch { return supplier.from_email_address ? [supplier.from_email_address] : []; } })();
                    return (
                      <div className="flex flex-wrap gap-2 p-3 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                        <p className="w-full text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Master Registry Suggestions</p>
                        {(Array.isArray(masterEmails) ? masterEmails : [masterEmails]).map((email: string, idx: number) => (
                          <button key={idx} type="button"
                            onClick={() => { if (!assignmentFormData.supplier_from_emails.includes(email)) { const base = assignmentFormData.supplier_from_emails.filter(e => e.trim() !== ''); setAssignmentFormData({ ...assignmentFormData, supplier_from_emails: [...base, email] }); } }}
                            className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-500/20 transition-all flex items-center gap-1.5">
                            <Plus className="w-3 h-3" />{email}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {assignmentFormData.supplier_from_emails.map((email, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input required type="email" value={email}
                          onChange={(e) => { const n = [...assignmentFormData.supplier_from_emails]; n[idx] = e.target.value; setAssignmentFormData({ ...assignmentFormData, supplier_from_emails: n }); }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                          placeholder="e.g. bookings@supplier.com" />
                      </div>
                      {assignmentFormData.supplier_from_emails.length > 1 && (
                        <button type="button" onClick={() => { const n = assignmentFormData.supplier_from_emails.filter((_, i) => i !== idx); setAssignmentFormData({ ...assignmentFormData, supplier_from_emails: n }); }}
                          className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-slate-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <label className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-all">
                    <input type="checkbox" checked={assignmentFormData.syncToRegistry}
                      onChange={(e) => setAssignmentFormData({ ...assignmentFormData, syncToRegistry: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500/50" />
                    <div>
                      <p className="text-sm font-bold text-white">Sync to Master Registry</p>
                      <p className="text-[10px] text-slate-500">Promote these emails to the global supplier defaults.</p>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Commission (%)</label>
                    <input required type="number" step="0.01" value={assignmentFormData.commission}
                      onChange={(e) => setAssignmentFormData({ ...assignmentFormData, commission: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data Source</label>
                    <select value={assignmentFormData.data_from}
                      onChange={(e) => setAssignmentFormData({ ...assignmentFormData, data_from: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none">
                      <option value="both">Both (CSV & Body)</option>
                      <option value="csv">CSV Only</option>
                      <option value="body">Email Body Only</option>
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl py-3 font-bold shadow-xl shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Establish Connection'}
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
