import { createClient } from '@supabase/supabase-js'

// ⚙️ CONFIGURAZIONE SUPABASE
// Dopo aver creato il progetto su https://supabase.com
// Vai su: Project Settings → API
// Copia questi valori:

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Custom Storage Adapter implementation for robust mobile support
const SafeStorage = {
    getItem: (key) => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn('LocalStorage unavailable:', e);
            return null;
        }
    },
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('LocalStorage write failed:', e);
        }
    },
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('LocalStorage remove failed:', e);
        }
    }
};

// Crea client Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: SafeStorage
    }
})

// Helper per debug (solo in development)
if (import.meta.env.DEV) console.log('🔌 Supabase client inizializzato:', SUPABASE_URL)

// Export URL per compatibilità con vecchio codice
export const API_URL = SUPABASE_URL
export const getApiUrl = () => SUPABASE_URL
