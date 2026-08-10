import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { supabase } from "../lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function Certificate() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const { medicalCertificate, uploadCertificate, removeCertificate } = useStore();
    const [isUploading, setIsUploading] = useState(false);
    const [verifyingAI, setVerifyingAI] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [showPaperAlert, setShowPaperAlert] = useState(true);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAiError(null);

        // ── Validazione tipo file ─────────────────────────────────────────────
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            setAiError("Formato non supportato. Carica un PDF o un'immagine (JPG, PNG).");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setAiError("File troppo grande. Massimo 5MB.");
            return;
        }

        // ── Leggi file come base64 ────────────────────────────────────────────
        setIsUploading(true);
        setVerifyingAI(true);

        try {
            const base64DataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Estrai solo la parte base64 (senza il prefisso "data:mime;base64,")
            const imageBase64 = base64DataUrl.split(',')[1];

            // ── Verifica AI con Gemini Vision ─────────────────────────────────
            let aiApproved = false;
            let aiMessage = null;

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                if (!token) {
                    setAiError("Non sei autenticato. Riprova il login.");
                    setVerifyingAI(false);
                    setIsUploading(false);
                    return;
                }

                const verifyRes = await fetch(
                    `${SUPABASE_URL}/functions/v1/verify-certificate`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ imageBase64, mimeType: file.type })
                    }
                );

                if (!verifyRes.ok) {
                    const errorText = await verifyRes.text();
                    console.error("AI Verify Server Error:", verifyRes.status, errorText);
                    setAiError(`Errore server AI (${verifyRes.status}). Riprova o controlla i log di Supabase Edge Functions.`);
                    setVerifyingAI(false);
                    setIsUploading(false);
                    return;
                }

                const verifyData = await verifyRes.json();
                if (import.meta.env.DEV) console.log("AI Verification Result:", verifyData);
                aiApproved = verifyData.isValid !== false; 
                aiMessage = verifyData.message;

            } catch (networkErr) {
                console.error("AI verify network error:", networkErr);
                setAiError("Errore di rete durante la verifica AI. Controlla la connessione e riprova.");
                setVerifyingAI(false);
                setIsUploading(false);
                return;
            }

            setVerifyingAI(false);

            if (!aiApproved) {
                setAiError(aiMessage || "❌ Il documento non sembra un certificato medico valido. Caricane uno autentico.");
                setIsUploading(false);
                // Reset input per permettere di ritentare
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            // ── Upload approvato ──────────────────────────────────────────────
            await uploadCertificate({ name: file.name, data: base64DataUrl });

        } catch (err) {
            console.error("Certificate upload error:", err);
            setAiError("Errore durante il caricamento. Riprova.");
        } finally {
            setIsUploading(false);
            setVerifyingAI(false);
        }
    };

    const handleRemove = () => { if (confirm("Sei sicuro di voler eliminare il certificato medico?")) removeCertificate(); };

    const isExpired = medicalCertificate.expiresAt && new Date(medicalCertificate.expiresAt) < new Date();
    const daysUntilExpiry = medicalCertificate.expiresAt ? Math.ceil((new Date(medicalCertificate.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : null;

    return (
        <div className="flex flex-col min-h-screen bg-background text-slate-900 p-4">

            {/* ── Pop-up avviso certificato cartaceo ─────────────────────────── */}
            {showPaperAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        {/* Intestazione colorata */}
                        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg bg-card border border-border">
                                <span className="material-symbols-outlined text-foreground text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-2">
                                📄 Certificato Cartaceo
                            </h2>
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-2">
                                <p className="text-sm font-bold text-amber-800 leading-relaxed">
                                    Ricordati di portare il certificato medico <span className="underline">anche in formato cartaceo</span>!
                                </p>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    Il certificato digitale caricato sull&apos;app <strong>non sostituisce</strong> quello cartaceo richiesto dalla palestra all&apos;accesso. Porta sempre con te una copia fisica firmata dal medico.
                                </p>
                            </div>
                        </div>
                        {/* Footer azione */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={() => setShowPaperAlert(false)}
                                className="w-full py-3.5 bg-primary text-white font-black uppercase tracking-widest rounded-2xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                Ho capito
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4 mb-8 pt-6">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-xl font-bold uppercase text-slate-900 tracking-tight">Certificato Medico</h1>
                    <p className="text-[10px] text-slate-400">Obbligatorio per l&apos;accesso in palestra</p>
                </div>
            </div>

            <div className="flex-1 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex gap-3">
                        <span className="material-symbols-outlined text-blue-500 flex-shrink-0 mt-0.5">info</span>
                        <div className="text-xs text-blue-600 leading-relaxed">
                            <strong className="text-blue-700">Perché è richiesto?</strong><br />
                            Il certificato medico di idoneità sportiva è obbligatorio per legge per l&apos;accesso alle strutture sportive.
                            I tuoi dati sanitari sono protetti secondo il GDPR (Art. 9) e conservati in modo sicuro.
                        </div>
                    </div>
                </div>

                {/* Errore AI o formato */}
                {aiError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                        <span className="material-symbols-outlined text-red-500 flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                        <div>
                            <p className="font-bold text-red-700 text-sm">Documento non accettato</p>
                            <p className="text-red-600 text-xs mt-1">{aiError}</p>
                            <button onClick={() => { setAiError(null); fileInputRef.current?.click(); }} className="text-[10px] font-bold text-red-500 uppercase tracking-wider mt-2 hover:text-red-700 transition-colors">
                                Riprova →
                            </button>
                        </div>
                    </div>
                )}

                {!medicalCertificate.uploaded ? (
                    <div
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center min-h-[200px] transition-all
                            ${isUploading ? 'border-primary/40 bg-primary/5 cursor-wait' : 'border-slate-300 cursor-pointer hover:border-primary hover:bg-primary/5'}`}
                    >
                        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
                        {verifyingAI ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-14 h-14 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
                                <div className="text-center">
                                    <p className="text-slate-900 font-bold text-sm">Verifica AI in corso...</p>
                                    <p className="text-slate-400 text-xs mt-1">Gemini sta analizzando il documento</p>
                                </div>
                            </div>
                        ) : isUploading ? (
                            <div className="flex flex-col items-center gap-3 animate-pulse">
                                <div className="w-12 h-12 rounded-full bg-primary/20" />
                                <p className="text-slate-400 text-sm font-medium">Caricamento in corso...</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-primary text-3xl">upload</span>
                                </div>
                                <p className="text-slate-900 font-bold mb-1">Carica il tuo certificato</p>
                                <p className="text-slate-400 text-xs text-center">PDF o Immagine (JPG, PNG)<br />Massimo 5MB</p>
                                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                    <span className="material-symbols-outlined text-sm text-primary">auto_awesome</span>
                                    Verificato automaticamente da Gemini AI
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className={`rounded-2xl p-5 border ${isExpired ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'} shadow-sm`}>
                        <div className="flex items-center gap-3 mb-4">
                            {isExpired ? (
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-500">warning</span>
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary">check_circle</span>
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-slate-900">{isExpired ? 'Certificato Scaduto' : 'Certificato Valido'}</h3>
                                <p className="text-[10px] text-slate-400">{isExpired ? 'Devi caricare un nuovo certificato' : `Scade tra ${daysUntilExpiry} giorni`}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3 mb-4 border border-slate-100">
                            <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                                <span className="material-symbols-outlined text-slate-400">description</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 text-sm truncate">{medicalCertificate.fileName}</p>
                                <p className="text-[10px] text-slate-400">Caricato il {new Date(medicalCertificate.uploadedAt).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                            <span>Scadenza: {new Date(medicalCertificate.expiresAt).toLocaleDateString()}</span>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => fileInputRef.current?.click()}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors">
                                Sostituisci
                            </button>
                            <button onClick={handleRemove} className="py-3 px-4 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors border border-red-200">
                                <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                        </div>
                        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
                    </div>
                )}

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex gap-3">
                    <div className="w-8 h-8 rounded bg-white flex items-center justify-center flex-shrink-0 border border-slate-200">
                        <span className="material-symbols-outlined text-slate-400 text-sm">description</span>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-relaxed">
                        <strong className="text-slate-500">Trattamento dati sanitari</strong><br />
                        Il certificato è conservato in modo sicuro sul tuo dispositivo.
                        I dati sanitari sono trattati in conformità all&apos;Art. 9 del GDPR.
                        Puoi eliminarlo in qualsiasi momento.
                    </div>
                </div>
            </div>
        </div>
    );
}
