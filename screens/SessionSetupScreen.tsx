import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";
import { getPreviousSessionIntent, getPracticeAreaById } from "../db/queries";

type SessionSetupScreenRouteProp = RouteProp<RootStackParamList, "SessionSetup">;
type SessionSetupScreenNavigationProp = StackNavigationProp<RootStackParamList, "SessionSetup">;

type Props = {
  route: SessionSetupScreenRouteProp;
};

const SessionSetupScreen: React.FC<Props> = ({ route }) => {
  const { practiceAreaId } = route.params;
  const navigation = useNavigation<SessionSetupScreenNavigationProp>();

  const [previousIntent, setPreviousIntent] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [practiceAreaName, setPracticeAreaName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

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
        const result = await getPreviousSessionIntent(practiceAreaId);
        if (!result) {
          setPreviousIntent("No previous sessions");
        } else if (!result.previous_next_action) {
          setPreviousIntent("No previous intent recorded");
        } else {
          setPreviousIntent(result.previous_next_action);
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

  const shouldShowCollapsible = previousIntent.length > 100 && 
    previousIntent !== "No previous sessions" && 
    previousIntent !== "No previous intent recorded" &&
    previousIntent !== "Error loading previous intent";

  const displayText = shouldShowCollapsible && !isExpanded
    ? previousIntent.substring(0, 100) + "..."
    : previousIntent;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
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
        </View>
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
});

export default SessionSetupScreen;


