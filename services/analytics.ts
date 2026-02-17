
import { DailyLog, KPIReport, INITIAL_LOG } from '../types';

// Helper: Safe division returning 0 or N/A logic (handled in UI usually, here returns 0 for safety)
const safeDiv = (num: number, den: number): number => (den === 0 ? 0 : num / den);

// Helper: Date util
const isSameDay = (d1: Date, d2: Date) => 
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
  return new Date(d.setDate(diff));
};

const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

// Filter Logs by Period
export const filterLogsByPeriod = (logs: DailyLog[], period: 'today' | 'week' | 'month' | 'custom', customStart?: string, customEnd?: string): DailyLog[] => {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  return logs.filter(log => {
    const logDate = new Date(log.date);
    logDate.setHours(0,0,0,0);

    switch (period) {
      case 'today':
        return isSameDay(logDate, today);
      case 'week':
        const startWeek = getStartOfWeek(today);
        startWeek.setHours(0,0,0,0);
        return logDate >= startWeek && logDate <= today;
      case 'month':
        const startMonth = getStartOfMonth(today);
        startMonth.setHours(0,0,0,0);
        return logDate >= startMonth && logDate <= today;
      case 'custom':
        if (!customStart || !customEnd) return true;
        const start = new Date(customStart); start.setHours(0,0,0,0);
        const end = new Date(customEnd); end.setHours(23,59,59,999);
        return logDate >= start && logDate <= end;
      default:
        return true;
    }
  });
};

// Core KPI Calculation
export const calculateKPIs = (data: DailyLog): KPIReport => {
  const booked_total = data.booked_la + data.booked_fv + data.booked_cad;
  const done_total_sales = data.done_la + data.done_fv + data.done_cad;
  const won_total = data.won_la + data.won_fv + data.won_cad;

  const answer_rate = safeDiv(data.calls_answered, data.calls_total);
  const refused_rate = safeDiv(data.calls_refused, data.calls_total);
  const no_answer_rate = safeDiv(data.calls_no_answer, data.calls_total);
  const contact_efficiency = safeDiv(data.calls_answered + data.messages_sent, data.calls_total);
  const messages_per_call = safeDiv(data.messages_sent, data.calls_total);
  
  const booking_rate = safeDiv(booked_total, data.calls_answered + data.messages_sent);
  const show_rate = safeDiv(done_total_sales, booked_total);
  const win_rate = safeDiv(won_total, done_total_sales);

  const win_rate_la = safeDiv(data.won_la, data.done_la);
  const win_rate_fv = safeDiv(data.won_fv, data.done_fv);
  const win_rate_cad = safeDiv(data.won_cad, data.done_cad);

  const calls_completion = safeDiv(data.calls_total, data.target_calls);
  const booked_completion = safeDiv(booked_total, data.target_booked);
  const won_completion = safeDiv(won_total, data.target_won);

  const volume_score = Math.min(calls_completion, 1) * 40;
  const total_score = Math.min(calls_completion, 1) * 40 + (booking_rate * 30) + (win_rate * 30);
  
  let score_label = 'Sotto Standard';
  let score_color = 'text-red-600';
  if (total_score >= 80) {
    score_label = 'Eccellente';
    score_color = 'text-green-600';
  } else if (total_score >= 60) {
    score_label = 'Buono';
    score_color = 'text-yellow-600';
  }

  return {
    totals: data,
    rates: {
      answer_rate,
      refused_rate,
      no_answer_rate,
      contact_efficiency,
      messages_per_call,
      booking_rate,
      show_rate,
      win_rate,
      win_rate_la,
      win_rate_fv,
      win_rate_cad,
    },
    targets: {
      calls_completion,
      booked_completion,
      won_completion,
    },
    mental: {
      avg_energy: data.energy_level,
      avg_focus: data.focus_level,
      avg_confidence: data.confidence_level,
    },
    score: {
      volume_score: volume_score,
      booking_score: booking_rate * 30,
      win_score: win_rate * 30,
      total_score,
      label: score_label,
      color: score_color,
    }
  };
};

