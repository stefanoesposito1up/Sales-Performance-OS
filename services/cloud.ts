
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DailyLog, MonthlyPlan, UserProfile } from '../types';

export interface CloudConfig {
  url: string;
  key: string;
}

let supabase: SupabaseClient | null = null;

// Initialize with the hardcoded config or user provided
export const initSupabase = (config: CloudConfig) => {
  if (!config.url || !config.key) return null;
  
  // Return existing instance if already initialized
  if (supabase) return supabase;

  try {
    supabase = createClient(config.url, config.key, {
       auth: {
         persistSession: true, // IMPORTANT: Enables LocalStorage persistence
         autoRefreshToken: true,
         detectSessionInUrl: true,
         storage: window.localStorage // Explicitly use window.localStorage for persistence
       }
    });
    return supabase;
  } catch (e) {
    console.error("Supabase init failed", e);
    return null;
  }
};

export const getSupabase = () => supabase;

// --- DAILY LOGS OPERATIONS ---

export const fetchDailyLogs = async (userId: string, startDate?: string, endDate?: string): Promise<DailyLog[]> => {
  if (!supabase) throw new Error("Cloud not connected");
  
  let query = supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data, error } = await query;
  if (error) throw error;

  // Map DB fields to UI fields if needed (totals are calculated in UI)
  return data.map((log: any) => ({
    ...log,
    calls_total: log.calls_refused + log.calls_no_answer + log.calls_answered // Recalculate total
  }));
};

/**
 * Fetch logs strictly for a specific month (MTD)
 * Start Date: YYYY-MM-01
 * End Date (Exclusive): YYYY-(MM+1)-01
 * Fixed logic to ensure strict month isolation without timezone shifts
 */
export const fetchLogsForMonth = async (userId: string, monthKey: string): Promise<DailyLog[]> => {
    if (!supabase) throw new Error("Cloud not connected");

    // 1. Parse Month Key (YYYY-MM)
    const parts = monthKey.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);

    // 2. Calculate Start Date (Inclusive) -> YYYY-MM-01
    // Construct string manually to avoid Date object timezone shifts
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

    // 3. Calculate End Date (Exclusive) -> 1st of Next Month
    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
        nextMonth = 1;
        nextYear = year + 1;
    }
    const endDateExclusive = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    // 4. Execute Query with strict range
    const { data, error } = await supabase
        .from('daily_logs')
        .select(`
            date,
            calls_refused, calls_no_answer, calls_answered, messages_sent,
            booked_la, booked_fv, booked_cad,
            done_la, done_fv, done_cad, done_cde,
            won_la, won_fv, won_cad,
            new_leads
        `)
        .eq('user_id', userId)
        .gte('date', startDate)
        .lt('date', endDateExclusive); // STRICTLY LESS THAN next month start

    if (error) throw error;

    // Return with total calc
    return data.map((log: any) => ({
        ...log,
        calls_total: (log.calls_refused || 0) + (log.calls_no_answer || 0) + (log.calls_answered || 0)
    })) as DailyLog[];
};

export const upsertDailyLog = async (log: DailyLog, userId: string): Promise<void> => {
    if (!supabase) throw new Error("Cloud not connected");

    const dbLog = {
        user_id: userId,
        date: log.date,
        calls_refused: log.calls_refused,
        calls_no_answer: log.calls_no_answer,
        calls_answered: log.calls_answered,
        messages_sent: log.messages_sent,
        booked_la: log.booked_la,
        booked_fv: log.booked_fv,
        booked_cad: log.booked_cad,
        new_leads: log.new_leads,
        done_la: log.done_la,
        done_fv: log.done_fv,
        done_cad: log.done_cad,
        done_cde: log.done_cde,
        won_la: log.won_la,
        won_fv: log.won_fv,
        won_cad: log.won_cad,
        energy_level: log.energy_level,
        focus_level: log.focus_level,
        confidence_level: log.confidence_level,
        mood_note: log.mood_note,
        // Snapshot targets
        target_calls: log.target_calls,
        target_booked: log.target_booked,
        target_won: log.target_won,
    };

    const { error } = await supabase
        .from('daily_logs')
        .upsert(dbLog, { onConflict: 'user_id, date' });

    if (error) throw error;
};

export const deleteDailyLog = async (date: string, userId: string) => {
    if (!supabase) throw new Error("Cloud not connected");
    const { error } = await supabase.from('daily_logs').delete().eq('user_id', userId).eq('date', date);
    if (error) throw error;
};

