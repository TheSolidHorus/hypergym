// Mappa di alternative biomeccaniche con coefficienti di conversione
// ratio: moltiplicatore per il peso (es. 0.4 significa Peso * 0.4)
// nota: per esercizi con due manubri, il ratio si intende PER MANUBRIO se l'esercizio originale era bilanciere.

export const smartSwapRules = {
    // === PETTO ===
    "panca piana bilanciere": [
        { name: "Spinte Manubri Piana", ratio: 0.4 }, // 100kg Bil -> 40kg Manubrio
        { name: "Chest Press", ratio: 0.85 },
        { name: "Push Ups Zavorrati", ratio: 0.6 }
    ],
    "spinte panca piana": [ // Alias per manubri
        { name: "Panca Piana Bilanciere", ratio: 2.2 },
        { name: "Chest Press", ratio: 2.0 }
    ],
    "panca inclinata manubri": [
        { name: "Panca Inclinata Bilanciere", ratio: 2.2 },
        { name: "Incline Chest Press", ratio: 2.0 }
    ],
    "croci manubri": [
        { name: "Pectoral Machine", ratio: 1.2 },
        { name: "Cavi Incrociati (Crossover)", ratio: 1.0 }
    ],
    "pectoral machine": [
        { name: "Croci Manubri", ratio: 0.8 },
        { name: "Crossover", ratio: 0.85 }
    ],
    "chest press": [
        { name: "Panca Piana Bilanciere", ratio: 1.1 },
        { name: "Spinte Manubri", ratio: 0.5 }
    ],
    "dip parallele": [
        { name: "Panca Piana Stretta", ratio: 0.8 },
        { name: "Push Down (Tricipiti)", ratio: 0.6 }
    ],
    "crossover": [
        { name: "Croci Manubri", ratio: 1.0 },
        { name: "Pectoral Machine", ratio: 1.1 }
    ],

    // === DORSO ===
    "trazioni alla sbarra": [
        { name: "Lat Machine Avanti", ratio: 1.0 }, // Simile carico totale (incluso peso corpo)
        { name: "Lat Machine Presa Inversa", ratio: 0.9 }
    ],
    "lat machine avanti": [
        { name: "Trazioni Assistite", ratio: 1.0 },
        { name: "Pull Down Braccia Tese", ratio: 0.6 }
    ],
    "lat machine dietro": [
        { name: "Lat Machine Avanti", ratio: 1.0 }, // Più sicuro
        { name: "Trazioni", ratio: 1.0 }
    ],
    "rematore bilanciere": [
        { name: "Rematore Manubrio", ratio: 0.45 }, // Unilaterale
        { name: "Pulley Basso", ratio: 0.8 },
        { name: "Vertical Row", ratio: 0.85 }
    ],
    "rematore manubrio": [
        { name: "Rematore Bilanciere", ratio: 2.1 },
        { name: "Pulley Basso (Unilaterale)", ratio: 0.9 }
    ],
    "pulley basso": [
        { name: "Rematore Bilanciere", ratio: 1.2 },
        { name: "Vertical Row", ratio: 1.0 }
    ],
    "vertical row": [
        { name: "Rematore Bilanciere", ratio: 1.1 },
        { name: "Pulley Basso", ratio: 1.0 }
    ],
    "pull down braccia tese": [
        { name: "Lat Machine Avanti", ratio: 1.4 },
        { name: "Pull Over Manubrio", ratio: 0.8 }
    ],

    // === GAMBE ===
    "squat bilanciere": [
        { name: "Leg Press 45°", ratio: 2.5 }, // 100kg Squat -> ~250kg Pressa
        { name: "Goblet Squat", ratio: 0.4 },
        { name: "Smith Machine Squat", ratio: 1.1 }
    ],
    "leg press 45°": [
        { name: "Squat Bilanciere", ratio: 0.4 },
        { name: "Hack Squat", ratio: 0.5 }
    ],
    "affondi manubri": [
        { name: "Squat Bulgaro", ratio: 0.9 },
        { name: "Leg Extension", ratio: 1.2 }
    ],
    "leg extension": [
        { name: "Sissy Squat", ratio: 0.0 }, // Corpo libero
        { name: "Affondi", ratio: 0.8 }
    ],
    "leg curl": [
        { name: "Stacco Rumeno", ratio: 1.2 },
        { name: "Stacco Gambe Tese", ratio: 1.1 }
    ],
    "stacco da terra": [
        { name: "Stacco Rumeno", ratio: 0.8 },
        { name: "Hyperextension Zavorrata", ratio: 0.3 }
    ],
    "calf machine": [
        { name: "Calf alla Pressa", ratio: 1.0 },
        { name: "Calf Manubrio in Piedi", ratio: 0.5 }
    ],
    "squat bulgaro": [
        { name: "Affondi Manubri", ratio: 1.1 },
        { name: "Leg Press Unilaterale", ratio: 1.5 }
    ],

    // === SPALLE ===
    "military press": [
        { name: "Lento Avanti Manubri", ratio: 0.4 }, // 50kg Mil -> 20kg Manubrio
        { name: "Shoulder Press Machine", ratio: 0.9 }
    ],
    "lento avanti manubri": [
        { name: "Military Press", ratio: 2.2 },
        { name: "Arnold Press", ratio: 0.9 }
    ],
    "alzate laterali": [
        { name: "Alzate Laterali Cavo", ratio: 0.8 }, // Tensione continua
        { name: "Alzate Laterali Macchina", ratio: 1.0 }
    ],
    "alzate frontali": [
        { name: "Military Press", ratio: 1.5 },
        { name: "Alzate Frontali Cavo", ratio: 0.9 }
    ],
    "face pull": [
        { name: "Alzate 90°", ratio: 0.6 },
        { name: "Rear Delt Machine", ratio: 1.0 }
    ],
    "tirate al mento": [
        { name: "Alzate Laterali", ratio: 0.5 },
        { name: "Face Pull", ratio: 0.8 }
    ],

    // === BRACCIA ===
    "curl bilanciere": [
        { name: "Curl Manubri Alternato", ratio: 0.45 },
        { name: "Curl Cavi Bassi", ratio: 0.9 }
    ],
    "curl manubri": [
        { name: "Curl Bilanciere", ratio: 2.1 },
        { name: "Hammer Curl", ratio: 1.0 }
    ],
    "hammer curl": [
        { name: "Curl Manubri", ratio: 1.0 },
        { name: "Curl Cavo Fune", ratio: 0.9 }
    ],
    "french press": [
        { name: "Push Down Cavi", ratio: 1.1 },
        { name: "Estensioni Dietro Nuca", ratio: 0.8 }
    ],
    "push down cavi": [
        { name: "French Press", ratio: 0.9 },
        { name: "Dip Panche", ratio: 0.0 } // Corpo libero
    ],
    "dip panche": [
        { name: "Push Down", ratio: 0.7 },
        { name: "Kickback", ratio: 0.3 }
    ],

    // === ADDOME ===
    "crunch": [
        { name: "Crunch Machine", ratio: 1.0 },
        { name: "Plank", ratio: 0.0 }
    ],
    "plank": [
        { name: "Crunch", ratio: 0.0 }
    ],
    "leg raise": [
        { name: "Crunch Inverso", ratio: 0.0 }
    ],
    "russian twist": [
        { name: "Crunch Obliqui", ratio: 0.0 }
    ]
};

/**
 * Trova alternative suggerite per un dato esercizio.
 * Normalizza l'input per trovare match parziali.
 * @param {string} exerciseName 
 * @returns {Array} Array di oggetti { name, ratio } o empty array
 */
export const getSmartSwaps = (exerciseName) => {
    if (!exerciseName) return [];

    // Normalizzazione: minuscolo e trim
    const normalized = exerciseName.trim().toLowerCase();

    // 1. Cerca match esatto nella mappa
    if (smartSwapRules[normalized]) {
        return smartSwapRules[normalized];
    }

    // 2. Cerca match parziale (contiene stringa)
    // Es. "Squat" matcha "squat bilanciere"
    // Priorità alle chiavi che iniziano con la stringa cercata
    const directMatch = Object.keys(smartSwapRules).find(k => k === normalized);
    if (directMatch) return smartSwapRules[directMatch];

    const partialMatch = Object.keys(smartSwapRules).find(k =>
        k.includes(normalized) || normalized.includes(k)
    );

    return partialMatch ? smartSwapRules[partialMatch] : [];
};