export const aggregateLogs = (logs: DailyLog[]): DailyLog => {
  if (logs.length === 0) return { ...INITIAL_LOG, date: 'N/A' };

  const acc = logs.reduce((sum, log) => ({
    ...sum,
    calls_total: sum.calls_total + log.calls_total,
    calls_refused: sum.calls_refused + log.calls_refused,
    calls_no_answer: sum.calls_no_answer + log.calls_no_answer,
    calls_answered: sum.calls_answered + log.calls_answered,
    messages_sent: sum.messages_sent + log.messages_sent,
    booked_la: sum.booked_la + log.booked_la,
    booked_fv: sum.booked_fv + log.booked_fv,
    booked_cad: sum.booked_cad + log.booked_cad,
    new_leads: sum.new_leads + log.new_leads,
    done_la: sum.done_la + log.done_la,
    done_fv: sum.done_fv + log.done_fv,
    done_cad: sum.done_cad + log.done_cad,
    done_cde: sum.done_cde + log.done_cde,
    won_la: sum.won_la + log.won_la,
    won_fv: sum.won_fv + log.won_fv,
    won_cad: sum.won_cad + log.won_cad,
    target_calls: sum.target_calls + log.target_calls,
    target_booked: sum.target_booked + log.target_booked,
    target_won: sum.target_won + log.target_won,
    energy_level: sum.energy_level + log.energy_level,
    focus_level: sum.focus_level + log.focus_level,
    confidence_level: sum.confidence_level + log.confidence_level,
  }), { ...INITIAL_LOG, date: 'AGGREGATE' });

  acc.energy_level = Math.round(acc.energy_level / logs.length);
  acc.focus_level = Math.round(acc.focus_level / logs.length);
  acc.confidence_level = Math.round(acc.confidence_level / logs.length);

  return acc;
};

// --- NEW STRATEGIC ANALYTICS ---

export interface ProductKPIs {
  booked: number;
  done: number;
  won: number;
  show_rate: number;
  win_rate: number;
  calls_per_won: number; // Estimated
}

export interface StrategicInsights {
  bottleneck: string;
  best_product: string;
  worst_product: string;
  alerts: { type: 'danger' | 'warning' | 'success', message: string, metric: string }[];
  general_status: {
    performance: 'Crescita' | 'Stabile' | 'Calo';
    intensity: 'Alta' | 'Media' | 'Bassa';
    effectiveness: 'Alta' | 'Bassa';
  };
}

// --- AI COACH ANALYTICS ---

export interface AIAnalysisResult {
    diagnosis: string;
    whats_working: string;
    critical_area: string;
    actions: string[];
    priority: string;
    team_reading?: string; // Only for Admin/Coach
}

export const getProductBreakdown = (agg: DailyLog): Record<'la' | 'fv' | 'cad', ProductKPIs> => {
  const calc = (booked: number, done: number, won: number) => ({
    booked, done, won,
    show_rate: safeDiv(done, booked),
    win_rate: safeDiv(won, done),
    calls_per_won: safeDiv(agg.calls_total, won) // Global calls allocated to product won (approximation)
  });

  return {
    la: calc(agg.booked_la, agg.done_la, agg.won_la),
    fv: calc(agg.booked_fv, agg.done_fv, agg.won_fv),
    cad: calc(agg.booked_cad, agg.done_cad, agg.won_cad)
  };
};

