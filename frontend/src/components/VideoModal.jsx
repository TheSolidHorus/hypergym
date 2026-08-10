/**
 * Modale per visualizzare video (YouTube o File diretti)
 */
export default function VideoModal({ exercise, videoUrl, onClose }) {
    if (!videoUrl) return null;

    // Check if YouTube
    const isYouTube = (url) => {
        return url.includes('youtube.com') || url.includes('youtu.be');
    };

    // Estrai ID YouTube
    const getYouTubeEmbedUrl = (url) => {
        if (!url) return null;
        if (url.includes('/embed/')) return url;

        let videoId = null;
        if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('v=')[1]?.split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split('?')[0];
        }

        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
                    <div>
                        <h3 className="text-xl font-black italic tracking-tighter text-slate-900 uppercase flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                            {exercise}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1 ml-[36px]">Video Dimostrativo</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-800 transition-colors rounded-full hover:bg-slate-100 shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Video Container */}
                <div className="relative w-full aspect-video bg-black shadow-inner">
                    {isYouTube(videoUrl) ? (
                        getYouTubeEmbedUrl(videoUrl) ? (
                            <iframe
                                src={getYouTubeEmbedUrl(videoUrl)}
                                title={`${exercise} - Tutorial`}
                                className="absolute inset-0 w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-slate-600 text-5xl mb-3">error</span>
                                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Video YouTube non valido</p>
                            </div>
                        )
                    ) : (
                        <video
                            src={videoUrl}
                            className="absolute inset-0 w-full h-full object-contain"
                            controls
                            autoPlay
                            playsInline
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <p className="text-[10px] text-slate-500 text-center font-black tracking-[0.2em] uppercase flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-amber-500">lightbulb</span>
                        Segui attentamente la tecnica per massimizzare i risultati ed evitare infortuni.
                    </p>
                </div>
            </div>
        </div>
    );
}
