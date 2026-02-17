
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabase } from './cloud';
import { UserProfile } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabase();

  const fetchProfile = async (userId: string) => {
    if (!supabase) return;
    try {
      // Fetch Profile
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error) throw error;

      // Fetch Active Sponsor (Edge)
      const { data: edgeData } = await supabase
        .from('team_edges')
        .select('parent_id')
        .eq('child_id', userId)
        .is('valid_to', null)
        .single();

      let sponsorName = null;
      if (edgeData?.parent_id) {
         const { data: parentProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', edgeData.parent_id)
            .single();
         sponsorName = parentProfile?.full_name;
      }

      setProfile({
         ...profileData,
         sponsor_id: edgeData?.parent_id || null,
         sponsor_name: sponsorName
      });

    } catch (e) {
      console.error('Error loading profile:', e);
    }
  };

  useEffect(() => {
    if (!supabase) {
        setLoading(false);
        return;
    }

    // Get Initial Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
     if (session?.user) await fetchProfile(session.user.id);
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
