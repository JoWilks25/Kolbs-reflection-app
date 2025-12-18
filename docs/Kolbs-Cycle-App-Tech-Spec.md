<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Kolb's Reflection Cycle App MVP – Technical Specification

_Last updated: 2025-12-16_
_Version: 1.1 (Final with all design decisions integrated)_

***

## 1. Executive Summary

**Platform:** React Native with Expo (managed workflow), iOS-only MVP
**Developer:** Senior full-stack engineer with React/Node.js expertise, prior React Native + Expo experience[^1]
**Timeline:** 12.2 days (~2.5-3 weeks)
**Core Focus:** Privacy-first, local-only reflection app enforcing sequential Practice Area → Series → Sessions model with Kolb-based reflections[^2]

### Key Simplifications

- **Voice input:** Handled by system keyboard (Wispr Flow) - no custom voice API integration[^2]
- **State management:** Zustand (simpler than Context + useReducer, better performance)
- **Analytics:** None; all analysis via manual JSON export[^2]


### MVP Scope Highlights

- ✅ Practice Area creation \& selection
- ✅ Sequential session linking with strict enforcement
- ✅ Timer-based session flow
- ✅ 3 reflection formats (Direct, Reflective, Minimalist)[^2]
- ✅ **24h/48h reflection deadlines** with "Reflect Later" option
- ✅ **Edit reflections** within 48h (with `updated_at` tracking)
- ✅ **Move sessions** to different Practice Area (mistake correction)
- ✅ **Soft delete** sessions (no reflection only)
- ✅ Series timeline with session details
- ✅ JSON export (plaintext) with edit metadata
- ✅ Device lock warning, encrypted local DB[^2]


### Explicitly Out of Scope

- ❌ Filters on timeline (by format, by feedback)
- ❌ Synthesis/trends view (charts, analytics UI)
- ❌ Dedicated accessibility work beyond RN defaults
- ❌ Cloud sync or external analytics
- ❌ Intent editing (immutable after session start)

***

## 2. Architecture Overview

### 2.1 Technology Stack

| Layer | Technology | Rationale |
| :-- | :-- | :-- |
| Framework | React Native + Expo SDK 52+ | Leverages developer's React expertise, rapid mobile MVP delivery [^1] |
| Platform | iOS only | Simplifies QA, build config, platform edge cases [^2] |
| Navigation | React Navigation 6.x (Stack) | Industry standard, excellent Expo integration |
| State Management | Zustand | Simpler setup than Context, better performance with selective re-renders [^3] |
| Database | expo-sqlite (SQLCipher encryption) | Relational model, enforces sequential linking, local-only [^2] |
| Security | expo-local-authentication | Device lock status check (Face ID/passcode) [^2] |
| File Export | expo-file-system + expo-sharing | JSON export via iOS share sheet [^2] |
| UI Components | React Native built-ins + minimal custom | Fast MVP delivery, native feel |
| Styling | StyleSheet API + theme constants | Type-safe, performant |

### 2.2 App Structure

```
App.tsx
├── navigation/
│   └── RootStackNavigator.tsx
├── screens/
│   ├── HomeScreen.tsx
│   ├── SessionSetupScreen.tsx
│   ├── SessionActiveScreen.tsx
│   ├── ReflectionFormatScreen.tsx
│   ├── ReflectionPromptsScreen.tsx
│   ├── ReflectionFeedbackScreen.tsx
│   ├── SeriesTimelineScreen.tsx
│   └── SettingsScreen.tsx
├── stores/
│   └── appStore.ts (Zustand)
├── db/
│   ├── schema.ts
│   ├── queries.ts
│   └── migrations.ts
├── services/
│   ├── exportService.ts
│   ├── securityService.ts
│   └── reflectionStateService.ts
└── utils/
    ├── constants.ts
    ├── types.ts
    └── uuid.ts
```


***

## 3. State Management (Zustand)

### 3.1 Store Architecture

```typescript
// stores/appStore.ts
import create from 'zustand';

export const useAppStore = create((set, get) => ({
  // Practice Area state
  practiceAreas: [],
  currentPracticeArea: null,
  
  // Session state
  currentSession: null,
  sessionStartTime: null,
  sessionTimer: 0,
  
  // Reflection draft state
  reflectionDraft: {
    format: null,
    step2: '',
    step3: '',
    step4: '',
    feedbackRating: null,
    feedbackNote: '',
  },
  
  // UI state
  showSecurityWarning: false,
  pendingReflectionsCount: 0,
  
  // Actions: Practice Areas
  setPracticeAreas: (areas) => set({ practiceAreas: areas }),
  setCurrentPracticeArea: (pa) => set({ currentPracticeArea: pa }),
  
  // Actions: Sessions
  startSession: (session) => set({ 
    currentSession: session, 
    sessionStartTime: Date.now(),
    sessionTimer: 0,
  }),
  
  updateTimer: () => set((state) => ({
    sessionTimer: state.sessionStartTime 
      ? Math.floor((Date.now() - state.sessionStartTime) / 1000)
      : 0
  })),
  
  endSession: () => set({ 
    currentSession: null, 
    sessionStartTime: null,
    sessionTimer: 0,
  }),
  
  // Actions: Reflection drafts
  setReflectionFormat: (format) => set((state) => ({
    reflectionDraft: { ...state.reflectionDraft, format }
  })),
  
  updateReflectionDraft: (field, value) => set((state) => ({
    reflectionDraft: { ...state.reflectionDraft, [field]: value }
  })),
  
  clearReflectionDraft: () => set({
    reflectionDraft: {
      format: null,
      step2: '',
      step3: '',
      step4: '',
      feedbackRating: null,
      feedbackNote: '',
    }
  }),
  
  // Actions: UI
  setShowSecurityWarning: (show) => set({ showSecurityWarning: show }),
  setPendingReflectionsCount: (count) => set({ pendingReflectionsCount: count }),
}));
```


