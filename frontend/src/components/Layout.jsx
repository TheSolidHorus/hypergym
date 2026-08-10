import { Outlet, NavLink } from "react-router-dom";
import { useStore } from "../lib/store";

export default function Layout() {
    const { userProfile } = useStore();
    const isStaff = userProfile.role === 'admin' || userProfile.role === 'trainer';

    return (
        <div className="flex flex-col h-[100dvh] bg-background text-foreground antialiased font-display selection:bg-primary selection:text-white">
            {/* Content Area */}
            <main className="flex-1 overflow-y-auto pb-20 no-scrollbar">
                <Outlet />
            </main>

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card/90 backdrop-blur-xl border-t border-border px-6 py-3 pb-6 flex justify-between items-center z-50">

                <NavLink
                    to="/"
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? "text-foreground font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "text-slate-400 hover:text-slate-200"}`
                    }
                >
                    <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>grid_view</span>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Pannello</span>
                </NavLink>

                {/* Esercizi - Solo Utenti Normali */}
                {!isStaff && (
                    <NavLink
                        to="/plans"
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? "text-foreground font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "text-slate-400 hover:text-slate-200"}`
                        }
                    >
                        <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Esercizi</span>
                    </NavLink>
                )}

                {/* Community - Visibile a TUTTI */}
                <NavLink
                    to="/community"
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? "text-foreground font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "text-slate-400 hover:text-slate-200"}`
                    }
                >
                    <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Community</span>
                </NavLink>

                {/* Progressi - Solo Utenti Normali */}
                {!isStaff && (
                    <NavLink
                        to="/progress"
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? "text-foreground font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "text-slate-400 hover:text-slate-200"}`
                        }
                    >
                        <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Progressi</span>
                    </NavLink>
                )}

                <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? "text-foreground font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "text-slate-400 hover:text-slate-200"}`
                    }
                >
                    <span className="material-symbols-outlined text-[28px]">person</span>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Profilo</span>
                </NavLink>

            </nav>
        </div>
    );
}
