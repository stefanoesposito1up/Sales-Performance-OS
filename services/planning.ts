
import { DailyLog, MonthlyPlan, INITIAL_PLAN } from '../types';
import { aggregateLogs } from './analytics';

// --- CONSTANTS & DEFAULTS ---
const DEFAULTS = {
    win_rate_la: 0.30,
    win_rate_fv: 0.25,
    win_rate_cad: 0.35,
    show_rate: 0.70,
    attempts_per_won: 80 // Attempts = Calls Total + Messages Sent
};

// --- TYPES ---

export type RateSource = 'MTD' | '60d' | '90d' | 'All Time' | 'Standard';

export interface RateDetail {
    value: number;
    source: RateSource;
}

export interface ProductRates {
    win_rate: RateDetail;
    show_rate: RateDetail;
}

export interface PlanningContext {
    la: ProductRates;
    fv: ProductRates;
    cad: ProductRates;
    global: {
        attempts_per_won: RateDetail;
    };
    // Debug Data included in context for transparency
    debug?: any; 
}

export interface PlanSimulation {
    inputs: {
        target_won_la: number;
        target_won_fv: number;
        target_won_cad: number;
        workdays: number;
    };
    required: {
        attempts: number;
        booked_total: number;
        done_total: number;
        booked_la: number;
        booked_fv: number;
        booked_cad: number;
        done_la: number;
        done_fv: number;
        done_cad: number;
        done_cde: number;
    };
    rates_used: PlanningContext;
    daily: {
        attempts: number;
        booked: number;
        done: number;
        won: number;
    };
    reality_check: {
        growth_factor: number;
        status: 'realistic' | 'ambitious' | 'aggressive';
        avg_monthly_won: number;
        message: string;
    };
}

// --- HELPER: SAFE DIVISION ---
const safeDiv = (n: number, d: number, fallback: number = 0) => d === 0 ? fallback : n / d;

// --- HELPER: ROBUST NUMBER ---
const toNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : n;
};

// --- HELPER: GET ATTEMPTS ---
const getAttempts = (agg: any) => toNumber(agg.calls_total) + toNumber(agg.messages_sent);

// --- HELPER: WORKDAYS CALCULATION (ROBUST INTEGER MATH) ---
export const getRemainingWorkdays = (workdaysPerWeek: number, targetMonth?: string): number => {
    const now = new Date();
    // 1. Get Today components in Rome Time (simulated)
    const romeStr = now.toLocaleString("en-US", {timeZone: "Europe/Rome"});
    const todayRome = new Date(romeStr);
    
    const tYear = todayRome.getFullYear();
    const tMonth = todayRome.getMonth() + 1; // 1-12
    const tDay = todayRome.getDate();
    
    // Key for current month
    const currentMonthKey = `${tYear}-${String(tMonth).padStart(2, '0')}`;
    
    // Key for target
    const targetKey = targetMonth || currentMonthKey;
    const [y, m] = targetKey.split('-').map(Number);

    // CASE A: Past Month
    if (targetKey < currentMonthKey) return 0;

    // CASE B: Determine Start Day
    let startDay = 1;
    // Days in the target month (Day 0 of next month gives last day of current)
    const daysInMonth = new Date(y, m, 0).getDate(); 

    if (targetKey === currentMonthKey) {
        startDay = tDay; // Start counting from today
    }

    // CASE C: Loop Days
    let workdays = 0;
    for (let day = startDay; day <= daysInMonth; day++) {
        // Check day of week
        // Note: Date(y, m-1, day) constructor uses local time, but .getDay() is absolute for the specific date
        // (Days of week don't change with timezone usually unless crossing IDL, safe here)
        const d = new Date(y, m - 1, day);
        const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat

        let isWorkday = false;
        if (workdaysPerWeek === 7) isWorkday = true;
        else if (workdaysPerWeek === 6) isWorkday = (dayOfWeek !== 0); // Mon-Sat
        else isWorkday = (dayOfWeek !== 0 && dayOfWeek !== 6); // Mon-Fri (Default 5)

        if (isWorkday) workdays++;
    }
    
    return workdays;
};