### 3.2 Usage Examples

```typescript
// In SessionActiveScreen
const { currentSession, sessionTimer, updateTimer, endSession } = useAppStore();

useEffect(() => {
  const interval = setInterval(() => updateTimer(), 1000);
  return () => clearInterval(interval);
}, [updateTimer]);

// In ReflectionPromptsScreen
const { reflectionDraft, updateReflectionDraft } = useAppStore();

const handleStep2Change = (text) => {
  updateReflectionDraft('step2', text);
  // Autosave to DB (debounced)
  saveDraftToDb(currentSession.id, 'step2', text);
};
```

**Benefits:**

- No Provider wrappers needed[^3]
- Components only re-render when their specific slice changes[^4]
- ~2 hours saved vs Context + useReducer setup[^1]

***

## 4. Data Schema (SQLite)

### 4.1 Tables

```sql
-- Practice Areas
CREATE TABLE IF NOT EXISTS practice_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  practice_area_id TEXT NOT NULL,
  previous_session_id TEXT,       -- NULL only for first session in a Practice Area
  intent TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,               -- NULL if session still active
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (practice_area_id) REFERENCES practice_areas(id),
  FOREIGN KEY (previous_session_id) REFERENCES sessions(id)
);

-- Reflections
CREATE TABLE IF NOT EXISTS reflections (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  format INTEGER NOT NULL,        -- 1=Direct, 2=Reflective, 3=Minimalist
  step2_answer TEXT NOT NULL,     -- "What happened?"
  step3_answer TEXT NOT NULL,     -- "Lesson/pattern"
  step4_answer TEXT NOT NULL,     -- "Next action"
  feedback_rating INTEGER,        -- 0=😕 1=😞, 2=😐, 3=🙂, 4=🚀, NULL if skipped
  feedback_note TEXT,
  completed_at INTEGER NOT NULL,
  updated_at INTEGER,             -- NULL if never edited, otherwise timestamp of last edit
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_practice_area 
  ON sessions (practice_area_id, started_at);

CREATE INDEX IF NOT EXISTS idx_sessions_previous 
  ON sessions (previous_session_id);

CREATE INDEX IF NOT EXISTS idx_reflections_session 
  ON reflections (session_id);

CREATE INDEX IF NOT EXISTS idx_sessions_ended_at
  ON sessions (ended_at);  -- For pending reflection queries
```


### 4.2 Data Constraints \& Rules

**Sequential Linking:**

- First session in a Practice Area: `previous_session_id = NULL`[^2]
- All subsequent sessions: `previous_session_id` must reference immediately prior session in same Practice Area[^2]

**Soft Delete:**

- Use `is_deleted = 1` to preserve Series integrity[^2]
- Only allow deletion if no reflection exists (session incomplete)

**Text Limits:**

- Reflection answers: 3000 characters per field (≈500 words)[^2]
- Configurable via constant in `utils/constants.ts`

**Reflection Deadlines:**

- Pending: 0-24h after `ended_at`
- Overdue: 24-48h after `ended_at`
- Expired: >48h after `ended_at` (can still add, with warning)

**Edit Window:**

- Reflections can only be edited within 48h of session `ended_at`
- After 48h, reflection becomes read-only

***

## 5. Core Features \& Screens

### 5.1 Navigation Flow

```
HomeScreen
  ├→ SessionSetupScreen
  │   └→ SessionActiveScreen
  │       └→ [End & Reflect Now] → ReflectionFormatScreen → ReflectionPromptsScreen → ReflectionFeedbackScreen → SeriesTimelineScreen
  │       └→ [End (Reflect Later)] → SeriesTimelineScreen
  ├→ SeriesTimelineScreen
  │   └→ [Complete Reflection] → ReflectionFormatScreen → ...
  │   └→ [Edit Reflection] → ReflectionPromptsScreen (edit mode) → ...
  └→ SettingsScreen
```


***

### 5.2 HomeScreen – Practice Areas

**Purpose:** Entry point; select existing Practice Area or create new one[^2]

**UI Components:**

- FlatList of Practice Areas (non-deleted)
    - Name
    - Last session date (if any)
    - Total sessions count
- **Pending Reflections Banner** (if any exist):
    - 🟡 _"1 reflection due (20h remaining)"_ → tap to navigate to session
    - 🟠 _"⚠️ 2 reflections overdue (expires in 18h)"_ → tap to navigate
- "+ New Practice Area" button
- Settings icon (top-right)
- Security warning banner (dismissible) if device lock not enabled[^2]

**Data Queries:**

```sql
-- Load Practice Areas
SELECT pa.*, 
  COUNT(s.id) as session_count,
  MAX(s.started_at) as last_session_date
FROM practice_areas pa
LEFT JOIN sessions s ON s.practice_area_id = pa.id AND s.is_deleted = 0
WHERE pa.is_deleted = 0
GROUP BY pa.id
ORDER BY pa.created_at DESC;

-- Load Pending/Overdue Reflections
SELECT s.*, pa.name as practice_area_name
FROM sessions s
LEFT JOIN reflections r ON r.session_id = s.id
LEFT JOIN practice_areas pa ON pa.id = s.practice_area_id
WHERE r.id IS NULL 
  AND s.ended_at IS NOT NULL
  AND s.is_deleted = 0
  AND (? - s.ended_at) <= ?  -- Within 48h
ORDER BY s.ended_at ASC;
```

**Interactions:**

- Tap Practice Area → navigate to `SessionSetupScreen` with `practiceAreaId`
- Tap "+" → modal to enter PA name → insert into `practice_areas`
- Tap pending reflection banner → navigate to `SeriesTimelineScreen`, auto-scroll to pending session

**Time Estimate:** 0.75 days (6 hours)

