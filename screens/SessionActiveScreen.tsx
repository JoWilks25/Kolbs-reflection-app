import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Vibration,
  AppState,
  BackHandler,
  Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";
import { useAppStore } from "../stores/appStore";
import { getPracticeAreaById, updateSessionEndTime } from "../db/queries";
import { formatTime } from "../utils/timeFormatting";
import { scheduleTargetReachedNotification } from "../services/notificationService";

type SessionActiveScreenNavigationProp = StackNavigationProp<RootStackParamList, "SessionActive">;

const SessionActiveScreen: React.FC = () => {
  const navigation = useNavigation<SessionActiveScreenNavigationProp>();
  const { currentSession, sessionTimer, targetDuration, targetReached, updateTimer, endSession } = useAppStore();

  const [practiceAreaName, setPracticeAreaName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);

  // Load practice area name and set header
  useEffect(() => {
    const loadPracticeArea = async () => {
      if (!currentSession) {
        // This shouldn't happen in normal flow, but handle gracefully
        setIsLoading(false);
        return;
      }

      try {
        const practiceArea = await getPracticeAreaById(currentSession.practice_area_id);
        if (practiceArea) {
          setPracticeAreaName(practiceArea.name);
          // Update header title dynamically
          navigation.setOptions({ title: practiceArea.name });
        }
      } catch (error) {
        console.error("Error loading practice area:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPracticeArea();
  }, [currentSession, navigation]);

  // Timer update interval
  useEffect(() => {
    const interval = setInterval(() => {
      updateTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [updateTimer]);

  // AppState handling for backgrounding
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        // Timer interval will be cleared, but sessionStartTime is preserved
        // No action needed - interval cleanup happens automatically
      } else if (nextAppState === 'active') {
        // Timer will recalculate from sessionStartTime automatically
        // via the existing updateTimer() logic
        updateTimer();
      }
    });

    return () => subscription.remove();
  }, [updateTimer]);

  // Target reached notification
  useEffect(() => {
    if (targetDuration && sessionTimer === targetDuration && targetReached) {
      scheduleTargetReachedNotification();
      Vibration.vibrate([0, 200, 100, 200]);
    }
  }, [sessionTimer, targetDuration, targetReached]);

  // Handle end session and reflect now
  const handleEndAndReflectNow = useCallback(async () => {
    if (!currentSession) return;

    setIsEnding(true);
    try {
      // Update database with end time
      await updateSessionEndTime(currentSession.id, Date.now());

      // Store session ID in Zustand BEFORE navigation
      endSession();  // ← Move this BEFORE navigation

      // Navigate to reflection
      navigation.navigate("ReflectionTone");
    } catch (error) {
      console.error("Error ending session:", error);
      Alert.alert("Error", "Failed to end session. Please try again.");
      setIsEnding(false);
    }
  }, [currentSession, endSession, navigation]);

  // Handle end session and reflect later
  const handleEndAndReflectLater = useCallback(async () => {
    if (!currentSession) return;

    setIsEnding(true);
    try {
      // Update database with end time
      await updateSessionEndTime(currentSession.id, Date.now());

      // Clear Zustand state
      endSession();

      // Navigate to Home (where pending reflections banner will show)
      navigation.navigate("Home");
    } catch (error) {
      console.error("Error ending session:", error);
      Alert.alert("Error", "Failed to end session. Please try again.");
      setIsEnding(false);
    }
  }, [currentSession, endSession, navigation]);

  // Intercept Android hardware back while this screen is focused.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return undefined;

      const onBackPress = () => {
        if (isEnding) {
          return true;
        }

        Alert.alert(
          "End session before leaving?",
          "If you leave now, the session will be ended.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "End session",
              style: "destructive",
              onPress: () => {
                void handleEndAndReflectLater();
              },
            },
          ]
        );

        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [handleEndAndReflectLater, isEnding])
  );

  // Calculate progress and color for target mode
  const progress = targetDuration ? Math.min(sessionTimer / targetDuration, 1.0) : null;

  const isNearingTarget =
    targetDuration && targetDuration - sessionTimer <= 120 && sessionTimer < targetDuration;

  const hasExceededTarget = targetDuration && sessionTimer >= targetDuration;

  const getProgressColor = () => {
    if (!targetDuration) return COLORS.success;
    if (hasExceededTarget) return COLORS.primary;
    if (isNearingTarget) return COLORS.warning;
    return COLORS.success;
  };

  // Progress bar component
  const ProgressBar = ({ progress, color }: { progress: number; color: string }) => (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!currentSession) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No active session</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Session Intent Card */}
        <View style={styles.intentCard}>
          <Text style={styles.intentLabel}>Session Intent</Text>
          <Text style={styles.intentText}>{currentSession.intent}</Text>
        </View>

        {/* Timer Display */}
        <View style={styles.timerSection}>
          {!targetDuration ? (
            // Mode 1: No target - simple stopwatch
            <View style={styles.timerContainer}>
              <Text style={styles.timerLarge}>{formatTime(sessionTimer)}</Text>
              <Text style={styles.timerSubtext}>Elapsed time</Text>
            </View>
          ) : (
            // Mode 2: With target - timer with progress bar
            <View style={styles.timerContainer}>
              <Text style={styles.timerWithTarget}>
                {formatTime(sessionTimer)} / {formatTime(targetDuration)}
              </Text>
              <ProgressBar progress={progress!} color={getProgressColor()} />
              {hasExceededTarget && (
                <Text style={styles.exceededText}>
                  +{formatTime(sessionTimer - targetDuration)} over target
                </Text>
              )}
              {!hasExceededTarget && (
                <Text style={styles.timerSubtext}>
                  {isNearingTarget ? "Almost there!" : "Time remaining"}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Helpful text */}
        <View style={styles.helpSection}>
          <Text style={styles.helpText}>
            {targetDuration
              ? "Your timer will continue past the target. End when you're ready."
              : "Practice as long as you need. End when you're ready."}
          </Text>
        </View>
      </ScrollView>

      {/* End Session Buttons - Fixed at bottom */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.endButton, isEnding && styles.endButtonDisabled]}
          onPress={handleEndAndReflectNow}
          disabled={isEnding}
          activeOpacity={0.7}
        >
          {isEnding ? (
            <ActivityIndicator size="small" color={COLORS.text.inverse} />
          ) : (
            <Text style={styles.endButtonText}>End & Reflect Now</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reflectLaterButton}
          onPress={handleEndAndReflectLater}
          disabled={isEnding}
          activeOpacity={0.7}
        >
          <Text style={styles.reflectLaterText}>End Session & Reflect Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.error,
  },
  intentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  intentLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  intentText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: COLORS.text.primary,
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.normal,
  },
  timerSection: {
    alignItems: "center",
    marginVertical: SPACING.xxl,
  },
  timerContainer: {
    alignItems: "center",
    width: "100%",
  },
  timerLarge: {
    fontSize: 72,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    fontVariant: ["tabular-nums"],
  },
  timerWithTarget: {
    fontSize: 48,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    fontVariant: ["tabular-nums"],
  },
  timerSubtext: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
  },
  progressBarContainer: {
    width: "100%",
    height: 12,
    backgroundColor: COLORS.neutral[200],
    borderRadius: 6,
    overflow: "hidden",
    marginTop: SPACING.md,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  exceededText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary,
    marginTop: SPACING.sm,
  },
  helpSection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  helpText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: "center",
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.relaxed,
    fontStyle: "italic",
  },
  buttonContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[200],
  },
  endButton: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 50,
  },
  endButtonDisabled: {
    backgroundColor: COLORS.neutral[400],
    shadowOpacity: 0,
    elevation: 0,
  },
  endButtonText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.inverse,
  },
  reflectLaterButton: {
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
  },
  reflectLaterText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    textDecorationLine: "underline",
  },
});

export default SessionActiveScreen;
