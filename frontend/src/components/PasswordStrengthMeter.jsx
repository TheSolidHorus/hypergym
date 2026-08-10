import { useEffect, useState } from 'react';

export default function PasswordStrengthMeter({ password, userInfo = {} }) {
    const [validation, setValidation] = useState(null);

    useEffect(() => {
        if (!password) {
            setValidation(null);
            return;
        }

        // Validazione lato client (semplificata, quella vera è sul server)
        const result = validatePasswordClient(password, userInfo);
        setValidation(result);
    }, [password, userInfo]);

    if (!validation) return null;

    const { strength, score, errors, suggestions } = validation;

    const strengthConfig = {
        debole: { color: 'bg-red-500', textColor: 'text-red-500', icon: 'close' },
        media: { color: 'bg-amber-500', textColor: 'text-amber-500', icon: 'error' },
        forte: { color: 'bg-primary', textColor: 'text-primary', icon: 'gpp_good' },
        ottima: { color: 'bg-green-500', textColor: 'text-green-500', icon: 'check_circle' }
    };

    const config = strengthConfig[strength];

    return (
        <div className="mt-4 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            {/* Barra di forza */}
            <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div
                        className={`h-full ${config.color} transition-all duration-300`}
                        style={{ width: `${score}%` }}
                    />
                </div>
                <div className="flex items-center gap-1.5 min-w-[80px]">
                    <span className={`material-symbols-outlined text-[16px] ${config.textColor}`}>{config.icon}</span>
                    <span className={`text-[10px] font-black tracking-widest uppercase ${config.textColor}`}>
                        {strength}
                    </span>
                </div>
            </div>

            {/* Errori */}
            {errors.length > 0 && (
                <div className="space-y-1.5 mt-2">
                    {errors.map((error, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600 font-bold bg-red-50/50 p-1.5 rounded-lg border border-red-100">
                            <span className="material-symbols-outlined text-[14px] text-red-500 mt-0.5 flex-shrink-0">close</span>
                            <span>{error}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Suggerimenti */}
            {suggestions.length > 0 && errors.length === 0 && (
                <div className="space-y-1.5 mt-2">
                    {suggestions.slice(0, 2).map((suggestion, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600 font-bold bg-amber-50/50 p-1.5 rounded-lg border border-amber-100/50">
                            <span className="material-symbols-outlined text-[14px] text-amber-500 mt-0.5 flex-shrink-0">lightbulb</span>
                            <span>{suggestion}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Validazione semplificata lato client (quella vera è sul server)
function validatePasswordClient(password, userInfo = {}) {
    let score = 0;
    const errors = [];
    const suggestions = [];

    // Lunghezza
    const length = password.length;
    if (length < 8) {
        errors.push("Password troppo corta (minimo 12 caratteri)");
        score += Math.max(0, length * 3);
    } else if (length < 12) {
        suggestions.push("Aumenta la lunghezza ad almeno 12 caratteri");
        score += length * 2;
    } else if (length >= 15) {
        score += 40;
    } else {
        score += 30;
    }

    // Minuscole
    if (/[a-z]/.test(password)) {
        score += 10;
    } else {
        errors.push("Aggiungi almeno una lettera minuscola");
    }

    // Maiuscole
    if (/[A-Z]/.test(password)) {
        score += 10;
    } else {
        errors.push("Aggiungi almeno una lettera maiuscola");
    }

    // Numeri
    if (/\d/.test(password)) {
        score += 10;
    } else {
        errors.push("Aggiungi almeno un numero");
    }

    // Simboli speciali
    if (/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/~`]/.test(password)) {
        score += 15;
    } else {
        errors.push("Aggiungi almeno un simbolo speciale (!@#$%^&*...)");
    }

    // Varietà
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= length * 0.7) {
        score += 10;
    }

    // Password comuni
    const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'letmein'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
        errors.push("Password troppo comune");
    } else {
        score += 5;
    }

    // Sequenze
    if (/(012|123|234|345|456|567|678|789|abc|bcd|cde|qwe|wer|ert|asd|sdf)/i.test(password)) {
        suggestions.push("Evita sequenze comuni (123, abc, qwerty...)");
    } else {
        score += 5;
    }

    // Info personali
    if (userInfo.name && password.toLowerCase().includes(userInfo.name.toLowerCase())) {
        errors.push("Non usare il tuo nome nella password");
    } else if (userInfo.email) {
        const emailPrefix = userInfo.email.split('@')[0].toLowerCase();
        if (emailPrefix && password.toLowerCase().includes(emailPrefix)) {
            errors.push("Non usare la tua email nella password");
        } else {
            score += 5;
        }
    } else {
        score += 5;
    }

    // Determina forza
    let strength;
    if (score >= 90) strength = "ottima";
    else if (score >= 70) strength = "forte";
    else if (score >= 50) strength = "media";
    else strength = "debole";

    if (score >= 90) {
        suggestions.unshift("Ottimo! Password molto sicura.");
    } else if (strength === "forte") {
        suggestions.unshift("Buona password! Considera di aggiungere più caratteri.");
    }

    return {
        is_valid: errors.length === 0 && score >= 70,
        strength,
        score: Math.min(100, score),
        errors,
        suggestions
    };
}
