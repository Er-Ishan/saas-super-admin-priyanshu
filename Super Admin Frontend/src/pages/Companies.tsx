import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Plus, Loader2, Search, Pencil, Trash2,
  Mail, AlertTriangle, X, ExternalLink,
  Server, CreditCard, CheckCircle2,
  Key, ShieldAlert
} from 'lucide-react';
import api, { IMAGE_BASE_URL } from '../lib/axios';
import { cn } from '../lib/utils';

interface Company {
  id: number;
  name: string;
  email?: string;
  domain?: string;
  mobile_no?: string;
  address?: string;
  status: string;
  active: number;
  logo_url?: string;
  support_email_address?: string;
  support_contact_no?: string;
  owner_name?: string;
  registration_no?: string;
  business_type?: string;
  business_catrgory?: string;
  office_hours?: string;
  ref_prefix?: string;
}

interface EmailSettings {
  smtp_host: string;
  smtp_port: string | number;
  smtp_username: string;
  smtp_encryption: string;
  from_email: string;
  from_name: string;
  reply_email: string;
  cc_email: string;
  bcc_email: string;
}

interface PaymentGateway {
  acc_name: string;
  public_key: string;
  mode: string;
  webhook_secret?: string;
}

interface ActivePopup {
  companyId: number;
  companyName: string;
  type: 'email' | 'payment';
  data: EmailSettings | PaymentGateway | null;
  loading: boolean;
  error: string | null;
}

const Cell = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={cn("px-3 py-2.5 text-xs text-slate-300 whitespace-nowrap align-middle", className)}>
    {children}
  </td>
);

const Dash = () => <span className="text-slate-700">—</span>;

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex gap-4 py-2 border-b border-slate-800/60 last:border-0">
    <span className="text-slate-500 text-xs w-40 shrink-0">{label}</span>
    <span className="text-white text-xs font-medium break-all">{value || <span className="text-slate-700">—</span>}</span>
  </div>
);