- FlatList + queries: 3 hours
- Pending reflection banner logic: 2 hours
- Create PA modal: 1 hour

***

### 5.3 SessionSetupScreen – Intent Setup

**Purpose:** Display previous intent, capture new session intent[^2]

**UI Components:**

- Practice Area name (header)
- **Previous Intent Card** (collapsible if long):
    - Label: _"Last time you planned to..."_
    - Text: Previous session's step4_answer (or "No previous sessions")
- Multiline TextInput for new intent
    - Placeholder: _"What is your intent or micro-goal for today?"_
    - Works with Wispr Flow system keyboard for voice input
- "Start Session" button (disabled if intent empty)

**Data Queries:**

```sql
-- Get last session + reflection
SELECT s.*, r.step4_answer as previous_next_action
FROM sessions s
LEFT JOIN reflections r ON r.session_id = s.id
WHERE s.practice_area_id = ? 
  AND s.is_deleted = 0
ORDER BY s.started_at DESC
LIMIT 1;
```

**Logic:**

```typescript
const handleStartSession = async () => {
  // Get last session ID for this PA
  const lastSession = await db.getAsync(/* query above */);
  
  // Create new session
  const newSession = {
    id: uuid(),
    practice_area_id: currentPracticeArea.id,
    previous_session_id: lastSession?.id || null,
    intent: intentText,
    started_at: Date.now(),
    ended_at: null,
    is_deleted: 0,
  };
  
  await db.runAsync('INSERT INTO sessions ...', [/* values */]);
  
  // Update Zustand
  startSession(newSession);
  
  // Navigate to SessionActiveScreen
  navigation.navigate('SessionActive');
};
```

**Autosave (optional):**

- Save draft intent to AsyncStorage on blur (simple recovery if app crashes)

**Time Estimate:** 0.5 days (4 hours)

- UI + previous intent display: 2 hours
- Session creation logic: 1.5 hours
- Draft autosave: 0.5 hours

***

### 5.4 SessionActiveScreen – Timer

**Purpose:** Display timer and current intent during active practice[^2]

**UI Components:**

- Large timer display (HH:MM:SS or MM:SS if <1 hour)
- Current intent (read-only, fixed at top)
- Practice Area name
- "End Session" button → shows **two options**:
    - **"End \& Reflect Now"** (primary, emphasized)
    - **"End Session (Reflect Later)"** (secondary)

**Logic:**

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    updateTimer(); // Updates Zustand state
  }, 1000);
  
  return () => clearInterval(interval);
}, [updateTimer]);

// Handle app backgrounding (preserve timer)
useEffect(() => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'background') {
      // Timer recalculates from sessionStartTime on resume
    }
  });
  return () => subscription.remove();
}, []);

const handleEndSession = async (action: 'reflect_now' | 'reflect_later') => {
  // Update session with end time
  await db.runAsync(
    'UPDATE sessions SET ended_at = ? WHERE id = ?',
    [Date.now(), currentSession.id]
  );
  
  endSession(); // Clear Zustand state
  
  if (action === 'reflect_now') {
    navigation.navigate('ReflectionFormat', { sessionId: currentSession.id });
  } else {
    navigation.navigate('SeriesTimeline', { practiceAreaId: currentPracticeArea.id });
  }
};
```

**Constraints:**

- Block back button during session (show confirmation: _"End session early?"_)
- No ability to change Practice Area mid-session[^2]

**Time Estimate:** 0.75 days (6 hours)

- Timer logic: 2 hours
- AppState handling: 2 hours
- Two-button end flow: 1 hour
- Back button handling: 1 hour

***

### 5.5 ReflectionFormatScreen – Choose Format

**Purpose:** Select reflection format before answering prompts[^2]

**UI Components:**

- 3 large cards (tappable):

**Card 1: Direct \& Action-Oriented**
    - Icon: ⚡
    - Description: _"Quick, focused. Best for simple sessions."_
    - Time estimate: ~3-5 minutes

**Card 2: Reflective \& Exploratory**
    - Icon: 🔍
    - Description: _"Deeper insight. Best for breakthrough moments."_
    - Time estimate: ~5-8 minutes

**Card 3: Minimalist / Rapid**
    - Icon: ⏱️
    - Description: _"Ultra-short. Best for low-energy or brief sessions."_
    - Time estimate: <1 minute

**Interactions:**

- Tap card → store format in Zustand → navigate to `ReflectionPromptsScreen`

**Time Estimate:** 0.25 days (2 hours)

- Simple selection UI with 3 cards

***

### 5.6 ReflectionPromptsScreen – Kolb Steps 2-4

**Purpose:** Step-by-step prompts for 3 Kolb questions (format-specific wording)[^2]

**Modes:**

- **New Reflection:** Empty fields, normal flow
- **Edit Reflection:** Pre-filled fields, save updates `updated_at`

**UI Components:**

- Progress indicator: _"Step 1 of 3"_, _"Step 2 of 3"_, _"Step 3 of 3"_
- **Prompt text** (changes based on format):


| Format | Step 2 | Step 3 | Step 4 |
| :-- | :-- | :-- | :-- |
| Direct (1) | What actually happened? | What's the main lesson or pattern? | What will you try/do differently next time? |
| Reflective (2) | What happened, and what stood out? | What insight, pattern, or assumption did you notice? | What will you experiment with next time? |
| Minimalist (3) | Key event | Main takeaway | Next micro-action |

- Multiline TextInput (auto-focus, voice-friendly)
- Character counter (shows at 2500+ chars, max 3000)
- Navigation buttons:
    - Steps 1-2: **"Back"** | **"Next"**
    - Step 3: **"Back"** | **"Complete"** (or **"Save"** in edit mode)

**Autosave Logic:**

```typescript
const handleBlur = (field: 'step2' | 'step3' | 'step4', value: string) => {
  // Update Zustand immediately
  updateReflectionDraft(field, value);
  
  // Debounced DB write (500ms)
  debouncedSave(currentSession.id, field, value);
};

