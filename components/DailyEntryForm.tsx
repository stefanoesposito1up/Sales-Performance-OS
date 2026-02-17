
import React, { useState, useEffect, useMemo } from 'react';
import { DailyLog, INITIAL_LOG } from '../types';
import { 
  Save, RotateCcw, Calendar, Phone, MessageSquare, 
  Users, CheckCircle2, Trophy, AlertTriangle, 
  Plus, Minus, BrainCircuit, ChevronRight, Zap, Sun, Target, Briefcase
} from 'lucide-react';

interface Props {
  onSave: (log: DailyLog) => void;
  existingLog?: DailyLog;
  selectedDate: string;
}

export const DailyEntryForm: React.FC<Props> = ({ onSave, existingLog, selectedDate }) => {
  const [formData, setFormData] = useState<DailyLog>(INITIAL_LOG);
  const [isDirty, setIsDirty] = useState(false);

  // Load data on date change
  useEffect(() => {
    if (existingLog) {
      setFormData(existingLog);
      setIsDirty(false);
    } else {
      setFormData({ ...INITIAL_LOG, date: selectedDate });
      setIsDirty(false);
    }
  }, [existingLog, selectedDate]);

  // Live Calculations Effect
  useEffect(() => {
    // Auto-calculate calls_total
    const calculatedCallsTotal = 
      (formData.calls_refused || 0) + 
      (formData.calls_no_answer || 0) + 
      (formData.calls_answered || 0);

    if (calculatedCallsTotal !== formData.calls_total) {
      setFormData(prev => ({ ...prev, calls_total: calculatedCallsTotal }));
    }
  }, [formData.calls_refused, formData.calls_no_answer, formData.calls_answered]);

  const handleChange = (field: keyof DailyLog, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof prev[field] === 'number' ? Math.max(0, Number(value)) : value
    }));
    setIsDirty(true);
  };

  const increment = (field: keyof DailyLog) => {
    handleChange(field, (Number(formData[field]) || 0) + 1);
  };

  const decrement = (field: keyof DailyLog) => {
    handleChange(field, (Number(formData[field]) || 0) - 1);
  };

  const handleReset = () => {
    if (confirm("Vuoi davvero resettare i campi di oggi?")) {
      setFormData({ ...INITIAL_LOG, date: selectedDate });
      setIsDirty(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsDirty(false);
  };

  // --- Live Metrics for Headers & Footers ---
  const total_interactions = formData.calls_total + formData.messages_sent;
  const booked_total = formData.booked_la + formData.booked_fv + formData.booked_cad;
  const done_sales = formData.done_la + formData.done_fv + formData.done_cad;
  const won_total = formData.won_la + formData.won_fv + formData.won_cad;

  // Validation Checkers
  const checkWarning = (won: number, done: number) => won > done;

  // --- UI Components ---

  const StepperInput = ({ label, field, value, warning = false, color = 'slate' }: { label: string, field: keyof DailyLog, value: number, warning?: boolean, color?: string }) => {
    const colorClasses: {[key: string]: string} = {
        slate: 'border-white/10 focus-within:border-blue-500/50',
        yellow: 'bg-yellow-500/5 border-yellow-500/20 focus-within:border-yellow-500/50', // LA
        emerald: 'bg-emerald-500/5 border-emerald-500/20 focus-within:border-emerald-500/50', // FV
        purple: 'bg-purple-500/5 border-purple-500/20 focus-within:border-purple-500/50' // CAD
    };

    const labelColors: {[key: string]: string} = {
        slate: 'text-slate-400',
        yellow: 'text-yellow-400',
        emerald: 'text-emerald-400',
        purple: 'text-purple-400'
    };

    const isWarning = warning;

    return (
        <div className={`relative flex flex-col p-3 rounded-2xl border transition-all ${isWarning ? 'bg-yellow-900/10 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.1)]' : colorClasses[color] || 'bg-slate-900/40'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isWarning ? 'text-yellow-400' : labelColors[color]}`}>
                {label}
            </span>
            
            <div className="flex items-center justify-between gap-1">
                <button 
                    type="button" 
                    onClick={() => decrement(field)}
                    className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 text-slate-400 flex items-center justify-center active:scale-90 transition-transform hover:bg-slate-700 touch-manipulation"
                >
                    <Minus size={16} />
                </button>
                
                <input 
                    type="number" 
                    pattern="[0-9]*" 
                    inputMode="numeric"
                    value={value === 0 ? '' : value} 
                    placeholder="0"
                    onChange={(e) => handleChange(field, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-transparent text-center text-2xl font-bold text-white outline-none placeholder:text-slate-700"
                />

                <button 
                    type="button" 
                    onClick={() => increment(field)}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center active:scale-90 transition-transform touch-manipulation ${color === 'slate' ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20' : `bg-${color}-500/10 border-${color}-500/30 text-${color}-400 hover:bg-${color}-500/20`}`}
                >
                    <Plus size={16} />
                </button>
            </div>
            
            {isWarning && (
                <div className="absolute top-2 right-2 text-yellow-500 animate-pulse">
                    <AlertTriangle size={14} />
                </div>
            )}
        </div>
    );
  };

  const SectionHeader = ({ title, icon: Icon, totalLabel, totalValue, color }: any) => (
    <div className="flex items-center justify-between mb-4 mt-8 first:mt-0">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-400`}>
          <Icon size={18} />
        </div>
        <h3 className="text-sm font-bold text-slate-200">{title}</h3>
      </div>
      {totalLabel && (
        <div className="text-right">
          <div className="text-[10px] uppercase text-slate-500 font-bold">{totalLabel}</div>
          <div className={`text-lg font-bold text-${color}-400`}>{totalValue}</div>
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="pb-40 max-w-2xl mx-auto relative">
      
      {/* 1. STICKY HEADER SUMMARY */}
      <div className="sticky top-16 z-20 backdrop-blur-xl bg-slate-900/80 border-b border-white/5 -mx-4 px-4 py-3 mb-6 shadow-2xl">
         <div className="flex justify-between items-center max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
               <div className="bg-slate-800 p-2 rounded-lg border border-white/10">
                 <Calendar size={18} className="text-blue-400" />
               </div>
               <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Data Inserimento</div>
                  <div className="text-sm font-medium text-white">{selectedDate === new Date().toISOString().split('T')[0] ? 'Oggi' : selectedDate}</div>
               </div>
            </div>
            
            <div className="flex gap-4 text-right">
               <div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold">Interazioni</div>
                  <div className="text-base font-bold text-slate-200">{total_interactions}</div>
               </div>
               <div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold">Fissati</div>
                  <div className="text-base font-bold text-indigo-400">{booked_total}</div>
               </div>
               <div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold">Vendite</div>
                  <div className="text-base font-bold text-emerald-400">{won_total}</div>
               </div>
            </div>
         </div>
         
         {/* Status Badge */}
         <div className="flex justify-center mt-2">
           <span className={`text-[10px] px-2 py-0.5 rounded-full border ${existingLog ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-slate-700/30 border-slate-600 text-slate-400'}`}>
              {existingLog ? '✏️ Modifica record esistente' : '✨ Nuovo record giornaliero'}
           </span>
         </div>
      </div>

      <div className="space-y-6 px-1">
        
        {/* SEZIONE A - OUTREACH */}
        <div className="glass-panel p-5 rounded-3xl">
          <SectionHeader 
            title="Outreach" 
            icon={Phone} 
            color="blue" 
            totalLabel="Totale Chiamate" 
            totalValue={formData.calls_total} 
          />
          <div className="grid grid-cols-2 gap-3">
             <StepperInput label="Rifiutate / GK" field="calls_refused" value={formData.calls_refused} />
             <StepperInput label="Non Risposte" field="calls_no_answer" value={formData.calls_no_answer} />
             <StepperInput label="Risposte" field="calls_answered" value={formData.calls_answered} />
             <StepperInput label="Messaggi" field="messages_sent" value={formData.messages_sent} />
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
             <span className="text-xs text-slate-500">Efficienza contatto</span>
             <span className="text-xs font-bold text-slate-300">{formData.calls_total > 0 ? Math.round(((formData.calls_answered + formData.messages_sent) / formData.calls_total) * 100) : 0}%</span>
          </div>
        </div>

        {/* SEZIONE B - BOOKED */}
        <div className="glass-panel p-5 rounded-3xl">
          <SectionHeader 
            title="Appuntamenti Fissati" 
            icon={Calendar} 
            color="indigo" 
            totalLabel="Totale Fissati" 
            totalValue={booked_total} 
          />
          <div className="grid grid-cols-3 gap-3">
             <StepperInput label="Bk LA" field="booked_la" value={formData.booked_la} color="yellow" />
             <StepperInput label="Bk FV" field="booked_fv" value={formData.booked_fv} color="emerald" />
             <StepperInput label="Bk TM" field="booked_cad" value={formData.booked_cad} color="purple" />
          </div>
        </div>

        {/* SEZIONE C - LEADS */}
        <div className="glass-panel p-5 rounded-3xl bg-purple-900/5 border-purple-500/10">
           <div className="flex items-center gap-3 mb-3">
              <Users size={16} className="text-purple-400" />
              <span className="text-sm font-bold text-purple-100">Nuovi Lead</span>
           </div>
           <StepperInput label="Lead Inseriti Oggi" field="new_leads" value={formData.new_leads} color="purple" />
        </div>

        {/* SEZIONE D - DONE */}
        <div className="glass-panel p-5 rounded-3xl">
          <SectionHeader 
            title="Appuntamenti Svolti" 
            icon={CheckCircle2} 
            color="orange" 
            totalLabel="Totale Vendite" 
            totalValue={done_sales} 
          />
          <div className="grid grid-cols-2 gap-3 mb-3">
             <StepperInput label="Done LA" field="done_la" value={formData.done_la} color="yellow" />
             <StepperInput label="Done FV" field="done_fv" value={formData.done_fv} color="emerald" />
             <StepperInput label="Done TM" field="done_cad" value={formData.done_cad} color="purple" />
             <StepperInput label="Affiancamenti" field="done_cde" value={formData.done_cde} />
          </div>
        </div>

        {/* SEZIONE E - WON */}
        <div className="glass-panel p-5 rounded-3xl border-emerald-500/20 bg-emerald-900/5">
          <SectionHeader 
            title="Appuntamenti Vinti" 
            icon={Trophy} 
            color="emerald" 
            totalLabel="Totale Vinti" 
            totalValue={won_total} 
          />
          <div className="grid grid-cols-3 gap-3">
             <StepperInput 
                label="Won LA" 
                field="won_la" 
                value={formData.won_la} 
                color="yellow"
                warning={checkWarning(formData.won_la, formData.done_la)}
             />
             <StepperInput 
                label="Won FV" 
                field="won_fv" 
                value={formData.won_fv} 
                color="emerald"
                warning={checkWarning(formData.won_fv, formData.done_fv)}
             />
             <StepperInput 
                label="Won TM" 
                field="won_cad" 
                value={formData.won_cad} 
                color="purple"
                warning={checkWarning(formData.won_cad, formData.done_cad)}
             />
          </div>
          {(checkWarning(formData.won_la, formData.done_la) || checkWarning(formData.won_fv, formData.done_fv) || checkWarning(formData.won_cad, formData.done_cad)) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded-lg border border-yellow-500/30 animate-pulse">
               <AlertTriangle size={14} className="shrink-0" />
               <span>Attenzione: Hai inserito più Vinti che Svolti.</span>
            </div>
          )}
        </div>

        {/* SEZIONE F - MENTAL STATE */}
        <div className="glass-panel p-5 rounded-3xl">
           <div className="flex items-center gap-2 mb-4">
              <BrainCircuit size={18} className="text-rose-400" />
              <h3 className="text-sm font-bold text-slate-200">Stato Mentale</h3>
           </div>
           
           <div className="space-y-4">
              {[
                { label: 'Energia', field: 'energy_level' as keyof DailyLog },
                { label: 'Focus', field: 'focus_level' as keyof DailyLog },
                { label: 'Confidence', field: 'confidence_level' as keyof DailyLog },
              ].map(item => (
                <div key={item.field}>
                   <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{item.label}</span>
                      <span className={`font-bold ${(formData[item.field] as number) >= 8 ? 'text-green-400' : 'text-slate-200'}`}>{formData[item.field]}/10</span>
                   </div>
                   <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={formData[item.field] as number}
                      onChange={(e) => handleChange(item.field, e.target.value)}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                   />
                </div>
              ))}
              
              <div className="pt-2">
                 <input 
                   type="text" 
                   value={formData.mood_note} 
                   onChange={(e) => handleChange('mood_note', e.target.value)}
                   placeholder="Note del giorno (opzionale)..."
                   className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 outline-none"
                 />
              </div>
           </div>
        </div>

      </div>

      {/* FINAL SUMMARY PANEL & FOOTER ACTIONS */}
      <div className="mt-8 mb-8 space-y-4">
         
         {/* Live Summary Card */}
         <div className="glass-panel p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-white/5">
             <h4 className="text-[10px] text-slate-500 font-bold uppercase mb-3">Riepilogo Live</h4>
             <div className="grid grid-cols-4 gap-2 text-center divide-x divide-white/5">
                 <div>
                     <div className="text-[9px] text-slate-400 uppercase">Interazioni</div>
                     <div className="text-sm font-bold text-white">{total_interactions}</div>
                 </div>
                 <div>
                     <div className="text-[9px] text-slate-400 uppercase">Booked</div>
                     <div className="text-sm font-bold text-indigo-400">{booked_total}</div>
                 </div>
                 <div>
                     <div className="text-[9px] text-slate-400 uppercase">Done</div>
                     <div className="text-sm font-bold text-orange-400">{done_sales}</div>
                 </div>
                 <div>
                     <div className="text-[9px] text-slate-400 uppercase">Won</div>
                     <div className="text-sm font-bold text-emerald-400">{won_total}</div>
                 </div>
             </div>
         </div>

         {/* Actions */}
         <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/10 flex items-center justify-between gap-4">
            <div className="w-full flex gap-3">
                <button 
                    type="button" 
                    onClick={handleReset}
                    className="px-4 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold hover:bg-slate-700 transition-colors flex items-center justify-center"
                >
                    <RotateCcw size={20} />
                </button>
                
                <button 
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                    <Save size={20} />
                    <span>{existingLog ? 'Aggiorna Dati' : 'Salva Dati'}</span>
                </button>
            </div>
         </div>
      </div>

    </form>
  );
};
