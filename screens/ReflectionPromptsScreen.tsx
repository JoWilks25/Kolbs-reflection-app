import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  AppState,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { useAppStore } from "../stores/appStore";
import { getSessionById, getPracticeAreaById, getReflectionBySessionId } from "../db/queries";
import { COLORS, SPACING, TYPOGRAPHY, APP_CONSTANTS } from "../utils/constants";
import type { CoachingTone } from "../utils/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { useAICoaching } from "../hooks/useAICoaching";

type ReflectionPromptsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReflectionPrompts"
>;

type ReflectionPromptsScreenRouteProp = RouteProp<
  RootStackParamList,
  "ReflectionPrompts"
>;

// AsyncStorage helper functions for draft persistence
const saveDraftToStorage = async (
  sessionId: string,
  draft: {
    coachingTone: CoachingTone | null;
    step2: string;
    step3: string;
    step4: string;
  }
) => {
  try {
    await AsyncStorage.setItem(
      `reflection_draft_${sessionId}`,
      JSON.stringify({ ...draft, sessionId })
    );
  } catch (error) {
    console.error("Failed to save draft:", error);
    Toast.show({
      type: "error",
      text1: "Auto-save failed",
      text2: "Please try again.",
      position: "bottom",
      visibilityTime: 3000,
    });
  }
};

const loadDraftFromStorage = async (sessionId: string) => {
  try {
    const draftJson = await AsyncStorage.getItem(`reflection_draft_${sessionId}`);
    if (draftJson) {
      return JSON.parse(draftJson);
    }
    return null;
  } catch (error) {
    console.error("Failed to load draft:", error);
    return null;
  }
};

const clearDraftFromStorage = async (sessionId: string) => {
  try {
    await AsyncStorage.removeItem(`reflection_draft_${sessionId}`);
  } catch (error) {
    console.error("Failed to clear draft:", error);
  }
};