// On app background
useEffect(() => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'background') {
      saveDraftToDb(currentSession.id, reflectionDraft);
    }
  });
  return () => subscription.remove();
}, [reflectionDraft]);
```

**Error Handling:**

```typescript
const saveDraftToDb = async (sessionId, answers) => {
  try {
    await db.runAsync(
      'UPDATE sessions SET draft_answers = ? WHERE id = ?',
      [JSON.stringify(answers), sessionId]
    );
  } catch (error) {
    // Show toast (non-blocking)
    showToast('Auto-save failed. Please try again.', 'error');
  }
};
```

**Character Limit Enforcement:**

```typescript
const handleTextChange = (text: string) => {
  if (text.length <= 3000) {
    updateReflectionDraft(currentStep, text);
  } else {
    showToast('Maximum 3000 characters reached', 'warning');
  }
};
```

**Time Estimate:** 1.25 days (10 hours)

- Multi-step form with navigation: 4 hours
- Format-specific prompt text: 1 hour
- Autosave with debounce: 3 hours
- Character limit + counter: 1 hour
- Edit mode (pre-fill + update logic): 1 hour

***

### 5.7 ReflectionFeedbackScreen – Rate Reflection Task

**Purpose:** Capture quick feedback on reflection experience[^2]

**UI Components:**

- Question: _"How did this reflection feel?"_
- 5 emoji buttons (single-select, large tap targets):
    - 0: 😕 Confusing / Unclear
    - 1: 😞 Hard / Frustrating
    - 2: 😐 Neutral / Meh
    - 3: 🙂 Good / Helpful
    - 4: 🚀 Great / Energizing
- **Expandable text area** (collapsed by default):
    - Label: _"What made this reflection feel this way?"_ (optional)
    - Placeholder: _"e.g., prompts were too long, felt rushed, had a breakthrough, etc."_
- "Finish" button

**Logic:**

```typescript
const handleFinish = async () => {
  const reflection = {
    id: uuid(),
    session_id: currentSession.id,
    format: reflectionDraft.format,
    step2_answer: reflectionDraft.step2,
    step3_answer: reflectionDraft.step3,
    step4_answer: reflectionDraft.step4,
    feedback_rating: reflectionDraft.feedbackRating,
    feedback_note: reflectionDraft.feedbackNote,
    completed_at: Date.now(),
    updated_at: null, // NULL for new reflections
  };
  
  try {
    await db.runAsync('INSERT INTO reflections ...', [/* values */]);
    clearReflectionDraft(); // Clear Zustand
    navigation.navigate('SeriesTimeline', { practiceAreaId: currentPracticeArea.id });
  } catch (error) {
    showToast('Failed to save reflection. Please try again.', 'error');
  }
};
```

**Time Estimate:** 0.25 days (2 hours)

- Simple emoji selector + optional text input

***

### 5.8 SeriesTimelineScreen – Session History

**Purpose:** Display chronological Series for selected Practice Area[^2]

**UI Components:**

- Practice Area name (header)
- FlatList of sessions (ordered by `started_at` ASC - oldest first):

**Each session row shows:**
    - Date/time
    - Intent (truncated to 2 lines)
    - Format badge: **D** / **R** / **M** (Direct/Reflective/Minimalist)
    - Reflection state badge:
        - ✅ Completed (if reflection exists)
        - 🟡 Pending (0-24h, no reflection)
        - 🟠 Overdue (24-48h, no reflection)
        - 🔴 Expired (>48h, no reflection)
    - Feedback emoji (if rated)
    - "Edited" badge (if `updated_at` exists)

**Tap session → Session Detail Modal:**

**Modal UI (varies by state):**

**If reflection complete + editable (≤48h):**

```
[Session Details Modal]

Intent: "Practice left-hand accents"
Started: Dec 16, 10:30 AM
Ended: Dec 16, 11:00 AM (30 minutes)

Reflection Format: Direct & Action-Oriented ⚡
Completed: Dec 16, 11:15 AM
[Edited: Dec 16, 12:00 PM] ← shown if updated_at exists

--- Reflection ---
What happened: "Struggled with F# major transitions..."
Lesson: "Need to practice finger independence..."
Next action: "Focus on slow, deliberate movements..."

Feedback: 🙂 Good / Helpful
Note: "Felt clear and useful"

[Edit Reflection] [Move to Different PA] [Close]
```

**If reflection complete + locked (>48h):**

```
[Same as above, but:]

[Move to Different PA] [Close]
(Edit button hidden - beyond 48h window)
```

**If reflection pending/overdue/expired:**

```
[Session Details Modal]

Intent: "Practice left-hand accents"
Started: Dec 16, 10:30 AM
Ended: Dec 16, 11:00 AM (30 minutes)

Status: 🟠 Reflection Overdue (expires in 18h)

