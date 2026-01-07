import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import RootStackNavigator from "./navigation/RootStackNavigator";
import { initDatabase, getDatabase, dropAllTables } from "./db/migrations";
import { THEME } from "./utils/constants";
import { getPracticeAreas } from "./db/queries";
import { setupNotifications } from "./services/notificationService";
import { cleanupOrphanedDrafts } from "./utils/draftCleanup";
import { checkAIAvailability } from "./services/aiService";
import { useAppStore } from "./stores/appStore";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setAiAvailable = useAppStore((state) => state.setAiAvailable);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize database
        await initDatabase();

        // Clean up orphaned reflection drafts (non-blocking)
        try {
          await cleanupOrphanedDrafts();
        } catch (cleanupError) {
          console.warn('Draft cleanup failed, continuing:', cleanupError);
        }

        // Setup notifications (non-blocking - app continues if this fails)
        try {
          await setupNotifications();
        } catch (notificationError) {
          console.warn('Notification setup failed, continuing without notifications:', notificationError);
        }

        // Check AI availability (non-blocking - app works without AI)
        try {
          const aiAvailable = await checkAIAvailability();
          setAiAvailable(aiAvailable);
          if (!aiAvailable) {
            console.log('AI features unavailable - running in tones-only mode');
          }
        } catch (aiError) {
          console.warn('AI availability check failed, continuing without AI:', aiError);
          setAiAvailable(false);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [setAiAvailable]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Initializing database...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.errorSubtext}>Please restart the app</Text>
      </View>
    );
  }

  return <RootStackNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
  },
  loadingText: {
    marginTop: THEME.spacing.md,
    fontSize: THEME.typography.fontSize.md,
    color: THEME.colors.text.secondary,
    fontWeight: THEME.typography.fontWeight.regular,
  },
  errorText: {
    fontSize: THEME.typography.fontSize.lg,
    color: THEME.colors.error,
    fontWeight: THEME.typography.fontWeight.bold,
    marginBottom: THEME.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: THEME.spacing.lg,
  },
  errorSubtext: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: THEME.spacing.lg,
  },
});