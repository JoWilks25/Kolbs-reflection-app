# Kolb's Reflection Cycle App – Technical Specification

_Last updated: 2026-01-06_
_Version: 2.0 (AI-Assisted Coaching Redesign)_

***

## 1. Executive Summary

**Platform:** React Native with Expo (managed workflow), iOS-only MVP
**Minimum iOS:** iOS 26+ for AI features (graceful degradation for older devices)
**Developer:** Senior full-stack engineer with React/Node.js expertise, prior React Native + Expo experience[^1]
**Core Focus:** Privacy-first, local-only reflection app with AI-assisted coaching using Apple Foundation Models for context-aware prompts and adaptive follow-ups[^2]

### What's New in v2.0

- **AI-Assisted Coaching:** Replaces fixed reflection formats with 3 coaching tones (Facilitative, Socratic, Supportive)
- **On-Device LLM:** Apple Foundation Models via `react-native-ai` for context-aware placeholders and adaptive follow-ups
- **Practice Area Types:** User-selected classification (solo_skill, performance, interpersonal, creative) for AI adaptation
- **Per-Session AI Toggle:** Users can enable/disable AI assistance for each reflection (default: ON)
- **Graceful Degradation:** Full functionality on older devices, AI features hidden when unavailable

### Key Simplifications

- **Voice input:** Handled by system keyboard (Wispr Flow) - no custom voice API integration[^2]
- **State management:** Zustand (simpler than Context + useReducer, better performance)
- **Analytics:** None; all analysis via manual JSON export[^2]
- **AI Processing:** 100% on-device via Apple Foundation Models - zero cloud dependencies

### MVP Scope Highlights

- ✅ Practice Area creation & selection **with type classification**
- ✅ Sequential session linking with strict enforcement
- ✅ Timer with optional target duration (15/30/45/60 min presets + notifications)
- ✅ **3 coaching tones (Facilitative, Socratic, Supportive)** replacing fixed formats
- ✅ **AI-generated placeholder starters** based on Practice Area, intent, and previous session
- ✅ **Adaptive follow-up questions** (max 1-2 per step) based on answer length and Practice Area type
- ✅ **Per-session AI toggle** (default ON for supported devices)
- ✅ 24h/48h reflection deadlines with "Reflect Later" option
- ✅ Edit reflections within 48h (with `updated_at` tracking)
- ✅ Move sessions to different Practice Area (mistake correction)
- ✅ Soft delete sessions (no reflection only)
- ✅ Series timeline with session details, **tone badges, and AI indicators**
- ✅ JSON export with **coaching tone and AI usage metadata**
- ✅ Device lock warning, encrypted local DB[^2]
- ✅ **Graceful degradation** for devices without Apple Intelligence

### Explicitly Out of Scope

- ❌ Filters on timeline (by tone, by AI usage, by feedback) - **Post-MVP**
- ❌ Synthesis/trends view (charts, AI adoption analytics) - **Post-MVP**
- ❌ Dedicated accessibility work beyond RN defaults
- ❌ Cloud sync or external analytics
- ❌ Intent editing (immutable after session start)
- ❌ Countdown timer (only count-up with optional target)
- ❌ MLC-LLM fallback for non-Apple devices - **Post-MVP**

***

## 2. Architecture Overview

### 2.1 Technology Stack

| Layer | Technology | Rationale |
| :-- | :-- | :-- |
| Framework | React Native + Expo SDK 52+ | Leverages developer's React expertise, rapid mobile MVP delivery [^1] |
| Platform | iOS only (iOS 26+ for AI) | Simplifies QA, enables Apple Foundation Models [^2] |
| Navigation | React Navigation 6.x (Stack) | Industry standard, excellent Expo integration |
| State Management | **Zustand** | Simpler setup than Context, better performance with selective re-renders |
| Database | expo-sqlite (SQLCipher encryption) | Relational model, enforces sequential linking, local-only [^2] |
| **AI Integration** | **react-native-ai (@react-native-ai/apple)** | Apple Foundation Models, zero bundle size, on-device processing |
| Security | expo-local-authentication | Device lock status check (Face ID/passcode) [^2] |
| Notifications | expo-notifications | Target duration alerts (local, no push) |
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
│   ├── ReflectionToneScreen.tsx       ← RENAMED from ReflectionFormatScreen
│   ├── ReflectionPromptsScreen.tsx    ← UPDATED for AI integration
│   ├── ReflectionFeedbackScreen.tsx   ← UPDATED for AI-aware question
│   ├── SeriesTimelineScreen.tsx       ← UPDATED for tone badges
│   └── SettingsScreen.tsx
├── stores/
│   └── appStore.ts (Zustand)          ← UPDATED with AI state
├── db/
│   ├── schema.ts                      ← UPDATED schema
│   ├── queries.ts
│   └── migrations.ts                  ← NEW migration for v2
├── services/
│   ├── aiService.ts                   ← NEW: Apple Foundation Models
│   ├── promptService.ts               ← NEW: Prompt building by tone × type
│   ├── exportService.ts
│   ├── importService.ts
│   ├── securityService.ts
│   ├── reflectionStateService.ts
│   └── notificationService.ts
├── hooks/
│   └── useAICoaching.ts               ← NEW: React hook for AI features
├── components/
│   ├── PracticeAreaModal.tsx          ← UPDATED: Type dropdown
│   ├── PracticeAreaPicker.tsx
│   ├── EmptyState.tsx
│   ├── PendingReflectionsBanner.tsx
│   ├── SecurityWarningBanner.tsx
│   └── SessionDetailModal.tsx
└── utils/
    ├── constants.ts                   ← UPDATED: Coaching tones
    ├── types.ts                       ← UPDATED: New types
    ├── timeFormatting.ts
    ├── draftCleanup.ts
    └── uuid.ts
```

### 2.3 AI Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Input Context                          │
├─────────────────────────────────────────────────────────────────────┤
│  Practice Area Name + Type  │  Session Intent  │  Previous Step 4   │
│  "Piano: Hands Independence"│  "Increase tempo"│  "Practice accents"│
│  type: solo_skill           │                  │                    │
└──────────────┬──────────────┴────────┬─────────┴──────────┬─────────┘
               │                       │                    │
               ▼                       ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Context Builder Service                        │
│  Assembles context object with all relevant information              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Prompt Service                                 │
│  Selects tone-specific system prompt + Practice Area type modifiers  │
│  Reference: Prompt Engineering Document (separate)                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 Apple Foundation Models (via react-native-ai)        │
│  On-device LLM inference, <2s latency target                         │
│  iOS 26+ required, Apple Intelligence-enabled devices                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│   Placeholder Starters   │    │   Follow-up Questions    │
│   "I focused on..."      │    │   "What assumptions did  │
│   "The main challenge.." │    │    you have going in?"   │
└──────────────────────────┘    └──────────────────────────┘
```

***

## 3. State Management (Zustand)

### 3.1 Store Architecture

