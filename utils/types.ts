/**
 * TypeScript type definitions for Kolb's Reflection Cycle App
 * 
 * These types match the database schema defined in db/schema.ts
 * and describe the current JSON export/import schema.
 */

// ============================================================================
// Core Entity Types (matching database tables)
// ============================================================================

/** Practice Area Type - Classification for AI adaptation */
export type PracticeAreaType = 'solo_skill' | 'performance' | 'interpersonal' | 'creative';

/** Practice Area Type definitions with labels and descriptions */
export const PRACTICE_AREA_TYPES = [
  { value: 'solo_skill' as const, label: 'Solo Skill', description: 'Technical practice, measurable progress' },
  { value: 'performance' as const, label: 'Performance', description: 'Execution under pressure, audience awareness' },
  { value: 'interpersonal' as const, label: 'Interpersonal', description: 'Communication, emotional dynamics' },
  { value: 'creative' as const, label: 'Creative', description: 'Exploration, experimentation, non-linear discovery' },
];

/**
 * Practice Area - A domain of practice (e.g., "Piano", "Public Speaking")
 */
export interface PracticeArea {
  id: string;
  name: string;
  type: PracticeAreaType;  // NEW in v2.0
  created_at: number;  // Unix timestamp in milliseconds
  is_deleted: number;  // 0 = active, 1 = deleted (soft delete)
}

/**
 * Practice Area with session statistics for UI display
 * Extends PracticeArea with aggregated session data
 */
export interface PracticeAreaWithStats extends PracticeArea {
  sessionCount: number;  // Total number of sessions
  lastSessionDate: number | null;  // Timestamp of most recent session (null if none)
  pendingReflectionsCount: number;  // Sessions with no reflection, ended 0-24h ago
  overdueReflectionsCount: number;   // Sessions with no reflection, ended 24-48h ago
  oldestPendingReflectionDate: number | null;  // Timestamp of oldest pending reflection (for sorting)
}

/**
 * Session - A single practice session within a Practice Area
 */
export interface Session {
  id: string;
  practice_area_id: string;
  previous_session_id: string | null;  // NULL for first session in Practice Area
  intent: string;
  intent_refined?: number;  // NEW in v2.2: 0 = not refined, 1 = user accepted AI refinement
  original_intent?: string | null;  // NEW in v2.2: Original intent if refined, null otherwise
  intent_analysis_requested?: number;  // NEW in v2.2: 0 = not requested, 1 = user clicked "Improve Intent"
  target_duration_seconds: number | null;  // NULL = no target, just stopwatch
  started_at: number;  // Unix timestamp in milliseconds
  ended_at: number | null;  // NULL if session still active
  is_deleted: number;  // 0 = active, 1 = deleted (soft delete)
}

/**
 * Pending Reflection - Session awaiting reflection with practice area name
 * Used for displaying pending/overdue reflection banners
 */
export interface PendingReflection extends Session {
  practiceAreaName: string;
}

/**
 * Session with joined reflection data - Used for Series Timeline view
 */
export interface SessionWithReflection extends Session {
  coaching_tone: CoachingTone | null;  // RENAMED from format
  ai_assisted: number | null;  // NEW: 0=off, 1=on
  feedback_rating: FeedbackRating | null;
  reflection_updated_at: number | null;
  reflection_completed_at: number | null;
}

/**
 * Reflection - A completed reflection for a session
 */
export interface Reflection {
  id: string;
  session_id: string;
  coaching_tone: CoachingTone;  // RENAMED from format
  ai_assisted: number;  // NEW: 0=off, 1=on
  step2_answer: string;  // "What happened?"
  step3_answer: string;  // "Lesson/pattern"
  step4_answer: string;  // "Next action"

  // AI interaction metrics (NEW in v2.0)
  ai_questions_shown: number;  // Count of AI-generated questions shown
  ai_followups_shown: number;
  ai_followups_answered: number;

  // AI-generated question text (NEW: tracks actual questions shown)
  step2_question: string | null;  // NULL if static prompt was used
  step3_question: string | null;  // NULL if static prompt was used
  step4_question: string | null;  // NULL if static prompt was used

  // Feedback
  feedback_rating: FeedbackRating;
  feedback_note: string | null;
  completed_at: number;  // Unix timestamp in milliseconds
  updated_at: number | null;  // NULL if never edited
}

// ============================================================================
// Store-specific Types
// ============================================================================

/**
 * Coaching Tone types:
 * 1 = Facilitative (guided discovery)
 * 2 = Socratic (structured inquiry)
 * 3 = Supportive (encouraging)
 */
export type CoachingTone = 1 | 2 | 3;

/**
 * Feedback rating scale:
 * 0 = Confusing/Unclear
 * 1 = Hard/Frustrating
 * 2 = Neutral/Meh
 * 3 = Good/Helpful
 * 4 = Great/Energizing
 * null = skipped
 */
export type FeedbackRating = 0 | 1 | 2 | 3 | 4 | null;

/**
 * Reflection draft state for in-progress reflections
 * Used in Zustand store to track reflection being composed
 */
export interface ReflectionDraft {
  coachingTone: CoachingTone | null;  // RENAMED from format
  aiAssisted: boolean;  // NEW: Was AI enabled for this reflection?
  step2: string;
  step3: string;
  step4: string;

  // AI interaction tracking (NEW in v2.0)
  aiQuestionsShown: number;  // Count of AI-generated questions shown
  aiFollowupsShown: number;
  aiFollowupsAnswered: number;