export const generateAIAnalysis = (
    metrics: any, 
    userRole: string,
    teamMembersCount?: number
): AIAnalysisResult => {
    const { spa, products, closing, insights } = metrics;
    
    // 1. Identify Bottleneck (Priority Order)
    let bottleneckType: 'volume' | 'booking' | 'show' | 'closing' | 'none' = 'none';
    if (spa.total_contacts < 15) bottleneckType = 'volume';
    else if (spa.booking_rate < 0.15) bottleneckType = 'booking'; // < 15% booking
    else if (closing.show_rate < 0.60) bottleneckType = 'show';   // < 60% show
    else if (closing.win_rate < 0.20) bottleneckType = 'closing'; // < 20% closing
    else bottleneckType = 'none';

    // 2. Identify Products
    const prodList = [
        { name: 'Luce Amica', id: 'LA', ...products.la },
        { name: 'Fotovoltaico', id: 'FV', ...products.fv },
        { name: 'Adesione', id: 'CAD', ...products.cad }
    ].sort((a,b) => (b.win_rate * 100 + b.show_rate * 50) - (a.win_rate * 100 + a.show_rate * 50));

    const bestProd = prodList[0];
    const worstProd = prodList[2];

    // 3. Generate Content
    let diagnosis = "";
    let critical_area = "";
    let actions: string[] = [];
    let priority = "";

    switch (bottleneckType) {
        case 'volume':
            diagnosis = "Il motore è spento. Non stai parlando con abbastanza persone.";
            critical_area = `Hai fatto solo ${spa.total_contacts} contatti utili. Sotto i 15/giorno la statistica non lavora per te.`;
            actions = [
                "Blocca 2 slot da 90 min/giorno in agenda (Deep Work).",
                "Recupera lista vecchi lead/clienti e fai giro chiamate.",
                "Smetti di studiare, inizia a chiamare."
            ];
            priority = "Obiettivo: +50% volume tentativi domani.";
            break;
        case 'booking':
            diagnosis = `Stai bruciando contatti. Il Booking Rate (${(spa.booking_rate*100).toFixed(0)}%) è insufficiente.`;
            critical_area = "Le persone rispondono ma non fissano. Il problema è lo script o la tua tonalità.";
            actions = [
                "Registra le tue chiamate e riascoltane 3 critiche.",
                "Fai roleplay con lo sponsor sullo script di approccio.",
                "Smetti di 'spiegare' al telefono. Vendi solo l'appuntamento."
            ];
            priority = "Focus: Migliorare script apertura e gestione obiezioni.";
            break;
        case 'show':
            diagnosis = `Hai troppi 'No-Show'. Il ${((1-closing.show_rate)*100).toFixed(0)}% delle persone ti da buca.`;
            critical_area = "Non stai vendendo il valore dell'incontro. L'appuntamento è percepito come facoltativo.";
            actions = [
                "Invia video/materiale pre-meeting per alzare l'impegno.",
                "Usa la tecnica del 'Doppio Sì' per confermare l'orario.",
                "Chiama 2h prima per riconferma (o messaggio audio)."
            ];
            priority = "Priorità: Alzare Show Rate sopra il 60% subito.";
            break;
        case 'closing':
            diagnosis = `Arrivi al dunque ma non chiudi. Win Rate basso (${(closing.win_rate*100).toFixed(0)}%).`;
            critical_area = `Porti le persone in fondo ma esitano. Problema di closing o pre-qualifica su ${worstProd.name}.`;
            actions = [
                "Usa domande di chiusura diretta ('C'è qualche motivo per non iniziare?').",
                "Verifica budget/decisore PRIMA di presentare l'offerta.",
                "Allenati sulla gestione dell'obiezione 'Ci devo pensare'."
            ];
            priority = `Focus: Chiudere almeno 1 contratto ${worstProd.name} entro 48h.`;
            break;
        default:
            diagnosis = "Macchina ben oliata. Sei in fase di SCALING.";
            critical_area = "Nessuna criticità grave. Attento a non abbassare la qualità aumentando i volumi.";
            actions = [
                "Aumenta volume del 20% per testare il punto di rottura.",
                "Inizia a formare un nuovo membro del team sul tuo metodo.",
                "Alza il ticket medio (Cross-sell)."
            ];
            priority = "Obiettivo: Mantenere queste costanti per 7 giorni.";
            break;
    }

    // Whats Working
    const whats_working = bestProd.done > 0 
        ? `${bestProd.name} è il tuo traino: WR ${(bestProd.win_rate*100).toFixed(0)}% e Show Rate ${(bestProd.show_rate*100).toFixed(0)}%.`
        : "Ancora pochi dati per definire un prodotto 'Star'. Continua a spingere.";

    // Team Reading (Only for Admin/Coach)
    let team_reading = undefined;
    if (userRole === 'admin' || userRole === 'coach') {
        team_reading = teamMembersCount && teamMembersCount > 0 
            ? "Il team ha bisogno di direzione. Verifica chi ha 'Traffic Light' rossa."
            : "Team in fase di costruzione. Focalizzati sul 'Lead by Example'.";
        
        if (bottleneckType === 'none') {
            team_reading = "Tu stai volando. Ora duplicati: prendi il tuo top performer e insegnagli ESATTAMENTE cosa fai.";
        }
    }

    return {
        diagnosis,
        whats_working,
        critical_area,
        actions,
        priority,
        team_reading
    };
};

