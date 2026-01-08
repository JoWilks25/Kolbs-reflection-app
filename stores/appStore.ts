/**
 * Zustand store for Kolb's Reflection Cycle App v2.0
 * 
 * Central state management following the tech spec (Section 3.1)
 * Manages: Practice Areas, Sessions, Reflection Drafts, AI State, UI State
 */

import { create } from 'zustand';
import type {
  AppStore,
  PracticeAreaWithStats,
  Session,
  CoachingTone,
  ReflectionDraft,
} from '../utils/types';

/**
 * Initial state for reflection draft
 */
const initialReflectionDraft: ReflectionDraft = {
  coachingTone: null,
  aiAssisted: false,
  step2: '',
  step3: '',
  step4: '',
  aiPlaceholdersShown: 0,  // DEPRECATED: kept for backward compatibility
  aiQuestionsShown: 0,  // NEW: Count of AI-generated questions shown
  aiFollowupsShown: 0,
  aiFollowupsAnswered: 0,
  step2Question: null,  // NEW: Stores actual generated question text
  step3Question: null,  // NEW: Stores actual generated question text
  step4Question: null,  // NEW: Stores actual generated question text
  feedbackRating: null,
  feedbackNote: '',
};

/**
 * Main application store
 * 
 * Usage:
 * ```typescript
 * const { practiceAreas, setPracticeAreas } = useAppStore();
 * // or with selector for performance
 * const practiceAreas = useAppStore((state) => state.practiceAreas);
 * ```
 */
export const useAppStore = create<AppStore>((set, get) => ({
  // ============================================================================
  // Practice Area State
  // ============================================================================
  practiceAreas: [],
  currentPracticeArea: null,

  // ============================================================================
  // Session State
  // ============================================================================
  currentSession: null,
  sessionStartTime: null,
  sessionTimer: 0,
  targetDuration: null,
  targetReached: false,
  lastEndedSessionId: null,

  // ============================================================================
  // Reflection Draft State
  // ============================================================================
  reflectionDraft: { ...initialReflectionDraft },

  // ============================================================================
  // AI State
  // ============================================================================
  aiAvailable: false,
  aiEnabled: true,

  // ============================================================================
  // UI State
  // ============================================================================
  showSecurityWarning: false,
  pendingReflectionsCount: 0,

  // ============================================================================
  // Practice Area Actions
  // ============================================================================

  /**
   * Set the list of practice areas (typically from DB query)
   */
  setPracticeAreas: (areas: PracticeAreaWithStats[]) => set({ practiceAreas: areas }),

  /**
   * Set the currently selected practice area
   */
  setCurrentPracticeArea: (practiceArea: PracticeAreaWithStats | null) =>
    set({ currentPracticeArea: practiceArea }),

  // ============================================================================
  // Session Actions
  // ============================================================================

  /**
   * Start a new session - initializes timer state
   * @param session - The session object to start
   * @param targetDuration - Optional target duration in seconds (null = no target)
   */
  startSession: (session: Session, targetDuration: number | null = null) =>
    set({
      currentSession: session,
      sessionStartTime: Date.now(),
      sessionTimer: 0,
      targetDuration,
      targetReached: false,
    }),

  /**
   * Update the session timer based on elapsed time since start
   * Also checks if target duration was just reached (transition from not reached to reached)
   * Call this every second via setInterval
   */
  updateTimer: () =>
    set((state) => {
      const newTimer = state.sessionStartTime
        ? Math.floor((Date.now() - state.sessionStartTime) / 1000)
        : 0;

      // Check if target was just reached (transition from not reached to reached)
      const targetJustReached =
        state.targetDuration &&
        !state.targetReached &&
        newTimer >= state.targetDuration;

      return {
        sessionTimer: newTimer,
        targetReached: state.targetReached || Boolean(targetJustReached),
      };
    }),

  /**
   * End the current session - clears all session state including target fields
   * Preserves lastEndedSessionId for reflection flow
   */
  endSession: () =>
    set((state) => ({
      lastEndedSessionId: state.currentSession?.id || null,
      currentSession: null,
      sessionStartTime: null,
      sessionTimer: 0,
      targetDuration: null,
      targetReached: false,
    })),

  /**
   * Set the last ended session ID (for reflection flow from timeline)
   */
  setLastEndedSessionId: (sessionId: string | null) => set({ lastEndedSessionId: sessionId }),

  /**
   * Clear the last ended session ID (after reflection is saved)
   */
  clearLastEndedSession: () => set({ lastEndedSessionId: null }),

  /**
   * Set the current session (used for reflection flow with ended sessions)
   * This is separate from startSession which is for active sessions
   */
  setCurrentSession: (session: Session | null) => set({ currentSession: session }),

  // ============================================================================
  // AI Actions
  // ============================================================================

  /**
   * Set whether AI (Apple Intelligence) is available on this device
   */
  setAiAvailable: (available: boolean) => set({ aiAvailable: available }),

  /**
   * Set whether AI is enabled for the current session (user toggle)
   */
  setAiEnabled: (enabled: boolean) => set({ aiEnabled: enabled }),

  // ============================================================================
  // Reflection Draft Actions
  // ============================================================================

  /**
   * Set the coaching tone (Facilitative=1, Socratic=2, Supportive=3)
   * Also sets aiAssisted based on provided aiEnabled flag and device aiAvailable state
   * @param tone - The coaching tone to set
   * @param aiEnabled - Whether AI is enabled for this reflection (default: true)
   */
  setCoachingTone: (tone: CoachingTone, aiEnabled: boolean = true) =>
    set((state) => ({
      reflectionDraft: {
        ...state.reflectionDraft,
        coachingTone: tone,
        aiAssisted: aiEnabled && state.aiAvailable,
      },
    })),

  /**
   * Update a specific field in the reflection draft
   * @param field - The field to update (step2, step3, step4, feedbackRating, feedbackNote)
   * @param value - The new value for the field
   */
  updateReflectionDraft: <K extends keyof ReflectionDraft>(
    field: K,
    value: ReflectionDraft[K]
  ) =>
    set((state) => ({
      reflectionDraft: { ...state.reflectionDraft, [field]: value },
    })),

  /**
   * Increment an AI interaction metric counter
   * @param metric - The metric to increment (aiQuestionsShown, aiFollowupsShown, aiFollowupsAnswered)
   */
  incrementAiMetric: (metric: 'aiQuestionsShown' | 'aiFollowupsShown' | 'aiFollowupsAnswered') =>
    set((state) => ({
      reflectionDraft: {
        ...state.reflectionDraft,
        [metric]: state.reflectionDraft[metric] + 1,
      },
    })),

  /**
   * Clear the reflection draft (after saving or canceling)
   */
  clearReflectionDraft: () =>
    set({
      reflectionDraft: { ...initialReflectionDraft },
    }),

  // ============================================================================
  // UI Actions
  // ============================================================================

  /**
   * Show or hide the security warning banner
   */
  setShowSecurityWarning: (show: boolean) => set({ showSecurityWarning: show }),

  /**
   * Set the count of pending reflections (for badge display)
   */
  setPendingReflectionsCount: (count: number) =>
    set({ pendingReflectionsCount: count }),
}));