```typescript
// stores/appStore.ts
import create from 'zustand';

export type CoachingTone = 1 | 2 | 3; // 1=Facilitative, 2=Socratic, 3=Supportive
export type PracticeAreaType = 'solo_skill' | 'performance' | 'interpersonal' | 'creative';

export const useAppStore = create((set, get) => ({
  // Practice Area state
  practiceAreas: [],
  currentPracticeArea: null,
  
  // Session state
  currentSession: null,
  sessionStartTime: null,
  sessionTimer: 0,
  targetDuration: null,
  targetReached: false,
  
  // AI capability state (NEW in v2)
  aiAvailable: false,           // Is Apple Intelligence available on this device?
  aiEnabled: true,              // User's per-session AI toggle (default ON)
  
  // Reflection draft state (UPDATED in v2)
  reflectionDraft: {
    coachingTone: null,         // RENAMED from format
    aiAssisted: true,           // NEW: Was AI enabled for this reflection?
    step2: '',
    step3: '',
    step4: '',
    // AI interaction tracking (NEW)
    aiPlaceholdersShown: 0,
    aiFollowupsShown: 0,
    aiFollowupsAnswered: 0,
    feedbackRating: null,
    feedbackNote: '',
  },
  
  // UI state
  showSecurityWarning: false,
  pendingReflectionsCount: 0,
  
  // Actions: Practice Areas
  setPracticeAreas: (areas) => set({ practiceAreas: areas }),
  setCurrentPracticeArea: (pa) => set({ currentPracticeArea: pa }),
  
  // Actions: AI (NEW in v2)
  setAiAvailable: (available: boolean) => set({ aiAvailable: available }),
  setAiEnabled: (enabled: boolean) => set({ aiEnabled: enabled }),
  
  // Actions: Sessions
  startSession: (session, targetDuration = null) => set({ 
    currentSession: session, 
    sessionStartTime: Date.now(),
    sessionTimer: 0,
    targetDuration,
    targetReached: false,
  }),
  
  updateTimer: () => set((state) => {
    const newTimer = state.sessionStartTime 
      ? Math.floor((Date.now() - state.sessionStartTime) / 1000)
      : 0;
    
    const targetJustReached = state.targetDuration 
      && !state.targetReached 
      && newTimer >= state.targetDuration;
    
    return {
      sessionTimer: newTimer,
      targetReached: state.targetReached || targetJustReached,
    };
  }),
  
  endSession: () => set({ 
    currentSession: null, 
    sessionStartTime: null,
    sessionTimer: 0,
    targetDuration: null,
    targetReached: false,
  }),
  
  // Actions: Reflection drafts (UPDATED in v2)
  setCoachingTone: (tone: CoachingTone) => set((state) => ({
    reflectionDraft: { 
      ...state.reflectionDraft, 
      coachingTone: tone,
      aiAssisted: state.aiEnabled && state.aiAvailable,
    }
  })),
  
  updateReflectionDraft: (field, value) => set((state) => ({
    reflectionDraft: { ...state.reflectionDraft, [field]: value }
  })),
  
  incrementAiMetric: (metric: 'aiPlaceholdersShown' | 'aiFollowupsShown' | 'aiFollowupsAnswered') => 
    set((state) => ({
      reflectionDraft: { 
        ...state.reflectionDraft, 
        [metric]: state.reflectionDraft[metric] + 1 
      }
    })),
  
  clearReflectionDraft: () => set({
    reflectionDraft: {
      coachingTone: null,
      aiAssisted: true,
      step2: '',
      step3: '',
      step4: '',
      aiPlaceholdersShown: 0,
      aiFollowupsShown: 0,
      aiFollowupsAnswered: 0,
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
// In ReflectionToneScreen
const { 
  aiAvailable, 
  aiEnabled, 
  setAiEnabled,
  setCoachingTone 
} = useAppStore();

// Show AI toggle only if device supports it
{aiAvailable && (
  <Switch 
    value={aiEnabled} 
    onValueChange={setAiEnabled}
    label="Enable AI coaching for this reflection"
  />
)}

// In ReflectionPromptsScreen
const { 
  reflectionDraft,
  incrementAiMetric,
} = useAppStore();

// Track when AI placeholder is shown
useEffect(() => {
  if (aiPlaceholder) {
    incrementAiMetric('aiPlaceholdersShown');
  }
}, [aiPlaceholder]);
```

***

## 4. Data Schema (SQLite)

### 4.1 Tables

```sql
-- Practice Areas (UPDATED in v2)
CREATE TABLE IF NOT EXISTS practice_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'solo_skill',  -- NEW: 'solo_skill' | 'performance' | 'interpersonal' | 'creative'
  created_at INTEGER NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

-- Sessions (unchanged from v1)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  practice_area_id TEXT NOT NULL,
  previous_session_id TEXT,
  intent TEXT NOT NULL,
  target_duration_seconds INTEGER,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (practice_area_id) REFERENCES practice_areas(id),
  FOREIGN KEY (previous_session_id) REFERENCES sessions(id)
);

-- Reflections (UPDATED in v2)
CREATE TABLE IF NOT EXISTS reflections (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  coaching_tone INTEGER NOT NULL,       -- RENAMED: 1=Facilitative, 2=Socratic, 3=Supportive
  ai_assisted INTEGER NOT NULL DEFAULT 1, -- NEW: 0=off, 1=on
  step2_answer TEXT NOT NULL,
  step3_answer TEXT NOT NULL,
  step4_answer TEXT NOT NULL,
  -- AI interaction metrics (NEW)
  ai_placeholders_shown INTEGER DEFAULT 0,
  ai_followups_shown INTEGER DEFAULT 0,
  ai_followups_answered INTEGER DEFAULT 0,
  -- Feedback
  feedback_rating INTEGER,              -- 0-4 scale (unchanged)
  feedback_note TEXT,
  completed_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_practice_area 
  ON sessions (practice_area_id, started_at);

CREATE INDEX IF NOT EXISTS idx_sessions_previous 
  ON sessions (previous_session_id);

CREATE INDEX IF NOT EXISTS idx_reflections_session 
  ON reflections (session_id);

CREATE INDEX IF NOT EXISTS idx_sessions_ended_at
  ON sessions (ended_at);

-- NEW: Index for AI analytics queries
CREATE INDEX IF NOT EXISTS idx_reflections_ai_assisted
  ON reflections (ai_assisted, coaching_tone);
```

### 4.2 Migration from v1 to v2

```typescript
// db/migrations.ts

export const migrations = [
  // v1 migrations...
  
  // v2.0 Migration: AI-Assisted Coaching Redesign
  {
    version: 2,
    up: async (db: SQLiteDatabase) => {
      // Add type column to practice_areas
      await db.execAsync(`
        ALTER TABLE practice_areas 
        ADD COLUMN type TEXT NOT NULL DEFAULT 'solo_skill';
      `);
      
      // Rename format to coaching_tone and add AI columns to reflections
      // SQLite doesn't support RENAME COLUMN directly, so we recreate the table
      await db.execAsync(`
        -- Create new reflections table with v2 schema
        CREATE TABLE reflections_v2 (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL UNIQUE,
          coaching_tone INTEGER NOT NULL,
          ai_assisted INTEGER NOT NULL DEFAULT 0,
          step2_answer TEXT NOT NULL,
          step3_answer TEXT NOT NULL,
          step4_answer TEXT NOT NULL,
          ai_placeholders_shown INTEGER DEFAULT 0,
          ai_followups_shown INTEGER DEFAULT 0,
          ai_followups_answered INTEGER DEFAULT 0,
          feedback_rating INTEGER,
          feedback_note TEXT,
          completed_at INTEGER NOT NULL,
          updated_at INTEGER,
          FOREIGN KEY (session_id) REFERENCES sessions(id)
        );
        
        -- Migrate data (format -> coaching_tone, ai_assisted = 0 for old data)
        INSERT INTO reflections_v2 
        SELECT 
          id, session_id, 
          format as coaching_tone,  -- Map old format values to coaching_tone
          0 as ai_assisted,         -- Old reflections were not AI-assisted
          step2_answer, step3_answer, step4_answer,
          0, 0, 0,                   -- No AI metrics for old data
          feedback_rating, feedback_note,
          completed_at, updated_at
        FROM reflections;
        
        -- Drop old table and rename
        DROP TABLE reflections;
        ALTER TABLE reflections_v2 RENAME TO reflections;
        
        -- Recreate indexes
        CREATE INDEX IF NOT EXISTS idx_reflections_session ON reflections (session_id);
        CREATE INDEX IF NOT EXISTS idx_reflections_ai_assisted ON reflections (ai_assisted, coaching_tone);
      `);
    },
    down: async (db: SQLiteDatabase) => {
      // Rollback migration if needed
      // ... reverse operations
    }
  }
];
```

