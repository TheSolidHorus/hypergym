import { useState, useEffect, useRef } from 'react';

export default function RecoveryTimer({ trigger = null }) {
    const [timeLeft, setTimeLeft] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Audio ref
    const audioContextRef = useRef(null);

    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            playAlarm();
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const playAlarm = () => {
        if (isMuted) return;

        // Simple Beep via Web Audio API (no external file needed)
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }
            const ctx = audioContextRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);

            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    const startTimer = (seconds) => {
        setTimeLeft(seconds);
        setIsActive(true);
        setIsOpen(false); // Minimized view

        // Init audio context on user gesture
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };

    // Listen to external trigger
    useEffect(() => {
        if (trigger && trigger.timestamp) {
            startTimer(trigger.time);
        }
    }, [trigger]);

    const stopTimer = () => {
        setIsActive(false);
        setTimeLeft(null);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Minimized View (Floating Pill)
    if (isActive) {
        return (
            <div className="fixed bottom-[88px] right-4 z-50 animate-in slide-in-from-bottom-5">
                <div className="bg-white border border-slate-200 shadow-xl rounded-full flex items-center p-1.5 pr-5 gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-inner animate-pulse">
                        <span className="material-symbols-outlined text-[24px]">timer</span>
                    </div>
                    <span className="font-sans text-2xl font-black italic tracking-tighter text-slate-900 tabular-nums">
                        {formatTime(timeLeft)}
                    </span>
                    <button onClick={stopTimer} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors ml-2">
                        <span className="material-symbols-outlined text-[20px] block">close</span>
                    </button>
                </div>
            </div>
        );
    }

    // Expanded/Collapsed View (Button to start)
    if (!isOpen) {
        return (
            <div className="fixed bottom-[88px] right-4 z-50">
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-16 h-16 bg-white border border-slate-200 shadow-xl rounded-full flex items-center justify-center text-primary hover:scale-105 transition-transform active:scale-95"
                >
                    <span className="material-symbols-outlined text-[32px]">timer</span>
                </button>
            </div>
        );
    }

    // Modal Selection
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
            <div className="bg-white border-t border-slate-200 p-8 w-full rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-10 relative" onClick={e => e.stopPropagation()}>
                
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 rounded-full"></div>

                <div className="flex justify-between items-center mb-6 pt-2">
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[32px] text-primary">timer</span> Recupero
                    </h3>
                    <button onClick={() => setIsMuted(!isMuted)} className="p-3 bg-slate-50 border border-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors shadow-sm">
                        {isMuted ? <span className="material-symbols-outlined text-[20px] block">volume_off</span> : <span className="material-symbols-outlined text-[20px] block">volume_up</span>}
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    {[60, 90, 120, 180, 240, 300].map(sec => (
                        <button
                            key={sec}
                            onClick={() => startTimer(sec)}
                            className="bg-white hover:bg-primary/5 py-5 rounded-2xl font-black italic tracking-tighter text-2xl text-slate-800 border-2 border-slate-100 hover:border-primary/30 active:scale-95 transition-all shadow-sm"
                        >
                            {Math.floor(sec / 60)}:{(sec % 60).toString().padStart(2, '0')}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setIsOpen(false)}
                    className="w-full py-5 bg-slate-50 border border-slate-200 text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-colors hover:bg-slate-100 active:bg-slate-200"
                >
                    Chiudi
                </button>
            </div>
        </div>
    );
}
