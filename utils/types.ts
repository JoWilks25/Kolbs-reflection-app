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
 * Extends Session with reflection fields from LEFT JOIN
 */
export interface SessionWithReflection extends Session {
  format: ReflectionFormat | null;
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
  lastEndedSessionId: string | null;  // ID of last ended session for reflection flow

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
  setLastEndedSessionId: (sessionId: string | null) => void;
  clearLastEndedSession: () => void;

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

// ============================================================================
// Export Types (for JSON data export)
// ============================================================================

/**
 * Exported reflection data with computed isedited flag
 * Field names use lowercase without underscores per export spec
 */
export interface ExportReflection {
  format: number;
  step2answer: string;
  step3answer: string;
  step4answer: string;
  feedbackrating: number | null;
  feedbacknote: string | null;
  completedat: number;
  updatedat: number | null;
  isedited: boolean;
}

/**
 * Exported session data with computed duration fields
 * Field names use lowercase without underscores per export spec
 */
export interface ExportSession {
  id: string;
  previoussessionid: string | null;
  intent: string;
  startedat: number;
  endedat: number | null;
  targetdurationseconds: number | null;
  actualdurationseconds: number | null;
  mettarget: boolean | null;
  reflection: ExportReflection | null;
}

/**
 * Exported practice area with sessions array
 * Field names use lowercase without underscores per export spec
 */
export interface ExportPracticeArea {
  id: string;
  name: string;
  createdat: number;
  sessions: ExportSession[];
}

/**
 * Top-level export payload structure
 * Field names use lowercase without underscores per export spec
 */
export interface ExportPayload {
  exportdate: string;
  practiceareas: ExportPracticeArea[];
}

