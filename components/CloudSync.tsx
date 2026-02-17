
import React, { useState, useEffect } from 'react';
import { getSupabase, loadFromCloud, saveToCloud } from '../services/cloud';
import { DailyLog, MonthlyPlan } from '../types';
import { Cloud, Check, AlertTriangle, Loader2, LogIn, LogOut, RefreshCw, Save, Database, Smartphone, Monitor } from 'lucide-react';

interface Props {
  logs: DailyLog[];
  plans: MonthlyPlan[];
  onImport: (logs: DailyLog[], plans: MonthlyPlan[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSync: React.FC<Props> = ({ logs, plans, onImport, isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Initialization now happens globally in App.tsx via initSupabase
  useEffect(() => {
    const init = async () => {
        const client = getSupabase();
        if (client) {
            // Check for existing session
            const { data } = await client.auth.getUser();
            if (data.user) {
                setUser(data.user);
            }
        }
    };
    init();
  }, []);

  const handleLogin = async (isSignUp: boolean = false) => {
    const client = getSupabase();
    if (!client) return setMsg({ type: 'error', text: 'Errore di connessione al server.' });
    
    setLoading(true);
    const { data, error } = isSignUp 
       ? await client.auth.signUp({ email, password })
       : await client.auth.signInWithPassword({ email, password });
    
    setLoading(false);

    if (error) {
       setMsg({ type: 'error', text: error.message });
    } else {
       setUser(data.user);
       setMsg({ type: 'success', text: isSignUp ? 'Registrazione ok! Controlla email per confermare.' : 'Bentornato!' });
       // Auto pull on login if it's a login action
       if (!isSignUp && data.user) {
           setTimeout(() => handlePull(), 500); // Small delay to ensure UX flow
       }
    }
  };

  const handleLogout = async () => {
    const client = getSupabase();
    if (client) await client.auth.signOut();
    setUser(null);
    setMsg(null);
  };

  const handlePush = async () => {
    setLoading(true);
    try {
        await saveToCloud(logs, plans);
        setMsg({ type: 'success', text: 'Dati salvati in Cloud con successo!' });
    } catch (e: any) {
        setMsg({ type: 'error', text: e.message || 'Errore durante il salvataggio' });
    }
    setLoading(false);
  };

  const handlePull = async () => {
    setLoading(true);
    try {
        const data = await loadFromCloud();
        if (data) {
            onImport(data.logs, data.plans || []);
            setMsg({ type: 'success', text: 'Dati sincronizzati dal Cloud!' });
        } else {
            setMsg({ type: 'success', text: 'Nessun dato trovato in Cloud (Nuovo utente?).' });
        }
    } catch (e: any) {
        setMsg({ type: 'error', text: e.message || 'Errore durante il download' });
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-md p-6 rounded-3xl relative animate-in fade-in zoom-in-95 duration-300 shadow-2xl border border-white/10">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><Check/></button>
        
        <div className="flex items-center gap-3 mb-6">
           <div className="p-3 rounded-xl bg-blue-600/20 text-blue-400"><Cloud size={24}/></div>
           <div>
               <h2 className="text-xl font-bold text-white">Cloud Sync</h2>
               <p className="text-[10px] text-slate-400 flex items-center gap-1">
                 <Monitor size={10}/> PC <RefreshCw size={8}/> <Smartphone size={10}/> Mobile
               </p>
           </div>
        </div>

        {msg && (
            <div className={`p-3 rounded-lg mb-4 text-sm font-medium flex items-start gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {msg.type === 'success' ? <Check size={16} className="mt-0.5 shrink-0"/> : <AlertTriangle size={16} className="mt-0.5 shrink-0"/>}
                <span>{msg.text}</span>
            </div>
        )}

        {!user ? (
            <div className="space-y-4 animate-in fade-in">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center mb-4">
                   <p className="text-sm text-slate-300">
                     Accedi per sincronizzare i tuoi dati tra dispositivi diversi.
                   </p>
                </div>

                {/* LOGIN SECTION */}
                <div className="space-y-3">
                    <input type="email" placeholder="Email" className="glass-input w-full p-3 rounded-xl" value={email} onChange={e => setEmail(e.target.value)} />
                    <input type="password" placeholder="Password" className="glass-input w-full p-3 rounded-xl" value={password} onChange={e => setPassword(e.target.value)} />
                    
                    <div className="flex gap-2 pt-1">
                        <button onClick={() => handleLogin(false)} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20">
                            {loading ? <Loader2 className="animate-spin" size={18}/> : <LogIn size={18}/>} Accedi
                        </button>
                    </div>
                    <button onClick={() => handleLogin(true)} disabled={loading} className="w-full text-slate-400 hover:text-white text-xs font-bold py-2 transition-colors">
                        Non hai un account? Registrati ora
                    </button>
                </div>
            </div>
        ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg">
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-sm">
                            <div className="text-slate-200 font-bold">Connesso</div>
                            <div className="text-xs text-slate-500 max-w-[150px] truncate">{user.email}</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Esci"><LogOut size={18}/></button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handlePush} disabled={loading} className="p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex flex-col items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-900/20 group">
                        <div className="p-2 bg-indigo-500/30 rounded-full group-hover:scale-110 transition-transform"><Save size={24} /></div>
                        <div className="text-center">
                            <span className="block font-bold text-sm">Carica</span>
                            <span className="block text-[10px] text-indigo-200 opacity-70">Salva stato attuale</span>
                        </div>
                    </button>

                    <button onClick={handlePull} disabled={loading} className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex flex-col items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/20 group">
                        <div className="p-2 bg-emerald-500/30 rounded-full group-hover:scale-110 transition-transform"><RefreshCw size={24} /></div>
                        <div className="text-center">
                           <span className="block font-bold text-sm">Sincronizza</span>
                           <span className="block text-[10px] text-emerald-200 opacity-70">Scarica ultimi dati</span>
                        </div>
                    </button>
                </div>
                
                <p className="text-center text-[10px] text-slate-500">
                   Database connesso automaticamente.
                </p>
            </div>
        )}
      </div>
    </div>
  );
};
