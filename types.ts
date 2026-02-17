

export type UserRole = 'admin' | 'coach' | 'member' | 'leader';

export interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  status?: string; // e.g. 'active', 'inactive'
  sponsor_id?: string | null; // Derived from active edge
  sponsor_name?: string | null;
}

export interface TeamEdge {
  id: number;
  child_id: string;
  parent_id: string | null;
  valid_from: string;
  valid_to: string | null;
}

export interface DailyLog {
  id?: number;
  user_id?: string;
  date: string; // YYYY-MM-DD
  
  // 1. Outreach
  calls_total: number; // Calculated UI side
  calls_refused: number;
  calls_no_answer: number;
  calls_answered: number;
  messages_sent: number;

  // 2. Appuntamenti Fissati (Booked)
  booked_la: number;
  booked_fv: number;
  booked_cad: number;

  // 3. Nuovi Lead
  new_leads: number;

  // 4. Appuntamenti Svolti (Done)
  done_la: number;
  done_fv: number;
  done_cad: number;
  done_cde: number; 

  // 5. Appuntamenti Vinti (Won)
  won_la: number;
  won_fv: number;
  won_cad: number;

  // Targets (Snapshot)
  target_calls: number;
  target_booked: number;
  target_won: number;

  // Mental State
  energy_level: number; 
  focus_level: number; 
  confidence_level: number; 
  mood_note: string;
}

export interface KPIReport {
  totals: DailyLog; 
  rates: {
    answer_rate: number;
    refused_rate: number;
    no_answer_rate: number;
    contact_efficiency: number;
    messages_per_call: number;
    booking_rate: number;
    show_rate: number;
    win_rate: number;
    win_rate_la: number;
    win_rate_fv: number;
    win_rate_cad: number;
  };
  targets: {
    calls_completion: number;
    booked_completion: number;
    won_completion: number;
  };
  mental: {
    avg_energy: number;
    avg_focus: number;
    avg_confidence: number;
  };
  score: {
    volume_score: number;
    booking_score: number;
    win_score: number;
    total_score: number;
    label: string;
    color: string;
  };
}

export const INITIAL_LOG: DailyLog = {
  date: new Date().toISOString().split('T')[0],
  calls_total: 0,
  calls_refused: 0,
  calls_no_answer: 0,
  calls_answered: 0,
  messages_sent: 0,
  booked_la: 0,
  booked_fv: 0,
  booked_cad: 0,
  new_leads: 0,
  done_la: 0,
  done_fv: 0,
  done_cad: 0,
  done_cde: 0,
  won_la: 0,
  won_fv: 0,
  won_cad: 0,
  target_calls: 50,
  target_booked: 2,
  target_won: 1,
  energy_level: 7,
  focus_level: 7,
  confidence_level: 7,
  mood_note: '',
};

// --- PLANNING INTERFACES ---

export interface MonthlyPlan {
  id?: number;
  user_id?: string;
  month: string; // YYYY-MM
  
  // Inputs
  workdays_per_week: number; 
  target_won_la_month: number;
  target_won_fv_month: number;
  target_won_cad_month: number;
  target_new_leads_month: number;
  
  // Helpers (Calculated for UI only, not stored)
  daily_call_capacity?: number; // kept for compatibility types but not stored
}

export const INITIAL_PLAN: MonthlyPlan = {
  month: new Date().toISOString().slice(0, 7),
  workdays_per_week: 5,
  target_won_la_month: 0,
  target_won_fv_month: 0,
  target_won_cad_month: 0,
  target_new_leads_month: 0,
  daily_call_capacity: 0
};

// --- COACH CONSOLE INTERFACES ---

export type TrafficLightStatus = 'red' | 'yellow' | 'green';

export interface TeamMemberStatus {
  profile: UserProfile;
  aggregates: {
    calls_total: number;
    booked_total: number;
    done_total: number;
    won_total: number;
    booking_rate: number;
    win_rate: number;
  };
  last_log_date: string | null;
  has_logged_today: boolean;
  traffic_light: TrafficLightStatus;
  help_score: number; // 0-100, higher means needs more help
  help_reason: string;
}

export interface TeamAggregates {
  calls_total: number;
  booked_total: number;
  done_total: number;
  won_total: number;
  active_members_count: number;
  logged_today_count: number;
  total_members_count: number;
}