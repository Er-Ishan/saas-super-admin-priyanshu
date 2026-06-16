import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Mail, Globe, MapPin, Phone, Loader2,
  ArrowLeft, ShieldCheck, MailWarning, LayoutGrid,
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
      <div className="max-w-7xl mx-auto pb-20 px-4">
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/companies')}
            className="w-12 h-12 bg-slate-900/50 rounded-2xl flex items-center justify-center border border-slate-800 hover:border-sky-500/50 hover:text-sky-400 transition-all text-slate-400 group"
          >
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-bold text-white">{data.name}</h1>
              <span className={cn(
                "text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md mt-1",
                data.active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              )}>
                {data.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-slate-500 font-medium">Company ID: <span className="text-slate-300">#{data.id}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center group-hover:border-sky-500/50 transition-all">
              {data.logo_url ? (
                <img 
                  src={data.logo_url.startsWith('data:') ? data.logo_url : `${IMAGE_BASE_URL}${data.logo_url}`} 
                  alt={data.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <Building2 className="w-8 h-8 text-slate-700" />
              )}
              {logoLoading && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center cursor-pointer hover:bg-sky-400 transition-colors shadow-lg border-2 border-slate-950">
              <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              <Plus className="w-4 h-4 text-white" />
            </label>
          </div>
          
          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-sm shadow-xl relative z-20">
          <button
            onClick={() => toggleStatus('active')}
            disabled={isUpdating.active}
            className={cn(
              "flex items-center gap-4 px-5 py-2.5 border-r border-slate-800 transition-all rounded-l-xl disabled:opacity-50",
              "hover:bg-slate-800/50 group cursor-pointer"
            )}
            title={data.active ? "Click to deactivate company" : "Click to activate company"}
          >
            {isUpdating.active ? (
              <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
            ) : (
              <div className={cn(
                "w-3 h-3 rounded-full transition-all duration-500",
                data.active
                  ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  : "bg-slate-700 shadow-none group-hover:bg-slate-600"
              )}></div>
            )}
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">Company Status</span>
              <span className="text-sm font-bold text-slate-300 leading-none group-hover:text-white transition-colors">Operational</span>
            </div>
          </button>

          <button
            onClick={() => toggleStatus('parsing')}
            disabled={isUpdating.parsing}
            className={cn(
              "flex items-center gap-4 px-5 py-2.5 transition-all rounded-r-xl disabled:opacity-50",
              "hover:bg-slate-800/50 group cursor-pointer"
            )}
            title={data.email_parsing ? "Click to deactivate email parsing" : "Click to activate email parsing"}
          >
            {isUpdating.parsing ? (
              <Loader2 className="w-3 h-3 text-sky-500 animate-spin" />
            ) : (
              <div className={cn(
                "w-3 h-3 rounded-full transition-all duration-500",
                data.email_parsing
                  ? "bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.4)]"
                  : "bg-slate-700 shadow-none group-hover:bg-slate-600"
              )}></div>
            )}
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">Service Status</span>
              <span className="text-sm font-bold text-slate-300 leading-none group-hover:text-white transition-colors">Email Parsing</span>
            </div>
          </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Contact Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 rounded-3xl border-slate-800 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Building2 className="w-32 h-32 text-white" />
          </div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <LayoutGrid className="w-5 h-5 text-sky-400" />
              General Information
            </h3>
            <button
              onClick={() => navigate(`/companies/${id}/settings`)}
              className="p-2 text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 rounded-xl transition-all cursor-pointer"
              title="Edit Details"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 flex-shrink-0">
                <Mail className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Official Email</p>
                <p className="text-white font-medium">{data.email || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 flex-shrink-0">
                <Globe className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Domain / Website</p>
                <p className="text-white font-medium">{data.domain || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 flex-shrink-0">
                <Phone className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Contact Number</p>
                <p className="text-white font-medium">{data.mobile_no || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 flex-shrink-0">
                <Mail className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Support Email</p>
                <p className="text-white font-medium">{data.support_email_address || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 flex-shrink-0">
                <Phone className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Support Contact</p>
                <p className="text-white font-medium">{data.support_contact_no || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 flex-shrink-0">
                <MapPin className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Head Office Address</p>
                <p className="text-white font-medium leading-relaxed">{data.address || 'No address registered'}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Email Parsing Config Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 glass p-8 rounded-3xl border-slate-800 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <MailWarning className="w-32 h-32 text-white" />
          </div>

          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Email Parsing Pipeline
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={openParsingModal}
                className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 group"
              >
                <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
                {data.parsing_info ? 'Edit Configuration' : 'Setup Pipeline'}
              </button>
              {data.email_parsing ? (
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ACTIVE PIPELINE
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-800 text-slate-500 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  DISABLED
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-6">
              <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800/50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Target Parsing Box</p>
                <div className="flex items-center gap-3 text-indigo-400 font-mono">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{data.parsing_info?.company_parsing_email || 'No email configured'}</span>
                </div>
              </div>
              <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800/50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">IMAP Hosting Server</p>
                <div className="flex items-center gap-3 text-white font-mono">
                  <Globe className="w-4 h-4 text-slate-500" />
                  <span className="text-sm">{data.parsing_info?.email_host || 'Automatic detection'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800/50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Auth Credentials</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-slate-600 mb-1">Access Token / Password</p>
                    <p className="text-white font-mono tracking-tighter overflow-hidden truncate">
                      {data.parsing_info?.email_password ? '••••••••••••••••' : 'None established'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                <p className="text-xs text-slate-400 leading-relaxed">
                  <span className="text-indigo-400 font-bold">Note:</span> This configuration allows our processing engine to securely monitor and extract booking data from the company's designated mailbox.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Suppliers Section */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-4">
            <Truck className="w-7 h-7 text-indigo-500" />
            Connected Data Partners
            <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-lg text-sm font-bold border border-slate-700">
              {data.suppliers.length}
            </span>
          </h2>
          <button
            onClick={() => navigate(`/suppliers?companyId=${data.id}&tab=assignments`)}
            className="text-sm font-bold text-sky-400 hover:text-sky-300 flex items-center gap-2 group border border-sky-500/10 px-4 py-2 rounded-xl hover:bg-sky-500/5 transition-all"
          >
            Manage Assignments
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.suppliers.map((supplier, index) => (
            <motion.div
              key={supplier.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + (index * 0.05) }}
              className="glass p-6 rounded-3xl border-slate-800 group hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-600/10 to-transparent -mr-12 -mt-12 rounded-full" />

              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-colors">
                  <Truck className="w-6 h-6 text-indigo-400" />
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-2",
                  supplier.active
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", supplier.active ? "bg-emerald-500" : "bg-rose-500")}></span>
                  {supplier.active ? 'ACTIVE SYNC' : 'PAUSED'}
                </div>
              </div>

              <div className="mb-6 relative z-10">
                <h4 className="text-xl font-bold text-white mb-2 leading-tight">{supplier.supplier_name}</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(() => {
                    try {
                      const emails = typeof supplier.supplier_from_email === 'string' 
                        ? JSON.parse(supplier.supplier_from_email) 
                        : supplier.supplier_from_email;
                      
                      return Array.isArray(emails) ? emails.map((email: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-indigo-300">
                          <Mail className="w-2.5 h-2.5" />
                          {email}
                        </div>
                      )) : (
                        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-indigo-300">
                          <Mail className="w-2.5 h-2.5" />
                          {supplier.supplier_from_email}
                        </div>
                      );
                    } catch (e) {
                      return (
                        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-indigo-300">
                          <Mail className="w-2.5 h-2.5" />
                          {supplier.supplier_from_email}
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Commission</p>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-white">{supplier.commission}</span>
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Source</p>
                  <p className="text-sm font-bold text-white capitalize">{supplier.data_from}</p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/suppliers/mapping/${supplier.id}`)}
                className="w-full mt-6 py-3 rounded-2xl bg-slate-800 hover:bg-indigo-500 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-indigo-400"
              >
                <Tags className="w-3.5 h-3.5" />
                View Field Mapping
              </button>
            </motion.div>
          ))}

          {data.suppliers.length === 0 && (
            <div className="col-span-full py-20 text-center glass rounded-3xl border-dashed border-2 border-slate-800">
              <Truck className="w-12 h-12 text-slate-800 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No data partners connected to this company.</p>
            </div>
          )}
        </div>
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
