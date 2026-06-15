import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Plus, X, Save, Edit2, Loader2 } from 'lucide-react';
import api from '../lib/axios';
import { cn } from '../lib/utils';

interface Mapping {
  id: number;
  db_column: string;
  alias: string[];
}

const FieldMappings: React.FC = () => {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addingField, setAddingField] = useState(false);

  useEffect(() => {
    fetchMappings();
    fetchAvailableColumns();
  }, []);

  const fetchAvailableColumns = async () => {
    try {
      const response = await api.get('/available-columns');
      setAvailableColumns(response.data.data);
    } catch (err) {
      console.error('Error fetching columns:', err);
    }
  };

  const fetchMappings = async () => {
    try {
      const response = await api.get('/field-mappings');
      setMappings(response.data.data);
    } catch (err) {
      console.error('Error fetching mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (mapping: Mapping) => {
    setEditingId(mapping.id);
    setEditValue([...mapping.alias]);
    setInputValue('');
  };

  const addAlias = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!editValue.includes(inputValue.trim())) {
        setEditValue([...editValue, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const removeAlias = (alias: string) => {
    setEditValue(editValue.filter(a => a !== alias));
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      await api.post('/field-mappings/update', { id, aliases: editValue });
      setMappings(mappings.map(m => m.id === id ? { ...m, alias: editValue } : m));
      setEditingId(null);
    } catch (err) {
      console.error('Error saving mapping:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = async (dbColumn: string) => {
    setAddingField(true);
    try {
      await api.post('/field-mappings/add', { db_column: dbColumn });
      await Promise.all([fetchMappings(), fetchAvailableColumns()]);
      setShowAddMenu(false);
    } catch (err) {
      console.error('Error adding field:', err);
    } finally {
      setAddingField(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-3">Field Mappings</h1>
          <p className="text-slate-400">Manage global aliases to ensure accurate data extraction across all suppliers.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-900/50 border border-slate-800 px-6 py-3 rounded-2xl flex flex-col items-center min-w-[140px]">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Fields</span>
            <span className="text-2xl font-bold text-white">{mappings.length}</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="bg-sky-500 hover:bg-sky-400 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              Add New Field
            </button>

            <AnimatePresence>
              {showAddMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-800">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Available DB Columns</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {availableColumns.length > 0 ? (
                        availableColumns.map(col => (
                          <button
                            key={col}
                            disabled={addingField}
                            onClick={() => handleAddField(col)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-sky-500 hover:text-white rounded-xl transition-all flex items-center justify-between group"
                          >
                            <span className="font-mono">{col}</span>
                            <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-xs text-slate-600 italic">All database columns are already mapped.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {mappings.map((mapping) => (
            <motion.div
              key={mapping.id}
              layout
              className={cn(
                "glass rounded-2xl transition-all duration-300 overflow-hidden flex flex-col min-h-[280px]",
                editingId === mapping.id ? "border-sky-500/50 shadow-[0_0_30px_rgba(14,165,233,0.15)] ring-1 ring-sky-500/20" : "hover:border-slate-700"
              )}
            >
              <div className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800/50 rounded-xl flex items-center justify-center border border-slate-700">
                      <Database className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-sm font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 font-bold max-w-[140px] truncate">
                        {mapping.db_column}
                      </h3>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                        {mapping.alias.length} Aliases
                      </span>
                    </div>
                  </div>

                  {editingId === mapping.id ? (
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 text-slate-500 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => startEditing(mapping)}
                      className="p-2 text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className={cn(
                  "flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 mb-4",
                  editingId === mapping.id ? "max-h-[160px]" : "max-h-[140px]"
                )}>
                  <div className="flex flex-wrap gap-1.5 px-0.5">
                    <AnimatePresence mode="popLayout">
                      {(editingId === mapping.id ? editValue : mapping.alias).map((alias) => (
                        <motion.span
                          key={alias}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-md text-[11px] border border-slate-700/50 flex items-center gap-1.5 group font-medium"
                        >
                          {alias}
                          {editingId === mapping.id && (
                            <button
                              onClick={() => removeAlias(alias)}
                              className="p-0.5 hover:bg-rose-500/20 hover:text-rose-400 rounded transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>

                  {editingId !== mapping.id && mapping.alias.length === 0 && (
                    <p className="text-slate-600 text-xs italic">No aliases defined</p>
                  )}
                </div>

                {editingId === mapping.id && (
                  <div className="mt-auto space-y-4 pt-4 border-t border-slate-800/50">
                    <div className="relative">
                      <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-500/50" />
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={addAlias}
                        placeholder="New alias..."
                        className="w-full bg-sky-500/5 border border-sky-500/20 rounded-xl py-2 pl-9 pr-3 text-xs text-sky-100 placeholder:text-sky-500/30 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-medium"
                      />
                    </div>
                    <button
                      onClick={() => handleSave(mapping.id)}
                      disabled={saving}
                      className="w-full bg-sky-500 hover:bg-sky-400 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};


export default FieldMappings;