const Companies: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activePopup, setActivePopup] = useState<ActivePopup | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.domain?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/companies');
      setCompanies(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openPopup = async (company: Company, type: 'email' | 'payment') => {
    setActivePopup({ companyId: company.id, companyName: company.name, type, data: null, loading: true, error: null });
    try {
      const endpoint = type === 'email'
        ? `/companies/${company.id}/email-settings`
        : `/companies/${company.id}/payment-gateway`;
      const res = await api.get(endpoint);
      setActivePopup(prev => prev ? { ...prev, data: res.data.data, loading: false } : null);
    } catch {
      setActivePopup(prev => prev ? { ...prev, loading: false, error: 'No settings configured yet.' } : null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/companies/${deleteTarget.id}`);
      setCompanies(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete company. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const TH = ({ children, center }: { children: React.ReactNode; center?: boolean }) => (
    <th className={cn(
      "text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2.5 whitespace-nowrap bg-slate-900/60",
      center ? "text-center" : "text-left"
    )}>
      {children}
    </th>
  );

  return (
    <div className="w-full min-w-0">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Companies</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage and onboard parking operators.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-sky-500 transition-colors" />
            <input
              type="text"
              placeholder="Search name, email, domain…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-48 sm:w-64 bg-slate-900/60 border border-slate-800 rounded-lg py-2 pl-8 pr-3 text-xs text-white focus:ring-2 focus:ring-sky-500/40 outline-none placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={() => navigate('/companies/onboard')}
            className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 group whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            Onboard Company
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
        </div>
      ) : filteredCompanies.length === 0 ? (
        /* ── Empty ── */
        <div className="py-20 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
          <Search className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">No companies found</p>
          <p className="text-slate-500 text-sm mb-4">No results for "{searchTerm}"</p>
          <button onClick={() => setSearchTerm('')} className="text-sky-400 text-sm font-semibold hover:text-sky-300">Clear search</button>
        </div>
      ) : (
        <>
          {/* ── Count bar ── */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-500">
              {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'}
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
                    <TH>Company</TH>
                    {/* <TH>Owner</TH> */}
                    {/* <TH>Reg No</TH> */}
                    <TH>Email</TH>
                    {/* <TH>Support Email</TH> */}
                    <TH>Domain</TH>
                    <TH>Phone</TH>
                    {/* <TH>Support Phone</TH> */}
                    <TH>Type</TH>
                    <TH>Category</TH>
                    {/* <TH>Ref Prefix</TH> */}
                    {/* <TH>Office Hours</TH> */}
                    {/* <TH>Address</TH> */}
                    <TH center>Status</TH>
                    <TH center>Email Settings</TH>
                    <TH center>Payment GW</TH>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredCompanies.map((company, i) => (
                    <motion.tr
                      key={company.id}
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
                          <button onClick={() => navigate(`/companies/${company.id}`)} title="View" className="p-1 text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 rounded transition-all">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => navigate(`/companies/${company.id}/settings`)} title="Edit" className="p-1 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-all">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(company)} title="Delete" className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </Cell>

                      {/* Company */}
                      <Cell>
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 overflow-hidden shrink-0">
                            {company.logo_url
                              ? <img src={company.logo_url.startsWith('data:') ? company.logo_url : `${IMAGE_BASE_URL}${company.logo_url}`} alt="" className="w-full h-full object-cover" />
                              : <Building2 className="w-5 h-5 text-slate-500" />}
                          </div>
                          <span className="font-semibold text-white truncate max-w-[120px]" title={company.name}>{company.name}</span>
                        </div>
                      </Cell>

                      {/* <Cell><span className="truncate max-w-[110px] block" title={company.owner_name}>{company.owner_name || <Dash />}</span></Cell> */}
                      {/* <Cell><span className="font-mono text-slate-400">{company.registration_no || <Dash />}</span></Cell> */}
                      <Cell><span className="truncate max-w-[150px] block text-slate-400" title={company.email}>{company.email || <Dash />}</span></Cell>
                      {/* <Cell><span className="truncate max-w-[150px] block text-slate-400" title={company.support_email_address}>{company.support_email_address || <Dash />}</span></Cell> */}
                      <Cell><span className="truncate max-w-[120px] block text-slate-400" title={company.domain}>{company.domain || <Dash />}</span></Cell>
                      <Cell><span className="text-slate-400">{company.mobile_no || <Dash />}</span></Cell>
                      {/* <Cell><span className="text-slate-400">{company.support_contact_no || <Dash />}</span></Cell> */}

                      {/* Business Type */}
                      <Cell>
                        {company.business_type
                          ? <span className="capitalize text-slate-400">{company.business_type}</span>
                          : <Dash />}
                      </Cell>

                      {/* Category */}
                      <Cell>
                        {company.business_catrgory
                          ? <span className="capitalize text-slate-400">{company.business_catrgory}</span>
                          : <Dash />}
                      </Cell>

                      {/* <Cell>
                        {company.ref_prefix
                          ? <span className="font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded text-[10px]">{company.ref_prefix}</span>
                          : <Dash />}
                      </Cell> */}

                      {/* <Cell><span className="text-slate-400 truncate max-w-[120px] block">{company.office_hours || <Dash />}</span></Cell> */}
                      {/* <Cell><span className="truncate max-w-[130px] block text-slate-400" title={company.address}>{company.address || <Dash />}</span></Cell> */}

                      {/* Status */}
                      <Cell className="text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded",
                          company.active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-800 text-slate-500 border border-slate-700"
                        )}>
                          <span className={cn("w-1 h-1 rounded-full", company.active ? "bg-emerald-400" : "bg-slate-600")} />
                          {company.active ? 'Active' : 'Inactive'}
                        </span>
                      </Cell>

                      {/* Email Settings */}
                      <Cell className="text-center">
                        <button
                          onClick={() => openPopup(company, 'email')}
                          title="Email Settings"
                          className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-all"
                        >
                          <Server className="w-3.5 h-3.5" />
                        </button>
                      </Cell>

                      {/* Payment Gateway */}
                      <Cell className="text-center">
                        <button
                          onClick={() => openPopup(company, 'payment')}
                          title="Payment Gateway"
                          className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                      </Cell>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}

      {/* ── Email / Payment Popup ── */}
      <AnimatePresence>
        {activePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setActivePopup(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              {/* Popup Header */}
              <div className={cn(
                "flex items-center justify-between px-5 py-4 border-b border-slate-800",
                activePopup.type === 'email' ? "bg-indigo-500/5" : "bg-emerald-500/5"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border",
                    activePopup.type === 'email'
                      ? "bg-indigo-500/10 border-indigo-500/30"
                      : "bg-emerald-500/10 border-emerald-500/30"
                  )}>
                    {activePopup.type === 'email'
                      ? <Server className="w-4 h-4 text-indigo-400" />
                      : <CreditCard className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">
                      {activePopup.type === 'email' ? 'Email Settings' : 'Payment Gateway'}
                    </p>
                    <p className="text-slate-500 text-xs">{activePopup.companyName}</p>
                  </div>
                </div>
                <button onClick={() => setActivePopup(null)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Popup Body */}
              <div className="px-5 py-4 max-h-[65vh] overflow-y-auto">
                {activePopup.loading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                    <p className="text-slate-500 text-sm">Loading…</p>
                  </div>
                ) : activePopup.error || !activePopup.data ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-slate-500" />
                    </div>
                    <p className="text-slate-400 font-semibold text-sm">Not configured</p>
                    <p className="text-slate-600 text-xs">
                      {activePopup.type === 'email' ? 'Email settings have' : 'Payment gateway has'} not been set up yet.
                    </p>
                    <button
                      onClick={() => { setActivePopup(null); navigate(`/companies/${activePopup.companyId}/settings`); }}
                      className="mt-1 text-sky-400 text-xs font-semibold hover:text-sky-300"
                    >
                      Configure now →
                    </button>
                  </div>
                ) : activePopup.type === 'email' ? (
                  <EmailSettingsView data={activePopup.data as EmailSettings} />
                ) : (
                  <PaymentGatewayView data={activePopup.data as PaymentGateway} />
                )}
              </div>

              {/* Popup Footer */}
              {!activePopup.loading && activePopup.data && (
                <div className="px-5 py-3.5 border-t border-slate-800 flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setActivePopup(null); navigate(`/companies/${activePopup.companyId}/settings`); }}
                      className="px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                    >
                      Edit Settings
                    </button>
                    <button
                      onClick={() => setActivePopup(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm ── */}
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
                  <h3 className="text-sm font-bold text-white mb-1">Delete Company</h3>
                  <p className="text-xs text-slate-400">
                    Are you sure you want to delete <span className="text-white font-semibold">{deleteTarget.name}</span>? This cannot be undone.
                  </p>
                </div>
                <button onClick={() => setDeleteTarget(null)} className="p-1 text-slate-600 hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {deleteError && (
                <p className="mt-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{deleteError}</p>
              )}
              <div className="flex gap-3 mt-5">
                <button onClick={() => { setDeleteTarget(null); setDeleteError(null); }} className="flex-1 px-4 py-2 text-xs font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
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

/* ─── Sub-views ─── */
const EmailSettingsView: React.FC<{ data: EmailSettings }> = ({ data }) => (
  <div>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
      <Server className="w-3 h-3" /> SMTP Configuration
    </p>
    <DetailRow label="SMTP Host" value={data.smtp_host} />
    <DetailRow label="SMTP Port" value={data.smtp_port} />
    <DetailRow label="Encryption" value={String(data.smtp_encryption).toUpperCase()} />
    <DetailRow label="Username" value={data.smtp_username} />
    <DetailRow label="Password" value="••••••••" />
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4 mb-2 flex items-center gap-1.5">
      <Mail className="w-3 h-3" /> Sender Info
    </p>
    <DetailRow label="From Email" value={data.from_email} />
    <DetailRow label="From Name" value={data.from_name} />
    <DetailRow label="Reply-To" value={data.reply_email} />
    <DetailRow label="CC" value={data.cc_email} />
    <DetailRow label="BCC" value={data.bcc_email} />
  </div>
);

const PaymentGatewayView: React.FC<{ data: PaymentGateway }> = ({ data }) => (
  <div>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
      <CreditCard className="w-3 h-3" /> Gateway Details
    </p>
    <DetailRow label="Provider" value={data.acc_name} />
    <div className="flex gap-4 py-2 border-b border-slate-800/60">
      <span className="text-slate-500 text-xs w-40 shrink-0">Mode</span>
      <span className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md",
        data.mode === 'live'
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
      )}>
        <span className={cn("w-1 h-1 rounded-full", data.mode === 'live' ? "bg-emerald-400" : "bg-amber-400")} />
        {data.mode === 'live' ? 'Live' : 'Test Mode'}
      </span>
    </div>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4 mb-2 flex items-center gap-1.5">
      <Key className="w-3 h-3" /> Keys
    </p>
    <div className="flex gap-4 py-2 border-b border-slate-800/60">
      <span className="text-slate-500 text-xs w-40 shrink-0">Publishable Key</span>
      <span className="text-white text-xs font-mono break-all">{data.public_key || '—'}</span>
    </div>
    <DetailRow label="Secret Key" value="••••••••" />
    {data.webhook_secret !== undefined && <DetailRow label="Webhook Secret" value="••••••••" />}
  </div>
);

export default Companies;