// --- MONTHLY PLANS OPERATIONS ---

export const fetchMonthlyPlans = async (userId: string): Promise<MonthlyPlan[]> => {
    if (!supabase) throw new Error("Cloud not connected");
    const { data, error } = await supabase.from('monthly_plans').select('*').eq('user_id', userId);
    if (error) throw error;
    return data as MonthlyPlan[];
};

export const upsertMonthlyPlan = async (plan: MonthlyPlan, userId: string): Promise<void> => {
    if (!supabase) throw new Error("Cloud not connected");
    
    // Construct strict payload to match simplified DB schema
    const payload = {
        user_id: userId,
        month: plan.month,
        workdays_per_week: plan.workdays_per_week,
        target_won_la_month: plan.target_won_la_month,
        target_won_fv_month: plan.target_won_fv_month,
        target_won_cad_month: plan.target_won_cad_month,
        target_new_leads_month: plan.target_new_leads_month || 0
    };
    
    const { error } = await supabase
        .from('monthly_plans')
        .upsert(payload, { onConflict: 'user_id, month' });

    if (error) throw error;
};

// --- TEAM OPERATIONS (Admin/Coach) ---

export const fetchTeamMembers = async (): Promise<UserProfile[]> => {
    if (!supabase) throw new Error("Cloud not connected");
    // This relies on RLS: Coach only sees downline, Admin sees all
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    
    // Enrich with sponsor info manually or via another query if needed
    // For now, returning basic profiles accessible via RLS
    return data as UserProfile[];
};

export const fetchTeamHierarchy = async (): Promise<any[]> => {
     if (!supabase) throw new Error("Cloud not connected");
     // Get all active edges visible to user
     const { data: edges, error } = await supabase
        .from('team_edges')
        .select('child_id, parent_id')
        .is('valid_to', null);
     
     if (error) throw error;
     return edges;
};

// --- SYNC OPERATIONS (Bulk) ---

export const saveToCloud = async (logs: DailyLog[], plans: MonthlyPlan[]): Promise<void> => {
    if (!supabase) throw new Error("Cloud not connected");
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("No active session");
    const userId = session.user.id;

    // Prepare Logs
    const dbLogs = logs.map(log => ({
        user_id: userId,
        date: log.date,
        calls_refused: log.calls_refused || 0,
        calls_no_answer: log.calls_no_answer || 0,
        calls_answered: log.calls_answered || 0,
        messages_sent: log.messages_sent || 0,
        booked_la: log.booked_la || 0,
        booked_fv: log.booked_fv || 0,
        booked_cad: log.booked_cad || 0,
        new_leads: log.new_leads || 0,
        done_la: log.done_la || 0,
        done_fv: log.done_fv || 0,
        done_cad: log.done_cad || 0,
        done_cde: log.done_cde || 0,
        won_la: log.won_la || 0,
        won_fv: log.won_fv || 0,
        won_cad: log.won_cad || 0,
        energy_level: log.energy_level || 5,
        focus_level: log.focus_level || 5,
        confidence_level: log.confidence_level || 5,
        mood_note: log.mood_note || '',
        target_calls: log.target_calls || 0,
        target_booked: log.target_booked || 0,
        target_won: log.target_won || 0,
    }));

    if (dbLogs.length > 0) {
        const { error } = await supabase
            .from('daily_logs')
            .upsert(dbLogs, { onConflict: 'user_id, date' });
        if (error) throw error;
    }

    // Prepare Plans
    const dbPlans = plans.map(p => ({
        user_id: userId,
        month: p.month,
        workdays_per_week: p.workdays_per_week,
        target_won_la_month: p.target_won_la_month,
        target_won_fv_month: p.target_won_fv_month,
        target_won_cad_month: p.target_won_cad_month,
        target_new_leads_month: p.target_new_leads_month || 0
    }));

    if (dbPlans.length > 0) {
        const { error } = await supabase
            .from('monthly_plans')
            .upsert(dbPlans, { onConflict: 'user_id, month' });
        if (error) throw error;
    }
};

export const loadFromCloud = async (): Promise<{ logs: DailyLog[], plans: MonthlyPlan[] }> => {
    if (!supabase) throw new Error("Cloud not connected");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("No active session");
    const userId = session.user.id;

    const [logs, plans] = await Promise.all([
        fetchDailyLogs(userId),
        fetchMonthlyPlans(userId)
    ]);

    return { logs, plans };
};