[Complete Reflection] [Move to Different PA] [Delete Session] [Close]
```

**Move Session Logic:**

```typescript
const handleMoveSession = async (sessionId, newPracticeAreaId) => {
  // Get last session in new Practice Area
  const lastInNewPA = await db.getAsync(
    `SELECT id FROM sessions 
     WHERE practice_area_id = ? AND is_deleted = 0 
     ORDER BY started_at DESC LIMIT 1`,
    [newPracticeAreaId]
  );
  
  // Update session (reflection stays linked via foreign key)
  await db.runAsync(
    `UPDATE sessions 
     SET practice_area_id = ?, previous_session_id = ? 
     WHERE id = ?`,
    [newPracticeAreaId, lastInNewPA?.id || null, sessionId]
  );
  
  // Refresh timeline
  loadSessions();
  
  showToast('Session moved successfully', 'success');
};
```

**Delete Session Logic:**

```typescript
const handleDeleteSession = async (sessionId) => {
  // Check if reflection exists
  const hasReflection = await db.getAsync(
    'SELECT id FROM reflections WHERE session_id = ?',
    [sessionId]
  );
  
  if (hasReflection) {
    showToast('Cannot delete sessions with completed reflections', 'error');
    return;
  }
  
  // Show confirmation
  Alert.alert(
    'Delete Session?',
    'This will remove the session from your Series. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await db.runAsync(
            'UPDATE sessions SET is_deleted = 1 WHERE id = ?',
            [sessionId]
          );
          loadSessions();
        }
      }
    ]
  );
};
```

**Handling Previous Intent Display (Orphans):**

```typescript
const getPreviousIntent = async (session) => {
  if (!session.previous_session_id) return 'First session in this Practice Area';
  
  const prevSession = await db.getAsync(
    `SELECT s.*, r.step4_answer, s.practice_area_id
     FROM sessions s
     LEFT JOIN reflections r ON r.session_id = s.id
     WHERE s.id = ?`,
    [session.previous_session_id]
  );
  
  if (!prevSession) return '[Previous session not found]';
  
  if (prevSession.is_deleted) {
    return '[Previous session deleted]';
  }
  
  if (prevSession.practice_area_id !== session.practice_area_id) {
    return '[Previous session moved to different Practice Area]';
  }
  
  return prevSession.step4_answer || 'No previous intent recorded';
};
```

**Time Estimate:** 1.5 days (12 hours)

- FlatList with complex session states: 4 hours
- Session detail modal (3 variants): 4 hours
- Move session logic: 2 hours
- Delete session logic: 1 hour
- Previous intent edge case handling: 1 hour

***

### 5.9 SettingsScreen – Export \& Privacy

**Purpose:** Export data, show privacy status[^2]

**UI Components:**

**Section 1: Export Data**

- "Export All Data (JSON)" button
- Description: _"Export all Practice Areas, Sessions, and Reflections as JSON. Use for manual analysis or backup."_

**Section 2: Privacy \& Security**

- Privacy statement: _"All data stored locally on your device, encrypted at rest. No cloud sync."_
- Device lock status:
    - ✅ _"Device lock enabled (Face ID)"_ (if secure)
    - ⚠️ _"Device lock not enabled. Enable in iOS Settings for better privacy."_ (if not secure)

**Section 3: About**

- App version
- Developer info (optional)

**Export Logic:**

```typescript
const exportData = async () => {
  // 1. Query all data
  const practiceAreas = await db.getAllAsync(
    'SELECT * FROM practice_areas WHERE is_deleted = 0'
  );
  
  const exportData = {
    export_date: new Date().toISOString(),
    practice_areas: []
  };
  
  for (const pa of practiceAreas) {
    const sessions = await db.getAllAsync(
      `SELECT s.*, r.*
       FROM sessions s
       LEFT JOIN reflections r ON r.session_id = s.id
       WHERE s.practice_area_id = ? AND s.is_deleted = 0
       ORDER BY s.started_at ASC`,
      [pa.id]
    );
    
    exportData.practice_areas.push({
      id: pa.id,
      name: pa.name,
      created_at: pa.created_at,
      sessions: sessions.map(s => ({
        id: s.id,
        previous_session_id: s.previous_session_id,
        intent: s.intent,
        started_at: s.started_at,
        ended_at: s.ended_at,
        reflection: s.session_id ? {
          format: s.format,
          step2_answer: s.step2_answer,
          step3_answer: s.step3_answer,
          step4_answer: s.step4_answer,
          feedback_rating: s.feedback_rating,
          feedback_note: s.feedback_note,
          completed_at: s.completed_at,
          updated_at: s.updated_at,
          is_edited: s.updated_at && s.updated_at > s.completed_at,
        } : null
      }))
    });
  }
  
  // 2. Write to file
  const fileUri = FileSystem.documentDirectory + `kolbs-export-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(
    fileUri,
    JSON.stringify(exportData, null, 2)
  );
  
  // 3. Share via iOS share sheet
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Export Kolbs Reflection Data'
  });
};
```

**Device Lock Check:**

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const checkDeviceSecurity = async () => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
};

useEffect(() => {
  checkDeviceSecurity().then(setIsDeviceSecure);
}, []);
```

**Time Estimate:** 1 day (8 hours)

- Export JSON builder: 4 hours
- File write + share sheet: 2 hours
- Device lock check + UI: 1 hour
- Settings layout: 1 hour

***

## 6. Reflection State Management

### 6.1 State Calculation Service

```typescript
// services/reflectionStateService.ts

export type ReflectionState = 
  | { status: 'completed'; canEdit: boolean; isEdited: boolean }
  | { status: 'pending'; hoursRemaining: number }
  | { status: 'overdue'; hoursUntilExpiry: number }
  | { status: 'expired'; canStillReflect: true };

export const getReflectionState = (
  session: Session, 
  reflection?: Reflection
): ReflectionState => {
  // Has reflection
  if (reflection) {
    const hoursSinceEnd = (Date.now() - session.ended_at) / (1000 * 60 * 60);
    const canEdit = hoursSinceEnd <= 48;
    const isEdited = reflection.updated_at && reflection.updated_at > reflection.completed_at;
    
    return {
      status: 'completed',
      canEdit,
      isEdited,
    };
  }
  
  // No reflection - calculate deadline state
  const hoursSinceEnd = (Date.now() - session.ended_at) / (1000 * 60 * 60);
  
  if (hoursSinceEnd <= 24) {
    return {
      status: 'pending',
      hoursRemaining: Math.ceil(24 - hoursSinceEnd),
    };
  }
  
  if (hoursSinceEnd <= 48) {
    return {
      status: 'overdue',
      hoursUntilExpiry: Math.ceil(48 - hoursSinceEnd),
    };
  }
  
  return {
    status: 'expired',
    canStillReflect: true,
  };
};