// --- 1. CALCULATE RATES HIERARCHY ---
export const calculateContextRates = (logs: DailyLog[]): PlanningContext => {
    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7); // YYYY-MM
    
    // --- 1. PREPARE DATASETS ---
    const logsMtd = logs.filter(l => l.date.startsWith(currentMonthPrefix));
    
    const cutoff60 = new Date(); cutoff60.setDate(now.getDate() - 60);
    const logs60d = logs.filter(l => new Date(l.date) >= cutoff60);

    const cutoff90 = new Date(); cutoff90.setDate(now.getDate() - 90);
    const logs90d = logs.filter(l => new Date(l.date) >= cutoff90);

    const aggMtd = aggregateLogs(logsMtd);
    const agg60d = aggregateLogs(logs60d);
    const agg90d = aggregateLogs(logs90d);
    const aggAll = aggregateLogs(logs);

    // --- 2. GENERIC CALCULATOR PER PRODUCT ---
    const calculateProductRates = (
        product: 'la' | 'fv' | 'cad', 
        defaultWin: number
    ): ProductRates => {
        
        // Field Names mapping
        const fBooked = `booked_${product}` as keyof DailyLog;
        const fDone = `done_${product}` as keyof DailyLog;
        const fWon = `won_${product}` as keyof DailyLog;

        // --- A. SHOW RATE CALCULATION (Aggressive MTD) ---
        let showRate: RateDetail = { value: DEFAULTS.show_rate, source: 'Standard' };

        // 1. MTD
        if ((aggMtd[fBooked] as number) > 0 && (aggMtd[fDone] as number) > 0) {
            showRate = { 
                value: safeDiv(aggMtd[fDone] as number, aggMtd[fBooked] as number, DEFAULTS.show_rate), 
                source: 'MTD' 
            };
        } 
        // 2. Rolling 60d
        else if ((agg60d[fBooked] as number) > 0 && (agg60d[fDone] as number) > 0) {
            showRate = { 
                value: safeDiv(agg60d[fDone] as number, agg60d[fBooked] as number, DEFAULTS.show_rate), 
                source: '60d' 
            };
        }
        // 3. Rolling 90d
        else if ((agg90d[fBooked] as number) > 0 && (agg90d[fDone] as number) > 0) {
            showRate = { 
                value: safeDiv(agg90d[fDone] as number, agg90d[fBooked] as number, DEFAULTS.show_rate), 
                source: '90d' 
            };
        }
        // 4. All Time
        else if ((aggAll[fBooked] as number) > 0) {
            showRate = { 
                value: safeDiv(aggAll[fDone] as number, aggAll[fBooked] as number, DEFAULTS.show_rate), 
                source: 'All Time' 
            };
        }

        // --- B. WIN RATE CALCULATION (Conservative Fallback) ---
        let winRate: RateDetail = { value: defaultWin, source: 'Standard' };

        // 1. MTD
        if ((aggMtd[fWon] as number) >= 1) {
            winRate = {
                value: safeDiv(aggMtd[fWon] as number, aggMtd[fDone] as number, defaultWin),
                source: 'MTD'
            };
        }
        // 2. Rolling 60d
        else if ((agg60d[fWon] as number) >= 2 || (agg60d[fDone] as number) >= 5) {
            winRate = {
                value: safeDiv(agg60d[fWon] as number, agg60d[fDone] as number, defaultWin),
                source: '60d'
            };
        }
        // 3. Rolling 90d
        else if ((agg90d[fWon] as number) >= 2 || (agg90d[fDone] as number) >= 8) {
             winRate = {
                value: safeDiv(agg90d[fWon] as number, agg90d[fDone] as number, defaultWin),
                source: '90d'
            };
        }
        // 4. All Time
        else if ((aggAll[fDone] as number) >= 5) {
             winRate = {
                value: safeDiv(aggAll[fWon] as number, aggAll[fDone] as number, defaultWin),
                source: 'All Time'
            };
        }

        // Sanity Check
        winRate.value = Math.min(1, winRate.value);
        showRate.value = Math.min(1.5, showRate.value); 

        return { win_rate: winRate, show_rate: showRate };
    };

    // --- 3. ATTEMPTS PER WON (GLOBAL) ---
    let attemptsPerWon: RateDetail = { value: DEFAULTS.attempts_per_won, source: 'Standard' };

    const calcApW = (agg: any) => {
        const attempts = getAttempts(agg);
        const won = toNumber(agg.won_la) + toNumber(agg.won_fv) + toNumber(agg.won_cad);
        return safeDiv(attempts, won, DEFAULTS.attempts_per_won);
    };

    const wonMtd = toNumber(aggMtd.won_la) + toNumber(aggMtd.won_fv) + toNumber(aggMtd.won_cad);
    const won60d = toNumber(agg60d.won_la) + toNumber(agg60d.won_fv) + toNumber(agg60d.won_cad);
    const won90d = toNumber(agg90d.won_la) + toNumber(agg90d.won_fv) + toNumber(agg90d.won_cad);
    const wonAll = toNumber(aggAll.won_la) + toNumber(aggAll.won_fv) + toNumber(aggAll.won_cad);

    if (wonMtd >= 1) {
        attemptsPerWon = { value: calcApW(aggMtd), source: 'MTD' };
    } else if (won60d >= 3) {
        attemptsPerWon = { value: calcApW(agg60d), source: '60d' };
    } else if (won90d >= 5) {
        attemptsPerWon = { value: calcApW(agg90d), source: '90d' };
    } else if (wonAll >= 5) {
        attemptsPerWon = { value: calcApW(aggAll), source: 'All Time' };
    }

    return {
        la: calculateProductRates('la', DEFAULTS.win_rate_la),
        fv: calculateProductRates('fv', DEFAULTS.win_rate_fv),
        cad: calculateProductRates('cad', DEFAULTS.win_rate_cad),
        global: {
            attempts_per_won: attemptsPerWon
        },
        debug: { aggMtd, agg60d, agg90d, aggAll }
    };
};

