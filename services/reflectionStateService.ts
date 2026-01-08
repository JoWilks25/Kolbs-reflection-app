/**
 * Reflection State Service
 * 
 * Calculates reflection state based on session timing and reflection existence.
 * Used to display badges and indicators throughout the app.
 */

import { Session, Reflection } from '../utils/types';

/**
 * Reflection state with status-specific metadata
 */
export type ReflectionState =
  | { status: 'completed'; canEdit: boolean; isEdited: boolean }
  | { status: 'pending'; hoursRemaining: number }
  | { status: 'overdue'; hoursUntilExpiry: number }
  | { status: 'expired'; canStillReflect: true };

/**
 * Badge visual properties for UI rendering
 */
export interface ReflectionBadge {
  emoji: string;
  label: string;
  color: string;
}

/**
 * Calculate reflection state based on session end time and reflection existence
 * 
 * @param session - The session to evaluate
 * @param reflection - The reflection for this session (if exists)
 * @returns ReflectionState with status-specific metadata
 */
export const getReflectionState = (
  session: Session,
  reflection?: Reflection | null
): ReflectionState => {
  // If reflection exists, it's completed
  if (reflection) {
    const hoursSinceEnd = (Date.now() - (session.ended_at || 0)) / (1000 * 60 * 60);
    const canEdit = hoursSinceEnd <= 48;
    const isEdited = Boolean(reflection.updated_at && reflection.updated_at > reflection.completed_at);

    return { status: 'completed', canEdit, isEdited };
  }

  // No reflection - calculate deadline state
  if (!session.ended_at) {
    // Session hasn't ended yet - no reflection state
    return { status: 'pending', hoursRemaining: 0 };
  }

  const hoursSinceEnd = (Date.now() - session.ended_at) / (1000 * 60 * 60);

  if (hoursSinceEnd <= 24) {
    return { status: 'pending', hoursRemaining: Math.ceil(24 - hoursSinceEnd) };
  }

  if (hoursSinceEnd <= 48) {
    return { status: 'overdue', hoursUntilExpiry: Math.ceil(48 - hoursSinceEnd) };
  }

  return { status: 'expired', canStillReflect: true };
};

/**
 * Get badge visual properties for a given reflection state
 * 
 * @param state - The reflection state to map to badge
 * @returns Badge visual properties (emoji, label, color)
 */
export const getReflectionBadge = (state: ReflectionState): ReflectionBadge => {
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

