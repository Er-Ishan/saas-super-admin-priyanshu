import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Mail, Globe, Loader2,
  ArrowLeft, ShieldCheck, LayoutGrid,
  Truck, CheckCircle2, Tags, ExternalLink, ShieldAlert,
  Settings, X, Save, Lock, Plus
} from 'lucide-react';
import api, { IMAGE_BASE_URL } from '../lib/axios';
import { cn } from '../lib/utils';

interface ParsingInfo {
  company_parsing_email: string;
  email_password: string;
  email_host: string;
}

interface Supplier {
  id: number;
  supplier_id: number;
  supplier_name: string;
  supplier_from_email: string;
  active: number;
  data_from: string;
  commission: string;
  master_from_email: string;
  has_mapping: boolean;
  mapped_count: number;
  total_fields: number;
}

interface CompanyDetails {
  id: number;
  name: string;
  email: string;
  domain: string;
  address: string;
  mobile_no: string;
  status: string;
  active: number;
  email_parsing: number;
  logo_url?: string;
  support_email_address?: string;
  support_contact_no?: string;
  parsing_info: ParsingInfo | null;
  suppliers: Supplier[];
}

const CompanyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<{ active?: boolean; parsing?: boolean }>({});
  const [showParsingModal, setShowParsingModal] = useState(false);
  const [parsingFormData, setParsingFormData] = useState<ParsingInfo>({
    company_parsing_email: '',
    email_password: '',
    email_host: ''
  });
  const [logoLoading, setLogoLoading] = useState(false);

  useEffect(() => {
    fetchCompanyDetails();
  }, [id]);

  const fetchCompanyDetails = async () => {
    try {
      const response = await api.get(`/companies/${id}`);
      setData(response.data.data);
    } catch (err) {
      console.error('Error fetching company details:', err);
      setError('Failed to load company details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (type: 'active' | 'parsing') => {
    if (!data) return;

    // Use status as source of truth for company activation
    const currentIsActive = type === 'active' 
      ? (data.status === 'active') 
      : (!!data.email_parsing);
    
    const newVal = !currentIsActive;

    setIsUpdating(prev => ({ ...prev, [type]: true }));
    try {
      const payload = type === 'active' 
        ? { active: newVal } 
        : { email_parsing: newVal };

      const response = await api.patch(`/companies/${id}/status`, payload);
      
      if (response.data.success) {
        // Update local state
        setData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            active: type === 'active' ? (newVal ? 1 : 0) : prev.active,
            status: type === 'active' ? (newVal ? 'active' : 'inactive') : prev.status,
            email_parsing: type === 'parsing' ? (newVal ? 1 : 0) : prev.email_parsing
          };
        });
      }
    } catch (err: any) {
      console.error(`Error updating ${type} status:`, err);
      alert(`Failed to update ${type} status: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsUpdating(prev => ({ ...prev, [type]: false }));
    }
  };
  const handleParsingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(prev => ({ ...prev, parsing: true }));
    try {
      const response = await api.put(`/companies/${id}/parsing-info`, parsingFormData);
      if (response.data.success) {
        setShowParsingModal(false);
        fetchCompanyDetails();
      }
    } catch (err: any) {
      console.error('Error updating parsing info:', err);
      alert(err.response?.data?.message || 'Failed to update parsing info');
    } finally {
      setIsUpdating(prev => ({ ...prev, parsing: false }));
    }
  };

  const openParsingModal = () => {
    if (data?.parsing_info) {
      setParsingFormData(data.parsing_info);
    } else {
      setParsingFormData({
        company_parsing_email: '',
        email_password: '',
        email_host: 'imap.gmail.com' // Default common host
      });
    }
    setShowParsingModal(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoLoading(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await api.patch(`/companies/${id}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setData(prev => prev ? { ...prev, logo_url: response.data.logo_url } : null);
      }
    } catch (err: any) {
      console.error('Logo upload failed:', err);
      alert(err.response?.data?.message || 'Logo upload failed');
    } finally {
      setLogoLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin mb-4" />
        <p className="text-slate-400 animate-pulse font-medium">Fetching company data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
          <ShieldAlert className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Oops! Something went wrong</h2>
        <p className="text-slate-400 mb-8">{error || 'Unable to find the requested company.'}</p>
        <button
          onClick={() => navigate('/companies')}
          className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Companies
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="w-full min-w-0 pb-10">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:flex-wrap gap-4 mb-8">

        {/* Back button */}
        <button
          onClick={() => navigate('/companies')}
          className="w-10 h-10 shrink-0 bg-slate-900/50 rounded-xl flex items-center justify-center border border-slate-800 hover:border-sky-500/50 hover:text-sky-400 transition-all text-slate-400 group self-start md:self-auto"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* Logo */}
        <div className="relative group shrink-0">
          <div className="w-14 h-14 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center group-hover:border-sky-500/50 transition-all">
            {data.logo_url ? (
              <img
                src={data.logo_url.startsWith('data:') ? data.logo_url : `${IMAGE_BASE_URL}${data.logo_url}`}
                alt={data.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-7 h-7 text-slate-700" />
            )}
            {logoLoading && (
              <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
              </div>
            )}
          </div>
          <label className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-sky-500 rounded-lg flex items-center justify-center cursor-pointer hover:bg-sky-400 transition-colors shadow-lg border-2 border-slate-950">
            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
            <Plus className="w-3 h-3 text-white" />
          </label>
        </div>

        {/* Company name + ID — grows to fill space */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white break-words min-w-0">{data.name}</h1>
            <span className={cn(
              "text-xs uppercase tracking-widest font-bold px-2.5 py-1 rounded-md shrink-0",
              data.active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            )}>
              {data.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-slate-500 text-sm">Company ID: <span className="text-slate-300">#{data.id}</span></p>
        </div>

        {/* Service toggle buttons — right side on desktop */}
        <div className="flex flex-wrap gap-2 sm:ml-auto shrink-0">
          <button
            onClick={() => toggleStatus('active')}
            disabled={isUpdating.active}
            title={data.active ? 'Click to deactivate' : 'Click to activate'}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-800/50 transition-all disabled:opacity-50 group cursor-pointer"
          >
            {isUpdating.active
              ? <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
              : <div className={cn("w-2.5 h-2.5 rounded-full transition-all duration-500 shrink-0",
                  data.active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-700 group-hover:bg-slate-500")} />}
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Company</span>
              <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Operational</span>
            </div>
          </button>

          <button
            onClick={() => toggleStatus('parsing')}
            disabled={isUpdating.parsing}
            title={data.email_parsing ? 'Click to disable parsing' : 'Click to enable parsing'}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-800/50 transition-all disabled:opacity-50 group cursor-pointer"
          >
            {isUpdating.parsing
              ? <Loader2 className="w-3 h-3 text-sky-500 animate-spin" />
              : <div className={cn("w-2.5 h-2.5 rounded-full transition-all duration-500 shrink-0",
                  data.email_parsing ? "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" : "bg-slate-700 group-hover:bg-slate-500")} />}
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Service</span>
              <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Email Parsing</span>
            </div>
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden mb-6"
      >
        {/* ── General Information header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">General Information</span>
          </div>
          <button
            onClick={() => navigate(`/companies/${id}/settings`)}
            title="Edit Details"
            className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                {['Official Email', 'Domain / Website', 'Contact No.', 'Support Email', 'Support Contact', 'Address'].map(h => (
                  <th key={h} className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3 text-left whitespace-nowrap bg-slate-900/40">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-4 text-sm text-white whitespace-nowrap">{data.email || <span className="text-slate-700">—</span>}</td>
                <td className="px-4 py-4 text-sm text-white whitespace-nowrap">{data.domain || <span className="text-slate-700">—</span>}</td>
                <td className="px-4 py-4 text-sm text-white whitespace-nowrap">{data.mobile_no || <span className="text-slate-700">—</span>}</td>
                <td className="px-4 py-4 text-sm text-white whitespace-nowrap">{data.support_email_address || <span className="text-slate-700">—</span>}</td>
                <td className="px-4 py-4 text-sm text-white whitespace-nowrap">{data.support_contact_no || <span className="text-slate-700">—</span>}</td>
                <td className="px-4 py-4 text-sm text-white">{data.address || <span className="text-slate-700">—</span>}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Email Parsing Pipeline header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Email Parsing Pipeline</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openParsingModal}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-all"
            >
              <Settings className="w-3 h-3" />
              {data.parsing_info ? 'Edit Config' : 'Setup Pipeline'}
            </button>
            {data.email_parsing ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                <CheckCircle2 className="w-2.5 h-2.5" />ACTIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
                <ShieldAlert className="w-2.5 h-2.5" />DISABLED
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                {['Parsing Inbox', 'IMAP Host', 'Auth Token'].map(h => (
                  <th key={h} className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3 text-left whitespace-nowrap bg-slate-900/40">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-4 text-sm font-mono">
                  {data.parsing_info?.company_parsing_email
                    ? <span className="text-indigo-400">{data.parsing_info.company_parsing_email}</span>
                    : <span className="text-slate-700">No email configured</span>}
                </td>
                <td className="px-4 py-4 text-sm font-mono text-white whitespace-nowrap">
                  {data.parsing_info?.email_host || <span className="text-slate-500 font-sans">Automatic detection</span>}
                </td>
                <td className="px-4 py-4 text-sm font-mono">
                  {data.parsing_info?.email_password
                    ? <span className="tracking-widest text-emerald-400">••••••••••••</span>
                    : <span className="text-slate-700">None established</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-800/50 bg-indigo-500/5">
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="text-indigo-400 font-bold">Note: </span>
            This configuration allows our processing engine to securely monitor and extract booking data from the company's designated mailbox.
          </p>
        </div>
      </motion.div>

      {/* Suppliers Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
          <h2 className="text-lg md:text-2xl font-bold text-white flex items-center gap-3">
            <Truck className="w-5 h-5 md:w-7 md:h-7 text-indigo-500 shrink-0" />
            Connected Suppliers
            <span className="bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-slate-700">
              {data.suppliers.length}
            </span>
          </h2>
          <button
            onClick={() => navigate(`/suppliers?companyId=${data.id}&tab=assignments`)}
            className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 group border border-sky-500/10 px-3 py-2 rounded-xl hover:bg-sky-500/5 transition-all self-start sm:self-auto whitespace-nowrap"
          >
            Manage Assignments
            <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>

        {data.suppliers.length === 0 ? (
          <div className="py-14 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
            <Truck className="w-9 h-9 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium text-sm">No suppliers connected to this company.</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['S.N', 'Supplier Name', 'From Emails', 'Master Email', 'Commission', 'Source', 'Status', 'Mapped Fields', 'Actions'].map(h => (
                        <th key={h} className={cn(
                          "text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap bg-slate-900/60",
                          h === 'S.N' || h === 'Commission' || h === 'Status' || h === 'Actions' ? 'text-center' : 'text-left'
                        )}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {data.suppliers.map((supplier, index) => {
                      const emails: string[] = (() => {
                        try {
                          const parsed = typeof supplier.supplier_from_email === 'string'
                            ? JSON.parse(supplier.supplier_from_email)
                            : supplier.supplier_from_email;
                          return Array.isArray(parsed) ? parsed : [String(parsed)];
                        } catch {
                          return [supplier.supplier_from_email];
                        }
                      })();
                      return (
                        <motion.tr
                          key={supplier.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 + index * 0.03 }}
                          className="hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-slate-600 font-mono text-center whitespace-nowrap">{index + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 shrink-0">
                                <Truck className="w-3.5 h-3.5 text-indigo-400" />
                              </div>
                              <span className="text-sm font-semibold text-white">{supplier.supplier_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {emails.map((email, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-[10px] font-mono text-indigo-300">
                                  <Mail className="w-2.5 h-2.5 shrink-0" />{email}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {supplier.master_from_email ? <span className="font-mono">{supplier.master_from_email}</span> : <span className="text-slate-700">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="text-sm font-bold text-white">{supplier.commission}</span>
                            <span className="text-xs text-slate-500 ml-0.5">%</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs font-medium text-slate-300 capitalize">{supplier.data_from}</span>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border",
                              supplier.active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            )}>
                              <span className={cn("w-1 h-1 rounded-full", supplier.active ? "bg-emerald-400" : "bg-rose-400")} />
                              {supplier.active ? 'Active' : 'Paused'}
                            </span>
                          </td>
                          {/* Mapped Fields */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn("text-xs font-bold", supplier.has_mapping ? "text-emerald-400" : "text-slate-500")}>
                                {supplier.mapped_count} / {supplier.total_fields}
                              </span>
                              <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all", supplier.has_mapping ? "bg-emerald-500" : "bg-slate-700")}
                                  style={{ width: supplier.total_fields > 0 ? `${Math.round((supplier.mapped_count / supplier.total_fields) * 100)}%` : '0%' }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Field Mapping button */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => navigate(`/suppliers/mapping/${supplier.id}?supplierName=${encodeURIComponent(supplier.supplier_name)}&companyName=${encodeURIComponent(data.name)}`)}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-colors",
                                supplier.has_mapping
                                  ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20"
                                  : "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20"
                              )}
                            >
                              <Tags className="w-3 h-3" />
                              Field Mapping
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}
      </div>
    </div>

    {/* Parsing Configuration Modal */}
      {showParsingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowParsingModal(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Parsing Pipeline</h2>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Connection Credentials</p>
              </div>
              <button
                onClick={() => setShowParsingModal(false)}
                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleParsingSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Target Box Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. bookings@parsingbox.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-700"
                    value={parsingFormData.company_parsing_email}
                    onChange={(e) => setParsingFormData({ ...parsingFormData, company_parsing_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">App Password / Auth Token</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your security token"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-700 font-mono"
                    value={parsingFormData.email_password}
                    onChange={(e) => setParsingFormData({ ...parsingFormData, email_password: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">IMAP Host Server</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. imap.gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-700"
                    value={parsingFormData.email_host}
                    onChange={(e) => setParsingFormData({ ...parsingFormData, email_host: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowParsingModal(false)}
                  className="flex-1 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating.parsing}
                  className="flex-[2] py-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUpdating.parsing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save size={18} />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </>
  );
};

export default CompanyDetails;
