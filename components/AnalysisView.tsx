
import React, { useState, useMemo, useEffect } from 'react';
import { DailyLog, TeamMemberStatus } from '../types';
import { filterLogsByPeriod, getDashboardMetrics, generateAIAnalysis } from '../services/analytics';
import { fetchTeamData } from '../services/coach';
import { useAuth } from '../services/auth';
import { StrategicAlerts, AIAnalysisWidget } from './DashboardComponents';
import { BrainCircuit, Filter, ArrowRight, Users, Target, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ZAxis, Cell } from 'recharts';

interface Props {
  logs: DailyLog[];
}

type Period = 'today' | 'week' | 'month' | 'custom';

export const AnalysisView: React.FC<Props> = ({ logs }) => {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<Period>('today');
  const [customRange, setCustomRange] = useState<{start: string, end: string}>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  // Team Data for Coach Context
  const [teamMembers, setTeamMembers] = useState<TeamMemberStatus[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  const isAdminOrCoach = profile?.role === 'admin' || profile?.role === 'coach';

  useEffect(() => {
    if (isAdminOrCoach) {
        const loadTeam = async () => {
             setTeamLoading(true);
             const today = new Date();
             const start = new Date(); 
             
             // Dynamic range based on period selection for the team view
             if (period === 'month') start.setDate(1); 
             else if (period === 'week') start.setDate(today.getDate() - 7);
             else start.setDate(today.getDate()); // today

             try {
                const { members } = await fetchTeamData(
                    start.toISOString().split('T')[0], 
                    today.toISOString().split('T')[0]
                );
                setTeamMembers(members);
             } catch(e) { console.error(e); }
             setTeamLoading(false);
        }
        loadTeam();
    }
  }, [profile, period, isAdminOrCoach]);

  // Calculate Personal Metrics
  const filteredLogs = useMemo(() => {
    return filterLogsByPeriod(logs, period, customRange.start, customRange.end);
  }, [logs, period, customRange]);

  const metrics = useMemo(() => getDashboardMetrics(filteredLogs, logs), [filteredLogs, logs]);

  const aiAnalysis = useMemo(() => {
     return generateAIAnalysis(metrics, profile?.role || 'member', teamMembers.length);
  }, [metrics, profile, teamMembers.length]);

  // --- TEAM CLUSTER LOGIC ---
  const teamAnalysis = useMemo(() => {
      if (!teamMembers.length) return null;

      const dataPoints = teamMembers.map(m => ({
          name: m.profile.full_name,
          calls: m.aggregates.calls_total,
          won: m.aggregates.won_total,
          winRate: m.aggregates.win_rate * 100, // %
          initials: m.profile.full_name.split(' ').map(n=>n[0]).join('').slice(0,2)
      })).filter(d => d.calls > 0 || d.won > 0); // Remove completely inactive

      if (dataPoints.length === 0) return null;

      const totalCalls = dataPoints.reduce((acc, c) => acc + c.calls, 0);
      const totalWon = dataPoints.reduce((acc, c) => acc + c.won, 0);
      const avgCalls = totalCalls / dataPoints.length;
      const avgWon = totalWon / dataPoints.length;

      // Identify Driving vs Dragging
      const ranked = [...dataPoints].sort((a,b) => b.won - a.won);

      return { dataPoints, avgCalls, avgWon, ranked };
  }, [teamMembers]);

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-6 animate-in fade-in">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-900/30">
                    <BrainCircuit className="text-white" size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Analisi Strategica</h2>
                    <p className="text-slate-400 text-xs">Diagnosi AI e controllo salute del business.</p>
                </div>
            </div>

            {/* FILTERS */}
            <div className="flex bg-slate-900/50 rounded-lg p-1 overflow-x-auto border border-white/5">
                {(['today', 'week', 'month', 'custom'] as Period[]).map((p) => (
                <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${period === p ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                    {p === 'today' ? 'Oggi' : p === 'week' ? 'Settimana' : p === 'month' ? 'Mese' : 'Personalizzato'}
                </button>
                ))}
            </div>
        </div>

        {period === 'custom' && (
           <div className="flex justify-end">
               <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                  <input type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} className="bg-transparent text-xs text-white outline-none" />
                  <ArrowRight size={12} className="text-slate-500"/>
                  <input type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} className="bg-transparent text-xs text-white outline-none" />
               </div>
           </div>
         )}

        {/* 1. STRATEGIC CONTROL (ALERTS) - PERSONAL */}
        <StrategicAlerts insights={metrics.insights} />

        {/* 2. AI DEEP DIVE */}
        <AIAnalysisWidget analysis={aiAnalysis} />

        {/* 3. COACH EXCLUSIVE: TEAM PERFORMANCE MATRIX */}
        {isAdminOrCoach && teamAnalysis && (
            <div className="space-y-6 animate-in slide-in-from-bottom-8">
                <div className="flex items-center gap-2 mb-2 pt-6 border-t border-white/5">
                    <Users className="text-indigo-400" size={20} />
                    <h3 className="text-lg font-bold text-white">Cluster Performance Team</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* SCATTER PLOT */}
                    <div className="lg:col-span-2 glass-panel p-5 rounded-2xl relative overflow-hidden h-[400px] flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="text-sm font-bold text-white">Matrice Attività vs Risultati</h4>
                                <p className="text-[10px] text-slate-400">Chi sta performando sopra/sotto la media del team.</p>
                            </div>
                            <div className="flex gap-2 text-[9px] font-bold uppercase">
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Leader</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Stacanovisti</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Cecchini</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div> Rischio</div>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                                    <XAxis type="number" dataKey="calls" name="Attività" unit="" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{stroke: '#475569'}} label={{ value: 'Volume Attività (Calls)', position: 'bottom', offset: 0, fill: '#64748b', fontSize: 10 }} />
                                    <YAxis type="number" dataKey="won" name="Vinti" unit="" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{stroke: '#475569'}} label={{ value: 'Risultati (Vinti)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                                    <ZAxis type="number" dataKey="winRate" range={[50, 400]} name="Win Rate" unit="%" />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomScatterTooltip />} />
                                    
                                    {/* Quadrant References */}
                                    <ReferenceLine x={teamAnalysis.avgCalls} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'Avg Vol', position: 'insideTopRight', fill: '#64748b', fontSize: 10 }} />
                                    <ReferenceLine y={teamAnalysis.avgWon} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'Avg Res', position: 'insideRight', fill: '#64748b', fontSize: 10 }} />

                                    <Scatter name="Team" data={teamAnalysis.dataPoints} fill="#8884d8">
                                        {teamAnalysis.dataPoints.map((entry, index) => {
                                            // Determine Color based on Quadrant
                                            // Top Right: High Vol, High Won (Leader - Green)
                                            // Bottom Right: High Vol, Low Won (Grinder - Yellow)
                                            // Top Left: Low Vol, High Won (Sniper - Blue)
                                            // Bottom Left: Low Vol, Low Won (Risk - Red)
                                            let color = '#f87171'; // Red default
                                            if (entry.calls >= teamAnalysis.avgCalls && entry.won >= teamAnalysis.avgWon) color = '#34d399'; // Emerald
                                            else if (entry.calls >= teamAnalysis.avgCalls && entry.won < teamAnalysis.avgWon) color = '#fbbf24'; // Yellow
                                            else if (entry.calls < teamAnalysis.avgCalls && entry.won >= teamAnalysis.avgWon) color = '#60a5fa'; // Blue
                                            
                                            return <Cell key={`cell-${index}`} fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />;
                                        })}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* LEADERBOARD & DELTA */}
                    <div className="glass-panel p-5 rounded-2xl flex flex-col h-[400px]">
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
                            <span>Impatto sul Team</span>
                            <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">vs Media</span>
                        </h4>
                        
                        <div className="overflow-y-auto pr-2 space-y-2 flex-1 scrollbar-thin">
                            {teamAnalysis.ranked.map((m, idx) => {
                                const deltaWon = m.won - teamAnalysis.avgWon;
                                const isPositive = deltaWon >= 0;
                                
                                return (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 transition-colors border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${idx < 3 ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg' : 'bg-slate-700'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white truncate max-w-[100px]">{m.name}</div>
                                                <div className="text-[9px] text-slate-400">{m.calls} attempts</div>
                                            </div>
                                        </div>
                                        
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-white">{m.won} <span className="text-[9px] font-normal text-slate-500">wins</span></div>
                                            <div className={`text-[10px] font-bold flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {isPositive ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                                                {deltaWon > 0 ? '+' : ''}{deltaWon.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-white/5 text-center">
                            <div className="text-[10px] text-slate-500">Media Team: <span className="text-white font-bold">{teamAnalysis.avgWon.toFixed(1)}</span> wins / <span className="text-white font-bold">{teamAnalysis.avgCalls.toFixed(0)}</span> calls</div>
                        </div>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700/50 p-3 rounded-xl shadow-xl backdrop-blur-md">
          <p className="text-white text-xs font-bold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> {data.name}
          </p>
          <div className="space-y-1">
              <div className="flex justify-between gap-4 text-[10px] text-slate-400">
                  <span>Attività:</span>
                  <span className="text-white font-mono">{data.calls}</span>
              </div>
              <div className="flex justify-between gap-4 text-[10px] text-slate-400">
                  <span>Vinti:</span>
                  <span className="text-white font-mono font-bold">{data.won}</span>
              </div>
              <div className="flex justify-between gap-4 text-[10px] text-slate-400 border-t border-white/10 pt-1 mt-1">
                  <span>Win Rate:</span>
                  <span className={`font-mono font-bold ${data.winRate > 25 ? 'text-emerald-400' : 'text-yellow-400'}`}>{data.winRate.toFixed(1)}%</span>
              </div>
          </div>
        </div>
      );
    }
    return null;
};
