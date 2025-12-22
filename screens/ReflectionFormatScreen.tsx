import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { useAppStore } from "../stores/appStore";
import { getSessionById, getPracticeAreaById } from "../db/queries";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";
import type { ReflectionFormat } from "../utils/types";

type ReflectionFormatScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReflectionFormat"
>;

interface FormatCardData {
  format: ReflectionFormat;
  title: string;
  description: string;
  timeEstimate: string;
}

const FORMAT_CARDS: FormatCardData[] = [
  {
    format: 1,
    title: "Direct & Action-Oriented",
    description: "Quick, focused reflection on concrete actions",
    timeEstimate: "3–5 minutes",
  },
  {
    format: 2,
    title: "Reflective & Exploratory",
    description: "Deeper dive into patterns and underlying insights",
    timeEstimate: "5–8 minutes",
  },
  {
    format: 3,
    title: "Minimalist / Rapid",
    description: "Ultra-short capture of key takeaways",
    timeEstimate: "≈1 minute",
  },
];

const ReflectionFormatScreen: React.FC = () => {
  const navigation = useNavigation<ReflectionFormatScreenNavigationProp>();
  const { lastEndedSessionId, setReflectionFormat, reflectionDraft } = useAppStore();

  const [practiceAreaName, setPracticeAreaName] = useState<string>("");
  const [sessionIntent, setSessionIntent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

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

  const handleSelectFormat = (format: ReflectionFormat) => {
    setReflectionFormat(format);
    navigation.navigate("ReflectionPrompts");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Session Context Header */}
      <View style={styles.contextCard}>
        <Text style={styles.contextLabel}>Practice Area</Text>
        <Text style={styles.contextValue}>{practiceAreaName}</Text>
        
        <Text style={[styles.contextLabel, styles.contextLabelSpaced]}>Session Intent</Text>
        <Text style={styles.contextValue}>{sessionIntent}</Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsSection}>
        <Text style={styles.instructionsTitle}>Choose Your Reflection Format</Text>
        <Text style={styles.instructionsText}>
          Select the format that best fits your current energy and depth of reflection.
        </Text>
      </View>

      {/* Format Cards */}
      <View style={styles.cardsContainer}>
        {FORMAT_CARDS.map((card) => {
          const isSelected = reflectionDraft.format === card.format;
          return (
            <TouchableOpacity
              key={card.format}
              style={[
                styles.formatCard,
                isSelected && styles.formatCardSelected,
              ]}
              onPress={() => handleSelectFormat(card.format)}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDescription}>{card.description}</Text>
              <Text style={styles.cardTimeEstimate}>⏱ {card.timeEstimate}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  instructionsSection: {
    marginBottom: SPACING.lg,
  },
  instructionsTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  instructionsText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.relaxed,
  },
  cardsContainer: {
    gap: SPACING.md,
  },
  formatCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    minHeight: 120,
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
  formatCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.neutral[50],
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  cardDescription: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.normal,
    marginBottom: SPACING.sm,
  },
  cardTimeEstimate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
});

export default ReflectionFormatScreen;


