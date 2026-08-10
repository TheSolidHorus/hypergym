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
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 p-6 text-center animate-in fade-in">
                    <div className="bg-white border border-red-200 p-8 rounded-3xl max-w-md w-full shadow-2xl">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-[48px]">error</span>
                        </div>

                        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-3">Qualcosa è andato storto</h1>

                        <p className="text-slate-500 mb-8 text-sm font-bold">
                            Si è verificato un errore imprevisto nell&apos;applicazione. Non preoccuparti, i tuoi dati sono al sicuro.
                        </p>

                        <details className="text-left bg-slate-50 border border-slate-200 p-3 rounded-xl mb-8 overflow-auto max-h-40 text-xs text-red-500 font-mono shadow-inner">
                            <summary className="cursor-pointer mb-2 text-slate-400 font-bold uppercase tracking-widest text-[10px] select-none hover:text-slate-600">Dettagli Errore (per sviluppatori)</summary>
                            <div className="pl-2">
                                {this.state.error && this.state.error.toString()}
                                <br />
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </div>
                        </details>

                        <button
                            onClick={this.handleReload}
                            className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98]"
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