// --- 2. PLAN ENGINE (REVERSE FUNNEL - MONTHLY REQUIRED) ---
export const calculatePlanEngine = (
    targets: { la: number, fv: number, cad: number, workdays: number },
    ratesContext: PlanningContext,
    logsHistory: DailyLog[],
    simModifiers: { winRatePct: number, showRatePct: number } = { winRatePct: 0, showRatePct: 0 }
): PlanSimulation => {
    
    // Apply Simulation Modifiers
    const winMod = 1 + (simModifiers.winRatePct / 100);
    const showMod = 1 + (simModifiers.showRatePct / 100);

    const getModRates = (pRates: ProductRates) => ({
        win: Math.min(0.99, pRates.win_rate.value * winMod),
        show: Math.min(0.99, pRates.show_rate.value * showMod)
    });

    const la = getModRates(ratesContext.la);
    const fv = getModRates(ratesContext.fv);
    const cad = getModRates(ratesContext.cad);

    // 1. Calculate Needed Done
    const needed_done_la = Math.ceil(safeDiv(targets.la, la.win));
    const needed_done_fv = Math.ceil(safeDiv(targets.fv, fv.win));
    const needed_done_cad = Math.ceil(safeDiv(targets.cad, cad.win));
    const needed_done_total = needed_done_la + needed_done_fv + needed_done_cad;

    // 2. Calculate Needed Booked
    const needed_booked_la = Math.ceil(safeDiv(needed_done_la, la.show));
    const needed_booked_fv = Math.ceil(safeDiv(needed_done_fv, fv.show));
    const needed_booked_cad = Math.ceil(safeDiv(needed_done_cad, cad.show));
    const needed_booked_total = needed_booked_la + needed_booked_fv + needed_booked_cad;

    // 3. Calculate Needed Attempts
    const target_won_total = targets.la + targets.fv + targets.cad;
    const adjusted_attempts_per_won = ratesContext.global.attempts_per_won.value / winMod;
    const needed_attempts = Math.ceil(target_won_total * adjusted_attempts_per_won);

    // 4. Daily Calculation
    const standardDays = 22;

    // 5. Reality Check
    const now = new Date();
    const cutoff90 = new Date(); cutoff90.setDate(now.getDate() - 90);
    const logs90 = logsHistory.filter(l => new Date(l.date) >= cutoff90);
    const agg90 = aggregateLogs(logs90);
    
    const avg_monthly_won = Math.round((toNumber(agg90.won_la) + toNumber(agg90.won_fv) + toNumber(agg90.won_cad)) / 3);
    const effective_avg = avg_monthly_won > 0 ? avg_monthly_won : 1; 
    const growth_factor = target_won_total / effective_avg;
    
    let status: 'realistic' | 'ambitious' | 'aggressive' = 'realistic';
    let message = "Obiettivo in linea con lo storico.";

    if (growth_factor > 1.8) {
        status = 'aggressive';
        message = `Obiettivo molto alto (+${Math.round((growth_factor-1)*100)}% vs media). Richiede sforzo straordinario.`;
    } else if (growth_factor > 1.2) {
        status = 'ambitious';
        message = `Crescita ambiziosa (+${Math.round((growth_factor-1)*100)}% vs media). Ottimo per spingere.`;
    }

    return {
        inputs: {
            target_won_la: targets.la,
            target_won_fv: targets.fv,
            target_won_cad: targets.cad,
            workdays: targets.workdays
        },
        required: {
            attempts: needed_attempts,
            booked_total: needed_booked_total,
            done_total: needed_done_total,
            booked_la: needed_booked_la,
            booked_fv: needed_booked_fv,
            booked_cad: needed_booked_cad,
            done_la: needed_done_la,
            done_fv: needed_done_fv,
            done_cad: needed_done_cad,
            done_cde: 0 // Optional placeholder
        },
        rates_used: ratesContext,
        daily: {
            attempts: Math.ceil(needed_attempts / standardDays),
            booked: parseFloat((needed_booked_total / standardDays).toFixed(1)),
            done: parseFloat((needed_done_total / standardDays).toFixed(1)),
            won: parseFloat((target_won_total / standardDays).toFixed(1))
        },
        reality_check: {
            growth_factor,
            status,
            avg_monthly_won,
            message
        }
    };
};