export const getReflectionBadge = (state: ReflectionState): { 
  emoji: string; 
  label: string; 
  color: string 
} => {
  switch (state.status) {
    case 'completed':
      return { 
        emoji: '✅', 
        label: state.isEdited ? 'Completed (Edited)' : 'Completed',
        color: '#4CAF50' 
      };
    case 'pending':
      return { 
        emoji: '🟡', 
        label: `Due in ${state.hoursRemaining}h`,
        color: '#FFC107' 
      };
    case 'overdue':
      return { 
        emoji: '🟠', 
        label: `Overdue (${state.hoursUntilExpiry}h left)`,
        color: '#FF9800' 
      };
    case 'expired':
      return { 
        emoji: '🔴', 
        label: 'Expired',
        color: '#F44336' 
      };
  }
};
```

**Time Estimate:** 0.5 days (4 hours)

- State calculation logic: 2 hours
- Badge/color helpers: 1 hour
- Integration into timeline screen: 1 hour

***

## 7. Security \& Privacy

### 7.1 Local Encryption (SQLCipher)

```typescript
import * as SQLite from 'expo-sqlite';

// Open encrypted database
const db = SQLite.openDatabaseSync('kolbs_app.db', {
  enableCRSQLite: true, // Enables SQLCipher encryption
});

// Initialize with WAL mode for performance
const initDatabase = async () => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    -- Create tables (see schema section)
  `);
};
```

**Note:** Expo SQLite with `enableCRSQLite` uses device-level encryption (iOS Data Protection). No manual key management needed.[^2]

**Time:** 0.25 days (2 hours) - already budgeted in setup phase

***

### 7.2 Device Lock Warning

```typescript
// In HomeScreen
useEffect(() => {
  checkDeviceSecurity().then(isSecure => {
    setShowSecurityWarning(!isSecure);
  });
}, []);

{showSecurityWarning && (
  <View style={styles.warningBanner}>
    <Text>⚠️ Enable device lock (Face ID/passcode) for better privacy</Text>
    <TouchableOpacity onPress={() => setShowSecurityWarning(false)}>
      <Text>Dismiss</Text>
    </TouchableOpacity>
  </View>
)}
```

**Behavior:** Allow app usage regardless of device lock status (show warning only).[^2]

***

## 8. Development Timeline \& Estimates

### 8.1 Task Breakdown

| Phase | Tasks | Hours | Days |
| :-- | :-- | :-- | :-- |
| **Setup \& Foundation** | Expo init, navigation, Zustand store, DB schema + migrations, theme constants | 8 | 1.0 |
| **Practice Area Management** | HomeScreen (list, create modal, pending reflections banner) | 6 | 0.75 |
| **Session Flow (Core)** | SessionSetupScreen (previous intent, new intent input) | 4 | 0.5 |
|  | SessionActiveScreen (timer, two-button end flow, AppState handling) | 6 | 0.75 |
| **Reflection Flow** | ReflectionFormatScreen (3 cards) | 2 | 0.25 |
|  | ReflectionPromptsScreen (multi-step form, autosave, character limit, edit mode) | 10 | 1.25 |
|  | ReflectionFeedbackScreen (emoji + optional note) | 2 | 0.25 |
| **Reflection State Logic** | State calculation service (pending/overdue/expired), badge helpers | 4 | 0.5 |
| **Series Timeline** | List view with complex states, session detail modal (3 variants) | 8 | 1.0 |
|  | Move session logic (with reflection intact) | 2 | 0.25 |
|  | Delete session logic (no reflection check, soft delete) | 1 | 0.125 |
|  | Edit reflection flow (navigate to prompts in edit mode, update timestamp) | 2 | 0.25 |
|  | Previous intent orphan handling | 1 | 0.125 |
| **Export/Settings** | JSON export builder (with updated_at, is_edited), file write + share sheet | 6 | 0.75 |
|  | Device lock check, settings UI | 2 | 0.25 |
| **Autosave \& AppState** | Debounced autosave, background save, error handling | 4 | 0.5 |
| **Security** | SQLCipher setup, device lock warning banner | 2 | 0.25 |
| **Polish \& Bug Fixes** | UI refinement, loading states, edge cases, toast notifications | 8 | 1.0 |
| **Documentation** | Inline comments, README (LLM-assisted) | 4 | 0.5 |

**Subtotal:** 82 hours = **10.25 days**

***

### 8.2 Overhead \& Contingency

| Item | Multiplier/Hours | Total |
| :-- | :-- | :-- |
| Code review (solo, 5%) | 82 × 0.05 | 4.1 hours |
| Expo + React Native refresher | One-time | 4 hours |
| TestFlight setup (EAS Build config) | One-time | 2 hours |
| TestFlight builds (3 builds × 0.5h each) | Week 1, 2, 3 | 1.5 hours |

**Overhead Total:** 11.6 hours = **1.45 days**

***

### 8.3 Total Timeline

**11.7 days** (~2.3 weeks at full capacity)

**Recommended:** Plan for **12-13 days (2.5-3 weeks)** to account for:

- TestFlight testing feedback cycles
- iOS-specific quirks (keyboard behavior, navigation edge cases)
- Physical device testing with Wispr Flow

***

### 8.4 Week-by-Week Breakdown

#### **Week 1: Core Infrastructure + Session Flow + First Build** (Days 1-5)

**Days 1-4:**

- Expo app setup, navigation structure
- Zustand store creation
- SQLite schema + migrations, encryption
- Practice Area CRUD (HomeScreen)
- Session setup + active timer screens
- Reflection format selection

**Day 5:**

- TestFlight setup (Apple Developer Portal + EAS config)
- **First TestFlight Build** (core flow testable)

