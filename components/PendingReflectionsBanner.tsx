import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { PendingReflection } from "../utils/types";
import { formatHoursRemaining } from "../utils/timeFormatting";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";

export interface PendingReflectionsBannerProps {
  pendingReflections: PendingReflection[];
  onPress: () => void;
}

const PendingReflectionsBanner: React.FC<PendingReflectionsBannerProps> = ({
  pendingReflections,
  onPress
}) => {
  if (pendingReflections.length === 0) {
    return null;
  }

  const oldest = pendingReflections[0];
  const count = pendingReflections.length;
  const now = Date.now();
  const hoursSinceEnd = (now - oldest.ended_at!) / (1000 * 60 * 60);
  const hoursRemaining = 48 - hoursSinceEnd;
  const millisecondsRemaining = hoursRemaining * 60 * 60 * 1000;

  // Determine state: Pending (< 24h) or Overdue (24-48h)
  const isPending = hoursSinceEnd < 24;
  const isOverdue = hoursSinceEnd >= 24 && hoursSinceEnd < 48;

  // Format text
  const countText = count === 1 ? "1 reflection" : `${count} reflections`;
  let stateText = "";
  if (isPending) {
    stateText = "due";
  }
  if (isOverdue) {
    stateText = "overdue"
  }
  const timeText = formatHoursRemaining(millisecondsRemaining);
  const suffixText = isPending ? "" : " before expiry";

  const bannerText = `${countText} ${stateText} (${timeText}${suffixText})`;

  // Determine background color
  const backgroundColor = isPending ? COLORS.warning : COLORS.error;

  return (
    <TouchableOpacity
      style={[styles.pendingBanner, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.pendingBannerText}>{bannerText}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pendingBanner: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBannerText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
    textAlign: 'center',
  },
});

export default PendingReflectionsBanner;

