import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from "react-native";
import Constants from "expo-constants";
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";
import { checkDeviceSecurity } from "../services/securityService";
import { cleanupOrphanedDrafts } from "../utils/draftCleanup";
import { exportData } from "../services/exportService";
import { importJsonData } from "../services/importService";
import { getPracticeAreas } from "../db/queries";
import { useAppStore } from "../stores/appStore";
import { getAICoachingStatusMessage } from "../utils/aiStatusMessage";

/**
 * Settings Screen (Minimal Implementation)
 * 
 * Shows device lock status and privacy information
 * Per tech spec Section 5.9 (minimal version)
 */
const SettingsScreen: React.FC = () => {
  const [isSecure, setIsSecure] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaningDrafts, setIsCleaningDrafts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Get app version from expo-constants
  const version = Constants.expoConfig?.version ?? '1.0.0';

  // Get Zustand store actions and AI state
  const setPracticeAreas = useAppStore((state) => state.setPracticeAreas);
  const aiAvailable = useAppStore((state) => state.aiAvailable);

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

  const handleCleanupDrafts = async () => {
    setIsCleaningDrafts(true);
    try {
      const cleanedCount = await cleanupOrphanedDrafts();
      Alert.alert(
        'Cleanup Complete',
        cleanedCount > 0
          ? `Removed ${cleanedCount} orphaned draft${cleanedCount === 1 ? '' : 's'}.`
          : 'No orphaned drafts found. Storage is clean.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error during manual cleanup:', error);
      Alert.alert(
        'Cleanup Failed',
        'An error occurred while cleaning up drafts. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCleaningDrafts(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await exportData();
      // Success toast is shown by exportService
    } catch (error) {
      // Error toast is shown by exportService
      console.error('Export error in SettingsScreen:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async () => {
    setIsImporting(true);
    try {
      // Open document picker for JSON files
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      // Check if user cancelled
      if (result.canceled) {
        console.log('Import cancelled by user');
        setIsImporting(false);
        return;
      }

      // Get the selected file
      const file = result.assets[0];
      console.log('Selected file:', file.uri);

      // Import the data
      const importResult = await importJsonData(file.uri);

      // Refresh Zustand store with updated data
      const practiceAreas = await getPracticeAreas();
      setPracticeAreas(practiceAreas);

      // Show success alert
      Alert.alert(
        'Import Complete',
        `Successfully restored ${importResult.practiceAreasCount} practice area${importResult.practiceAreasCount === 1 ? '' : 's'} with ${importResult.sessionsCount} session${importResult.sessionsCount === 1 ? '' : 's'} and ${importResult.reflectionsCount} reflection${importResult.reflectionsCount === 1 ? '' : 's'}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      // Error toast is shown by importService
      console.error('Import error in SettingsScreen:', error);
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Data Export Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Data</Text>

        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            Export all Practice Areas, Sessions, and Reflections as JSON. Use for manual analysis or backup.
          </Text>

          <TouchableOpacity
            style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
            onPress={handleExportData}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <Text style={styles.exportButtonText}>Export Data</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.exportHint}>
            Creates a JSON file with all your data that you can save or share.
          </Text>
        </View>
      </View>

      {/* Data Import Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Import Data</Text>

        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            Restore Practice Areas, Sessions, and Reflections from a previously exported JSON file. This will replace all existing data.
          </Text>

          <TouchableOpacity
            style={[styles.importButton, isImporting && styles.importButtonDisabled]}
            onPress={handleImportData}
            disabled={isImporting}
          >
            {isImporting ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <Text style={styles.importButtonText}>Import Data</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.importHint}>
            Select a JSON export file to restore your data. All current data will be replaced.
          </Text>
        </View>
      </View>

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
            All data is stored locally on your device, encrypted at rest.{'\n'}
            No cloud sync or external analytics.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.notificationsNote}>
            If you disable notifications, you won't receive target-duration alerts, but practice sessions still work normally.
          </Text>
        </View>
      </View>

      {/* AI Coaching Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Coaching Status</Text>

        <View style={styles.card}>
          {aiAvailable ? (
            <View style={styles.statusRow}>
              <Text style={styles.statusIcon}>✅</Text>
              <Text style={[styles.statusText, styles.statusEnabled]}>
                {getAICoachingStatusMessage(aiAvailable)}
              </Text>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <Text style={styles.statusIcon}>ℹ️</Text>
              <Text style={[styles.statusText, styles.statusUnavailable]}>
                {getAICoachingStatusMessage(aiAvailable)}
              </Text>
            </View>
          )}
          <Text style={styles.helpText}>
            AI coaching runs entirely on your device. Your reflections are never sent to any server.
          </Text>
        </View>
      </View>

      {/* Storage Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage Management</Text>

        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            Clean up old reflection drafts that are no longer needed.
          </Text>

          <TouchableOpacity
            style={[styles.cleanupButton, isCleaningDrafts && styles.cleanupButtonDisabled]}
            onPress={handleCleanupDrafts}
            disabled={isCleaningDrafts}
          >
            {isCleaningDrafts ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <Text style={styles.cleanupButtonText}>Clean Up Old Drafts</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.cleanupHint}>
            Removes drafts for completed, deleted, or sessions older than 48 hours.
          </Text>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>{version}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.aboutTagline}>
            Built for personal reflection and learning.
          </Text>
        </View>
      </View>
    </ScrollView>
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
  statusUnavailable: {
    color: COLORS.text.secondary,
  },
  helpText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.normal * TYPOGRAPHY.fontSize.sm,
    marginTop: SPACING.sm,
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
  notificationsNote: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.normal * TYPOGRAPHY.fontSize.sm,
  },
  cardDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.normal * TYPOGRAPHY.fontSize.sm,
    marginBottom: SPACING.md,
  },
  cleanupButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cleanupButtonDisabled: {
    opacity: 0.6,
  },
  cleanupButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.surface,
  },
  cleanupHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.normal * TYPOGRAPHY.fontSize.xs,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  exportButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.surface,
  },
  exportHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.normal * TYPOGRAPHY.fontSize.xs,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  importButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.surface,
  },
  importHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.normal * TYPOGRAPHY.fontSize.xs,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  aboutLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
  aboutValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
  },
  aboutTagline: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.lineHeight.normal * TYPOGRAPHY.fontSize.sm,
    textAlign: 'center',
  },
});

export default SettingsScreen;


