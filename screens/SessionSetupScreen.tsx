import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { RouteProp, useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { COLORS, SPACING, TYPOGRAPHY, TARGET_DURATION_PRESETS } from "../utils/constants";
import { getPreviousSessionIntent, getPracticeAreaById, getLastSessionId, checkLastSessionHasPendingReflection, deleteSession, createSession } from "../db/queries";
import { useAppStore } from "../stores/appStore";
import { generateId } from "../utils/uuid";

type SessionSetupScreenRouteProp = RouteProp<RootStackParamList, "SessionSetup">;
type SessionSetupScreenNavigationProp = StackNavigationProp<RootStackParamList, "SessionSetup">;

type Props = {
  route: SessionSetupScreenRouteProp;
};

const SessionSetupScreen: React.FC<Props> = ({ route }) => {
  const { practiceAreaId } = route.params;
  const navigation = useNavigation<SessionSetupScreenNavigationProp>();
  const { startSession } = useAppStore();

  const [previousIntent, setPreviousIntent] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [practiceAreaName, setPracticeAreaName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // New session input state
  const [intentText, setIntentText] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  // Blocking state
  const [hasPendingReflection, setHasPendingReflection] = useState(false);
  const [pendingSessionInfo, setPendingSessionInfo] = useState<{
    sessionId: string;
    endedAt: number;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load Practice Area name
        const practiceArea = await getPracticeAreaById(practiceAreaId);
        if (practiceArea) {
          setPracticeAreaName(practiceArea.name);
          // Update header title
          navigation.setOptions({ title: practiceArea.name });
        }

        // Load previous session intent
        const result = await getPreviousSessionIntent(practiceAreaId) as any;
        if (!result) {
          setPreviousIntent("No previous sessions");
        } else if (!result.previous_next_action) {
          setPreviousIntent("No previous intent recorded");
        } else {
          setPreviousIntent(result.previous_next_action);
        }

        // Check for pending reflection
        const pendingCheck = await checkLastSessionHasPendingReflection(practiceAreaId);
        if (pendingCheck?.hasPending) {
          setHasPendingReflection(true);
          setPendingSessionInfo({
            sessionId: pendingCheck.sessionId,
            endedAt: pendingCheck.endedAt,
          });
        } else {
          setHasPendingReflection(false);
          setPendingSessionInfo(null);
        }
      } catch (error) {
        console.error("Error loading session setup data:", error);
        setPreviousIntent("Error loading previous intent");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [practiceAreaId, navigation]);

  // Refresh pending reflection check when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const checkPendingReflection = async () => {
        try {
          const pendingCheck = await checkLastSessionHasPendingReflection(practiceAreaId);
          if (pendingCheck?.hasPending) {
            setHasPendingReflection(true);
            setPendingSessionInfo({
              sessionId: pendingCheck.sessionId,
              endedAt: pendingCheck.endedAt,
            });
          } else {
            setHasPendingReflection(false);
            setPendingSessionInfo(null);
          }
        } catch (error) {
          console.error("Error checking pending reflection:", error);
        }
      };
      checkPendingReflection();
    }, [practiceAreaId])
  );

  const shouldShowCollapsible = previousIntent.length > 100 &&
    previousIntent !== "No previous sessions" &&
    previousIntent !== "No previous intent recorded" &&
    previousIntent !== "Error loading previous intent";

  const displayText = shouldShowCollapsible && !isExpanded
    ? previousIntent.substring(0, 100) + "..."
    : previousIntent;

  const handlePresetPress = (seconds: number) => {
    if (selectedDuration === seconds) {
      setSelectedDuration(null); // Deselect if already selected
    } else {
      setSelectedDuration(seconds);
    }
  };

  const handleUsePreviousIntent = () => {
    // Only use the actual previous intent text, not placeholder messages
    if (previousIntent &&
      previousIntent !== "No previous sessions" &&
      previousIntent !== "No previous intent recorded" &&
      previousIntent !== "Error loading previous intent") {
      setIntentText(previousIntent);
    }
  };

  const hasValidPreviousIntent = previousIntent &&
    previousIntent !== "No previous sessions" &&
    previousIntent !== "No previous intent recorded" &&
    previousIntent !== "Error loading previous intent";

  const handleStartSession = async () => {
    try {
      // Get last session ID for sequential linking
      const lastSessionId = await getLastSessionId(practiceAreaId);

      // Create new session object
      const newSession = {
        id: generateId(),
        practice_area_id: practiceAreaId,
        previous_session_id: lastSessionId, // NULL for first session
        intent: intentText.trim(),
        target_duration_seconds: selectedDuration,
        started_at: Date.now(),
        ended_at: null,
      };

      // Insert into database
      await createSession(newSession);

      // Update Zustand store
      startSession({ ...newSession, is_deleted: 0 }, selectedDuration);

      // Navigate to SessionActive screen
      navigation.navigate("SessionActive");
    } catch (error) {
      console.error("Error starting session:", error);
      Alert.alert("Error", "Failed to start session. Please try again.");
    }
  };

  const handleCompleteReflection = () => {
    // Navigate to SeriesTimeline with focusSessionId to let user complete reflection
    navigation.navigate("SeriesTimeline", {
      practiceAreaId,
      focusSessionId: pendingSessionInfo?.sessionId
    });
  };

  const handleDeleteSession = async () => {
    if (!pendingSessionInfo) return;

    try {
      const deleted = await deleteSession(pendingSessionInfo.sessionId);
      if (deleted) {
        setHasPendingReflection(false);
        setPendingSessionInfo(null);
        // Refresh the data to update the UI
        const pendingCheck = await checkLastSessionHasPendingReflection(practiceAreaId);
        if (pendingCheck?.hasPending) {
          setHasPendingReflection(true);
          setPendingSessionInfo({
            sessionId: pendingCheck.sessionId,
            endedAt: pendingCheck.endedAt,
          });
        }
      } else {
        // Show error: Cannot delete session with reflection
        Alert.alert(
          "Cannot Delete",
          "This session has a completed reflection and cannot be deleted."
        );
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      Alert.alert("Error", "Failed to delete session. Please try again.");
    }
  };

  const isStartDisabled = intentText.trim().length === 0 || hasPendingReflection;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <>
          {/* Previous Intent Card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Last time you planned to...</Text>
            <Text style={styles.cardText}>{displayText}</Text>
            {shouldShowCollapsible && (
              <TouchableOpacity
                onPress={() => setIsExpanded(!isExpanded)}
                style={styles.toggleButton}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleButtonText}>
                  {isExpanded ? "Show less" : "Show more"}
                </Text>
              </TouchableOpacity>
            )}
            {hasValidPreviousIntent && (
              <TouchableOpacity
                onPress={handleUsePreviousIntent}
                style={styles.useIntentButton}
                activeOpacity={0.7}
              >
                <Text style={styles.useIntentButtonText}>Use this intent</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Intent Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>What is your intent or micro-goal for today?</Text>
            <TextInput
              style={styles.intentInput}
              multiline
              placeholder="Enter your intent..."
              placeholderTextColor={COLORS.text.disabled}
              value={intentText}
              onChangeText={setIntentText}
              textAlignVertical="top"
            />
          </View>

          {/* Target Duration Section */}
          <View style={styles.durationSection}>
            <Text style={styles.inputLabel}>Practice duration (optional)</Text>
            <View style={styles.presetButtonsContainer}>
              {TARGET_DURATION_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.seconds}
                  style={[
                    styles.presetButton,
                    selectedDuration === preset.seconds && styles.presetButtonSelected,
                  ]}
                  onPress={() => handlePresetPress(preset.seconds)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      selectedDuration === preset.seconds && styles.presetButtonTextSelected,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helpText}>
              You'll get a notification when time is up, but can continue practicing.
            </Text>
          </View>

          {/* Pending Reflection Warning Card */}
          {hasPendingReflection && (
            <View style={styles.warningCard}>
              <Text style={styles.warningCardTitle}>Complete Reflection First</Text>
              <Text style={styles.warningCardText}>
                You need to complete the reflection for your last session before starting a new one.
              </Text>
              <View style={styles.warningCardActions}>
                <TouchableOpacity
                  style={styles.warningCardButtonPrimary}
                  onPress={handleCompleteReflection}
                  activeOpacity={0.7}
                >
                  <Text style={styles.warningCardButtonTextPrimary}>Complete Reflection</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.warningCardButtonSecondary}
                  onPress={handleDeleteSession}
                  activeOpacity={0.7}
                >
                  <Text style={styles.warningCardButtonTextSecondary}>Delete Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Start Session Button */}
          <TouchableOpacity
            style={[styles.startButton, isStartDisabled && styles.startButtonDisabled]}
            onPress={handleStartSession}
            disabled={isStartDisabled}
            activeOpacity={0.7}
          >
            <Text style={[styles.startButtonText, isStartDisabled && styles.startButtonTextDisabled]}>
              Start Session
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: COLORS.text.primary,
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.normal,
  },
  toggleButton: {
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
  },
  toggleButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.primary,
  },
  useIntentButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  useIntentButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  inputSection: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  intentInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  durationSection: {
    marginBottom: SPACING.lg,
  },
  presetButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  presetButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  presetButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  presetButtonTextSelected: {
    color: COLORS.text.inverse,
  },
  helpText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal,
    fontStyle: "italic",
  },
  startButton: {
    backgroundColor: COLORS.primary,
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
  },
  startButtonDisabled: {
    backgroundColor: COLORS.neutral[200],
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.inverse,
  },
  startButtonTextDisabled: {
    color: COLORS.text.disabled,
  },
  warningCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  warningCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  warningCardText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal,
  },
  warningCardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  warningCardButtonPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningCardButtonTextPrimary: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  warningCardButtonSecondary: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
  },
  warningCardButtonTextSecondary: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
  },
});

export default SessionSetupScreen;


