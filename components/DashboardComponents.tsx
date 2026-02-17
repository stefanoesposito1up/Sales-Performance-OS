
import React from 'react';
import { ProductKPIs, StrategicInsights, AIAnalysisResult } from '../services/analytics';
import { 
  TrendingUp, TrendingDown, Minus, AlertTriangle, 
  CheckCircle2, Zap, Target, ArrowRight, User, Users,
  Calendar, Phone, Trophy, BrainCircuit, Sparkles, Lightbulb
} from 'lucide-react';

// --- 0. AI ANALYSIS WIDGET ---
export const AIAnalysisWidget: React.FC<{ analysis: AIAnalysisResult }> = ({ analysis }) => {
    return (
        <div className="glass-panel p-1 rounded-2xl relative overflow-hidden mb-6 bg-gradient-to-br from-indigo-900/40 to-slate-900/80 border border-indigo-500/30 shadow-2xl">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 p-24 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div className="p-5 relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-lg animate-pulse-slow">
                        <BrainCircuit size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            Analisi Strategica AI <Sparkles size={14} className="text-yellow-400"/>
                        </h3>
                        <p className="text-[10px] text-indigo-200">Coach Virtuale basato sui tuoi KPI attuali.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* COL 1: DIAGNOSIS & STRENGTHS */}
                    <div className="space-y-4">
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5">
                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                                <ActivityIcon color="blue" /> Diagnosi Principale
                            </div>
                            <p className="text-sm font-bold text-white leading-relaxed">
                                {analysis.diagnosis}
                            </p>
                        </div>

                        <div className="bg-emerald-900/20 p-4 rounded-xl border border-emerald-500/20">
                            <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1 flex items-center gap-1">
                                <CheckCircle2 size={12}/> Cosa Funziona
                            </div>
                            <p className="text-xs text-emerald-100/90">
                                {analysis.whats_working}
                            </p>
                        </div>

                         <div className="bg-red-900/20 p-4 rounded-xl border border-red-500/20">
                            <div className="text-[10px] uppercase font-bold text-red-400 mb-1 flex items-center gap-1">
                                <AlertTriangle size={12}/> Area Critica
                            </div>
                            <p className="text-xs text-red-100/90">
                                {analysis.critical_area}
                            </p>
                        </div>
                    </div>

                    {/* COL 2: ACTION PLAN */}
                    <div className="flex flex-col h-full">
                        <div className="flex-1 bg-slate-900/60 p-4 rounded-xl border border-white/5 mb-4">
                            <div className="text-[10px] uppercase font-bold text-indigo-400 mb-3 flex items-center gap-1">
                                <Zap size={12}/> Piano d'Azione Operativo
                            </div>
                            <ul className="space-y-3">
                                {analysis.actions.map((action, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                        <div className="min-w-[16px] h-[16px] rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[9px] font-bold mt-0.5">
                                            {idx + 1}
                                        </div>
                                        <span>{action}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 p-3 rounded-xl border border-blue-500/30 flex items-center gap-3">
                            <Target size={18} className="text-blue-400 shrink-0"/>
                            <div>
                                <div className="text-[9px] text-blue-300 font-bold uppercase">Priorità di Oggi</div>
                                <div className="text-xs font-bold text-white">{analysis.priority}</div>
                            </div>
                        </div>

                        {/* COACH/ADMIN EXTRA */}
                        {analysis.team_reading && (
                             <div className="mt-4 pt-3 border-t border-white/5">
                                <div className="text-[9px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                                    <Users size={10}/> Lettura del Team
                                </div>
                                <p className="text-xs text-slate-400 italic">
                                    "{analysis.team_reading}"
                                </p>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ActivityIcon = ({color}: {color: string}) => (
    <div className={`w-1.5 h-1.5 rounded-full bg-${color}-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]`}></div>
);

// --- 1. STRATEGIC ALERTS WIDGET ---
export const StrategicAlerts: React.FC<{ insights: StrategicInsights }> = ({ insights }) => {
  const getStatusColor = (val: string) => {
    if (val === 'Crescita' || val === 'Alta') return 'text-emerald-400';
    if (val === 'Calo' || val === 'Bassa') return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* A) AUTO ALERTS */}
      <div className="lg:col-span-2 glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-center">
         <div className="absolute top-0 right-0 p-16 bg-blue-600/10 rounded-full blur-[50px] pointer-events-none"></div>
         
         <div className="flex items-start gap-4 relative z-10">
             <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl animate-pulse-slow">
                 <Zap size={24} className="fill-blue-500/20"/>
             </div>
             <div className="flex-1">
                 <h3 className="text-white font-bold text-lg mb-1">Analisi Strategica</h3>
                 <div className="flex flex-wrap gap-2 text-xs mb-3">
                     <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">
                        Collo di bottiglia: <b className="text-white">{insights.bottleneck}</b>
                     </span>
                     {insights.best_product !== 'N/A' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            🔥 Best: {insights.best_product}
                        </span>
                     )}
                     {insights.worst_product !== 'N/A' && (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                            ⚠️ Weak: {insights.worst_product}
                        </span>
                     )}
                 </div>
                 
                 <div className="space-y-1">
                     {insights.alerts.map((alert, idx) => (
                         <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                             {alert.type === 'danger' && <TrendingDown size={14} className="text-red-400"/>}
                             {alert.type === 'success' && <TrendingUp size={14} className="text-emerald-400"/>}
                             {alert.type === 'warning' && <AlertTriangle size={14} className="text-yellow-400"/>}
                             <span>{alert.message}</span>
                             <span className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-slate-800 border border-white/5 ${
                                 alert.type === 'danger' ? 'text-red-400' : alert.type === 'success' ? 'text-emerald-400' : 'text-yellow-400'
                             }`}>
                                 {alert.metric}
                             </span>
                         </div>
                     ))}
                 </div>
             </div>
         </div>
      </div>

      {/* B) GENERAL STATUS */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-center space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span className="text-xs text-slate-500 uppercase font-bold">Trend Generale</span>
              <span className={`text-sm font-bold ${getStatusColor(insights.general_status.performance)}`}>
                  {insights.general_status.performance}
              </span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span className="text-xs text-slate-500 uppercase font-bold">Intensità</span>
              <span className={`text-sm font-bold ${getStatusColor(insights.general_status.intensity)}`}>
                  {insights.general_status.intensity}
              </span>
          </div>
          <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 uppercase font-bold">Efficacia</span>
              <span className={`text-sm font-bold ${getStatusColor(insights.general_status.effectiveness)}`}>
                  {insights.general_status.effectiveness}
              </span>
          </div>
      </div>
    </div>
  );
};

// --- 2. PRODUCT UNIFIED CARD (New Merged Component) ---
export const ProductUnifiedCard: React.FC<{ 
    label: string, 
    data: ProductKPIs, 
    color: string, 
    icon: any 
}> = ({ label, data, color, icon: Icon }) => {
    
    // Alert Logic
    const isWeak = data.win_rate < 0.20 && data.done > 2;
    const borderClass = isWeak ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-white/5';
    const formatPct = (v: number) => `${(v * 100).toFixed(0)}%`;

    // Funnel Visual Logic
    // Max value is Booked since we don't estimate attempts
    const maxVal = Math.max(data.booked, 1); 
    
    const BarRow = ({ label, val, colorClass, showLine }: any) => {
        const pct = (val / maxVal) * 100;
        return (
            <div className="flex items-center gap-2 mb-2 relative">
                {showLine && <div className="absolute left-[3.5rem] top-[-10px] bottom-[50%] w-px border-l border-dashed border-white/10 -z-10"></div>}
                <div className="w-14 text-[10px] text-slate-400 font-bold uppercase text-right shrink-0">{label}</div>
                <div className="flex-1 h-7 bg-slate-900/50 rounded-lg overflow-hidden relative border border-white/5">
                    <div className={`absolute inset-y-0 left-0 ${colorClass} opacity-20`} style={{width: `${pct}%`}}></div>
                    <div className={`absolute inset-y-0 left-0 w-0.5 ${colorClass}`}></div>
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                        <span className="text-xs font-bold text-white">{val}</span>
                        {val > 0 && maxVal > 0 && label !== 'Fissati' && (
                             <span className="text-[9px] text-slate-400 bg-black/30 px-1 rounded">
                                 {Math.round((val/data.booked)*100)}%
                             </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`glass-panel p-5 rounded-2xl border ${borderClass} relative group hover:bg-slate-800/50 transition-colors flex flex-col h-full`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-400`}>
                        <Icon size={18}/>
                    </div>
                    <h3 className={`font-bold text-${color}-100`}>{label}</h3>
                </div>
                {isWeak && <div className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">WEAK</div>}
            </div>

            {/* TOP SECTION: KPIS & RATES */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Metrics */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <span className="text-[10px] text-slate-500 uppercase">Show Rate</span>
                        <span className={`text-xs font-mono font-bold ${data.show_rate < 0.6 ? 'text-red-400' : 'text-white'}`}>
                            {formatPct(data.show_rate)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <span className="text-[10px] text-slate-500 uppercase">Win Rate</span>
                        <span className={`text-xs font-mono font-bold ${data.win_rate < 0.2 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatPct(data.win_rate)}
                        </span>
                    </div>
                </div>
                
                {/* Big Number (Won) */}
                <div className={`bg-${color}-900/10 rounded-xl border border-${color}-500/20 flex flex-col items-center justify-center p-2`}>
                    <span className="text-3xl font-bold text-white">{data.won}</span>
                    <span className={`text-[10px] text-${color}-400 uppercase font-bold`}>Vinti</span>
                </div>
            </div>

            {/* BOTTOM SECTION: FUNNEL VISUAL */}
            <div className="mt-auto">
                <h4 className="text-[10px] text-slate-500 font-bold uppercase mb-3 flex items-center gap-2">
                    <div className="h-px bg-white/10 flex-1"></div> Funnel <div className="h-px bg-white/10 flex-1"></div>
                </h4>
                <div>
                    <BarRow label="Fissati" val={data.booked} colorClass={`bg-${color}-500`} />
                    <BarRow label="Svolti" val={data.done} colorClass="bg-orange-500" showLine />
                    <BarRow label="Vinti" val={data.won} colorClass="bg-emerald-500" showLine />
                </div>
            </div>
        </div>
    );
};

// --- 4. TEAM INSIGHTS WIDGET (Admin) ---
export const TeamInsightsWidget: React.FC<{ members: any[] }> = ({ members }) => {
    
    // Sort logic
    const topPerformers = [...members].sort((a,b) => b.aggregates.won_total - a.aggregates.won_total).slice(0, 5);
    const needHelp = [...members]
        .filter(m => m.help_score > 10)
        .sort((a,b) => b.help_score - a.help_score)
        .slice(0, 5);

    const Row = ({ member, type }: any) => (
        <div className="flex justify-between items-center p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer group">
            <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${type === 'top' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {member.profile.full_name.charAt(0)}
                </div>
                <span className="text-xs text-slate-300 font-medium group-hover:text-white truncate max-w-[100px]">{member.profile.full_name}</span>
            </div>
            <div className="text-right">
                {type === 'top' ? (
                    <span className="text-xs font-bold text-emerald-400">{member.aggregates.won_total} Wins</span>
                ) : (
                    <span className="text-[10px] font-bold text-red-300 bg-red-900/20 px-1.5 py-0.5 rounded">{member.help_reason}</span>
                )}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-5 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Trophy size={16} className="text-emerald-400"/> Top Performers
                </h3>
                <div className="space-y-1">
                    {topPerformers.map(m => <Row key={m.profile.user_id} member={m} type="top"/>)}
                    {topPerformers.length === 0 && <div className="text-xs text-slate-500 text-center py-4">Nessun dato</div>}
                </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-red-500/10">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-400"/> Focus & Supporto
                </h3>
                <div className="space-y-1">
                    {needHelp.map(m => <Row key={m.profile.user_id} member={m} type="help"/>)}
                    {needHelp.length === 0 && <div className="text-xs text-slate-500 text-center py-4">Tutto il team è allineato! 🚀</div>}
                </div>
            </div>
        </div>
    );
};
