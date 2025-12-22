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
import type { ReflectionFormat } from "../utils/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

type ReflectionPromptsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReflectionPrompts"
>;

type ReflectionPromptsScreenRouteProp = RouteProp<
  RootStackParamList,
  "ReflectionPrompts"
>;

// Format-specific prompts matching tech spec
const PROMPTS: Record<ReflectionFormat, { step2: string; step3: string; step4: string }> = {
  1: {
    // Direct & Action-Oriented
    step2: "What actually happened?",
    step3: "What's the main lesson or pattern?",
    step4: "What will you try/do differently next time?",
  },
  2: {
    // Reflective & Exploratory
    step2: "What happened, and what stood out?",
    step3: "What insight, pattern, or assumption did you notice?",
    step4: "What will you experiment with next time?",
  },
  3: {
    // Minimalist / Rapid
    step2: "Key event",
    step3: "Main takeaway",
    step4: "Next micro-action",
  },
};

// AsyncStorage helper functions for draft persistence
const saveDraftToStorage = async (
  sessionId: string,
  draft: {
    format: ReflectionFormat | null;
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
    setReflectionFormat,
  } = useAppStore();

  const [practiceAreaName, setPracticeAreaName] = useState<string>("");
  const [sessionIntent, setSessionIntent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    if (isEditMode) return; // Skip format check in edit mode
    
    if (!reflectionDraft.format) {
    if (!reflectionDraft.format) {
      Alert.alert(
        "No Format Selected",
        "Please select a reflection format first.",
        [{ text: "OK", onPress: () => navigation.navigate("ReflectionFormat") }]
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
        }
        setSessionIntent(session.intent);

        // Load draft/reflection based on mode
        if (isEditMode) {
          // Edit mode: Priority 1 - AsyncStorage draft, Priority 2 - DB reflection
          const draft = await loadDraftFromStorage(sessionId);
          if (draft) {
            // Restore draft to store
            if (draft.format) setReflectionFormat(draft.format);
            if (draft.step2) updateReflectionDraft("step2", draft.step2);
            if (draft.step3) updateReflectionDraft("step3", draft.step3);
            if (draft.step4) updateReflectionDraft("step4", draft.step4);
          } else {
            // Load from DB
            const reflection = await getReflectionBySessionId(sessionId);
            if (reflection) {
              setReflectionFormat(reflection.format);
              updateReflectionDraft("step2", reflection.step2_answer || "");
              updateReflectionDraft("step3", reflection.step3_answer || "");
              updateReflectionDraft("step4", reflection.step4_answer || "");
            }
          }
        } else {
          // New reflection mode: Only restore if session matches AND has incomplete fields
          const draft = await loadDraftFromStorage(sessionId);
          if (draft && draft.sessionId === sessionId) {
            // Check if any fields are blank (crash recovery indicator)
            const hasIncompleteFields =
              !draft.step2?.trim() || !draft.step3?.trim() || !draft.step4?.trim();

            if (hasIncompleteFields) {
              // Restore draft - crash recovery
              if (draft.format) setReflectionFormat(draft.format);
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
  }, [lastEndedSessionId, reflectionDraft.format, navigation, isEditMode, route.params?.sessionId]);

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
          format: reflectionDraft.format,
          step2: reflectionDraft.step2,
          step3: reflectionDraft.step3,
          step4: reflectionDraft.step4,
        });
      }
    });
    return () => subscription.remove();
  }, [currentSessionId, reflectionDraft]);

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

  // Get current prompt text
  const getCurrentPrompt = (): string => {
    if (!reflectionDraft.format) return "";
    const field = getCurrentField();
    return PROMPTS[reflectionDraft.format][field];
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
        format: reflectionDraft.format,
        step2: reflectionDraft.step2,
        step3: reflectionDraft.step3,
        step4: reflectionDraft.step4,
      });
    }
  };

  // Navigation handlers
  const handleBack = () => {
    if (currentStepIndex === 0) {
      navigation.goBack(); // Go back to ReflectionFormatScreen
    } else {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < 2) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleComplete = () => {
    if (canComplete) {
      navigation.navigate("ReflectionFeedback");
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
          <Text style={styles.promptText}>{getCurrentPrompt()}</Text>
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
        </View>
      </ScrollView>

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
