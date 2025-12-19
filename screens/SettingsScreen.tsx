import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";
import { checkDeviceSecurity } from "../services/securityService";

/**
 * Settings Screen (Minimal Implementation)
 * 
 * Shows device lock status and privacy information
 * Per tech spec Section 5.9 (minimal version)
 */
const SettingsScreen: React.FC = () => {
  const [isSecure, setIsSecure] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSecurity = async () => {
      try {
        const secure = await checkDeviceSecurity();
        setIsSecure(secure);
      } catch (error) {
        console.error('Error checking device security:', error);
        setIsSecure(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSecurity();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Privacy & Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Security</Text>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Device Lock Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusIcon}>
                {isSecure ? '✅' : '⚠️'}
              </Text>
              <Text style={[
                styles.statusText,
                isSecure ? styles.statusEnabled : styles.statusDisabled
              ]}>
                {isSecure ? 'Enabled' : 'Not Enabled'}
              </Text>
            </View>
          </View>

          {!isSecure && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Enable device lock in iOS Settings for better privacy protection.
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.privacyStatement}>
            All data is stored locally on your device, encrypted at rest. No cloud sync.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  section: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusIcon: {
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  statusEnabled: {
    color: COLORS.success,
  },
  statusDisabled: {
    color: COLORS.warning,
  },
  warningBox: {
    backgroundColor: COLORS.warning + '20', // 20% opacity
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  warningText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
    lineHeight: TYPOGRAPHY.lineHeight.normal * TYPOGRAPHY.fontSize.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.neutral[200],
    marginVertical: SPACING.md,
  },
  privacyStatement: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.normal * TYPOGRAPHY.fontSize.sm,
  },
});

export default SettingsScreen;


