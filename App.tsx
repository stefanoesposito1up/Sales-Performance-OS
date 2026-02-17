
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './services/auth';
import { PlanProvider } from './services/planContext'; 
import { Login } from './components/Login';
import { DailyEntryForm } from './components/DailyEntryForm';
import { Dashboard } from './components/Dashboard';
import { AnalysisView } from './components/AnalysisView'; 
import { HistoryView } from './components/HistoryView';
import { PlanningView } from './components/PlanningView';
import { TeamView } from './components/TeamView';
import { CoachConsole } from './components/CoachConsole';
import { AdminPanel } from './components/AdminPanel';
import { ReminderSystem } from './components/ReminderSystem';
import { fetchDailyLogs, upsertDailyLog, deleteDailyLog, initSupabase } from './services/cloud';
import { DailyLog, INITIAL_LOG } from './types';
import { LayoutDashboard, PlusCircle, History, Target, Users, LogOut, ArrowLeft, Loader2, BarChart2, BrainCircuit, Shield } from 'lucide-react';

// INITIALIZE SUPABASE GLOBALLY
// Uses Environment Variables defined in your hosting provider (Vercel/Netlify) with safe fallback
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ewqhndyjsrplgsjrwyvl.supabase.co';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_JqoQpKprStqz27WeCzfJkA_mTdLCY_Q';

initSupabase({
    url: SUPABASE_URL,
    key: SUPABASE_KEY
});

