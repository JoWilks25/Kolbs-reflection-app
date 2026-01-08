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
import { RouteProp, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { COLORS, SPACING, TYPOGRAPHY, TARGET_DURATION_PRESETS } from "../utils/constants";
import { getPreviousSessionIntent, getPracticeAreaById, getLastSessionId, createSession, getBlockingUnreflectedSession } from "../db/queries";
import { useAppStore } from "../stores/appStore";
import { generateId } from "../utils/uuid";
import { analyzeIntent } from "../services/aiService";
import type { PracticeAreaType } from "../utils/types";

type SessionSetupScreenRouteProp = RouteProp<RootStackParamList, "SessionSetup">;
type SessionSetupScreenNavigationProp = StackNavigationProp<RootStackParamList, "SessionSetup">;

type Props = {
  route: SessionSetupScreenRouteProp;
};

const SessionSetupScreen: React.FC<Props> = ({ route }) => {
  const { practiceAreaId } = route.params;
  const navigation = useNavigation<SessionSetupScreenNavigationProp>();
  const { startSession, aiAvailable } = useAppStore();

  const [previousIntent, setPreviousIntent] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [practiceAreaName, setPracticeAreaName] = useState<string>("");
  const [practiceAreaType, setPracticeAreaType] = useState<PracticeAreaType>("solo_skill");
  const [previousStep4Answer, setPreviousStep4Answer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // New session input state
  const [intentText, setIntentText] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  // Intent analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    isSpecific: boolean;
    clarifyingQuestions: string[] | null;
    feedback: string | null;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load Practice Area name and type
        const practiceArea = await getPracticeAreaById(practiceAreaId);
        if (practiceArea) {
          setPracticeAreaName(practiceArea.name);
          setPracticeAreaType(practiceArea.type);
          // Update header title
          navigation.setOptions({ title: practiceArea.name });
        }

        // Load previous session intent
        const result = await getPreviousSessionIntent(practiceAreaId) as any;
        if (!result) {
          setPreviousIntent("No previous sessions");
          setPreviousStep4Answer(null);
        } else if (!result.previous_next_action) {
          setPreviousIntent("No previous intent recorded");
          setPreviousStep4Answer(null);
        } else {
          setPreviousIntent(result.previous_next_action);
          setPreviousStep4Answer(result.previous_next_action);
        }
      } catch (error) {
        console.error("Error loading session setup data:", error);
        setPreviousIntent("Error loading previous intent");
        setPreviousStep4Answer(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [practiceAreaId, navigation]);

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

  // Handle manual analysis trigger
  const handleImproveIntent = async () => {
    if (!aiAvailable || intentText.trim().length < 5) {
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null); // Clear previous analysis

    try {
      const result = await analyzeIntent(
        intentText,
        practiceAreaName,
        practiceAreaType,
        previousStep4Answer
      );

      setAnalysis(result);
    } catch (error) {
      console.error("Error analyzing intent:", error);
      setAnalysis({
        isSpecific: false,
        clarifyingQuestions: null,
        feedback: "Analysis unavailable - please try again",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Dismiss analysis
  const handleDismissSuggestion = () => {
    setAnalysis(null);
  };

  const handleStartSession = async () => {
    try {
      // Defensive re-check to prevent race conditions
      const blockingSession = await getBlockingUnreflectedSession(practiceAreaId);
      if (blockingSession) {
        Alert.alert(
          'Reflection Pending',
          'You have a pending reflection for your last session. Please complete it or delete the session before starting a new one.'
        );
        return;
      }

      // Get last session ID for sequential linking
      const lastSessionId = await getLastSessionId(practiceAreaId);

      // Track if intent analysis was requested (clarifying questions don't provide direct suggestions)
      const intentRefined = 0; // No longer tracking refinement since we use clarifying questions
      const intentAnalysisRequested = analysis !== null || isAnalyzing;

      // Create new session object
      const newSession = {
        id: generateId(),
        practice_area_id: practiceAreaId,
        previous_session_id: lastSessionId, // NULL for first session
        intent: intentText.trim(),
        intent_refined: intentRefined ? 1 : 0,
        original_intent: intentRefined ? originalIntentBeforeRefinement : null,
        intent_analysis_requested: intentAnalysisRequested ? 1 : 0,
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

  const isStartDisabled = intentText.trim().length === 0;

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
              onChangeText={(text) => {
                setIntentText(text);
                // Clear analysis when user edits
                if (analysis) setAnalysis(null);
              }}
              textAlignVertical="top"
            />

            {/* Improve Intent button - only show if AI available */}
            {aiAvailable && (
              <TouchableOpacity
                style={[
                  styles.improveButton,
                  (intentText.trim().length < 5 || isAnalyzing) && styles.improveButtonDisabled
                ]}
                onPress={handleImproveIntent}
                disabled={intentText.trim().length < 5 || isAnalyzing}
                activeOpacity={0.7}
              >
                {isAnalyzing ? (
                  <>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.improveButtonText}>Analyzing...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.improveButtonIcon}>✨</Text>
                    <Text style={styles.improveButtonText}>Improve Intent</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Help text */}
            {aiAvailable && !analysis && !isAnalyzing && (
              <Text style={styles.helpText}>
                Optional: Get AI help to make your intent more specific
              </Text>
            )}
          </View>

          {/* Analysis Results */}
          {analysis && (
            <View style={styles.analysisContainer}>
              {analysis.isSpecific ? (
                // Positive feedback - intent is already good
                <View style={styles.positiveContainer}>
                  <Text style={styles.positiveIcon}>✓</Text>
                  <View style={styles.positiveContent}>
                    <Text style={styles.positiveTitle}>Your intent is clear and specific!</Text>
                    {analysis.feedback && (
                      <Text style={styles.positiveReasoning}>{analysis.feedback}</Text>
                    )}
                  </View>
                </View>
              ) : (
                // Clarifying questions - intent needs improvement
                <View style={styles.suggestionContainer}>
                  <View style={styles.suggestionHeader}>
                    <Text style={styles.suggestionIcon}>💡</Text>
                    <Text style={styles.suggestionTitle}>Help refine your intent</Text>
                  </View>

                  {analysis.clarifyingQuestions && analysis.clarifyingQuestions.length > 0 ? (
                    <>
                      {analysis.feedback && (
                        <Text style={styles.suggestionReasoning}>
                          {analysis.feedback}
                        </Text>
                      )}

                      <View style={styles.questionsList}>
                        {analysis.clarifyingQuestions.map((question, index) => (
                          <View key={index} style={styles.questionItem}>
                            <Text style={styles.questionBullet}>•</Text>
                            <Text style={styles.questionText}>{question}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.suggestionButtons}>
                        <TouchableOpacity
                          style={styles.suggestionButtonSecondary}
                          onPress={handleDismissSuggestion}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.suggestionButtonSecondaryText}>Keep Mine</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.suggestionButtonSecondary}
                          onPress={handleImproveIntent}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.suggestionButtonSecondaryText}>Improve Again</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    // Error state
                    <Text style={styles.errorText}>{analysis.feedback}</Text>
                  )}
                </View>
              )}
            </View>
          )}

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
  improveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F7FF",
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  improveButtonDisabled: {
    opacity: 0.5,
  },
  improveButtonIcon: {
    fontSize: 16,
  },
  improveButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  analysisContainer: {
    marginBottom: SPACING.md,
  },
  // Positive feedback styles
  positiveContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F1F8F4",
    borderRadius: 8,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.success,
    gap: SPACING.sm,
  },
  positiveIcon: {
    fontSize: 24,
    color: COLORS.success,
  },
  positiveContent: {
    flex: 1,
  },
  positiveTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: "#2E7D32",
    marginBottom: SPACING.xs,
  },
  positiveReasoning: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal,
  },
  // Suggestion styles
  suggestionContainer: {
    backgroundColor: "#FFF9E6",
    borderRadius: 8,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  suggestionIcon: {
    fontSize: 20,
  },
  suggestionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  suggestionText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.normal,
    marginBottom: SPACING.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  suggestionReasoning: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontStyle: "italic",
    marginBottom: SPACING.md,
  },
  questionsList: {
    marginBottom: SPACING.md,
  },
  questionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },
  questionBullet: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    marginRight: SPACING.xs,
    marginTop: 2,
  },
  questionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.primary,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal,
  },
  suggestionButtons: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  suggestionButtonPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 6,
    alignItems: "center",
  },
  suggestionButtonPrimaryText: {
    color: COLORS.text.inverse,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  suggestionButtonSecondary: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  suggestionButtonSecondaryText: {
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.error,
    fontStyle: "italic",
  },
});

export default SessionSetupScreen;


