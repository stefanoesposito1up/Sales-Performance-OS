
import React, { useState } from 'react';
import { DailyLog, MonthlyPlan, INITIAL_LOG } from '../types';
import { calculateDailyPlan } from '../services/planning';
import { 
  Target, ChevronDown, ChevronUp, AlertTriangle, 
  Calendar, CheckCircle2, TrendingUp, ArrowRight,
  Phone, MessageSquare, Briefcase, Trophy, Users, Info, Loader2, Gauge,
  Clock, Flame, Rabbit, Turtle
} from 'lucide-react';

interface Props {
  allLogs: DailyLog[];
  monthlyPlan: MonthlyPlan;
  todayLog?: DailyLog;
  onGoToEntry: () => void;
  onGoToPlanning: () => void;
}

export const TodayPlanCard: React.FC<Props> = ({ allLogs, monthlyPlan, todayLog = INITIAL_LOG, onGoToEntry, onGoToPlanning }) => {
  const [showInfo, setShowInfo] = useState(false);
  
  // Calculate Plan
  const dailyTarget = calculateDailyPlan(allLogs, monthlyPlan);
  
  // Actuals for Today
  const actual = {
    calls: todayLog.calls_total || 0,
    messages: todayLog.messages_sent || 0,
    attempts: (todayLog.calls_total || 0) + (todayLog.messages_sent || 0),
    booked: (todayLog.booked_la || 0) + (todayLog.booked_fv || 0) + (todayLog.booked_cad || 0),
    done: (todayLog.done_la || 0) + (todayLog.done_fv || 0) + (todayLog.done_cad || 0), // Sales only
    won: (todayLog.won_la || 0) + (todayLog.won_fv || 0) + (todayLog.won_cad || 0),
    leads: todayLog.new_leads || 0,
  };

  const getPercentage = (curr: number, target: number) => {
    if (target <= 0) return curr > 0 ? 100 : 0;
    return Math.min(100, (curr / target) * 100);
  };

  // --- PACE & PROJECTION LOGIC ---
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  
  // Define Workday (9:00 - 19:00)
  const startHour = 9;
  const endHour = 19;
  const totalWorkHours = endHour - startHour;
  
  // Calculate hours passed
  let hoursPassed = Math.max(0, hour - startHour) + (minutes / 60);
  if (hour < startHour) hoursPassed = 0;
  if (hour >= endHour) hoursPassed = totalWorkHours;
  
  // Progress % of the day (avoid division by zero with min 0.1)
  const dayProgressPct = Math.max(0.05, Math.min(1, hoursPassed / totalWorkHours));

  // Projection: If I keep this speed, where do I land?
  // Formula: (Current Won / DayProgress)
  const projectedWon = Math.floor(actual.won / dayProgressPct);
  
  // Determine Status
  let paceStatus: 'Target Raggiunto' | 'In Anticipo' | 'In Linea' | 'In Ritardo' | 'Giornata non iniziata' = 'In Linea';
  let paceColor = 'text-blue-400';
  let paceIcon = TrendingUp;
  let projectionMsg = "";

  if (actual.won >= dailyTarget.daily_won && dailyTarget.daily_won > 0) {
      paceStatus = 'Target Raggiunto';
      paceColor = 'text-emerald-400';
      paceIcon = CheckCircle2;
      projectionMsg = "Giornata completata! Tutto quello che fai ora è guadagno puro.";
  } else if (hoursPassed < 0.5) {
      paceStatus = 'Giornata non iniziata';
      paceColor = 'text-slate-400';
      paceIcon = Clock;
      projectionMsg = "La giornata è appena iniziata. Dai il massimo!";
  } else if (projectedWon > dailyTarget.daily_won) {
      paceStatus = 'In Anticipo';
      paceColor = 'text-emerald-400';
      paceIcon = Rabbit;
      projectionMsg = `Ottimo ritmo! A questa velocità chiuderai ${projectedWon} contratti (Target: ${dailyTarget.daily_won}).`;
  } else if (projectedWon === dailyTarget.daily_won && actual.won > 0) {
      paceStatus = 'In Linea';
      paceColor = 'text-blue-400';
      paceIcon = TrendingUp;
      projectionMsg = "Sei in linea per colpire il target esatto. Non rallentare.";
  } else {
      // Behind
      paceStatus = 'In Ritardo';
      paceColor = 'text-red-400';
      paceIcon = Turtle;
      const missing = dailyTarget.daily_won - actual.won;
      // If projection is 0 but we need 1, be encouraging
      if (projectedWon === 0 && dailyTarget.daily_won > 0) {
           projectionMsg = `Ritmo lento. Ti servono ancora ${missing} contratti per salvare la giornata.`;
      } else {
           projectionMsg = `Attenzione: proietti ${projectedWon} contratti. Se non acceleri perderai ${dailyTarget.daily_won - projectedWon} target.`;
      }
  }


  const ProgressRow = ({ label, icon: Icon, current, target, color }: any) => {
      const pct = getPercentage(current, target);
      const remaining = Math.max(0, target - current);
      const isMet = current >= target && target > 0;

      return (
          <div className="mb-4 last:mb-0">
              <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-md bg-${color}-500/10 text-${color}-400`}>
                          <Icon size={14} />
                      </div>
                      <span className="text-xs font-bold text-slate-300">{label}</span>
                  </div>
                  <div className="text-xs font-mono flex items-center gap-1">
                      <span className={`font-bold ${isMet ? 'text-emerald-400' : 'text-white'}`}>{current}</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-slate-400">{target > 0 ? target : '-'}</span>
                      
                      {isMet ? (
                          <span className="ml-2 text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              <CheckCircle2 size={10}/> Centrato
                          </span>
                      ) : remaining > 0 ? (
                          <span className="ml-2 text-[10px] text-slate-500 font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                              -{remaining}
                          </span>
                      ) : null}
                  </div>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                      className={`h-full bg-${color}-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(0,0,0,0.3)]`} 
                      style={{ width: `${pct}%`, boxShadow: `0 0 6px var(--tw-shadow-color)` }}
                  ></div>
              </div>
          </div>
      );
  };

  // If no monthly targets set
  if (!dailyTarget.is_target_set) {
      return (
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center animate-in fade-in">
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Target className="text-slate-400" size={24}/>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Imposta i tuoi obiettivi</h3>
              <p className="text-sm text-slate-400 mb-6 max-w-xs">
                  Per generare il tuo piano giornaliero automatico, definisci prima i target del mese.
              </p>
              <button 
                onClick={onGoToPlanning}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg"
              >
                Vai alla Pianificazione
              </button>
          </div>
      );
  }

  return (
    <div className="glass-panel p-1 rounded-3xl animate-in fade-in slide-in-from-top-4 border border-blue-500/20 shadow-2xl relative overflow-hidden group">
       <div className="absolute top-0 right-0 p-32 bg-blue-600/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-blue-600/10 transition-colors"></div>
       
       <div className="p-5 relative z-10">
          {/* HEADER */}
          <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                      <Gauge className="text-white" size={20}/>
                  </div>
                  <div>
                      <h2 className="text-lg font-bold text-white leading-tight">Piano di Oggi</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status:</span>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 border border-white/5 flex items-center gap-1 ${paceColor}`}>
                              {paceStatus === 'In Anticipo' && <Flame size={10} className="fill-current"/>}
                              {paceStatus}
                          </span>
                      </div>
                  </div>
              </div>
              
              <button 
                 onClick={onGoToEntry}
                 className="bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border border-white/5"
              >
                 Inserisci Dati <ArrowRight size={14}/>
              </button>
          </div>

          {/* PACE INDICATOR BOX */}
          <div className={`mb-6 p-3 rounded-xl border border-white/5 flex items-start gap-3 bg-slate-900/40`}>
              <div className={`mt-0.5 ${paceColor}`}>
                  {React.createElement(paceIcon, { size: 18 })}
              </div>
              <div className="flex-1">
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {paceStatus === 'In Ritardo' ? (
                          <span>
                             {projectionMsg}
                          </span>
                      ) : (
                          <span>{projectionMsg}</span>
                      )}
                  </p>
                  {/* Visual Progress bar for day time */}
                  <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-600" style={{ width: `${dayProgressPct * 100}%` }}></div>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono">{(dayProgressPct * 100).toFixed(0)}% Giornata</span>
                  </div>
              </div>
          </div>

          {/* MAIN METRICS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
             <div className="space-y-4">
                 <ProgressRow 
                    label="Tentativi (Call+Msg)" 
                    icon={Phone} 
                    current={actual.attempts} 
                    target={dailyTarget.daily_attempts} 
                    color="blue" 
                 />
                 <ProgressRow 
                    label="Nuovi Lead" 
                    icon={Users} 
                    current={actual.leads} 
                    target={dailyTarget.daily_leads} 
                    color="purple" 
                 />
             </div>
             <div className="space-y-4">
                 <ProgressRow 
                    label="Appt. Fissati" 
                    icon={Calendar} 
                    current={actual.booked} 
                    target={dailyTarget.daily_booked} 
                    color="indigo" 
                 />
                 <ProgressRow 
                    label="Appt. Svolti" 
                    icon={Briefcase} 
                    current={actual.done} 
                    target={dailyTarget.daily_done} 
                    color="orange" 
                 />
                 <ProgressRow 
                    label="Appt. Vinti" 
                    icon={Trophy} 
                    current={actual.won} 
                    target={dailyTarget.daily_won} 
                    color="emerald" 
                 />
             </div>
          </div>
       </div>
    </div>
  );
};
