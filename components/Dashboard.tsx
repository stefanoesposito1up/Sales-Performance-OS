
import React, { useState, useMemo, useEffect } from 'react';
import { DailyLog } from '../types';
import { filterLogsByPeriod, getDashboardMetrics } from '../services/analytics';
import { fetchTeamData } from '../services/coach';
import { TodayPlanCard } from './TodayPlanCard';
import { TeamInsightsWidget, ProductUnifiedCard } from './DashboardComponents';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Calendar, Phone, Activity, ArrowRight, Filter, 
  Users, Zap, Target, Briefcase, MessageSquare, BarChart2,
  ArrowDown, AlertCircle, Check, Sun
} from 'lucide-react';
import { useAuth } from '../services/auth';
import { CloseDayWizard } from './CloseDayWizard';
import { getTodayDateRome } from '../services/dateUtils';
import { usePlan } from '../services/planContext';

interface Props {
  logs: DailyLog[];
  onNavigateToEntry?: (date?: string) => void;
  onNavigateToPlanning?: () => void;
  onRefreshData?: () => void;
}

type Period = 'today' | 'week' | 'month' | 'custom';

// --- COLOR CONSTANTS ---
const COLORS = {
  LA: { hex: '#eab308', tw: 'yellow' },   // Yellow-500
  FV: { hex: '#10b981', tw: 'emerald' },  // Emerald-500
  TM: { hex: '#a855f7', tw: 'purple' },   // Purple-500
  DONE: { hex: '#1e293b', tw: 'slate' }   // Slate-800
};

