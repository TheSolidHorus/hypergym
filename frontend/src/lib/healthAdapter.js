import { Capacitor } from '@capacitor/core';

/**
 * HealthAdapter - Interfaccia unificata per la connettività con i wearable
 * Funge da ponte ("Adapter Pattern") per l'app React.
 * Se aperta nel web browser (sviluppo) restituisce dati di Mock per non far crashare l'app.
 * Se aperta da smartphone nativo (iOS/Android), chiama i plugin corrispondenti.
 */
class HealthAdapter {
    /**
     * Richiede i permessi all'OS (Apple HealthKit o Google Fit)
     */
    static async requestPermissions() {
        if (!Capacitor.isNativePlatform()) {
            console.log("[HealthAdapter] Piattaforma Web: Permessi Salute simulati e ACCETTATI.");
            return true;
        }

        try {
            // Qui andrà il plugin nativo quando lo compilerai in Xcode:
            // return await HealthKit.requestAuthorization(...)
            console.log("[HealthAdapter] App Mobile: Permessi richiesti al SO.");
            
            // Per test su emulatore senza aver installato il plugin reale,
            // torniamo temporaneamente true.
            return true;
        } catch (error) {
            console.error("[HealthAdapter] Errore richiesta permessi Salute:", error);
            return false;
        }
    }

    /**
     * Ottiene le metriche di fitness della giornata corrente
     */
    static async getDailyStats() {
        if (!Capacitor.isNativePlatform()) {
            console.log("[HealthAdapter] Piattaforma Web: Generazione dati Salute simulati per lo sviluppo UI.");
            return this._generateMockStats();
        }

        try {
            // Qui in futuro il plugin nativo leggerà le api Health:
            // const steps = await HealthKit.query({ sampleType: 'steps' })
            
            return {
                steps: 0,
                calories: 0,
                sleepHours: 0,
                recoveryScore: 100, // Partenza base sicura se il sensore non legge
                lastSync: new Date().toISOString()
            };
        } catch (error) {
            console.error("[HealthAdapter] Errore lettura metriche Salute:", error);
            return null; // Ritorna null in caso di fallimento per non sovrascrivere i vecchi dati fittizi
        }
    }

    /**
     * Helper privato per farti testare il layout
     */
    static _generateMockStats() {
        return {
            steps: Math.floor(Math.random() * 6000) + 4000, // 4000-10000 passi
            calories: Math.floor(Math.random() * 800) + 1800, // 1800-2600 calorie attive
            sleepHours: (Math.random() * 2.5 + 5.5).toFixed(1), // 5.5-8.0 ore di sonno
            recoveryScore: Math.floor(Math.random() * 30) + 70, // 70-100% vitalità
            lastSync: new Date().toISOString()
        };
    }
}

export default HealthAdapter;
