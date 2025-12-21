/**
 * Zustand store for Kolb's Reflection Cycle App
 * 
 * Central state management following the tech spec (Section 3.1)
 * Manages: Practice Areas, Sessions, Reflection Drafts, UI State
 */

import { create } from 'zustand';
import type {
  AppStore,
  PracticeAreaWithStats,
  Session,
  ReflectionFormat,
  ReflectionDraft,
} from '../utils/types';

/**
 * Initial state for reflection draft
 */
const initialReflectionDraft: ReflectionDraft = {
  format: null,
  step2: '',
  step3: '',
  step4: '',
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
   * Clear the last ended session ID (after reflection is saved)
   */
  clearLastEndedSession: () => set({ lastEndedSessionId: null }),

  // ============================================================================
  // Reflection Draft Actions
  // ============================================================================

  /**
   * Set the reflection format (Direct=1, Reflective=2, Minimalist=3)
   */
  setReflectionFormat: (format: ReflectionFormat) =>
    set((state) => ({
      reflectionDraft: { ...state.reflectionDraft, format },
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