### 4.3 Coaching Tone Mapping

| Value | v1 Format | v2 Coaching Tone | Description |
|-------|-----------|------------------|-------------|
| 1 | Direct | **Facilitative** | Guided discovery, open questions |
| 2 | Reflective | **Socratic** | Structured inquiry, challenge assumptions |
| 3 | Minimalist | **Supportive** | Encouraging, emotional scaffolding |

**Note:** The mapping preserves numeric values for backward compatibility with exported data. The semantic meaning changes but the structure remains compatible.

### 4.4 Practice Area Types

| Type | Description | AI Adaptation |
|------|-------------|---------------|
| `solo_skill` | Technical practice, measurable progress | Focus on technique, precision, incremental improvement |
| `performance` | Execution under pressure, audience awareness | Address nerves, preparation, presence |
| `interpersonal` | Communication, emotional dynamics | Explore perspectives, emotional impact, relationship dynamics |
| `creative` | Exploration, experimentation, non-linear discovery | Encourage divergent thinking, embrace uncertainty |

### 4.5 Data Constraints & Rules

**Sequential Linking:** (unchanged)
- First session in a Practice Area: `previous_session_id = NULL`
- All subsequent sessions: `previous_session_id` must reference immediately prior session

**Soft Delete:** (unchanged)
- Use `is_deleted = 1` to preserve Series integrity
- Only allow deletion if no reflection exists

**Text Limits:** (unchanged)
- Reflection answers: 3000 characters per field (≈500 words)

**AI Defaults:**
- `ai_assisted` defaults to 1 (ON) for new reflections on supported devices
- `ai_assisted` is 0 for devices without Apple Intelligence
- AI metrics default to 0

***

## 5. AI Integration

### 5.1 Technology Choice

