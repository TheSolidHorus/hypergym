import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Aggiorna lo stato in modo che il prossimo render mostri la fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Puoi anche loggare l'errore su un servizio di reporting
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Fallback UI personalizzata
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 text-center animate-in fade-in">
                    <div className="bg-card border border-border p-8 rounded-3xl max-w-md w-full shadow-2xl">
                        <div className="w-20 h-20 bg-red-950/40 border border-red-800/40 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-[48px]">error</span>
                        </div>

                        <h1 className="text-3xl font-black uppercase tracking-tight text-foreground mb-3">Qualcosa è andato storto</h1>

                        <p className="text-slate-400 mb-8 text-sm font-medium">
                            Si è verificato un errore imprevisto nell&apos;applicazione. I tuoi dati salvati sono al sicuro.
                        </p>

                        <details className="text-left bg-background border border-border p-3 rounded-xl mb-8 overflow-auto max-h-40 text-xs text-red-400 font-mono shadow-inner">
                            <summary className="cursor-pointer mb-2 text-slate-400 font-bold uppercase tracking-widest text-[10px] select-none hover:text-slate-300">Dettagli Errore</summary>
                            <div className="pl-2">
                                {this.state.error && this.state.error.toString()}
                                <br />
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </div>
                        </details>

                        <button
                            onClick={this.handleReload}
                            className="w-full py-4 bg-white hover:bg-slate-100 text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/10 active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                            Ricarica App
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
