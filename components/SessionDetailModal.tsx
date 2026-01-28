import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import Toast from "react-native-toast-message";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";
import { SessionWithReflection, CoachingTone, FeedbackRating } from "../utils/types";
import { getSessionWithFullReflection, SessionWithFullReflection } from "../db/queries";
import { getReflectionState, getReflectionBadge, ReflectionState } from "../services/reflectionStateService";
import { formatDateTime } from "../utils/timeFormatting";
import PracticeAreaPicker from "./PracticeAreaPicker";

export interface SessionDetailModalProps {
  visible: boolean;
  session: SessionWithReflection | null;
  onClose: () => void;
  onEditReflection: (sessionId: string) => void;
  onCompleteReflection: (sessionId: string) => void;
  onMoveSession: (sessionId: string, newPracticeAreaId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

// Coaching tone labels
const getToneLabel = (tone: CoachingTone | null): string | null => {
  if (tone === null) return null;
  switch (tone) {
    case 1:
      return "Facilitative – Guided Discovery";
    case 2:
      return "Socratic – Structured Inquiry";
    case 3:
      return "Supportive – Encouraging";
    default:
      return null;
  }
};

// Get feedback emoji and label
const getFeedbackDisplay = (rating: FeedbackRating): { emoji: string; label: string } | null => {
  if (rating === null) return null;

  const displays = {
    0: { emoji: "😕", label: "Confusing" },
    1: { emoji: "😞", label: "Hard" },
    2: { emoji: "😐", label: "Neutral" },
    3: { emoji: "🙂", label: "Good" },
    4: { emoji: "🚀", label: "Great" },
  };

  return displays[rating] || null;
};

// Get status message for pending/overdue/expired states
const getStatusMessage = (state: ReflectionState): string => {
  switch (state.status) {
    case 'pending':
      return `Pending – due in ${state.hoursRemaining}h`;
    case 'overdue':
      return `Overdue – expires in ${state.hoursUntilExpiry}h`;
    case 'expired':
      return 'Expired – reflection window has closed';
    default:
      return '';
  }
};

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  visible,
  session,
  onClose,
  onEditReflection,
  onCompleteReflection,
  onMoveSession,
  onDeleteSession,
}) => {
  const [fullSession, setFullSession] = useState<SessionWithFullReflection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  // Load full session data when modal opens
  useEffect(() => {
    if (visible && session) {
      loadFullSession(session.id);
    } else if (!visible) {
      setFullSession(null);
    }
  }, [visible, session?.id]);

  const loadFullSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const data = await getSessionWithFullReflection(sessionId);
      setFullSession(data);
    } catch (error) {
      console.error("Error loading session details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) return null;

  // Calculate duration if session ended
  const durationMinutes = session.ended_at
    ? Math.round((session.ended_at - session.started_at) / 60000)
    : null;

  // Target comparison
  const hasTarget = session.target_duration_seconds !== null;
  const targetMinutes = hasTarget ? Math.round(session.target_duration_seconds! / 60) : null;
  const targetMet = hasTarget && durationMinutes !== null && durationMinutes >= targetMinutes!;

  // Reflection state
  const reflectionState = getReflectionState(session, session.reflection_completed_at ? {
    id: '',
    session_id: session.id,
    coaching_tone: session.coaching_tone!,
    ai_assisted: session.ai_assisted || 0,
    step2_answer: '',
    step3_answer: '',
    step4_answer: '',
    ai_questions_shown: 0,
    ai_followups_shown: 0,
    ai_followups_answered: 0,
    step2_question: null,
    step3_question: null,
    step4_question: null,
    feedback_rating: session.feedback_rating,
    feedback_note: null,
    completed_at: session.reflection_completed_at!,
    updated_at: session.reflection_updated_at,
  } : null);
  const reflectionBadge = getReflectionBadge(reflectionState);

  // Determine UI variant
  const hasReflection = session.reflection_completed_at !== null;
  const canEdit = reflectionState.status === 'completed' && reflectionState.canEdit;
  const isEdited = reflectionState.status === 'completed' && reflectionState.isEdited;

  // Coaching tone label
  const toneLabel = getToneLabel(session.coaching_tone);

  // Feedback display
  const feedbackDisplay = getFeedbackDisplay(session.feedback_rating);

  // Handle delete with confirmation
  const handleDelete = () => {
    Alert.alert(
      "Delete Session",
      "Delete Session? This will remove the session from your Series. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDeleteSession(session.id);
          }
        },
      ]
    );
  };

  // Handle move session - show picker
  const handleMove = () => {
    setIsPickerVisible(true);
  };

  // Handle practice area selection
  const handlePracticeAreaSelect = (practiceAreaId: string) => {
    if (session) {
      onMoveSession(session.id, practiceAreaId);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.dateTime}>{formatDateTime(session.started_at)}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: reflectionBadge.color }]}>
              <Text style={styles.statusBadgeText}>
                {reflectionBadge.emoji} {reflectionBadge.label}
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Session Info Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Session</Text>

              <Text style={styles.label}>Intent</Text>
              <Text style={styles.intentText}>{session.intent}</Text>

              <View style={styles.metaRow}>
                {/* Start/End Time */}
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Started</Text>
                  <Text style={styles.metaValue}>{formatDateTime(session.started_at)}</Text>
                </View>
                {session.ended_at && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Ended</Text>
                    <Text style={styles.metaValue}>{formatDateTime(session.ended_at)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.metaRow}>
                {/* Duration */}
                {durationMinutes !== null && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Duration</Text>
                    <Text style={styles.metaValue}>{durationMinutes} min</Text>
                  </View>
                )}

                {/* Target */}
                {hasTarget && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Target</Text>
                    <Text style={[
                      styles.metaValue,
                      targetMet ? styles.targetMet : styles.targetMissed
                    ]}>
                      {targetMet ? "✓" : "✗"} {targetMinutes} min
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Reflection Content Section (if exists) */}
            {hasReflection && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reflection</Text>

                {/* Coaching Tone and AI Status */}
                {toneLabel && (
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Coaching Tone</Text>
                      <Text style={styles.metaValue}>{toneLabel}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>AI Assisted</Text>
                      <Text style={styles.metaValue}>
                        {session.ai_assisted === 1 ? 'Yes' : 'No'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Format and timestamps */}
                <View style={styles.reflectionMeta}>
                  {isEdited && (
                    <View style={styles.editedBadge}>
                      <Text style={styles.editedBadgeText}>Edited</Text>
                    </View>
                  )}
                </View>

                {isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
                ) : fullSession ? (
                  <>
                    {/* Step 2 - What happened */}
                    {fullSession.step2_answer && (
                      <View style={styles.answerBlock}>
                        <Text style={styles.answerLabel}>What happened?</Text>
                        <Text style={styles.answerText}>{fullSession.step2_answer}</Text>
                      </View>
                    )}

                    {/* Step 3 - Lesson/pattern */}
                    {fullSession.step3_answer && (
                      <View style={styles.answerBlock}>
                        <Text style={styles.answerLabel}>Lesson or pattern</Text>
                        <Text style={styles.answerText}>{fullSession.step3_answer}</Text>
                      </View>
                    )}

                    {/* Step 4 - Next action */}
                    {fullSession.step4_answer && (
                      <View style={styles.answerBlock}>
                        <Text style={styles.answerLabel}>Next action</Text>
                        <Text style={styles.answerText}>{fullSession.step4_answer}</Text>
                      </View>
                    )}

                    {/* Feedback */}
                    {(feedbackDisplay || fullSession.feedback_note) && (
                      <View style={styles.feedbackSection}>
                        <Text style={styles.answerLabel}>Feedback</Text>
                        {feedbackDisplay && (
                          <Text style={styles.feedbackRating}>
                            {feedbackDisplay.emoji} {feedbackDisplay.label}
                          </Text>
                        )}
                        {fullSession.feedback_note && (
                          <Text style={styles.feedbackNote}>{fullSession.feedback_note}</Text>
                        )}
                      </View>
                    )}

                    {/* Timestamps */}
                    <View style={styles.timestampsRow}>
                      {session.reflection_completed_at && (
                        <Text style={styles.timestampText}>
                          Completed: {formatDateTime(session.reflection_completed_at)}
                        </Text>
                      )}
                      {session.reflection_updated_at && session.reflection_updated_at > (session.reflection_completed_at || 0) && (
                        <Text style={styles.timestampText}>
                          Updated: {formatDateTime(session.reflection_updated_at)}
                        </Text>
                      )}
                    </View>
                  </>
                ) : null}
              </View>
            )}

            {/* Status Message Section (if no reflection) */}
            {!hasReflection && (
              <View style={styles.section}>
                <View style={styles.statusMessageContainer}>
                  <Text style={styles.statusMessage}>
                    {getStatusMessage(reflectionState)}
                  </Text>
                  {reflectionState.status !== 'expired' && (
                    <Text style={styles.statusSubtext}>
                      Complete your reflection to capture insights from this session.
                    </Text>
                  )}
                  {reflectionState.status === 'expired' && (
                    <Text style={styles.statusSubtext}>
                      The 48-hour reflection window has passed for this session.
                    </Text>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {/* Variant 1 & 2: Has reflection */}
            {hasReflection && (
              <>
                {canEdit && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => onEditReflection(session.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.primaryButtonText}>Edit Reflection</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={handleMove}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryButtonText}>Move to Different Practice Area</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Variant 3: No reflection yet */}
            {!hasReflection && (
              <>
                {reflectionState.status !== 'expired' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => onCompleteReflection(session.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.primaryButtonText}>Complete Reflection</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={handleMove}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryButtonText}>Move to Different Practice Area</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={handleDelete}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dangerButtonText}>Delete Session</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.closeActionButton]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeActionButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Practice Area Picker Modal */}
      {session && (
        <PracticeAreaPicker
          visible={isPickerVisible}
          currentPracticeAreaId={session.practice_area_id}
          onSelect={handlePracticeAreaSelect}
          onClose={() => setIsPickerVisible(false)}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[200],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dateTime: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  closeButtonText: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.text.secondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.inverse,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  intentText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.normal,
    marginBottom: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    gap: SPACING.lg,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs / 2,
  },
  metaValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
  targetMet: {
    color: COLORS.success,
  },
  targetMissed: {
    color: COLORS.error,
  },
  reflectionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  toneBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 8,
  },
  toneBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.inverse,
  },
  editedBadge: {
    backgroundColor: COLORS.neutral[500],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 8,
  },
  editedBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.inverse,
  },
  loader: {
    marginVertical: SPACING.md,
  },
  answerBlock: {
    marginBottom: SPACING.md,
  },
  answerLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  answerText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.relaxed,
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: 8,
  },
  feedbackSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[200],
  },
  feedbackRating: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  feedbackNote: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  timestampsRow: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[200],
  },
  timestampText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs / 2,
  },
  statusMessageContainer: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  statusMessage: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  statusSubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal,
  },
  actionContainer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[200],
    gap: SPACING.sm,
  },
  actionButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  secondaryButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
  dangerButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  dangerButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.error,
  },
  closeActionButton: {
    backgroundColor: COLORS.neutral[200],
  },
  closeActionButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
});

export default SessionDetailModal;