**Primary:** `react-native-ai` (@react-native-ai/apple)
- Uses Apple Foundation Models (built-in iOS 26+ AI)
- Zero bundle size impact (uses device's built-in LLM)
- Integrates with Vercel AI SDK patterns
- Works with Expo via `expo-dev-client`

**Requirements:**
- iOS 26+
- Apple Intelligence-enabled device (iPhone 15 Pro+, or M-series iPad/Mac)
- No network required - fully on-device

### 5.2 AI Service Implementation

```typescript
// services/aiService.ts
import { createApple } from '@react-native-ai/apple';
import { Platform } from 'react-native';

// Check if AI is available on this device
export const checkAIAvailability = async (): Promise<boolean> => {
  // Check iOS version
  const iosVersion = parseInt(Platform.Version as string, 10);
  if (iosVersion < 26) {
    return false;
  }
  
  // Check Apple Intelligence availability
  try {
    const apple = createApple();
    const isAvailable = await apple.isAvailable();
    return isAvailable;
  } catch (error) {
    console.warn('AI availability check failed:', error);
    return false;
  }
};

// Initialize Apple Foundation Models
export const initializeAI = async () => {
  const apple = createApple();
  return apple;
};

// Generate placeholder starter for a Kolb step
export const generatePlaceholder = async (
  context: AIContext,
  step: 2 | 3 | 4,
): Promise<string | null> => {
  const apple = createApple();
  const prompt = buildPlaceholderPrompt(context, step);
  
  try {
    const startTime = Date.now();
    const response = await apple.generate({
      prompt,
      maxTokens: 50, // Short placeholder
      temperature: 0.7,
    });
    
    const latency = Date.now() - startTime;
    if (latency > 2000) {
      console.warn(`AI placeholder latency exceeded target: ${latency}ms`);
    }
    
    return response.text;
  } catch (error) {
    console.error('Placeholder generation failed:', error);
    return null;
  }
};

// Generate follow-up question based on user's answer
export const generateFollowup = async (
  context: AIContext,
  step: 2 | 3 | 4,
  userAnswer: string,
): Promise<string | null> => {
  // Only generate follow-up if answer is brief
  if (userAnswer.length >= 50) {
    return null;
  }
  
  const apple = createApple();
  const prompt = buildFollowupPrompt(context, step, userAnswer);
  
  try {
    const startTime = Date.now();
    const response = await apple.generate({
      prompt,
      maxTokens: 100,
      temperature: 0.8,
    });
    
    const latency = Date.now() - startTime;
    if (latency > 2000) {
      console.warn(`AI follow-up latency exceeded target: ${latency}ms`);
    }
    
    return response.text;
  } catch (error) {
    console.error('Follow-up generation failed:', error);
    return null;
  }
};

// Types
export interface AIContext {
  practiceAreaName: string;
  practiceAreaType: PracticeAreaType;
  sessionIntent: string;
  previousStep4Answer: string | null;
  coachingTone: CoachingTone;
  currentStepAnswers?: {
    step2?: string;
    step3?: string;
  };
}
```

### 5.3 Prompt Service

```typescript
// services/promptService.ts
import { AIContext, CoachingTone, PracticeAreaType } from './aiService';

// System prompts by coaching tone
const TONE_SYSTEM_PROMPTS: Record<CoachingTone, string> = {
  1: `You are a facilitative coach using guided discovery. Help users explore their own beliefs and emotions through clarifying questions. Never give direct answers - guide users to their own conclusions.`,
  
  2: `You are a Socratic coach using structured inquiry. Challenge assumptions, examine evidence, and explore implications. Ask probing questions that build critical thinking systematically.`,
  
  3: `You are a supportive coach providing emotional scaffolding. Offer encouragement, normalize struggle, and show empathy. Help users feel capable while providing specific assistance when needed.`,
};

// Practice Area type modifiers
const TYPE_MODIFIERS: Record<PracticeAreaType, string> = {
  solo_skill: `Focus on technical execution, precision, and measurable improvement. Reference specific techniques and physical/mental processes.`,
  
  performance: `Address execution under pressure, audience awareness, and managing nerves. Consider preparation, presence, and recovery from mistakes.`,
  
  interpersonal: `Explore multiple perspectives, emotional dynamics, and relationship impact. Consider how others experienced the interaction.`,
  
  creative: `Encourage divergent thinking and embrace uncertainty. Explore where ideas came from and what surprised the user.`,
};

// Build placeholder prompt
export const buildPlaceholderPrompt = (
  context: AIContext,
  step: 2 | 3 | 4,
): string => {
  const tonePrompt = TONE_SYSTEM_PROMPTS[context.coachingTone];
  const typeModifier = TYPE_MODIFIERS[context.practiceAreaType];
  
  const stepInstructions = {
    2: `Generate a brief placeholder starter (3-6 words) for describing what happened during practice. Example: "I focused on..." or "The main challenge was..."`,
    3: `Generate a brief placeholder starter (3-6 words) for identifying a lesson or pattern. Example: "I noticed that..." or "The key insight was..."`,
    4: `Generate a brief placeholder starter (3-6 words) for planning next steps. Example: "Next time I will..." or "I want to try..."`,
  };
  
  return `${tonePrompt}

${typeModifier}

Context:
- Practice Area: ${context.practiceAreaName}
- Today's Intent: ${context.sessionIntent}
${context.previousStep4Answer ? `- Previous Session Goal: ${context.previousStep4Answer}` : ''}

${stepInstructions[step]}

Respond with ONLY the placeholder text, nothing else.`;
};

// Build follow-up question prompt
export const buildFollowupPrompt = (
  context: AIContext,
  step: 2 | 3 | 4,
  userAnswer: string,
): string => {
  const tonePrompt = TONE_SYSTEM_PROMPTS[context.coachingTone];
  const typeModifier = TYPE_MODIFIERS[context.practiceAreaType];
  
  // Tone × Type specific follow-up examples (from PRD)
  const followupExamples = getFollowupExamples(context.coachingTone, context.practiceAreaType, step);
  
  return `${tonePrompt}

${typeModifier}

Context:
- Practice Area: ${context.practiceAreaName} (${context.practiceAreaType})
- Today's Intent: ${context.sessionIntent}
- User's answer so far: "${userAnswer}"

The user's answer is brief. Generate ONE follow-up question to help them reflect more deeply.

Example follow-ups for this tone and practice type:
${followupExamples}

Respond with ONLY the follow-up question, nothing else.`;
};

// Get tone × type specific follow-up examples
const getFollowupExamples = (
  tone: CoachingTone,
  type: PracticeAreaType,
  step: 2 | 3 | 4,
): string => {
  // Matrix from PRD Section "How AI Adapts by Practice Area Type × Coaching Tone"
  const matrix: Record<CoachingTone, Record<PracticeAreaType, string>> = {
    1: { // Facilitative
      solo_skill: '"How did you feel during the challenging parts?"',
      performance: '"How did your internal experience differ from what you think others saw?"',
      interpersonal: '"How do you think the other person experienced the interaction?"',
      creative: '"What surprised you about where your ideas went?"',
    },
    2: { // Socratic
      solo_skill: '"What assumptions did you have going in that proved incorrect?"',
      performance: '"What thought patterns affected your confidence?"',
      interpersonal: '"What evidence do you have for your interpretation of their behavior?"',
      creative: '"What constraints or habits shaped your creative choices?"',
    },
    3: { // Supportive
      solo_skill: '"Which part are you most proud of handling?"',
      performance: '"What helped you push through the nerves?"',
      interpersonal: '"What felt uncomfortable, and how did you navigate it?"',
      creative: '"What moments felt like you were in flow?"',
    },
  };
  
  return matrix[tone][type];
};
```

### 5.4 AI Coaching Hook

```typescript
// hooks/useAICoaching.ts
import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { 
  generatePlaceholder, 
  generateFollowup,
  AIContext 
} from '../services/aiService';

export const useAICoaching = (step: 2 | 3 | 4) => {
  const { 
    currentPracticeArea,
    currentSession,
    reflectionDraft,
    aiAvailable,
    aiEnabled,
    incrementAiMetric,
  } = useAppStore();
  
  const [placeholder, setPlaceholder] = useState<string | null>(null);
  const [followup, setFollowup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Build context for AI
  const buildContext = useCallback((): AIContext | null => {
    if (!currentPracticeArea || !currentSession || !reflectionDraft.coachingTone) {
      return null;
    }
    
    return {
      practiceAreaName: currentPracticeArea.name,
      practiceAreaType: currentPracticeArea.type,
      sessionIntent: currentSession.intent,
      previousStep4Answer: currentSession.previousStep4Answer || null,
      coachingTone: reflectionDraft.coachingTone,
      currentStepAnswers: {
        step2: reflectionDraft.step2,
        step3: reflectionDraft.step3,
      },
    };
  }, [currentPracticeArea, currentSession, reflectionDraft]);
  
  // Generate placeholder on mount
  useEffect(() => {
    const fetchPlaceholder = async () => {
      if (!aiAvailable || !aiEnabled || !reflectionDraft.aiAssisted) {
        return;
      }
      
      const context = buildContext();
      if (!context) return;
      
      setIsLoading(true);
      const result = await generatePlaceholder(context, step);
      setPlaceholder(result);
      
      if (result) {
        incrementAiMetric('aiPlaceholdersShown');
      }
      setIsLoading(false);
    };
    
    fetchPlaceholder();
  }, [step, aiAvailable, aiEnabled]);
  
  // Generate follow-up when user's answer is brief
  const checkForFollowup = useCallback(async (userAnswer: string) => {
    if (!aiAvailable || !aiEnabled || !reflectionDraft.aiAssisted) {
      return;
    }
    
    // Only show follow-up for brief answers
    if (userAnswer.length >= 50) {
      setFollowup(null);
      return;
    }
    
    const context = buildContext();
    if (!context) return;
    
    const result = await generateFollowup(context, step, userAnswer);
    setFollowup(result);
    
    if (result) {
      incrementAiMetric('aiFollowupsShown');
    }
  }, [aiAvailable, aiEnabled, buildContext, step]);
  
  // Track when user answers a follow-up
  const markFollowupAnswered = useCallback(() => {
    if (followup) {
      incrementAiMetric('aiFollowupsAnswered');
    }
  }, [followup]);
  
  return {
    placeholder,
    followup,
    isLoading,
    checkForFollowup,
    markFollowupAnswered,
    aiActive: aiAvailable && aiEnabled && reflectionDraft.aiAssisted,
  };
};
```

### 5.5 Graceful Degradation

```typescript
// In App.tsx - Check AI availability on launch
useEffect(() => {
  const initApp = async () => {
    // Check AI availability
    const aiAvailable = await checkAIAvailability();
    setAiAvailable(aiAvailable);
    
    if (!aiAvailable) {
      console.log('AI features unavailable - running in tones-only mode');
    }
    
    // Continue with other init...
  };
  
  initApp();
}, []);
```

**Behavior by Device Capability:**

| Device | iOS Version | Apple Intelligence | AI Features | AI Toggle |
|--------|-------------|-------------------|-------------|-----------|
| iPhone 15 Pro+ | 26+ | ✅ | Full | Visible, default ON |
| iPhone 15 | 26+ | ❌ | Disabled | Hidden |
| iPhone 14 | 26+ | ❌ | Disabled | Hidden |
| Any iPhone | <26 | N/A | Disabled | Hidden |

**UI Behavior:**
- **AI Available:** Show coaching tone cards + AI toggle (default ON)
- **AI Unavailable:** Show coaching tone cards only, no toggle, `ai_assisted = 0` in DB

***

## 6. Core Features & Screens

### 6.1 Navigation Flow (Updated)

```
HomeScreen
  ├→ SessionSetupScreen
  │   └→ SessionActiveScreen
  │       └→ [End & Reflect Now] → ReflectionToneScreen → ReflectionPromptsScreen → ReflectionFeedbackScreen → SeriesTimelineScreen
  │       └→ [End (Reflect Later)] → SeriesTimelineScreen
  ├→ SeriesTimelineScreen
  │   └→ [Complete Reflection] → ReflectionToneScreen → ...
  │   └→ [Edit Reflection] → ReflectionPromptsScreen (edit mode) → ...
  └→ SettingsScreen
```

### 6.2 HomeScreen – Practice Areas

**Purpose:** Entry point; select existing Practice Area or create new one

**UI Components:** (mostly unchanged from v1)

- FlatList of Practice Areas (non-deleted)
    - Name
    - **Type badge** (NEW): Solo / Performance / Interpersonal / Creative
    - Last session date (if any)
    - Total sessions count
- Pending Reflections Banner
- "+ New Practice Area" button → **opens modal with type dropdown**
- Settings icon (top-right)
- Security warning banner (dismissible)

**Blocking Guard:** (unchanged from v1)

### 6.3 PracticeAreaModal – Create/Edit Practice Area (Updated)

**Purpose:** Create new Practice Area with name and type classification

**UI Components:**

```tsx
<Modal visible={visible} animationType="slide">
  <View style={styles.modalContent}>
    <Text style={styles.title}>New Practice Area</Text>
    
    {/* Name Input */}
    <TextInput
      placeholder="Practice Area name (e.g., Piano: Hands Independence)"
      value={name}
      onChangeText={setName}
      style={styles.input}
    />
    
    {/* Type Dropdown (NEW in v2) */}
    <Text style={styles.label}>What type of practice is this?</Text>
    <Picker
      selectedValue={type}
      onValueChange={setType}
      style={styles.picker}
    >
      <Picker.Item 
        label="🎯 Solo Skill - Technical practice, measurable progress" 
        value="solo_skill" 
      />
      <Picker.Item 
        label="🎭 Performance - Execution under pressure, audience awareness" 
        value="performance" 
      />
      <Picker.Item 
        label="🤝 Interpersonal - Communication, emotional dynamics" 
        value="interpersonal" 
      />
      <Picker.Item 
        label="🎨 Creative - Exploration, experimentation, non-linear discovery" 
        value="creative" 
      />
    </Picker>
    
    <Text style={styles.helpText}>
      This helps the AI coach ask more relevant follow-up questions.
    </Text>
    
    <View style={styles.buttons}>
      <Button title="Cancel" onPress={onClose} />
      <Button 
        title="Create" 
        onPress={handleCreate} 
        disabled={!name.trim()}
      />
    </View>
  </View>
</Modal>
```

**Logic:**

```typescript
const handleCreate = async () => {
  const newPA = {
    id: uuid(),
    name: name.trim(),
    type: type,  // NEW: Include type
    created_at: Date.now(),
    is_deleted: 0,
  };
  
  await db.runAsync(
    'INSERT INTO practice_areas (id, name, type, created_at, is_deleted) VALUES (?, ?, ?, ?, ?)',
    [newPA.id, newPA.name, newPA.type, newPA.created_at, newPA.is_deleted]
  );
  
  onClose();
  loadPracticeAreas();
};
```

### 6.4 SessionSetupScreen – Intent Setup + Target Duration

**Purpose:** Display previous intent, capture new session intent, optionally set target duration

(Unchanged from v1 - no AI features in session setup)

### 6.5 SessionActiveScreen – Timer with Target Progress

**Purpose:** Display timer, current intent, and optional progress toward target during active practice

(Unchanged from v1 - no AI features during active session)

### 6.6 ReflectionToneScreen – Choose Coaching Tone (Renamed)

**Purpose:** Select coaching tone and enable/disable AI before answering prompts

**UI Components:**

```tsx
<View style={styles.container}>
  <Text style={styles.header}>How would you like to reflect?</Text>
  
  {/* 3 Coaching Tone Cards */}
  <TouchableOpacity 
    style={[styles.card, selectedTone === 1 && styles.selectedCard]}
    onPress={() => setSelectedTone(1)}
  >
    <Text style={styles.icon}>🧭</Text>
    <Text style={styles.title}>Facilitative – Guided Discovery</Text>
    <Text style={styles.description}>
      Explore your own insights through open questions
    </Text>
    <Text style={styles.bestFor}>Best for: Self-directed reflection</Text>
  </TouchableOpacity>
  
  <TouchableOpacity 
    style={[styles.card, selectedTone === 2 && styles.selectedCard]}
    onPress={() => setSelectedTone(2)}
  >
    <Text style={styles.icon}>🔍</Text>
    <Text style={styles.title}>Socratic – Structured Inquiry</Text>
    <Text style={styles.description}>
      Challenge assumptions with purposeful questioning
    </Text>
    <Text style={styles.bestFor}>Best for: Deep analysis and pattern-spotting</Text>
  </TouchableOpacity>
  
  <TouchableOpacity 
    style={[styles.card, selectedTone === 3 && styles.selectedCard]}
    onPress={() => setSelectedTone(3)}
  >
    <Text style={styles.icon}>💪</Text>
    <Text style={styles.title}>Supportive – Encouraging</Text>
    <Text style={styles.description}>
      Build confidence with empathy and encouragement
    </Text>
    <Text style={styles.bestFor}>Best for: Tough sessions or low energy</Text>
  </TouchableOpacity>
  
  {/* AI Toggle (only shown if AI available) */}
  {aiAvailable && (
    <View style={styles.aiToggleContainer}>
      <Text style={styles.aiToggleLabel}>Enable AI coaching for this reflection</Text>
      <Switch
        value={aiEnabled}
        onValueChange={setAiEnabled}
        trackColor={{ true: '#4CAF50' }}
      />
      <Text style={styles.aiToggleHelp}>
        {aiEnabled 
          ? 'AI will suggest starter phrases and follow-up questions'
          : 'You\'ll see standard prompts without AI suggestions'
        }
      </Text>
    </View>
  )}
  
  <Button
    title="Continue"
    onPress={handleContinue}
    disabled={!selectedTone}
  />
</View>
```

**Logic:**

```typescript
const handleContinue = () => {
  setCoachingTone(selectedTone);
  // aiAssisted is automatically set based on aiEnabled && aiAvailable
  navigation.navigate('ReflectionPrompts', { sessionId });
};
```

### 6.7 ReflectionPromptsScreen – Kolb Steps 2-4 with AI (Updated)

**Purpose:** Step-by-step prompts with tone-adapted wording, AI placeholders, and follow-ups

**Modes:**
- **New Reflection:** Empty fields, AI placeholders shown
- **Edit Reflection:** Pre-filled fields, no AI (editing existing content)

**UI Components:**

```tsx
const { 
  placeholder, 
  followup, 
  isLoading, 
  checkForFollowup,
  markFollowupAnswered,
  aiActive,
} = useAICoaching(currentStep);

return (
  <View style={styles.container}>
    {/* Progress indicator */}
    <Text style={styles.progress}>Step {currentStep - 1} of 3</Text>
    
    {/* Prompt text (tone-adapted) */}
    <Text style={styles.prompt}>{getPromptForTone(coachingTone, currentStep)}</Text>
    
    {/* AI Placeholder (if available and text is empty) */}
    {aiActive && placeholder && !currentValue && (
      <TouchableOpacity 
        style={styles.placeholderChip}
        onPress={() => setCurrentValue(placeholder)}
      >
        <Text style={styles.placeholderText}>{placeholder}</Text>
        <Text style={styles.tapToUse}>Tap to use</Text>
      </TouchableOpacity>
    )}
    
    {/* Main text input */}
    <TextInput
      style={styles.input}
      value={currentValue}
      onChangeText={handleTextChange}
      onBlur={() => {
        handleBlur();
        checkForFollowup(currentValue);
      }}
      placeholder={aiActive ? '' : getBasePlaceholder(currentStep)}
      multiline
      autoFocus
    />
    
    {/* AI Follow-up question (if answer is brief) */}
    {aiActive && followup && currentValue.length > 0 && currentValue.length < 50 && (
      <View style={styles.followupContainer}>
        <Text style={styles.followupLabel}>To go deeper:</Text>
        <Text style={styles.followupQuestion}>{followup}</Text>
        <TextInput
          style={styles.followupInput}
          placeholder="Add more detail..."
          onChangeText={(text) => {
            if (text.length > 0) {
              markFollowupAnswered();
            }
            // Append to main answer
            setCurrentValue(prev => `${prev} ${text}`);
          }}
        />
      </View>
    )}
    
    {/* Character counter */}
    {currentValue.length > 2500 && (
      <Text style={styles.charCount}>
        {currentValue.length} / 3000
      </Text>
    )}
    
    {/* Navigation */}
    <View style={styles.navigation}>
      <Button title="Back" onPress={handleBack} />
      <Button 
        title={currentStep === 4 ? 'Complete' : 'Next'} 
        onPress={handleNext}
        disabled={!currentValue.trim()}
      />
    </View>
  </View>
);
```

**Tone-Adapted Prompts:**

```typescript
const getPromptForTone = (tone: CoachingTone, step: 2 | 3 | 4): string => {
  const prompts: Record<CoachingTone, Record<number, string>> = {
    1: { // Facilitative
      2: "What happened during this practice? Which moments stood out to you most?",
      3: "What are you noticing about yourself or your approach?",
      4: "What do you feel ready to explore or try next time?",
    },
    2: { // Socratic
      2: "What actually happened, step by step? What was different from what you expected?",
      3: "Looking back, what worked and what didn't? What patterns are you seeing?",
      4: "What specific change will you test in your next session?",
    },
    3: { // Supportive
      2: "What happened in this session? What parts felt most challenging or successful?",
      3: "What's the main thing you're taking away from this? What felt like progress?",
      4: "What's one small thing you'll focus on next time?",
    },
  };
  
  return prompts[tone][step];
};
```

### 6.8 ReflectionFeedbackScreen – Rate Reflection Task (Updated)

**Purpose:** Capture quick feedback on reflection experience with AI-aware question

**UI Components:**

```tsx
<View style={styles.container}>
  {/* AI-aware question */}
  <Text style={styles.question}>
    {reflectionDraft.aiAssisted 
      ? "How did the reflection coaching feel?"
      : "How did this reflection feel?"
    }
  </Text>
  
  {/* 5 emoji buttons (unchanged) */}
  <View style={styles.emojiRow}>
    {FEEDBACK_OPTIONS.map((option) => (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.emojiButton,
          selectedRating === option.value && styles.selectedEmoji
        ]}
        onPress={() => setSelectedRating(option.value)}
      >
        <Text style={styles.emoji}>{option.emoji}</Text>
        <Text style={styles.emojiLabel}>{option.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
  
  {/* Optional text note (unchanged) */}
  <TouchableOpacity 
    style={styles.expandButton}
    onPress={() => setShowNote(!showNote)}
  >
    <Text>What made this reflection feel this way? (optional)</Text>
  </TouchableOpacity>
  
  {showNote && (
    <TextInput
      style={styles.noteInput}
      value={feedbackNote}
      onChangeText={setFeedbackNote}
      placeholder="e.g., AI questions were spot-on, felt rushed, prompts too long..."
      multiline
    />
  )}
  
  <Button title="Finish" onPress={handleFinish} />
</View>
```

**Updated Feedback Options:**

```typescript
const FEEDBACK_OPTIONS = [
  { value: 0, emoji: '😖', label: 'Confusing / Unclear' },
  { value: 1, emoji: '😤', label: 'Hard / Frustrating' },
  { value: 2, emoji: '😐', label: 'Neutral / Meh' },
  { value: 3, emoji: '🙂', label: 'Good / Helpful' },
  { value: 4, emoji: '🤩', label: 'Great / Energizing' },
];
```

**Save Logic:**

```typescript
const handleFinish = async () => {
  const reflection = {
    id: uuid(),
    session_id: currentSession.id,
    coaching_tone: reflectionDraft.coachingTone,  // UPDATED field name
    ai_assisted: reflectionDraft.aiAssisted ? 1 : 0,  // NEW
    step2_answer: reflectionDraft.step2,
    step3_answer: reflectionDraft.step3,
    step4_answer: reflectionDraft.step4,
    ai_placeholders_shown: reflectionDraft.aiPlaceholdersShown,  // NEW
    ai_followups_shown: reflectionDraft.aiFollowupsShown,  // NEW
    ai_followups_answered: reflectionDraft.aiFollowupsAnswered,  // NEW
    feedback_rating: selectedRating,
    feedback_note: feedbackNote || null,
    completed_at: Date.now(),
    updated_at: null,
  };
  
  await db.runAsync(`
    INSERT INTO reflections (
      id, session_id, coaching_tone, ai_assisted,
      step2_answer, step3_answer, step4_answer,
      ai_placeholders_shown, ai_followups_shown, ai_followups_answered,
      feedback_rating, feedback_note, completed_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [/* values */]);
  
  clearReflectionDraft();
  navigation.navigate('SeriesTimeline', { practiceAreaId: currentPracticeArea.id });
};
```

### 6.9 SeriesTimelineScreen – Session History (Updated)

**Purpose:** Display chronological Series with coaching tone and AI indicators

**Updated UI Components:**

**Each session row shows:**
- Date/time
- Intent (truncated to 2 lines)
- Duration badge (if session ended)
- **Coaching Tone badge:** **F** / **S** / **Sup** (Facilitative/Socratic/Supportive) - UPDATED
- **AI indicator:** 🤖 icon if `ai_assisted = 1` - NEW
- Reflection state badge (✅/🟡/🟠/🔴)
- Feedback emoji (if rated)
- "Edited" badge (if `updated_at` exists)

**Badge Rendering:**

```tsx
// Tone badge
const getToneBadge = (tone: CoachingTone): { abbrev: string; color: string } => {
  switch (tone) {
    case 1: return { abbrev: 'F', color: '#4CAF50' };    // Facilitative - green
    case 2: return { abbrev: 'S', color: '#2196F3' };    // Socratic - blue
    case 3: return { abbrev: 'Sup', color: '#FF9800' };  // Supportive - orange
  }
};

