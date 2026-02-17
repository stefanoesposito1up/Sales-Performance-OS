
import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/auth';
import { fetchTeamMembers, fetchTeamHierarchy } from '../services/cloud';
import { UserProfile } from '../types';
import { inviteUser, changeSponsor } from '../services/admin';
import { Users, UserPlus, Search, ChevronRight, Briefcase, Crown, Shield, User, Link as LinkIcon, Loader2, BarChart2 } from 'lucide-react';

interface Props {
  onSelectUser: (userId: string) => void;
}

export const TeamView: React.FC<Props> = ({ onSelectUser }) => {
  const { profile } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hierarchy, setHierarchy] = useState<any[]>([]);

  // Invite Modal State
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', fullName: '', role: 'member', sponsorId: '' });
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
     setLoading(true);
     try {
         const [m, h] = await Promise.all([fetchTeamMembers(), fetchTeamHierarchy()]);
         setMembers(m);
         setHierarchy(h);
     } catch (e) {
         console.error(e);
     }
     setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
      e.preventDefault();
      setInviteLoading(true);
      try {
          await inviteUser(inviteData.email, inviteData.fullName, inviteData.role, inviteData.sponsorId || undefined);
          alert('Invito inviato con successo!');
          setShowInvite(false);
          loadTeam();
      } catch (e: any) {
          alert('Errore: ' + e.message);
      }
      setInviteLoading(false);
  };

  // Filter and enrich members with sponsor names
  const filteredMembers = members
    .map(m => {
        const edge = hierarchy.find(h => h.child_id === m.user_id);
        const sponsor = edge ? members.find(p => p.user_id === edge.parent_id) : null;
        return { ...m, sponsor_name: sponsor?.full_name || '-' };
    })
    .filter(m => 
        m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getRoleIcon = (role: string) => {
      switch(role) {
          case 'admin': return <Shield size={14} className="text-red-400"/>;
          case 'coach': return <Crown size={14} className="text-yellow-400"/>;
          default: return <User size={14} className="text-blue-400"/>;
      }
  };

  return (
    <div className="max-w-7xl mx-auto pb-24">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-white">Gestione Team</h2>
                <p className="text-slate-400 text-sm">Visualizza performance e gestisci la struttura.</p>
            </div>
            {profile?.role === 'admin' && (
                <button 
                    onClick={() => setShowInvite(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm shadow-lg shadow-blue-900/20"
                >
                    <UserPlus size={18}/> Invita Membro
                </button>
            )}
        </div>

        {/* Search */}
        <div className="glass-panel p-4 rounded-xl mb-6 flex items-center gap-3">
             <Search className="text-slate-500" size={20}/>
             <input 
                type="text" 
                placeholder="Cerca per nome o email..." 
                className="bg-transparent w-full text-white outline-none placeholder:text-slate-600"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
        </div>

        {/* Member List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {loading ? <div className="col-span-3 text-center py-10"><Loader2 className="animate-spin mx-auto text-blue-500"/></div> : 
              filteredMembers.map(member => (
                 <div key={member.user_id} className="glass-panel p-5 rounded-2xl group hover:border-blue-500/30 transition-all relative">
                     <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300">
                                 {member.full_name?.charAt(0) || '?'}
                             </div>
                             <div>
                                 <h3 className="font-bold text-white text-sm">{member.full_name}</h3>
                                 <div className="flex items-center gap-1 text-xs text-slate-500">
                                     {getRoleIcon(member.role)} <span className="uppercase">{member.role}</span>
                                 </div>
                             </div>
                         </div>
                         <button 
                            onClick={() => onSelectUser(member.user_id)}
                            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-blue-600 transition-colors"
                            title="Vedi Dashboard"
                         >
                            <BarChart2 size={16} />
                         </button>
                     </div>
                     
                     <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                        <div className="flex justify-between text-xs">
                             <span className="text-slate-500 flex items-center gap-1"><LinkIcon size={12}/> Sponsor</span>
                             <span className="text-slate-300 font-medium">{member.sponsor_name}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                             <span className="text-slate-500">Email</span>
                             <span className="text-slate-400 truncate max-w-[150px]">{member.email}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                             <span className="text-slate-500">Stato</span>
                             <span className={`font-bold ${member.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                                 {member.is_active ? 'Attivo' : 'Disattivato'}
                             </span>
                        </div>
                     </div>
                 </div>
              ))
             }
        </div>

        {/* Invite Modal */}
        {showInvite && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="glass-panel w-full max-w-md p-6 rounded-2xl animate-in fade-in zoom-in-95">
                    <h3 className="text-xl font-bold text-white mb-4">Invita Nuovo Membro</h3>
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                            <input required type="text" className="glass-input w-full p-2 rounded-lg" value={inviteData.fullName} onChange={e => setInviteData({...inviteData, fullName: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                            <input required type="email" className="glass-input w-full p-2 rounded-lg" value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Ruolo</label>
                                <select className="glass-input w-full p-2 rounded-lg" value={inviteData.role} onChange={e => setInviteData({...inviteData, role: e.target.value})}>
                                    <option value="member">Member</option>
                                    <option value="coach">Coach</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Sponsor</label>
                                <select className="glass-input w-full p-2 rounded-lg" value={inviteData.sponsorId} onChange={e => setInviteData({...inviteData, sponsorId: e.target.value})}>
                                    <option value="">Nessuno (Root)</option>
                                    {members.map(m => (
                                        <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                             <button type="button" onClick={() => setShowInvite(false)} className="flex-1 py-2 bg-slate-800 rounded-xl font-bold text-slate-400 hover:text-white">Annulla</button>
                             <button type="submit" disabled={inviteLoading} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white flex justify-center items-center">
                                 {inviteLoading ? <Loader2 className="animate-spin"/> : 'Invia Invito'}
                             </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
