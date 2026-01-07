import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PracticeArea, PracticeAreaWithStats } from "../utils/types";
import { formatDate } from "../utils/timeFormatting";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";

// Format session count with proper pluralization
const formatSessionCount = (count: number): string => {
  return count === 1 ? "1 session" : `${count} sessions`;
};

// Type badge configuration with semi-transparent backgrounds
const TYPE_BADGE_CONFIG = {
  solo_skill: {
    label: 'Solo',
    color: '#7E57C2',  // Purple - precision, focus
    backgroundColor: 'rgba(126, 87, 194, 0.15)',  // 15% opacity
    iconName: 'target' as const,
    emoji: '🎯',
  },
  performance: {
    label: 'Performance',
    color: '#EC407A',  // Pink - energy, boldness
    backgroundColor: 'rgba(236, 64, 122, 0.15)',  // 15% opacity
    iconName: 'lightning-bolt' as const,
    emoji: '🎭',
  },
  interpersonal: {
    label: 'Interpersonal',
    color: '#26A69A',  // Teal - communication, connection
    backgroundColor: 'rgba(38, 166, 154, 0.15)',  // 15% opacity
    iconName: 'account-group-outline' as const,
    emoji: '👥',
  },
  creative: {
    label: 'Creative',
    color: '#9C27B0',  // Deep purple - imagination, creativity
    backgroundColor: 'rgba(156, 39, 176, 0.15)',  // 15% opacity
    iconName: 'lightbulb-outline' as const,
    emoji: '🎨',
  },
};

export interface PracticeAreaItemProps {
  item: PracticeAreaWithStats;
  onPress: (practiceAreaId: string) => void;
  onViewTimeline: (practiceAreaId: string) => void;
  onEdit: (selectedPracticeArea: PracticeArea) => void;
}

const PracticeAreaItem: React.FC<PracticeAreaItemProps> = ({ item, onPress, onViewTimeline, onEdit }) => {
  const lastSessionText = item.lastSessionDate
    ? formatDate(item.lastSessionDate)
    : "No sessions yet";

  const hasPending = item.pendingReflectionsCount > 0;
  const hasOverdue = item.overdueReflectionsCount > 0;
  const hasIndicators = hasPending || hasOverdue;

  // Determine border style - overdue takes priority
  const borderStyle = hasOverdue
    ? styles.cardBorderOverdue
    : hasPending
      ? styles.cardBorderPending
      : null;

  // Get type badge config
  const typeBadge = TYPE_BADGE_CONFIG[item.type];

  return (
    <TouchableOpacity
      style={[styles.practiceAreaItem, borderStyle]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        {/* Top Row: Name + Pending/Overdue Indicators */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => onEdit(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons
              name="square-edit-outline"
              size={20}
              color={COLORS.text.secondary}
            />
          </TouchableOpacity>
          <Text style={styles.practiceAreaName} numberOfLines={2}>
            {item.name}
          </Text>
          {hasIndicators && (
            <View style={styles.indicatorContainer}>
              {hasPending && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>
                    {item.pendingReflectionsCount}
                  </Text>
                </View>
              )}
              {hasOverdue && (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueBadgeText}>
                    {item.overdueReflectionsCount}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Stats Row: Type + Session Count + Last Session */}
        <View style={styles.statsRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeBadge.backgroundColor }]}>
            <MaterialCommunityIcons
              name={typeBadge.iconName}
              size={16}
              color={typeBadge.color}
            />
            <Text style={[styles.typeBadgeText, { color: typeBadge.color }]}>
              {typeBadge.label}
            </Text>
          </View>
          <Text style={styles.statsSeparator}>·</Text>
          <Text style={styles.statsText} numberOfLines={1}>{item.lastSessionDate ? 'Last Session:' : ''} {lastSessionText}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onPress(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Start session</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onViewTimeline(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              View timeline {item.sessionCount > 0 && `(${item.sessionCount})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  practiceAreaItem: {
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
  cardBorderPending: {
    borderLeftWidth: 5,
    borderLeftColor: COLORS.warning,
  },
  cardBorderOverdue: {
    borderLeftWidth: 5,
    borderLeftColor: COLORS.error,
  },
  itemContent: {
    gap: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  editIcon: {
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
  practiceAreaName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    flex: 1,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexShrink: 0,
  },
  pendingBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  pendingBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.inverse,
  },
  overdueBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  overdueBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.inverse,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  statsText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    flexShrink: 1,
  },
  statsSeparator: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
});

export default PracticeAreaItem;
