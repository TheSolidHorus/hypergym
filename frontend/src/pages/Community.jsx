import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import PostCard from "../components/PostCard";
import Leaderboard from "../components/Leaderboard";
import ChallengesTab from "../components/ChallengesTab";
import { moderation } from "../lib/moderation";

export default function Community() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('feed'); // 'feed' | 'following' | 'leaderboard' | 'challenges'
    
    const [newPostContent, setNewPostContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);

    const [followingIds, setFollowingIds] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        const fetchUserAndFollows = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
                // Fetch following
                const { data: follows } = await supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', user.id);
                if (follows) setFollowingIds(follows.map(f => f.following_id));
            }
        };
        fetchUserAndFollows();
    }, []);

    useEffect(() => {
        fetchPosts(view === 'following');
    }, [view, currentUserId]); // Refetch when view changes

    const fetchPosts = async (onlyFollowing = false) => {
        setLoading(true);
        try {
            let query = supabase
                .from('community_feed')
                .select(`
                    *,
                    likes_count:post_likes(count)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (onlyFollowing && followingIds.length > 0) {
                 // Include own posts + following posts
                 query = query.in('user_id', [...followingIds, currentUserId]);
            } else if (onlyFollowing && followingIds.length === 0) {
                 // Following nobody
                 setPosts([]);
                 setLoading(false);
                 return;
            }

            const { data, error } = await query;
            if (error) console.error("Error fetching posts:", error);

            if (data && currentUserId) {
                // Fetch my likes to see which posts I've liked
                const { data: myLikes } = await supabase
                    .from('post_likes')
                    .select('post_id')
                    .eq('user_id', currentUserId);
                
                const likedPostIds = new Set(myLikes?.map(l => l.post_id) || []);

                const formatted = data.map(post => ({
                    ...post,
                    likes_count: post.likes_count?.[0]?.count || 0,
                    is_liked_by_me: likedPostIds.has(post.id)
                }));
                setPosts(formatted);
            } else if (data) {
                const formatted = data.map(post => ({ ...post, likes_count: post.likes_count?.[0]?.count || 0 }));
                setPosts(formatted);
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleFollow = async (targetUserId) => {
        if (!currentUserId || currentUserId === targetUserId) return;

        const isFollowing = followingIds.includes(targetUserId);

        if (isFollowing) {
            // Unfollow
            setFollowingIds(prev => prev.filter(id => id !== targetUserId));
            await supabase.from('follows').delete().match({ follower_id: currentUserId, following_id: targetUserId });
        } else {
            // Follow
            setFollowingIds(prev => [...prev, targetUserId]);
            await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetUserId });
            
            // Notify
            await supabase.from('notifications').insert({
                user_id: targetUserId,
                sender_id: currentUserId,
                type: 'system',
                title: 'Nuovo follower',
                message: 'Qualcuno ha iniziato a seguirti!',
            });
        }
    };

    const handleMediaSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 10 * 1024 * 1024) {
            alert("File troppo grande (Max 10MB)");
            return;
        }

        setMediaFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setMediaPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handlePostText = async () => {
        if (!newPostContent.trim() && !mediaFile) return;

        // MODERATION (if text exists)
        if (newPostContent.trim()) {
             const modCheck = moderation.analyze(newPostContent);
             if (!modCheck.isSafe) {
                 alert(`Attenzione: Il testo viola le nostre linee guida (${modCheck.issues.join(", ")}).`);
                 return;
             }
        }

        setIsPosting(true);
        let mediaUrl = null;
        let mediaType = null;

        if (mediaFile) {
            setUploadingMedia(true);
            const fileExt = mediaFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            try {
                const { error: uploadError } = await supabase.storage
                    .from('community_media')
                    .upload(fileName, mediaFile);

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('community_media')
                        .getPublicUrl(fileName);
                    mediaUrl = publicUrl;
                    mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
                }
            } catch (e) {
                console.error("Upload error", e);
                alert("Errore caricamento media");
            }
            setUploadingMedia(false);
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Ottieni profilo utente
            const { data: profile } = await supabase.from('profiles').select('name, avatar_url').eq('id', user.id).single();

            const { data, error } = await supabase.from('community_feed').insert({
                user_id: user.id,
                user_name: profile?.name || 'Utente',
                user_avatar: profile?.avatar_url,
                type: 'text',
                content: newPostContent.trim(),
                media_url: mediaUrl,
                media_type: mediaType
            }).select().single();

            if (!error && data) {
                setPosts([{ ...data, likes_count: 0, is_liked_by_me: false }, ...posts]);
                setNewPostContent("");
                setMediaFile(null);
                setMediaPreview(null);
            } else {
                alert("Errore pubblicazione post");
            }
        }
        setIsPosting(false);
    };

    const handleDelete = async (postId, postAuthorId) => {
        if (!currentUserId || currentUserId !== postAuthorId) return;
        
        if (window.confirm("Sei sicuro di voler eliminare questo post?")) {
            const { error } = await supabase.from('community_feed').delete().eq('id', postId);
            if (!error) {
                setPosts(posts.filter(p => p.id !== postId));
            }
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-slate-900 pb-24">
            {/* Header Sticky */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-md z-30 pt-12 pb-4 px-4 border-b border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary text-2xl">group</span>
                    <h1 className="text-2xl font-black italic uppercase text-slate-900 tracking-tighter">Community</h1>
                </div>

                {/* Toggles */}
                <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                    <button 
                        onClick={() => setView('feed')}
                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${view === 'feed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="material-symbols-outlined text-base align-middle mr-1 -mt-0.5">explore</span> Globale
                    </button>
                    <button 
                        onClick={() => setView('challenges')}
                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1 ${view === 'challenges' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span> Sfide
                    </button>
                    <button 
                        onClick={() => setView('leaderboard')}
                        className={`hidden sm:flex flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all items-center justify-center gap-1 ${view === 'leaderboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span> Classifica
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {view !== 'leaderboard' && view !== 'challenges' && (
                    <>
                        {/* Area Testo Libero */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
                            <textarea
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder="Cosa ti frulla in testa? Condividi i tuoi progressi!"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 min-h-[80px] resize-none transition-all shadow-inner"
                            />
                            
                            {mediaPreview && (
                                <div className="mt-3 relative rounded-lg overflow-hidden border border-slate-200 inline-block">
                                    {mediaFile?.type.startsWith('video/') ? (
                                        <video src={mediaPreview} className="h-32 rounded-lg" />
                                    ) : (
                                        <img src={mediaPreview} alt="Preview" className="h-32 object-cover rounded-lg" />
                                    )}
                                    <button 
                                        onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
                                    >
                                        <span className="material-symbols-outlined text-sm block">close</span>
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-between items-center mt-3">
                                <div className="flex gap-2 text-slate-400">
                                    <label className="p-2 bg-slate-50 rounded-lg hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors border border-slate-100">
                                        <span className="material-symbols-outlined block text-xl">image</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleMediaSelect} />
                                    </label>
                                    <label className="p-2 bg-slate-50 rounded-lg hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors border border-slate-100">
                                        <span className="material-symbols-outlined block text-xl">videocam</span>
                                        <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={handleMediaSelect} />
                                    </label>
                                </div>
                                <button
                                    onClick={handlePostText}
                                    disabled={isPosting || uploadingMedia || (!newPostContent.trim() && !mediaFile)}
                                    className="px-6 py-2 bg-primary text-white font-bold uppercase text-xs rounded-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 flex items-center gap-2 transition-all shadow-md shadow-primary/20"
                                >
                                    {(isPosting || uploadingMedia) ? (
                                        <span className="animate-pulse">Pubblicazione...</span>
                                    ) : (
                                        <><span className="material-symbols-outlined text-lg block">send</span> Pubblica</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Feed Posts */}
                        {loading && view !== 'leaderboard' ? (
                            <div className="text-center py-10">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                                <span className="material-symbols-outlined text-4xl mb-3">rss_feed</span>
                                <p className="font-bold text-sm uppercase">Nessun post trovato.</p>
                                {view === 'following' && <p className="text-xs mt-2">Inizia a seguire altri atleti!</p>}
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in duration-500">
                                {posts.map(post => (
                                    <PostCard 
                                        key={post.id} 
                                        post={post} 
                                        onDelete={handleDelete}
                                        onFollow={handleFollow}
                                        isFollowing={followingIds.includes(post.user_id)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {view === 'leaderboard' && (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                        <Leaderboard />
                    </div>
                )}
                
                {view === 'challenges' && (
                    <div className="animate-in zoom-in-95 duration-300">
                        <ChallengesTab />
                    </div>
                )}
            </div>
        </div>
    );
}
