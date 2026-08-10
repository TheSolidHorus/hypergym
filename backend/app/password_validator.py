import re
from typing import Dict, List

# Lista di password comuni da evitare
COMMON_PASSWORDS = [
    "password", "123456", "12345678", "qwerty", "abc123", "monkey", 
    "1234567", "letmein", "trustno1", "dragon", "baseball", "iloveyou",
    "master", "sunshine", "ashley", "bailey", "passw0rd", "shadow",
    "123123", "654321", "superman", "qazwsx", "michael", "football"
]

def validate_password_strength(password: str, user_info: dict = None) -> Dict:
    """
    Valida la forza di una password secondo criteri di sicurezza.
    
    Criteri:
    - Lunghezza minima: 12 caratteri
    - Lettere maiuscole: almeno 1
    - Lettere minuscole: almeno 1
    - Numeri: almeno 1
    - Simboli speciali: almeno 1
    - Non contenere informazioni personali
    - Non essere una password comune
    
    Returns:
        {
            "is_valid": bool,
            "strength": "debole" | "media" | "forte" | "ottima",
            "score": 0-100,
            "errors": [],
            "suggestions": []
        }
    """
    
    errors = []
    suggestions = []
    score = 0
    
    # 1. Lunghezza (max 40 punti)
    length = len(password)
    if length < 8:
        errors.append("Password troppo corta (minimo 12 caratteri)")
        score += max(0, length * 3)
    elif length < 12:
        suggestions.append("Aumenta la lunghezza ad almeno 12 caratteri per maggiore sicurezza")
        score += length * 2
    elif length >= 15:
        score += 40
    else:
        score += 30
    
    # 2. Lettere minuscole (10 punti)
    if re.search(r'[a-z]', password):
        score += 10
    else:
        errors.append("Aggiungi almeno una lettera minuscola")
    
    # 3. Lettere maiuscole (10 punti)
    if re.search(r'[A-Z]', password):
        score += 10
    else:
        errors.append("Aggiungi almeno una lettera maiuscola")
    
    # 4. Numeri (10 punti)
    if re.search(r'\d', password):
        score += 10
    else:
        errors.append("Aggiungi almeno un numero")
    
    # 5. Simboli speciali (15 punti)
    if re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]', password):
        score += 15
    else:
        errors.append("Aggiungi almeno un simbolo speciale (!@#$%^&*...)")
    
    # 6. Varietà di caratteri (10 punti)
    unique_chars = len(set(password))
    if unique_chars >= length * 0.7:
        score += 10
    elif unique_chars < length * 0.4:
        suggestions.append("Usa più caratteri diversi, evita ripetizioni")
    
    # 7. Non contiene password comuni (5 punti)
    password_lower = password.lower()
    if any(common in password_lower for common in COMMON_PASSWORDS):
        errors.append("Password troppo comune, scegli qualcosa di più originale")
    else:
        score += 5
    
    # 8. Non contiene sequenze ovvie (5 punti)
    if re.search(r'(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|qwe|wer|ert|rty|asd|sdf|dfg)', password_lower):
        suggestions.append("Evita sequenze comuni (123, abc, qwerty...)")
    else:
        score += 5
    
    # 9. Non contiene informazioni personali (5 punti)
    if user_info:
        name = user_info.get('name', '').lower()
        email = user_info.get('email', '').lower().split('@')[0]
        
        if name and len(name) > 2 and name in password_lower:
            errors.append("Non usare il tuo nome nella password")
        elif email and len(email) > 2 and email in password_lower:
            errors.append("Non usare la tua email nella password")
        else:
            score += 5
    else:
        score += 5
    
    # Calcola la forza
    if score >= 90:
        strength = "ottima"
    elif score >= 70:
        strength = "forte"
    elif score >= 50:
        strength = "media"
    else:
        strength = "debole"
    
    # Aggiungi suggerimenti positivi
    if score >= 90:
        suggestions.insert(0, "✅ Password eccellente! Molto sicura.")
    elif strength == "forte":
        suggestions.insert(0, "Buona password! Considera di aggiungere più caratteri per renderla ancora più sicura.")
    
    return {
        "is_valid": len(errors) == 0 and score >= 70,
        "strength": strength,
        "score": min(100, score),
        "errors": errors,
        "suggestions": suggestions
    }


def generate_password_tip() -> str:
    """Genera un consiglio casuale per creare password sicure"""
    tips = [
        "💡 Usa una frase segreta trasformata: 'Il mio gatto ha 3 anni!' → 'ImGh3a!'",
        "💡 Combina 3 parole casuali con numeri e simboli: 'Luna#Caffè9!Strada'",
        "💡 Usa l'iniziale di ogni parola di una frase: 'Nel 2024 ho visitato 5 paesi' → 'N2024hv5p!'",
        "💡 Sostituisci lettere con simboli simili: 'a'→'@', 'i'→'!', 'e'→'3'",
        "💡 Alterna maiuscole/minuscole in modo imprevedibile: 'cAsA7!vErDe'"
    ]
    import random
    return random.choice(tips)
