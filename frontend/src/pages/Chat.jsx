import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";

export default function Chat() {
    const { contactId } = useParams();
    const navigate = useNavigate();
    const { userProfile, chatMessages, fetchChatMessages, sendMessage, subscribeToChat } = useStore();
    const [targetUser, setTargetUser] = useState(null);
    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isChatHome, setIsChatHome] = useState(false);
    const [chatList, setChatList] = useState([]);

    useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data?.user) setCurrentUserId(data.user.id); }); }, []);

    useEffect(() => {
        async function identifyTarget() {
            if (!userProfile) return;
            setLoading(true);
            let targetId = contactId;
            if (!targetId) {
                setIsChatHome(true);
                // Recupera l'ID reale dell'utente autenticato (userProfile.id non è mai impostato nello store)
                const { data: { user } } = await supabase.auth.getUser();
                let query = supabase.from('profiles').select('id, name, role');
                if (user) query = query.neq('id', user.id);
                if (!['admin', 'trainer', 'coach'].includes(userProfile.role)) query = query.in('role', ['admin', 'trainer', 'coach']);
                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) console.error('[Chat] fetchCoaches error:', error.message);
                if (data) setChatList(data);
                setLoading(false); return;
            }
            setIsChatHome(false);
            const { data } = await supabase.from('profiles').select('id, name, role').eq('id', targetId).single();
            if (data) { setTargetUser(data); await fetchChatMessages(targetId); }
            setLoading(false);
        }
        identifyTarget();
    }, [contactId, userProfile]);

    useEffect(() => {
        if (!targetUser) return;
        setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
        const unsubscribe = subscribeToChat(targetUser.id);
        return () => unsubscribe();
    }, [targetUser]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

    const handleSend = () => { if (!inputText.trim() || !targetUser) return; sendMessage(targetUser.id, inputText.trim()); setInputText(""); };

    if (loading) return (
        <div className="h-screen bg-background flex items-center justify-center">
            <div className="w-8 h-8 rounded-full animate-spin border-4 border-slate-700" style={{ borderTopColor: '#ffffff' }} />
        </div>
    );

    if (isChatHome) return (
        <div className="flex flex-col h-screen bg-background text-slate-900 touch-none">
            <div className="flex items-center gap-4 p-4 pt-12 pb-4 border-b border-slate-200 bg-background/80 backdrop-blur sticky top-0 z-20">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-primary active:scale-95 transition-all">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">chat</span>
                    <h2 className="font-bold text-lg text-slate-900">{!['admin', 'trainer'].includes(userProfile?.role) ? 'Scegli Coach' : 'Chat Atleti'}</h2>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatList.map((client) => (
                    <div key={client.id} onClick={() => navigate(`/chat/${client.id}`)}
                        className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.98] shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase text-xl">
                            {client.name?.[0] || '?'}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-900">{client.name}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Apri conversazione</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                    </div>
                ))}
                {chatList.length === 0 && <div className="text-center text-slate-400 pt-10 font-bold uppercase text-xs">Nessun atleta trovato.</div>}
            </div>
        </div>
    );

    if (!targetUser) return (
        <div className="h-screen bg-background flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <span className="material-symbols-outlined text-5xl mb-4 text-slate-300">chat</span>
            <p className="text-slate-600 font-bold mb-2">Nessun Coach Assegnato</p>
            <p className="text-xs max-w-xs mb-8">Non hai ancora un trainer assegnato.</p>
            <button onClick={() => navigate('/')} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase hover:bg-slate-50 shadow-sm">Torna alla Home</button>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-background text-slate-900 touch-none">
            <div className="flex items-center gap-4 p-4 pt-12 pb-4 border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-primary active:scale-95 transition-all">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                    <span className="material-symbols-outlined text-primary">person</span>
                </div>
                <h2 className="font-bold text-sm text-slate-900">{targetUser.name || 'Utente'}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-30">
                        <span className="material-symbols-outlined text-5xl mb-2">chat</span>
                        <p className="text-xs uppercase font-bold tracking-widest">Inizia la chat</p>
                    </div>
                )}
                {chatMessages.map((msg, index) => {
                    const isMe = msg.sender_id === currentUserId;
                    const showDate = index === 0 || new Date(msg.created_at).toDateString() !== new Date(chatMessages[index - 1].created_at).toDateString();
                    return (
                        <div key={msg.id || index}>
                            {showDate && (
                                <div className="text-center py-4 opacity-50">
                                    <span className="text-[10px] font-mono uppercase bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-400">
                                        {new Date(msg.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                            <div className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-medium relative shadow-sm ${isMe
                                    ? "bg-primary text-white rounded-tr-sm"
                                    : "bg-white text-slate-700 rounded-tl-sm border border-slate-200"}`}>
                                    <p className="leading-snug">{msg.content}</p>
                                    <div className={`text-[9px] mt-1 text-right font-mono font-bold flex justify-end items-center gap-1 ${isMe ? "text-white/60" : "text-slate-400"}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {isMe && (msg.pending ? <span className="animate-pulse">🕒</span> : msg.read ? <span>✓✓</span> : <span>✓</span>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} className="h-2" />
            </div>

            <div className="p-3 pb-8 bg-white border-t border-slate-200 sticky bottom-0 z-20">
                <div className="flex gap-2 items-end bg-slate-50 border border-slate-200 rounded-2xl p-1 pl-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm">
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Messaggio..."
                        className="flex-1 bg-transparent text-slate-900 text-sm focus:outline-none resize-none py-3 max-h-32 min-h-[44px] placeholder-slate-400"
                        rows={1} style={{ height: 'auto', minHeight: '44px' }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                    <button onClick={handleSend} disabled={!inputText.trim()}
                        className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-30 disabled:bg-slate-200 disabled:text-slate-400 transition-all m-1 active:scale-95">
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