// Debounce helper
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const ReflectionPromptsScreen: React.FC = () => {
  const navigation = useNavigation<ReflectionPromptsScreenNavigationProp>();
  const route = useRoute<ReflectionPromptsScreenRouteProp>();
  const {
    lastEndedSessionId,
    reflectionDraft,
    updateReflectionDraft,
    setCoachingTone,
    setCurrentPracticeArea,
    setCurrentSession,
  } = useAppStore();

  const [practiceAreaName, setPracticeAreaName] = useState<string>("");
  const [sessionIntent, setSessionIntent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [draftFields, setDraftFields] = useState<Set<string>>(new Set());
  const [followupShownAtLength, setFollowupShownAtLength] = useState(0);

  const inputRef = useRef<TextInput>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current step (2, 3, or 4) from index
  const currentStep: 2 | 3 | 4 = (currentStepIndex + 2) as 2 | 3 | 4;

  // Use AI coaching hook for dynamic questions
  const {
    stepQuestion,
    followup,
    isLoadingQuestion,
    checkForFollowup,
    markFollowupAnswered,
    aiActive,
  } = useAICoaching(currentStep);

  // Determine if we're in edit mode
  const isEditMode = route.params?.editMode || false;

  // Debounced save function
  const debouncedSave = useMemo(
    () =>
      debounce((sessionId: string, draft: any) => {
        saveDraftToStorage(sessionId, draft);
      }, 500),
    []
  );

  // Guard: Redirect if no format selected (skip in edit mode, we'll load it)
  useEffect(() => {
    if (isEditMode) {
      return; // Skip format check in edit mode
    }

    if (!reflectionDraft.coachingTone) {
      Alert.alert(
        "No Coaching Tone Selected",
        "Please select a coaching tone first.",
        [{ text: "OK", onPress: () => navigation.navigate("ReflectionTone") }]
      );
      return;
    }

    // Guard: Redirect if no session context (skip in edit mode with explicit sessionId)
    const sessionId = route.params?.sessionId || lastEndedSessionId;
    if (!sessionId) {
      Alert.alert(
        "No Session Found",
        "Please complete a session before reflecting.",
        [{ text: "OK", onPress: () => navigation.navigate("Home") }]
      );
      return;
    }

    // Load session context and draft
    const loadSessionData = async () => {
      try {
        const session = await getSessionById(sessionId);
        if (!session) {
          Alert.alert("Error", "Session not found.", [
            { text: "OK", onPress: () => navigation.navigate("Home") },
          ]);
          return;
        }

        setCurrentSessionId(sessionId);

        const practiceArea = await getPracticeAreaById(session.practice_area_id);
        if (practiceArea) {
          setPracticeAreaName(practiceArea.name);
          // Set in store for AI hook to access
          // Convert PracticeArea to PracticeAreaWithStats (with minimal stats)
          setCurrentPracticeArea({
            ...practiceArea,
            sessionCount: 0,
            lastSessionDate: null,
            pendingReflectionsCount: 0,
            overdueReflectionsCount: 0,
            oldestPendingReflectionDate: null,
          });
        }
        setSessionIntent(session.intent);

        // Set session in store for AI hook to access (even though it's ended)
        setCurrentSession(session);

        // Load draft/reflection based on mode
        if (isEditMode) {
          // Edit mode: Priority 1 - Check DB reflection first
          const reflection = await getReflectionBySessionId(sessionId);
          const draft = await loadDraftFromStorage(sessionId);

          if (reflection) {
            // DB reflection exists - check if all fields are filled
            const dbStep2 = reflection.step2_answer?.trim() || "";
            const dbStep3 = reflection.step3_answer?.trim() || "";
            const dbStep4 = reflection.step4_answer?.trim() || "";
            const allFieldsFilled = dbStep2 && dbStep3 && dbStep4;

            if (allFieldsFilled) {
              // All fields filled in DB - use DB only (ignore draft)
              setCoachingTone(reflection.coaching_tone);
              updateReflectionDraft("step2", dbStep2);
              updateReflectionDraft("step3", dbStep3);
              updateReflectionDraft("step4", dbStep4);
              setDraftFields(new Set()); // No draft fields used
            } else {
              // Some fields empty - use DB for filled, draft for empty
              setCoachingTone(reflection.coaching_tone);

              // Track which fields came from draft
              const draftFieldsSet: Set<string> = new Set();

              const step2Value = dbStep2 || draft?.step2 || "";
              const step3Value = dbStep3 || draft?.step3 || "";
              const step4Value = dbStep4 || draft?.step4 || "";

              updateReflectionDraft("step2", step2Value);
              if (!dbStep2 && draft?.step2) draftFieldsSet.add("step2");

              updateReflectionDraft("step3", step3Value);
              if (!dbStep3 && draft?.step3) draftFieldsSet.add("step3");

              updateReflectionDraft("step4", step4Value);
              if (!dbStep4 && draft?.step4) draftFieldsSet.add("step4");

              // Store draft fields for indicator display
              setDraftFields(draftFieldsSet);
            }
          } else if (draft) {
            // No DB reflection - use draft for text content only
            // Note: Don't restore coachingTone from draft - user's current selection takes precedence
            if (draft.step2) updateReflectionDraft("step2", draft.step2);
            if (draft.step3) updateReflectionDraft("step3", draft.step3);
            if (draft.step4) updateReflectionDraft("step4", draft.step4);

            // All fields from draft
            setDraftFields(new Set(["step2", "step3", "step4"]));
          }
        } else {
          // New reflection mode: Only restore if session matches AND has incomplete fields
          const draft = await loadDraftFromStorage(sessionId);
          if (draft && draft.sessionId === sessionId) {
            // Check if any fields are blank (crash recovery indicator)
            const hasIncompleteFields =
              !draft.step2?.trim() || !draft.step3?.trim() || !draft.step4?.trim();

            if (hasIncompleteFields) {
              // Restore draft text content only - crash recovery
              // Note: Don't restore coachingTone from draft - user's current selection takes precedence
              if (draft.step2) updateReflectionDraft("step2", draft.step2);
              if (draft.step3) updateReflectionDraft("step3", draft.step3);
              if (draft.step4) updateReflectionDraft("step4", draft.step4);
            } else {
              // All fields complete but not saved - clear stale draft
              clearDraftFromStorage(sessionId);
            }
          }
        }
      } catch (error) {
        console.error("Error loading session data:", error);
        Alert.alert("Error", "Failed to load session data.", [
          { text: "OK", onPress: () => navigation.navigate("Home") },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSessionData();
  }, [lastEndedSessionId, reflectionDraft.coachingTone, navigation, isEditMode, route.params?.sessionId]);

  // Separate useEffect for edit mode to handle loading
  useEffect(() => {
    if (!isEditMode) return;

    const sessionId = route.params?.sessionId;
    if (!sessionId) {
      Alert.alert("Error", "No session ID provided for editing.", [
        { text: "OK", onPress: () => navigation.navigate("Home") },
      ]);
      setIsLoading(false);
      return;
    }

    const loadEditModeData = async () => {
      try {
        const session = await getSessionById(sessionId);
        if (!session) {
          Alert.alert("Error", "Session not found.", [
            { text: "OK", onPress: () => navigation.navigate("Home") },
          ]);
          return;
        }

        setCurrentSessionId(sessionId);

        const practiceArea = await getPracticeAreaById(session.practice_area_id);
        if (practiceArea) {
          setPracticeAreaName(practiceArea.name);
          // Set in store for AI hook to access
          // Convert PracticeArea to PracticeAreaWithStats (with minimal stats)
          setCurrentPracticeArea({
            ...practiceArea,
            sessionCount: 0,
            lastSessionDate: null,
            pendingReflectionsCount: 0,
            overdueReflectionsCount: 0,
            oldestPendingReflectionDate: null,
          });
        }
        setSessionIntent(session.intent);

        // Set session in store for AI hook to access (even though it's ended)
        setCurrentSession(session);

        // Edit mode: Priority 1 - Check DB reflection first
        const reflection = await getReflectionBySessionId(sessionId);
        const draft = await loadDraftFromStorage(sessionId);

        if (reflection) {
          // DB reflection exists - check if all fields are filled
          const dbStep2 = reflection.step2_answer?.trim() || "";
          const dbStep3 = reflection.step3_answer?.trim() || "";
          const dbStep4 = reflection.step4_answer?.trim() || "";
          const allFieldsFilled = dbStep2 && dbStep3 && dbStep4;

          if (allFieldsFilled) {
            // All fields filled in DB - use DB only (ignore draft)
            setCoachingTone(reflection.coaching_tone);
            updateReflectionDraft("step2", dbStep2);
            updateReflectionDraft("step3", dbStep3);
            updateReflectionDraft("step4", dbStep4);
            setDraftFields(new Set()); // No draft fields used
          } else {
            // Some fields empty - use DB for filled, draft for empty
            setCoachingTone(reflection.coaching_tone);

            // Track which fields came from draft
            const draftFieldsSet: Set<string> = new Set();

            const step2Value = dbStep2 || draft?.step2 || "";
            const step3Value = dbStep3 || draft?.step3 || "";
            const step4Value = dbStep4 || draft?.step4 || "";

            updateReflectionDraft("step2", step2Value);
            if (!dbStep2 && draft?.step2) draftFieldsSet.add("step2");

            updateReflectionDraft("step3", step3Value);
            if (!dbStep3 && draft?.step3) draftFieldsSet.add("step3");

            updateReflectionDraft("step4", step4Value);
            if (!dbStep4 && draft?.step4) draftFieldsSet.add("step4");

            // Store draft fields for indicator display
            setDraftFields(draftFieldsSet);
          }
        } else if (draft) {
          // No DB reflection - use draft for text content only
          // Note: Don't restore coachingTone from draft - user's current selection takes precedence
          if (draft.step2) updateReflectionDraft("step2", draft.step2);
          if (draft.step3) updateReflectionDraft("step3", draft.step3);
          if (draft.step4) updateReflectionDraft("step4", draft.step4);

          // All fields from draft
          setDraftFields(new Set(["step2", "step3", "step4"]));
        }
      } catch (error) {
        console.error("Error loading session data:", error);
        Alert.alert("Error", "Failed to load session data.", [
          { text: "OK", onPress: () => navigation.navigate("Home") },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadEditModeData();
  }, [isEditMode, route.params?.sessionId, navigation]);

  // Auto-focus input when step changes
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStepIndex]);

  // Autosave on app background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" && currentSessionId) {
        saveDraftToStorage(currentSessionId, {
          coachingTone: reflectionDraft.coachingTone,
          step2: reflectionDraft.step2,
          step3: reflectionDraft.step3,
          step4: reflectionDraft.step4,
        });
      }
    });
    return () => subscription.remove();
  }, [currentSessionId, reflectionDraft]);

  // Clear follow-up tracking when step changes
  useEffect(() => {
    setFollowupShownAtLength(0);
  }, [currentStepIndex]);

  // Get current step field name
  const getCurrentField = (): "step2" | "step3" | "step4" => {
    const fields: Array<"step2" | "step3" | "step4"> = ["step2", "step3", "step4"];
    return fields[currentStepIndex];
  };

  // Get current step value
  const getCurrentValue = (): string => {
    const field = getCurrentField();
    return reflectionDraft[field];
  };


  // Handle text change with character limit
  const handleTextChange = (text: string) => {
    const field = getCurrentField();

    if (text.length <= APP_CONSTANTS.MAX_REFLECTION_CHARS) {
      updateReflectionDraft(field, text);
    } else {
      // Show warning toast when limit reached
      Toast.show({
        type: "warning",
        text1: "Maximum 3000 characters reached",
        position: "bottom",
        visibilityTime: 2000,
      });
    }
  };

  // Handle blur - trigger debounced save
  const handleBlur = () => {
    if (currentSessionId) {
      debouncedSave(currentSessionId, {
        coachingTone: reflectionDraft.coachingTone,
        step2: reflectionDraft.step2,
        step3: reflectionDraft.step3,
        step4: reflectionDraft.step4,
      });
    }
  };

  // Navigation handlers
  const handleBack = () => {
    if (currentStepIndex === 0) {
      navigation.goBack(); // Go back to ReflectionToneScreen
    } else {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNext = async () => {
    const currentValue = getCurrentValue();

    // If follow-up is already showing (second Next press)
    if (followup) {
      // Track if user increased answer length
      const lengthIncreased = currentValue.length > followupShownAtLength + 20;
      if (lengthIncreased) {
        markFollowupAnswered();
      }
      // Advance regardless (user chose to move on)
      if (currentStepIndex < 2) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
      return;
    }

    // First Next press - check if answer is brief
    if (currentValue.length < 150 && currentValue.length > 0 && aiActive) {
      // Generate follow-up and stay on current step
      await checkForFollowup(currentValue);
      // Track initial answer length for comparison
      setFollowupShownAtLength(currentValue.length);
      return;
    }

    // Answer is long enough or AI not active - advance
    if (currentStepIndex < 2) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleComplete = () => {
    if (canComplete) {
      navigation.navigate("ReflectionFeedback", { sessionId: currentSessionId || undefined });
    }
  };

  // Validation: All fields must be non-empty
  const canComplete =
    reflectionDraft.step2.trim().length > 0 &&
    reflectionDraft.step3.trim().length > 0 &&
    reflectionDraft.step4.trim().length > 0;

  // Character count for current field
  const currentLength = getCurrentValue().length;
  const showCharCounter = currentLength >= 2500;
  const maxChars = APP_CONSTANTS.MAX_REFLECTION_CHARS;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Session Context Header */}
        <View style={styles.contextCard}>
          <Text style={styles.contextLabel}>Practice Area</Text>
          <Text style={styles.contextValue}>{practiceAreaName}</Text>

          <Text style={[styles.contextLabel, styles.contextLabelSpaced]}>Session Intent</Text>
          <Text style={styles.contextValue}>{sessionIntent}</Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>Step {currentStepIndex + 1} of 3</Text>
          <View style={styles.progressBarContainer}>
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={[
                  styles.progressBarSegment,
                  index <= currentStepIndex && styles.progressBarSegmentActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Prompt Text */}
        <View style={styles.promptSection}>
          {isLoadingQuestion ? (
            <View style={styles.loadingQuestionContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingQuestionText}>Preparing your question...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.promptText}>{stepQuestion || ""}</Text>
              {aiActive && stepQuestion && (
                <View style={styles.aiIndicator}>
                  <Text style={styles.aiIndicatorText}>✨ AI-tailored question</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Text Input */}
        <View style={styles.inputSection}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={getCurrentValue()}
            onChangeText={handleTextChange}
            onBlur={handleBlur}
            placeholder="Type or use voice input..."
            placeholderTextColor={COLORS.text.disabled}
            multiline
            maxLength={maxChars}
            autoCapitalize="sentences"
            autoCorrect={true}
            textAlignVertical="top"
          />
          {showCharCounter && (
            <Text
              style={[
                styles.charCounter,
                currentLength >= 2800 && styles.charCounterWarning,
              ]}
            >
              {currentLength} / {maxChars}
            </Text>
          )}
          {draftFields.has(getCurrentField()) && (
            <View style={styles.draftIndicator}>
              <Text style={styles.draftIndicatorText}>
                ⚠️ Loaded from draft (app may have crashed at this step)
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Follow-up card - appears above navigation buttons */}
      {aiActive && followup && (
        <View style={styles.followupContainer}>
          <Text style={styles.followupLabel}>To go deeper:</Text>
          <Text style={styles.followupQuestion}>{followup}</Text>
        </View>
      )}

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonTextSecondary}>Back</Text>
        </TouchableOpacity>

        {currentStepIndex < 2 ? (
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonTextPrimary}>Next</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.completeButtonWrapper}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonPrimary,
                !canComplete && styles.buttonDisabled,
              ]}
              onPress={handleComplete}
              activeOpacity={0.7}
              disabled={!canComplete}
            >
              <Text
                style={[
                  styles.buttonTextPrimary,
                  !canComplete && styles.buttonTextDisabled,
                ]}
              >
                {isEditMode ? "Save" : "Complete"}
              </Text>
            </TouchableOpacity>
            {!canComplete && (
              <Text style={styles.helperText}>All fields must be filled to complete</Text>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  contextCard: {
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
  contextLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  contextLabelSpaced: {
    marginTop: SPACING.md,
  },
  contextValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: COLORS.text.primary,
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.normal,
  },
  progressSection: {
    marginBottom: SPACING.lg,
  },
  progressText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  progressBarContainer: {
    flexDirection: "row",
    gap: SPACING.xs,
    justifyContent: "center",
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.neutral[200],
    borderRadius: 2,
  },
  progressBarSegmentActive: {
    backgroundColor: COLORS.primary,
  },
  promptSection: {
    marginBottom: SPACING.md,
  },
  promptText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    lineHeight: TYPOGRAPHY.fontSize.lg * TYPOGRAPHY.lineHeight.normal,
  },
  loadingQuestionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  loadingQuestionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  aiIndicator: {
    marginTop: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  aiIndicatorText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    fontStyle: "italic",
  },
  followupContainer: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.warning + "15",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.warning,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  followupLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  followupQuestion: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.relaxed,
  },
  inputSection: {
    marginBottom: SPACING.md,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    minHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.relaxed,
  },
  charCounter: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    textAlign: "right",
    marginTop: SPACING.xs,
  },
  charCounterWarning: {
    color: COLORS.warning,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  draftIndicator: {
    backgroundColor: "rgba(255, 152, 0, 0.1)", // Warning color with 10% opacity
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  draftIndicatorText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.warning,
    fontStyle: "italic",
  },
  buttonContainer: {
    flexDirection: "row",
    padding: SPACING.md,
    paddingBottom: Platform.OS === "ios" ? SPACING.lg : SPACING.md,
    gap: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[200],
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
  },
  buttonDisabled: {
    backgroundColor: COLORS.neutral[200],
  },
  buttonTextPrimary: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  buttonTextSecondary: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  buttonTextDisabled: {
    color: COLORS.text.disabled,
  },
  completeButtonWrapper: {
    flex: 1,
  },
  helperText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
});

export default ReflectionPromptsScreen;
