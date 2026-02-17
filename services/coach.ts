
import { getSupabase } from './cloud';
import { DailyLog, TeamMemberStatus, TeamAggregates, UserProfile } from '../types';
import { aggregateLogs } from './analytics';

// --- HELPERS ---
const safeDiv = (n: number, d: number) => d === 0 ? 0 : n / d;

export const fetchTeamData = async (startDate: string, endDate: string): Promise<{
    members: TeamMemberStatus[];
    teamTotals: TeamAggregates;
}> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("No connection");

    // 1. Fetch Profiles (Downline via RLS)
    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true); // Only active members
    
    if (profError) throw profError;

    // 2. Fetch Logs for the period (RLS filters for downline automatically)
    const { data: logs, error: logError } = await supabase
        .from('daily_logs')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

    if (logError) throw logError;

    const todayStr = new Date().toISOString().split('T')[0];

    // 3. Process each member
    const membersStatus: TeamMemberStatus[] = profiles.map((p: UserProfile) => {
        // Filter logs for this user
        const userLogs = logs.filter((l: any) => l.user_id === p.user_id);
        const agg = aggregateLogs(userLogs);
        
        // Find last log date
        const sortedLogs = [...userLogs].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastLog = sortedLogs[0];
        const hasLoggedToday = lastLog?.date === todayStr;

        // Calculate Totals for period
        const calls = agg.calls_total;
        const booked = agg.booked_la + agg.booked_fv + agg.booked_cad;
        const done = agg.done_la + agg.done_fv + agg.done_cad;
        const won = agg.won_la + agg.won_fv + agg.won_cad;
        const bookingRate = safeDiv(booked, agg.calls_answered + agg.messages_sent);
        const winRate = safeDiv(won, done);

        // --- TRAFFIC LIGHT LOGIC ---
        // Thresholds based on period length approx
        const periodDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24) + 1;
        const isToday = periodDays <= 1;

        let status: 'red' | 'yellow' | 'green' = 'yellow';
        
        if (isToday) {
            // Daily thresholds
            if (calls < 20 && booked === 0) status = 'red';
            else if (calls >= 40 || booked >= 1 || won >= 1) status = 'green';
            else status = 'yellow';
            
            // Hard override: no activity at all
            if (calls === 0 && booked === 0 && done === 0) status = 'red';
        } else {
            // Multi-day thresholds (approx linear)
            const dailyAvg = calls / periodDays;
            
            if (dailyAvg < 10) status = 'red';
            else if (dailyAvg >= 30 && (booked > 0 || won > 0)) status = 'green';
            else if (booked === 0 && won === 0 && dailyAvg > 20) status = 'yellow'; // High activity no result
            else status = 'yellow';
        }

        // --- HELP SCORE ALGORITHM (Top 5) ---
        let helpScore = 0;
        let helpReasons: string[] = [];

        // 1. Critical: Not logged today (if checking today)
        if (!hasLoggedToday) {
            helpScore += 40;
            helpReasons.push("Non ha compilato oggi");
        }

        // 2. Critical: Zero Activity in period
        if (calls === 0 && booked === 0) {
             helpScore += 30;
             helpReasons.push("Zero attività nel periodo");
        }

        // 3. High Effort / Zero Results (The "Frustrated" profile)
        if (calls > (20 * periodDays) && booked === 0) {
            helpScore += 25;
            helpReasons.push(`Tante chiamate (${calls}), 0 fissati`);
        }

        // 4. Booking but No Closing
        if (booked > (2 * periodDays) && won === 0) {
            helpScore += 15;
            helpReasons.push("Fissa ma non chiude");
        }

        // 5. Traffic Light Red penalty
        if (status === 'red') helpScore += 10;

        return {
            profile: p,
            aggregates: {
                calls_total: calls,
                booked_total: booked,
                done_total: done,
                won_total: won,
                booking_rate: bookingRate,
                win_rate: winRate
            },
            last_log_date: lastLog?.date || null,
            has_logged_today: hasLoggedToday,
            traffic_light: status,
            help_score: helpScore,
            help_reason: helpReasons[0] || "Performance basse"
        };
    });

    // 4. Calculate Team Totals
    const teamCalls = membersStatus.reduce((acc, m) => acc + m.aggregates.calls_total, 0);
    const teamBooked = membersStatus.reduce((acc, m) => acc + m.aggregates.booked_total, 0);
    const teamDone = membersStatus.reduce((acc, m) => acc + m.aggregates.done_total, 0);
    const teamWon = membersStatus.reduce((acc, m) => acc + m.aggregates.won_total, 0);
    const activeMembers = membersStatus.filter(m => 
        m.aggregates.calls_total > 0 || m.aggregates.booked_total > 0 || m.aggregates.won_total > 0
    ).length;
    const loggedToday = membersStatus.filter(m => m.has_logged_today).length;

    return {
        members: membersStatus,
        teamTotals: {
            calls_total: teamCalls,
            booked_total: teamBooked,
            done_total: teamDone,
            won_total: teamWon,
            active_members_count: activeMembers,
            logged_today_count: loggedToday,
            total_members_count: membersStatus.length
        }
    };
};
