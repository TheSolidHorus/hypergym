import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import CommentItem from "./CommentItem";
import { moderation } from "../lib/moderation";

export default function PostCard({ post, onLike, onDelete, onFollow, isFollowing }) {
    const [isLiked, setIsLiked] = useState(post.is_liked_by_me || false);
    const [localLikes, setLocalLikes] = useState(post.likes_count || 0);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isLiking, setIsLiking] = useState(false);

    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [commentCount, setCommentCount] = useState(0);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);
        };
        fetchUser();
        fetchCommentCount();
    }, []);

    const fetchCommentCount = async () => {
        const { count } = await supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
        if (count !== null) setCommentCount(count);
    };

    const fetchComments = async () => {
        if (!showComments && comments.length === 0) {
            setLoadingComments(true);
            const { data, error } = await supabase.from('post_comments').select(`id, content, created_at, user_id, user:profiles(name)`).eq('post_id', post.id).order('created_at', { ascending: true });
            if (!error && data) setComments(data.map(c => ({ ...c, user_name: c.user?.name || 'Utente' })));
            setLoadingComments(false);
        }
        setShowComments(!showComments);
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        const modCheck = moderation.analyze(newComment);
        if (!modCheck.isSafe) { alert(`Commento non consentito: ${modCheck.issues.join(", ")}`); return; }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const tempId = Date.now();
        const optimisticComment = { id: tempId, content: newComment, created_at: new Date().toISOString(), user_id: user.id, user_name: 'Tu', pending: true };
        setComments([...comments, optimisticComment]);
        setNewComment("");
        setCommentCount(prev => prev + 1);

        const { data, error } = await supabase.from('post_comments').insert({ post_id: post.id, user_id: user.id, content: newComment.trim() }).select().single();
        if (error) {
            console.error("Comment error:", error);
            setComments(current => current.filter(c => c.id !== tempId));
            setCommentCount(prev => prev - 1);
            alert("Errore invio commento");
        } else {
            setComments(current => current.map(c => c.id === tempId ? { ...data, user_name: 'Tu' } : c));
            if (user.id !== post.user_id) await supabase.from('notifications').insert({ user_id: post.user_id, sender_id: user.id, type: 'comment', message: newComment.substring(0, 50) });
        }
    };

    const getPostIcon = () => {
        switch (post.type) {
            case 'pr': return <span className="material-symbols-outlined text-primary text-xl">emoji_events</span>;
            case 'workout': return <span className="material-symbols-outlined text-primary text-xl">fitness_center</span>;
            case 'badge': return <span className="material-symbols-outlined text-yellow-500 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>;
            default: return null;
        }
    };

    const getPostTitle = () => {
        switch (post.type) {
            case 'pr': return `🔥 Nuovo PR!`;
            case 'workout': return `💪 Allenamento Completato`;
            case 'badge': return `🏆 Badge Sbloccato`;
            default: return 'Post';
        }
    };

    const handleLike = async () => {
        if (isLiking) return;
        setIsLiking(true);
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLocalLikes(prev => newIsLiked ? prev + 1 : prev - 1);
        if (newIsLiked && post.user_id !== currentUserId && currentUserId) await supabase.from('notifications').insert({ user_id: post.user_id, sender_id: currentUserId, type: 'like' });
        if (onLike) await onLike(post.id);
        setIsLiking(false);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Adesso';
        if (diffMins < 60) return `${diffMins}m fa`;
        if (diffHours < 24) return `${diffHours}h fa`;
        if (diffDays < 7) return `${diffDays}g fa`;
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    };

    const isOwnPost = currentUserId && post.user_id === currentUserId;

    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm hover:border-slate-200 transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                        {post.user_avatar ? (
                            <img src={post.user_avatar} alt="avatar" className="w-full h-full object-cover" />
                        ) : post.user_name === 'Utente Incognito' ? (
                            <span className="material-symbols-outlined text-slate-400 text-lg">visibility_off</span>
                        ) : (
                            <span className="text-sm font-black text-slate-400">
                                {post.user_name?.[0]?.toUpperCase() || '?'}
                            </span>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className={`font-bold text-sm ${post.user_name === 'Utente Incognito' ? 'text-slate-400 italic' : 'text-slate-900'}`}>
                                {post.user_name || 'Atleta HYPER'}
                            </p>
                            {!isOwnPost && post.user_name !== 'Utente Incognito' && onFollow && (
                                <button onClick={() => onFollow(post.user_id)}
                                    className={`p-1 rounded transition-colors flex items-center justify-center ${isFollowing ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                    title={isFollowing ? "Smetti di seguire" : "Segui"}>
                                    <span className="material-symbols-outlined text-[16px]">{isFollowing ? 'person_check' : 'person_add'}</span>
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{formatDate(post.created_at)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getPostIcon()}
                    {isOwnPost && onDelete && (
                        <button onClick={() => onDelete(post.id, post.user_id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90" title="Elimina post">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div>
                {post.type !== 'text' && <h3 className="text-base font-black text-slate-900 mb-2 uppercase tracking-tight">{getPostTitle()}</h3>}

                {/* PR Post */}
                {post.type === 'pr' && (
                    <div className="bg-orange-50/50 border border-primary/20 rounded-xl p-4 shadow-inner">
                        <p className="text-sm text-slate-500 font-bold mb-2 uppercase">{post.exercise_name}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-primary drop-shadow-[0_2px_4px_rgba(255,106,0,0.2)]">{post.weight}</span>
                            <span className="text-sm text-slate-400 font-bold">kg</span>
                            {post.reps && (
                                <>
                                    <span className="text-slate-300 mx-2">×</span>
                                    <span className="text-2xl font-black text-slate-700">{post.reps}</span>
                                    <span className="text-xs text-slate-400 font-bold">reps</span>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Badge Post */}
                {post.type === 'badge' && post.badge_type && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-4 shadow-inner">
                        <p className="text-sm text-amber-700 font-bold mb-1 uppercase tracking-wider">{post.badge_type?.charAt(0).toUpperCase() + post.badge_type?.slice(1)}</p>
                        <p className="text-lg font-black text-amber-500 uppercase flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span> {post.badge_level}
                        </p>
                    </div>
                )}

                {/* Media Image */}
                {post.media_url && post.media_type === 'image' && (
                    <div className="rounded-xl overflow-hidden border border-slate-100 mt-2 mb-2 shadow-sm">
                        <img src={post.media_url} alt="Post Media" className="w-full h-auto object-cover max-h-96" loading="lazy" />
                    </div>
                )}

                {/* Media Video */}
                {post.media_url && post.media_type === 'video' && (
                    <div className="rounded-xl overflow-hidden border border-slate-100 mt-2 mb-2 shadow-sm">
                        <video src={post.media_url} className="w-full h-auto max-h-96" controls />
                    </div>
                )}

                {/* Text Content */}
                {post.content && <p className="text-sm text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap font-medium">{post.content}</p>}
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                <button onClick={handleLike} disabled={isLiking}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-95 ${isLiked ? 'bg-red-50 text-red-500 border border-red-100' : 'text-slate-400 bg-slate-50 hover:text-red-500 hover:bg-red-50 hover:border-red-100 border border-transparent'}`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                    <span className="text-xs font-bold">{localLikes > 0 && localLikes}</span>
                </button>
                <button onClick={fetchComments}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-95 text-slate-400 border border-transparent hover:bg-slate-50 hover:text-primary ${showComments ? 'text-primary bg-primary/5 border-primary/20' : 'bg-slate-50'}`}>
                    <span className="material-symbols-outlined text-[20px]">forum</span>
                    <span className="text-xs font-bold">{commentCount > 0 && commentCount}</span>
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {loadingComments ? (
                            <p className="text-xs text-slate-400 animate-pulse text-center py-2 font-bold uppercase">Caricamento commenti...</p>
                        ) : comments.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-2 font-bold uppercase">Nessun commento. Sii il primo!</p>
                        ) : (
                            comments.map((comment) => (
                                <CommentItem key={comment.id} comment={comment} currentUserId={currentUserId} postAuthorId={post.user_id} />
                            ))
                        )}
                    </div>
                    <div className="flex gap-2 items-center bg-slate-50 rounded-full p-1 pl-4 border border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm">
                        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Scrivi un commento..."
                            className="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none placeholder:text-slate-400 font-medium"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} />
                        <button onClick={handleAddComment} disabled={!newComment.trim()}
                            className="w-10 h-10 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:bg-slate-300 transition-all active:scale-90">
                            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