export const Dashboard: React.FC<Props> = ({ logs, onNavigateToEntry, onNavigateToPlanning, onRefreshData }) => {
  const { session, profile } = useAuth();
  const { currentPlan, currentMonthKey, setMonthKey } = usePlan();
  const [period, setPeriod] = useState<Period>('today');
  const [customRange, setCustomRange] = useState<{start: string, end: string}>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  // Team Data for Admin Widget
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Ensure dashboard is looking at current month for plan context
  useEffect(() => {
     const nowKey = new Date().toISOString().slice(0, 7);
     if (currentMonthKey !== nowKey) {
         setMonthKey(nowKey);
     }
  }, []);

  // Load team data if admin
  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'coach') {
        const loadTeam = async () => {
             // Load last 7 days for team insights
             const today = new Date();
             const start = new Date(); start.setDate(today.getDate() - 7);
             try {
                const { members } = await fetchTeamData(start.toISOString().split('T')[0], today.toISOString().split('T')[0]);
                setTeamMembers(members);
             } catch(e) { console.error(e); }
        }
        loadTeam();
    }
  }, [profile]);

  // Wizard State
  const [showWizard, setShowWizard] = useState(false);

  // 1. Data for KPI Cards (Filtered by user selection)
  const filteredLogs = useMemo(() => {
    return filterLogsByPeriod(logs, period, customRange.start, customRange.end);
  }, [logs, period, customRange]);

  const metrics = useMemo(() => getDashboardMetrics(filteredLogs, logs), [filteredLogs, logs]);

  // Today Log for Plan Card
  const todayDate = getTodayDateRome(); // Using Rome date
  const todayLog = logs.find(l => l.date === todayDate);

  // 2. Data for Charts (ALWAYS CURRENT MONTH)
  const monthlyLogs = useMemo(() => {
    return filterLogsByPeriod(logs, 'month'); 
  }, [logs]);

  const monthlyChartLogs = useMemo(() => {
    return [...monthlyLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [monthlyLogs]);

  const monthlyChartData = monthlyChartLogs.map(log => {
    const done_sales = log.done_la + log.done_fv + log.done_cad;
    const won = log.won_la + log.won_fv + log.won_cad;
    const wr = done_sales > 0 ? (won / done_sales) * 100 : null; 
    
    return {
      fullDate: log.date, // Hidden field for navigation
      date: log.date.slice(5), // MM-DD
      winRate: wr,
      calls: log.calls_total,
      contacts: log.calls_answered + log.messages_sent,
      done: done_sales,
      won: won,
      // Breakout for stacked chart
      won_la: log.won_la,
      won_fv: log.won_fv,
      won_cad: log.won_cad
    };
  });

  // Updated Handler for Chart Clicks
  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
        const payload = data.activePayload[0].payload;
        if (payload && payload.fullDate && onNavigateToEntry) {
            onNavigateToEntry(payload.fullDate);
        }
    }
  };

  // UI Helpers
  const SectionTitle = ({ title, icon: Icon }: any) => (
    <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wide opacity-80 mt-10 first:mt-0">
      <Icon size={16} className="text-blue-400"/> {title}
    </h3>
  );

  const planForCard = currentPlan || {
      month: new Date().toISOString().slice(0, 7),
      workdays_per_week: 5,
      target_won_la_month: 0,
      target_won_fv_month: 0,
      target_won_cad_month: 0,
      daily_call_capacity: 0,
      target_calls_total_month: 0,
      target_booked_total_month: 0,
      target_done_total_sales_month: 0,
      target_won_total_month: 0,
      target_new_leads_month: 0,
      target_booked_la_month: 0,
      target_booked_fv_month: 0,
      target_booked_cad_month: 0,
      target_done_la_month: 0,
      target_done_fv_month: 0,
      target_done_cad_month: 0,
      win_rate_assumption_global: 0,
      show_rate_assumption_global: 0,
      calls_per_won_assumption_global: 0
  };

  const isAdminOrCoach = profile?.role === 'admin' || profile?.role === 'coach';

  // --- FUNNEL LOGIC ---
  const funnelData = useMemo(() => {
      const f = metrics.funnel;
      const vol_attempts = f.calls; // Assuming messages are roughly tracked alongside or we just use calls as base volume
      const vol_contacts = f.contacts;
      const vol_booked = f.booked;
      const vol_done = f.done;
      const vol_won = f.won;

      const r_contact = vol_attempts > 0 ? vol_contacts / vol_attempts : 0;
      const r_booking = vol_contacts > 0 ? vol_booked / vol_contacts : 0;
      const r_show = vol_booked > 0 ? vol_done / vol_booked : 0;
      const r_win = vol_done > 0 ? vol_won / vol_done : 0;

      // Identify weakest link (only if volume exists to judge)
      let minRate = 1;
      let weakest = '';
      
      if (vol_attempts > 0 && r_contact < minRate) { minRate = r_contact; weakest = 'contact'; }
      if (vol_contacts > 0 && r_booking < minRate) { minRate = r_booking; weakest = 'booking'; }
      if (vol_booked > 0 && r_show < minRate) { minRate = r_show; weakest = 'show'; }
      if (vol_done > 0 && r_win < minRate) { minRate = r_win; weakest = 'win'; }
      
      return { 
          vol_attempts, vol_contacts, vol_booked, vol_done, vol_won,
          r_contact, r_booking, r_show, r_win,
          weakest
      };
  }, [metrics]);

  const FunnelStep = ({ label, value, subLabel, color, isFirst = false, isLast = false }: any) => (
      <div className={`p-3 rounded-xl border flex justify-between items-center relative z-10 ${color}`}>
          <div>
              <div className="text-[10px] font-bold uppercase opacity-70 mb-0.5">{label}</div>
              <div className="text-xl font-bold">{value}</div>
          </div>
          {subLabel && <div className="text-xs opacity-80">{subLabel}</div>}
      </div>
  );

  const FunnelConnector = ({ rate, label, isWeak }: any) => (
      <div className="h-10 flex items-center justify-center relative -my-1 z-0">
          <div className="absolute inset-y-0 w-0.5 bg-slate-800"></div>
          <div className={`relative z-10 px-3 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${isWeak ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>
              {isWeak && <AlertCircle size={10} />}
              <span>{label}: {(rate * 100).toFixed(0)}%</span>
          </div>
      </div>
  );

  const ProductLegend = () => (
      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/5">
          <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div> LA
          </div>
          <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div> FV
          </div>
          <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div> TM
          </div>
      </div>
  );

  return (
    <div className="pb-24 max-w-7xl mx-auto space-y-8 relative">

      {/* QUICK CLOSE FLOATING BUTTON */}
      <div className="fixed bottom-24 right-4 z-30 md:static md:z-auto md:mb-6 md:flex md:justify-end">
          <button 
             onClick={() => setShowWizard(true)}
             className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/30 rounded-full p-4 md:px-6 md:py-3 md:rounded-xl flex items-center gap-2 font-bold transition-all active:scale-95"
          >
              <Zap size={20} className="fill-white"/>
              <span className="hidden md:inline">Chiudi Giornata</span>
          </button>
      </div>

      {showWizard && session?.user && (
          <CloseDayWizard 
             userId={session.user.id} 
             existingLog={todayLog} 
             onClose={() => setShowWizard(false)} 
             onSuccess={() => {
                 setShowWizard(false);
                 if(onRefreshData) onRefreshData();
             }}
          />
      )}
      
      {/* --- FILTER HEADER --- */}
      <div className="glass-panel p-2 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 sticky top-16 z-30 backdrop-blur-xl border-b border-white/5 shadow-2xl">
         <div className="flex bg-slate-900/50 rounded-lg p-1 w-full md:w-auto overflow-x-auto">
            {(['today', 'week', 'month', 'custom'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${period === p ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                {p === 'today' ? 'Oggi' : p === 'week' ? 'Settimana' : p === 'month' ? 'Mese' : 'Personalizzato'}
              </button>
            ))}
         </div>
         
         <div className="flex items-center gap-3">
             <ProductLegend />
             {period === 'custom' && (
               <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                  <input type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} className="bg-transparent text-xs text-white outline-none" />
                  <ArrowRight size={12} className="text-slate-500"/>
                  <input type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} className="bg-transparent text-xs text-white outline-none" />
               </div>
             )}
         </div>
      </div>

      {/* 1. TODAY PLAN (OPERATIONAL) */}
      <div className="mt-4">
        <TodayPlanCard 
            allLogs={logs}
            monthlyPlan={planForCard as any} 
            todayLog={todayLog}
            onGoToEntry={() => onNavigateToEntry && onNavigateToEntry()}
            onGoToPlanning={() => onNavigateToPlanning && onNavigateToPlanning()}
        />
      </div>

      {/* 2. TEAM INSIGHTS (If Admin/Coach) - MOVED UP */}
      {isAdminOrCoach && (
          <div>
              <SectionTitle title="Team Insights" icon={Users} />
              <TeamInsightsWidget members={teamMembers} />
          </div>
      )}

      {/* 3. PERFORMANCE & FUNNEL PER PRODOTTO (UNIFIED) */}
      <SectionTitle title="Performance & Funnel di Prodotto" icon={Target} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProductUnifiedCard 
             label="Luce Amica" 
             data={metrics.products.la} 
             color={COLORS.LA.tw} 
             icon={Zap}
          />
          <ProductUnifiedCard 
             label="Fotovoltaico" 
             data={metrics.products.fv} 
             color={COLORS.FV.tw} 
             icon={Sun}
          />
          <ProductUnifiedCard 
             label="Adesione Team" 
             data={metrics.products.cad} 
             color={COLORS.TM.tw} 
             icon={Users}
          />
      </div>

      {/* 4. SPA (PRODUCTION) */}
      <SectionTitle title="SPA (Produzione Appuntamenti)" icon={Phone} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-xl text-center border border-white/5">
              <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Vol. Tentativi</div>
              <div className="text-2xl font-bold text-white">{metrics.spa.total_contacts}</div>
          </div>
          <div className="glass-panel p-4 rounded-xl text-center border border-white/5">
              <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Vol. Fissati</div>
              <div className="text-2xl font-bold text-indigo-400">{metrics.spa.booked_total}</div>
          </div>
          <div className={`glass-panel p-4 rounded-xl text-center border ${metrics.spa.booking_rate < 0.1 ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'}`}>
              <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Booking Rate</div>
              <div className="text-2xl font-bold text-indigo-300">{(metrics.spa.booking_rate * 100).toFixed(1)}%</div>
          </div>
          <div className="glass-panel p-4 rounded-xl text-center border border-white/5">
              <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Calls / Fissato</div>
              <div className="text-2xl font-bold text-slate-300">{metrics.spa.calls_per_booked.toFixed(0)}</div>
          </div>
      </div>

      {/* 5. EFFICIENCY & CONVERSION ANALYSIS (FUNNEL REWORK) */}
      <SectionTitle title="Analisi Efficienza & Conversione" icon={BarChart2} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           
           {/* Chart 1: SMART VERTICAL FUNNEL */}
           <div className="glass-panel p-6 rounded-2xl flex flex-col h-full">
               <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                        <Filter size={14} className="text-blue-400"/> Funnel di Conversione
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1">Analisi perdite e colli di bottiglia.</p>
                  </div>
                  {funnelData.weakest && (
                      <div className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-bold text-red-400 flex items-center gap-1 animate-pulse-slow">
                          <AlertCircle size={12}/> Weakest: {funnelData.weakest.toUpperCase()}
                      </div>
                  )}
               </div>

               <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
                   {/* 1. ATTEMPTS */}
                   <FunnelStep 
                        label="Tentativi Totali" 
                        value={funnelData.vol_attempts} 
                        color="bg-slate-800 border-white/5 text-slate-400"
                   />
                   
                   <FunnelConnector 
                        rate={funnelData.r_contact} 
                        label="Risposta"
                        isWeak={funnelData.weakest === 'contact'}
                   />

                   {/* 2. CONTACTS */}
                   <FunnelStep 
                        label="Contatti Utili" 
                        value={funnelData.vol_contacts} 
                        color="bg-blue-900/20 border-blue-500/20 text-blue-100"
                   />

                   <FunnelConnector 
                        rate={funnelData.r_booking} 
                        label="Booking" 
                        isWeak={funnelData.weakest === 'booking'}
                   />

                   {/* 3. BOOKED */}
                   <FunnelStep 
                        label="Appuntamenti Fissati" 
                        value={funnelData.vol_booked} 
                        color="bg-indigo-900/20 border-indigo-500/20 text-indigo-100"
                   />

                   <FunnelConnector 
                        rate={funnelData.r_show} 
                        label="Show Rate" 
                        isWeak={funnelData.weakest === 'show'}
                   />

                   {/* 4. DONE */}
                   <FunnelStep 
                        label="Appuntamenti Svolti" 
                        value={funnelData.vol_done} 
                        color="bg-orange-900/20 border-orange-500/20 text-orange-100"
                   />

                   <FunnelConnector 
                        rate={funnelData.r_win} 
                        label="Closing" 
                        isWeak={funnelData.weakest === 'win'}
                   />

                   {/* 5. WON */}
                   <FunnelStep 
                        label="Contratti Vinti" 
                        value={funnelData.vol_won} 
                        color="bg-emerald-600 shadow-lg shadow-emerald-900/40 border-emerald-400/30 text-white"
                        subLabel="Obiettivo Raggiunto 🏆"
                   />
               </div>
           </div>

           {/* Chart 2: Appointment Conversion (Stacked) */}
           <div className="glass-panel p-5 rounded-2xl">
               <div className="mb-4 flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase">Mix Prodotti Vinti</h4>
                    <p className="text-[10px] text-slate-500">Composizione vendite vs Svolti totali. (Clicca per dettagli)</p>
                  </div>
                  <ProductLegend />
               </div>
               <div className="h-full min-h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart 
                        data={monthlyChartData} 
                        margin={{top: 20, right: 0, left: -20, bottom: 0}}
                        onClick={handleChartClick}
                        style={{ cursor: 'pointer' }}
                    >
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                     {/* Dual Axis Trick for Overlap */}
                     <XAxis xAxisId={0} dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} dy={10} />
                     <XAxis xAxisId={1} dataKey="date" hide />

                     <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                     <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                     
                     {/* Background: Done */}
                     <Bar xAxisId={0} dataKey="done" fill={COLORS.DONE.hex} radius={[4, 4, 4, 4]} name="Svolti" barSize={30} />
                     
                     {/* Foreground: Won Stacked (Using NEW COLORS) */}
                     {/* LA: Yellow */}
                     <Bar xAxisId={1} dataKey="won_la" stackId="won" fill={COLORS.LA.hex} name="Luce Amica" barSize={30} />
                     {/* FV: Green */}
                     <Bar xAxisId={1} dataKey="won_fv" stackId="won" fill={COLORS.FV.hex} name="Fotovoltaico" barSize={30} />
                     {/* TM/CAD: Purple */}
                     <Bar xAxisId={1} dataKey="won_cad" stackId="won" fill={COLORS.TM.hex} radius={[4, 4, 0, 0]} name="Adesione" barSize={30} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
           </div>
      </div>

      {/* 6. STRATEGIC TRENDS (30 DAYS) */}
      <SectionTitle title="Trend Strategici (30 Giorni)" icon={Activity} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="glass-panel p-5 rounded-2xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Win Rate Trend (Cliccabile)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} dy={10} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} unit="%" />
                    <Tooltip content={<CustomTooltip unit="%" />} />
                    <Legend />
                    <Line type="monotone" dataKey="winRate" stroke="#10b981" strokeWidth={3} name="Win Rate %" connectNulls dot={{r:4, fill:'#020617'}} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </div>

           <div className="glass-panel p-5 rounded-2xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Volume Attività (Cliccabile)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} dy={10} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                    <Bar dataKey="contacts" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Contatti Utili" barSize={20} />
                    <Bar dataKey="done" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Svolti" barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>
      </div>

    </div>
  );
};

const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700/50 p-2.5 rounded-lg shadow-xl backdrop-blur-md">
          <p className="text-slate-300 text-xs font-bold mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs mb-1 last:mb-0">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.fill || entry.stroke }}></div>
              <span className="text-slate-400">{entry.name}:</span>
              <span className="text-white font-mono font-medium">{Number(entry.value).toFixed(1)}{unit}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
};