// In session row
<View style={styles.badges}>
  {reflection && (
    <>
      <View style={[styles.toneBadge, { backgroundColor: getToneBadge(reflection.coaching_tone).color }]}>
        <Text style={styles.toneBadgeText}>
          {getToneBadge(reflection.coaching_tone).abbrev}
        </Text>
      </View>
      
      {reflection.ai_assisted === 1 && (
        <Text style={styles.aiIcon}>🤖</Text>
      )}
    </>
  )}
</View>
```

**Session Detail Modal Updates:**

```
[Session Details Modal]

Intent: "Practice left-hand accents"
Started: Dec 16, 10:30 AM
Ended: Dec 16, 11:00 AM (30 minutes)
Target: 30 min ✓

Reflection:
  Coaching Tone: Socratic – Structured Inquiry 🔍    ← UPDATED
  AI Assisted: Yes 🤖                                 ← NEW
  Completed: Dec 16, 11:15 AM

--- Reflection ---
What happened: "Struggled with F# major transitions..."
Lesson: "Need to practice finger independence..."
Next action: "Focus on slow, deliberate movements..."

Feedback: 🤩 Great / Energizing (4)
Note: "AI questions were spot-on"

[Edit Reflection] [Move to Different PA] [Close]
```

### 6.10 SettingsScreen – Export & Privacy (Updated)

**Purpose:** Export data (with AI metadata), show privacy status

**UI Components:** (same structure, updated export)

**Section 1: Export Data**
- "Export All Data (JSON)" button
- Description: _"Export all Practice Areas, Sessions, and Reflections as JSON. Includes coaching tone and AI usage data."_

**Section 5: AI Status** (NEW)
- AI availability status:
    - ✅ _"AI coaching available (Apple Intelligence)"_ (if supported)
    - ℹ️ _"AI coaching unavailable on this device. Coaching tones still work without AI."_ (if not supported)

***

## 7. Export Schema (Updated)

### 7.1 JSON Structure

```typescript
interface ExportData {
  export_date: string;  // ISO timestamp
  app_version: '2.0';
  practice_areas: PracticeAreaExport[];
}

