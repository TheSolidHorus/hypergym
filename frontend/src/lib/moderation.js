/**
 * MODERATION SYSTEM (Light AI Rules)
 * Filtra contenuti offensivi e comportamenti sospetti lato client.
 */

const TOXIC_PATTERNS = [
    // Pattern base insulti (Italiano)
    /merd[aeious]/i,
    /cazz[aeoi]/i,
    /stronz/i,
    /fottut/i,
    /bastard/i,
    /troi[ae]/i,
    /puttan/i,
    /zoccol/i,
    /coglione/i,
    /vaffanculo/i,
    /deficente/i,
    /scem[oa]/i,
    /imbecille/i,
    // Pattern EN (Common)
    /fuc[k]/i,
    /shit/i,
    /bullshit/i,
    /bitch/i,
    /whore/i,
    /asshole/i,
    // Patterns Spam (URL sospetti ripetuti, etc. - Basic)
    /((http|https):\/\/[^\s]+){3,}/i // 3+ link in one message -> Suspect SPAM
];

export const moderation = {
    /**
     * Analizza il testo e restituisce un punteggio di tossicità (0-1).
     * @param {string} text 
     * @returns {object} { isSafe: boolean, score: number, issues: string[] }
     */
    analyze: (text) => {
        if (!text) return { isSafe: true, score: 0, issues: [] };

        let score = 0;
        const issues = [];
        const lowerText = text.toLowerCase();

        // 1. Keyword check (simple but fast)
        TOXIC_PATTERNS.forEach(pattern => {
            if (pattern.test(lowerText)) {
                score += 0.4; // Ogni parola offensiva aumenta il rischio
                issues.push("Linguaggio Inappropriato");
            }
        });

        // 2. CAPS LOCK ABUSE check (>70% caps, min length 10)
        const capsCount = (text.match(/[A-Z]/g) || []).length;
        if (text.length > 10 && capsCount / text.length > 0.7) {
            score += 0.2;
            issues.push("Urla (Caps Lock)");
        }

        // 3. Spam check (Length/Repetition)
        if (text.length > 500) {
            score += 0.1; // Messaggio molto lungo
        }

        return {
            isSafe: score < 0.5, // Soglia tolleranza
            score: Math.min(score, 1),
            issues: [...new Set(issues)] // Deduplica
        };
    },

    /**
     * Rende "sicuro" un testo censurando le parti offensive (Es. c***o)
     * (MVP: Ritorna stringa fissa o censurata base)
     */
    censor: (text) => {
        let censored = text;
        TOXIC_PATTERNS.forEach(pattern => {
            censored = censored.replace(pattern, (match) => '*'.repeat(match.length));
        });
        return censored;
    }
};