  // AI-generated question text (NEW: tracks actual questions shown)
  step2Question: string | null;  // NULL if static prompt was used
  step3Question: string | null;  // NULL if static prompt was used
  step4Question: string | null;  // NULL if static prompt was used

  feedbackRating: FeedbackRating;
  feedbackNote: string;
}

// ============================================================================
// Store State & Actions Types
// ============================================================================

/**
 * Complete app state shape for Zustand store
 */
export interface AppState {
  // Practice Area state
  practiceAreas: PracticeArea[];
  currentPracticeArea: PracticeArea | null;

  // Session state
  currentSession: Session | null;
  sessionStartTime: number | null;
  sessionTimer: number;
  targetDuration: number | null;  // Target duration in seconds (null = no target)
  targetReached: boolean;  // Flag when target duration is hit
  lastEndedSessionId: string | null;  // ID of last ended session for reflection flow

  // AI capability state (NEW in v2.0)
  aiAvailable: boolean;  // Is Apple Intelligence available on this device?
  aiEnabled: boolean;  // User's per-session AI toggle (default ON)

  // Reflection draft state
  reflectionDraft: ReflectionDraft;

  // UI state
  showSecurityWarning: boolean;
  pendingReflectionsCount: number;
}

/**
 * App store actions
 */
export interface AppActions {
  // Practice Area actions
  setPracticeAreas: (areas: PracticeAreaWithStats[]) => void;
  setCurrentPracticeArea: (practiceArea: PracticeAreaWithStats | null) => void;

  // Session actions
  startSession: (session: Session, targetDuration?: number | null) => void;
  updateTimer: () => void;
  endSession: () => void;
  setCurrentSession: (session: Session | null) => void;  // NEW: For reflection flow with ended sessions
  setLastEndedSessionId: (sessionId: string | null) => void;
  clearLastEndedSession: () => void;

  // AI actions (NEW in v2.0)
  setAiAvailable: (available: boolean) => void;
  setAiEnabled: (enabled: boolean) => void;

  // Reflection draft actions (UPDATED in v2.0)
  setCoachingTone: (tone: CoachingTone, aiEnabled?: boolean) => void;  // RENAMED from setReflectionFormat
  updateReflectionDraft: <K extends keyof ReflectionDraft>(
    field: K,
    value: ReflectionDraft[K]
  ) => void;
  incrementAiMetric: (metric: 'aiQuestionsShown' | 'aiFollowupsShown' | 'aiFollowupsAnswered') => void;
  clearReflectionDraft: () => void;

  // UI actions
  setShowSecurityWarning: (show: boolean) => void;
  setPendingReflectionsCount: (count: number) => void;
}

/**
 * Combined store type (state + actions)
 */
export type AppStore = AppState & AppActions;

// ============================================================================
// Export Types (for JSON data export)
// ============================================================================

/**
 * Exported reflection data with human-readable labels and descriptive field names.
 * Uses snake_case for consistency with the database schema and better LLM analysis compatibility.
 * Optimized for pattern analysis with AI tools (ChatGPT, Claude, etc.).
 */
export interface ExportReflection {
  coaching_tone: number;  // 1=Facilitative, 2=Socratic, 3=Supportive
  coaching_tone_name: string;  // Human-readable: "Facilitative", "Socratic", "Supportive"
  ai_assisted: boolean;

  // AI interaction metrics
  ai_questions_shown: number;  // Count of AI-generated questions shown
  ai_followups_shown: number;
  ai_followups_answered: number;

  // AI-generated question text (NEW: tracks actual questions shown)
  step2_question: string | null;  // NULL if static prompt was used
  step3_question: string | null;  // NULL if static prompt was used
  step4_question: string | null;  // NULL if static prompt was used

  // Kolb reflection answers (descriptive names for better LLM understanding)
  what_happened: string;      // Step 2: What actually happened during practice?
  lessons_learned: string;    // Step 3: What insight, pattern, or lesson emerged?
  next_actions: string;       // Step 4: What will you try or do differently next time?

  // Feedback on reflection experience
  feedback_rating: number | null;  // 0=Confusing, 1=Hard, 2=Neutral, 3=Good, 4=Great, null=skipped
  feedback_rating_label: string | null;  // Human-readable: "Great/Energizing", etc.
  feedback_note: string | null;

  // Timestamps
  completed_at: number;  // Unix timestamp in milliseconds
  updated_at: number | null;  // null if never edited
  is_edited: boolean;
}

/**
 * Exported session data with computed duration fields
 * Uses snake_case for database alignment and cross-language compatibility
 */
export interface ExportSession {
  id: string;
  previous_session_id: string | null;
  intent: string;
  started_at: number;  // Unix timestamp in milliseconds
  ended_at: number | null;

  // Duration tracking
  target_duration_seconds: number | null;
  actual_duration_seconds: number | null;
  met_target: boolean | null;

  reflection: ExportReflection | null;
}

/**
 * Exported practice area with sessions array and type classification.
 */
export interface ExportPracticeArea {
  id: string;
  name: string;
  type: PracticeAreaType;  // 'solo_skill', 'performance', 'interpersonal', 'creative'
  type_label: string;  // Human-readable: "Solo Skill", "Performance", etc.
  created_at: number;  // Unix timestamp in milliseconds
  sessions: ExportSession[];
}

/**
 * Top-level export payload structure with metadata.
 * Optimized for LLM analysis - includes summary statistics and human-readable labels.
 */
export interface ExportPayload {
  metadata: {
    export_date: string;  // ISO 8601 timestamp
    app_version: string;  // e.g. "1.0"
    total_practice_areas: number;
    total_sessions: number;
    total_reflections: number;
  };
  practice_areas: ExportPracticeArea[];
}
