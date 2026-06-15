import React, { useEffect, useState, useCallback } from "react";
import { Shield, Plus, Pencil, Trash2, X, Save, ChevronDown, ChevronRight, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

/* ──────────── Types ──────────── */
interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: number[];
  is_system_default: number;
}

/* ──────────── Component ──────────── */
const AccessControl: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  // delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // collapsible modules
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

  /* ──── data fetching ──── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('super_admin_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [permRes, roleRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/superadmin/access-control/permissions`, { headers }),
        fetch(`${API_BASE_URL}/api/superadmin/access-control/roles`, { headers }),
      ]);
      
      const permData = await permRes.json();
      const roleData = await roleRes.json();
      
      setPermissions(permData.data || []);
      setRoles(roleData.data || []);
    } catch (err) {
      console.error("fetch error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ──── group permissions by module ──── */
  const moduleMap: Record<string, Permission[]> = {};
  permissions.forEach((p) => {
    const mod = p.module || "Other";
    if (!moduleMap[mod]) moduleMap[mod] = [];
    moduleMap[mod].push(p);
  });
  const moduleNames = Object.keys(moduleMap).sort();

  /* ──── modal open helpers ──── */
  const openCreate = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDesc("");
    setSelectedPerms(new Set());
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description || "");
    setSelectedPerms(new Set(role.permissions));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRole(null);
  };

  /* ──── toggle helpers ──── */
  const togglePerm = (id: number) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleModule = (mod: string) => {
    const ids = moduleMap[mod].map((p) => p.id);
    const allSelected = ids.every((id) => selectedPerms.has(id));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toggleCollapse = (mod: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      next.has(mod) ? next.delete(mod) : next.add(mod);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPerms(new Set(permissions.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedPerms(new Set());
  };

  /* ──── save ──── */
  const handleSave = async () => {
    if (!roleName.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('super_admin_token');
      const body = {
        name: roleName.trim(),
        description: roleDesc.trim() || null,
        permissions: Array.from(selectedPerms),
      };

      const url = editingRole
        ? `${API_BASE_URL}/api/superadmin/access-control/roles/${editingRole.id}`
        : `${API_BASE_URL}/api/superadmin/access-control/roles`;

      await fetch(url, {
        method: editingRole ? "PUT" : "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });

      closeModal();
      fetchData();
    } catch (err) {
      console.error("save error", err);
    } finally {
      setSaving(false);
    }
  };

  /* ──── delete ──── */
  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('super_admin_token');
      await fetch(`${API_BASE_URL}/api/superadmin/access-control/roles/${id}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDeleteId(null);
      fetchData();
    } catch (err) {
      console.error("delete error", err);
    }
  };

  /* ──── permission name helper ──── */
  const getPermDescription = (id: number) => permissions.find((p) => p.id === id)?.description || "";

  /* ──────────── Render ──────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(14,165,233,0.3)]" 
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-sky-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Access Control</h1>
          </div>
          <p className="text-slate-400">Define roles and permission boundaries for super administrators</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreate}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-semibold shadow-lg shadow-sky-500/20 transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          Create New Role
        </motion.button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {roles.map((role) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={role.id}
              className="group p-6 bg-slate-900/50 border border-slate-800/50 rounded-2xl hover:border-sky-500/30 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner",
                    role.is_system_default ? "bg-amber-500/10 text-amber-500" : "bg-sky-500/10 text-sky-500"
                  )}>
                    {role.is_system_default ? <Lock className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {role.name}
                      {role.is_system_default === 1 && (
                        <span className="text-[10px] uppercase tracking-widest bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20">System</span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-1">{role.description || "No description provided"}</p>
                  </div>
                </div>
                {!role.is_system_default ? (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(role)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(role.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-2 text-slate-600 cursor-not-allowed">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span>Permissions</span>
                  <span>{role.permissions.length} Assigned</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.slice(0, 10).map((pid) => (
                    <span
                      key={pid}
                      className="px-2.5 py-1 bg-slate-800/80 text-slate-300 text-[11px] font-medium rounded-lg border border-slate-700/50"
                    >
                      {getPermDescription(pid)}
                    </span>
                  ))}
                  {role.permissions.length > 10 && (
                    <span className="px-2.5 py-1 bg-slate-800/30 text-slate-500 text-[11px] font-medium rounded-lg border border-slate-700/20 italic">
                      +{role.permissions.length - 10} more
                    </span>
                  )}
                  {role.permissions.length === 0 && (
                    <span className="text-slate-600 text-xs italic">No permissions assigned</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-2">Delete Role?</h2>
              <p className="text-slate-400 text-center mb-8">
                This action is permanent and will remove this role from all assigned administrators.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-rose-500/20"
                >
                  Delete Role
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {editingRole ? "Edit Role" : "New Admin Role"}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {editingRole ? "Updated permissions for " + editingRole.name : "Configure access levels for super admins"}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Role Name</label>
                    <input
                      type="text"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      placeholder="e.g. Operations Manager"
                      className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description</label>
                    <textarea
                      value={roleDesc}
                      onChange={(e) => setRoleDesc(e.target.value)}
                      placeholder="What can this administrator do?"
                      rows={2}
                      className="w-full px-5 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Permissions Grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Permission Scope</label>
                    <div className="flex gap-4">
                      <button onClick={selectAll} className="text-xs text-sky-400 hover:text-sky-300 font-bold transition-colors">Select All</button>
                      <button onClick={deselectAll} className="text-xs text-slate-500 hover:text-slate-400 font-bold transition-colors">Clear All</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {moduleNames.map((mod) => {
                      const perms = moduleMap[mod];
                      const allInModuleSelected = perms.every(p => selectedPerms.has(p.id));
                      const isCollapsed = collapsedModules.has(mod);

                      return (
                        <div key={mod} className="bg-slate-800/20 border border-slate-800 rounded-2xl overflow-hidden">
                          <div className="px-5 py-4 flex items-center justify-between bg-slate-800/30">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleCollapse(mod)}
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              <span className="font-bold text-white">{mod}</span>
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{perms.length}</span>
                            </div>
                            <button
                              onClick={() => toggleModule(mod)}
                              className={cn(
                                "text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full transition-all border",
                                allInModuleSelected ? "bg-sky-500/10 text-sky-400 border-sky-500/20" : "bg-slate-800 text-slate-500 border-slate-700"
                              )}
                            >
                              {allInModuleSelected ? "Deselect Group" : "Select Group"}
                            </button>
                          </div>
                          <AnimatePresence>
                            {!isCollapsed && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="px-5 py-3 grid grid-cols-1 md:grid-cols-2 gap-2"
                              >
                                {perms.map((p) => (
                                  <label
                                    key={p.id}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group/item",
                                      selectedPerms.has(p.id)
                                        ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                                        : "bg-slate-900 border-slate-800/50 text-slate-500 hover:border-slate-700"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                                      selectedPerms.has(p.id) ? "bg-sky-500 border-sky-500" : "border-slate-700 group-hover/item:border-slate-600"
                                    )}>
                                      {selectedPerms.has(p.id) && <X className="w-3 h-3 text-white rotate-45" />}
                                    </div>
                                    <input
                                      type="checkbox"
                                      className="hidden"
                                      checked={selectedPerms.has(p.id)}
                                      onChange={() => togglePerm(p.id)}
                                    />
                                    <span className="text-sm font-semibold">{p.description}</span>
                                  </label>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-slate-800 flex items-center justify-end gap-4 bg-slate-900/50 backdrop-blur-xl">
                <button
                  onClick={closeModal}
                  className="px-6 py-3 text-slate-400 hover:text-white font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !roleName.trim()}
                  className="flex items-center gap-2 px-8 py-3 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-sky-500/20 transition-all duration-200"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {editingRole ? "Save Changes" : "Create Admin Role"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccessControl;