interface PracticeAreaExport {
  id: string;
  name: string;
  type: PracticeAreaType;  // NEW in v2
  created_at: number;
  sessions: SessionExport[];
}

interface SessionExport {
  id: string;
  previous_session_id: string | null;
  intent: string;
  started_at: number;
  ended_at: number | null;
  target_duration_seconds: number | null;
  actual_duration_seconds: number | null;
  met_target: boolean | null;
  reflection: ReflectionExport | null;
}

interface ReflectionExport {
  coaching_tone: CoachingTone;      // RENAMED from format
  coaching_tone_name: string;       // NEW: Human-readable name
  ai_assisted: boolean;             // NEW
  ai_metrics: {                     // NEW
    placeholders_shown: number;
    followups_shown: number;
    followups_answered: number;
  };
  step2_answer: string;
  step3_answer: string;
  step4_answer: string;
  feedback_rating: number | null;
  feedback_rating_label: string | null;  // Human-readable
  feedback_note: string | null;
  completed_at: number;
  updated_at: number | null;
  is_edited: boolean;
}
```

### 7.2 Export Logic

```typescript
const exportData = async () => {
  const practiceAreas = await db.getAllAsync(
    'SELECT * FROM practice_areas WHERE is_deleted = 0'
  );
  
  const exportData: ExportData = {
    export_date: new Date().toISOString(),
    app_version: '2.0',
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
      type: pa.type,  // NEW
      created_at: pa.created_at,
      sessions: sessions.map(s => {
        const actualDuration = s.ended_at ? (s.ended_at - s.started_at) / 1000 : null;
        
        return {
          id: s.id,
          previous_session_id: s.previous_session_id,
          intent: s.intent,
          started_at: s.started_at,
          ended_at: s.ended_at,
          target_duration_seconds: s.target_duration_seconds,
          actual_duration_seconds: actualDuration,
          met_target: s.target_duration_seconds && actualDuration 
            ? actualDuration >= s.target_duration_seconds 
            : null,
          reflection: s.session_id ? {
            coaching_tone: s.coaching_tone,
            coaching_tone_name: getCoachingToneName(s.coaching_tone),
            ai_assisted: s.ai_assisted === 1,
            ai_metrics: {
              placeholders_shown: s.ai_placeholders_shown || 0,
              followups_shown: s.ai_followups_shown || 0,
              followups_answered: s.ai_followups_answered || 0,
            },
            step2_answer: s.step2_answer,
            step3_answer: s.step3_answer,
            step4_answer: s.step4_answer,
            feedback_rating: s.feedback_rating,
            feedback_rating_label: getFeedbackLabel(s.feedback_rating),
            feedback_note: s.feedback_note,
            completed_at: s.completed_at,
            updated_at: s.updated_at,
            is_edited: s.updated_at && s.updated_at > s.completed_at,
          } : null
        };
      })
    });
  }
  
  // Write and share (unchanged)
  const fileUri = FileSystem.documentDirectory + `kolbs-export-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));
  await Sharing.shareAsync(fileUri, { mimeType: 'application/json' });
};

const getCoachingToneName = (tone: CoachingTone): string => {
  switch (tone) {
    case 1: return 'Facilitative';
    case 2: return 'Socratic';
    case 3: return 'Supportive';
  }
};
```

