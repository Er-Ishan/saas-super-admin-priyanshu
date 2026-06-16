import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Plus, Mail, Globe, MapPin, Loader2, Search } from 'lucide-react';
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
}

const Companies: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (company.email && company.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (company.domain && company.domain.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies');
      setCompanies(response.data.data);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-3">Companies</h1>
          <p className="text-slate-400">Manage and onboard parking operators onto the SaaS platform.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative group min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-sky-500 transition-colors" />
            <input
              type="text"
              placeholder="Search companies by name, email or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-sky-500/50 outline-none transition-all placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={() => navigate('/companies/onboard')}
            className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group w-full md:w-auto"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            Onboard New Company
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.length > 0 ? (
            filteredCompanies.map((company, index) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass p-5 rounded-2xl hover:border-sky-500/30 transition-all duration-300 relative group flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-slate-800/80 rounded-xl flex items-center justify-center border border-slate-700 group-hover:bg-sky-500/10 group-hover:border-sky-500/30 transition-colors overflow-hidden">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url.startsWith('data:') ? company.logo_url : `${IMAGE_BASE_URL}${company.logo_url}`}
                        alt={company.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="w-5 h-5 text-slate-400 group-hover:text-sky-400" />
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn(
                      "text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded",
                      company.active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"
                    )}>
                      {company.active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono">#{company.id}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-4 line-clamp-1">{company.name}</h3>

                <div className="space-y-2 text-xs text-slate-400 flex-1">
                  {company.email && (
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                      <span className="truncate">{company.email}</span>
                    </div>
                  )}
                  {company.support_email_address && (
                    <div className="flex items-center gap-2.5 text-sky-400/80">
                      <Mail className="w-3.5 h-3.5 text-sky-500/50 flex-shrink-0" />
                      <span className="truncate">{company.support_email_address}</span>
                    </div>
                  )}
                  {company.domain && (
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                      <span className="truncate">{company.domain}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                    <span className="line-clamp-1">{company.address || 'No address provided'}</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/50 flex justify-end items-center">
                  <button
                    onClick={() => navigate(`/companies/${company.id}`)}
                    className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 group/btn"
                  >
                    View Details
                    <Plus className="w-3 h-3 group-hover/btn:rotate-90 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center glass rounded-3xl border-dashed border-2 border-slate-800">
              <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No companies found</h3>
              <p className="text-slate-500">We couldn't find any companies matching "{searchTerm}"</p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-6 text-sky-400 font-bold hover:text-sky-300 transition-colors"
              >
                Clear search filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Companies;
