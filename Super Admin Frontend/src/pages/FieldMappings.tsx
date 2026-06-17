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

  const cancelEditing = () => {
    setEditingId(null);
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
    <div className="w-full min-w-0">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Field Mappings</h1>
            <span className="bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-slate-700">
              {mappings.length} fields
            </span>
          </div>
          <p className="text-slate-500 text-xs">Manage global aliases for accurate data extraction across all suppliers</p>
        </div>

        <div className="relative self-start sm:self-auto">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Field
          </button>

          <AnimatePresence>
            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden"
                >
                  <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/60">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available DB Columns</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1.5">
                    {availableColumns.length > 0 ? (
                      availableColumns.map(col => (
                        <button
                          key={col}
                          disabled={addingField}
                          onClick={() => handleAddField(col)}
                          className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-sky-500 hover:text-white rounded-lg transition-all flex items-center justify-between group"
                        >
                          <span className="font-mono text-xs">{col}</span>
                          <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-xs text-slate-600 italic">All columns are already mapped.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      ) : mappings.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
          <Database className="w-9 h-9 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium text-sm">No field mappings found.</p>
        </div>
      ) : (
        <>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['S.N', 'DB Column', 'Aliases', 'Count', 'Actions'].map(h => (
                      <th
                        key={h}
                        className={cn(
                          "text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap bg-slate-900/60",
                          h === 'S.N' || h === 'Count' || h === 'Actions' ? 'text-center' : 'text-left'
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {mappings.map((mapping, index) => {
                    const isEditing = editingId === mapping.id;
                    const aliases = isEditing ? editValue : mapping.alias;
                    return (
                      <motion.tr
                        key={mapping.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn("transition-colors", isEditing ? "bg-sky-500/5" : "hover:bg-slate-800/30")}
                      >
                        <td className="px-4 py-3 text-xs text-slate-600 font-mono text-center whitespace-nowrap align-top pt-4">{index + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap align-top pt-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 shrink-0">
                              <Database className="w-3.5 h-3.5 text-sky-400" />
                            </div>
                            <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                              {mapping.db_column}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <AnimatePresence mode="popLayout">
                              {aliases.map(alias => (
                                <motion.span
                                  key={alias}
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.8, opacity: 0 }}
                                  className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md text-[11px] border border-slate-700/50 font-medium"
                                >
                                  {alias}
                                  {isEditing && (
                                    <button onClick={() => removeAlias(alias)} className="hover:text-rose-400 transition-colors ml-0.5">
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </motion.span>
                              ))}
                            </AnimatePresence>
                            {!isEditing && aliases.length === 0 && <span className="text-slate-700 text-xs italic">No aliases</span>}
                          </div>
                          {isEditing && (
                            <div className="relative max-w-xs">
                              <Plus className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-sky-500/50" />
                              <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={addAlias}
                                placeholder="Type alias and press Enter..."
                                autoFocus
                                className="w-full bg-sky-500/5 border border-sky-500/20 rounded-lg py-1.5 pl-8 pr-3 text-xs text-sky-100 placeholder:text-sky-500/30 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all"
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap align-top pt-4">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">
                            {isEditing ? editValue.length : mapping.alias.length}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap align-top pt-3.5">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleSave(mapping.id)}
                                disabled={saving}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-white bg-sky-500 hover:bg-sky-400 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                              >
                                <X className="w-3 h-3" />Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(mapping)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />Edit
                            </button>
                          )}
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
  );
};

export default FieldMappings;
