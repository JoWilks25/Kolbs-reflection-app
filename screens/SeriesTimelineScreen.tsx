import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";
import { SessionWithReflection, ReflectionFormat, FeedbackRating } from "../utils/types";
import { getSeriesSessions, getPracticeAreaById } from "../db/queries";
import { getReflectionState, getReflectionBadge } from "../services/reflectionStateService";
import { formatDateTime } from "../utils/timeFormatting";

type SeriesTimelineScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SeriesTimeline"
>;

type SeriesTimelineScreenRouteProp = RouteProp<
  RootStackParamList,
  "SeriesTimeline"
>;

type Props = {
  navigation: SeriesTimelineScreenNavigationProp;
  route: SeriesTimelineScreenRouteProp;
};

// Format badge labels
const getFormatLabel = (format: ReflectionFormat | null): string | null => {
  if (format === null) return null;
  switch (format) {
    case 1:
      return "Direct";
    case 2:
      return "Reflective";
    case 3:
      return "Minimalist";
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

// Memoized Session Card Component
const SessionCard = React.memo<{
  item: SessionWithReflection;
  onPress: (sessionId: string) => void;
}>(({ item, onPress }) => {
  // Calculate duration if session ended
  const durationMinutes = item.ended_at
    ? Math.round((item.ended_at - item.started_at) / 60000)
    : null;

  // Target comparison
  const hasTarget = item.target_duration_seconds !== null;
  const targetMinutes = hasTarget ? Math.round(item.target_duration_seconds! / 60) : null;
  const targetMet = hasTarget && durationMinutes !== null && durationMinutes >= targetMinutes!;

  // Format label
  const formatLabel = getFormatLabel(item.format);

  // Reflection state
  const reflectionState = getReflectionState(item, item.reflection_completed_at ? {
    id: '',
    session_id: item.id,
    format: item.format!,
    step2_answer: '',
    step3_answer: '',
    step4_answer: '',
    feedback_rating: item.feedback_rating,
    feedback_note: null,
    completed_at: item.reflection_completed_at!,
    updated_at: item.reflection_updated_at,
  } : null);
  const reflectionBadge = getReflectionBadge(reflectionState);

  // Feedback display
  const feedbackDisplay = getFeedbackDisplay(item.feedback_rating);

  // Edited flag
  const isEdited = item.reflection_updated_at !== null && item.reflection_updated_at > (item.reflection_completed_at || 0);

  return (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      {/* Date/Time */}
      <Text style={styles.sessionDateTime}>{formatDateTime(item.started_at)}</Text>

      {/* Intent */}
      <Text style={styles.sessionIntent} numberOfLines={2} ellipsizeMode="tail">
        {item.intent}
      </Text>

      {/* Badges Row */}
      <View style={styles.badgesRow}>
        {/* Duration Badge */}
        {durationMinutes !== null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{durationMinutes} min</Text>
          </View>
        )}

        {/* Target Comparison Badge */}
        {hasTarget && durationMinutes !== null && (
          <View style={[styles.badge, styles.targetBadge]}>
            <Text style={styles.badgeText}>
              {targetMet ? "✓" : "✗"} target {targetMinutes} min
            </Text>
          </View>
        )}

        {/* Format Badge */}
        {formatLabel && (
          <View style={[styles.badge, styles.formatBadge]}>
            <Text style={styles.badgeText}>{formatLabel}</Text>
          </View>
        )}

        {/* Reflection State Badge */}
        <View style={[styles.badge, { backgroundColor: reflectionBadge.color }]}>
          <Text style={styles.badgeText}>
            {reflectionBadge.emoji} {reflectionBadge.label}
          </Text>
        </View>

        {/* Feedback Badge */}
        {feedbackDisplay && (
          <View style={[styles.badge, styles.feedbackBadge]}>
            <Text style={styles.badgeText}>
              {feedbackDisplay.emoji} {feedbackDisplay.label}
            </Text>
          </View>
        )}

        {/* Edited Badge */}
        {isEdited && (
          <View style={[styles.badge, styles.editedBadge]}>
            <Text style={styles.badgeText}>Edited</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const SeriesTimelineScreen: React.FC<Props> = ({ navigation, route }) => {
  const { practiceAreaId, focusSessionId } = route.params;
  
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sessions, setSessions] = useState<SessionWithReflection[]>([]);
  const [practiceAreaName, setPracticeAreaName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Load practice area name
  useEffect(() => {
    const loadPracticeAreaName = async () => {
      try {
        const practiceArea = await getPracticeAreaById(practiceAreaId);
        if (practiceArea) {
          setPracticeAreaName(practiceArea.name);
          navigation.setOptions({ title: practiceArea.name });
        }
      } catch (error) {
        console.error('Error loading practice area name:', error);
      }
    };
    
    loadPracticeAreaName();
  }, [practiceAreaId, navigation]);

  // Load sessions
  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedSessions = await getSeriesSessions(practiceAreaId, sortOrder);
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [practiceAreaId, sortOrder]);

  // Reload on focus and when sort order changes
  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  // Handle session card press (stub for future Session Detail modal)
  const handleSessionPress = (sessionId: string) => {
    // TODO: Navigate to Session Detail modal
    console.log('Session pressed:', sessionId);
  };

  // Toggle sort order
  const toggleSortOrder = (order: 'asc' | 'desc') => {
    if (order !== sortOrder) {
      setSortOrder(order);
    }
  };

  // Empty state
  if (!isLoading && sessions.length === 0) {
    return (
      <View style={styles.container}>
        {/* Sort Toggle (kept for consistency) */}
        <View style={styles.sortToggleContainer}>
          <TouchableOpacity
            style={[styles.sortButton, sortOrder === 'desc' && styles.sortButtonActive]}
            onPress={() => toggleSortOrder('desc')}
            activeOpacity={0.7}
          >
            <Text style={[styles.sortButtonText, sortOrder === 'desc' && styles.sortButtonTextActive]}>
              Newest first
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortOrder === 'asc' && styles.sortButtonActive]}
            onPress={() => toggleSortOrder('asc')}
            activeOpacity={0.7}
          >
            <Text style={[styles.sortButtonText, sortOrder === 'asc' && styles.sortButtonTextActive]}>
              Oldest first
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No sessions yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start a session in {practiceAreaName} to see it here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sort Toggle */}
      <View style={styles.sortToggleContainer}>
        <TouchableOpacity
          style={[styles.sortButton, sortOrder === 'desc' && styles.sortButtonActive]}
          onPress={() => toggleSortOrder('desc')}
          activeOpacity={0.7}
        >
          <Text style={[styles.sortButtonText, sortOrder === 'desc' && styles.sortButtonTextActive]}>
            Newest first
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortOrder === 'asc' && styles.sortButtonActive]}
          onPress={() => toggleSortOrder('asc')}
          activeOpacity={0.7}
        >
          <Text style={[styles.sortButtonText, sortOrder === 'asc' && styles.sortButtonTextActive]}>
            Oldest first
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sessions List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={({ item }) => (
            <SessionCard item={item} onPress={handleSessionPress} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  sortToggleContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[200],
  },
  sortButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  sortButtonTextActive: {
    color: COLORS.text.inverse,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  emptyStateSubtext: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionDateTime: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  sessionIntent: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.normal,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  badge: {
    backgroundColor: COLORS.neutral[400],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 8,
  },
  targetBadge: {
    backgroundColor: COLORS.neutral[500],
  },
  formatBadge: {
    backgroundColor: COLORS.secondary,
  },
  feedbackBadge: {
    backgroundColor: COLORS.neutral[600],
  },
  editedBadge: {
    backgroundColor: COLORS.neutral[700],
  },
  badgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.inverse,
  },
});

export default SeriesTimelineScreen;