***

## 8. Device Compatibility

### 8.1 Minimum Requirements

| Feature | Minimum iOS | Device Requirements |
|---------|-------------|---------------------|
| Core App | iOS 15+ | Any iPhone |
| AI Coaching | iOS 26+ | Apple Intelligence-enabled device |

### 8.2 Apple Intelligence-Enabled Devices

As of iOS 26:
- iPhone 15 Pro, iPhone 15 Pro Max
- iPhone 16 series (all models)
- iPad with M1 chip or later
- Mac with M1 chip or later

### 8.3 Capability Detection Flow

```typescript
// App.tsx
useEffect(() => {
  const initApp = async () => {
    // 1. Check iOS version
    const iosVersion = parseInt(Platform.Version as string, 10);
    
    // 2. Check Apple Intelligence availability
    let aiAvailable = false;
    if (iosVersion >= 26) {
      try {
        const apple = createApple();
        aiAvailable = await apple.isAvailable();
      } catch (error) {
        console.warn('AI check failed:', error);
      }
    }
    
    // 3. Update global state
    setAiAvailable(aiAvailable);
    
    // 4. Set default AI preference
    if (aiAvailable) {
      setAiEnabled(true);  // Default ON for supported devices
    }
    
    // 5. Log capability for debugging
    console.log(`Device capability: iOS ${iosVersion}, AI: ${aiAvailable ? 'available' : 'unavailable'}`);
  };
  
  initApp();
}, []);
```

### 8.4 Graceful Degradation Behavior

| Scenario | Coaching Tone Selection | Prompts | Placeholders | Follow-ups |
|----------|------------------------|---------|--------------|------------|
| AI Available + Enabled | ✅ All 3 tones | Tone-adapted | ✅ AI-generated | ✅ AI-generated |
| AI Available + Disabled | ✅ All 3 tones | Tone-adapted | ❌ None | ❌ None |
| AI Unavailable | ✅ All 3 tones | Tone-adapted | ❌ None | ❌ None |

**Key principle:** Coaching tones ALWAYS work. AI features are additive enhancements.

***

## 9. Security & Privacy

### 9.1 Local Encryption (unchanged)

```typescript
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('kolbs_app.db', {
  enableCRSQLite: true,
});
```

### 9.2 AI Privacy

**Critical:** All AI processing happens 100% on-device via Apple Foundation Models.

- ❌ No text sent to external servers
- ❌ No cloud LLM APIs called
- ❌ No network requests for AI features
- ✅ All inference runs locally on device
- ✅ Context never leaves the device

**User Communication:**
- Settings screen shows: _"AI coaching runs entirely on your device. Your reflections are never sent to any server."_

***

## 10. Notification Service

(Unchanged from v1)

***

## 11. Reflection State Management

(Unchanged from v1)

***

## 12. Testing Strategy

### 12.1 Manual Testing Focus

**AI-Specific Test Cases:** (NEW)

**AI Availability:**
- ✅ On iOS 26+ with Apple Intelligence: AI toggle visible, default ON
- ✅ On iOS 26+ without Apple Intelligence: AI toggle hidden, `ai_assisted = 0`
- ✅ On iOS <26: AI toggle hidden, `ai_assisted = 0`

**AI Placeholders:**
- ✅ Placeholder appears when input is empty and AI is enabled
- ✅ Placeholder disappears after user starts typing
- ✅ Tapping placeholder inserts text into input
- ✅ Placeholder generation completes in <2 seconds
- ✅ Failed placeholder generation doesn't break flow (graceful fallback)

**AI Follow-ups:**
- ✅ Follow-up question appears when answer is <50 characters
- ✅ Follow-up disappears when answer exceeds 50 characters
- ✅ Answering follow-up appends to main answer
- ✅ `ai_followups_answered` increments correctly

**Coaching Tones:**
- ✅ Facilitative prompts use guided discovery language
- ✅ Socratic prompts use structured inquiry language
- ✅ Supportive prompts use encouraging language
- ✅ Tone selection persists through reflection flow

**Practice Area Types:**
- ✅ Can create PA with each type (solo_skill, performance, interpersonal, creative)
- ✅ Type displays correctly in PA list
- ✅ Type is included in export JSON
- ✅ AI adapts follow-ups based on type (manual verification)

