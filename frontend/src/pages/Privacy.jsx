import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Privacy() {
    const navigate = useNavigate();
    const [openSection, setOpenSection] = useState(null);

    const toggleSection = (id) => {
        setOpenSection(openSection === id ? null : id);
    };

    const sections = [
        {
            id: 1,
            icon: "corporate_fare",
            title: "Titolare del Trattamento",
            content: `Il Titolare del trattamento dei dati personali è:

**HyperGym - Fitness, Sport & Conditioning**
Applicazione per il tracciamento degli allenamenti in palestra.

Per qualsiasi richiesta relativa al trattamento dei tuoi dati personali puoi contattarci tramite l'app o all'indirizzo email: privacy@hypergym.app`
        },
        {
            id: 2,
            icon: "database",
            title: "Dati che Raccogliamo",
            content: `Raccogliamo e trattiamo le seguenti categorie di dati:

**Dati Account:**
• Nome e cognome
• Indirizzo email e/o numero di telefono
• Credenziali di accesso (password criptata)

**Dati di Utilizzo dell'App:**
• Schede di allenamento create
• Storico allenamenti e progressi
• Preferenze e impostazioni

**Certificato Medico (Dati Sanitari):**
• Immagine o file PDF del certificato
• Dati contenuti nel certificato (idoneità sportiva)
• Data di scadenza del certificato

I dati relativi alla salute sono trattati con misure di sicurezza rafforzate in conformità all'art. 9 del GDPR.`
        },
        {
            id: 3,
            icon: "balance",
            title: "Base Giuridica del Trattamento",
            content: `I tuoi dati vengono trattati sulla base delle seguenti basi giuridiche:

**Esecuzione del Contratto (Art. 6.1.b GDPR):**
Il trattamento dei dati dell'account e di utilizzo è necessario per fornirti il servizio di tracciamento allenamenti.

**Trattamento Dati Sanitari (Art. 9 GDPR):**
Per il certificato medico, il trattamento avviene:
• Su base di **obbligo normativo** se richiesto dalla legge per l'accesso in palestra
• Su base di **consenso esplicito** dell'interessato negli altri casi

**Principi GDPR Applicati:**
• **Minimizzazione**: Raccogliamo solo i dati strettamente necessari
• **Riservatezza**: I dati sanitari sono protetti con crittografia
• **Limitazione della conservazione**: I dati vengono eliminati quando non più necessari`
        },
        {
            id: 4,
            icon: "schedule",
            title: "Conservazione dei Dati",
            content: `Conserviamo i tuoi dati per il tempo strettamente necessario:

**Dati Account:**
Conservati per tutta la durata del rapporto contrattuale e per i 10 anni successivi alla cessazione (obblighi fiscali e legali).

**Dati di Utilizzo:**
Conservati fino alla cancellazione dell'account da parte dell'utente.

**Certificato Medico:**
• Conservato fino alla data di scadenza indicata
• Automaticamente segnalato come scaduto dopo tale data
• L'utente può eliminarlo in qualsiasi momento

**Diritto alla Cancellazione:**
Puoi richiedere la cancellazione dei tuoi dati in qualsiasi momento dalla sezione Privacy dell'app. La cancellazione sarà effettuata entro 30 giorni, salvo obblighi di legge.`
        },
        {
            id: 5,
            icon: "description",
            title: "I Tuoi Diritti",
            content: `Ai sensi del GDPR, hai i seguenti diritti:

• **Accesso**: Puoi richiedere copia dei tuoi dati
• **Rettifica**: Puoi correggere dati inesatti
• **Cancellazione**: Puoi richiedere l'eliminazione dei dati
• **Portabilità**: Puoi esportare i tuoi dati in formato leggibile
• **Opposizione**: Puoi opporti a determinati trattamenti
• **Revoca consenso**: Puoi revocare il consenso in qualsiasi momento

Per esercitare questi diritti, utilizza le funzioni disponibili nell'app o contattaci all'indirizzo privacy@hypergym.app

Hai inoltre il diritto di proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali (www.garanteprivacy.it).`
        }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">

            {/* Header */}
            <div className="flex items-center gap-4 p-5 pt-8 sticky top-0 bg-white/80 backdrop-blur-md z-20 border-b border-slate-100 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all shadow-sm"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-2xl font-black italic uppercase text-slate-900 tracking-tighter">Privacy & Sicurezza</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Informativa Reg. UE 2016/679</p>
                </div>
            </div>

            <div className="flex-1 p-5 space-y-4 pb-12">

                {/* Header Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 mb-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <span className="material-symbols-outlined text-[100px]">shield</span>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                            <span className="material-symbols-outlined text-[28px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_good</span>
                        </div>
                        <div>
                            <h2 className="font-black italic text-xl uppercase tracking-tighter text-slate-900">La tua privacy</h2>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">Ultimo agg: Febbraio 2026</p>
                        </div>
                    </div>
                    <p className="text-sm font-bold text-slate-400 leading-relaxed relative z-10">
                        Questa informativa spiega come HyperGym raccoglie, utilizza e protegge i tuoi dati personali in conformità al Regolamento Europeo sulla Protezione dei Dati (GDPR).
                    </p>
                </div>

                {/* Accordion Sections */}
                <div className="space-y-3">
                    {sections.map((section) => (
                        <div
                            key={section.id}
                            className={`bg-white border rounded-2xl overflow-hidden transition-all shadow-sm ${openSection === section.id ? 'border-primary/30 ring-4 ring-primary/5' : 'border-slate-200'}`}
                        >
                            <button
                                onClick={() => toggleSection(section.id)}
                                className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${openSection === section.id ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>
                                        <span className="material-symbols-outlined text-[20px]">{section.icon}</span>
                                    </div>
                                    <span className={`font-black uppercase tracking-widest text-[11px] ${openSection === section.id ? 'text-primary' : 'text-slate-700'}`}>{section.title}</span>
                                </div>
                                <span className={`material-symbols-outlined text-[24px] text-slate-400 transition-transform duration-300 ${openSection === section.id ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </button>

                            {openSection === section.id && (
                                <div className="px-5 pb-5 pt-1 animate-in slide-in-from-top-2 duration-300">
                                    <div className="pt-4 border-t border-slate-100 text-sm text-slate-500 font-bold leading-relaxed whitespace-pre-line">
                                        {section.content.split('**').map((part, i) =>
                                            i % 2 === 1 ? <strong key={i} className="text-slate-900 font-black italic tracking-tight">{part}</strong> : part
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="pt-10 pb-6 text-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        © 2026 HyperGym<br />
                        <span className="text-slate-500">Tutti i diritti riservati</span>
                    </p>
                </div>

            </div>
        </div>
    );
}
