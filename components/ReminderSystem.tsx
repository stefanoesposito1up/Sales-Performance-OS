
import React, { useState, useEffect } from 'react';
import { DailyLog } from '../types';
import { getTodayDateRome, getReminderLevel, isSnoozed, setSnooze } from '../services/dateUtils';
import { CloseDayWizard } from './CloseDayWizard';
import { AlertTriangle, Clock, X, Zap } from 'lucide-react';

interface Props {
    userId: string;
    logs: DailyLog[];
    onLogSaved: () => void;
}

export const ReminderSystem: React.FC<Props> = ({ userId, logs, onLogSaved }) => {
    const [level, setLevel] = useState<'none' | 'soft' | 'strong' | 'hard'>('none');
    const [showModal, setShowModal] = useState(false);
    const [showWizard, setShowWizard] = useState(false);

    // Check Logic
    useEffect(() => {
        const check = () => {
            const todayStr = getTodayDateRome();
            // Check if log exists
            const hasLog = logs.some(l => l.date === todayStr);
            if (hasLog) {
                setLevel('none');
                setShowModal(false);
                return;
            }

            // Check snooze
            if (isSnoozed(userId, todayStr)) {
                setLevel('none'); // Snoozed means quiet
                return;
            }

            // Determine level
            const currentLevel = getReminderLevel();
            setLevel(currentLevel);

            // Auto-open logic for Strong/Hard (Only once per session ideally, but for now reactive)
            if (currentLevel === 'strong' || currentLevel === 'hard') {
                setShowModal(true);
            }
        };

        // Run on mount
        check();

        // Run every minute
        const interval = setInterval(check, 60000);
        return () => clearInterval(interval);
    }, [logs, userId]);

    // Handlers
    const handleSnooze = (minutes: number | 'skip_day') => {
        const todayStr = getTodayDateRome();
        setSnooze(userId, todayStr, minutes);
        setShowModal(false);
        setLevel('none'); // Hide banner immediately
    };

    const handleOpenWizard = () => {
        setShowModal(false);
        setShowWizard(true);
    };

    const handleSuccess = () => {
        setShowWizard(false);
        onLogSaved();
        // Force refresh logic via parent update
        alert("Giornata Chiusa con Successo! 🚀");
    };

    if (showWizard) {
        return <CloseDayWizard userId={userId} onClose={() => setShowWizard(false)} onSuccess={handleSuccess} />;
    }

    return (
        <>
            {/* SOFT REMINDER: Banner */}
            {level === 'soft' && !showModal && (
                <div className="fixed bottom-24 left-4 right-4 z-40 animate-in slide-in-from-bottom-4">
                    <div className="glass-panel p-4 rounded-xl border-l-4 border-yellow-500 shadow-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="text-yellow-500" />
                            <div>
                                <div className="font-bold text-white text-sm">Chiusura Giornaliera</div>
                                <div className="text-xs text-slate-400">Non hai ancora compilato i dati di oggi.</div>
                            </div>
                        </div>
                        <button 
                            onClick={handleOpenWizard}
                            className="bg-yellow-500 text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-yellow-400 transition-colors"
                        >
                            Compila Ora
                        </button>
                    </div>
                </div>
            )}

            {/* STRONG/HARD REMINDER: Modal */}
            {showModal && (level === 'strong' || level === 'hard') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-sm glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl relative">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <Zap className="text-blue-400" size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                {level === 'hard' ? "⚠️ Chiusura Obbligatoria" : "🌙 Chiusura Giornata"}
                            </h2>
                            <p className="text-sm text-slate-400">
                                {level === 'hard' 
                                    ? "Sono passate le 23:00. È necessario registrare i dati per la compliance del team."
                                    : "La giornata sta finendo. Prenditi 60 secondi per registrare i tuoi numeri."}
                            </p>
                        </div>

                        <button 
                            onClick={handleOpenWizard}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg mb-3 flex items-center justify-center gap-2"
                        >
                            <Zap size={18} /> Compila Adesso
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => handleSnooze(15)}
                                className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                            >
                                <Clock size={12}/> Tra 15 min
                            </button>
                            <button 
                                onClick={() => handleSnooze('skip_day')}
                                className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                            >
                                Non oggi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
