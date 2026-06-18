import React, { useEffect, useState, useRef } from "react";
import {
  Shield,
  Search,
  MessageSquare,
  FileText,
  Download,
  Paperclip,
  Loader2,
  Calendar,
  Send,
  Building2,
  Check
} from "lucide-react";
import { motion } from "framer-motion";
import api from "../lib/axios";
import { useAuth } from "../contexts/AuthContext";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Ticket {
  id: number;
  ticket_no: string;
  company_id: number;
  company_name: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  attachment: string | null;
}

interface ChatMessage {
  id: number;
  sender_type: "company_admin" | "super_admin";
  sender_id: number;
  message: string;
  attachments: string | null;
  created_at: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:9000/api/superadmin";
const SUPPORT_API_BASE = API_BASE.replace('/superadmin', '/admin-support');
const FILE_BASE = API_BASE.replace('/api/superadmin', ''); // Removes /api/superadmin to get server root

const SupportCenter: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchTickets = async () => {
    try {
      const res = await api.get(`${SUPPORT_API_BASE}/tickets?isSuperAdmin=true`);
      if (res.data.success) {
        setTickets(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch tickets", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: number) => {
    try {
      const res = await api.get(`${SUPPORT_API_BASE}/tickets/${ticketId}/chat`);
      if (res.data.success) {
        setMessages(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch messages", error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedTicket || (!newMessage.trim() && !fileInputRef.current?.files?.length)) return;

    setSending(true);
    const formData = new FormData();
    formData.append("message", newMessage);
    formData.append("senderType", "super_admin");
    formData.append("senderId", (user?.id || 1).toString());

    if (fileInputRef.current?.files) {
      for (const file of fileInputRef.current.files) {
        formData.append("attachments", file);
      }
    }

    try {
      const res = await api.post(`${SUPPORT_API_BASE}/tickets/${selectedTicket.id}/chat`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        setNewMessage("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchMessages(selectedTicket.id);
      }
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (ticketId: number, status: string) => {
    try {
      const res = await api.put(`${SUPPORT_API_BASE}/tickets/${ticketId}/status`, { status });
      if (res.data.success) {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(prev => prev ? { ...prev, status } : null);
        }
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open": return "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]";
      case "in progress": return "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]";
      case "resolved": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticket_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex h-[calc(100vh-140px)] w-full gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Inbox Sidebar */}
      <div className="flex w-[400px] flex-col rounded-3xl border border-slate-800/50 bg-slate-900/30 backdrop-blur-xl overflow-hidden">
        <div className="p-8 border-b border-slate-800/50">
          <div className="flex items-center gap-4 mb-8 text-white">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><MessageSquare className="w-6 h-6 text-sky-400 shrink-0" />Support <span className="text-sky-400">Center</span></h1>
              <p className="text-xs text-slate-500 font-medium">Resolving admin tickets</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-sky-400 transition-colors" />
              <input
                placeholder="Search ticket No, subject or company..."
                className="w-full pl-12 pr-4 h-12 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {["All", "Open", "In Progress", "Resolved"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                    statusFilter === s
                      ? "bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/20"
                      : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-8 w-8 border-3 border-sky-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 h-full">
              <MessageSquare className="w-16 h-16 mb-4 opacity-5" />
              <p className="text-sm font-medium">No support tickets match your criteria.</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <motion.div
                layout
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={cn(
                  "p-5 rounded-2xl cursor-pointer transition-all border group relative",
                  selectedTicket?.id === ticket.id
                    ? "bg-sky-500/10 border-sky-500/50 shadow-lg shadow-sky-500/5"
                    : "bg-slate-900/50 border-slate-800/50 hover:border-slate-700 hover:bg-slate-800/50"
                )}
              >
                {selectedTicket?.id === ticket.id && (
                  <motion.div layoutId="activeSupport" className="absolute left-0 w-1 h-8 bg-sky-500 rounded-r-full top-1/2 -translate-y-1/2" />
                )}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500 group-hover:text-sky-400 transition-colors">
                      {ticket.ticket_no}
                    </span>
                  </div>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", getStatusColor(ticket.status))}>
                    {ticket.status}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-200 line-clamp-1 mb-2 group-hover:text-white transition-colors">{ticket.subject}</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-sky-400 font-bold">
                    <Building2 size={12} />
                    <span className="truncate">{ticket.company_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </div>
                    <span className={cn(
                      "flex items-center gap-1",
                      ticket.priority === 'High' || ticket.priority === 'Urgent' ? 'text-rose-400' : 'text-slate-400'
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", ticket.priority === 'High' || ticket.priority === 'Urgent' ? 'bg-rose-500' : 'bg-slate-500')} />
                      {ticket.priority}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Modern Interaction Area */}
      <div className="flex flex-1 flex-col rounded-3xl border border-slate-800/50 bg-slate-900/30 backdrop-blur-xl overflow-hidden relative shadow-2xl">
        {selectedTicket ? (
          <>
            {/* Resolution Header */}
            <div className="p-8 border-b border-slate-800/50 bg-slate-900/40 z-10 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 flex items-center justify-center border border-sky-500/30 text-sky-400 shadow-inner">
                  <Building2 size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight leading-tight">{selectedTicket.subject}</h2>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-sky-400 font-bold bg-sky-500/5 px-2 py-0.5 rounded-lg border border-sky-500/10">
                      {selectedTicket.ticket_no}
                    </span>
                    <span className="h-1 w-1 bg-slate-700 rounded-full" />
                    <span className="text-xs text-slate-400 font-medium">{selectedTicket.company_name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50">
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'In Progress')}
                    className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      selectedTicket.status === 'In Progress' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-slate-500 hover:text-slate-300")
                    }
                  >
                    Hold
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'Resolved')}
                    className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                      selectedTicket.status === 'Resolved' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-300")
                    }
                  >
                    {selectedTicket.status === 'Resolved' && <Check size={14} />}
                    Resolve
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Content */}
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              {/* Original Query */}
              <div className="flex gap-6 max-w-[85%] group">
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:border-sky-500/50 transition-all">
                  <Building2 size={18} />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-200">Company Admin</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(selectedTicket.created_at).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-3xl rounded-tl-none shadow-xl">
                    <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">{selectedTicket.message}</p>
                    {selectedTicket.attachment && (
                      <div className="mt-6 pt-6 border-t border-slate-700/50 grid grid-cols-2 gap-4">
                        {JSON.parse(selectedTicket.attachment).map((file: string, idx: number) => (
                          <a
                            key={idx}
                            href={`${FILE_BASE}${file}`}
                            target="_blank"
                            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-sky-400 transition-all hover:border-sky-500/30 group/file"
                          >
                            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 group-hover/file:bg-sky-500/10 group-hover/file:border-sky-500/20">
                              <FileText size={16} />
                            </div>
                            <span className="flex-1 truncate font-medium">{file.split('/').pop()}</span>
                            <Download size={16} className="opacity-0 group-hover/file:opacity-100 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {messages.map((msg) => {
                const isSuperAdmin = msg.sender_type === "super_admin";
                return (
                  <div key={msg.id} className={cn("flex gap-6 max-w-[85%] animate-in fade-in slide-in-from-bottom-2", isSuperAdmin ? "ml-auto flex-row-reverse" : "")}>
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center overflow-hidden border shadow-inner transition-all",
                      isSuperAdmin
                        ? "bg-sky-500 border-sky-400 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-400"
                    )}>
                      {isSuperAdmin ? <Shield size={18} /> : <Building2 size={18} />}
                    </div>
                    <div className={cn("space-y-3", isSuperAdmin ? "text-right" : "")}>
                      <div className={cn("flex items-center gap-3", isSuperAdmin ? "flex-row-reverse" : "")}>
                        <span className="text-sm font-bold text-slate-200">{isSuperAdmin ? "Support Agent" : "Company Admin"}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                      <div className={cn(
                        "p-6 rounded-3xl shadow-2xl relative",
                        isSuperAdmin
                          ? "bg-sky-500 text-white rounded-tr-none border border-sky-400"
                          : "bg-slate-800/50 border border-slate-700/50 rounded-tl-none text-slate-300"
                      )}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        {msg.attachments && (
                          <div className={cn(
                            "mt-6 pt-6 border-t grid grid-cols-2 gap-4",
                            isSuperAdmin ? "border-sky-400/50" : "border-slate-700/50"
                          )}>
                            {JSON.parse(msg.attachments).map((file: string, idx: number) => (
                              <a
                                key={idx}
                                href={`${FILE_BASE}${file}`}
                                target="_blank"
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-2xl text-xs transition-all border group/file",
                                  isSuperAdmin
                                    ? "bg-sky-600 border-sky-400 hover:bg-sky-700 text-sky-100"
                                    : "bg-slate-900 border-slate-800 hover:text-sky-400 hover:border-sky-500/30"
                                )}
                              >
                                <div className={cn(
                                  "p-2 rounded-lg border",
                                  isSuperAdmin ? "bg-sky-500 border-sky-400" : "bg-slate-800 border-slate-700"
                                )}>
                                  <FileText size={16} />
                                </div>
                                <span className="flex-1 truncate font-medium">{file.split('/').pop()}</span>
                                <Download size={16} className="opacity-0 group-hover/file:opacity-100 transition-opacity" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Smart Resolution Input */}
            <div className="p-8 border-t border-slate-800/50 bg-slate-950/50 backdrop-blur-3xl">
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div className="relative group">
                  <textarea
                    placeholder="Discuss resolution or ask for more details..."
                    className="w-full min-h-[120px] p-6 pr-16 rounded-[2rem] bg-slate-800/30 border border-slate-700/50 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500 outline-none transition-all resize-none shadow-2xl"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <div className="absolute right-6 bottom-6 flex items-center gap-3">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      ref={fileInputRef}
                      accept=".jpg,.jpeg,.png,.pdf"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 text-slate-500 hover:text-sky-400 transition-all rounded-full hover:bg-slate-800 border border-transparent hover:border-slate-700"
                    >
                      <Paperclip size={24} />
                    </button>
                    <button
                      type="submit"
                      disabled={sending || (!newMessage.trim() && !fileInputRef.current?.files?.length)}
                      className="p-4 bg-sky-500 text-white rounded-[1.25rem] shadow-xl shadow-sky-500/30 hover:bg-sky-600 disabled:opacity-50 transition-all active:scale-95 group/btn"
                    >
                      {sending
                        ? <Loader2 size={24} className="animate-spin" />
                        : <div className="flex items-center gap-3">
                          <span className="font-bold text-sm tracking-wide px-2">Reply</span>
                          <div className="h-6 w-px bg-white/20" />
                          <Send size={24} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                        </div>
                      }
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-32">
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border border-sky-500/20 flex items-center justify-center mb-10 shadow-2xl"
            >
              <Shield size={64} className="text-sky-400 opacity-20" />
            </motion.div>
            <h2 className="text-3xl font-black text-white tracking-tight mb-4">Resolution Inbox</h2>
            <p className="text-slate-500 max-w-lg leading-relaxed text-lg">
              Manage system-wide admin support tickets. Select a conversation to start the resolution process.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportCenter;