export const getStrategicInsights = (currentLogs: DailyLog[], allLogs: DailyLog[]): StrategicInsights => {
  const agg = aggregateLogs(currentLogs);
  const products = getProductBreakdown(agg);
  
  // 1. Calculate Baselines (Last 30 days)
  const today = new Date();
  const date30DaysAgo = new Date(); date30DaysAgo.setDate(today.getDate() - 30);
  const prevLogs = allLogs.filter(l => new Date(l.date) >= date30DaysAgo);
  const prevAgg = aggregateLogs(prevLogs);
  const prevProducts = getProductBreakdown(prevAgg);

  const alerts: StrategicInsights['alerts'] = [];

  // 2. Identify Bottlenecks
  const contacts = agg.calls_answered + agg.messages_sent;
  const booked_total = agg.booked_la + agg.booked_fv + agg.booked_cad;
  const done_total = agg.done_la + agg.done_fv + agg.done_cad;
  const won_total = agg.won_la + agg.won_fv + agg.won_cad;

  const booking_rate = safeDiv(booked_total, contacts);
  const show_rate = safeDiv(done_total, booked_total);
  const win_rate = safeDiv(won_total, done_total);

  let bottleneck = "Nessun dato sufficiente";

  if (contacts < 20 && currentLogs.length > 0) bottleneck = "Volume Tentativi Basso";
  else if (booking_rate < 0.10) bottleneck = "Qualità Script / Booking";
  else if (show_rate < 0.50) bottleneck = "No-Show / Conferme";
  else if (win_rate < 0.20) bottleneck = "Chiusura / Negoziazione";
  else bottleneck = "Scaling (Aumentare Volume)";

  // 3. Product Analysis
  const productPerformance = [
    { name: 'Luce Amica', code: 'la', score: products.la.win_rate * 100 + products.la.show_rate * 50 },
    { name: 'Fotovoltaico', code: 'fv', score: products.fv.win_rate * 100 + products.fv.show_rate * 50 },
    { name: 'CAD', code: 'cad', score: products.cad.win_rate * 100 + products.cad.show_rate * 50 }
  ].sort((a, b) => b.score - a.score);

  const best_product = productPerformance[0].score > 0 ? productPerformance[0].name : 'N/A';
  const worst_product = productPerformance[2].score > 0 ? productPerformance[2].name : 'N/A';

  // 4. Generate Alerts based on Deltas vs 30d Average
  const prev_booking_rate = safeDiv(prevAgg.booked_la + prevAgg.booked_fv + prevAgg.booked_cad, prevAgg.calls_answered + prevAgg.messages_sent);
  const prev_win_rate = safeDiv(prevAgg.won_la + prevAgg.won_fv + prevAgg.won_cad, prevAgg.done_la + prevAgg.done_fv + prevAgg.done_cad);

  // Alert Rules
  if (booking_rate < prev_booking_rate * 0.8 && booked_total > 0) {
    alerts.push({ type: 'danger', message: 'Booking Rate in calo drastico', metric: `${(booking_rate*100).toFixed(0)}%` });
  }
  if (win_rate > prev_win_rate * 1.1 && won_total > 0) {
    alerts.push({ type: 'success', message: 'Win Rate sopra la media', metric: `+${((win_rate - prev_win_rate)*100).toFixed(0)}%` });
  }
  
  // Specific Product Alerts
  if (products.fv.show_rate < 0.5 && products.fv.booked > 2) {
    alerts.push({ type: 'warning', message: 'FV: Show Rate critico', metric: `${(products.fv.show_rate*100).toFixed(0)}%` });
  }
  if (products.la.win_rate < 0.2 && products.la.done > 2) {
    alerts.push({ type: 'warning', message: 'LA: Chiusura debole', metric: `${(products.la.win_rate*100).toFixed(0)}%` });
  }

  if (alerts.length === 0) {
     alerts.push({ type: 'success', message: 'Performance stabili', metric: 'OK' });
  }

  // 5. General Status
  const won_daily_avg = safeDiv(won_total, currentLogs.length || 1);
  const prev_won_daily_avg = safeDiv(prevAgg.won_la + prevAgg.won_fv + prevAgg.won_cad, prevLogs.length || 1);
  
  let performance: 'Crescita' | 'Stabile' | 'Calo' = 'Stabile';
  if (won_daily_avg > prev_won_daily_avg * 1.1) performance = 'Crescita';
  else if (won_daily_avg < prev_won_daily_avg * 0.9) performance = 'Calo';

  const avg_calls = safeDiv(agg.calls_total, currentLogs.length || 1);
  let intensity: 'Alta' | 'Media' | 'Bassa' = 'Media';
  if (avg_calls > 60) intensity = 'Alta';
  else if (avg_calls < 30) intensity = 'Bassa';

  return {
    bottleneck,
    best_product,
    worst_product,
    alerts: alerts.slice(0, 3), // Top 3 alerts
    general_status: {
      performance,
      intensity,
      effectiveness: win_rate > 0.25 ? 'Alta' : 'Bassa'
    }
  };
};

