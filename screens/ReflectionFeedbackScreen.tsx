import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { useAppStore } from "../stores/appStore";
import {
  getReflectionBySessionId,
  insertReflection,
  updateReflection,
  getSessionById,
} from "../db/queries";
import { generateId } from "../utils/uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";
import type { FeedbackRating } from "../utils/types";

type ReflectionFeedbackScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReflectionFeedback"
>;

type ReflectionFeedbackScreenRouteProp = RouteProp<
  RootStackParamList,
  "ReflectionFeedback"
>;

interface EmojiOption {
  rating: FeedbackRating;
  emoji: string;
  label: string;
}

const EMOJI_OPTIONS: EmojiOption[] = [
  { rating: 0, emoji: "😕", label: "Confusing / Unclear" },
  { rating: 1, emoji: "😞", label: "Hard / Frustrating" },
  { rating: 2, emoji: "😐", label: "Neutral / Meh" },
  { rating: 3, emoji: "🙂", label: "Good / Helpful" },
  { rating: 4, emoji: "🚀", label: "Great / Energizing" },
];

const ReflectionFeedbackScreen: React.FC = () => {
  const navigation = useNavigation<ReflectionFeedbackScreenNavigationProp>();
  const route = useRoute<ReflectionFeedbackScreenRouteProp>();

  const {
    lastEndedSessionId,
    reflectionDraft,
    updateReflectionDraft,
    clearReflectionDraft,
    clearLastEndedSession,
  } = useAppStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleRatingPress = (rating: FeedbackRating) => {
    updateReflectionDraft("feedbackRating", rating);
  };

  const handleNoteChange = (text: string) => {
    updateReflectionDraft("feedbackNote", text);
  };

  const handleFinish = async () => {
    try {
      setIsSaving(true);

      // 1. Determine session ID and mode
      const sessionId = lastEndedSessionId || route.params?.sessionId;

      if (!sessionId) {
        Alert.alert(
          "No Session Found",
          "Unable to save reflection. Please try again.",
          [{ text: "OK", onPress: () => navigation.navigate("Home") }]
        );
        return;
      }

      const existingReflection = await getReflectionBySessionId(sessionId);

      // 2. Build reflection payload from draft
      const payload = {
        id: existingReflection?.id || generateId(),
        session_id: sessionId,
        coaching_tone: reflectionDraft.coachingTone!,
        ai_assisted: reflectionDraft.aiAssisted ? 1 : 0,
        step2_answer: reflectionDraft.step2,
        step3_answer: reflectionDraft.step3,
        step4_answer: reflectionDraft.step4,
        ai_placeholders_shown: reflectionDraft.aiPlaceholdersShown,
        ai_followups_shown: reflectionDraft.aiFollowupsShown,
        ai_followups_answered: reflectionDraft.aiFollowupsAnswered,
        feedback_rating: reflectionDraft.feedbackRating,
        feedback_note: reflectionDraft.feedbackNote || null,
      };

      // 3. INSERT or UPDATE
      if (existingReflection) {
        await updateReflection(sessionId, {
          coaching_tone: payload.coaching_tone,
          ai_assisted: payload.ai_assisted,
          step2_answer: payload.step2_answer,
          step3_answer: payload.step3_answer,
          step4_answer: payload.step4_answer,
          ai_placeholders_shown: payload.ai_placeholders_shown,
          ai_followups_shown: payload.ai_followups_shown,
          ai_followups_answered: payload.ai_followups_answered,
          feedback_rating: payload.feedback_rating,
          feedback_note: payload.feedback_note,
          updated_at: Date.now(),
        });

        Toast.show({
          type: "success",
          text1: "Reflection Updated",
          text2: "Your changes have been saved.",
          position: "bottom",
          visibilityTime: 2000,
        });
      } else {
        await insertReflection({
          ...payload,
          completed_at: Date.now(),
          updated_at: null,
        });

        Toast.show({
          type: "success",
          text1: "Reflection Saved",
          text2: "Great work on completing your reflection!",
          position: "bottom",
          visibilityTime: 2000,
        });
      }

      // 4. Clean up AsyncStorage draft
      await AsyncStorage.removeItem(`reflection_draft_${sessionId}`);

      // 5. Clear Zustand state
      clearReflectionDraft();
      clearLastEndedSession();

      // 6. Navigate directly to Home (reset stack to avoid multiple screens)
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error("Error saving reflection:", error);
      Toast.show({
        type: "error",
        text1: "Failed to save reflection",
        text2: "Please try again.",
        position: "bottom",
        visibilityTime: 3000,
      });
      // Do NOT clear draft from AsyncStorage on error
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRating = reflectionDraft.feedbackRating;
  const feedbackNote = reflectionDraft.feedbackNote;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header Question */}
        <View style={styles.questionSection}>
          <Text style={styles.questionText}>How did this reflection feel?</Text>
        </View>

        {/* Emoji Rating Buttons */}
        <View style={styles.emojiGrid}>
          {EMOJI_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.rating}
              style={[
                styles.emojiButton,
                selectedRating === option.rating && styles.emojiButtonSelected,
              ]}
              onPress={() => handleRatingPress(option.rating)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{option.emoji}</Text>
              <Text
                style={[
                  styles.emojiLabel,
                  selectedRating === option.rating && styles.emojiLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Optional Feedback Note */}
        <View style={styles.noteSection}>
          <TouchableOpacity
            style={styles.noteHeader}
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.noteHeaderText}>
              What made this reflection feel this way? (optional)
            </Text>
            <Text style={styles.expandIcon}>{isExpanded ? "▼" : "▶"}</Text>
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.noteInputContainer}>
              <TextInput
                style={styles.noteInput}
                value={feedbackNote}
                onChangeText={handleNoteChange}
                placeholder="Share your thoughts here..."
                placeholderTextColor={COLORS.text.disabled}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.charCounter}>
                {feedbackNote.length} / 500
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Finish Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.finishButton, isSaving && styles.finishButtonDisabled]}
          onPress={handleFinish}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.text.inverse} />
          ) : (
            <Text style={styles.finishButtonText}>Finish</Text>
          )}
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
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  questionSection: {
    marginBottom: SPACING.xl,
  },
  questionText: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    textAlign: "center",
  },
  emojiGrid: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  emojiButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  emojiButtonSelected: {
    backgroundColor: COLORS.primary + "20",
    borderColor: COLORS.primary,
  },
  emoji: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  emojiLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    flex: 1,
  },
  emojiLabelSelected: {
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  noteSection: {
    marginTop: SPACING.md,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  noteHeaderText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    flex: 1,
  },
  expandIcon: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginLeft: SPACING.sm,
  },
  noteInputContainer: {
    marginTop: SPACING.md,
  },
  noteInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  charCounter: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.disabled,
    textAlign: "right",
    marginTop: SPACING.xs,
  },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[200],
  },
  finishButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  finishButtonDisabled: {
    opacity: 0.6,
  },
  finishButtonText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
});

export default ReflectionFeedbackScreen;


