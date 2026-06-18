import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Mail, Globe, MapPin, Phone, Loader2, Sparkles, ShieldCheck,
  ArrowLeft, ArrowRight, User, Clock, Hash, CreditCard, Server,
  Lock, AtSign, Key, Webhook, ChevronRight
} from 'lucide-react';
import api from '../lib/axios';
import { cn } from '../lib/utils';

const STEPS = ['Company Info', 'Email Settings', 'Payment Gateway'];

const inputClass =
  'w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none placeholder:text-slate-600';

const labelClass = 'block text-sm font-medium text-slate-400 mb-2';

interface EmailSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_encryption: 'tls' | 'ssl' | 'none';
  from_email: string;
  from_name: string;
  reply_email: string;
  cc_email: string;
  bcc_email: string;
}

interface PaymentGateway {
  acc_name: string;
  public_key: string;
  key_secret: string;
  webhook_secret: string;
  mode: 'test' | 'live';
}

const OnboardCompany: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  const [companyData, setCompanyData] = useState({
    name: '',
    email: '',
    domain: '',
    mobile_no: '',
    address: '',
    support_email_address: '',
    support_contact_no: '',
    logo: null as File | null,
    business_type: 'individual' as 'individual' | 'comparison',
    business_catrgory: 'portal' as 'portal' | 'platform',
    office_hours: '',
    ref_prefix: 'BKG',
    registration_no: '',
    owner_name: '',
  });

  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtp_host: '',
    smtp_port: '587',
    smtp_username: '',
    smtp_password: '',
    smtp_encryption: 'tls',
    from_email: '',
    from_name: '',
    reply_email: '',
    cc_email: '',
    bcc_email: '',
  });

  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway>({
    acc_name: 'stripe',
    public_key: '',
    key_secret: '',
    webhook_secret: '',
    mode: 'test',
  });

  const setComp = (field: string, value: any) =>
    setCompanyData(prev => ({ ...prev, [field]: value }));
  const setEmail = (field: string, value: any) =>
    setEmailSettings(prev => ({ ...prev, [field]: value }));
  const setPayment = (field: string, value: any) =>
    setPaymentGateway(prev => ({ ...prev, [field]: value }));

  const hasEmailSettings = emailSettings.smtp_host && emailSettings.smtp_password;
  const hasPaymentGateway = paymentGateway.public_key && paymentGateway.key_secret;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const data = new FormData();
      Object.entries(companyData).forEach(([key, val]) => {
        if (key === 'logo') {
          if (val) data.append('logo', val as File);
        } else {
          data.append(key, String(val));
        }
      });
      if (hasEmailSettings) data.append('emailSettings', JSON.stringify(emailSettings));
      if (hasPaymentGateway) data.append('paymentGateway', JSON.stringify(paymentGateway));

      const response = await api.post('/onboard-company', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setSuccessData(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Onboarding failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
          <ShieldCheck className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Company Onboarded!</h2>
        <p className="text-slate-400 mb-8">The operator account has been provisioned successfully.</p>
        <div className="bg-slate-950/50 rounded-2xl p-6 mb-8 text-left border border-slate-800">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Admin Credentials</p>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Login Email</p>
              <p className="text-white font-mono">{successData.defaultUser.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Temporary Password</p>
              <p className="text-amber-400 font-mono text-lg">{successData.defaultUser.password}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/companies')}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-4 font-bold transition-all"
        >
          Back to Companies
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/companies')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Companies
        </button>
        <h1 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-sky-400" />
          Onboard New Company
        </h1>
        <p className="text-slate-400">Provision a new parking operator onto the SaaS platform.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                i === step
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : i < step
                  ? 'text-emerald-400 cursor-pointer hover:text-emerald-300'
                  : 'text-slate-600 cursor-default'
              )}
            >
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border',
                i === step
                  ? 'bg-sky-500 border-sky-400 text-white'
                  : i < step
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              )}>
                {i < step ? '✓' : i + 1}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-slate-700 mx-1 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="glass rounded-3xl p-8 border-white/10 space-y-6"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
              <ShieldCheck className="w-5 h-5 opacity-50 rotate-180 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── STEP 1: Company Info ── */}
          <AnimatePresence mode="wait">
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>Company Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setComp('logo', e.target.files?.[0] || null)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Company Legal Name <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input required type="text" value={companyData.name}
                        onChange={(e) => setComp('name', e.target.value)}
                        className={inputClass} placeholder="e.g. Heathrow Express Parking" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Owner Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="text" value={companyData.owner_name}
                        onChange={(e) => setComp('owner_name', e.target.value)}
                        className={inputClass} placeholder="John Smith" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Registration Number</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="text" value={companyData.registration_no}
                        onChange={(e) => setComp('registration_no', e.target.value)}
                        className={inputClass} placeholder="e.g. 12345678" />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Admin Communication Email <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input required type="email" value={companyData.email}
                        onChange={(e) => setComp('email', e.target.value)}
                        className={inputClass} placeholder="admin@company.com" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Website / Domain</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="text" value={companyData.domain}
                        onChange={(e) => setComp('domain', e.target.value)}
                        className={inputClass} placeholder="company.com" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Admin Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="text" value={companyData.mobile_no}
                        onChange={(e) => setComp('mobile_no', e.target.value)}
                        className={inputClass} placeholder="+44 77..." />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Support Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="email" value={companyData.support_email_address}
                        onChange={(e) => setComp('support_email_address', e.target.value)}
                        className={inputClass} placeholder="support@company.com" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Support Contact Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="text" value={companyData.support_contact_no}
                        onChange={(e) => setComp('support_contact_no', e.target.value)}
                        className={inputClass} placeholder="+44 77..." />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Office Hours</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="text" value={companyData.office_hours}
                        onChange={(e) => setComp('office_hours', e.target.value)}
                        className={inputClass} placeholder="Mon–Fri 09:00–17:00" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Booking Ref Prefix</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="text" value={companyData.ref_prefix} maxLength={20}
                        onChange={(e) => setComp('ref_prefix', e.target.value.toUpperCase())}
                        className={inputClass} placeholder="BKG" />
                    </div>
                  </div>

                  {/* Business Type */}
                  <div>
                    <label className={labelClass}>Business Type</label>
                    <div className="flex gap-3">
                      {(['individual', 'comparison'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setComp('business_type', type)}
                          className={cn(
                            'flex-1 py-3 rounded-xl border font-semibold text-sm capitalize transition-all',
                            companyData.business_type === type
                              ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                              : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Business Category */}
                  <div>
                    <label className={labelClass}>Business Category</label>
                    <div className="flex gap-3">
                      {(['portal', 'platform'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setComp('business_catrgory', cat)}
                          className={cn(
                            'flex-1 py-3 rounded-xl border font-semibold text-sm capitalize transition-all',
                            companyData.business_catrgory === cat
                              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                              : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                          )}
                        >
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
                        onChange={(e) => setComp('address', e.target.value)}
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
                    <p className="text-xs text-slate-500">Optional — can be configured later in company settings</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className={labelClass}>SMTP Host</label>
                    <div className="relative">
                      <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="text" value={emailSettings.smtp_host}
                        onChange={(e) => setEmail('smtp_host', e.target.value)}
                        className={inputClass} placeholder="mail.company.com" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>SMTP Port</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="number" value={emailSettings.smtp_port}
                        onChange={(e) => setEmail('smtp_port', e.target.value)}
                        className={inputClass} placeholder="587" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Encryption</label>
                    <select value={emailSettings.smtp_encryption}
                      onChange={(e) => setEmail('smtp_encryption', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none"
                    >
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
                        onChange={(e) => setEmail('smtp_username', e.target.value)}
                        className={inputClass} placeholder="noreply@company.com" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>SMTP Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="password" value={emailSettings.smtp_password}
                        onChange={(e) => setEmail('smtp_password', e.target.value)}
                        className={inputClass} placeholder="••••••••" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>From Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="email" value={emailSettings.from_email}
                        onChange={(e) => setEmail('from_email', e.target.value)}
                        className={inputClass} placeholder="bookings@company.com" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>From Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="text" value={emailSettings.from_name}
                        onChange={(e) => setEmail('from_name', e.target.value)}
                        className={inputClass} placeholder="Company Bookings" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Reply-To Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="email" value={emailSettings.reply_email}
                        onChange={(e) => setEmail('reply_email', e.target.value)}
                        className={inputClass} placeholder="reply@company.com" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>CC Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="email" value={emailSettings.cc_email}
                        onChange={(e) => setEmail('cc_email', e.target.value)}
                        className={inputClass} placeholder="cc@company.com" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>BCC Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="email" value={emailSettings.bcc_email}
                        onChange={(e) => setEmail('bcc_email', e.target.value)}
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
                    <p className="text-xs text-slate-500">Optional — keys are encrypted at rest using AES-256-GCM</p>
                  </div>
                </div>

                {/* Mode toggle */}
                <div>
                  <label className={labelClass}>Mode</label>
                  <div className="flex gap-3">
                    {(['test', 'live'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPayment('mode', m)}
                        className={cn(
                          'flex-1 py-3 rounded-xl border font-semibold text-sm capitalize transition-all',
                          paymentGateway.mode === m
                            ? m === 'live'
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                              : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                        )}
                      >
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
                        onChange={(e) => setPayment('acc_name', e.target.value)}
                        className={inputClass} placeholder="stripe" />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Publishable Key</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="text" value={paymentGateway.public_key}
                        onChange={(e) => setPayment('public_key', e.target.value)}
                        className={inputClass} placeholder="pk_test_..." />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Secret Key</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="password" value={paymentGateway.key_secret}
                        onChange={(e) => setPayment('key_secret', e.target.value)}
                        className={inputClass} placeholder="sk_test_..." />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Webhook Secret <span className="text-slate-600 font-normal">(optional)</span></label>
                    <div className="relative">
                      <Webhook className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input type="password" value={paymentGateway.webhook_secret}
                        onChange={(e) => setPayment('webhook_secret', e.target.value)}
                        className={inputClass} placeholder="whsec_..." />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Navigation buttons */}
        <div className="flex gap-4 mt-6">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl py-3.5 font-bold shadow-lg shadow-sky-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              Next: {STEPS[step + 1]}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl py-3.5 font-bold shadow-xl shadow-sky-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Onboarding'}
            </button>
          )}
        </div>

        {step === STEPS.length - 1 && (
          <p className="text-center text-xs text-slate-600 mt-3">
            Steps 2 & 3 are optional — email and payment settings can be configured later
          </p>
        )}
      </form>
    </div>
  );
};

export default OnboardCompany;