const MainApp: React.FC = () => {
  const { session, profile, signOut } = useAuth();
  
  // VIEW MODE: 'self' or 'viewing_other'
  const [viewingUserId, setViewingUserId] = useState<string>('');
  
  const activeUserId = viewingUserId || session?.user.id || '';
  const isViewingOther = viewingUserId !== '' && viewingUserId !== session?.user.id;

  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'analysis' | 'history' | 'planning' | 'team' | 'coach_console' | 'admin'>('dashboard');
  
  // Data State
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dataLoading, setDataLoading] = useState(false);

  // Fetch Data when activeUser changes
  useEffect(() => {
     if (activeUserId) {
         loadData(activeUserId);
     }
  }, [activeUserId]);

  const loadData = async (userId: string) => {
      setDataLoading(true);
      try {
          const fetchedLogs = await fetchDailyLogs(userId);
          setLogs(fetchedLogs);
      } catch (e) {
          console.error(e);
      }
      setDataLoading(false);
  };

  const handleSaveLog = async (newLog: DailyLog) => {
    try {
        await upsertDailyLog(newLog, activeUserId);
        setLogs(prev => {
            const filtered = prev.filter(l => l.date !== newLog.date);
            return [...filtered, newLog];
        });
        if (activeTab !== 'history') alert('Salvato!');
    } catch (e) {
        alert('Errore salvataggio: ' + e);
    }
  };

  const handleDeleteLog = async (date: string) => {
    if (confirm(`Eliminare i dati del ${date}?`)) {
      try {
          await deleteDailyLog(date, activeUserId);
          setLogs(prev => prev.filter(l => l.date !== date));
      } catch (e) {
          alert('Errore eliminazione');
      }
    }
  };

  const handleSelectUser = (userId: string) => {
      setViewingUserId(userId);
      setActiveTab('dashboard'); // Jump to dashboard of selected user
  };
  
  const handleNavigateToEntry = (date?: string) => {
      if (date) setSelectedDate(date);
      setActiveTab('entry');
  };
  
  const getLogForDate = (date: string) => logs.find(l => l.date === date);

  const isAdmin = profile?.role === 'admin';
  const isCoach = profile?.role === 'leader' || profile?.role === 'admin'; 

  return (
    <div className="min-h-screen text-slate-100 font-sans pb-24">
      
      {!isViewingOther && session?.user && (
          <ReminderSystem 
            userId={session.user.id} 
            logs={logs} 
            onLogSaved={() => loadData(session.user.id)} 
          />
      )}

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-md border-b border-white/5 z-40 px-6 flex items-center justify-between">
         <div className="flex items-center gap-3">
             {isViewingOther && (
                 <button onClick={() => setViewingUserId('')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
                     <ArrowLeft size={16}/>
                 </button>
             )}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white">S</div>
            <div>
                <div className="font-bold text-slate-200 leading-none hidden md:block">Sales OS</div>
                {isViewingOther && <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Viewing: {activeUserId.slice(0,8)}...</div>}
            </div>
         </div>

         <div className="flex items-center gap-4">
             {dataLoading && <Loader2 className="animate-spin text-blue-500" size={20} />}
             <div className="text-right hidden md:block">
                 <div className="text-xs font-bold text-white">{profile?.full_name}</div>
                 <div className="text-[10px] text-slate-500 uppercase">{profile?.role}</div>
             </div>
             <button onClick={() => signOut()} className="p-2 text-slate-400 hover:text-white" title="Logout">
                 <LogOut size={18}/>
             </button>
         </div>
      </header>

      {/* DOCK NAVIGATION */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-2xl z-50 overflow-x-auto max-w-[95vw]">
         <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Dash" />
         
         {(!isViewingOther || isAdmin) && (
            <NavButton active={activeTab === 'entry'} onClick={() => handleNavigateToEntry()} icon={PlusCircle} label="Entry" />
         )}
         
         <NavButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} icon={BrainCircuit} label="Analisi" />
         <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label="History" />
         <NavButton active={activeTab === 'planning'} onClick={() => setActiveTab('planning')} icon={Target} label="Plan" />
         
         {(isCoach || isAdmin) && !isViewingOther && (
             <div className="w-px h-8 bg-white/10 mx-1"></div>
         )}

         {isCoach && !isViewingOther && (
            <NavButton active={activeTab === 'coach_console'} onClick={() => setActiveTab('coach_console')} icon={BarChart2} label="Team" />
         )}

         {isAdmin && !isViewingOther && (
            <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={Shield} label="Admin" />
         )}
      </nav>

      {/* CONTENT */}
      <main className="container mx-auto px-4 pt-24 max-w-7xl animate-in fade-in">
          {activeTab === 'dashboard' && (
              <Dashboard 
                 logs={logs} 
                 onNavigateToEntry={handleNavigateToEntry}
                 onNavigateToPlanning={() => setActiveTab('planning')}
                 onRefreshData={() => loadData(activeUserId)}
              />
          )}
          {activeTab === 'entry' && (
              <DailyEntryForm 
                onSave={handleSaveLog} 
                existingLog={getLogForDate(selectedDate)}
                selectedDate={selectedDate}
              />
          )}
          {activeTab === 'analysis' && <AnalysisView logs={logs} />}
          {activeTab === 'history' && <HistoryView logs={logs} onUpdate={handleSaveLog} onDelete={handleDeleteLog} />}
          {activeTab === 'planning' && <PlanningView logs={logs} />}
          {activeTab === 'coach_console' && <CoachConsole />}
          {activeTab === 'team' && <TeamView onSelectUser={handleSelectUser} />}
          {activeTab === 'admin' && <AdminPanel />}
      </main>
    </div>
  );
};

const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all shrink-0 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
    >
        <Icon size={20} className="mb-1" />
        <span className="text-[9px] font-bold uppercase">{label}</span>
    </button>
);

const AppWrapper: React.FC = () => {
    return (
        <AuthProvider>
            <PlanProvider>
                <AuthConsumer />
            </PlanProvider>
        </AuthProvider>
    );
};

const AuthConsumer: React.FC = () => {
    const { session, loading, profile } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500">
                <Loader2 size={40} className="animate-spin" />
            </div>
        );
    }

    if (!session) {
        return <Login />;
    }

    // Protection for inactive users
    if (profile && profile.status === 'inactive') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="glass-panel p-8 rounded-2xl text-center border border-red-500/20">
                    <h2 className="text-xl font-bold text-red-400 mb-2">Account Disattivato</h2>
                    <p className="text-slate-400 text-sm mb-4">Contatta il tuo amministratore.</p>
                    <button onClick={() => window.location.reload()} className="bg-slate-800 px-4 py-2 rounded-lg text-white">Ricarica</button>
                </div>
            </div>
        );
    }

    return <MainApp />;
};

export default AppWrapper;
