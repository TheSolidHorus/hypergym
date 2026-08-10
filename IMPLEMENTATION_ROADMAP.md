# 🚀 PUMP - Roadmap Implementazione Features

## ✅ FASE 1: BUG FIX (COMPLETATA)

### 1. Fix "Invalid Date" su iPhone ✅
- **Problema**: Safari non parseava correttamente le date.
- **Soluzione**: Aggiunta funzione `formatSafeDate()` e mapping corretto di `startedAt` nello store.
- **File modificati**:
  - `frontend/src/pages/History.jsx`
  - `frontend/src/lib/store.js`

### 2. Rimosso Toggle "Modalità Offline" ✅
- **Problema**: Toggle presente ma feature non implementata.
- **Soluzione**: Rimosso completamente da `Settings.jsx`.
- **File modificati**:
  - `frontend/src/pages/Settings.jsx`

### 3. Set Dinamici (+/- durante workout) ✅
- **Problema**: Set fissi, impossibile aggiungere/rimuovere durante allenamento.
- **Soluzione**: Implementate funzioni `addSet()` e `removeSet()` nello store + bottoni UI.
- **File modificati**:
  - `frontend/src/lib/store.js` (funzioni `addSet`, `removeSet`)
  - `frontend/src/pages/WorkoutSession.jsx` (bottoni + e -)

---

## 📦 FASE 2: DATABASE SCHEMA (IN CORSO)

Per implementare le nuove feature, devo estendere lo schema Supabase.

### Tabelle da creare:

```sql
-- 1. ACHIEVEMENTS/BADGE System
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL, -- 'panca', 'squat', 'stacco'
    level TEXT NOT NULL, -- 'bronze', 'silver', 'gold', 'platinum'
    weight_achieved INTEGER NOT NULL,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_type, level)
);

-- 2. COMMUNITY POSTS (Feed sociale)
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'pr', 'workout', 'text'
    content TEXT,
    exercise_name TEXT,
    weight INTEGER,
    reps INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    likes_count INTEGER DEFAULT 0
);

CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE TABLE post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. VIDEO ESERCIZI
CREATE TABLE exercise_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_name TEXT UNIQUE NOT NULL,
    video_url TEXT NOT NULL, -- YouTube embed o Supabase Storage
    description TEXT,
    duration INTEGER, -- secondi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ADMIN ROLES
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user'; -- 'user', 'trainer', 'admin'

-- 5. ASSIGNED WORKOUTS (Trainer → Client)
CREATE TABLE assigned_workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Row Level Security (RLS)
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_workouts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own achievements" ON achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own achievements" ON achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view all posts" ON community_posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view all videos" ON exercise_videos FOR SELECT USING (true);
-- etc...
```

---

## 🎯 FASE 3: FEATURES CORE

### Feature 1: Dashboard Admin (Controllo Remoto Utenti)

**Obiettivo**: Personal Trainer possono vedere i clienti e assegnare schede.

**Step Implementation**:
1. **Backend**:
   - Aggiorna `profiles` con campo `role`.
   - Crea tabella `assigned_workouts`.
   - Crea API endpoint (o Supabase query) per:
     - Lista clienti del trainer
     - Assegna scheda a cliente
     - Vedi progressi cliente

2. **Frontend**:
   - Crea route `/admin` (protetta, solo per `role === 'trainer' || role === 'admin'`).
   - UI: Lista clienti + bottone "Assegna Scheda".
   - Modale per selezionare scheda da assegnare.
   - Notifica al cliente (toast o badge).

3. **Files da creare/modificare**:
   - `frontend/src/pages/AdminDashboard.jsx` (nuovo)
   - `frontend/src/pages/ClientList.jsx` (nuovo)
   - `frontend/src/lib/store.js` (aggiungi `assignWorkout`, `fetchClients`)
   - `supabase_schema.sql` (aggiorna)

---

### Feature 2: Export PDF Schede

**Obiettivo**: Scaricare scheda in formato PDF.

**Step Implementation**:
1. **Installa libreria**:
   ```bash
   npm install jspdf jspdf-autotable
   ```

2. **Crea funzione `exportPlanToPDF`**:
   - Input: `plan` object
   - Output: file PDF scaricato

3. **Aggiungi bottone "Scarica PDF"** in `PlansPage` o nella scheda stessa.

4. **Files da creare/modificare**:
   - `frontend/src/utils/pdfExport.js` (nuovo)
   - `frontend/src/pages/PlansPage.jsx` (aggiungi bottone)

**Esempio codice PDF**:
```javascript
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportPlanToPDF(plan) {
    const doc = new jsPDF();
    
    // Titolo
    doc.setFontSize(20);
    doc.text(plan.name, 20, 20);
    
    // Tabella esercizi
    doc.autoTable({
        head: [['Esercizio', 'Set', 'Reps', 'Note']],
        body: plan.exercises.map(ex => [
            ex.name,
            ex.sets,
            ex.reps,
            ex.note || '-'
        ]),
        startY: 30
    });
    
    // Download
    doc.save(`${plan.name}.pdf`);
}
```

---

### Feature 3: Badge System

