
import React, { useState, useEffect, useMemo } from 'react';
import { MonthlyPlan, DailyLog, INITIAL_PLAN } from '../types';
import { calculateContextRates, calculatePlanEngine, calculateRemainingPlan, ProductRates, RateSource } from '../services/planning';
import { fetchLogsForMonth } from '../services/cloud';
import { 
  Target, Calendar, TrendingUp, AlertTriangle, 
  CheckCircle2, Settings, ArrowRight, Zap, 
  BarChart3, RefreshCw, Calculator, Save, Info,
  MessageSquare, Phone, Bug, Loader2
} from 'lucide-react';
import { useAuth } from '../services/auth';
import { usePlan } from '../services/planContext';

interface Props {
  logs: DailyLog[]; // Full history passed from App
}

const RateSourceBadge = ({ source }: { source: RateSource }) => {
    const colors: Record<string, string> = {
        'MTD': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        '60d': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        '90d': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        'All Time': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        'Standard': 'bg-slate-700/30 text-slate-400 border-slate-600/30'
    };
    
    return (
        <span className={`text-[8px] px-1 py-0.5 rounded border ${colors[source] || colors['Standard']}`}>
            {source}
        </span>
    );
};

export const PlanningView: React.FC<Props> = ({ logs }) => {
  const { session, profile } = useAuth();
  const { currentPlan, currentMonthKey, setMonthKey, savePlan, loadingPlan } = usePlan();
  
  // Local inputs state
  const [inputs, setInputs] = useState({
      target_won_la: 0,
      target_won_fv: 0,
      target_won_cad: 0,
      workdays_per_week: 5
  });

  const [saving, setSaving] = useState(false);
  const [simModifiers, setSimModifiers] = useState({ winRatePct: 0, showRatePct: 0 });
  const [activeTab, setActiveTab] = useState<'plan' | 'simulator'>('plan');
  const [showDebug, setShowDebug] = useState(false);
  const [showDetailFormula, setShowDetailFormula] = useState(false);
  
  // SPECIFIC MTD DATA FROM DB
  const [mtdLogs, setMtdLogs] = useState<DailyLog[]>([]);
  const [loadingMtd, setLoadingMtd] = useState(false);

  // Sync inputs with currentPlan when it loads
  useEffect(() => {
    if (currentPlan) {
      setInputs({
          target_won_la: currentPlan.target_won_la_month || 0,
          target_won_fv: currentPlan.target_won_fv_month || 0,
          target_won_cad: currentPlan.target_won_cad_month || 0,
          workdays_per_week: currentPlan.workdays_per_week || 5
      });
    } else {
      // Default / Reset if no plan exists for this month
      setInputs({
          target_won_la: 0,
          target_won_fv: 0,
          target_won_cad: 0,
          workdays_per_week: 5
      });
    }
  }, [currentPlan, currentMonthKey]);

  // FETCH EXACT MTD DATA
  useEffect(() => {
      if (!session?.user) return;
      const loadMtd = async () => {
          setLoadingMtd(true);
          try {
              const data = await fetchLogsForMonth(session.user.id, currentMonthKey);
              setMtdLogs(data);
          } catch (e) {
              console.error("MTD Load Error", e);
              // Fallback to empty array, don't crash
              setMtdLogs([]); 
          }
          setLoadingMtd(false);
      };
      loadMtd();
  }, [currentMonthKey, session]);

  // --- 3. CALCULATIONS ENGINE ---
  const ratesContext = useMemo(() => calculateContextRates(logs), [logs]);
  
  // Use inputs for real-time calculation
  const basePlan = useMemo(() => calculatePlanEngine({
      la: inputs.target_won_la,
      fv: inputs.target_won_fv,
      cad: inputs.target_won_cad,
      workdays: inputs.workdays_per_week
  }, ratesContext, logs), [inputs, ratesContext, logs]);

  const simulatedPlan = useMemo(() => calculatePlanEngine({
      la: inputs.target_won_la,
      fv: inputs.target_won_fv,
      cad: inputs.target_won_cad,
      workdays: inputs.workdays_per_week
  }, ratesContext, logs, simModifiers), [inputs, ratesContext, logs, simModifiers]);

  const planData = useMemo(() => {
      return calculateRemainingPlan(basePlan, mtdLogs, currentMonthKey, inputs.workdays_per_week);
  }, [basePlan, mtdLogs, currentMonthKey, inputs.workdays_per_week]);

  // --- 4. HANDLERS ---
  const handleInput = (field: string, val: number) => {
      setInputs(prev => ({ ...prev, [field]: Math.max(0, val) }));
  };

  const handleSave = async () => {
      setSaving(true);
      const planToSave: MonthlyPlan = {
          ...INITIAL_PLAN,
          month: currentMonthKey,
          workdays_per_week: inputs.workdays_per_week,
          target_won_la_month: inputs.target_won_la,
          target_won_fv_month: inputs.target_won_fv,
          target_won_cad_month: inputs.target_won_cad,
      };
      
      const success = await savePlan(planToSave);
      if (success) {
          alert("Piano salvato correttamente! ✅");
      } else {
          alert("Errore durante il salvataggio del piano.");
      }
      setSaving(false);
  };

  const applySuggestion = (multiplier: number) => {
      const avg = basePlan.reality_check.avg_monthly_won || 1;
      const target = Math.ceil(avg * multiplier);
      const totalCurrent = inputs.target_won_la + inputs.target_won_fv + inputs.target_won_cad;
      if (totalCurrent === 0) {
          handleInput('target_won_la', Math.ceil(target * 0.4));
          handleInput('target_won_fv', Math.ceil(target * 0.3));
          handleInput('target_won_cad', Math.ceil(target * 0.3));
      } else {
          const ratioLa = inputs.target_won_la / totalCurrent;
          const ratioFv = inputs.target_won_fv / totalCurrent;
          const ratioCad = inputs.target_won_cad / totalCurrent;
          handleInput('target_won_la', Math.ceil(target * ratioLa));
          handleInput('target_won_fv', Math.ceil(target * ratioFv));
          handleInput('target_won_cad', Math.ceil(target * ratioCad));
      }
  };

  // --- SUB COMPONENTS ---

  const RealityBadge = () => {
      const { status, growth_factor } = basePlan.reality_check;
      const pct = Math.round((growth_factor - 1) * 100);
      const color = status === 'realistic' ? 'emerald' : status === 'ambitious' ? 'yellow' : 'red';
      const label = status === 'realistic' ? 'Realistico' : status === 'ambitious' ? 'Ambizioso' : 'Aggressivo';
      
      if (inputs.target_won_la + inputs.target_won_fv + inputs.target_won_cad === 0) return null;

      return (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-${color}-500/10 border border-${color}-500/20 text-${color}-400 text-xs font-bold`}>
              <TrendingUp size={14} />
              <span>{label} ({pct > 0 ? '+' : ''}{pct}% vs media)</span>
          </div>
      );
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'coach';

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-8 animate-in fade-in">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-900/30">
                    <Target className="text-white" size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Pianificazione Mensile</h2>
                    <p className="text-slate-400 text-xs">Imposta i target e lascia che il sistema calcoli il resto.</p>
                </div>
            </div>
            
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
                <input 
                    type="month" 
                    value={currentMonthKey}
                    onChange={e => setMonthKey(e.target.value)}
                    className="bg-transparent text-white text-sm font-bold px-3 py-1.5 outline-none"
                />
            </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COL: CONFIGURATION */}
            <div className="lg:col-span-1 space-y-6">
                
                {/* 1. Target Input */}
                <div className="glass-panel p-5 rounded-2xl border-t-4 border-blue-500">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2"><Target size={16}/> Obiettivo Vinti</h3>
                        <div className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">Mensile</div>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-yellow-400 font-bold">Luce Amica</span>
                                <span className="text-slate-500">Contratti</span>
                            </div>
                            <input 
                                type="number" 
                                className="glass-input w-full p-2 rounded-lg text-lg font-bold text-yellow-400 text-center border-yellow-500/20 focus:border-yellow-500"
                                value={inputs.target_won_la || ''}
                                onChange={e => handleInput('target_won_la', parseInt(e.target.value))}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-emerald-400 font-bold">Fotovoltaico</span>
                                <span className="text-slate-500">Contratti</span>
                            </div>
                            <input 
                                type="number" 
                                className="glass-input w-full p-2 rounded-lg text-lg font-bold text-emerald-400 text-center border-emerald-500/20 focus:border-emerald-500"
                                value={inputs.target_won_fv || ''}
                                onChange={e => handleInput('target_won_fv', parseInt(e.target.value))}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-purple-400 font-bold">Adesione (CAD)</span>
                                <span className="text-slate-500">Contratti</span>
                            </div>
                            <input 
                                type="number" 
                                className="glass-input w-full p-2 rounded-lg text-lg font-bold text-purple-400 text-center border-purple-500/20 focus:border-purple-500"
                                value={inputs.target_won_cad || ''}
                                onChange={e => handleInput('target_won_cad', parseInt(e.target.value))}
                                placeholder="0"
                            />
                        </div>
                        
                        <div className="pt-4 border-t border-white/5">
                            <label className="text-xs text-slate-500 block mb-1">Giorni Lavorativi / Settimana</label>
                            <select 
                                className="glass-input w-full p-2 rounded-lg text-sm"
                                value={inputs.workdays_per_week}
                                onChange={e => handleInput('workdays_per_week', parseInt(e.target.value))}
                            >
                                <option value={5}>5 Giorni (Lun-Ven)</option>
                                <option value={6}>6 Giorni (Lun-Sab)</option>
                                <option value={7}>7 Giorni (Tutti)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. Reality Check Suggestions */}
                <div className="glass-panel p-5 rounded-2xl">
                    <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2"><Settings size={16}/> Ottimizzazione</h3>
                    <div className="space-y-2">
                        <button onClick={() => applySuggestion(1.1)} className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-xs text-slate-300 transition-colors flex justify-between">
                            <span>Conservativo (+10%)</span>
                            <span className="font-bold text-emerald-400">~{Math.ceil(basePlan.reality_check.avg_monthly_won * 1.1)}</span>
                        </button>
                        <button onClick={() => applySuggestion(1.3)} className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-xs text-slate-300 transition-colors flex justify-between">
                            <span>Crescita Forte (+30%)</span>
                            <span className="font-bold text-yellow-400">~{Math.ceil(basePlan.reality_check.avg_monthly_won * 1.3)}</span>
                        </button>
                        <button onClick={() => applySuggestion(1.6)} className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-xs text-slate-300 transition-colors flex justify-between">
                            <span>Aggressivo (+60%)</span>
                            <span className="font-bold text-red-400">~{Math.ceil(basePlan.reality_check.avg_monthly_won * 1.6)}</span>
                        </button>
                    </div>
                </div>

            </div>

            {/* CENTER & RIGHT: RESULTS & SIMULATION */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Results Header Card */}
                <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-24 bg-blue-600/10 rounded-full blur-[60px] pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h3 className="text-xl font-bold text-white">Piano Operativo</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-400">Cosa manca per raggiungere l'obiettivo</span>
                            </div>
                        </div>
                        <RealityBadge />
                    </div>

                    {/* Calculated Funnel Grid - USES REMAINING AS PRIMARY, TOTAL AS SECONDARY */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/10 text-center relative group shadow-lg">
                            <div className="text-[11px] uppercase text-slate-400 font-bold mb-1 tracking-wider">Tentativi Restanti</div>
                            <div className="text-3xl font-black text-blue-400 mb-2">{planData.remaining.attempts}</div>
                            
                            <div className="flex items-center justify-center gap-2 bg-blue-500/10 py-1.5 px-3 rounded-lg border border-blue-500/20">
                                <span className="text-[10px] text-blue-300 uppercase font-bold">Target Mese:</span>
                                <span className="text-sm font-bold text-white font-mono">{planData.requiredMonth.attempts}</span>
                            </div>
                        </div>

                        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/10 text-center relative group shadow-lg">
                            <div className="text-[11px] uppercase text-slate-400 font-bold mb-1 tracking-wider">Fissati Restanti</div>
                            <div className="text-3xl font-black text-indigo-400 mb-2">{planData.remaining.booked}</div>
                            
                            <div className="flex items-center justify-center gap-2 bg-indigo-500/10 py-1.5 px-3 rounded-lg border border-indigo-500/20">
                                <span className="text-[10px] text-indigo-300 uppercase font-bold">Target Mese:</span>
                                <span className="text-sm font-bold text-white font-mono">{planData.requiredMonth.booked}</span>
                            </div>
                        </div>

                        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/10 text-center relative group shadow-lg">
                            <div className="text-[11px] uppercase text-slate-400 font-bold mb-1 tracking-wider">Svolti Restanti</div>
                            <div className="text-3xl font-black text-orange-400 mb-2">{planData.remaining.done}</div>
                            
                            <div className="flex items-center justify-center gap-2 bg-orange-500/10 py-1.5 px-3 rounded-lg border border-orange-500/20">
                                <span className="text-[10px] text-orange-300 uppercase font-bold">Target Mese:</span>
                                <span className="text-sm font-bold text-white font-mono">{planData.requiredMonth.done}</span>
                            </div>
                        </div>

                        <div className="bg-emerald-900/20 p-4 rounded-xl border border-emerald-500/30 text-center relative group shadow-lg">
                            <div className="text-[11px] uppercase text-emerald-400 font-bold mb-1 tracking-wider">Vinti Restanti</div>
                            <div className="text-3xl font-black text-emerald-300 mb-2">{planData.remaining.won}</div>
                            
                            <div className="flex items-center justify-center gap-2 bg-emerald-500/10 py-1.5 px-3 rounded-lg border border-emerald-500/20">
                                <span className="text-[10px] text-emerald-400 uppercase font-bold">Target Mese:</span>
                                <span className="text-sm font-bold text-white font-mono">{planData.requiredMonth.won}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Today's Mission & Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-panel p-5 rounded-2xl relative">
                        {loadingMtd && <div className="absolute top-2 right-2"><Loader2 size={16} className="animate-spin text-blue-500"/></div>}
                        <h4 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><Calendar size={16}/> Piano Giornaliero (Da Oggi)</h4>
                        
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-slate-400">Giorni Rimanenti</span>
                            <span className="text-sm font-bold text-white">{planData.remaining_workdays}</span>
                        </div>
                        <div className="h-px bg-white/5 my-3"></div>
                        
                        {/* SHOWS DAILY PLAN with Decimals */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">📞 Tentativi (Call+Msg)</span>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-blue-400 block">{planData.dailyPlan.attempts}</span>
                                    <span className="text-[10px] text-blue-300/60 font-mono">{planData.dailyAverage.attempts.toFixed(1)} / giorno</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">📅 Fissati Oggi</span>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-indigo-400 block">{planData.dailyPlan.booked}</span>
                                    <span className="text-[10px] text-indigo-300/60 font-mono">{planData.dailyAverage.booked.toFixed(1)} / giorno</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">🤝 Svolti Oggi</span>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-orange-400 block">{planData.dailyPlan.done}</span>
                                    <span className="text-[10px] text-orange-300/60 font-mono">{planData.dailyAverage.done.toFixed(1)} / giorno</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">🏆 Vinti Oggi</span>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-emerald-400 block">{planData.dailyPlan.won}</span>
                                    <span className="text-[10px] text-emerald-300/60 font-mono">{planData.dailyAverage.won.toFixed(1)} / giorno</span>
                                </div>
                            </div>
                        </div>

                        {/* EXPLANATION BOX / TOGGLE */}
                        <div className="mt-4 pt-2 border-t border-white/5">
                            <button 
                                onClick={() => setShowDetailFormula(!showDetailFormula)}
                                className="w-full text-center text-[10px] text-slate-500 hover:text-white flex items-center justify-center gap-1 transition-colors"
                            >
                                <Calculator size={10} /> Verifica Dati & Formula
                            </button>
                            
                            {showDetailFormula && (
                                <div className="mt-2 bg-slate-900/50 p-2 rounded border border-white/5 text-[10px] font-mono animate-in fade-in">
                                    <div className="mb-2 text-slate-400 border-b border-white/5 pb-1">
                                        Formula: (Target Mese - Fatto Mese) / {planData.remaining_workdays} gg
                                    </div>
                                    <table className="w-full text-right">
                                        <thead>
                                            <tr className="text-slate-500 uppercase text-[9px]">
                                                <th className="text-left pb-1">Metrica</th>
                                                <th className="pb-1">T. Mese</th>
                                                <th className="pb-1 text-yellow-400">Fatto (MTD)</th>
                                                <th className="pb-1">Resto</th>
                                                <th className="pb-1 text-blue-400">T. Oggi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-slate-300">
                                            <tr>
                                                <td className="text-left font-bold">Tentativi</td>
                                                <td>{planData.requiredMonth.attempts}</td>
                                                <td className="text-yellow-400 font-bold">{planData.actualMTD.attempts}</td>
                                                <td>{planData.remaining.attempts}</td>
                                                <td className="text-blue-400 font-bold">{planData.dailyAverage.attempts.toFixed(1)}</td>
                                            </tr>
                                            <tr>
                                                <td className="text-left font-bold">Svolti</td>
                                                <td>{planData.requiredMonth.done}</td>
                                                <td className="text-yellow-400 font-bold">{planData.actualMTD.done}</td>
                                                <td>{planData.remaining.done}</td>
                                                <td className="text-blue-400 font-bold">{planData.dailyAverage.done.toFixed(1)}</td>
                                            </tr>
                                            <tr>
                                                <td className="text-left font-bold">Vinti</td>
                                                <td>{planData.requiredMonth.won}</td>
                                                <td className="text-yellow-400 font-bold">{planData.actualMTD.won}</td>
                                                <td>{planData.remaining.won}</td>
                                                <td className="text-blue-400 font-bold">{planData.dailyAverage.won.toFixed(1)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div className="mt-2 text-[9px] text-slate-500 italic">
                                        * Fatto MTD: Dati reali caricati dal {planData.debug.range.actualMinDate} al {planData.debug.range.actualMaxDate}.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* MINI DEBUG BOX FOR DIAGNOSIS */}
                        <div className="mt-3">
                            <details className="text-[10px] text-slate-500 cursor-pointer">
                                <summary className="flex items-center gap-2 hover:text-white justify-end">
                                    <Bug size={10}/> Admin Debug
                                </summary>
                                <div className="mt-2 bg-black/40 p-2 rounded font-mono space-y-1 text-left">
                                    <div className="text-slate-400">--- CHECK DATE RANGE ---</div>
                                    <div className="flex justify-between"><span>Query Start:</span> <span>{planData.debug.range.expectedStart}</span></div>
                                    <div className="flex justify-between"><span>Query End:</span> <span>{planData.debug.range.expectedEndExclusive}</span></div>
                                    <div className="flex justify-between">
                                        <span>Log Min:</span> 
                                        <span className={planData.debug.range.isOutOfRange ? "text-red-500 font-bold" : ""}>{planData.debug.range.actualMinDate}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Log Max:</span> 
                                        <span className={planData.debug.range.isOutOfRange ? "text-red-500 font-bold" : ""}>{planData.debug.range.actualMaxDate}</span>
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>

                    <div className="glass-panel p-5 rounded-2xl">
                        <h4 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><BarChart3 size={16}/> Dettaglio Conversioni</h4>
                        <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-5 text-slate-500 font-bold mb-1 border-b border-white/5 pb-1">
                                <span>PROD</span>
                                <span className="text-center">WIN%</span>
                                <span className="text-center">SRC</span>
                                <span className="text-center">SHOW%</span>
                                <span className="text-right">SRC</span>
                            </div>
                            
                            <ProductRow 
                                label="LA" color="yellow" 
                                rate={ratesContext.la} 
                                won={inputs.target_won_la} 
                            />
                            <ProductRow 
                                label="FV" color="emerald" 
                                rate={ratesContext.fv} 
                                won={inputs.target_won_fv} 
                            />
                            <ProductRow 
                                label="TM" color="purple" 
                                rate={ratesContext.cad} 
                                won={inputs.target_won_cad} 
                            />
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-500 italic">
                             SRC = Fonte Dati Rate. (MTD = Mese Corrente). Se MTD ha dati insufficienti, si usano rolling (60/90d) o standard.
                        </div>
                    </div>
                </div>

                {/* 3. STRATEGIC SIMULATOR */}
                <div className="glass-panel p-1 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 border border-indigo-500/30">
                    <button 
                        onClick={() => setActiveTab(activeTab === 'simulator' ? 'plan' : 'simulator')}
                        className="w-full p-4 flex justify-between items-center text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><Zap size={18}/></div>
                            <div>
                                <h4 className="font-bold text-white text-sm">Simulatore Strategico</h4>
                                <p className="text-[10px] text-slate-400">Scopri quanto risparmi migliorando le conversioni</p>
                            </div>
                        </div>
                        <div className={`transition-transform duration-300 ${activeTab === 'simulator' ? 'rotate-180' : ''}`}>
                            <ArrowRight size={16} className="text-slate-500 rotate-90"/>
                        </div>
                    </button>

                    {activeTab === 'simulator' && (
                        <div className="p-6 pt-0 animate-in slide-in-from-top-4">
                            <div className="h-px bg-white/5 mb-6"></div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-xs font-bold text-emerald-400 uppercase">Migliora Win Rate</label>
                                        <span className="text-xs font-mono text-white">+{simModifiers.winRatePct}%</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="30" step="5"
                                        value={simModifiers.winRatePct}
                                        onChange={e => setSimModifiers(prev => ({...prev, winRatePct: parseInt(e.target.value)}))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Converte più appuntamenti in contratti.</p>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-xs font-bold text-indigo-400 uppercase">Migliora Show Rate</label>
                                        <span className="text-xs font-mono text-white">+{simModifiers.showRatePct}%</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="30" step="5"
                                        value={simModifiers.showRatePct}
                                        onChange={e => setSimModifiers(prev => ({...prev, showRatePct: parseInt(e.target.value)}))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Riduce appuntamenti bucati.</p>
                                </div>
                            </div>

                            {/* Comparison Result */}
                            {(simModifiers.winRatePct > 0 || simModifiers.showRatePct > 0) ? (
                                <div className="bg-slate-950/50 p-4 rounded-xl border border-indigo-500/20 flex flex-col md:flex-row gap-6 items-center justify-between">
                                    <div className="text-center md:text-left">
                                        <div className="text-xs text-slate-400 mb-1">Tentativi Risparmiati</div>
                                        <div className="text-2xl font-bold text-emerald-400">
                                            {basePlan.required.attempts - simulatedPlan.required.attempts}
                                            <span className="text-sm font-normal text-emerald-600/70 ml-1">attempts</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-8 text-center">
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase">Prima</div>
                                            <div className="text-lg font-bold text-slate-400">{basePlan.required.attempts}</div>
                                        </div>
                                        <ArrowRight className="text-slate-600 mt-1"/>
                                        <div>
                                            <div className="text-[10px] text-indigo-400 uppercase">Dopo</div>
                                            <div className="text-lg font-bold text-white">{simulatedPlan.required.attempts}</div>
                                        </div>
                                    </div>

                                    <div className="text-xs text-indigo-300 italic max-w-[200px] text-center md:text-right">
                                        "Migliorare le skill ti permette di ottenere lo stesso risultato con {Math.round((1 - (simulatedPlan.required.attempts / basePlan.required.attempts)) * 100)}% meno fatica."
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-xs text-slate-500 py-2">Muovi gli slider per simulare il risparmio di tempo ed energie.</div>
                            )}
                        </div>
                    )}
                </div>

                {/* SAVE BUTTON */}
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20}/>}
                    {saving ? "Salvataggio..." : "Salva Piano Operativo"}
                </button>
                
                {/* DEBUG PANEL (Admin Only) */}
                {isAdmin && (
                    <div className="mt-8 border-t border-white/5 pt-4">
                        <button onClick={() => setShowDebug(!showDebug)} className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors">
                            <Bug size={14}/> Debug Panel (Admin)
                        </button>
                        {showDebug && (
                            <div className="mt-4 bg-slate-950 p-4 rounded-xl text-[10px] font-mono text-slate-400 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                                <div className="col-span-full mb-2 border-b border-white/5 pb-2">
                                    <h5 className="font-bold text-white">Global Info</h5>
                                    <div>MonthKey: {planData.debug.monthKey}</div>
                                    <div>Remaining Workdays: {planData.remaining_workdays}</div>
                                    <div>Logs Loaded MTD: {planData.debug.logsCount} {loadingMtd ? '(loading...)' : ''}</div>
                                    <div className="mt-1 flex gap-2">
                                        <span className="text-blue-400">Query Range:</span> {planData.debug.range.expectedStart} - {planData.debug.range.expectedEndExclusive}
                                    </div>
                                    <div className="mt-1 flex gap-2">
                                        <span className="text-yellow-400">Actual Log Range:</span> {planData.debug.range.actualMinDate} - {planData.debug.range.actualMaxDate}
                                    </div>
                                </div>
                                <div>
                                    <h5 className="font-bold text-emerald-400 mb-1">REQUIRED MONTH (NEEDED)</h5>
                                    <pre>{JSON.stringify(planData.requiredMonth, null, 2)}</pre>
                                </div>
                                <div>
                                    <h5 className="font-bold text-yellow-400 mb-1">ACTUAL MTD (DB)</h5>
                                    <pre>{JSON.stringify(planData.actualMTD, null, 2)}</pre>
                                </div>
                                <div>
                                    <h5 className="font-bold text-blue-400 mb-1">REMAINING</h5>
                                    <pre>{JSON.stringify(planData.remaining, null, 2)}</pre>
                                </div>
                                <div>
                                    <h5 className="font-bold text-white mb-1">DAILY PLAN (Output)</h5>
                                    <pre>{JSON.stringify(planData.dailyPlan, null, 2)}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

const ProductRow = ({ label, color, rate, won }: { label: string, color: string, rate: ProductRates, won: number }) => (
    <div className={`grid grid-cols-5 items-center p-2 rounded-lg ${won > 0 ? 'bg-slate-800/80 border border-white/5' : 'opacity-50'}`}>
        <span className={`text-${color}-400 font-bold`}>{label}</span>
        
        {/* Win Rate */}
        <div className="text-center flex flex-col items-center">
             <span className="text-white font-mono">{(rate.win_rate.value * 100).toFixed(0)}%</span>
        </div>
        <div className="text-center flex justify-center">
             <RateSourceBadge source={rate.win_rate.source} />
        </div>
        
        {/* Show Rate */}
        <div className="text-center flex flex-col items-center">
             <span className="text-white font-mono">{(rate.show_rate.value * 100).toFixed(0)}%</span>
        </div>
        <div className="text-center flex justify-center">
             <RateSourceBadge source={rate.show_rate.source} />
        </div>
    </div>
);
