import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function CommentItem({ comment, currentUserId }) {
    const [likes, setLikes] = useState(0);
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        fetchLikes();
    }, []);

    const fetchLikes = async () => {
        const { count } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', comment.id);

        setLikes(count || 0);

        if (currentUserId) {
            const { data } = await supabase
                .from('comment_likes')
                .select('id')
                .eq('comment_id', comment.id)
                .eq('user_id', currentUserId)
                .maybeSingle();

            if (data) setIsLiked(true);
        }
    };

    const handleLike = async () => {
        if (!currentUserId) return;

        const newLiked = !isLiked;
        setIsLiked(newLiked);
        setLikes(prev => newLiked ? prev + 1 : prev - 1);

        if (newLiked) {
            await supabase.from('comment_likes').insert({
                comment_id: comment.id,
                user_id: currentUserId
            });
            if (comment.user_id !== currentUserId) {
                await supabase.from('notifications').insert({
                    user_id: comment.user_id,
                    sender_id: currentUserId,
                    type: 'like',
                    message: 'Ha messo like al tuo commento!'
                });
            }
        } else {
            await supabase.from('comment_likes')
                .delete()
                .match({ comment_id: comment.id, user_id: currentUserId });
        }
    };

    return (
        <div className="flex gap-2 text-xs group items-start">
            <span className="font-bold text-slate-900 min-w-fit cursor-pointer hover:text-primary transition-colors hover:underline">
                {comment.user_name}:
            </span>
            <div className="flex-1 flex justify-between items-start">
                <span className="text-slate-600 leading-snug break-words mr-2">
                    {comment.content}
                </span>

                <button
                    onClick={handleLike}
                    className={`inline-flex flex-col items-center justify-center gap-0.5 transition-colors p-1 rounded-md mt-[-2px] ${isLiked ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-500 hover:bg-slate-100'}`}
                >
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                    {likes > 0 && <span className="text-[9px] font-bold leading-none">{likes}</span>}
                </button>
            </div>
        </div>
    );
}
