import React, { useEffect, useState, useRef } from "react";
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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { useAppStore } from "../stores/appStore";
import { getSessionById, getPracticeAreaById } from "../db/queries";
import { COLORS, SPACING, TYPOGRAPHY, APP_CONSTANTS } from "../utils/constants";
import type { ReflectionFormat } from "../utils/types";

type ReflectionPromptsScreenNavigationProp = StackNavigationProp<
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

const ReflectionPromptsScreen: React.FC = () => {
  const navigation = useNavigation<ReflectionPromptsScreenNavigationProp>();
  const { lastEndedSessionId, reflectionDraft, updateReflectionDraft } = useAppStore();

  const [practiceAreaName, setPracticeAreaName] = useState<string>("");
  const [sessionIntent, setSessionIntent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const inputRef = useRef<TextInput>(null);

  // Guard: Redirect if no format selected
  useEffect(() => {
    if (!reflectionDraft.format) {
      Alert.alert(
        "No Format Selected",
        "Please select a reflection format first.",
        [{ text: "OK", onPress: () => navigation.navigate("ReflectionFormat") }]
      );
      return;
    }

    // Guard: Redirect if no session context
    if (!lastEndedSessionId) {
      Alert.alert(
        "No Session Found",
        "Please complete a session before reflecting.",
        [{ text: "OK", onPress: () => navigation.navigate("Home") }]
      );
      return;
    }

    // Load session context
    const loadSessionData = async () => {
      try {
        const session = await getSessionById(lastEndedSessionId);
        if (!session) {
          Alert.alert("Error", "Session not found.", [
            { text: "OK", onPress: () => navigation.navigate("Home") },
          ]);
          return;
        }

        const practiceArea = await getPracticeAreaById(session.practice_area_id);
        if (practiceArea) {
          setPracticeAreaName(practiceArea.name);
        }
        setSessionIntent(session.intent);
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
  }, [lastEndedSessionId, reflectionDraft.format, navigation]);

  // Auto-focus input when step changes
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
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

  // Get current prompt text
  const getCurrentPrompt = (): string => {
    if (!reflectionDraft.format) return "";
    const field = getCurrentField();
    return PROMPTS[reflectionDraft.format][field];
  };

  // Handle text change
  const handleTextChange = (text: string) => {
    const field = getCurrentField();
    updateReflectionDraft(field, text);
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
            placeholder="Type or use voice input..."
            placeholderTextColor={COLORS.text.disabled}
            multiline
            maxLength={maxChars}
            autoCapitalize="sentences"
            autoCorrect={true}
            textAlignVertical="top"
          />
          {showCharCounter && (
            <Text style={styles.charCounter}>
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
                Complete
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
