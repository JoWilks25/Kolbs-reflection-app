import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { COLORS, SPACING, TYPOGRAPHY, APP_CONSTANTS } from '../utils/constants';
import { useAppStore } from '../stores/appStore';
import { PracticeAreaWithStats, PendingReflection } from '../utils/types';
import { formatDate, formatHoursRemaining } from '../utils/timeFormatting';
import { getPracticeAreas, createPracticeArea, checkPracticeAreaNameExists, getPendingReflections, insertTestPendingReflections } from "../db/queries";
import { getDatabase } from "../db/migrations";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

type Props = {
  navigation: HomeScreenNavigationProp;
};

// Format session count with proper pluralization
const formatSessionCount = (count: number): string => {
  return count === 1 ? "1 session" : `${count} sessions`;
};

// Pending Reflections Banner Component
type PendingReflectionsBannerProps = {
  pendingReflections: PendingReflection[];
  onPress: () => void;
};

const PendingReflectionsBanner: React.FC<PendingReflectionsBannerProps> = ({
  pendingReflections,
  onPress
}) => {
  if (pendingReflections.length === 0) {
    return null;
  }

  const oldest = pendingReflections[0];
  const count = pendingReflections.length;
  const now = Date.now();
  const hoursSinceEnd = (now - oldest.ended_at!) / (1000 * 60 * 60);
  const hoursRemaining = 48 - hoursSinceEnd;
  const millisecondsRemaining = hoursRemaining * 60 * 60 * 1000;

  // Determine state: Pending (< 24h) or Overdue (24-48h)
  const isPending = hoursSinceEnd < 24;
  const isOverdue = hoursSinceEnd >= 24 && hoursSinceEnd < 48;

  // Format text
  const countText = count === 1 ? "1 reflection" : `${count} reflections`;
  const stateText = isPending ? "due" : "overdue";
  const timeText = formatHoursRemaining(millisecondsRemaining);
  const suffixText = isPending ? "" : " before expiry";

  const bannerText = `${countText} ${stateText} (${timeText}${suffixText})`;

  // Determine background color
  const backgroundColor = isPending ? COLORS.warning : COLORS.error;

  return (
    <TouchableOpacity
      style={[styles.pendingBanner, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.pendingBannerText}>{bannerText}</Text>
    </TouchableOpacity>
  );
};

// Practice Area Item Component
type PracticeAreaItemProps = {
  item: PracticeAreaWithStats;
  onPress: (practiceAreaId: string) => void;
};

const PracticeAreaItem: React.FC<PracticeAreaItemProps> = ({ item, onPress }) => {
  const lastSessionText = item.lastSessionDate
    ? formatDate(item.lastSessionDate)
    : "No sessions yet";

  const hasPending = item.pendingReflectionsCount > 0;
  const hasOverdue = item.overdueReflectionsCount > 0;
  const hasIndicators = hasPending || hasOverdue;

  // Determine border style - overdue takes priority
  const borderStyle = hasOverdue
    ? styles.cardBorderOverdue
    : hasPending
      ? styles.cardBorderPending
      : null;

  return (
    <TouchableOpacity
      style={[styles.practiceAreaItem, borderStyle]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <View style={styles.headerRow}>
          <Text style={styles.practiceAreaName}>{item.name}</Text>
          {hasIndicators && (
            <View style={styles.indicatorContainer}>
              {hasPending && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>
                    {item.pendingReflectionsCount} pending
                  </Text>
                </View>
              )}
              {hasOverdue && (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueBadgeText}>
                    {item.overdueReflectionsCount} overdue
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        <Text style={styles.lastSessionDate}>{lastSessionText}</Text>
        <View style={styles.sessionCountBadge}>
          <Text style={styles.sessionCountText}>
            {formatSessionCount(item.sessionCount)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Empty State Component
const EmptyState: React.FC = () => (
  <View style={styles.emptyStateContainer}>
    <Text style={styles.emptyStateTitle}>No Practice Areas yet</Text>
    <Text style={styles.emptyStateBody}>
      Create a Practice Area to start tracking your practice sessions.
    </Text>
  </View>
);

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  // Get state from store
  const practiceAreas = useAppStore((state) => state.practiceAreas) as PracticeAreaWithStats[];
  const setPracticeAreas = useAppStore(state => state.setPracticeAreas);
  const setPendingReflectionsCount = useAppStore(state => state.setPendingReflectionsCount);

  // Pull-to-refresh state (user will manage this)
  const [refreshing, setRefreshing] = useState(false);

  // Loading state placeholder (user will manage this)
  const [isLoading, setIsLoading] = useState(false);

  // Create modal state
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newPracticeAreaName, setNewPracticeAreaName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [nameError, setNameError] = useState("");

  // Pending reflections state
  const [pendingReflections, setPendingReflections] = useState<PendingReflection[]>([]);

  const loadPracticeAreas = async () => {
    setIsLoading(true);
    try {
      const practiceAreas: PracticeAreaWithStats[] = await getPracticeAreas();
      console.log('practiceAreas', practiceAreas)
      setPracticeAreas(practiceAreas);
    } catch (error) {
      console.error('Error loading practice areas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingReflections = async () => {
    try {
      const pending = await getPendingReflections();
      console.log('pending', pending)
      setPendingReflections(pending as PendingReflection[]);
      setPendingReflectionsCount(pending.length);
    } catch (error) {
      console.error('Error loading pending reflections:', error);
    }
  };

  // In HomeScreen or a dev screen
  const handleReset = async () => {
    const db = getDatabase();
    await db.runAsync('DELETE FROM practice_areas');
    await db.runAsync('DELETE FROM sessions');
    await db.runAsync('DELETE FROM reflections');
    await loadPracticeAreas(); // Refresh the list
    Alert.alert('Reset', 'Practice Areas table cleared');
  };

  // Uncomment and modify
  const handleInsertTestData = async () => {
    try {
      await insertTestPendingReflections();
      await loadPracticeAreas();
      await loadPendingReflections();
      Alert.alert('Test Data', 'Test pending reflections data inserted');
    } catch (error) {
      console.error('Error inserting test data:', error);
      Alert.alert('Error', 'Failed to insert test data');
    }
  };

  useEffect(() => {
    // handleReset();
    // handleInsertTestData();
    loadPendingReflections();
    loadPracticeAreas();
  }, []);

  // Reload pending reflections when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadPendingReflections();
    }, [])
  );

  // Refresh handler placeholder - user will implement
  const handleRefresh = async () => {
    setRefreshing(true);
    // User will implement data loading here
    await loadPendingReflections();
    await loadPracticeAreas();
    setRefreshing(false);
  };

  // Navigation handler
  const handlePracticeAreaPress = (practiceAreaId: string) => {
    navigation.navigate("SessionSetup", { practiceAreaId });
  };

  // Handle pending reflection banner press
  const handlePendingBannerPress = () => {
    if (pendingReflections.length > 0) {
      const oldest = pendingReflections[0];
      navigation.navigate("SeriesTimeline", {
        practiceAreaId: oldest.practice_area_id,
        focusSessionId: oldest.id,
      });
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    setIsCreateModalVisible(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalVisible(false);
    setNewPracticeAreaName("");
    setNameError("");
  };

  const validateName = (name: string): boolean => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setNameError("Please enter a name");
      return false;
    }
    setNameError("");
    return true;
  };

  const handleCreate = async () => {
    const trimmedName = newPracticeAreaName.trim();

    if (!validateName(trimmedName)) {
      return;
    }

    setIsCreating(true);
    try {
      // Check for duplicate name
      const nameExists = await checkPracticeAreaNameExists(trimmedName);
      if (nameExists) {
        setNameError("A Practice Area with this name already exists");
        setIsCreating(false);
        return;
      }

      await createPracticeArea(trimmedName);
      closeCreateModal();
      await loadPracticeAreas();
      Alert.alert("Success", "Practice Area created");
    } catch (error) {
      console.error("Error creating practice area:", error);
      Alert.alert("Error", "Failed to create Practice Area. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Loading State
  if (isLoading && practiceAreas.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Pending Reflections Banner */}
      <PendingReflectionsBanner
        pendingReflections={pendingReflections}
        onPress={handlePendingBannerPress}
      />

      <FlatList
        data={practiceAreas}
        renderItem={({ item }) => (
          <PracticeAreaItem item={item} onPress={handlePracticeAreaPress} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          practiceAreas.length === 0 ? styles.emptyListContainer : styles.listContainer
        }
        ListEmptyComponent={<EmptyState />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />

      {/* New Practice Area Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.newPracticeAreaButton}
          onPress={openCreateModal}
          activeOpacity={0.8}
        >
          <Text style={styles.newPracticeAreaButtonText}>New Practice Area</Text>
        </TouchableOpacity>
      </View>

      {/* Create Practice Area Modal */}
      <Modal
        visible={isCreateModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Practice Area</Text>

            <TextInput
              style={styles.input}
              placeholder="Practice Area name"
              placeholderTextColor={COLORS.text.disabled}
              value={newPracticeAreaName}
              onChangeText={setNewPracticeAreaName}
              maxLength={100}
              autoFocus={true}
              editable={!isCreating}
            />

            <View style={styles.characterCountContainer}>
              <Text style={styles.characterCount}>
                {newPracticeAreaName.length}/100
              </Text>
            </View>

            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeCreateModal}
                disabled={isCreating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.createButton,
                  isCreating && styles.createButtonDisabled
                ]}
                onPress={handleCreate}
                disabled={isCreating}
              >
                <Text style={styles.createButtonText}>
                  {isCreating ? "Creating..." : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  // Pending Reflections Banner
  pendingBanner: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBannerText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
    textAlign: 'center',
  },
  listContainer: {
    padding: SPACING.md,
  },
  emptyListContainer: {
    flex: 1,
  },
  practiceAreaItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardBorderPending: {
    borderLeftWidth: 5,
    borderLeftColor: COLORS.warning,
  },
  cardBorderOverdue: {
    borderLeftWidth: 5,
    borderLeftColor: COLORS.error,
  },
  itemContent: {
    gap: SPACING.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  practiceAreaName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexShrink: 0,
  },
  pendingBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  overdueBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 8,
  },
  overdueBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  lastSessionDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  sessionCountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    marginTop: SPACING.xs,
  },
  sessionCountText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.inverse,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  emptyStateBody: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.normal,
  },
  // New Practice Area Button
  buttonContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  newPracticeAreaButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  newPracticeAreaButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
  },
  characterCountContainer: {
    alignItems: 'flex-end',
    marginTop: SPACING.xs,
  },
  characterCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.neutral[200],
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
  createButton: {
    backgroundColor: COLORS.primary,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.neutral[300],
  },
  createButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
});

export default HomeScreen;