**Deliverable:** TestFlight build with Practice Area creation, session start/timer, format selection

***

#### **Week 2: Reflection Flow + Timeline + Second Build** (Days 6-10)

**Days 6-8:**

- ReflectionPromptsScreen (3-step form, autosave, edit mode)
- ReflectionFeedbackScreen
- Reflection state service (pending/overdue/expired logic)
- Sequential session linking enforcement

**Day 9:**

- **Second TestFlight Build** (full reflection flow)

**Days 9-10:**

- SeriesTimelineScreen (list view, session detail modal)
- Move/delete session logic
- Edit reflection flow

**Deliverable:** Complete end-to-end flow testable on device with real Wispr Flow keyboard

***

#### **Week 3: Export + Polish + Final Build** (Days 11-15)

**Days 11-13:**

- Export/backup (JSON with metadata)
- Settings screen
- Device lock warning
- Pending reflections banner on HomeScreen
- UI polish (loading states, error toasts, edge cases)
- Bug fixes from TestFlight feedback

**Days 14-15:**

- Documentation (inline + README)
- **Final TestFlight Build**
- Final QA + handoff

**Deliverable:** Production-ready MVP on TestFlight for daily use

***

## 9. Platform Configuration

### 9.1 app.json (Expo Config)

```json
{
  "expo": {
    "name": "Kolbs Reflection",
    "slug": "kolbs-reflection",
    "version": "1.0.0",
    "platforms": ["ios"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.kolbsreflection",
      "buildNumber": "1",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "This app uses your microphone for voice input via voice-enabled keyboards like Wispr Flow.",
        "NSFaceIDUsageDescription": "Enable Face ID to help protect access to your private reflections."
      }
    },
    "plugins": [
      "expo-sqlite",
      "expo-file-system",
      "expo-sharing",
      "expo-secure-store",
      "expo-local-authentication"
    ],
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```


***

### 9.2 eas.json (Build Configuration)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "bundleIdentifier": "com.yourname.kolbsreflection"
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "bundleIdentifier": "com.yourname.kolbsreflection"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_ID",
        "appleTeamId": "YOUR_APPLE_TEAM_ID"
      }
    }
  }
}
```


***

### 9.3 Key Dependencies (package.json)

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-sqlite": "^14.0.0",
    "expo-file-system": "^17.0.0",
    "expo-sharing": "^12.0.0",
    "expo-secure-store": "^13.0.0",
    "expo-local-authentication": "^14.0.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "react-native-uuid": "^2.0.0",
    "zustand": "^4.5.0",
    "react-native-toast-message": "^2.2.0"
  }
}
```


***

## 10. Risk Mitigation

### 10.1 Wispr Flow Integration

**Risk:** Wispr Flow doesn't work as expected in React Native TextInput

**Mitigation:**

- Test with basic multiline TextInput in first 2 days
- If issues: Fall back to standard iOS keyboard with voice dictation
- Worst case: Typing only (acceptable for MVP, voice is nice-to-have)

**Likelihood:** Low (system keyboard should work universally)

***

### 10.2 Sequential Linking Complexity

**Risk:** Sessions get orphaned or incorrectly linked, breaking Series integrity

**Mitigation:**

- Write DB constraint validation in `createSession` function (reject if logic fails)
- Add simple repair utility in Settings (post-MVP): _"Rebuild Session Chains"_
- Test edge cases: first session, moved sessions, deleted sessions

**Likelihood:** Medium (complex logic, requires careful testing)

***

### 10.3 Reflection Deadline UX

**Risk:** Users find 24h/48h deadlines too strict, creates pressure

**Mitigation:**

- Monitor usage patterns via export data analysis (manual)
- Post-MVP: Make deadlines configurable in Settings (24h/48h/none)
- Clear messaging: _"Reflect while details are fresh"_ (educational, not punitive)

**Likelihood:** Low-Medium (depends on user discipline preferences)

***

### 10.4 Autosave Race Conditions

**Risk:** User rapidly switches fields or backgrounds app, causing save conflicts

**Mitigation:**

- Use single write queue (sequential promises)
- Add `last_modified` timestamp to detect conflicts
- On conflict: Keep most recent version, log warning

**Likelihood:** Low (single user, local DB, debounced saves)

***

## 11. Testing Strategy (MVP Scope)

### 11.1 Manual Testing Focus

**No automated tests for MVP** (per developer profile).[^1]

**Critical Manual Test Cases:**

**Session Linking:**

- ✅ First session in new PA has `previous_session_id = NULL`
- ✅ Second session links to first session ID
- ✅ After moving session, new PA's next session links correctly
- ✅ Deleted session doesn't break next session's lookup

**Reflection Deadlines:**

- ✅ Session <24h shows "Pending" badge
- ✅ Session 24-48h shows "Overdue" badge
- ✅ Session >48h shows "Expired" badge
- ✅ HomeScreen banner updates correctly based on state

**Edit Reflections:**

- ✅ Can edit reflection within 48h
- ✅ Cannot edit reflection after 48h (button hidden)
- ✅ `updated_at` timestamp set correctly
- ✅ "Edited" badge shows in timeline

**Move/Delete Sessions:**

- ✅ Can move session without reflection
- ✅ Can move session with reflection (reflection intact)
- ✅ Can delete session without reflection
- ✅ Cannot delete session with reflection (blocked with message)

**Autosave:**

- ✅ Blur on TextInput saves draft to DB
- ✅ Backgrounding app saves draft
- ✅ Returning to app restores draft
- ✅ Error toast shows if save fails

**Export:**

- ✅ JSON includes all Practice Areas + Sessions + Reflections
- ✅ `updated_at` and `is_edited` fields present
- ✅ Share sheet opens correctly
- ✅ Can save to Files or AirDrop

***