// --- 3. REMAINING & DAILY PLAN CALCULATOR (ROBUST) ---
export const calculateRemainingPlan = (
    monthlyPlan: PlanSimulation, 
    logsMtd: DailyLog[], 
    monthKey: string, 
    workdaysPerWeek: number
) => {
    // 0. SECURITY FILTER: FORCE FILTER CLIENT-SIDE
    // Even if DB returns wrong data, we filter here to guarantee correctness.
    const safeLogsMtd = logsMtd.filter(l => l.date.startsWith(monthKey));

    // 1. Calculate Remaining Workdays
    const remainingWorkdays = getRemainingWorkdays(workdaysPerWeek, monthKey);
    
    // 2. Actual MTD (Sum from Safe Logs)
    const agg = aggregateLogs(safeLogsMtd);
    
    const actual_attempts = getAttempts(agg);
    const actual_booked = toNumber(agg.booked_la) + toNumber(agg.booked_fv) + toNumber(agg.booked_cad);
    const actual_done = toNumber(agg.done_la) + toNumber(agg.done_fv) + toNumber(agg.done_cad); // Exclude CDE
    const actual_won = toNumber(agg.won_la) + toNumber(agg.won_fv) + toNumber(agg.won_cad);

    // 3. Required Month (Total Needed for Month)
    const req = monthlyPlan.required;
    const target_won_total = monthlyPlan.inputs.target_won_la + monthlyPlan.inputs.target_won_fv + monthlyPlan.inputs.target_won_cad;

    const requiredMonth = {
        attempts: toNumber(req.attempts),
        booked: toNumber(req.booked_total),
        done: toNumber(req.done_total),
        won: toNumber(target_won_total)
    };

    const actualMTD = {
        attempts: actual_attempts,
        booked: actual_booked,
        done: actual_done,
        won: actual_won
    };

    // 4. Remaining (Max 0)
    const remaining = {
        attempts: Math.max(0, requiredMonth.attempts - actualMTD.attempts),
        booked: Math.max(0, requiredMonth.booked - actualMTD.booked),
        done: Math.max(0, requiredMonth.done - actualMTD.done),
        won: Math.max(0, requiredMonth.won - actualMTD.won)
    };

    // 5. Daily Plan (From Today)
    const div = Math.max(1, remainingWorkdays); // Prevent division by zero
    
    const dailyAverage = {
        attempts: remaining.attempts / div,
        booked: remaining.booked / div,
        done: remaining.done / div,
        won: remaining.won / div
    };

    const dailyPlan = {
        attempts: remainingWorkdays > 0 ? Math.ceil(dailyAverage.attempts) : 0,
        booked: remainingWorkdays > 0 ? Math.ceil(dailyAverage.booked) : 0,
        done: remainingWorkdays > 0 ? Math.ceil(dailyAverage.done) : 0,
        won: remainingWorkdays > 0 ? Math.ceil(dailyAverage.won) : 0
    };

    // --- DEBUG INFO FOR DATE RANGE CHECK ---
    const sortedLogs = [...safeLogsMtd].sort((a, b) => a.date.localeCompare(b.date));
    const minLogDate = sortedLogs.length > 0 ? sortedLogs[0].date : 'N/A';
    const maxLogDate = sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1].date : 'N/A';

    const [y, m] = monthKey.split('-').map(Number);
    const theoryStart = `${y}-${String(m).padStart(2, '0')}-01`;
    
    let ny = y, nm = m + 1;
    if (nm > 12) { nm = 1; ny++; }
    const theoryEndExclusive = `${ny}-${String(nm).padStart(2, '0')}-01`;

    const isOutOfRange = (minLogDate !== 'N/A' && minLogDate < theoryStart) || 
                         (maxLogDate !== 'N/A' && maxLogDate >= theoryEndExclusive);

    const samples = sortedLogs.slice(0, 3).map(l => ({
        date: l.date,
        attempts: (l.calls_total || 0) + (l.messages_sent || 0)
    }));

    const debug = {
        monthKey,
        workdays_remaining: remainingWorkdays,
        requiredMonth,
        actualMTD,
        remaining,
        dailyAverage,
        dailyPlan,
        logsCount: safeLogsMtd.length,
        range: {
           expectedStart: theoryStart,
           expectedEndExclusive: theoryEndExclusive,
           actualMinDate: minLogDate,
           actualMaxDate: maxLogDate,
           isOutOfRange
        },
        samples
    };

    return {
        remaining_workdays: remainingWorkdays,
        dailyPlan,      
        dailyAverage, // New: Exact averages
        requiredMonth,  
        actualMTD,      
        remaining,      
        debug
    };
};

