
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../services/auth';
import { fetchTeamData } from '../services/coach';
import { fetchDailyLogs } from '../services/cloud';
import { TeamMemberStatus, TeamAggregates, DailyLog } from '../types';
import { Dashboard } from './Dashboard';
import { generateAIAnalysis, getDashboardMetrics } from '../services/analytics';
import { AIAnalysisWidget } from './DashboardComponents';
import { 
  Users, TrendingUp, AlertTriangle, Calendar, Search, 
  ChevronRight, Phone, Trophy, CheckCircle2, User,
  ArrowLeft, BarChart2, Siren, BrainCircuit
} from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, ZAxis } from 'recharts';

type Period = 'today' | '7d' | 'month';

export const CoachConsole: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');
  
  // Data State
  const [teamData, setTeamData] = useState<TeamAggregates | null>(null);
  const [members, setMembers] = useState<TeamMemberStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Drill Down State
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMemberLogs, setSelectedMemberLogs] = useState<DailyLog[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // --- 1. LOAD DATA ON MOUNT / PERIOD CHANGE ---
  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
      setLoading(true);
      try {
          // Calculate Dates
          const today = new Date();
          const endDate = today.toISOString().split('T')[0];
          let startDate = endDate;

          if (period === '7d') {
              const d = new Date();
              d.setDate(d.getDate() - 6);
              startDate = d.toISOString().split('T')[0];
          } else if (period === 'month') {
              const d = new Date();
              d.setDate(1);
              startDate = d.toISOString().split('T')[0];
          }

          const { members, teamTotals } = await fetchTeamData(startDate, endDate);
          setMembers(members);
          setTeamData(teamTotals);

      } catch (e) {
          console.error(e);
      }
      setLoading(false);
  };

  // --- 2. LOAD DETAIL ON SELECT ---
  const handleSelectMember = async (memberId: string) => {
      setSelectedMemberId(memberId);
      setLoadingDetail(true);
      try {
          // Fetch ALL logs for the member to populate the dashboard charts properly
          const logs = await fetchDailyLogs(memberId);
          setSelectedMemberLogs(logs);
      } catch (e) {
          console.error(e);
      }
      setLoadingDetail(false);
  };

  const selectedMemberProfile = useMemo(() => {
      return members.find(m => m.profile.user_id === selectedMemberId)?.profile;
  }, [selectedMemberId, members]);

  // --- FILTERED MEMBERS ---
  const filteredMembers = members.filter(m => 
      m.profile.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- TOP 5 LOGIC ---
  const top5 = useMemo(() => {
      return [...members]
        .sort((a, b) => b.help_score - a.help_score)
        .slice(0, 5)
        .filter(m => m.help_score > 0); // Only show if they actually need help
  }, [members]);

  // --- TEAM ANALYSIS LOGIC (SCATTER & AI) ---
  const teamAnalysisData = useMemo(() => {
      if (!members.length) return null;

      // 1. Prepare Scatter Data
      const dataPoints = members.map(m => ({
          name: m.profile.full_name,
          calls: m.aggregates.calls_total,
          won: m.aggregates.won_total,
          winRate: (m.aggregates.win_rate * 100).toFixed(1),
      })).filter(d => d.calls > 0 || d.won > 0);

      const totalCalls = dataPoints.reduce((sum, d) => sum + d.calls, 0);
      const totalWon = dataPoints.reduce((sum, d) => sum + d.won, 0);
      const avgCalls = dataPoints.length > 0 ? totalCalls / dataPoints.length : 0;
      const avgWon = dataPoints.length > 0 ? totalWon / dataPoints.length : 0;

      // 2. Prepare AI Analysis Input (Mocking a "Team Log" aggregate)
      const activeMembers = members.filter(m => m.aggregates.calls_total > 0);
      // Rough approximation of team metrics for AI
      const teamMetrics = {
         spa: {
             total_contacts: totalCalls, // approx
             booking_rate: teamData ? teamData.booked_total / (teamData.calls_total || 1) : 0,
         },
         closing: {
             win_rate: teamData ? teamData.won_total / (teamData.done_total || 1) : 0,
             show_rate: teamData ? teamData.done_total / (teamData.booked_total || 1) : 0,
         },
         products: {
             la: { win_rate: 0, show_rate: 0, done: 0, booked: 0, won: 0 }, // Simplified for brevity in this view
             fv: { win_rate: 0, show_rate: 0, done: 0, booked: 0, won: 0 },
             cad: { win_rate: 0, show_rate: 0, done: 0, booked: 0, won: 0 },
         },
         insights: {
             alerts: [],
             bottleneck: 'analysis'
         }
      };
      
      const aiResult = generateAIAnalysis(teamMetrics as any, 'coach', members.length);

      return {
          dataPoints,
          avgCalls,
          avgWon,
          aiResult
      };

  }, [members, teamData]);


  // --- RENDER DRILL DOWN ---
  if (selectedMemberId && selectedMemberProfile) {
      return (
          <div className="animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-4 mb-6 sticky top-20 z-30 bg-slate-950/80 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-2xl">
                  <button 
                    onClick={() => setSelectedMemberId(null)}
                    className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                  >
                      <ArrowLeft size={20}/>
                  </button>
                  <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <User size={20} className="text-blue-400"/>
                          {selectedMemberProfile.full_name}
                      </h2>
                      <div className="flex gap-3 text-xs text-slate-400">
                          <span className="uppercase">{selectedMemberProfile.role}</span>
                          <span>•</span>
                          <span>{selectedMemberProfile.email}</span>
                      </div>
                  </div>
              </div>

              {loadingDetail ? (
                  <div className="text-center py-20 text-blue-500 animate-pulse">Caricamento dati membro...</div>
              ) : (
                  <div className="pointer-events-none opacity-90 select-none grayscale-[0.2]">
                      {/* Read Only Dashboard Wrapper */}
                      <Dashboard logs={selectedMemberLogs} />
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-8 animate-in fade-in">
        
        {/* HEADER & FILTERS */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
             <div>
                 <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                     <Users className="text-blue-500"/> Coach Console
                 </h2>
                 <p className="text-sm text-slate-400 mt-1">Monitora il team e intervieni dove serve.</p>
             </div>

             <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-white/5">
                 {(['today', '7d', 'month'] as Period[]).map(p => (
                     <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${period === p ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                     >
                         {p === 'today' ? 'Oggi' : p === '7d' ? '7 Giorni' : 'Mese'}
                     </button>
                 ))}
             </div>
        </div>

        {/* 1. AI TEAM ANALYSIS */}
        {teamAnalysisData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AIAnalysisWidget analysis={{
                    ...teamAnalysisData.aiResult,
                    // Override specifics for team context
                    diagnosis: `Analisi aggregata su ${members.length} membri. Il Win Rate medio è del ${(teamAnalysisData.aiResult.diagnosis ? teamAnalysisData.avgWon : 0).toFixed(1)}%.`,
                    priority: "Uniformare il metodo di lavoro sui prodotti core.",
                    actions: [
                        "Fissa call di allineamento con i 3 low-performer.",
                        "Condividi la chiamata migliore della settimana nel gruppo.",
                        "Verifica che tutti abbiano impostato il piano mensile."
                    ]
                }} />

                {/* 2. SCATTER PLOT (CALLS vs WON) */}
                <div className="glass-panel p-5 rounded-2xl flex flex-col h-full min-h-[350px]">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center justify-between">
                         <span>Matrice Performance (Calls vs Won)</span>
                         <span className="text-[10px] text-slate-500">Quadranti basati su media team</span>
                    </h3>
                    <div className="flex-1 w-full relative">
                         <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                                <XAxis type="number" dataKey="calls" name="Calls" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{stroke: '#475569'}} />
                                <YAxis type="number" dataKey="won" name="Won" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{stroke: '#475569'}} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomScatterTooltip />} />
                                
                                {/* Team Averages Reference Lines */}
                                <ReferenceLine x={teamAnalysisData.avgCalls} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'Avg Vol', position: 'insideTopRight', fill: '#64748b', fontSize: 10 }} />
                                <ReferenceLine y={teamAnalysisData.avgWon} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'Avg Won', position: 'insideRight', fill: '#64748b', fontSize: 10 }} />

                                <Scatter name="Members" data={teamAnalysisData.dataPoints} fill="#8884d8">
                                    {teamAnalysisData.dataPoints.map((entry, index) => {
                                        // Color logic: Green (High Vol/High Won), Yellow (High Vol/Low Won), Blue (Low Vol/High Won), Red (Low/Low)
                                        let color = '#f87171'; // Red
                                        if (entry.calls >= teamAnalysisData.avgCalls && entry.won >= teamAnalysisData.avgWon) color = '#34d399'; // Emerald
                                        else if (entry.calls >= teamAnalysisData.avgCalls && entry.won < teamAnalysisData.avgWon) color = '#fbbf24'; // Yellow
                                        else if (entry.calls < teamAnalysisData.avgCalls && entry.won >= teamAnalysisData.avgWon) color = '#60a5fa'; // Blue
                                        
                                        return <Cell key={`cell-${index}`} fill={color} />;
                                    })}
                                </Scatter>
                            </ScatterChart>
                         </ResponsiveContainer>
                    </div>
                </div>
            </div>
        )}

        {/* TEAM KPI AGGREGATES */}
        {teamData && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <KpiSmall title="Chiamate Totali" value={teamData.calls_total} icon={Phone} color="blue" />
                <KpiSmall title="Fissati Totali" value={teamData.booked_total} icon={Calendar} color="indigo" />
                <KpiSmall title="Vinti Totali" value={teamData.won_total} icon={Trophy} color="emerald" />
                
                {/* COMPLIANCE CARD */}
                <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                    <span className="text-[10px] uppercase font-bold text-slate-500 z-10">Compliance (Oggi)</span>
                    <div className="flex items-end gap-2 z-10">
                        <span className="text-2xl font-bold text-white">
                            {Math.round((teamData.logged_today_count / (teamData.total_members_count || 1)) * 100)}%
                        </span>
                        <span className="text-xs text-slate-400 mb-1">
                            ({teamData.logged_today_count}/{teamData.total_members_count})
                        </span>
                    </div>
                    {/* Progress Bar Background */}
                    <div className="absolute bottom-0 left-0 h-1.5 bg-blue-500/50" style={{ width: `${(teamData.logged_today_count / (teamData.total_members_count || 1)) * 100}%` }}></div>
                </div>

                <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Membri Attivi</span>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-white">{teamData.active_members_count}</span>
                        <span className="text-xs text-slate-400 mb-1">/ {teamData.total_members_count}</span>
                    </div>
                </div>
            </div>
        )}

        {/* TOP 5 TO HELP */}
        <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                <Siren className="text-red-500 animate-pulse" size={16}/> Top 5 Da Aiutare Oggi
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {top5.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-slate-500 glass-panel rounded-2xl border-dashed border-2 border-slate-700">
                        Nessun caso critico rilevato oggi. Ottimo lavoro! 🚀
                    </div>
                ) : (
                    top5.map(m => (
                        <div key={m.profile.user_id} className="glass-panel p-4 rounded-2xl border-l-4 border-red-500 hover:bg-white/5 transition-colors group relative">
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-bold text-white text-sm truncate pr-2">{m.profile.full_name}</div>
                                <TrafficLight status={m.traffic_light} size="sm"/>
                            </div>
                            
                            <div className="text-xs font-bold text-red-300 mb-3 bg-red-500/10 p-2 rounded-lg inline-block">
                                {m.help_reason}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 mb-4">
                                <div>Calls: <span className="text-white">{m.aggregates.calls_total}</span></div>
                                <div>Booked: <span className="text-white">{m.aggregates.booked_total}</span></div>
                            </div>

                            <button 
                                onClick={() => handleSelectMember(m.profile.user_id)}
                                className="w-full py-2 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all"
                            >
                                Vedi Dettaglio
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* MEMBER LIST TABLE */}
        <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-slate-400"/> Lista Membri
                </h3>
                <div className="relative">
                    <Search className="absolute left-2 top-2 text-slate-500" size={14}/>
                    <input 
                        type="text" 
                        placeholder="Cerca membro..." 
                        className="pl-7 pr-3 py-1.5 bg-slate-900/50 rounded-lg text-xs text-white outline-none border border-white/10 focus:border-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-900/50 text-xs text-slate-400 uppercase">
                        <tr>
                            <th className="px-4 py-3">Membro</th>
                            <th className="px-4 py-3 text-center">Stato</th>
                            <th className="px-4 py-3 text-right">Chiamate</th>
                            <th className="px-4 py-3 text-right">Fissati</th>
                            <th className="px-4 py-3 text-right">Vinti</th>
                            <th className="px-4 py-3 text-center">Compliance</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredMembers.map(m => (
                            <tr key={m.profile.user_id} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 font-medium text-white">
                                    {m.profile.full_name}
                                    <div className="text-[10px] text-slate-500 uppercase">{m.profile.role}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex justify-center"><TrafficLight status={m.traffic_light}/></div>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-slate-300">{m.aggregates.calls_total}</td>
                                <td className="px-4 py-3 text-right font-mono text-indigo-300">{m.aggregates.booked_total}</td>
                                <td className="px-4 py-3 text-right font-mono text-emerald-300">{m.aggregates.won_total}</td>
                                <td className="px-4 py-3 text-center text-xs text-slate-500">
                                    {m.has_logged_today ? (
                                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-full flex items-center justify-center gap-1 w-fit mx-auto">
                                            <CheckCircle2 size={10} /> Compilato
                                        </span>
                                    ) : (
                                        <span className="text-slate-500">
                                            {m.last_log_date ? m.last_log_date.slice(5) : '-'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button 
                                        onClick={() => handleSelectMember(m.profile.user_id)}
                                        className="p-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-blue-600 rounded-lg transition-all"
                                    >
                                        <ChevronRight size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

// --- SUB COMPONENTS ---

const KpiSmall = ({ title, value, icon: Icon, color }: any) => (
    <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
        <div className={`absolute top-0 right-0 p-8 bg-${color}-500/10 rounded-full blur-xl -mr-4 -mt-4`}></div>
        <div className="flex items-center gap-2 mb-2 relative z-10">
            <Icon size={16} className={`text-${color}-400`}/>
            <span className="text-[10px] uppercase font-bold text-slate-500">{title}</span>
        </div>
        <div className="text-2xl font-bold text-white relative z-10">{value}</div>
    </div>
);

const TrafficLight = ({ status, size = 'md' }: { status: 'red' | 'yellow' | 'green', size?: 'sm' | 'md' }) => {
    const colors = {
        red: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
        yellow: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]',
        green: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
    };
    
    const dim = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

    return <div className={`${dim} rounded-full ${colors[status]}`}></div>;
};

const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700/50 p-2 rounded-xl shadow-xl backdrop-blur-md text-xs">
            <p className="font-bold text-white mb-1">{data.name}</p>
            <div className="text-slate-400">Calls: <span className="text-white">{data.calls}</span></div>
            <div className="text-slate-400">Won: <span className="text-emerald-400 font-bold">{data.won}</span></div>
            <div className="text-slate-400">WR: <span className="text-indigo-400">{data.winRate}%</span></div>
        </div>
      );
    }
    return null;
};
