
import React, { useState, useEffect } from 'react';
import { getSupabase } from '../services/cloud';
import { Ticket, Users, Copy, Check, Trash2, Plus, Loader2 } from 'lucide-react';

export const AdminPanel: React.FC = () => {
    const [invites, setInvites] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // New Invite Form
    const [newInvite, setNewInvite] = useState({
        role: 'collaboratore',
        max_uses: 1,
        team_id: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const supabase = getSupabase();
        if (supabase) {
            const { data: inv } = await supabase.from('invites').select('*').order('created_at', { ascending: false });
            const { data: prof } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
            if (inv) setInvites(inv);
            if (prof) setProfiles(prof);
        }
        setLoading(false);
    };

    const generateInvite = async () => {
        const code = `INV-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const supabase = getSupabase();
        
        if (!supabase) return;

        const { error } = await supabase.from('invites').insert({
            code,
            role_assigned: newInvite.role,
            max_uses: newInvite.max_uses,
            team_id_assigned: newInvite.team_id || null,
            // Assuming current admin is the creator
        });

        if (error) alert('Errore creazione: ' + error.message);
        else {
            alert(`Codice creato: ${code}`);
            loadData();
        }
    };

    const deleteInvite = async (code: string) => {
        if(!confirm('Eliminare invito?')) return;
        const supabase = getSupabase();
        if(supabase) {
            await supabase.from('invites').delete().eq('code', code);
            loadData();
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-24 space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Users className="text-red-500"/> Pannello Amministrazione
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* INVITE GENERATOR */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Ticket size={18} className="text-blue-400"/> Gestione Inviti</h3>
                    
                    <div className="bg-slate-900/50 p-4 rounded-xl mb-6 border border-white/5">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-bold">Ruolo</label>
                                <select 
                                    className="glass-input w-full p-2 rounded-lg text-sm"
                                    value={newInvite.role}
                                    onChange={e => setNewInvite({...newInvite, role: e.target.value})}
                                >
                                    <option value="collaboratore">Collaboratore</option>
                                    <option value="leader">Leader</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase font-bold">Max Usi</label>
                                <input 
                                    type="number" 
                                    className="glass-input w-full p-2 rounded-lg text-sm"
                                    value={newInvite.max_uses}
                                    onChange={e => setNewInvite({...newInvite, max_uses: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>
                        <button onClick={generateInvite} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                            <Plus size={18}/> Genera Codice
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {invites.map(inv => (
                            <div key={inv.code} className="p-3 rounded-xl bg-slate-800/50 border border-white/5 flex justify-between items-center">
                                <div>
                                    <div className="font-mono text-emerald-400 font-bold text-sm tracking-wider">{inv.code}</div>
                                    <div className="text-[10px] text-slate-400 flex gap-2">
                                        <span className="uppercase">{inv.role_assigned}</span>
                                        <span>•</span>
                                        <span>Usato: {inv.uses_count}/{inv.max_uses}</span>
                                    </div>
                                </div>
                                <button onClick={() => deleteInvite(inv.code)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* USER LIST */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Users size={18} className="text-emerald-400"/> Lista Utenti ({profiles.length})</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-slate-500 uppercase bg-slate-900/50">
                                <tr>
                                    <th className="p-2 rounded-l-lg">Nome</th>
                                    <th className="p-2">Ruolo</th>
                                    <th className="p-2 rounded-r-lg text-right">Stato</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {profiles.map(p => (
                                    <tr key={p.user_id}>
                                        <td className="p-2 font-medium text-white">
                                            {p.full_name}
                                            <div className="text-[10px] text-slate-500">{p.email}</div>
                                        </td>
                                        <td className="p-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                p.role === 'admin' ? 'bg-red-500/10 text-red-400' : 
                                                p.role === 'leader' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'
                                            }`}>
                                                {p.role}
                                            </span>
                                        </td>
                                        <td className="p-2 text-right">
                                            <span className={p.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