// --- 4. DAILY PLAN CALCULATOR (FOR DASHBOARD CARD) ---
export const calculateDailyPlan = (allLogs: DailyLog[], plan: MonthlyPlan) => {
    const is_target_set = (plan.target_won_la_month + plan.target_won_fv_month + plan.target_won_cad_month) > 0;
    
    // 1. Calculate Rates based on full history
    const ratesContext = calculateContextRates(allLogs);
    
    // 2. Run the Plan Engine
    const simulation = calculatePlanEngine(
        {
            la: plan.target_won_la_month,
            fv: plan.target_won_fv_month,
            cad: plan.target_won_cad_month,
            workdays: plan.workdays_per_week
        },
        ratesContext,
        allLogs
    );

    // 3. Filter logs for this month (Dashboard usually runs on current month)
    const logsMtd = allLogs.filter(l => l.date.startsWith(plan.month));
    const agg = aggregateLogs(logsMtd);

    // 4. Use the robust calculator
    const result = calculateRemainingPlan(
        simulation,
        logsMtd,
        plan.month,
        plan.workdays_per_week
    );
    
    // Leads logic (simple subtraction)
    const target_leads = toNumber(plan.target_new_leads_month);
    const rem_leads = Math.max(0, target_leads - toNumber(agg.new_leads));
    const div = Math.max(1, result.remaining_workdays);
    const daily_leads = result.remaining_workdays > 0 ? Math.ceil(rem_leads / div) : 0;

    return {
        is_target_set,
        remaining_workdays: result.remaining_workdays,
        warning_capacity_exceeded: plan.daily_call_capacity > 0 && result.dailyPlan.attempts > plan.daily_call_capacity,
        
        // Daily Targets
        daily_attempts: result.dailyPlan.attempts,
        daily_booked: result.dailyPlan.booked,
        daily_done: result.dailyPlan.done,
        daily_won: result.dailyPlan.won,
        daily_leads,

        // Debug/Progress Data
        month_total: {
            attempts: result.requiredMonth.attempts,
            booked: result.requiredMonth.booked,
            done: result.requiredMonth.done,
            won: result.requiredMonth.won,
            leads: target_leads
        },
        mtd_actual: {
            attempts: result.actualMTD.attempts,
            booked: result.actualMTD.booked,
            done: result.actualMTD.done,
            won: result.actualMTD.won,
            leads: toNumber(agg.new_leads)
        }
    };
};
