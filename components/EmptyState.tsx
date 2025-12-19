import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";

const EmptyState: React.FC = () => (
  <View style={styles.emptyStateContainer}>
    <Text style={styles.emptyStateTitle}>No Practice Areas yet</Text>
    <Text style={styles.emptyStateBody}>
      Create a Practice Area to start tracking your practice sessions.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  emptyStateBody: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.normal,
  },
});

export default EmptyState;

