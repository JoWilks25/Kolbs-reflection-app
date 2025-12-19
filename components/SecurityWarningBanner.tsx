import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";

export interface SecurityWarningBannerProps {
  onDismiss: () => void;
}

/**
 * Security Warning Banner Component
 * 
 * Displays a dismissible warning when device lock is not enabled
 * Per tech spec Section 8.2 (lines 1247-1268)
 */
const SecurityWarningBanner: React.FC<SecurityWarningBannerProps> = ({
  onDismiss
}) => {
  return (
    <View style={styles.banner}>
      <View style={styles.contentContainer}>
        <Text style={styles.warningText}>
          ⚠️ Enable device lock (Face ID/passcode) for better privacy
        </Text>
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissButton}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.warning,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warningText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.inverse,
    marginRight: SPACING.sm,
  },
  dismissButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  dismissText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
    textDecorationLine: 'underline',
  },
});

export default SecurityWarningBanner;

