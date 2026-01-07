import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { useAppStore } from "../stores/appStore";
import { getSessionById, getPracticeAreaById } from "../db/queries";
import { COLORS, SPACING, TYPOGRAPHY, COACHING_TONE_CARDS } from "../utils/constants";
import type { CoachingTone } from "../utils/types";

type ReflectionToneScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReflectionTone"
>;

const ReflectionToneScreen: React.FC = () => {
  const navigation = useNavigation<ReflectionToneScreenNavigationProp>();
  const { lastEndedSessionId, setCoachingTone, aiAvailable, aiEnabled, setAiEnabled } = useAppStore();

  const [practiceAreaName, setPracticeAreaName] = useState<string>("");
  const [sessionIntent, setSessionIntent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTone, setSelectedTone] = useState<CoachingTone | null>(null);
  const [localAiEnabled, setLocalAiEnabled] = useState(true);

  useEffect(() => {
    // Validate session context exists
    if (!lastEndedSessionId) {
      Alert.alert(
        "No Session Found",
        "Please complete a session before reflecting.",
        [{ text: "OK", onPress: () => navigation.navigate("Home") }]
      );
      return;
    }

    // Load session data
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
  }, [lastEndedSessionId, navigation]);

  const handleSelectTone = (tone: CoachingTone) => {
    setSelectedTone(tone);
  };

  const handleContinue = () => {
    if (!selectedTone) return;
    setCoachingTone(selectedTone, localAiEnabled);
    setAiEnabled(localAiEnabled);
    navigation.navigate("ReflectionPrompts");
  };

  const handleAiToggle = (value: boolean) => {
    setLocalAiEnabled(value);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Session Context Header */}
        <View style={styles.contextCard}>
          <Text style={styles.contextLabel}>Practice Area</Text>
          <Text style={styles.contextValue}>{practiceAreaName}</Text>
          
          <Text style={[styles.contextLabel, styles.contextLabelSpaced]}>Session Intent</Text>
          <Text style={styles.contextValue}>{sessionIntent}</Text>
        </View>

        {/* Header Question */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>How would you like to reflect?</Text>
        </View>

        {/* Coaching Tone Cards */}
        <View style={styles.cardsContainer}>
          {COACHING_TONE_CARDS.map((card) => {
            const isSelected = selectedTone === card.tone;
            return (
              <TouchableOpacity
                key={card.tone}
                style={[
                  styles.toneCard,
                  isSelected && styles.toneCardSelected,
                ]}
                onPress={() => handleSelectTone(card.tone)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>{card.icon}</Text>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                  </View>
                </View>
                <Text style={styles.cardDescription}>{card.description}</Text>
                <View style={styles.bestForContainer}>
                  <Text style={styles.bestForLabel}>Best for: </Text>
                  <Text style={styles.bestForValue}>{card.bestFor}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* AI Toggle - only visible when AI is available */}
        {aiAvailable && (
          <View style={styles.aiToggleSection}>
            <View style={styles.aiToggleRow}>
              <View style={styles.aiToggleLabelContainer}>
                <Text style={styles.aiToggleLabel}>Enable AI coaching for this reflection</Text>
              </View>
              <Switch
                value={localAiEnabled}
                onValueChange={handleAiToggle}
                trackColor={{ false: COLORS.neutral[300], true: COLORS.primary }}
                thumbColor={Platform.OS === 'android' ? COLORS.surface : undefined}
                ios_backgroundColor={COLORS.neutral[300]}
              />
            </View>
            <Text style={styles.aiToggleHelpText}>
              {localAiEnabled
                ? "AI will suggest starter phrases and follow-up questions"
                : "You'll see standard prompts without AI suggestions"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedTone && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedTone}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.continueButtonText,
              !selectedTone && styles.continueButtonTextDisabled,
            ]}
          >
            Continue
          </Text>
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
  headerSection: {
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    textAlign: "center",
  },
  cardsContainer: {
    gap: SPACING.md,
  },
  toneCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  toneCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.neutral[50],
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  cardIcon: {
    fontSize: 40,
    marginRight: SPACING.md,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  cardSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.primary,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.normal,
    marginBottom: SPACING.sm,
  },
  bestForContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.xs,
  },
  bestForLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  bestForValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    fontStyle: "italic",
  },
  aiToggleSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  aiToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiToggleLabelContainer: {
    flex: 1,
    marginRight: SPACING.md,
  },
  aiToggleLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  aiToggleHelpText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.relaxed,
  },
  footer: {
    padding: SPACING.md,
    paddingBottom: Platform.OS === "ios" ? SPACING.lg : SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[200],
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.neutral[200],
  },
  continueButtonText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  continueButtonTextDisabled: {
    color: COLORS.text.disabled,
  },
});

export default ReflectionToneScreen;