### 11.2 TestFlight Testing Workflow

**Week 1 Build:**

- Test Practice Area creation
- Test session timer (including app backgrounding)
- Test Wispr Flow keyboard input

**Week 2 Build:**

- Test full reflection flow (all 3 formats)
- Test autosave on blur and background
- Test reflection deadlines (create test sessions and wait)

**Week 3 Build:**

- Test move/delete sessions
- Test edit reflections (within and after 48h)
- Test export (verify JSON structure manually)
- Test all edge cases from critical test list

***

## 12. Post-MVP Roadmap

### 12.1 Deferred Features (High Value)

| Feature | Effort | Value |
| :-- | :-- | :-- |
| **Filters on timeline** (by format, by feedback) | +1 day | Medium - helps find patterns |
| **Synthesis view** (charts: format distribution, feedback trends) | +2-3 days | High - visual insights |
| **Configurable deadlines** (24h/48h/off in Settings) | +0.5 days | Medium - user flexibility |
| **Auto-repair chains** (fix orphaned `previous_session_id`) | +0.5 days | Low - edge case handling |
| **Android support** | +0.5 days | High - expands user base |
| **Accessibility** (screen reader tuning, VoiceOver support) | +2 days | High - inclusivity |


***

### 12.2 Technical Debt

- **Testing:** Add Detox/Playwright integration tests (+3-4 days)
- **State management:** Consider Redux if app grows beyond 10 screens (+1-2 days)
- **Onboarding:** First-run tutorial explaining Series model (+1 day)
- **Cloud backup:** Optional iCloud sync (requires ejecting Expo, +4-5 days)

***

## 13. Developer Handoff Checklist

### 13.1 Before Starting Development

- [ ] Install Expo CLI (`npm install -g expo-cli`)
- [ ] Create Apple Developer Account (\$99/year)
- [ ] Set up EAS account (`npm install -g eas-cli && eas login`)
- [ ] Test Wispr Flow with basic React Native TextInput (Day 1)
- [ ] Set up GitHub repo with `.gitignore` for Expo
- [ ] Create SQLite schema diagram (use dbdiagram.io or similar)

***

### 13.2 Week 1 Deliverables

- [ ] Can create/select Practice Areas
- [ ] Session timer works and persists on background
- [ ] Format selection screen functional
- [ ] **First TestFlight build uploaded and testable**

***

### 13.3 Week 2 Deliverables

- [ ] Full reflection flow works (3 prompts + feedback)
- [ ] Reflections saved to DB with correct session linkage
- [ ] Reflection state badges show correctly (pending/overdue/expired)
- [ ] Timeline shows session history with detail modal
- [ ] **Second TestFlight build with full reflection flow**

***

### 13.4 Week 3 Deliverables

- [ ] Export produces valid JSON with all metadata
- [ ] Move session works (with and without reflection)
- [ ] Delete session works (blocks if reflection exists)
- [ ] Edit reflection works (within 48h only)
- [ ] Autosave tested in multiple scenarios (blur, background, errors)
- [ ] Device lock warning displays correctly
- [ ] HomeScreen pending reflections banner functional
- [ ] README and inline docs complete
- [ ] **Final TestFlight build ready for daily use**

***

## 14. Final Questions \& Decisions Log

**Resolved during spec discussion:**

1. **Voice input:** System keyboard (Wispr Flow) - no custom integration needed ✅
2. **State management:** Zustand (simpler, better performance than Context) ✅
3. **Reflection requirement:** 24h soft deadline → 48h hard expiry (can still add after with warning) ✅
4. **Reflect later:** Yes, two-button flow on session end ✅
5. **Edit reflections:** Yes, within 48h only, show `updated_at` timestamp ✅
6. **Edit intent:** No, immutable after session start ✅
7. **Move sessions:** Allow with reflection intact (rare mistake correction) ✅
8. **Delete sessions:** Only if no reflection exists (soft delete) ✅
9. **Export metadata:** Include `updated_at` and computed `is_edited` flag ✅
10. **Analytics:** None; all analysis via manual export ✅

***

## 15. Success Metrics (Post-Launch)

**Tracked via export data analysis (manual):**

- **Engagement:** Average sessions per week (target: 3+)
- **Reflection completion:** % of sessions with completed reflections within 48h (target: >70%)
- **Format usage:** Distribution of Direct/Reflective/Minimalist (identify preferences)
- **Reflection feedback:** % of "Good/Helpful" or "Great/Energizing" ratings (target: >60%)
- **Edit frequency:** % of reflections edited (track if feature is valuable)
- **Series continuity:** Average chain length per Practice Area (longer = better engagement)

**Privacy compliance:**

- [ ] 100% local storage (no network requests)
- [ ] Data encrypted at rest (SQLCipher)
- [ ] Export is plaintext JSON (user controls sharing)

***

## 16. Contact \& Support

**For Developer:**

- This spec assumes solo development by profile in[^1]
- Use LLM assistance for documentation, test generation, and complex logic debugging
- Flag blocking issues early (Wispr Flow integration, SQLite edge cases, navigation quirks)

**For Product Owner:**

- Review TestFlight builds weekly (Week 1, 2, 3)
- Provide feedback via shared doc or direct messages
- Test with real Wispr Flow on physical iPhone
- Export data weekly to verify JSON structure and metadata

***

**END OF TECHNICAL SPECIFICATION**

***

This spec is ready for implementation. The developer can start Week 1 with clear tasks, dependencies, and acceptance criteria. All design decisions are locked, and the timeline accounts for realistic development pace with buffer for TestFlight testing cycles.

<div align="center">⁂</div>

[^1]: Main-developer-profile.md

[^2]: Kolbs-Cycle-App-PRD.md

[^3]: https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m

[^4]: https://dev.to/shubhamtiwari909/react-context-api-vs-zustand-pki

