
// Utility per gestire le date forzando il fuso orario Europe/Rome

export const getTodayDateRome = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' }); // YYYY-MM-DD
};

export const getCurrentHourRome = (): number => {
  const now = new Date().toLocaleTimeString('en-US', { 
    timeZone: 'Europe/Rome', 
    hour12: false, 
    hour: 'numeric' 
  });
  return parseInt(now, 10);
};

export const formatRomeTime = (date: Date): string => {
    return date.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' });
};

// Logica Reminder
export const getReminderLevel = (): 'none' | 'soft' | 'strong' | 'hard' => {
    const hour = getCurrentHourRome();
    
    // Hard: Dopo le 23:00
    if (hour >= 23) return 'hard';
    
    // Strong: Dopo le 21:00
    if (hour >= 21) return 'strong';
    
    // Soft: Dopo le 18:00
    if (hour >= 18) return 'soft';
    
    return 'none';
};

// Gestione Snooze (LocalStorage)
export const isSnoozed = (userId: string, date: string): boolean => {
    const key = `reminder_snooze_${date}_${userId}`;
    const snoozeUntil = localStorage.getItem(key);
    if (!snoozeUntil) return false;
    
    // Se timestamp snooze > adesso, è ancora snoozed
    return parseInt(snoozeUntil, 10) > Date.now();
};

export const setSnooze = (userId: string, date: string, minutes: number | 'skip_day') => {
    const key = `reminder_snooze_${date}_${userId}`;
    
    if (minutes === 'skip_day') {
        // Snooze fino a domani mattina (es. 6 AM del giorno dopo, o semplicemente infinito per oggi)
        // Mettiamo 24h per sicurezza
        const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem(key, tomorrow.toString());
    } else {
        const until = Date.now() + minutes * 60 * 1000;
        localStorage.setItem(key, until.toString());
    }
};