**Obiettivo**: Sbloccare badge al raggiungimento di PR specifici.

**Step Implementation**:
1. **Backend**:
   - Tabella `achievements` (già nel schema sopra).
   - Funzione auto-trigger: Quando salvi un workout, controlla se hai raggiunto un PR.

2. **Frontend**:
   - Logica in `finishWorkout()`: Controlla peso esercizi e assegna badge.
   - Pagina `/badges` per vedere tutti i badge.
   - Animazione "Badge Unlocked!" quando ne sblocchi uno.

3. **Files da creare/modificare**:
   - `frontend/src/pages/Badges.jsx` (nuovo)
   - `frontend/src/lib/store.js` (funzione `checkAndAwardBadges`)
   - `frontend/src/components/BadgeUnlockedModal.jsx` (nuovo)

**Badge Logic**:
```javascript
const BADGES = {
    panca: [
        { level: 'bronze', weight: 60 },
        { level: 'silver', weight: 80 },
        { level: 'gold', weight: 100 },
        { level: 'platinum', weight: 150 }
    ],
    squat: [
        { level: 'bronze', weight: 100 },
        { level: 'silver', weight: 120 },
        { level: 'gold', weight: 160 },
        { level: 'platinum', weight: 200 }
    ],
    stacco: [
        { level: 'bronze', weight: 80 },
        { level: 'silver', weight: 100 },
        { level: 'gold', weight: 150 },
        { level: 'platinum', weight: 200 }
    ]
};

async function checkAndAwardBadges(workout) {
    for (const exercise of workout.exercises) {
        const exerciseName = exercise.name.toLowerCase();
        
        // Cerca badge corrispondente
        let badgeType = null;
        if (exerciseName.includes('panca')) badgeType = 'panca';
        if (exerciseName.includes('squat')) badgeType = 'squat';
        if (exerciseName.includes('stacco')) badgeType = 'stacco';
        
        if (!badgeType) continue;
        
        // Trova peso massimo usato
        const maxWeight = Math.max(...exercise.setsData.map(s => parseInt(s.kg) || 0));
        
        // Controlla badge eligibilità
        for (const badge of BADGES[badgeType]) {
            if (maxWeight >= badge.weight) {
                // Assegna badge (se non già presente)
                await awardBadge(badgeType, badge.level, maxWeight);
            }
        }
    }
}
```

---

## 📊 FASE 4: FEATURES AVANZATE

### Feature 4: Progressione Visuale (Grafici)

**Obiettivo**: Mostrare grafici con evoluzione peso/reps nel tempo.

**Step Implementation**:
1. **Installa libreria**:
   ```bash
   npm install recharts
   ```

2. **Crea componente `ProgressChart.jsx`**:
   - Input: `exerciseName`, `history`
   - Output: Grafico lineare con peso nel tempo.

3. **Aggiungi route `/progress/:exerciseName`**.

4. **Files da creare/modificare**:
   - `frontend/src/components/ProgressChart.jsx` (nuovo)
   - `frontend/src/pages/ProgressPage.jsx` (nuovo)

---

### Feature 5: Video Esercizi

**Obiettivo**: Mostrare video dimostrativo per ogni esercizio.

**Step Implementation**:
1. **Backend**:
   - Tabella `exercise_videos`.
   - Popola con YouTube embed URLs.

2. **Frontend**:
   - In `WorkoutSession.jsx`, aggiungi icona "Play" accanto a ogni esercizio.
   - Modale con `<iframe>` YouTube.

3. **Files da creare/modificare**:
   - `frontend/src/components/VideoModal.jsx` (nuovo)
   - `frontend/src/pages/WorkoutSession.jsx` (aggiungi bottone video)

---

### Feature 6: Community Feed

**Obiettivo**: Feed stile Instagram dove condividere PR e allenamenti.

**Step Implementation**:
1. **Backend**:
   - Tabelle `community_posts`, `post_likes`, `post_comments`.
   
2. **Frontend**:
   - Pagina `/community` con feed.
   - Componente `Post.jsx` (card post).
   - Bottone "Condividi PR" dopo workout completato.

3. **Files da creare/modificare**:
   - `frontend/src/pages/Community.jsx` (nuovo)
   - `frontend/src/components/Post.jsx` (nuovo)
   - `frontend/src/components/SharePRModal.jsx` (nuovo)

---

## 📅 PRIORITÀ IMPLEMENTAZIONE

**Settimana 1: Core Features**
- [x] Bug Fix (COMPLETATO)
- [ ] Dashboard Admin
- [ ] Badge System
- [ ] Export PDF

**Settimana 2: Advanced Features**
- [ ] Progressione Visuale
- [ ] Video Esercizi
- [ ] Community Feed

---

## 🚨 NOTE IMPORTANTI

- **Ogni feature deve avere test su iPhone e Android**.
- **Backup Supabase** prima di modificare schema.
- **Build e deploy su Vercel dopo ogni feature**.
- **Aggiorna versione app** in `Settings.jsx` dopo ogni deploy.

---

**Prossimo Step**: Vuoi che proceda con Dashboard Admin o preferisci Badge System prima?