export const getDashboardMetrics = (filteredLogs: DailyLog[], allLogs: DailyLog[]) => {
  const agg = aggregateLogs(filteredLogs);
  const products = getProductBreakdown(agg);
  const insights = getStrategicInsights(filteredLogs, allLogs);

  const booked_total = agg.booked_la + agg.booked_fv + agg.booked_cad;
  const done_total_sales = agg.done_la + agg.done_fv + agg.done_cad;
  const won_total = agg.won_la + agg.won_fv + agg.won_cad;
  const contacts_made = agg.calls_answered + agg.messages_sent;

  const contact_efficiency = safeDiv(contacts_made, agg.calls_total);
  const booking_rate = safeDiv(booked_total, contacts_made);
  const win_rate = safeDiv(won_total, done_total_sales);
  const calls_per_won = safeDiv(agg.calls_total, won_total);
  const calls_per_booked = safeDiv(agg.calls_total, booked_total);

  // Trend Won (Last 7 vs Prev 7)
  const today = new Date();
  const last7Start = new Date(); last7Start.setDate(today.getDate() - 6); last7Start.setHours(0,0,0,0);
  const prev7Start = new Date(); prev7Start.setDate(today.getDate() - 13); prev7Start.setHours(0,0,0,0);
  const prev7End = new Date(); prev7End.setDate(today.getDate() - 7); prev7End.setHours(23,59,59,999);

  const logsLast7 = allLogs.filter(l => {
    const d = new Date(l.date);
    return d >= last7Start && d <= today;
  });
  
  const logsPrev7 = allLogs.filter(l => {
    const d = new Date(l.date);
    return d >= prev7Start && d <= prev7End;
  });

  const aggLast7 = aggregateLogs(logsLast7);
  const aggPrev7 = aggregateLogs(logsPrev7);

  const won_last7 = aggLast7.won_la + aggLast7.won_fv + aggLast7.won_cad;
  const won_prev7 = aggPrev7.won_la + aggPrev7.won_fv + aggPrev7.won_cad;

  let trend_won_direction: 'up' | 'down' | 'stable' = 'stable';
  const diff_won = won_last7 - won_prev7;
  const pct_change_won = won_prev7 === 0 ? (won_last7 > 0 ? 100 : 0) : (diff_won / won_prev7) * 100;
  
  if (pct_change_won > 10) trend_won_direction = 'up';
  else if (pct_change_won < -10) trend_won_direction = 'down';

  return {
    insights,
    products,
    spa: {
      total_contacts: agg.calls_total,
      calls_answered: agg.calls_answered,
      calls_no_answer: agg.calls_no_answer,
      calls_refused: agg.calls_refused,
      contact_efficiency,
      booked_total,
      booking_rate,
      calls_per_booked,
      response_rate: safeDiv(agg.calls_answered, agg.calls_total)
    },
    performance: {
      done_total_sales,
      won_total,
      calls_per_won,
      new_leads: agg.new_leads
    },
    closing: {
      win_rate,
      show_rate: safeDiv(done_total_sales, booked_total),
      won_last7_count: won_last7,
      trend_won_direction,
      trend_pct: pct_change_won
    },
    funnel: {
      calls: agg.calls_total,
      contacts: contacts_made,
      booked: booked_total,
      done: done_total_sales,
      won: won_total,
      conv_contact: safeDiv(contacts_made, agg.calls_total),
      conv_booking: safeDiv(booked_total, contacts_made),
      conv_show: safeDiv(done_total_sales, booked_total),
      conv_win: safeDiv(won_total, done_total_sales)
    }
  };
};
