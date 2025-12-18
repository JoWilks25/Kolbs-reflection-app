/**
 * TypeScript type definitions for Kolb's Reflection Cycle App
 * 
 * These types match the database schema defined in db/schema.ts
 */

// ============================================================================
// Core Entity Types (matching database tables)
// ============================================================================

/**
 * Practice Area - A domain of practice (e.g., "Piano", "Public Speaking")
 */
export interface PracticeArea {
  id: string;
  name: string;
  created_at: number;  // Unix timestamp in milliseconds
  is_deleted: number;  // 0 = active, 1 = deleted (soft delete)
}

/**
 * Session - A single practice session within a Practice Area
 */
export interface Session {
  id: string;
  practice_area_id: string;
  previous_session_id: string | null;  // NULL for first session in Practice Area
  intent: string;
  target_duration_seconds: number | null;  // NULL = no target, just stopwatch
  started_at: number;  // Unix timestamp in milliseconds
  ended_at: number | null;  // NULL if session still active
  is_deleted: number;  // 0 = active, 1 = deleted (soft delete)
}

/**
 * Reflection - A completed reflection for a session
 */
export interface Reflection {
  id: string;
  session_id: string;
  format: ReflectionFormat;
  step2_answer: string;  // "What happened?"
  step3_answer: string;  // "Lesson/pattern"
  step4_answer: string;  // "Next action"
  feedback_rating: FeedbackRating;
  feedback_note: string | null;
  completed_at: number;  // Unix timestamp in milliseconds
  updated_at: number | null;  // NULL if never edited
}

// ============================================================================
// Store-specific Types
// ============================================================================

/**
 * Reflection format types:
 * 1 = Direct & Action-Oriented
 * 2 = Reflective & Exploratory
 * 3 = Minimalist / Rapid
 */
export type ReflectionFormat = 1 | 2 | 3;

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
  format: ReflectionFormat | null;
  step2: string;
  step3: string;
  step4: string;
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
  setPracticeAreas: (areas: PracticeArea[]) => void;
  setCurrentPracticeArea: (practiceArea: PracticeArea | null) => void;

  // Session actions
  startSession: (session: Session, targetDuration?: number | null) => void;
  updateTimer: () => void;
  endSession: () => void;

  // Reflection draft actions
  setReflectionFormat: (format: ReflectionFormat) => void;
  updateReflectionDraft: <K extends keyof ReflectionDraft>(
    field: K,
    value: ReflectionDraft[K]
  ) => void;
  clearReflectionDraft: () => void;

  // UI actions
  setShowSecurityWarning: (show: boolean) => void;
  setPendingReflectionsCount: (count: number) => void;
}

/**
 * Combined store type (state + actions)
 */
export type AppStore = AppState & AppActions;

