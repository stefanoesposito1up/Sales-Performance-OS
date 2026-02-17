
import React, { useState, useEffect } from 'react';
import { DailyLog, INITIAL_LOG } from '../types';
import { upsertDailyLog } from '../services/cloud';
import { getTodayDateRome } from '../services/dateUtils';
import { 
    X, ChevronRight, Check, Phone, MessageSquare, 
    Calendar, Trophy, Briefcase, Zap, Plus, Minus, Loader2 
} from 'lucide-react';

interface Props {
    userId: string;
    existingLog?: DailyLog;
    onClose: () => void;
    onSuccess: () => void;
}

export const CloseDayWizard: React.FC<Props> = ({ userId, existingLog, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<DailyLog>(INITIAL_LOG);
    const [saving, setSaving] = useState(false);

    // Init data
    useEffect(() => {
        if (existingLog) {
            setFormData(existingLog);
        } else {
            setFormData({ ...INITIAL_LOG, date: getTodayDateRome() });
        }
    }, [existingLog]);

    // Live Calc Helpers
    const handleChange = (field: keyof DailyLog, val: number) => {
        setFormData(prev => {
            const next = { ...prev, [field]: Math.max(0, val) };
            // Auto-calc totals
            if (field.startsWith('calls_')) {
                next.calls_total = (next.calls_refused || 0) + (next.calls_no_answer || 0) + (next.calls_answered || 0);
            }
            return next;
        });
    };

    const add = (field: keyof DailyLog, amount: number) => {
        handleChange(field, (Number(formData[field]) || 0) + amount);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await upsertDailyLog(formData, userId);
            onSuccess();
        } catch (e) {
            alert("Errore salvataggio: " + e);
            setSaving(false);
        }
    };

    // Components
    const QuickBtn = ({ label, onClick, color = 'slate' }: any) => (
        <button 
            onClick={onClick}
            className={`px-3 py-2 rounded-lg bg-${color}-500/10 text-${color}-400 hover:bg-${color}-500/20 text-xs font-bold transition-all active:scale-95`}
        >
            {label}
        </button>
    );

    const StepperRow = ({ label, field }: { label: string, field: keyof DailyLog }) => (
        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-sm text-slate-300">{label}</span>
            <div className="flex items-center gap-3">
                <button onClick={() => add(field, -1)} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"><Minus size={14}/></button>
                <input 
                    type="number" 
                    value={formData[field]} 
                    onChange={e => handleChange(field, parseInt(e.target.value) || 0)}
                    className="w-12 bg-transparent text-center font-bold text-white outline-none"
                />
                <button onClick={() => add(field, 1)} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"><Plus size={14}/></button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative">
                
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Zap className="text-yellow-400 fill-yellow-400" size={20}/> Chiudi Giornata
                        </h2>
                        <p className="text-xs text-slate-400">Step {step} di 4 • {getTodayDateRome()}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={18}/></button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-slate-800">
                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${step * 25}%` }}></div>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto">
                    
                    {/* STEP 1: OUTREACH */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="text-center">
                                <div className="inline-flex p-3 rounded-full bg-blue-500/10 text-blue-400 mb-2"><Phone size={24}/></div>
                                <h3 className="text-lg font-bold text-white">Outreach</h3>
                                <p className="text-sm text-slate-400">Quante attività hai fatto oggi?</p>
                            </div>

                            <div className="bg-slate-800/50 p-4 rounded-xl space-y-2">
                                <StepperRow label="Chiamate NO Risposta" field="calls_no_answer" />
                                <div className="flex justify-end gap-2 pb-2">
                                    <QuickBtn label="+10" onClick={() => add('calls_no_answer', 10)} color="blue"/>
                                    <QuickBtn label="+20" onClick={() => add('calls_no_answer', 20)} color="blue"/>
                                </div>
                                
                                <StepperRow label="Chiamate Rifiutate / GK" field="calls_refused" />
                                <StepperRow label="Chiamate Risposte" field="calls_answered" />
                                <div className="flex justify-end gap-2 border-t border-white/5 pt-2">
                                    <span className="text-xs text-slate-500 self-center mr-auto">Totale Chiamate: <b className="text-white">{formData.calls_total}</b></span>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-4 rounded-xl space-y-2">
                                <div className="flex items-center gap-2 mb-2 text-cyan-400 text-sm font-bold"><MessageSquare size={16}/> Messaggi</div>
                                <StepperRow label="Messaggi Inviati" field="messages_sent" />
                                <div className="flex justify-end gap-2">
                                    <QuickBtn label="+5" onClick={() => add('messages_sent', 5)} color="cyan"/>
                                    <QuickBtn label="+10" onClick={() => add('messages_sent', 10)} color="cyan"/>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: BOOKED & LEADS */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                             <div className="text-center">
                                <div className="inline-flex p-3 rounded-full bg-indigo-500/10 text-indigo-400 mb-2"><Calendar size={24}/></div>
                                <h3 className="text-lg font-bold text-white">Fissati & Lead</h3>
                            </div>

                            <div className="bg-slate-800/50 p-4 rounded-xl space-y-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Appuntamenti Fissati</h4>
                                <StepperRow label="Luce Amica" field="booked_la" />
                                <StepperRow label="Fotovoltaico" field="booked_fv" />
                                <StepperRow label="Adesione (CAD)" field="booked_cad" />
                            </div>

                             <div className="bg-purple-900/10 p-4 rounded-xl space-y-2 border border-purple-500/20">
                                <h4 className="text-xs font-bold text-purple-400 uppercase mb-2">Nuovi Lead</h4>
                                <StepperRow label="Lead Inseriti" field="new_leads" />
                            </div>
                        </div>
                    )}

                    {/* STEP 3: DONE */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                             <div className="text-center">
                                <div className="inline-flex p-3 rounded-full bg-orange-500/10 text-orange-400 mb-2"><Briefcase size={24}/></div>
                                <h3 className="text-lg font-bold text-white">Svolti Oggi</h3>
                            </div>

                            <div className="bg-slate-800/50 p-4 rounded-xl space-y-2">
                                <StepperRow label="Svolti LA" field="done_la" />
                                <StepperRow label="Svolti FV" field="done_fv" />
                                <StepperRow label="Svolti CAD" field="done_cad" />
                                <StepperRow label="Affiancamenti (CDE)" field="done_cde" />
                            </div>
                        </div>
                    )}

                    {/* STEP 4: WON & SUMMARY */}
                    {step === 4 && (
                         <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="text-center">
                                <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-2"><Trophy size={24}/></div>
                                <h3 className="text-lg font-bold text-white">Vinti & Chiusura</h3>
                            </div>

                             <div className="bg-emerald-900/10 p-4 rounded-xl space-y-2 border border-emerald-500/20">
                                <StepperRow label="Vinti LA" field="won_la" />
                                <StepperRow label="Vinti FV" field="won_fv" />
                                <StepperRow label="Vinti CAD" field="won_cad" />
                            </div>

                            <div className="bg-slate-800 p-4 rounded-xl">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 text-center">Riepilogo Giornata</h4>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-slate-900/50 p-2 rounded-lg">
                                        <div className="text-xs text-slate-400">Calls</div>
                                        <div className="font-bold text-white">{formData.calls_total}</div>
                                    </div>
                                    <div className="bg-slate-900/50 p-2 rounded-lg">
                                        <div className="text-xs text-slate-400">Booked</div>
                                        <div className="font-bold text-indigo-400">{(formData.booked_la || 0) + (formData.booked_fv || 0) + (formData.booked_cad || 0)}</div>
                                    </div>
                                    <div className="bg-slate-900/50 p-2 rounded-lg">
                                        <div className="text-xs text-slate-400">Won</div>
                                        <div className="font-bold text-emerald-400">{(formData.won_la || 0) + (formData.won_fv || 0) + (formData.won_cad || 0)}</div>
                                    </div>
                                </div>
                            </div>
                         </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/5 bg-slate-900/50 flex gap-3">
                    {step > 1 && (
                        <button 
                            onClick={() => setStep(s => s - 1)}
                            className="px-4 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold hover:bg-slate-700"
                        >
                            Indietro
                        </button>
                    )}
                    
                    {step < 4 ? (
                        <button 
                             onClick={() => setStep(s => s + 1)}
                             className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg"
                        >
                            Avanti <ChevronRight size={18}/>
                        </button>
                    ) : (
                        <button 
                             onClick={handleSave}
                             disabled={saving}
                             className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg animate-pulse-slow"
                        >
                            {saving ? <Loader2 className="animate-spin"/> : <Check size={18}/>}
                            Chiudi Giornata
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
