import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Mail, Globe, MapPin, Phone, Loader2, ArrowLeft,
  User, Clock, Hash, CreditCard, Server, Lock, AtSign, Key,
  Webhook, ChevronRight, Save, ShieldAlert, CheckCircle2, Settings
} from 'lucide-react';
import api from '../lib/axios';
import { cn } from '../lib/utils';

const STEPS = ['Company Info', 'Email Settings', 'Payment Gateway'];

const inputClass =
  'w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none placeholder:text-slate-600';
const labelClass = 'block text-sm font-medium text-slate-400 mb-2';

const CompanySettings: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [companyData, setCompanyData] = useState({
    name: '', email: '', domain: '', mobile_no: '', address: '',
    support_email_address: '', support_contact_no: '',
    business_type: 'individual' as 'individual' | 'comparison',
    business_catrgory: 'portal' as 'portal' | 'platform',
    office_hours: '', ref_prefix: 'BKG', registration_no: '', owner_name: '',
  });

  const [emailSettings, setEmailSettings] = useState({
    smtp_host: '', smtp_port: '587', smtp_username: '', smtp_password: '',
    smtp_encryption: 'tls' as 'tls' | 'ssl' | 'none',
    from_email: '', from_name: '', reply_email: '', cc_email: '', bcc_email: '',
    _exists: false,
  });

  const [paymentGateway, setPaymentGateway] = useState({
    acc_name: 'stripe', public_key: '', key_secret: '', webhook_secret: '',
    mode: 'test' as 'test' | 'live',
    _exists: false,
  });

  const setComp = (field: string, value: any) =>
    setCompanyData(prev => ({ ...prev, [field]: value }));
  const setEmail = (field: string, value: any) =>
    setEmailSettings(prev => ({ ...prev, [field]: value }));
  const setPayment = (field: string, value: any) =>
    setPaymentGateway(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [compRes, emailRes, payRes] = await Promise.all([
          api.get(`/companies/${id}`),
          api.get(`/companies/${id}/email-settings`),
          api.get(`/companies/${id}/payment-gateway`),
        ]);

        const c = compRes.data.data;
        setCompanyData({
          name: c.name || '',
          email: c.email || '',
          domain: c.domain || '',
          mobile_no: c.mobile_no || '',
          address: c.address || '',
          support_email_address: c.support_email_address || '',
          support_contact_no: c.support_contact_no || '',
          business_type: c.business_type || 'individual',
          business_catrgory: c.business_catrgory || 'portal',
          office_hours: c.office_hours || '',
          ref_prefix: c.ref_prefix || 'BKG',
          registration_no: c.registration_no || '',
          owner_name: c.owner_name || '',
        });

        const e = emailRes.data.data;
        if (e) {
          setEmailSettings({
            smtp_host: e.smtp_host || '', smtp_port: String(e.smtp_port || 587),
            smtp_username: e.smtp_username || '', smtp_password: '',
            smtp_encryption: e.smtp_encryption || 'tls',
            from_email: e.from_email || '', from_name: e.from_name || '',
            reply_email: e.reply_email || '', cc_email: e.cc_email || '',
            bcc_email: e.bcc_email || '', _exists: true,
          });
        }

        const p = payRes.data.data;
        if (p) {
          setPaymentGateway({
            acc_name: p.acc_name || 'stripe', public_key: p.public_key || '',
            key_secret: '', webhook_secret: '',
            mode: p.mode || 'test', _exists: true,
          });
        }
      } catch (err) {
        setError('Failed to load company settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const saveCompanyInfo = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/companies/${id}`, companyData);
      showToast('Company info saved successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save company info');
    } finally {
      setSaving(false);
    }
  };

  const saveEmailSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      const { _exists, ...payload } = emailSettings;
      await api.put(`/companies/${id}/email-settings`, payload);
      setEmailSettings(prev => ({ ...prev, smtp_password: '', _exists: true }));
      showToast('Email settings saved successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save email settings');
    } finally {
      setSaving(false);
    }
  };

  const savePaymentGateway = async () => {
    setSaving(true);
    setError(null);
    try {
      const { _exists, ...payload } = paymentGateway;
      await api.put(`/companies/${id}/payment-gateway`, payload);
      setPaymentGateway(prev => ({ ...prev, key_secret: '', webhook_secret: '', _exists: true }));
      showToast('Payment gateway saved successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save payment gateway');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (step === 0) saveCompanyInfo();
    else if (step === 1) saveEmailSettings();
    else savePaymentGateway();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin mb-4" />
        <p className="text-slate-400 animate-pulse font-medium">Loading settings...</p>
      </div>
    );
  }

  if (error && !companyData.name) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <p className="text-white font-bold text-xl mb-2">Failed to load settings</p>
        <p className="text-slate-400 mb-6">{error}</p>
        <button onClick={() => navigate(`/companies/${id}`)}
          className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold transition-all">
          Back to Company
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-5 py-3 rounded-2xl shadow-xl backdrop-blur-sm"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate(`/companies/${id}`)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to {companyData.name || 'Company'}
        </button>
        <h1 className="text-2xl font-bold text-white mb-3 flex items-center gap-2"><Settings className="w-6 h-6 text-sky-400 shrink-0" />Company Settings</h1>
        <p className="text-slate-400">Manage all configuration for <span className="text-white font-semibold">{companyData.name}</span></p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <button type="button" onClick={() => setStep(i)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                i === step
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white cursor-pointer'
              )}>
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border',
                i === step
                  ? 'bg-sky-500 border-sky-400 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              )}>
                {i + 1}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-slate-700 mx-1 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="glass rounded-3xl p-8 border-white/10 space-y-6"
      >
        {/* ── STEP 1: Company Info ── */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>Company Legal Name <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input required type="text" value={companyData.name}
                    onChange={e => setComp('name', e.target.value)}
                    className={inputClass} placeholder="Company name" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Owner Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="text" value={companyData.owner_name}
                    onChange={e => setComp('owner_name', e.target.value)}
                    className={inputClass} placeholder="John Smith" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Registration Number</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="text" value={companyData.registration_no}
                    onChange={e => setComp('registration_no', e.target.value)}
                    className={inputClass} placeholder="e.g. 12345678" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Admin Communication Email <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input required type="email" value={companyData.email}
                    onChange={e => setComp('email', e.target.value)}
                    className={inputClass} placeholder="admin@company.com" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Website / Domain</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="text" value={companyData.domain}
                    onChange={e => setComp('domain', e.target.value)}
                    className={inputClass} placeholder="company.com" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Admin Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="text" value={companyData.mobile_no}
                    onChange={e => setComp('mobile_no', e.target.value)}
                    className={inputClass} placeholder="+44 77..." />
                </div>
              </div>

              <div>
                <label className={labelClass}>Support Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="email" value={companyData.support_email_address}
                    onChange={e => setComp('support_email_address', e.target.value)}
                    className={inputClass} placeholder="support@company.com" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Support Contact Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="text" value={companyData.support_contact_no}
                    onChange={e => setComp('support_contact_no', e.target.value)}
                    className={inputClass} placeholder="+44 77..." />
                </div>
              </div>

              <div>
                <label className={labelClass}>Office Hours</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="text" value={companyData.office_hours}
                    onChange={e => setComp('office_hours', e.target.value)}
                    className={inputClass} placeholder="Mon–Fri 09:00–17:00" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Booking Ref Prefix</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="text" value={companyData.ref_prefix} maxLength={20}
                    onChange={e => setComp('ref_prefix', e.target.value.toUpperCase())}
                    className={inputClass} placeholder="BKG" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Business Type</label>
                <div className="flex gap-3">
                  {(['individual', 'comparison'] as const).map(type => (
                    <button key={type} type="button" onClick={() => setComp('business_type', type)}
                      className={cn(
                        'flex-1 py-3 rounded-xl border font-semibold text-sm capitalize transition-all',
                        companyData.business_type === type
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                          : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                      )}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Business Category</label>
                <div className="flex gap-3">
                  {(['portal', 'platform'] as const).map(cat => (
                    <button key={cat} type="button" onClick={() => setComp('business_catrgory', cat)}
                      className={cn(
                        'flex-1 py-3 rounded-xl border font-semibold text-sm capitalize transition-all',
                        companyData.business_catrgory === cat
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                          : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                      )}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Head Office Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3 w-5 h-5 text-slate-600" />
                  <textarea value={companyData.address}
                    onChange={e => setComp('address', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none h-24 placeholder:text-slate-600"
                    placeholder="123 Airport Road..." />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Email Settings ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Server className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-white font-semibold">SMTP Configuration</p>
                {emailSettings._exists && (
                  <p className="text-xs text-emerald-400">Settings configured — leave password blank to keep current</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>SMTP Host</label>
                <div className="relative">
                  <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="text" value={emailSettings.smtp_host}
                    onChange={e => setEmail('smtp_host', e.target.value)}
                    className={inputClass} placeholder="mail.company.com" />
                </div>
              </div>

              <div>
                <label className={labelClass}>SMTP Port</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="number" value={emailSettings.smtp_port}
                    onChange={e => setEmail('smtp_port', e.target.value)}
                    className={inputClass} placeholder="587" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Encryption</label>
                <select value={emailSettings.smtp_encryption}
                  onChange={e => setEmail('smtp_encryption', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none">
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="none">None</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>SMTP Username</label>
                <div className="relative">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="text" value={emailSettings.smtp_username}
                    onChange={e => setEmail('smtp_username', e.target.value)}
                    className={inputClass} placeholder="noreply@company.com" />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  SMTP Password
                  {emailSettings._exists && <span className="ml-2 text-slate-600 font-normal text-xs">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="password" value={emailSettings.smtp_password}
                    onChange={e => setEmail('smtp_password', e.target.value)}
                    className={inputClass} placeholder={emailSettings._exists ? '••••••••' : 'Enter password'} />
                </div>
              </div>

              <div>
                <label className={labelClass}>From Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="email" value={emailSettings.from_email}
                    onChange={e => setEmail('from_email', e.target.value)}
                    className={inputClass} placeholder="bookings@company.com" />
                </div>
              </div>

              <div>
                <label className={labelClass}>From Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="text" value={emailSettings.from_name}
                    onChange={e => setEmail('from_name', e.target.value)}
                    className={inputClass} placeholder="Company Bookings" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Reply-To Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="email" value={emailSettings.reply_email}
                    onChange={e => setEmail('reply_email', e.target.value)}
                    className={inputClass} placeholder="reply@company.com" />
                </div>
              </div>

              <div>
                <label className={labelClass}>CC Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="email" value={emailSettings.cc_email}
                    onChange={e => setEmail('cc_email', e.target.value)}
                    className={inputClass} placeholder="cc@company.com" />
                </div>
              </div>

              <div>
                <label className={labelClass}>BCC Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="email" value={emailSettings.bcc_email}
                    onChange={e => setEmail('bcc_email', e.target.value)}
                    className={inputClass} placeholder="bcc@company.com" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Payment Gateway ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-white font-semibold">Payment Gateway (Stripe)</p>
                {paymentGateway._exists && (
                  <p className="text-xs text-emerald-400">Keys configured — leave secret fields blank to keep current</p>
                )}
              </div>
            </div>

            <div>
              <label className={labelClass}>Mode</label>
              <div className="flex gap-3">
                {(['test', 'live'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setPayment('mode', m)}
                    className={cn(
                      'flex-1 py-3 rounded-xl border font-semibold text-sm transition-all',
                      paymentGateway.mode === m
                        ? m === 'live'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                    )}>
                    {m === 'live' ? '🟢 Live' : '🟡 Test'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Account Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="text" value={paymentGateway.acc_name} maxLength={20}
                    onChange={e => setPayment('acc_name', e.target.value)}
                    className={inputClass} placeholder="stripe" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Publishable Key</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="text" value={paymentGateway.public_key}
                    onChange={e => setPayment('public_key', e.target.value)}
                    className={inputClass} placeholder="pk_test_..." />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>
                  Secret Key
                  {paymentGateway._exists && <span className="ml-2 text-slate-600 font-normal text-xs">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="password" value={paymentGateway.key_secret}
                    onChange={e => setPayment('key_secret', e.target.value)}
                    className={inputClass} placeholder={paymentGateway._exists ? '••••••••' : 'sk_test_...'} />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>
                  Webhook Secret
                  {paymentGateway._exists && <span className="ml-2 text-slate-600 font-normal text-xs">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <Webhook className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="password" value={paymentGateway.webhook_secret}
                    onChange={e => setPayment('webhook_secret', e.target.value)}
                    className={inputClass} placeholder={paymentGateway._exists ? '••••••••' : 'whsec_...'} />
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Tab navigation + Save */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all">
            <ArrowLeft className="w-4 h-4" />
            Prev
          </button>
        )}

        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl py-3.5 font-bold shadow-lg shadow-sky-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save {STEPS[step]}</>}
        </button>

        {step < STEPS.length - 1 && (
          <button type="button" onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all">
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CompanySettings;
