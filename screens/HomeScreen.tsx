import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/constants';
import { useAppStore } from '../stores/appStore';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  // Get state and actions from store
  const practiceAreas = useAppStore((state) => state.practiceAreas);
  const setPracticeAreas = useAppStore((state) => state.setPracticeAreas);
  const sessionTimer = useAppStore((state) => state.sessionTimer);
  const currentSession = useAppStore((state) => state.currentSession);
  const startSession = useAppStore((state) => state.startSession);
  const updateTimer = useAppStore((state) => state.updateTimer);
  const endSession = useAppStore((state) => state.endSession);

  // Timer interval ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Test: Set practice areas on mount
  useEffect(() => {
    setPracticeAreas([
      { id: '1', name: 'Test Practice Area', created_at: Date.now(), is_deleted: 0 },
    ]);
  }, [setPracticeAreas]);

  // Test: Timer functionality
  const handleStartTimer = () => {
    // Create a test session
    startSession({
      id: 'test-session-1',
      practice_area_id: '1',
      previous_session_id: null,
      intent: 'Test session intent',
      started_at: Date.now(),
      ended_at: null,
      is_deleted: 0,
    });

    // Start timer interval
    timerRef.current = setInterval(() => {
      updateTimer();
    }, 1000);
  };

  const handleStopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    endSession();
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Format timer display (MM:SS)
  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screen</Text>

      {/* Display practice areas from store */}
      <Text style={styles.subtitle}>Practice Areas from Store:</Text>
      {practiceAreas.map((pa) => (
        <Text key={pa.id} style={styles.practiceAreaItem}>
          {pa.name} (id: {pa.id})
        </Text>
      ))}

      {/* Timer test section */}
      <View style={styles.timerSection}>
        <Text style={styles.subtitle}>Timer Test:</Text>
        <Text style={styles.timerDisplay}>{formatTimer(sessionTimer)}</Text>
        <Text style={styles.sessionStatus}>
          Session: {currentSession ? 'Active' : 'None'}
        </Text>
        <View style={styles.buttonRow}>
          <Button
            title="Start Timer"
            onPress={handleStartTimer}
            disabled={currentSession !== null}
          />
          <Button
            title="Stop Timer"
            onPress={handleStopTimer}
            disabled={currentSession === null}
          />
        </View>
      </View>

      <Button
        title="Go to Session Setup"
        onPress={() => navigation.navigate("SessionSetup")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  practiceAreaItem: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    paddingVertical: SPACING.xs,
  },
  timerSection: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    width: '100%',
  },
  timerDisplay: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
    marginVertical: SPACING.sm,
  },
  sessionStatus: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
});

export default HomeScreen;
