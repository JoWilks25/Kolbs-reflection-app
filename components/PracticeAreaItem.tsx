import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { PracticeAreaWithStats } from "../utils/types";
import { formatDate } from "../utils/timeFormatting";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";

// Format session count with proper pluralization
const formatSessionCount = (count: number): string => {
  return count === 1 ? "1 session" : `${count} sessions`;
};

export interface PracticeAreaItemProps {
  item: PracticeAreaWithStats;
  onPress: (practiceAreaId: string) => void;
}

const PracticeAreaItem: React.FC<PracticeAreaItemProps> = ({ item, onPress }) => {
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

  return (
    <TouchableOpacity
      style={[styles.practiceAreaItem, borderStyle]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <View style={styles.headerRow}>
          <Text style={styles.practiceAreaName}>{item.name}</Text>
          {hasIndicators && (
            <View style={styles.indicatorContainer}>
              {hasPending && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>
                    {item.pendingReflectionsCount} pending
                  </Text>
                </View>
              )}
              {hasOverdue && (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueBadgeText}>
                    {item.overdueReflectionsCount} overdue
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        <Text style={styles.lastSessionDate}>{lastSessionText}</Text>
        <View style={styles.sessionCountBadge}>
          <Text style={styles.sessionCountText}>
            {formatSessionCount(item.sessionCount)}
          </Text>
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
    gap: SPACING.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  practiceAreaName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexShrink: 0,
  },
  pendingBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  overdueBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 8,
  },
  overdueBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  lastSessionDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  sessionCountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    marginTop: SPACING.xs,
  },
  sessionCountText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.inverse,
  },
});

export default PracticeAreaItem;

