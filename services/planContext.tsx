
import React, { createContext, useContext, useState, useEffect } from 'react';
import { MonthlyPlan, INITIAL_PLAN } from '../types';
import { getSupabase, upsertMonthlyPlan } from './cloud';
import { useAuth } from './auth';

interface PlanContextType {
    currentPlan: MonthlyPlan | null;
    currentMonthKey: string;
    loadingPlan: boolean;
    setMonthKey: (month: string) => void;
    savePlan: (plan: MonthlyPlan) => Promise<boolean>;
    refreshPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType>({
    currentPlan: null,
    currentMonthKey: new Date().toISOString().slice(0, 7),
    loadingPlan: false,
    setMonthKey: () => {},
    savePlan: async () => false,
    refreshPlan: async () => {}
});

export const usePlan = () => useContext(PlanContext);

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session } = useAuth();
    const [currentMonthKey, setMonthKey] = useState<string>(new Date().toISOString().slice(0, 7));
    const [currentPlan, setCurrentPlan] = useState<MonthlyPlan | null>(null);
    const [loadingPlan, setLoadingPlan] = useState(false);

    // Fetch plan when month or user changes
    const fetchPlan = async () => {
        if (!session?.user) return;
        
        setLoadingPlan(true);
        const supabase = getSupabase();
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('monthly_plans')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .eq('month', currentMonthKey)
                    .maybeSingle();

                if (error && error.code !== 'PGRST116') {
                     console.error("Error fetching plan:", error);
                }
                
                if (data) {
                    setCurrentPlan(data as MonthlyPlan);
                } else {
                    setCurrentPlan(null); // No plan for this month
                }
            } catch (e) {
                console.error("Plan fetch exception:", e);
                setCurrentPlan(null);
            }
        }
        setLoadingPlan(false);
    };

    useEffect(() => {
        fetchPlan();
    }, [currentMonthKey, session]);

    const savePlan = async (plan: MonthlyPlan): Promise<boolean> => {
        if (!session?.user) return false;
        
        // Ensure strictly correct month key in payload
        const payload: MonthlyPlan = {
            ...plan,
            month: currentMonthKey
        };

        try {
            await upsertMonthlyPlan(payload, session.user.id);
            // Refresh local state immediately
            await fetchPlan();
            return true;
        } catch (e) {
            console.error("Save plan failed:", e);
            return false;
        }
    };

    return (
        <PlanContext.Provider value={{
            currentPlan,
            currentMonthKey,
            loadingPlan,
            setMonthKey,
            savePlan,
            refreshPlan: fetchPlan
        }}>
            {children}
        </PlanContext.Provider>
    );
};