**AI Metrics:**
- ✅ `ai_placeholders_shown` counts correctly
- ✅ `ai_followups_shown` counts correctly
- ✅ `ai_followups_answered` counts correctly
- ✅ Metrics appear in export JSON

**Graceful Degradation:**
- ✅ App works fully without AI (tone selection, prompts, completion)
- ✅ No errors on unsupported devices
- ✅ AI toggle hidden when unavailable

### 12.2 All Other Tests (unchanged from v1)

- Session linking tests
- Target duration tests
- Reflection deadline tests
- Edit reflection tests
- Move/delete session tests
- Autosave tests
- Export tests

***

## 13. Risk Mitigation

### 13.1 AI Latency Exceeds Target

**Risk:** AI responses take >2 seconds, creating poor UX

**Mitigation:**
- Monitor latency in development and log warnings
- If consistently slow: reduce max tokens, simplify prompts
- Always show loading indicator during AI calls
- User can proceed without waiting (AI is enhancement, not blocker)

**Likelihood:** Medium (depends on device performance)

### 13.2 AI Quality Issues

**Risk:** AI generates irrelevant or unhelpful placeholders/follow-ups

**Mitigation:**
- Extensive prompt engineering (separate document)
- Include Practice Area name and type in all prompts for context
- Users can ignore AI suggestions - they're never auto-saved
- Feedback collection helps identify patterns
- Post-MVP: Tune prompts based on feedback

**Likelihood:** Medium (LLM output quality varies)

### 13.3 Apple Foundation Models API Changes

**Risk:** iOS 26 API changes before release or between versions

**Mitigation:**
- Use `react-native-ai` abstraction layer (insulates from raw API)
- Keep AI features modular (easy to disable/update)
- Monitor Apple developer documentation

**Likelihood:** Low (Apple APIs are generally stable)

### 13.4 Device Compatibility Confusion

**Risk:** Users on unsupported devices confused about missing AI features

**Mitigation:**
- Clear messaging in Settings: _"AI coaching unavailable on this device"_
- Don't mention AI features if unavailable (hide, don't disable)
- Coaching tones work identically with/without AI

**Likelihood:** Low (clean fallback behavior)

### 13.5 Other Risks (unchanged from v1)

- Wispr Flow integration
- Notification permissions
- Sequential linking complexity
- Autosave race conditions

***

## 14. Platform Configuration

### 14.1 app.json (Updated)

```json
{
  "expo": {
    "name": "Kolbs Reflection",
    "slug": "kolbs-reflection",
    "version": "2.0.0",
    "platforms": ["ios"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.kolbsreflection",
      "buildNumber": "1",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "This app uses your microphone for voice input via voice-enabled keyboards like Wispr Flow.",
        "NSFaceIDUsageDescription": "Enable Face ID to help protect access to your private reflections.",
        "NSUserNotificationsUsageDescription": "Receive notifications when you reach your practice target duration."
      }
    },
    "plugins": [
      "expo-sqlite",
      "expo-file-system",
      "expo-sharing",
      "expo-secure-store",
      "expo-local-authentication",
      [
        "expo-notifications",
        {
          "sounds": ["notification.wav"]
        }
      ],
      "expo-dev-client"
    ],
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

### 14.2 Key Dependencies (Updated)

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-sqlite": "^14.0.0",
    "expo-file-system": "^17.0.0",
    "expo-sharing": "^12.0.0",
    "expo-secure-store": "^13.0.0",
    "expo-local-authentication": "^14.0.0",
    "expo-notifications": "^0.28.0",
    "expo-dev-client": "^4.0.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "react-native-uuid": "^2.0.0",
    "zustand": "^4.5.0",
    "react-native-toast-message": "^2.2.0",
    
    "@react-native-ai/apple": "^1.0.0"
  }
}
```

**Note:** `@react-native-ai/apple` requires `expo-dev-client` for native module access.

***

## 15. Post-MVP Roadmap

### 15.1 Implemented Enhancements (Beyond Original v1 Spec)

| Feature | Status | Value |
| :-- | :-- | :-- |
| **Blocking guard for new sessions** | ✅ Implemented | High |
| **Sort toggle (newest/oldest first)** | ✅ Implemented | Medium |
| **Draft cleanup utility** | ✅ Implemented | Medium |
| **JSON Import** | ✅ Implemented | Medium |

### 15.2 New in v2.0

| Feature | Status | Value |
| :-- | :-- | :-- |
| **3 Coaching Tones** | 🔄 In Progress | High |
| **Practice Area Types** | 🔄 In Progress | Medium |
| **AI Placeholders** | 🔄 In Progress | High |
| **AI Follow-ups** | 🔄 In Progress | High |
| **Per-session AI Toggle** | 🔄 In Progress | Medium |
| **Graceful Degradation** | 🔄 In Progress | High |
| **AI Metrics Tracking** | 🔄 In Progress | Medium |

### 15.3 Deferred Features

| Feature | Effort | Value |
| :-- | :-- | :-- |
| **Filters on timeline** (by tone, by AI usage, by feedback) | +1 day | Medium |
| **Synthesis view** (AI adoption charts, tone distribution, feedback trends) | +2-3 days | High |
| **MLC-LLM fallback** (for non-Apple devices) | +3-4 days | Medium |
| **Prompt tuning UI** (adjust AI behavior in Settings) | +1 day | Low |
| **Configurable deadlines** | +0.5 days | Medium |
| **Android support** | +2-3 days | High |

***

## 16. Success Metrics (Post-Launch)

**Tracked via export data analysis (manual):**

**Engagement:** (unchanged)
- Average sessions per week (target: 3+)
- Series continuity (average chain length)

**AI Adoption:** (NEW)
- % of reflections with `ai_assisted = true` (target: >60% on supported devices)
- Average AI follow-ups answered per reflection
- AI placeholder usage rate

**Coaching Tone Usage:** (NEW)
- Distribution of Facilitative / Socratic / Supportive
- Correlation between tone and feedback rating
- Tone preference by Practice Area type

**Reflection Quality:** (updated)
- Reflection completion rate (target: >70%)
- % of "Good/Helpful" or "Great/Energizing" ratings
- AI-assisted vs. non-assisted feedback comparison

**AI Performance:**
- Latency (% of responses <2 seconds)
- Error rate (failed AI calls)

***

## 17. Related Documentation

- **PRD v2:** Kolbs-Cycle-App-PRD-v2.md
- **Prompt Engineering:** (Separate document - TBD)
- **Implementation Notes:** Implementation-Notes.md
- **Developer Profile:** Main-developer-profile.md

***

## 18. Final Decisions Log

**v2.0 Decisions:**

1. **On-device LLM:** `react-native-ai` (@react-native-ai/apple) using Apple Foundation Models ✅
2. **Minimum iOS for AI:** iOS 26+ ✅
3. **Fallback for unsupported devices:** Graceful degradation (tones work, AI hidden) ✅
4. **Practice Area types:** User-selected dropdown (solo_skill, performance, interpersonal, creative) ✅
5. **AI toggle default:** ON for supported devices ✅
6. **Prompt engineering:** Separate document, referenced from tech spec ✅
7. **v1 format migration:** Map to coaching tones, mark as `ai_assisted = 0` ✅

**v1.0 Decisions:** (preserved)

8. Voice input: System keyboard (Wispr Flow) ✅
9. State management: Zustand ✅
10. Reflection deadlines: 24h soft → 48h hard ✅
11. Edit reflections: Within 48h only ✅
12. Export: Manual JSON only ✅

***

<div align="center">⁂</div>

[^1]: Main-developer-profile.md

[^2]: Kolbs-Cycle-App-PRD-v2.md

