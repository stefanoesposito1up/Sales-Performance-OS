
import React, { useState } from 'react';
import { DailyLog } from '../types';
import { Download, Search, Calendar, Check, X, Trash2 } from 'lucide-react';

interface Props {
  logs: DailyLog[];
  onUpdate: (log: DailyLog) => void;
  onDelete: (date: string) => void;
}

export const HistoryView: React.FC<Props> = ({ logs, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Staging state for edited rows: key = date, value = modified log
  const [editedRows, setEditedRows] = useState<{ [date: string]: DailyLog }>({});

  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const filtered = sortedLogs.filter(l => l.date.includes(searchTerm));

  const handleEdit = (date: string, field: keyof DailyLog, value: any) => {
    // Find the current log state (either from edits or original)
    const currentLog = editedRows[date] || logs.find(l => l.date === date);
    if (!currentLog) return;

    let newVal = value;
    if (typeof currentLog[field] === 'number') {
        newVal = Math.max(0, Number(value));
    }

    const updatedLog = { ...currentLog, [field]: newVal };

    // Auto-recalculate calls_total if specific call metrics change
    if (field === 'calls_refused' || field === 'calls_no_answer' || field === 'calls_answered') {
       updatedLog.calls_total = 
         (field === 'calls_refused' ? newVal : updatedLog.calls_refused) +
         (field === 'calls_no_answer' ? newVal : updatedLog.calls_no_answer) +
         (field === 'calls_answered' ? newVal : updatedLog.calls_answered);
    }

    setEditedRows(prev => ({
      ...prev,
      [date]: updatedLog
    }));
  };

  const handleSaveRow = (date: string) => {
    if (editedRows[date]) {
      onUpdate(editedRows[date]);
      // Clear edit state for this row
      const newEdits = { ...editedRows };
      delete newEdits[date];
      setEditedRows(newEdits);
    }
  };

  const handleCancelRow = (date: string) => {
      const newEdits = { ...editedRows };
      delete newEdits[date];
      setEditedRows(newEdits);
  };

  const InputCell = ({ rowDate, field, val, width = 'w-16' }: { rowDate: string, field: keyof DailyLog, val: string | number, width?: string }) => {
    // If there's an edit for this row, display that, otherwise display original prop val
    const isEdited = !!editedRows[rowDate];
    const displayVal = isEdited && editedRows[rowDate][field] !== undefined 
        ? editedRows[rowDate][field] 
        : val;

    return (
        <input 
            type={typeof val === 'number' ? "number" : "text"}
            value={displayVal}
            onChange={(e) => handleEdit(rowDate, field, e.target.value)}
            className={`bg-transparent border-b border-transparent hover:border-white/20 focus:border-blue-500 focus:bg-slate-900/50 outline-none text-center transition-all px-1 py-1 ${width} text-slate-300 focus:text-white`}
        />
    );
  };

  // Helper to check if a specific row has unsaved changes
  const hasChanges = (date: string) => !!editedRows[date];

  return (
    <div className="max-w-7xl mx-auto pb-24">
       <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6">
          <div>
             <h2 className="text-2xl font-bold text-white tracking-tight">Storico Dati & Modifica</h2>
             <p className="text-slate-400 text-sm mt-1">Visualizza, modifica ed elimina i dati giornalieri.</p>
          </div>
          
          <div className="glass-panel px-3 py-2 rounded-xl flex items-center gap-2 w-full md:w-auto">
             <Search size={16} className="text-slate-500" />
             <input 
               type="text" 
               placeholder="Cerca data..." 
               className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-600"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
       </div>

       <div className="glass-panel rounded-2xl overflow-hidden relative">
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-20 backdrop-blur-md">
                    <tr>
                        <th className="px-4 py-4 sticky left-0 bg-slate-900/90 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">Data</th>
                        {/* Outreach */}
                        <th className="px-2 py-4 text-center text-blue-400/80 bg-blue-900/10">Rifut.</th>
                        <th className="px-2 py-4 text-center text-blue-400/80 bg-blue-900/10">No Risp</th>
                        <th className="px-2 py-4 text-center text-blue-400/80 bg-blue-900/10">Risp</th>
                        <th className="px-2 py-4 text-center text-blue-400/80 bg-blue-900/10">Msg</th>
                        <th className="px-2 py-4 text-center border-l border-white/5">Calls Tot</th>
                        
                        {/* Booked */}
                        <th className="px-2 py-4 text-center text-yellow-400/80 bg-yellow-900/10 border-l border-white/5">Bk LA</th>
                        <th className="px-2 py-4 text-center text-emerald-400/80 bg-emerald-900/10">Bk FV</th>
                        <th className="px-2 py-4 text-center text-purple-400/80 bg-purple-900/10">Bk TM</th>
                        
                        {/* Leads */}
                        <th className="px-2 py-4 text-center text-purple-400/80 bg-purple-900/10 border-l border-white/5">Leads</th>

                        {/* Done */}
                        <th className="px-2 py-4 text-center text-yellow-400/80 bg-yellow-900/10 border-l border-white/5">Dn LA</th>
                        <th className="px-2 py-4 text-center text-emerald-400/80 bg-emerald-900/10">Dn FV</th>
                        <th className="px-2 py-4 text-center text-purple-400/80 bg-purple-900/10">Dn TM</th>
                        <th className="px-2 py-4 text-center text-orange-400/80 bg-orange-900/10">CDE</th>

                        {/* Won */}
                        <th className="px-2 py-4 text-center text-yellow-400/80 bg-yellow-900/10 border-l border-white/5">Wn LA</th>
                        <th className="px-2 py-4 text-center text-emerald-400/80 bg-emerald-900/10">Wn FV</th>
                        <th className="px-2 py-4 text-center text-purple-400/80 bg-purple-900/10">Wn TM</th>

                        {/* Mental */}
                        <th className="px-2 py-4 text-center border-l border-white/5">Energy</th>
                        <th className="px-2 py-4 text-center">Focus</th>
                        <th className="px-2 py-4 text-center">Conf</th>
                        
                        <th className="px-4 py-4 min-w-[200px]">Note</th>
                        
                        <th className="px-4 py-4 sticky right-0 bg-slate-900/90 z-30 text-center shadow-[-4px_0_24px_rgba(0,0,0,0.5)]">Azioni</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filtered.map((log) => {
                        const isDirty = hasChanges(log.date);
                        // Access values from editedRows if exists, else log
                        const data = editedRows[log.date] || log;
                        
                        return (
                        <tr key={log.date} className={`group transition-colors ${isDirty ? 'bg-blue-500/5' : 'hover:bg-white/5'}`}>
                            {/* Sticky Date */}
                            <td className="px-4 py-3 font-medium text-white whitespace-nowrap sticky left-0 bg-slate-900/95 group-hover:bg-slate-800 transition-colors z-10 border-r border-white/5 shadow-[4px_0_10px_rgba(0,0,0,0.2)]">
                                <div className="flex items-center gap-2">
                                    <Calendar size={12} className="text-slate-500" /> 
                                    {log.date}
                                </div>
                            </td>

                            {/* Outreach Inputs */}
                            <td className="px-1 py-2 text-center"><InputCell rowDate={log.date} field="calls_refused" val={log.calls_refused} /></td>
                            <td className="px-1 py-2 text-center"><InputCell rowDate={log.date} field="calls_no_answer" val={log.calls_no_answer} /></td>
                            <td className="px-1 py-2 text-center"><InputCell rowDate={log.date} field="calls_answered" val={log.calls_answered} /></td>
                            <td className="px-1 py-2 text-center"><InputCell rowDate={log.date} field="messages_sent" val={log.messages_sent} /></td>
                            <td className="px-1 py-2 text-center font-bold text-slate-500 border-l border-white/5">{data.calls_total}</td>

                            {/* Booked Inputs */}
                            <td className="px-1 py-2 text-center border-l border-white/5"><InputCell rowDate={log.date} field="booked_la" val={log.booked_la} /></td>
                            <td className="px-1 py-2 text-center"><InputCell rowDate={log.date} field="booked_fv" val={log.booked_fv} /></td>
                            <td className="px-1 py-2 text-center"><InputCell rowDate={log.date} field="booked_cad" val={log.booked_cad} /></td>

                            {/* Leads */}
                            <td className="px-1 py-2 text-center border-l border-white/5"><InputCell rowDate={log.date} field="new_leads" val={log.new_leads} /></td>

                            {/* Done Inputs */}
                            <td className="px-1 py-2 text-center border-l border-white/5"><InputCell rowDate={log.date} field="done_la" val={log.done_la} /></td>
                            <td className="px-1 py-2 text-center"><InputCell rowDate={log.date} field="done_fv" val={log.done_fv} /></td>
                            <td className="px-1 py-2 text-center"><InputCell rowDate={log.date} field="done_cad" val={log.done_cad} /></td>
                            <td className="px-1 py-2 text-center"><InputCell rowDate={log.date} field="done_cde" val={log.done_cde} /></td>

                            {/* Won Inputs */}
                            <td className="px-1 py-2 text-center border-l border-white/5"><InputCell rowDate={log.date} field="won_la" val={log.won_la} /></td>
                            <td className="px-1 py-2 text-center"><InputCell rowDate={log.date} field="won_fv" val={log.won_fv} /></td>
                            <td className="px-1 py-2 text-center"><InputCell rowDate={log.date} field="won_cad" val={log.won_cad} /></td>

                            {/* Mental */}
                            <td className="px-1 py-2 text-center border-l border-white/5"><InputCell rowDate={log.date} field="energy_level" val={log.energy_level} width="w-10" /></td>
                            <td className="px-1 py-2 text-center"><InputCell rowDate={log.date} field="focus_level" val={log.focus_level} width="w-10" /></td>
                            <td className="px-1 py-2 text-center"><InputCell rowDate={log.date} field="confidence_level" val={log.confidence_level} width="w-10" /></td>

                            {/* Notes */}
                            <td className="px-2 py-2">
                                <InputCell rowDate={log.date} field="mood_note" val={log.mood_note} width="w-full min-w-[150px] text-left" />
                            </td>

                            {/* Actions Sticky */}
                            <td className="px-2 py-2 sticky right-0 bg-slate-900/95 group-hover:bg-slate-800 transition-colors z-10 text-center shadow-[-4px_0_10px_rgba(0,0,0,0.2)]">
                                {isDirty ? (
                                    <div className="flex items-center justify-center gap-2 animate-in fade-in slide-in-from-right-4">
                                        <button 
                                            onClick={() => handleSaveRow(log.date)}
                                            className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                                            title="Salva modifiche"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleCancelRow(log.date)}
                                            className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
                                            title="Annulla"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => onDelete(log.date)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                                        title="Elimina riga"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </td>
                        </tr>
                        )
                    })}
                </tbody>
            </table>
          </div>
       </div>
    </div>
  );
};
