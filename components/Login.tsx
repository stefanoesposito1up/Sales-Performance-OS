
import React, { useState } from 'react';
import { getSupabase } from '../services/cloud';
import { Loader2, LogIn, Lock, Mail, ShieldCheck, UserPlus, Ticket } from 'lucide-react';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [inviteCode, setInviteCode] = useState(''); // NEW: Invite Code State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
    const [msg, setMsg] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        const supabase = getSupabase();
        if (!supabase) {
            setError('Errore di connessione. Ricarica.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError('Credenziali non valide o errore di connessione.');
        }
        setLoading(false);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        if (!inviteCode) {
            setError('Il codice invito è obbligatorio.');
            setLoading(false);
            return;
        }

        const supabase = getSupabase();
        if (!supabase) {
            setError('Errore di connessione.');
            setLoading(false);
            return;
        }

        // Pass invite_code in metadata. The DB Trigger will validate it.
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { 
                    full_name: fullName,
                    invite_code: inviteCode 
                }
            }
        });

        if (error) {
            setError(error.message); // Trigger exception message will appear here
        } else if (data.user) {
            // Check if user session is established (Auto-confirm disabled usually requires email check)
            if (data.session) {
                 setMsg('Registrazione completata! Benvenuto.');
                 window.location.reload();
            } else {
                 setMsg('Registrazione completata! Controlla la tua email per confermare.');
                 setMode('login');
            }
        }
        setLoading(false);
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        const supabase = getSupabase();
        if (!supabase) return;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
             redirectTo: window.location.origin,
        });

        if (error) setError(error.message);
        else setMsg('Controlla la tua email per il link di reset.');
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden px-4">
             <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
             
             <div className="w-full max-w-md p-8 glass-panel rounded-3xl z-10 border border-white/10 shadow-2xl">
                 <div className="text-center mb-8">
                     <h2 className="text-2xl font-bold text-white mb-2">Sales Performance OS</h2>
                     <p className="text-slate-400 text-sm">Accesso Team</p>
                 </div>

                 {error && <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-6 text-red-400 text-xs font-bold text-center">{error}</div>}
                 {msg && <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl mb-6 text-emerald-400 text-xs font-bold text-center">{msg}</div>}

                 {mode === 'login' && (
                     <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-500" size={18}/>
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="glass-input w-full pl-10 p-3 rounded-xl text-sm" placeholder="nome@azienda.com" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-slate-500" size={18}/>
                                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="glass-input w-full pl-10 p-3 rounded-xl text-sm" placeholder="••••••••" />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-2">
                            {loading ? <Loader2 className="animate-spin" size={18}/> : <LogIn size={18}/>} Accedi
                        </button>
                        <div className="flex justify-between items-center mt-4">
                            <button type="button" onClick={() => setMode('reset')} className="text-xs text-slate-500 hover:text-white">Password dimenticata?</button>
                            <button type="button" onClick={() => setMode('register')} className="text-xs text-blue-400 hover:text-white font-bold">Crea Account (Con Invito)</button>
                        </div>
                     </form>
                 )}

                 {mode === 'register' && (
                     <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in">
                        <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 mb-4">
                            <label className="text-[10px] font-bold text-blue-300 uppercase ml-1 mb-1 block">Codice Invito (Obbligatorio)</label>
                            <div className="relative">
                                <Ticket className="absolute left-3 top-3 text-blue-400" size={18}/>
                                <input 
                                    type="text" required value={inviteCode} onChange={e => setInviteCode(e.target.value)} 
                                    className="w-full bg-slate-900/50 border border-blue-500/30 rounded-lg pl-10 p-2.5 text-white focus:border-blue-400 outline-none font-mono tracking-wider" 
                                    placeholder="INV-XXXX-YYYY"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nome Completo</label>
                            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="glass-input w-full p-3 rounded-xl text-sm" placeholder="Mario Rossi" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email</label>
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="glass-input w-full p-3 rounded-xl text-sm" placeholder="nome@azienda.com" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Password</label>
                            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="glass-input w-full p-3 rounded-xl text-sm" placeholder="••••••••" />
                        </div>

                        <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-4">
                            {loading ? <Loader2 className="animate-spin" size={18}/> : <UserPlus size={18}/>} Registrati
                        </button>
                        <div className="text-center mt-4">
                            <button type="button" onClick={() => setMode('login')} className="text-xs text-slate-500 hover:text-white">Torna al Login</button>
                        </div>
                     </form>
                 )}

                 {mode === 'reset' && (
                     <form onSubmit={handleReset} className="space-y-4 animate-in fade-in">
                        <p className="text-xs text-slate-400 text-center mb-4">Inserisci email per reset password.</p>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="glass-input w-full p-3 rounded-xl text-sm" placeholder="nome@azienda.com" />
                        <button type="submit" disabled={loading} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={18}/> : <ShieldCheck size={18}/>} Invia Link
                        </button>
                        <button type="button" onClick={() => setMode('login')} className="w-full text-xs text-slate-500 hover:text-white mt-2">Annulla</button>
                     </form>
                 )}
             </div>
        </div>
    );
};
